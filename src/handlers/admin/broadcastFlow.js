'use strict';

const usersRepo = require('../../database/usersRepo');
const broadcastService = require('../../services/broadcastService');
const { t } = require('../../messages/messageStore');
const { getBroadcastConfirmKeyboard, getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { FLOW } = require('../../config/constants');
const { setFlow, getFlow, clearFlow, ensureSessionShape } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function handleBroadcastStart(ctx) {
  await ctx.answerCbQuery();
  setFlow(ctx, FLOW.BROADCAST_AWAITING_CONTENT);
  await replyT(ctx, 'admin_broadcast_ask_content');
}

/**
 * Captures whatever the administrator sends (text, photo, video, etc.)
 * as the broadcast source message, then asks for confirmation before
 * actually sending it to anyone.
 */
async function handleBroadcastContentAnswer(ctx) {
  ensureSessionShape(ctx);
  ctx.session.temp.broadcastSourceChatId = ctx.chat.id;
  ctx.session.temp.broadcastMessageId = ctx.message.message_id;
  setFlow(ctx, FLOW.BROADCAST_CONFIRM);

  const userCount = await usersRepo.countAll();
  const text = await t('admin_broadcast_confirm', { user_count: userCount });
  const keyboard = getBroadcastConfirmKeyboard();
  await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
}

async function handleBroadcastConfirm(ctx) {
  await ctx.answerCbQuery();
  const { broadcastSourceChatId, broadcastMessageId } = ctx.session.temp;

  clearFlow(ctx);

  const progressText = await t('admin_broadcast_progress', { sent: 0, failed: 0, total: 0 });
  const progressMsg = await ctx.reply(progressText, { parse_mode: 'HTML' });

  broadcastService.startBroadcast({
    telegram: ctx.telegram,
    sourceChatId: broadcastSourceChatId,
    messageId: broadcastMessageId,
    onProgress: async ({ sent, failed, total }) => {
      const text = await t('admin_broadcast_progress', { sent, failed, total });
      await ctx.telegram.editMessageText(
        progressMsg.chat.id, progressMsg.message_id, undefined, text, { parse_mode: 'HTML' }
      ).catch(() => {});
    },
    onComplete: async ({ sent, failed, total }) => {
      const text = await t('admin_broadcast_complete', { sent, failed, total });
      await ctx.telegram.sendMessage(progressMsg.chat.id, text, { parse_mode: 'HTML' }).catch(() => {});
    }
  });

  logger.admin('broadcast', 'Broadcast boshlandi', { adminId: ctx.from.id });
}

async function handleBroadcastCancel(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);
  await replyT(ctx, 'admin_broadcast_cancelled', null, getBackToAdminKeyboard());
}

function isAwaitingBroadcastContent(ctx) {
  return getFlow(ctx) === FLOW.BROADCAST_AWAITING_CONTENT;
}

module.exports = {
  handleBroadcastStart: safeHandler('broadcast', handleBroadcastStart),
  handleBroadcastContentAnswer: safeHandler('broadcast', handleBroadcastContentAnswer),
  handleBroadcastConfirm: safeHandler('broadcast', handleBroadcastConfirm),
  handleBroadcastCancel: safeHandler('broadcast', handleBroadcastCancel),
  isAwaitingBroadcastContent
};
