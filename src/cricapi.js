/**
 * Thin client for CricAPI (https://cricapi.com, docs under cricketdata.org).
 *
 * Activated automatically when CRICAPI_KEY is set in the environment.
 * If the key is missing, or a request fails for any reason, callers should
 * fall back to mock data (see src/matches.js) so the app keeps working.
 *
 * NOTE: CricAPI's exact endpoint set has changed over the years. This client
 * targets the current v1 REST API (api.cricapi.com/v1/...). If your key's
 * dashboard shows different endpoint names, adjust BASE_URL / paths below to
 * match - the rest of the app only depends on the shapes returned by
 * mapCurrentMatches(), not on CricAPI's raw format.
 */

const BASE_URL = 'https://api.cricapi.com/v1';

function isConfigured() {
  return Boolean(process.env.CRICAPI_KEY);
}

async function fetchJson(path, params = {}) {
  const url = new URL(`${BASE_URL}/${path}`);
  url.searchParams.set('apikey', process.env.CRICAPI_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`CricAPI request failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.status && json.status !== 'success') {
    throw new Error(`CricAPI error: ${json.status} - ${json.message || 'unknown error'}`);
  }
  return json;
}

/** Raw call: current & recent matches. */
async function getCurrentMatches() {
  const json = await fetchJson('currentMatches', { offset: 0 });
  return json.data || [];
}

/** Raw call: full info (including scorecard-level detail) for one match. */
async function getMatchInfo(matchId) {
  const json = await fetchJson('match_info', { id: matchId });
  return json.data || null;
}

module.exports = { isConfigured, getCurrentMatches, getMatchInfo };
