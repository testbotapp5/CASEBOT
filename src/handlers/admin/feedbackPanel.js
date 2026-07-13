'use strict';

const feedbackRepo = require('../../database/feedbackRepo');
const { t } = require('../../messages/messageStore');
const { getFeedbackItemKeyboard, getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { getPaginatedKeyboard } = require('../../keyboards/paginationKeyboard');
const { formatDate } = require('../../utils/formatters');
const { FLOW, CALLBACK } = require('../../config/constants');
const { setFlow, getFlow, clearFlow, ensureSessionShape } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function handleFeedbackList(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);

  const all = await feedbackRepo.getAll();
  const items = Object.values(all).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (items.length === 0) {
    const emptyText = await t('admin_feedback_empty');
    return ctx.editMessageText(emptyText, { parse_mode: 'HTML', ...getBackToAdminKeyboard() }).catch(async () => {
      await ctx.reply(emptyText, { parse_mode: 'HTML', ...getBackToAdminKeyboard() });
    });
  }

  const { keyboard } = getPaginatedKeyboard({
    items,
    page: 1,
    pageSize: 8,
    labelFn: (f) => `${f.is_read ? '✅' : '🆕'} ${f.first_name || f.user_id} — ${formatDate(f.created_at)}`,
    dataFn: (f) => `${CALLBACK.ADMIN_FEEDBACK_VIEW}:${f.id}`,
    pageCallbackPrefix: CALLBACK.ADMIN_FEEDBACK_LIST + ':page',
    extraRows: [[{ text: '⬅️ Admin panelga qaytish', callback_data: CALLBACK.ADMIN_PANEL }]]
  });

  await ctx.editMessageText(`💬 Fikr-mulohazalar (${items.length})`, keyboard).catch(async () => {
    await ctx.reply(`💬 Fikr-mulohazalar (${items.length})`, keyboard);
  });
}

async function handleFeedbackView(ctx) {
  const id = ctx.callbackQuery.data.split(':')[3];
  await ctx.answerCbQuery();

  const item = await feedbackRepo.getById(id);
  if (!item) {
    return ctx.reply('❌ Fikr-mulohaza topilmadi.');
  }

  await feedbackRepo.markRead(id);

  const text = await t('admin_feedback_item', {
    first_name: item.first_name || '—',
    username: item.username || '—',
    user_id: item.user_id,
    date: formatDate(item.created_at),
    message: item.message
  });

  const keyboard = getFeedbackItemKeyboard(id);
  await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
}

async function handleFeedbackDelete(ctx) {
  const id = ctx.callbackQuery.data.split(':')[3];
  await feedbackRepo.remove(id);
  logger.admin('feedback', `Fikr-mulohaza o'chirildi: ${id}`, { adminId: ctx.from.id });
  await ctx.answerCbQuery('✅ O\'chirildi');
  await replyT(ctx, 'admin_feedback_deleted', null, getBackToAdminKeyboard());
}

async function handleFeedbackReplyStart(ctx) {
  const id = ctx.callbackQuery.data.split(':')[3];
  await ctx.answerCbQuery();

  ensureSessionShape(ctx);
  ctx.session.temp.replyFeedbackId = id;
  setFlow(ctx, FLOW.FEEDBACK_AWAITING_REPLY);

  await replyT(ctx, 'admin_feedback_ask_reply');
}

async function handleFeedbackReplyAnswer(ctx) {
  const id = ctx.session.temp.replyFeedbackId;
  const replyText = ctx.message.text.trim();

  const item = await feedbackRepo.getById(id);
  if (!item) {
    clearFlow(ctx);
    return ctx.reply('❌ Fikr-mulohaza topilmadi.');
  }

  await feedbackRepo.setReply(id, replyText);

  try {
    const notification = await t('feedback_reply_sent', { reply: replyText });
    await ctx.telegram.sendMessage(item.user_id, notification, { parse_mode: 'HTML' });
  } catch (err) {
    logger.warn('feedback', 'Javobni foydalanuvchiga yuborib bo\'lmadi', { error: err.message, userId: item.user_id });
  }

  logger.admin('feedback', `Fikr-mulohazaga javob berildi: ${id}`, { adminId: ctx.from.id });

  clearFlow(ctx);
  await replyT(ctx, 'admin_feedback_reply_sent_confirmation', null, getBackToAdminKeyboard());
}

function isAwaitingReply(ctx) {
  return getFlow(ctx) === FLOW.FEEDBACK_AWAITING_REPLY;
}

module.exports = {
  handleFeedbackList: safeHandler('feedback_panel', handleFeedbackList),
  handleFeedbackView: safeHandler('feedback_panel', handleFeedbackView),
  handleFeedbackDelete: safeHandler('feedback_panel', handleFeedbackDelete),
  handleFeedbackReplyStart: safeHandler('feedback_panel', handleFeedbackReplyStart),
  handleFeedbackReplyAnswer: safeHandler('feedback_panel', handleFeedbackReplyAnswer),
  isAwaitingReply
};
