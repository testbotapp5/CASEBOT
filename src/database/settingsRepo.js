'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');

async function getSettings() {
  return readJson(FILES.settings);
}

async function updateSettings(patch) {
  return updateJson(FILES.settings, (settings) => {
    Object.assign(settings, patch, { updated_at: new Date().toISOString() });
    return settings;
  });
}

async function toggleMaintenance() {
  return updateJson(FILES.settings, (settings) => {
    settings.bot_status = settings.bot_status === 'active' ? 'maintenance' : 'active';
    settings.updated_at = new Date().toISOString();
    return settings;
  });
}

module.exports = { getSettings, updateSettings, toggleMaintenance };
