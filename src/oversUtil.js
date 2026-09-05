/**
 * Small shared helpers for working with cricket's over.ball notation
 * (e.g. 15.2 = 15 overs and 2 balls, not 15.2 overs decimal) and format sizing.
 * Used by both the live win-probability model (predict.js) and the
 * over-by-over score projection (projection.js).
 */

// Overs per innings by format - both the live win-probability blend and the
// score projection only apply when we know this (Test/multi-day cricket is
// open-ended, so neither model fits it).
const FORMAT_OVERS_LIMIT = { T20I: 20, T20: 20, ODI: 50, LISTA: 50 };

/** Convert cricket's over.ball notation (e.g. 15.2 = 15 overs, 2 balls) to a decimal. */
function oversToDecimal(overs) {
  const whole = Math.floor(overs);
  const balls = Math.round((overs - whole) * 10);
  return whole + balls / 6;
}

/** Format a decimal overs value back into over.ball notation for display. */
function formatOvers(decOvers) {
  const whole = Math.floor(decOvers);
  const balls = Math.round((decOvers - whole) * 6);
  return `${whole}.${balls}`;
}

function oversLimitFor(live, format) {
  return (live && live.oversLimit) || FORMAT_OVERS_LIMIT[format] || null;
}

module.exports = { FORMAT_OVERS_LIMIT, oversToDecimal, formatOvers, oversLimitFor };
