'use strict';

/**
 * Default (empty) shape for every JSON collection, plus a lightweight
 * structural validator used to detect corruption before trusting a file.
 */

const DEFAULTS = Object.freeze({
  users: () => ({}),
  movies: () => ({}),
  admins: () => ({}),
  channels: () => ([]),
  settings: () => ({
    bot_status: 'active',
    maintenance_message: '',
    flood_limit: 8,
    cooldown_ms: 800,
    max_caption_length: 1024,
    mini_app_url: '',
    updated_at: new Date().toISOString()
  }),
  messages: () => ({}),
  feedback: () => ({}),
  blocked: () => ({}),
  stats: () => ({
    total_searches: 0,
    total_views: 0,
    total_broadcasts: 0,
    created_at: new Date().toISOString()
  })
});

/**
 * Returns true if the parsed JSON value has the expected top-level type
 * for the given collection name. This is intentionally shallow — it only
 * protects against gross corruption (e.g. a truncated write leaving an
 * object where an array should be), not deep schema validation.
 */
function isValidShape(name, value) {
  if (value === null || value === undefined) return false;
  switch (name) {
    case 'channels':
      return Array.isArray(value);
    case 'users':
    case 'movies':
    case 'admins':
    case 'messages':
    case 'feedback':
    case 'blocked':
    case 'settings':
    case 'stats':
      return typeof value === 'object' && !Array.isArray(value);
    default:
      return typeof value === 'object';
  }
}

function getDefault(name) {
  const factory = DEFAULTS[name];
  if (!factory) {
    throw new Error(`Noma'lum database kolleksiyasi: ${name}`);
  }
  return factory();
}

module.exports = { getDefault, isValidShape, DEFAULTS };
