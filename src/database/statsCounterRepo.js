'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');

async function getStats() {
  return readJson(FILES.stats);
}

async function incrementSearches() {
  return updateJson(FILES.stats, (stats) => {
    stats.total_searches = (stats.total_searches || 0) + 1;
    return stats;
  });
}

async function incrementViews() {
  return updateJson(FILES.stats, (stats) => {
    stats.total_views = (stats.total_views || 0) + 1;
    return stats;
  });
}

async function incrementBroadcasts() {
  return updateJson(FILES.stats, (stats) => {
    stats.total_broadcasts = (stats.total_broadcasts || 0) + 1;
    return stats;
  });
}

module.exports = { getStats, incrementSearches, incrementViews, incrementBroadcasts };
