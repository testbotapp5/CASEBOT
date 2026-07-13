'use strict';

/**
 * Formats an ISO date string into a compact Uzbek-friendly display, e.g.
 * "11.07.2026 09:15". Returns an em dash if the input is missing/invalid,
 * so message templates never render "Invalid Date".
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function orDash(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

/**
 * Builds the "Original nomi: ..." line for a movie card, but only if an
 * original name was actually provided — otherwise returns an empty
 * string so the card doesn't show a redundant "Original nomi: —" line.
 */
function originalNameLine(movie) {
  if (!movie.original_name) return '';
  return `🎞 Original nomi: ${movie.original_name}\n`;
}

function truncate(text, maxLength) {
  const str = String(text || '');
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1).trimEnd() + '…';
}

module.exports = { formatDate, orDash, originalNameLine, truncate };
