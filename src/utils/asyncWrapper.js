'use strict';

const { logger } = require('../services/logger');
const { t } = require('../messages/messageStore');

/**
 * Wraps a handler function so any thrown error is logged and reported to
 * the user gracefully. Since errorBoundary already catches everything at
 * the top level, this is a secondary, more granular safety net that lets
 * individual handlers add their own category name to the log for easier
 * debugging, without every handler needing its own try/catch block.
 */
function safeHandler(category, fn) {
  return async (ctx) => {
    try {
      await fn(ctx);
    } catch (err) {
      logger.error(category, `Handler xatosi: ${category}`, {
        error: err,
        userId: ctx.from ? ctx.from.id : null
      });
      const message = await t('error_generic');
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Xatolik').catch(() => {});
      }
      await ctx.reply(message).catch(() => {});
    }
  };
}

module.exports = { safeHandler };
