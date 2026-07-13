'use strict';

const fs = require('fs');
const usersRepo = require('../database/usersRepo');
const moviesRepo = require('../database/moviesRepo');
const feedbackRepo = require('../database/feedbackRepo');
const blockedRepo = require('../database/blockedRepo');
const statsCounterRepo = require('../database/statsCounterRepo');
const { DATA_DIR, BACKUPS_DIR } = require('../database/paths');

const DAY_MS = 24 * 60 * 60 * 1000;

function dirSizeBytes(dirPath) {
  let total = 0;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (_) {
    return 0;
  }
  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry.name}`;
    if (entry.isDirectory()) {
      total += dirSizeBytes(fullPath);
    } else {
      try {
        total += fs.statSync(fullPath).size;
      } catch (_) {
        // file may have been removed between readdir and stat; skip it
      }
    }
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days} kun`);
  if (hours) parts.push(`${hours} soat`);
  parts.push(`${minutes} daqiqa`);
  return parts.join(' ');
}

async function collectFullStats() {
  const [
    totalUsers,
    activeToday,
    activeWeek,
    totalMovies,
    unreadFeedback,
    totalBlocked,
    counters
  ] = await Promise.all([
    usersRepo.countAll(),
    usersRepo.countActiveSince(DAY_MS),
    usersRepo.countActiveSince(7 * DAY_MS),
    moviesRepo.countAll(),
    feedbackRepo.countUnread(),
    blockedRepo.countAll(),
    statsCounterRepo.getStats()
  ]);

  let backupCount = 0;
  try {
    backupCount = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.zip')).length;
  } catch (_) {
    backupCount = 0;
  }

  return {
    totalUsers,
    activeToday,
    activeWeek,
    blockedUsers: totalBlocked,
    totalMovies,
    totalViews: counters.total_views || 0,
    totalSearches: counters.total_searches || 0,
    totalBroadcasts: counters.total_broadcasts || 0,
    unreadFeedback,
    databaseSize: formatBytes(dirSizeBytes(DATA_DIR)),
    backupCount,
    serverUptime: formatUptime(process.uptime())
  };
}

module.exports = { collectFullStats, formatBytes, formatUptime };
