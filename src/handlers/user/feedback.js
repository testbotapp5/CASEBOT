'use strict';

const feedbackRepo = require('../../database/feedbackRepo');
const adminsRepo = require('../../database/adminsRepo');
const { t } = require('../../messages/messageStore');
const { getConfig } = require('../../config/botConfig');
const { FLOW } = require('../../config/constants');
const { setFlow, clearFlow, getFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function handleFeedbackPrompt(ctx) {
  setFlow(ctx, FLOW.FEEDBACK_AWAITING_TEXT);
  await replyT(ctx, 'feedback_prompt');
}

/**
 * Called from the text-message router when the user is in the
 * FEEDBACK_AWAITING_TEXT state. Saves the feedback and notifies every
 * administrator.
 */
async function handleFeedbackSubmission(ctx) {
  const message = ctx.message.text.trim();
  if (!message) return;

  const id = await feedbackRepo.create({
    userId: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    message
  });

  clearFlow(ctx);
  await replyT(ctx, 'feedback_sent');

  await notifyAdminsOfFeedback(ctx, id, message);
}

async function notifyAdminsOfFeedback(ctx, feedbackId, message) {
  const { SUPER_ADMIN_ID } = getConfig();
  const admins = await adminsRepo.getAll();
  const adminIds = new Set([String(SUPER_ADMIN_ID), ...Object.keys(admins)]);

  const notification = await t('feedback_admin_notification', {
    first_name: ctx.from.first_name || '',
    username: ctx.from.username || '—',
    user_id: ctx.from.id,
    date: new Date().toLocaleString('uz-UZ'),
    message
  });

  for (const adminId of adminIds) {
    try {
      await ctx.telegram.sendMessage(adminId, notification, { parse_mode: 'HTML' });
    } catch (err) {
      logger.warn('feedback', `Adminga fikr haqida xabar berib bo'lmadi: ${adminId}`, { error: err.message });
    }
  }
}

module.exports = {
  handleFeedbackPrompt: safeHandler('feedback', handleFeedbackPrompt),
  handleFeedbackSubmission: safeHandler('feedback', handleFeedbackSubmission),
  isAwaitingFeedback: (ctx) => getFlow(ctx) === FLOW.FEEDBACK_AWAITING_TEXT
};
