'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');
const { ROLES } = require('../config/constants');

/**
 * admins.json shape: { [telegramId: string]: { id, role, added_by, added_at } }
 * The SUPER_ADMIN_ID from env is always treated as super_admin even if not
 * present in this file (see isSuperAdmin below) so the bot can never lock
 * itself out.
 */

async function getAll() {
  return readJson(FILES.admins);
}

async function getAdmin(id) {
  const admins = await readJson(FILES.admins);
  return admins[String(id)] || null;
}

async function isAdmin(id, superAdminId) {
  if (String(id) === String(superAdminId)) return true;
  const admin = await getAdmin(id);
  return admin !== null;
}

async function getRole(id, superAdminId) {
  if (String(id) === String(superAdminId)) return ROLES.SUPER_ADMIN;
  const admin = await getAdmin(id);
  return admin ? admin.role : null;
}

async function addAdmin(id, role, addedBy) {
  return updateJson(FILES.admins, (admins) => {
    admins[String(id)] = {
      id: String(id),
      role,
      added_by: String(addedBy),
      added_at: new Date().toISOString()
    };
    return admins;
  });
}

async function removeAdmin(id) {
  return updateJson(FILES.admins, (admins) => {
    delete admins[String(id)];
    return admins;
  });
}

module.exports = { getAll, getAdmin, isAdmin, getRole, addAdmin, removeAdmin };
