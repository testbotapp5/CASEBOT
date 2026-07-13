'use strict';

const blockedRepo = require('../database/blockedRepo');

/**
 * Silently drops updates from users the administrator has explicitly
 * blocked (via the admin panel), or whom the bot has learned blocked it
 * back on Telegram's side (see broadcastService.handleSendFailure).
 * Admins are exempt so a mistaken block can never lock out management.
 */
function blockGuard() {
  return async (ctx, next) => {
    if (ctx.state.isAdmin) return next();
    if (!ctx.from) return next();

    const blocked = await blockedRepo.isBlocked(ctx.from.id);
    if (blocked) {
      return; // Drop silently — no response is sent to a blocked user.
    }

    return next();
  };
}

module.exports = { blockGuard };
