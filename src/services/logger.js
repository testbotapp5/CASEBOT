'use strict';

const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../database/paths');

/**
 * Structured logger. Writes newline-delimited JSON to daily log files
 * under logs/, and mirrors human-readable output to the console.
 * Never throws — a logging failure must never crash the bot.
 */

const LEVELS = Object.freeze({
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY',
  ADMIN: 'ADMIN'
});

function ensureLogsDir() {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch (_) {
    // If we can't even create the logs dir, fall back to console-only.
  }
}
ensureLogsDir();

function dailyFilePath() {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(LOGS_DIR, `${today}.log`);
}

function write(level, category, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...meta
  };

  const line = JSON.stringify(entry);

  try {
    fs.appendFileSync(dailyFilePath(), line + '\n', 'utf8');
  } catch (_) {
    // Swallow filesystem errors — logging must never take the bot down.
  }

  const consoleMethod = level === LEVELS.ERROR ? 'error'
    : level === LEVELS.WARN ? 'warn'
    : 'log';
  // eslint-disable-next-line no-console
  console[consoleMethod](`[${entry.timestamp}] [${level}] [${category}] ${message}`);
}

const logger = {
  info: (category, message, meta) => write(LEVELS.INFO, category, message, meta),
  warn: (category, message, meta) => write(LEVELS.WARN, category, message, meta),
  error: (category, message, meta) => {
    const errMeta = meta && meta.error instanceof Error
      ? { ...meta, error: { message: meta.error.message, stack: meta.error.stack } }
      : meta;
    write(LEVELS.ERROR, category, message, errMeta);
  },
  security: (category, message, meta) => write(LEVELS.SECURITY, category, message, meta),
  admin: (category, message, meta) => write(LEVELS.ADMIN, category, message, meta)
};

module.exports = { logger, LEVELS };
