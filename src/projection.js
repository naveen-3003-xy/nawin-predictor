/**
 * Over-by-over score projection: "how many runs will this team have after
 * X overs?" - a companion to the win-probability model in predict.js, using
 * the same explainable, hand-tuned approach rather than a trained model.
 *
 * The shape of an innings' scoring isn't linear - most sides go steadier in
 * the middle overs than in the powerplay/death overs - so projections are
 * built from a rough phase-by-phase run-rate curve (typical of the format),
 * scaled by how strong/in-form the batting side is. For a live innings, the
 * curve anchors on the actual current score and projects forward from there,
 * blending the side's current run rate with the expected shape of the
 * remaining phase and dampening for wickets already lost.
 */
const { recentFormWinRate } = require('./data/teams');
const { oversToDecimal, formatOvers } = require('./oversUtil');

// Rough phase-by-phase run rates (runs per over), typical of each format.
// Deliberately approximate - the point is a believable *shape* (fast start,
// steadier middle, accelerating finish) rather than a precise simulation.
const T20_PHASES = [
  { throughOver: 6, rpo: 8.6 }, // powerplay
  { throughOver: 15, rpo: 6.8 }, // middle overs
  { throughOver: 20, rpo: 10.4 }, // death overs
];
const ODI_PHASES = [
  { throughOver: 10, rpo: 5.8 }, // powerplay
  { throughOver: 40, rpo: 5.0 }, // middle overs
  { throughOver: 50, rpo: 7.6 }, // death overs
];

function phasesFor(oversLimit) {
  return oversLimit === 50 ? ODI_PHASES : T20_PHASES;
}

function checkpointOversFor(oversLimit) {
  if (oversLimit === 20) return [5, 10, 15, 20];
  if (oversLimit === 50) return [10, 20, 30, 40, 50];
  return null; // Test/unknown format - no over-by-over model
}

/** Cumulative baseline runs expected through a given over, before any team adjustment. */
function baselineRunsThroughOver(over, oversLimit) {
  const phases = phasesFor(oversLimit);
  let runs = 0;
  let prevOver = 0;
  for (const phase of phases) {
    if (over <= phase.throughOver) {
      runs += (over - prevOver) * phase.rpo;
      return runs;
    }
    runs += (phase.throughOver - prevOver) * phase.rpo;
    prevOver = phase.throughOver;
  }
  return runs;
}

/** How much faster/slower than the baseline this team is expected to score. */
function teamPaceFactor(team) {
  const ratingFactor = 0.82 + ((team.rating - 65) / 100) * 0.32; // ~0.82 at rating 65, ~1.10 at rating 100
  const formFactor = 0.95 + recentFormWinRate(team) * 0.1; // 0.95 (poor form) .. 1.05 (great form)
  return ratingFactor * formFactor;
}

function projectedCurve(team, oversLimit, checkpoints) {
  const factor = teamPaceFactor(team);
  return {
    status: 'projected', // pre-match estimate, not yet batting
    checkpoints: checkpoints.map((over) => ({
      over,
      overDisplay: String(over),
      runs: Math.round(baselineRunsThroughOver(over, oversLimit) * factor),
      actual: false,
    })),
  };
}

function finalCurve(innings) {
  const decOvers = oversToDecimal(innings.overs);
  return {
    status: 'final', // innings already completed - this is what actually happened, not a projection
    checkpoints: [
      {
        over: decOvers,
        overDisplay: formatOvers(decOvers),
        runs: innings.runs,
        wickets: innings.wickets,
        actual: true,
        final: true,
      },
    ],
  };
}

function liveCurve(team, live, oversLimit, checkpoints) {
  const factor = teamPaceFactor(team);
  const decOvers = oversToDecimal(live.overs);
  const currentRunRate = decOvers > 0 ? live.runs / decOvers : baselineRunsThroughOver(1, oversLimit) * factor;
  const wicketDamp = Math.max(0.55, 1 - (live.wickets || 0) * 0.045);

  const nowPoint = {
    over: decOvers,
    overDisplay: formatOvers(decOvers),
    runs: live.runs,
    wickets: live.wickets,
    actual: true,
    now: true,
  };

  const future = checkpoints
    .filter((over) => over > decOvers)
    .map((over) => {
      const remaining = over - decOvers;
      const baselineRemaining = baselineRunsThroughOver(over, oversLimit) - baselineRunsThroughOver(decOvers, oversLimit);
      const paceBlend = 0.6 * currentRunRate + 0.4 * (baselineRemaining / remaining) * factor;
      const projected = live.runs + paceBlend * wicketDamp * remaining;
      return { over, overDisplay: String(over), runs: Math.round(Math.max(live.runs, projected)), actual: false };
    });

  return { status: 'live', checkpoints: [nowPoint, ...future] };
}

/**
 * Build the over-by-over score projection for both teams in a match.
 * @param {object} teamA resolved team object (see data/teams.js)
 * @param {object} teamB resolved team object
 * @param {object|null} live live match state (see predict.js applyLiveState for shape), or null pre-match
 * @param {number} oversLimit overs per innings for this format (20/50), or null if unsupported
 * @returns {object|null} { oversLimit, teams: { [code]: { status, checkpoints } } }, or null for unsupported formats
 */
function buildScoreProjection(teamA, teamB, live, oversLimit) {
  if (!oversLimit) return null; // e.g. Test cricket - overs don't cap an innings
  const checkpoints = checkpointOversFor(oversLimit);
  if (!checkpoints) return null;

  const teams = {};
  for (const team of [teamA, teamB]) {
    if (live && live.battingTeamCode === team.code) {
      teams[team.code] = liveCurve(team, live, oversLimit, checkpoints);
    } else if (live && live.firstInnings && live.firstInnings.teamCode === team.code) {
      teams[team.code] = finalCurve(live.firstInnings);
    } else {
      teams[team.code] = projectedCurve(team, oversLimit, checkpoints);
    }
  }

  return { oversLimit, teams };
}

module.exports = { buildScoreProjection };
