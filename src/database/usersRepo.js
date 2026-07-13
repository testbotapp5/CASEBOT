'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');

/**
 * users.json shape: { [telegramId: string]: UserRecord }
 * UserRecord = {
 *   id, first_name, last_name, username, language_code,
 *   joined_at, last_active_at, favorites: string[] (movie codes),
 *   search_count, is_blocked
 * }
 */

async function getAll() {
  return readJson(FILES.users);
}

async function getUser(id) {
  const users = await readJson(FILES.users);
  return users[String(id)] || null;
}

async function upsertUser(ctxFrom) {
  const id = String(ctxFrom.id);
  return updateJson(FILES.users, (users) => {
    const existing = users[id];
    users[id] = {
      id,
      first_name: ctxFrom.first_name || '',
      last_name: ctxFrom.last_name || '',
      username: ctxFrom.username || '',
      language_code: ctxFrom.language_code || 'uz',
      joined_at: existing ? existing.joined_at : new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      favorites: existing ? (existing.favorites || []) : [],
      search_count: existing ? (existing.search_count || 0) : 0,
      is_blocked: existing ? Boolean(existing.is_blocked) : false
    };
    return users;
  });
}

async function touchActivity(id) {
  return updateJson(FILES.users, (users) => {
    const key = String(id);
    if (users[key]) {
      users[key].last_active_at = new Date().toISOString();
    }
    return users;
  });
}

async function incrementSearchCount(id) {
  return updateJson(FILES.users, (users) => {
    const key = String(id);
    if (users[key]) {
      users[key].search_count = (users[key].search_count || 0) + 1;
    }
    return users;
  });
}

async function addFavorite(id, movieCode) {
  return updateJson(FILES.users, (users) => {
    const key = String(id);
    if (!users[key]) return users;
    const favorites = new Set(users[key].favorites || []);
    favorites.add(movieCode);
    users[key].favorites = Array.from(favorites);
    return users;
  });
}

async function removeFavorite(id, movieCode) {
  return updateJson(FILES.users, (users) => {
    const key = String(id);
    if (!users[key]) return users;
    users[key].favorites = (users[key].favorites || []).filter((c) => c !== movieCode);
    return users;
  });
}

async function getFavorites(id) {
  const user = await getUser(id);
  return user ? (user.favorites || []) : [];
}

async function countAll() {
  const users = await readJson(FILES.users);
  return Object.keys(users).length;
}

async function countActiveSince(msAgo) {
  const users = await readJson(FILES.users);
  const threshold = Date.now() - msAgo;
  return Object.values(users).filter(
    (u) => new Date(u.last_active_at).getTime() >= threshold
  ).length;
}

module.exports = {
  getAll,
  getUser,
  upsertUser,
  touchActivity,
  incrementSearchCount,
  addFavorite,
  removeFavorite,
  getFavorites,
  countAll,
  countActiveSince
};
