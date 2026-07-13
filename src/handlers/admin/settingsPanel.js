'use strict';

const settingsRepo = require('../../database/settingsRepo');
const blockedRepo = require('../../database/blockedRepo');
const { t } = require('../../messages/messageStore');
const { getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { Markup } = require('telegraf');
const { CALLBACK } = require('../../config/constants');
const { clearFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');
const { logger } = require('../../services/logger');

async function handleSettingsView(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);

  const settings = await settingsRepo.getSettings();
  const header = await t('admin_settings_header');
  const statusLine = `\n\n🛠 Holat: ${settings.bot_status === 'active' ? '✅ Faol' : '⛔️ Texnik ishlar'}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(
      settings.bot_status === 'active' ? '⛔️ Texnik ishlarni yoqish' : '✅ Botni faollashtirish',
      CALLBACK.ADMIN_SETTINGS_TOGGLE_MAINTENANCE
    )],
    [Markup.button.callback('⬅️ Admin panelga qaytish', CALLBACK.ADMIN_PANEL)]
  ]);

  await ctx.editMessageText(header + statusLine, { parse_mode: 'HTML', ...keyboard }).catch(async () => {
    await ctx.reply(header + statusLine, { parse_mode: 'HTML', ...keyboard });
  });
}

async function handleToggleMaintenance(ctx) {
  const settings = await settingsRepo.toggleMaintenance();
  logger.admin('settings', `Bot holati o'zgartirildi: ${settings.bot_status}`, { adminId: ctx.from.id });
  await ctx.answerCbQuery('✅ Holat o\'zgartirildi');
  await handleSettingsView(ctx);
}

async function handleBlockedList(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);

  const blocked = await blockedRepo.getAll();
  const ids = Object.keys(blocked);

  if (ids.length === 0) {
    return ctx.reply('🚫 Hozircha bloklangan foydalanuvchilar yo\'q.', getBackToAdminKeyboard());
  }

  const rows = ids.slice(0, 30).map((id) => [
    Markup.button.callback(`🚫 ${id}`, `${CALLBACK.ADMIN_UNBLOCK}:${id}`)
  ]);
  rows.push([Markup.button.callback('⬅️ Admin panelga qaytish', CALLBACK.ADMIN_PANEL)]);

  await ctx.reply(`🚫 Bloklangan foydalanuvchilar (${ids.length}):\n\nBloklashni bekor qilish uchun bosing:`, Markup.inlineKeyboard(rows));
}

async function handleUnblock(ctx) {
  const id = ctx.callbackQuery.data.split(':')[3];
  await blockedRepo.unblock(id);
  logger.admin('block_management', `Foydalanuvchi blokdan chiqarildi: ${id}`, { adminId: ctx.from.id });
  await ctx.answerCbQuery('✅ Blokdan chiqarildi');
  await ctx.reply(`✅ ${id} blokdan chiqarildi.`, getBackToAdminKeyboard());
}

module.exports = {
  handleSettingsView: safeHandler('settings_panel', handleSettingsView),
  handleToggleMaintenance: safeHandler('settings_panel', handleToggleMaintenance),
  handleBlockedList: safeHandler('block_management', handleBlockedList),
  handleUnblock: safeHandler('block_management', handleUnblock)
};
