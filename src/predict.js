/**
 * Stats-based win probability model.
 *
 * This is intentionally simple and *explainable* rather than a trained ML
 * model: every factor that goes into the number is named and weighted, so
 * the UI can show a plain-language breakdown of "why" a prediction came out
 * the way it did. Swap in a trained model later by replacing this file's
 * exports while keeping the same return shape.
 *
 * Pre-match factors (weights sum to 1.0):
 *   - power rating difference   (0.45) - overall team strength
 *   - recent form (last 5)      (0.30) - momentum
 *   - head-to-head record       (0.15) - historical matchup edge
 *   - home advantage            (0.10) - fixed bonus for the home team
 *
 * If the match is live, that pre-match number is then blended with an
 * in-play read of the current score (see applyLiveState below) - the further
 * the innings has progressed, the more the live state outweighs the
 * pre-match number.
 */
const { resolveTeam, getHeadToHeadWinRate, recentFormWinRate } = require('./data/teams');
const { oversToDecimal, formatOvers, oversLimitFor } = require('./oversUtil');
const { buildScoreProjection } = require('./projection');

const WEIGHTS = {
  rating: 0.45,
  form: 0.30,
  h2h: 0.15,
  home: 0.10,
};

const HOME_ADVANTAGE_BONUS = 0.06; // ~6 percentage points, applied to the home team only

// Rough "par" run rate used to judge a first-innings score before there's a
// target to chase - deliberately approximate, just enough to nudge the
// prediction toward whichever side is having the better innings so far.
const PAR_RUN_RATE = { T20I: 8.3, T20: 8.3, ODI: 5.4 };

/**
 * Predict the outcome of a match between two teams.
 * @param {string} teamACode
 * @param {string} teamBCode
 * @param {object} [opts]
 * @param {string} [opts.homeTeamCode] - if set and matches teamA/teamB, that team gets the home bonus
 * @param {string} [opts.format] - e.g. 'T20I', 'ODI', 'Test' - used to size the live-state model
 * @param {object} [opts.live] - live match state, see applyLiveState() for shape
 * @returns {object} prediction with probabilities and a factor-by-factor breakdown
 */
function predictMatch(teamACode, teamBCode, opts = {}) {
  const teamA = resolveTeam(teamACode);
  const teamB = resolveTeam(teamBCode);

  if (!teamA || !teamB) {
    throw new Error(`Unknown team code(s): ${teamACode}, ${teamBCode}`);
  }

  // 1. Rating component: convert the rating gap into a 0-1 "edge" for A using
  //    a logistic curve (similar in spirit to Elo expected-score formulas).
  const ratingEdgeA = 1 / (1 + Math.pow(10, (teamB.rating - teamA.rating) / 40));

  // 2. Recent form component.
  const formA = recentFormWinRate(teamA);
  const formB = recentFormWinRate(teamB);
  const formEdgeA = formA / (formA + formB || 1);

  // 3. Head-to-head component.
  const h2hEdgeA = getHeadToHeadWinRate(teamA.code, teamB.code);

  // 4. Home advantage component (binary: 1 if A is home, 0 if B is home, 0.5 if neutral).
  let homeEdgeA = 0.5;
  if (opts.homeTeamCode === teamA.code) homeEdgeA = 0.5 + HOME_ADVANTAGE_BONUS;
  else if (opts.homeTeamCode === teamB.code) homeEdgeA = 0.5 - HOME_ADVANTAGE_BONUS;

  const preMatchEdgeA =
    ratingEdgeA * WEIGHTS.rating +
    formEdgeA * WEIGHTS.form +
    h2hEdgeA * WEIGHTS.h2h +
    homeEdgeA * WEIGHTS.home;

  const breakdown = [
    {
      factor: 'Power rating',
      weight: WEIGHTS.rating,
      detail: `${teamA.name} rating ${teamA.rating} vs ${teamB.name} rating ${teamB.rating}${
        teamA.estimated || teamB.estimated ? ' (estimated for teams without full stats)' : ''
      }`,
      edgeToTeamA: round1(ratingEdgeA * 100),
    },
    {
      factor: 'Recent form (last 5)',
      weight: WEIGHTS.form,
      detail: `${teamA.name} ${teamA.recentForm.join('')} vs ${teamB.name} ${teamB.recentForm.join('')}`,
      edgeToTeamA: round1(formEdgeA * 100),
    },
    {
      factor: 'Head-to-head record',
      weight: WEIGHTS.h2h,
      detail: `${teamA.name} has won ${round1(h2hEdgeA * 100)}% of recent meetings`,
      edgeToTeamA: round1(h2hEdgeA * 100),
    },
    {
      factor: 'Home advantage',
      weight: WEIGHTS.home,
      detail:
        opts.homeTeamCode === teamA.code
          ? `${teamA.name} is playing at home`
          : opts.homeTeamCode === teamB.code
          ? `${teamB.name} is playing at home`
          : 'Neutral venue',
      edgeToTeamA: round1(homeEdgeA * 100),
    },
  ];

  // Clamp the pre-match number to a sane range so the app never claims 0% or 100%.
  let probA = Math.min(0.93, Math.max(0.07, preMatchEdgeA));
  let liveContext = null;

  if (opts.live && opts.live.battingTeamCode) {
    const live = applyLiveState(probA, teamA.code, teamB.code, opts.live, opts.format);
    if (live) {
      probA = live.probA;
      liveContext = live.context;
      breakdown.unshift({
        factor: 'Live match state',
        weight: live.liveWeight,
        detail: live.context.note,
        edgeToTeamA: round1(
          (live.context.battingTeamCode === teamA.code ? live.context.battingEdge : 1 - live.context.battingEdge) *
            100
        ),
      });
    }
  }

  probA = Math.min(0.97, Math.max(0.03, probA));
  const probB = 1 - probA;

  const oversLimit = oversLimitFor(opts.live, opts.format);
  const scoreProjection = buildScoreProjection(teamA, teamB, opts.live || null, oversLimit);

  return {
    teamA: teamA.code,
    teamB: teamB.code,
    winProbability: {
      [teamA.code]: round1(probA * 100),
      [teamB.code]: round1(probB * 100),
    },
    favorite: probA >= probB ? teamA.code : teamB.code,
    live: liveContext,
    breakdown,
    scoreProjection,
  };
}

/**
 * Blend the pre-match probability with a read of the current score.
 *
 * - 2nd innings (a target is set): compares required run rate to current run
 *   rate and factors in wickets in hand - the classic "chase pressure" read.
 * - 1st innings (no target yet): projects a final score off the current run
 *   rate (dampened by wickets lost) and compares it to a rough par score.
 *
 * The influence of the live read (`liveWeight`) grows as the innings
 * progresses, so an over-two data point barely moves the needle while a
 * final-over chase is dominated by the live state.
 */
function applyLiveState(preMatchProbA, teamACode, teamBCode, live, format) {
  const oversLimit = oversLimitFor(live, format);
  if (!oversLimit) return null; // e.g. Test cricket - this model doesn't apply

  const battingIsA = live.battingTeamCode === teamACode;
  const battingIsB = live.battingTeamCode === teamBCode;
  if (!battingIsA && !battingIsB) return null; // can't place the batting side, skip

  const decOvers = oversToDecimal(live.overs);
  const oversRemaining = Math.max(1 / 6, oversLimit - decOvers);
  const currentRunRate = decOvers > 0 ? live.runs / decOvers : 0;
  const wicketsInHand = 10 - (live.wickets || 0);

  let battingEdge; // probability the *batting* team wins, from live state alone
  let note;

  if (live.inning >= 2 && live.target) {
    const runsNeeded = Math.max(0, live.target - live.runs);
    const requiredRunRate = runsNeeded / oversRemaining;
    const pressure = requiredRunRate - currentRunRate; // positive = chase getting harder
    const wicketsFactor = (wicketsInHand - 5) / 5; // -1 (2-3 down) .. +1 (plenty in hand), 0 at 5 down
    const rawScore = wicketsFactor * 3.2 - pressure * 0.9;
    battingEdge = runsNeeded <= 0 ? 0.97 : 1 / (1 + Math.exp(-rawScore / 2.2));

    note = `${live.battingTeamName || live.battingTeamCode} need ${runsNeeded} off ${formatOvers(
      oversRemaining
    )} overs (need ${requiredRunRate.toFixed(2)} run rate, currently scoring at ${currentRunRate.toFixed(
      2
    )}, ${wicketsInHand} wicket${wicketsInHand === 1 ? '' : 's'} in hand)`;
  } else {
    const parRunRate = PAR_RUN_RATE[format] || 6.5;
    const parScore = parRunRate * oversLimit;
    const wicketDamp = Math.max(0.55, 1 - (live.wickets || 0) * 0.045);
    const projectedScore = live.runs + currentRunRate * wicketDamp * oversRemaining;
    const scoreDiffRatio = parScore > 0 ? (projectedScore - parScore) / parScore : 0;
    battingEdge = 0.5 + Math.max(-0.22, Math.min(0.22, scoreDiffRatio * 0.9));

    note = `${live.battingTeamName || live.battingTeamCode} ${live.runs}/${live.wickets || 0} after ${formatOvers(
      decOvers
    )} overs, on pace for roughly ${Math.round(projectedScore)}`;
  }

  const liveWeight =
    live.inning >= 2
      ? Math.min(0.88, 0.25 + (decOvers / oversLimit) * 0.75)
      : Math.min(0.35, (decOvers / oversLimit) * 0.4);

  const preMatchBattingProb = battingIsA ? preMatchProbA : 1 - preMatchProbA;
  const blendedBattingProb = liveWeight * battingEdge + (1 - liveWeight) * preMatchBattingProb;
  const probA = battingIsA ? blendedBattingProb : 1 - blendedBattingProb;

  return {
    probA,
    liveWeight,
    context: {
      note,
      battingTeamCode: live.battingTeamCode,
      battingEdge,
      inning: live.inning,
      runs: live.runs,
      wickets: live.wickets,
      overs: live.overs,
      oversLimit,
      target: live.target || null,
      currentRunRate: round1(currentRunRate),
      requiredRunRate: live.target ? round1(Math.max(0, live.target - live.runs) / oversRemaining) : null,
    },
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

module.exports = { predictMatch };
