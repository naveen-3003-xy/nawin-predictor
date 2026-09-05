/**
 * Mock team data used as the statistical baseline for predictions.
 *
 * rating         - a simple 0-100 power rating (loosely inspired by ICC-style
 *                   ratings, hand-set here for the prototype).
 * recentForm     - results of the last 5 completed matches, most recent last.
 *                   'W' = win, 'L' = loss.
 * code           - short code used for badges in the UI.
 *
 * This file is the one place to edit if you want to tune team strength or
 * plug in real ratings later (e.g. from an ICC ratings API).
 */

const TEAMS = {
  IND: { code: 'IND', name: 'India', rating: 92, recentForm: ['W', 'W', 'L', 'W', 'W'] },
  AUS: { code: 'AUS', name: 'Australia', rating: 90, recentForm: ['W', 'L', 'W', 'W', 'W'] },
  ENG: { code: 'ENG', name: 'England', rating: 86, recentForm: ['L', 'W', 'W', 'L', 'W'] },
  PAK: { code: 'PAK', name: 'Pakistan', rating: 83, recentForm: ['W', 'L', 'L', 'W', 'W'] },
  RSA: { code: 'RSA', name: 'South Africa', rating: 88, recentForm: ['W', 'W', 'W', 'L', 'W'] },
  NZ: { code: 'NZ', name: 'New Zealand', rating: 85, recentForm: ['L', 'W', 'L', 'W', 'W'] },
  SL: { code: 'SL', name: 'Sri Lanka', rating: 76, recentForm: ['L', 'L', 'W', 'W', 'L'] },
  BAN: { code: 'BAN', name: 'Bangladesh', rating: 74, recentForm: ['W', 'L', 'L', 'W', 'L'] },
  WI: { code: 'WI', name: 'West Indies', rating: 71, recentForm: ['L', 'L', 'W', 'L', 'W'] },
  AFG: { code: 'AFG', name: 'Afghanistan', rating: 78, recentForm: ['W', 'W', 'L', 'W', 'L'] },

  // --- Caribbean Premier League (CPL) franchises ---
  // Ratings derived from the actual 2026 CPL points table (position + net
  // run rate), not placeholders - see README for how these get updated.
  AAB: { code: 'AAB', name: 'Antigua and Barbuda Falcons', rating: 80, recentForm: ['L', 'W', 'W', 'W', 'W'] },
  SLK: { code: 'SLK', name: 'Saint Lucia Kings', rating: 77, recentForm: ['W', 'L', 'W', 'W', 'L'] },
  GAW: { code: 'GAW', name: 'Guyana Amazon Warriors', rating: 76, recentForm: ['L', 'W', 'W', 'W', 'W'] },
  JAK: { code: 'JAK', name: 'Jamaica Kingsmen', rating: 75, recentForm: ['L', 'W', 'L', 'W', 'W'] },
  BAT: { code: 'BAT', name: 'Barbados Tridents', rating: 68, recentForm: ['L', 'W', 'L', 'W', 'L'] },
  TKR: { code: 'TKR', name: 'Trinbago Knight Riders', rating: 65, recentForm: ['L', 'L', 'W', 'L', 'W'] },
  SKN: { code: 'SKN', name: 'St Kitts and Nevis Patriots', rating: 60, recentForm: ['L', 'L', 'L', 'W', 'L'] },

  // --- English County Championship (Division One), 2026 season ---
  NOT: { code: 'NOT', name: 'Nottinghamshire', rating: 81, recentForm: ['W', 'W', 'L', 'W', 'W'] },
  SOM: { code: 'SOM', name: 'Somerset', rating: 79, recentForm: ['W', 'L', 'W', 'W', 'W'] },
  WAR: { code: 'WAR', name: 'Warwickshire', rating: 78, recentForm: ['L', 'W', 'W', 'W', 'L'] },
  GLA: { code: 'GLA', name: 'Glamorgan', rating: 75, recentForm: ['W', 'L', 'W', 'L', 'W'] },
  SUS: { code: 'SUS', name: 'Sussex', rating: 74, recentForm: ['L', 'W', 'L', 'W', 'W'] },
  ESS: { code: 'ESS', name: 'Essex', rating: 73, recentForm: ['W', 'L', 'L', 'W', 'L'] },
  YOR: { code: 'YOR', name: 'Yorkshire', rating: 72, recentForm: ['L', 'W', 'L', 'L', 'W'] },
  SUR: { code: 'SUR', name: 'Surrey', rating: 70, recentForm: ['L', 'L', 'W', 'L', 'L'] },
  LEI: { code: 'LEI', name: 'Leicestershire', rating: 68, recentForm: ['L', 'L', 'L', 'W', 'L'] },
  HAM: { code: 'HAM', name: 'Hampshire', rating: 65, recentForm: ['L', 'L', 'L', 'L', 'W'] },

  // --- English County Championship (Division Two), 2026 season ---
  DUR: { code: 'DUR', name: 'Durham', rating: 80, recentForm: ['W', 'W', 'W', 'L', 'W'] },
  KEN: { code: 'KEN', name: 'Kent', rating: 74, recentForm: ['W', 'L', 'W', 'W', 'L'] },
  NTH: { code: 'NTH', name: 'Northamptonshire', rating: 73, recentForm: ['L', 'W', 'W', 'L', 'W'] },
  WOR: { code: 'WOR', name: 'Worcestershire', rating: 70, recentForm: ['W', 'L', 'L', 'W', 'L'] },
  MID: { code: 'MID', name: 'Middlesex', rating: 68, recentForm: ['L', 'W', 'L', 'L', 'W'] },
  DER: { code: 'DER', name: 'Derbyshire', rating: 67, recentForm: ['L', 'L', 'W', 'L', 'W'] },
  LAN: { code: 'LAN', name: 'Lancashire', rating: 65, recentForm: ['L', 'L', 'L', 'W', 'L'] },
  GLO: { code: 'GLO', name: 'Gloucestershire', rating: 58, recentForm: ['L', 'L', 'L', 'L', 'W'] },
};

/**
 * Mock head-to-head records: wins for the *row* team against the *column*
 * team in the last ~10 meetings across formats. Symmetric losses are implied
 * (winsFor[A][B] + winsFor[B][A] need not sum to a fixed total; this is a
 * simplified prototype dataset, not a real historical record).
 */
const HEAD_TO_HEAD = {
  IND: { AUS: 5, ENG: 6, PAK: 6, RSA: 5, NZ: 6, SL: 8, BAN: 8, WI: 8, AFG: 4 },
  AUS: { IND: 5, ENG: 6, PAK: 6, RSA: 5, NZ: 5, SL: 7, BAN: 4, WI: 7, AFG: 3 },
  ENG: { IND: 4, AUS: 4, PAK: 5, RSA: 5, NZ: 5, SL: 6, BAN: 7, WI: 6, AFG: 3 },
  PAK: { IND: 4, AUS: 4, ENG: 5, RSA: 4, NZ: 5, SL: 6, BAN: 6, WI: 6, AFG: 4 },
  RSA: { IND: 5, AUS: 5, ENG: 5, PAK: 6, NZ: 5, SL: 7, BAN: 6, WI: 7, AFG: 4 },
  NZ: { IND: 4, AUS: 5, ENG: 5, PAK: 5, RSA: 5, SL: 6, BAN: 6, WI: 6, AFG: 4 },
  SL: { IND: 2, AUS: 3, ENG: 4, PAK: 4, RSA: 3, NZ: 4, BAN: 6, WI: 5, AFG: 3 },
  BAN: { IND: 2, AUS: 6, ENG: 3, PAK: 4, RSA: 4, NZ: 4, SL: 4, WI: 5, AFG: 3 },
  WI: { IND: 2, AUS: 3, ENG: 4, PAK: 4, RSA: 3, NZ: 4, SL: 5, BAN: 5, AFG: 4 },
  AFG: { IND: 1, AUS: 2, ENG: 2, PAK: 1, RSA: 1, NZ: 1, SL: 2, BAN: 2, WI: 1 },
};

function getTeam(code) {
  return TEAMS[code] || null;
}

// Teams we don't have hand-set stats for (domestic sides, associate nations,
// league franchises, etc.) get a neutral synthetic profile instead of being
// skipped - this is what lets *every* match show a prediction, not just
// matches between the 10 major international sides. Cached per process so a
// given unknown team gets a consistent rating across matches in one run.
const SYNTHETIC_TEAM_CACHE = new Map();
const DEFAULT_SYNTHETIC_RATING = 72; // roughly mid-table; deliberately neutral

function resolveTeam(codeOrName) {
  if (!codeOrName) return null;
  if (TEAMS[codeOrName]) return TEAMS[codeOrName];
  const byName = Object.values(TEAMS).find((t) => t.name === codeOrName);
  if (byName) return byName;

  if (SYNTHETIC_TEAM_CACHE.has(codeOrName)) return SYNTHETIC_TEAM_CACHE.get(codeOrName);
  const synthetic = {
    code: codeOrName,
    name: codeOrName,
    rating: DEFAULT_SYNTHETIC_RATING,
    recentForm: ['W', 'L', 'W', 'L', 'W'], // neutral 50% placeholder
    estimated: true, // flags to the UI/API that this isn't a real stats profile
  };
  SYNTHETIC_TEAM_CACHE.set(codeOrName, synthetic);
  return synthetic;
}

function getHeadToHeadWinRate(teamCode, opponentCode) {
  const row = HEAD_TO_HEAD[teamCode];
  if (!row || !(opponentCode in row)) return 0.5; // no data -> neutral
  const winsFor = row[opponentCode];
  const winsAgainst = (HEAD_TO_HEAD[opponentCode] && HEAD_TO_HEAD[opponentCode][teamCode]) || 0;
  const total = winsFor + winsAgainst;
  if (total === 0) return 0.5;
  return winsFor / total;
}

function recentFormWinRate(team) {
  if (!team || !team.recentForm || team.recentForm.length === 0) return 0.5;
  const wins = team.recentForm.filter((r) => r === 'W').length;
  return wins / team.recentForm.length;
}

module.exports = { TEAMS, HEAD_TO_HEAD, getTeam, resolveTeam, getHeadToHeadWinRate, recentFormWinRate };
