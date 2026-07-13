'use strict';

const channelsRepo = require('../../database/channelsRepo');
const subscriptionService = require('../../services/subscriptionService');
const { t } = require('../../messages/messageStore');
const { getChannelsListKeyboard } = require('../../keyboards/adminMenu');
const { FLOW } = require('../../config/constants');
const { setFlow, getFlow, clearFlow } = require('../../utils/sessionHelper');
const { validateChannelId } = require('../../utils/validators');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function renderChannelsList() {
  const channels = await channelsRepo.getAll();
  const header = await t('admin_channels_header', { count: channels.length });
  const body = channels.length === 0 ? `\n\n${await t('admin_channels_empty')}` : '';
  const keyboard = getChannelsListKeyboard(channels);
  return { text: header + body, keyboard };
}

async function handleChannelsList(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);
  const { text, keyboard } = await renderChannelsList();
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  });
}

async function handleChannelAddStart(ctx) {
  await ctx.answerCbQuery();
  setFlow(ctx, FLOW.CHANNEL_AWAITING_ID);
  await replyT(ctx, 'admin_channel_ask_id');
}

async function handleChannelIdAnswer(ctx) {
  const raw = ctx.message.text.trim();
  const validation = validateChannelId(raw);

  if (!validation.valid) {
    return ctx.reply(`⚠️ ${validation.error}`);
  }

  const access = await subscriptionService.verifyChannelAccess(ctx.telegram, validation.normalized);

  if (!access.ok) {
    clearFlow(ctx);
    return replyT(ctx, 'admin_channel_invalid');
  }

  await channelsRepo.addChannel({
    id: validation.normalized,
    title: access.title,
    invite_link: ''
  });

  logger.admin('channel_add', `Kanal qo'shildi: ${validation.normalized}`, { adminId: ctx.from.id });

  clearFlow(ctx);

  let confirmationText = await t('admin_channel_added', { title: access.title });
  if (access.warning) {
    confirmationText += `\n\n⚠️ ${access.warning}`;
  }

  await ctx.reply(confirmationText, { parse_mode: 'HTML' });
}

async function handleChannelToggle(ctx) {
  const id = ctx.callbackQuery.data.split(':').slice(3).join(':');
  await channelsRepo.toggleChannel(id);
  await ctx.answerCbQuery('✅ Holat o\'zgartirildi');

  const { text, keyboard } = await renderChannelsList();
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(() => {});
}

async function handleChannelRemove(ctx) {
  const id = ctx.callbackQuery.data.split(':').slice(3).join(':');
  await channelsRepo.removeChannel(id);
  logger.admin('channel_remove', `Kanal o'chirildi: ${id}`, { adminId: ctx.from.id });
  await ctx.answerCbQuery('✅ Kanal o\'chirildi');

  const { text, keyboard } = await renderChannelsList();
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(() => {});
}

function isAwaitingChannelId(ctx) {
  return getFlow(ctx) === FLOW.CHANNEL_AWAITING_ID;
}

module.exports = {
  handleChannelsList: safeHandler('channels', handleChannelsList),
  handleChannelAddStart: safeHandler('channels', handleChannelAddStart),
  handleChannelIdAnswer: safeHandler('channels', handleChannelIdAnswer),
  handleChannelToggle: safeHandler('channels', handleChannelToggle),
  handleChannelRemove: safeHandler('channels', handleChannelRemove),
  isAwaitingChannelId
};
