# NaWIN Predictor (prototype)

A small full-stack web app that predicts cricket match win probabilities from
team power ratings, recent form, head-to-head record, and home advantage —
with a plain-language breakdown of how each prediction was built.

Runs on **demo data** out of the box. Add a free **CricAPI** key to switch to
live fixtures.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000 — you'll see 6 demo fixtures with predictions.
The badge in the top right says "Demo data" until a live key is added.

## Adding live data (CricAPI)

1. Go to **https://cricapi.com** and click "Get Started" / "Start Using"
   (this routes through their platform at cricketdata.org).
2. Create a free account (email + password, or Google sign-in).
3. Once logged in, your dashboard shows an **API key** — copy it.
4. In this project, copy the env file and paste your key in:
   ```bash
   cp .env.example .env
   # then edit .env and set:
   # CRICAPI_KEY=your-key-here
   ```
5. Restart the app: `npm start`. The badge should switch to "Live data
   (CricAPI)". If the API call fails for any reason (rate limit, network,
   wrong key), the app automatically falls back to demo fixtures so it never
   just breaks — check the terminal log for the specific error.

CricAPI's free plan is rate-limited (check your dashboard for the current
daily quota) and only covers *international* matches out of the box. Domestic
league matches (IPL, BBL, etc.) may need a paid plan or a different endpoint.

**Every match gets a prediction**, even ones CricAPI reports for teams outside
the 10 major sides this app has hand-set stats for (see `NAME_TO_CODE` in
`src/matches.js`) — an unrecognized team name falls back to a neutral
synthetic profile (`resolveTeam()` in `src/data/teams.js`) instead of being
skipped. To get real predictions for more teams, add them to `TEAMS` and
`NAME_TO_CODE`.

## How predictions work (`src/predict.js`)

### Pre-match

Each matchup starts from four weighted factors:

| Factor | Weight | Source |
|---|---|---|
| Power rating | 45% | `src/data/teams.js` — hand-set 0–100 ratings |
| Recent form (last 5) | 30% | `src/data/teams.js` — W/L strings |
| Head-to-head record | 15% | `src/data/teams.js` — mock win tallies |
| Home advantage | 10% | fixed bonus if a `homeTeamCode` is set on the match |

### Live, in-play adjustment

For any match CricAPI (or the mock data) marks as **live**, the pre-match
number is blended with a read of the current score — the further the innings
has gone, the more the live state outweighs the pre-match number:

- **Chasing a target (2nd innings)**: compares required run rate to current
  run rate and factors in wickets in hand — the standard "chase pressure"
  read. This is the dominant signal late in a chase.
- **Setting a target (1st innings)**: projects a final score from the current
  run rate (dampened by wickets lost) and compares it to a rough par score
  for the format, nudging the batting side's probability up or down.

This only applies to limited-overs cricket (T20I/ODI) where "overs remaining"
is well defined — Test matches keep the pre-match-only prediction. The match
card shows the live score line (e.g. "India 142/3 (15.2 ov)"), and the detail
view shows the full reasoning, including required/current run rate.

The result is a win probability for each side (clamped between 3% and 97%,
since no cricket match is ever a certainty) plus a factor-by-factor
breakdown, which the UI shows when you click a match card.

### Over-by-over score projection (`src/projection.js`)

Click into any T20I/ODI match and you'll see a "Projected scoring" section —
how many runs each side is projected to have at set over checkpoints (every 5
overs for T20I, every 10 for ODI). It's built the same explainable way as the
win-probability model:

- A rough **phase-by-phase run-rate curve** per format (faster powerplay,
  steadier middle overs, accelerating death overs) gives the baseline shape.
- That baseline is scaled by a **team pace factor** from the side's power
  rating and recent form — stronger, in-form sides are projected to score
  faster than the baseline, weaker ones slower.
- For a **live** innings, the curve anchors on the actual current score and
  overs, and projects the remaining checkpoints by blending the side's actual
  current run rate with the expected pace of the remaining phase, dampened
  for wickets already lost.
- Once an innings is over (e.g. the team that batted first in a chase), its
  actual final score is shown as-is rather than a projection.

Not available for Test cricket, where "overs remaining" isn't a meaningful
concept — the detail view says so rather than showing a broken chart.

This is a transparent, hand-tuned formula — not a trained ML model. It's a
good, explainable starting point for a vibe-coding session; natural next
steps are listed below.

## Project structure

```
src/
  server.js       - Express app + routes (/api/status, /api/matches, /api/matches/:id)
  cricapi.js       - CricAPI client (only used when CRICAPI_KEY is set)
  matches.js       - merges live/mock matches, attaches predictions
  predict.js        - the win-probability model
  projection.js      - the over-by-over score projection model
  oversUtil.js         - shared overs.balls <-> decimal helpers, format sizing
  data/
    teams.js         - team ratings, recent form, head-to-head table
    mockMatches.js    - demo fixture list
public/
  index.html, css/style.css, js/app.js   - frontend (vanilla JS, no build step)
```

## Natural next steps

- **More teams / domestic leagues**: add entries to `TEAMS` and
  `NAME_TO_CODE` in `src/data/teams.js` / `src/matches.js`.
- **Real historical stats**: replace the hand-set `rating`, `recentForm`, and
  `HEAD_TO_HEAD` data with numbers computed from a stats API or a CSV of
  historical results.
- **Player-level detail**: CricAPI has `players` / `players_info` endpoints
  for individual stats (top scorer / top wicket-taker predictions).
- **Persistence**: add a database (SQLite/Postgres) if you want to store
  predictions and check accuracy over time, or let users submit their own
  guesses and keep a leaderboard.
- **Auth + accounts**: needed before this could support user predictions,
  friend groups, or leaderboards.
- **Deploy**: this is a plain Node/Express app — deploys as-is to Render,
  Railway, Fly.io, or a VPS. Set `CRICAPI_KEY` (and `PORT` if needed) as
  environment variables on whichever platform you pick.

## Disclaimer

Predictions are a statistical estimate for research/entertainment purposes,
not betting advice.
