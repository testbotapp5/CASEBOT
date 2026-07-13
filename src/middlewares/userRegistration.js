'use strict';

const userService = require('../services/userService');
const { logger } = require('../services/logger');

/**
 * Runs first in the middleware chain: registers/refreshes the user record
 * and attaches ctx.state.role (super_admin | admin | moderator | user) so
 * every downstream handler can make authorization decisions without
 * re-querying the database.
 */
function userRegistration() {
  return async (ctx, next) => {
    const from = ctx.from;
    if (!from) return next();

    try {
      const role = await userService.registerAndGetRole(from);
      ctx.state.isAdmin = role !== null && role !== undefined;
      ctx.state.role = role || 'user';
    } catch (err) {
      logger.error('middleware', 'Foydalanuvchini ro\'yxatga olishda xato', { error: err, userId: from.id });
      ctx.state.role = 'user';
      ctx.state.isAdmin = false;
    }

    return next();
  };
}

module.exports = { userRegistration };
