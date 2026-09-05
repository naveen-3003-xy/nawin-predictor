const matchListEl = document.getElementById('match-list');
const dataBadgeEl = document.getElementById('data-badge');
const overlayEl = document.getElementById('detail-overlay');
const detailContentEl = document.getElementById('detail-content');
const closeDetailBtn = document.getElementById('close-detail');

let currentMatches = [];

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const status = await res.json();
    dataBadgeEl.textContent = status.liveDataConfigured ? 'Live data (CricAPI)' : 'Demo data (no API key set)';
    dataBadgeEl.className = 'data-badge ' + (status.liveDataConfigured ? 'live' : 'mock');
  } catch {
    dataBadgeEl.textContent = 'Status unknown';
  }
}

function teamInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

function battingTeamName(match, live) {
  const idx = match.teams.indexOf(live.battingTeamCode);
  return (match.teamNames && match.teamNames[idx]) || live.battingTeamCode;
}

function liveScoreLine(match) {
  const live = match.prediction && match.prediction.live;
  if (!live) return '';
  const name = battingTeamName(match, live);
  const targetPart = live.target ? ` · chasing ${live.target}` : '';
  return `${name} ${live.runs}/${live.wickets} (${live.overs} ov)${targetPart}`;
}

function formatDate(iso) {
  if (!iso) return 'Date TBC';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderMatches(matches) {
  if (matches.length === 0) {
    matchListEl.innerHTML = '<div class="loading">No fixtures available right now.</div>';
    return;
  }

  matchListEl.innerHTML = matches
    .map((m) => {
      const [codeA, codeB] = m.teams;
      const [nameA, nameB] = m.teamNames || [codeA, codeB];
      const statusClass = `status-${m.status}`;

      let probBar = '';
      let probsHtml = '';
      if (m.prediction) {
        const pA = m.prediction.winProbability[codeA];
        const pB = m.prediction.winProbability[codeB];
        const favA = m.prediction.favorite === codeA;
        probBar = `
          <div class="prob-bar">
            <div class="prob-bar-fill-a" style="width:${pA}%"></div>
            <div class="prob-bar-fill-b" style="width:${pB}%"></div>
          </div>`;
        probsHtml = `
          <span class="team-prob ${favA ? 'favorite' : ''}">${pA}%</span>`;
        var probsHtmlB = `<span class="team-prob ${!favA ? 'favorite' : ''}">${pB}%</span>`;
      } else {
        probBar = `<div class="no-prediction">${m.predictionUnavailableReason || 'Prediction unavailable'}</div>`;
      }

      const liveLine = m.status === 'live' && m.prediction && m.prediction.live
        ? `<div class="live-score-line"><span class="dot"></span>${liveScoreLine(m)}</div>`
        : '';

      return `
        <article class="match-card" data-id="${m.id}">
          <div class="match-meta">
            <span>${m.format} · ${m.venue}</span>
            <span class="status-pill ${statusClass}">${m.status}</span>
          </div>
          ${liveLine}
          <div class="matchup">
            <div class="team">
              <div class="team-badge">${teamInitials(nameA)}</div>
              <div>
                <div class="team-name">${nameA}</div>
                ${m.prediction ? probsHtml : ''}
              </div>
            </div>
            <div class="vs">${formatDate(m.date)}</div>
            <div class="team right">
              <div class="team-badge">${teamInitials(nameB)}</div>
              <div>
                <div class="team-name">${nameB}</div>
                ${m.prediction ? probsHtmlB : ''}
              </div>
            </div>
          </div>
          ${probBar}
        </article>`;
    })
    .join('');

  document.querySelectorAll('.match-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

const PROJECTION_STATUS_LABEL = {
  projected: 'Pre-match projection',
  live: 'Live',
  final: 'Final score',
};

function renderProjectionRow(cp) {
  const isActual = Boolean(cp.actual);
  const label = cp.final
    ? `Final (${cp.overDisplay} ov)`
    : cp.now
    ? `Now (${cp.overDisplay} ov)`
    : `${cp.over} overs`;
  const runsLabel = cp.wickets != null ? `${cp.runs}/${cp.wickets}` : `~${cp.runs}`;
  return { isActual, label, runsLabel, runs: cp.runs };
}

function renderScoreProjection(match) {
  const projection = match.prediction && match.prediction.scoreProjection;
  if (!projection) {
    return `<div class="projection-section"><p class="no-prediction">Over-by-over projection isn't available for ${match.format} cricket.</p></div>`;
  }

  const [codeA, codeB] = match.teams;
  const [nameA, nameB] = match.teamNames || [codeA, codeB];
  const teamMeta = [
    { code: codeA, name: nameA },
    { code: codeB, name: nameB },
  ];

  const allRows = teamMeta.flatMap((t) => (projection.teams[t.code] || { checkpoints: [] }).checkpoints);
  const maxRuns = Math.max(1, ...allRows.map((r) => r.runs));

  const blocks = teamMeta
    .map((t) => {
      const teamProjection = projection.teams[t.code];
      if (!teamProjection) return '';
      const rowsHtml = teamProjection.checkpoints
        .map((cp) => {
          const row = renderProjectionRow(cp);
          const pct = Math.max(4, Math.round((row.runs / maxRuns) * 100));
          return `
            <div class="projection-row">
              <span class="projection-over">${row.label}</span>
              <div class="projection-bar-track">
                <div class="projection-bar-fill ${row.isActual ? 'actual' : 'projected'}" style="width:${pct}%"></div>
              </div>
              <span class="projection-runs">${row.runsLabel}</span>
            </div>`;
        })
        .join('');

      return `
        <div class="projection-team">
          <div class="projection-team-name">${t.name} <span class="projection-status">${
        PROJECTION_STATUS_LABEL[teamProjection.status] || ''
      }</span></div>
          <div class="projection-rows">${rowsHtml}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="projection-section">
      <div class="breakdown-title">Projected scoring (runs after X overs)</div>
      ${blocks}
    </div>`;
}

function openDetail(id) {
  const match = currentMatches.find((m) => m.id === id);
  if (!match) return;

  const [codeA, codeB] = match.teams;
  const [nameA, nameB] = match.teamNames || [codeA, codeB];

  let body;
  if (match.prediction) {
    const pA = match.prediction.winProbability[codeA];
    const pB = match.prediction.winProbability[codeB];
    const favA = match.prediction.favorite === codeA;

    const breakdownHtml = match.prediction.breakdown
      .map(
        (f) => `
        <div class="factor-row">
          <div class="factor-name">
            <span>${f.factor}</span>
            <span class="factor-weight">${Math.round(f.weight * 100)}% weight</span>
          </div>
          <div class="factor-detail">${f.detail}</div>
        </div>`
      )
      .join('');

    const liveBanner =
      match.status === 'live' && match.prediction.live
        ? `<div class="live-banner">
            <div class="live-label"><span class="dot" style="width:6px;height:6px;border-radius:50%;background:var(--danger);display:inline-block;"></span>Live now</div>
            <div class="live-score">${liveScoreLine(match)}</div>
            <div class="live-detail">${match.prediction.live.note}</div>
          </div>`
        : '';

    body = `
      ${liveBanner}
      <div class="big-prob-row">
        <div class="big-prob ${favA ? 'favorite' : ''}">
          <div class="pct">${pA}%</div>
          <div class="name">${nameA}</div>
        </div>
        <div class="big-prob ${!favA ? 'favorite' : ''}">
          <div class="pct">${pB}%</div>
          <div class="name">${nameB}</div>
        </div>
      </div>
      ${renderScoreProjection(match)}
      <div class="breakdown-title">How this was calculated</div>
      ${breakdownHtml}
    `;
  } else {
    body = `<p class="no-prediction">${match.predictionUnavailableReason || 'Prediction unavailable for this match.'}</p>`;
  }

  detailContentEl.innerHTML = `
    <div class="detail-title">${nameA} vs ${nameB}</div>
    <div class="detail-sub">${match.format} · ${match.venue} · ${formatDate(match.date)}</div>
    ${body}
  `;

  overlayEl.classList.remove('hidden');
}

closeDetailBtn.addEventListener('click', () => overlayEl.classList.add('hidden'));
overlayEl.addEventListener('click', (e) => {
  if (e.target === overlayEl) overlayEl.classList.add('hidden');
});

async function loadMatches() {
  try {
    const res = await fetch('/api/matches');
    const data = await res.json();
    currentMatches = data.matches || [];
    renderMatches(currentMatches);
  } catch (err) {
    matchListEl.innerHTML = `<div class="loading">Failed to load fixtures: ${err.message}</div>`;
  }
}

loadStatus();
loadMatches();
