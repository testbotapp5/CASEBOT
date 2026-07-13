'use strict';

const { t } = require('../messages/messageStore');
const { ADMIN_ROLES, MANAGEMENT_ROLES, ROLES } = require('../config/constants');
const { logger } = require('../services/logger');

/**
 * Middleware factory: only allows the update through if ctx.state.role is
 * one of `allowedRoles`. Otherwise replies with an access-denied message
 * and logs the attempt as a security event (repeated attempts by the same
 * non-admin user are a signal worth watching).
 */
function requireRole(allowedRoles) {
  return async (ctx, next) => {
    const role = ctx.state.role;
    if (role && allowedRoles.includes(role)) {
      return next();
    }

    logger.security('admin_auth', 'Ruxsatsiz admin amaliga urinish', {
      userId: ctx.from ? ctx.from.id : null,
      role,
      required: allowedRoles
    });

    const text = await t('admin_no_access');
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      await ctx.reply(text);
    } catch (err) {
      logger.error('admin_auth', 'Ruxsat rad javobini yuborib bo\'lmadi', { error: err });
    }
  };
}

const requireAnyAdmin = () => requireRole(ADMIN_ROLES);
const requireManagement = () => requireRole(MANAGEMENT_ROLES);
const requireSuperAdmin = () => requireRole([ROLES.SUPER_ADMIN]);

module.exports = { requireRole, requireAnyAdmin, requireManagement, requireSuperAdmin };
