'use strict';

const subscriptionService = require('../services/subscriptionService');
const { getSubscriptionKeyboard } = require('../keyboards/subscriptionKeyboard');
const { t } = require('../messages/messageStore');
const { CALLBACK } = require('../config/constants');
const { logger } = require('../services/logger');

/**
 * Global mandatory-subscription gate. Runs before every command, text
 * message, and callback query. If the user is missing any enabled
 * channel, the requested action is stopped and a "please subscribe"
 * prompt is shown instead — EXCEPT for the "Check subscription" button
 * itself, which must always be allowed through so the user can retry.
 *
 * Admins bypass the check entirely so a misconfigured or unreachable
 * channel can never lock an administrator out of the admin panel.
 */
function subscriptionGuard() {
  return async (ctx, next) => {
    if (ctx.state.isAdmin) return next();
    if (!ctx.from) return next();

    // Always allow the check-subscription button itself through, so the
    // dedicated handler can re-verify and respond appropriately.
    if (ctx.callbackQuery && ctx.callbackQuery.data === CALLBACK.CHECK_SUB) {
      return next();
    }

    let result;
    try {
      result = await subscriptionService.checkSubscription(ctx.telegram, ctx.from.id);
    } catch (err) {
      logger.error('subscription', 'Obunani tekshirishda xato', { error: err, userId: ctx.from.id });
      // Fail open on unexpected errors so a transient Telegram API issue
      // doesn't lock every user out of the entire bot at once.
      return next();
    }

    if (result.subscribed) {
      return next();
    }

    const text = await t('subscription_required');
    const keyboard = getSubscriptionKeyboard(result.missing);

    try {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery();
      }
      await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
    } catch (err) {
      logger.error('subscription', 'Obuna talabini yuborib bo\'lmadi', { error: err, userId: ctx.from.id });
    }

    // Stop the chain here — the originally requested action never runs
    // until the user subscribes and taps "Check subscription".
  };
}

module.exports = { subscriptionGuard };
