'use strict';

const { getConfig } = require('../config/botConfig');
const { LIMITS } = require('../config/constants');
const { logger } = require('../services/logger');

// In-memory sliding-window action log per user. This resets on restart,
// which is fine — rate limiting only needs to survive within a single
// process lifetime, not across restarts.
const actionLog = new Map();

/**
 * Generic sliding-window rate limiter: returns true if the action should
 * be ALLOWED (i.e. the user is under their limit), false if it should be
 * blocked. Automatically prunes old timestamps so memory never grows
 * unbounded even for very active users.
 */
function isWithinLimit(userId, windowMs, maxActions) {
  const now = Date.now();
  const key = String(userId);
  const timestamps = (actionLog.get(key) || []).filter((ts) => now - ts < windowMs);

  if (timestamps.length >= maxActions) {
    actionLog.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  actionLog.set(key, timestamps);
  return true;
}

/**
 * Global flood protection: caps how many actions (messages, button
 * presses) a non-admin user can perform within a short window. Admins
 * are exempt so a busy admin session is never throttled.
 */
function rateLimiter() {
  return async (ctx, next) => {
    if (ctx.state.isAdmin) return next();
    if (!ctx.from) return next();

    const { FLOOD_LIMIT } = getConfig();
    const allowed = isWithinLimit(ctx.from.id, LIMITS.SPAM_WINDOW_MS, FLOOD_LIMIT);

    if (!allowed) {
      logger.security('rate_limit', `Flood aniqlandi: ${ctx.from.id}`, { userId: ctx.from.id });
      // Fail silently after the first warning to avoid amplifying the
      // flood with bot responses of our own; do not call next().
      return;
    }

    return next();
  };
}

module.exports = { rateLimiter, isWithinLimit };
