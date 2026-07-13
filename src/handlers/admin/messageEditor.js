'use strict';

const messageStore = require('../../messages/messageStore');
const { MESSAGE_CATEGORIES } = require('../../messages/defaultMessages');
const { getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { Markup } = require('telegraf');
const { CALLBACK, FLOW } = require('../../config/constants');
const { setFlow, getFlow, clearFlow, ensureSessionShape } = require('../../utils/sessionHelper');
const { chunkButtons } = require('../../keyboards/commonButtons');
const { safeHandler } = require('../../utils/asyncWrapper');
const { logger } = require('../../services/logger');

/**
 * Message editor entry point: shows a category picker instead of a flat,
 * truncated list. With 80+ message keys total, a single unpaginated list
 * made most categories (Favorites, Feedback, Help, New/Popular movies,
 * etc.) permanently unreachable — every category is now always visible
 * and every key within it is reachable.
 */
async function handleMessageEditorList(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);

  const buttons = MESSAGE_CATEGORIES.map((cat) =>
    Markup.button.callback(cat.label, `${CALLBACK.ADMIN_MESSAGE_CATEGORY}:${cat.id}`)
  );
  const rows = chunkButtons(buttons, 1);
  rows.push([Markup.button.callback('⬅️ Admin panelga qaytish', CALLBACK.ADMIN_PANEL)]);

  const text = `✉️ <b>Xabarlar tahriri</b>\n\nBo'lim tanlang (jami ${MESSAGE_CATEGORIES.reduce((n, c) => n + c.keys.length, 0)} ta xabar, ${MESSAGE_CATEGORIES.length} ta bo'limda):`;

  await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

/**
 * Shows every message key within a chosen category. Categories are kept
 * small by design (typically 3-12 keys), so no further pagination is
 * needed here — every key in the category is always shown at once.
 */
async function handleMessageCategorySelect(ctx) {
  const categoryId = ctx.callbackQuery.data.split(':')[3];
  await ctx.answerCbQuery();

  const category = MESSAGE_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) {
    return ctx.reply('❌ Bo\'lim topilmadi.');
  }

  const buttons = category.keys.map((key) =>
    Markup.button.callback(key, `${CALLBACK.ADMIN_MESSAGE_EDIT_SELECT}:${key}`)
  );
  const rows = chunkButtons(buttons, 1);
  rows.push([Markup.button.callback('⬅️ Bo\'limlarga qaytish', CALLBACK.ADMIN_MESSAGE_EDITOR)]);

  const text = `✉️ <b>${category.label}</b>\n\nTahrirlash uchun xabarni tanlang:`;
  await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
}

async function handleMessageEditSelect(ctx) {
  const key = ctx.callbackQuery.data.split(':').slice(3).join(':');
  await ctx.answerCbQuery();

  const current = await messageStore.getEffectiveMessage(key);
  const overridden = await messageStore.isOverridden(key);

  ensureSessionShape(ctx);
  ctx.session.temp.editingMessageKey = key;
  setFlow(ctx, FLOW.MESSAGE_EDITOR_AWAITING_TEXT);

  const statusLabel = overridden ? "✏️ (o'zgartirilgan)" : '📄 (standart)';
  await ctx.reply(
    `✉️ <b>${key}</b> ${statusLabel}\n\nJoriy matn:\n<code>${escapeForCode(current)}</code>\n\nYangi matnni yuboring (placeholder va &lt;tg-emoji&gt; teglarini saqlab qoling):`,
    { parse_mode: 'HTML' }
  );
}

function escapeForCode(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function handleMessageEditAnswer(ctx) {
  const key = ctx.session.temp.editingMessageKey;
  const newText = ctx.message.text;

  try {
    await messageStore.setOverride(key, newText);
  } catch (err) {
    return ctx.reply(`❌ ${err.message}`);
  }

  logger.admin('message_editor', `Xabar tahrirlandi: ${key}`, { adminId: ctx.from.id });

  clearFlow(ctx);
  await ctx.reply(`✅ "${key}" xabari yangilandi.`, getBackToAdminKeyboard());
}

function isAwaitingMessageEdit(ctx) {
  return getFlow(ctx) === FLOW.MESSAGE_EDITOR_AWAITING_TEXT;
}

module.exports = {
  handleMessageEditorList: safeHandler('message_editor', handleMessageEditorList),
  handleMessageCategorySelect: safeHandler('message_editor', handleMessageCategorySelect),
  handleMessageEditSelect: safeHandler('message_editor', handleMessageEditSelect),
  handleMessageEditAnswer: safeHandler('message_editor', handleMessageEditAnswer),
  isAwaitingMessageEdit
};
