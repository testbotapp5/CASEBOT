'use strict';

const { t } = require('../../messages/messageStore');
const { getMainMenuKeyboard, getMainMenuKeyboardForAdmin } = require('../../keyboards/mainMenu');
const settingsRepo = require('../../database/settingsRepo');
const { clearFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');

async function handleStart(ctx) {
  clearFlow(ctx);

  const settings = await settingsRepo.getSettings();
  if (settings.bot_status === 'maintenance' && !ctx.state.isAdmin) {
    const message = settings.maintenance_message
      ? settings.maintenance_message
      : await t('maintenance_mode');
    return ctx.reply(message, { parse_mode: 'HTML' });
  }

  const text = await t('welcome', {
    first_name: ctx.from.first_name || 'foydalanuvchi'
  });

  const keyboard = ctx.state.isAdmin ? getMainMenuKeyboardForAdmin() : getMainMenuKeyboard();

  await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
}

/**
 * Returns to the main menu — used by the "🏠 Bosh menyu" inline button
 * that appears throughout deep admin/user flows.
 */
async function handleMainMenuCallback(ctx) {
  clearFlow(ctx);
  await ctx.answerCbQuery();

  const text = await t('welcome', { first_name: ctx.from.first_name || 'foydalanuvchi' });
  const keyboard = ctx.state.isAdmin ? getMainMenuKeyboardForAdmin() : getMainMenuKeyboard();

  await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
}

module.exports = {
  handleStart: safeHandler('start', handleStart),
  handleMainMenuCallback: safeHandler('start', handleMainMenuCallback)
};
