'use strict';

const { t } = require('../../messages/messageStore');
const { getAdminRootKeyboard } = require('../../keyboards/adminMenu');
const { clearFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');

async function handleAdminPanel(ctx) {
  clearFlow(ctx);

  const text = await t('admin_panel_header');
  const keyboard = getAdminRootKeyboard();

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(async () => {
      await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
    });
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  }
}

module.exports = {
  handleAdminPanel: safeHandler('admin_panel', handleAdminPanel)
};
