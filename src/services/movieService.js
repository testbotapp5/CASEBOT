'use strict';

const moviesRepo = require('../database/moviesRepo');
const statsCounterRepo = require('../database/statsCounterRepo');
const { logger } = require('./logger');

/**
 * Registers a movie view: increments the movie's own view counter and the
 * global stats counter. Fire-and-forget from the caller's perspective but
 * awaited here so failures are logged rather than silently lost.
 */
async function registerView(code) {
  try {
    await moviesRepo.incrementViews(code);
    await statsCounterRepo.incrementViews();
  } catch (err) {
    logger.error('movie', `Ko'rishlar sonini oshirib bo'lmadi: ${code}`, { error: err });
  }
}

async function registerSearch() {
  try {
    await statsCounterRepo.incrementSearches();
  } catch (err) {
    logger.error('movie', 'Qidiruv sonini oshirib bo\'lmadi', { error: err });
  }
}

/**
 * Splits a comma/semicolon separated free-text field (genres, actors,
 * keywords, tags) into a clean array. Returns null for empty input so
 * "not provided" and "empty list" stay distinguishable.
 */
function parseListField(text) {
  if (!text || !text.trim()) return null;
  return text
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatListField(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

module.exports = {
  registerView,
  registerSearch,
  parseListField,
  formatListField
};
