/**
 * Unified match source: uses live CricAPI data when CRICAPI_KEY is set and
 * the request succeeds, otherwise falls back to mock fixtures. Either way,
 * matches are normalized to the same shape and *every* match gets a
 * prediction attached - teams we don't have real stats for (domestic sides,
 * associate nations, league franchises) fall back to a neutral synthetic
 * profile in src/data/teams.js rather than being skipped.
 */
const cricapi = require('./cricapi');
const { MOCK_MATCHES } = require('./data/mockMatches');
const { TEAMS, resolveTeam } = require('./data/teams');
const { predictMatch } = require('./predict');

// Map full team names (as CricAPI returns them) to our internal codes, for
// the sides we have hand-set stats on. Anything not in this list is still
// shown and predicted - resolveTeam() gives it a neutral fallback profile.
const NAME_TO_CODE = {
  India: 'IND',
  Australia: 'AUS',
  England: 'ENG',
  Pakistan: 'PAK',
  'South Africa': 'RSA',
  'New Zealand': 'NZ',
  'Sri Lanka': 'SL',
  Bangladesh: 'BAN',
  'West Indies': 'WI',
  Afghanistan: 'AFG',
};

/** Map a raw team name to our internal code when we recognize it, else return the name as-is. */
function codeForTeamName(name) {
  if (!name) return null;
  if (TEAMS[name]) return name; // already a known code
  return NAME_TO_CODE[name] || name; // fall back to the raw name - resolveTeam() handles it
}

function attachPrediction(match) {
  const [codeA, codeB] = match.teams;
  const teamA = resolveTeam(codeA);
  const teamB = resolveTeam(codeB);
  if (!teamA || !teamB) {
    return { ...match, prediction: null, predictionUnavailableReason: 'Could not identify both teams for this match' };
  }
  const prediction = predictMatch(codeA, codeB, {
    homeTeamCode: match.homeTeamCode || null,
    format: match.format,
    live: match.live || null,
  });
  return {
    ...match,
    teamNames: [teamA.name, teamB.name],
    teamsEstimated: [Boolean(teamA.estimated), Boolean(teamB.estimated)],
    prediction,
  };
}

/**
 * Parse CricAPI's `score` array (one entry per completed/in-progress innings,
 * e.g. `{ r: 142, w: 3, o: 15.2, inning: "India Inning 1" }`) into the shape
 * predict.js expects. Returns null if there's nothing usable yet (match not
 * started, or CricAPI hasn't published a score for it).
 */
function parseLiveState(rawMatch, teamCodes) {
  const innings = rawMatch.score;
  if (!innings || innings.length === 0) return null;

  const current = innings[innings.length - 1];
  const label = current.inning || '';
  const battingName = label.replace(/\s*innings?\s*\d*/i, '').trim();
  const battingTeamCode = codeForTeamName(battingName) || teamCodes.find((c) => label.includes(c)) || null;
  if (!battingTeamCode) return null;

  let target = null;
  let firstInnings = null;
  if (innings.length > 1) {
    const first = innings[0];
    target = (first.r || 0) + 1;
    const firstLabel = first.inning || '';
    const firstBattingName = firstLabel.replace(/\s*innings?\s*\d*/i, '').trim();
    firstInnings = {
      teamCode: codeForTeamName(firstBattingName) || teamCodes.find((c) => c !== battingTeamCode) || null,
      runs: first.r || 0,
      wickets: first.w != null ? first.w : 10,
      overs: first.o || 0,
    };
  }

  return {
    inning: innings.length,
    battingTeamCode,
    battingTeamName: battingName || battingTeamCode,
    runs: current.r || 0,
    wickets: current.w != null ? current.w : 10,
    overs: current.o || 0,
    target,
    firstInnings,
    oversLimit: null, // resolved from format in predict.js
  };
}

function mapLiveMatches(rawMatches) {
  return rawMatches
    .map((m) => {
      const rawTeamNames = (m.teams || []).filter(Boolean);
      if (rawTeamNames.length !== 2) return null; // need exactly 2 named sides to predict anything
      const teamCodes = rawTeamNames.map(codeForTeamName);

      const format = m.matchType ? m.matchType.toUpperCase() : 'MATCH';
      const status = m.matchStarted ? (m.matchEnded ? 'completed' : 'live') : 'upcoming';
      const live = status === 'live' ? parseLiveState(m, teamCodes) : null;

      return {
        id: m.id,
        format,
        teams: teamCodes,
        venue: m.venue || 'Venue TBC',
        date: m.date || m.dateTimeGMT || null,
        status,
        live,
        source: 'live',
      };
    })
    .filter(Boolean);
}

// Share one upstream CricAPI call across every visitor for a short window,
// rather than hitting the API on every page load. This matters once the app
// is public: a handful of people loading the page around the same moment
// would otherwise each burn a request against your (rate-limited) free
// CricAPI quota. Predictions are recomputed fresh each time regardless -
// only the underlying match/score data is cached.
const LIVE_CACHE_TTL_MS = 60 * 1000;
let cache = { data: null, expiresAt: 0 };

async function getMatches() {
  const now = Date.now();
  if (cache.data && cache.expiresAt > now) {
    return cache.data;
  }
  const result = await fetchMatchesFresh();
  cache = { data: result, expiresAt: now + LIVE_CACHE_TTL_MS };
  return result;
}

async function fetchMatchesFresh() {
  if (cricapi.isConfigured()) {
    try {
      const raw = await cricapi.getCurrentMatches();
      const mapped = mapLiveMatches(raw);
      if (mapped.length > 0) {
        return { source: 'live', matches: mapped.map(attachPrediction) };
      }
      // Live call succeeded but returned nothing mappable right now - fall
      // through to mock so the demo still has content.
    } catch (err) {
      // Fall back silently to mock data; the /api/status route surfaces the
      // error for debugging instead of failing the whole page.
      return {
        source: 'mock',
        matches: MOCK_MATCHES.map(attachPrediction),
        liveError: err.message,
      };
    }
  }
  return { source: 'mock', matches: MOCK_MATCHES.map(attachPrediction) };
}

function getMatchById(id, matchList) {
  return matchList.find((m) => m.id === id) || null;
}

module.exports = { getMatches, getMatchById, codeForTeamName };
