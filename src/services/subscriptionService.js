'use strict';

const channelsRepo = require('../database/channelsRepo');
const { logger } = require('./logger');

/**
 * Checks whether a given Telegram user is a member of every enabled
 * mandatory channel. Designed to be called from a global middleware
 * before any bot action executes.
 *
 * Returns { subscribed: boolean, missing: Channel[] }
 */
async function checkSubscription(telegram, userId) {
  const channels = await channelsRepo.getEnabled();
  if (channels.length === 0) {
    return { subscribed: true, missing: [] };
  }

  const missing = [];

  for (const channel of channels) {
    const isMember = await isChannelMember(telegram, channel.id, userId);
    if (!isMember) {
      missing.push(channel);
    }
  }

  return { subscribed: missing.length === 0, missing };
}

/**
 * Safely checks membership for a single channel. Handles both numeric
 * channel IDs and @username channels, and never throws — if Telegram's
 * API call fails (bot not admin, channel invalid, network error), the
 * user is treated as NOT subscribed and the failure is logged, so a
 * misconfigured channel fails closed rather than silently bypassing the
 * subscription requirement... except we also don't want one broken
 * channel to permanently lock out every user, so we log loudly for the
 * administrator to notice and fix it.
 */
async function isChannelMember(telegram, channelId, userId) {
  try {
    const member = await telegram.getChatMember(channelId, userId);
    const allowedStatuses = ['creator', 'administrator', 'member'];
    return allowedStatuses.includes(member.status);
  } catch (err) {
    logger.warn('subscription', `Kanal a'zoligini tekshirib bo'lmadi: ${channelId}`, {
      channelId,
      userId,
      error: err.message
    });
    return false;
  }
}

/**
 * Verifies the bot itself has admin rights in a channel and the channel
 * is reachable. Used when the administrator adds a new mandatory channel,
 * to catch configuration mistakes immediately instead of silently
 * blocking every user later.
 *
 * Uses telegram.getMe() rather than telegram.botInfo, because botInfo is
 * only populated by Telegraf under certain launch configurations and is
 * not reliably available — relying on it caused false "bot is not an
 * admin" reports even when the bot genuinely was an administrator.
 */
async function verifyChannelAccess(telegram, channelId) {
  try {
    const [chat, me] = await Promise.all([
      telegram.getChat(channelId),
      telegram.getMe()
    ]);
    const botMember = await telegram.getChatMember(channelId, me.id);
    const isBotAdmin = botMember && ['administrator', 'creator'].includes(botMember.status);
    return {
      ok: true,
      isBotAdmin,
      title: chat.title || chat.username || String(channelId),
      warning: isBotAdmin ? null : 'Bot ushbu kanalda administrator emas. Obuna tekshiruvi ishlamasligi mumkin.'
    };
  } catch (err) {
    return {
      ok: false,
      isBotAdmin: false,
      title: String(channelId),
      warning: `Kanalga ulanib bo'lmadi: ${err.message}`
    };
  }
}

module.exports = { checkSubscription, isChannelMember, verifyChannelAccess };
