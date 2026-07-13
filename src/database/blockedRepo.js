'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');

const usersFile = FILES.users;

/**
 * blocked.json shape: { [telegramId: string]: { blocked_at, reason } }
 * Kept as a separate collection (in addition to users.is_blocked flag) so
 * broadcast/etc. can cheaply check "did this user block the bot on
 * Telegram's side" without loading the full user record.
 */

async function getAll() {
  return readJson(FILES.blocked);
}

async function isBlocked(id) {
  const all = await readJson(FILES.blocked);
  return Boolean(all[String(id)]);
}

async function block(id, reason = 'bot_blocked_by_user') {
  await updateJson(FILES.blocked, (all) => {
    all[String(id)] = { blocked_at: new Date().toISOString(), reason };
    return all;
  });
  await updateJson(usersFile, (users) => {
    const key = String(id);
    if (users[key]) users[key].is_blocked = true;
    return users;
  });
}

async function unblock(id) {
  await updateJson(FILES.blocked, (all) => {
    delete all[String(id)];
    return all;
  });
  await updateJson(usersFile, (users) => {
    const key = String(id);
    if (users[key]) users[key].is_blocked = false;
    return users;
  });
}

async function countAll() {
  const all = await readJson(FILES.blocked);
  return Object.keys(all).length;
}

module.exports = { getAll, isBlocked, block, unblock, countAll };
