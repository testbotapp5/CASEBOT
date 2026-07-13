'use strict';

const usersRepo = require('../database/usersRepo');
const adminsRepo = require('../database/adminsRepo');
const { getConfig } = require('../config/botConfig');
const { ROLES } = require('../config/constants');

/**
 * Registers or refreshes a user's record and returns their effective role.
 * Called once per incoming update from the registration middleware.
 */
async function registerAndGetRole(ctxFrom) {
  await usersRepo.upsertUser(ctxFrom);
  const { SUPER_ADMIN_ID } = getConfig();
  return adminsRepo.getRole(ctxFrom.id, SUPER_ADMIN_ID);
}

async function isUserAdmin(userId) {
  const { SUPER_ADMIN_ID } = getConfig();
  return adminsRepo.isAdmin(userId, SUPER_ADMIN_ID);
}

async function isSuperAdmin(userId) {
  const { SUPER_ADMIN_ID } = getConfig();
  return String(userId) === String(SUPER_ADMIN_ID);
}

function displayName(user) {
  if (!user) return '';
  if (user.username) return `@${user.username}`;
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || String(user.id);
}

module.exports = { registerAndGetRole, isUserAdmin, isSuperAdmin, displayName, ROLES };
