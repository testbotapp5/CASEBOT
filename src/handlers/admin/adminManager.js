'use strict';

const adminsRepo = require('../../database/adminsRepo');
const { t } = require('../../messages/messageStore');
const { getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { getConfig } = require('../../config/botConfig');
const { FLOW, ROLES } = require('../../config/constants');
const { setFlow, getFlow, clearFlow } = require('../../utils/sessionHelper');
const { validateTelegramId } = require('../../utils/validators');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function handleAdminsList(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);

  const { SUPER_ADMIN_ID } = getConfig();
  const admins = await adminsRepo.getAll();

  const lines = [`👑 Bosh administrator: <code>${SUPER_ADMIN_ID}</code>`];
  for (const admin of Object.values(admins)) {
    lines.push(`👮 <code>${admin.id}</code> — ${admin.role}`);
  }

  const header = await t('admin_admins_header');
  const text = `${header}\n\n${lines.join('\n')}`;

  await ctx.reply(text, { parse_mode: 'HTML', ...getBackToAdminKeyboard() });
}

async function handleAdminAddStart(ctx) {
  await ctx.answerCbQuery();
  setFlow(ctx, FLOW.ADMIN_AWAITING_ID);
  await ctx.reply('👮 Yangi administrator Telegram ID raqamini kiriting:');
}

async function handleAdminIdAnswer(ctx) {
  const raw = ctx.message.text.trim();
  const validation = validateTelegramId(raw);

  if (!validation.valid) {
    return ctx.reply(`⚠️ ${validation.error}`);
  }

  await adminsRepo.addAdmin(raw, ROLES.ADMIN, ctx.from.id);
  logger.admin('admin_management', `Yangi administrator qo'shildi: ${raw}`, { addedBy: ctx.from.id });

  clearFlow(ctx);
  await replyT(ctx, 'admin_admin_added', { user_id: raw, role: ROLES.ADMIN }, getBackToAdminKeyboard());
}

async function handleAdminRemove(ctx) {
  const id = ctx.callbackQuery.data.split(':')[3];
  const { SUPER_ADMIN_ID } = getConfig();

  await ctx.answerCbQuery();

  if (String(id) === String(SUPER_ADMIN_ID)) {
    return replyT(ctx, 'admin_admin_cannot_remove_super');
  }

  await adminsRepo.removeAdmin(id);
  logger.admin('admin_management', `Administrator olib tashlandi: ${id}`, { removedBy: ctx.from.id });

  await replyT(ctx, 'admin_admin_removed', { user_id: id }, getBackToAdminKeyboard());
}

function isAwaitingAdminId(ctx) {
  return getFlow(ctx) === FLOW.ADMIN_AWAITING_ID;
}

module.exports = {
  handleAdminsList: safeHandler('admin_management', handleAdminsList),
  handleAdminAddStart: safeHandler('admin_management', handleAdminAddStart),
  handleAdminIdAnswer: safeHandler('admin_management', handleAdminIdAnswer),
  handleAdminRemove: safeHandler('admin_management', handleAdminRemove),
  isAwaitingAdminId
};
