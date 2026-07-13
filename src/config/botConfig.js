'use strict';

/**
 * Central place that exposes the loaded, validated environment as a single
 * config object. Every other module should read configuration from here
 * instead of touching process.env directly.
 */

const { loadEnv } = require('./env');

let cachedConfig = null;

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadEnv();
  }
  return cachedConfig;
}

module.exports = { getConfig };
