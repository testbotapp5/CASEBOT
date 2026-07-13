'use strict';

const { t } = require('../messages/messageStore');
const { logger } = require('../services/logger');

/**
 * Wraps the entire middleware/handler chain in a try/catch. This is the
 * outermost middleware registered on the bot, so ANY error thrown
 * anywhere downstream (a handler, a service call, a Telegram API call)
 * is caught here instead of crashing the process or leaving the user
 * without a response.
 *
 * Users always get a friendly Uzbek message; the real error (with stack
 * trace) is only ever written to the log, never exposed to a non-admin.
 */
function errorBoundary() {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      logger.error('unhandled', 'Ushlanmagan xato yuz berdi', {
        error: err,
        userId: ctx.from ? ctx.from.id : null,
        updateType: ctx.updateType
      });

      try {
        const message = await t('error_generic');
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('❌ Xatolik yuz berdi').catch(() => {});
        }
        await ctx.reply(message);
      } catch (replyErr) {
        // If we can't even send the error message (e.g. user blocked the
        // bot mid-request), log it and give up gracefully — never rethrow.
        logger.error('unhandled', 'Xato haqida xabar berib ham bo\'lmadi', { error: replyErr });
      }
    }
  };
}

/**
 * Registers process-level safety nets so an unhandled promise rejection
 * or synchronous exception anywhere in the process (including outside
 * the Telegraf middleware chain, e.g. in a setInterval callback) is
 * logged instead of silently crashing or corrupting state.
 */
function installProcessGuards() {
  process.on('unhandledRejection', (reason) => {
    logger.error('process', 'Unhandled Promise Rejection', {
      error: reason instanceof Error ? reason : new Error(String(reason))
    });
  });

  process.on('uncaughtException', (err) => {
    logger.error('process', 'Uncaught Exception', { error: err });
    // Deliberately do NOT exit the process here: for a long-running bot,
    // logging and continuing is safer than an abrupt crash that drops
    // in-flight requests.
  });
}

module.exports = { errorBoundary, installProcessGuards };
