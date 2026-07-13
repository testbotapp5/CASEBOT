'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');

/**
 * feedback.json shape: { [id: string]: {
 *   id, user_id, username, first_name, message, created_at,
 *   is_read, admin_reply, replied_at
 * } }
 */

async function getAll() {
  return readJson(FILES.feedback);
}

async function getById(id) {
  const all = await readJson(FILES.feedback);
  return all[String(id)] || null;
}

async function create({ userId, username, firstName, message }) {
  const id = String(Date.now());
  return updateJson(FILES.feedback, (all) => {
    all[id] = {
      id,
      user_id: String(userId),
      username: username || '',
      first_name: firstName || '',
      message,
      created_at: new Date().toISOString(),
      is_read: false,
      admin_reply: null,
      replied_at: null
    };
    return all;
  }).then(() => id);
}

async function markRead(id) {
  return updateJson(FILES.feedback, (all) => {
    if (all[String(id)]) all[String(id)].is_read = true;
    return all;
  });
}

async function setReply(id, replyText) {
  return updateJson(FILES.feedback, (all) => {
    const entry = all[String(id)];
    if (entry) {
      entry.admin_reply = replyText;
      entry.replied_at = new Date().toISOString();
      entry.is_read = true;
    }
    return all;
  });
}

async function remove(id) {
  return updateJson(FILES.feedback, (all) => {
    delete all[String(id)];
    return all;
  });
}

async function countUnread() {
  const all = await readJson(FILES.feedback);
  return Object.values(all).filter((f) => !f.is_read).length;
}

module.exports = { getAll, getById, create, markRead, setReply, remove, countUnread };
