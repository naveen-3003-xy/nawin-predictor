/**
 * Mock fixture list used whenever no live CricAPI key is configured, or when
 * the live API call fails. Dates are relative to "today" so the app always
 * shows a sensible current/upcoming schedule regardless of when it's run.
 *
 * Two fixtures are marked "live" with a `live` block attached, so the
 * in-play prediction model (src/predict.js -> applyLiveState) has something
 * to demonstrate even without a real API key:
 *   - mock-1: 1st innings in progress (no target yet - projected-score read)
 *   - mock-6: 2nd innings, a chase in progress (required-rate read)
 */

function daysFromNow(days, hour = 14) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const MOCK_MATCHES = [
  {
    id: 'mock-1',
    format: 'T20I',
    teams: ['IND', 'AUS'],
    venue: 'Wankhede Stadium, Mumbai',
    date: daysFromNow(0, 19),
    status: 'live',
    homeTeamCode: 'IND',
    live: {
      inning: 1,
      battingTeamCode: 'IND',
      battingTeamName: 'India',
      runs: 142,
      wickets: 3,
      overs: 15.2,
      target: null,
    },
  },
  {
    id: 'mock-2',
    format: 'ODI',
    teams: ['ENG', 'RSA'],
    venue: "Lord's, London",
    date: daysFromNow(1, 15),
    status: 'upcoming',
    homeTeamCode: 'ENG',
    live: null,
  },
  {
    id: 'mock-3',
    format: 'Test',
    teams: ['PAK', 'NZ'],
    venue: 'Gaddafi Stadium, Lahore',
    date: daysFromNow(2, 10),
    status: 'upcoming',
    homeTeamCode: 'PAK',
    live: null,
  },
  {
    id: 'mock-4',
    format: 'T20I',
    teams: ['SL', 'BAN'],
    venue: 'R. Premadasa Stadium, Colombo',
    date: daysFromNow(3, 19),
    status: 'upcoming',
    homeTeamCode: 'SL',
    live: null,
  },
  {
    id: 'mock-5',
    format: 'ODI',
    teams: ['WI', 'AFG'],
    venue: 'Kensington Oval, Barbados',
    date: daysFromNow(4, 18),
    status: 'upcoming',
    homeTeamCode: 'WI',
    live: null,
  },
  {
    id: 'mock-6',
    format: 'T20I',
    teams: ['AUS', 'RSA'],
    venue: 'MCG, Melbourne',
    date: daysFromNow(5, 19),
    status: 'live',
    homeTeamCode: 'AUS',
    live: {
      inning: 2,
      battingTeamCode: 'RSA',
      battingTeamName: 'South Africa',
      runs: 118,
      wickets: 5,
      overs: 15.4,
      target: 168, // Australia posted 167 batting first
      firstInnings: { teamCode: 'AUS', runs: 167, wickets: 6, overs: 20 },
    },
  },
];

module.exports = { MOCK_MATCHES };
