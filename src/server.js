require('dotenv').config();
const path = require('path');
const express = require('express');
const cricapi = require('./cricapi');
const { getMatches, getMatchById } = require('./matches');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/status', (req, res) => {
  res.json({
    liveDataConfigured: cricapi.isConfigured(),
  });
});

app.get('/api/matches', async (req, res) => {
  try {
    const result = await getMatches();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load matches', detail: err.message });
  }
});

app.get('/api/matches/:id', async (req, res) => {
  try {
    const result = await getMatches();
    const match = getMatchById(req.params.id, result.matches);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json({ source: result.source, match });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load match', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`NaWIN Predictor running at http://localhost:${PORT}`);
  console.log(
    cricapi.isConfigured()
      ? 'Live data: CRICAPI_KEY detected, will use CricAPI (falls back to mock data on error).'
      : 'Live data: no CRICAPI_KEY set, using mock fixtures. See README.md to add a key.'
  );
});
