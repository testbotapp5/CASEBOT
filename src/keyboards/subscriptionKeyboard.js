'use strict';

const { Markup } = require('telegraf');
const { checkSubscriptionButton } = require('./commonButtons');

/**
 * Builds the "join these channels" keyboard: one Join button per missing
 * channel, followed by a single "Check subscription" button. Supports
 * both public channels (@username -> https://t.me/username) and private
 * channels (uses the stored invite_link).
 */
function getSubscriptionKeyboard(missingChannels) {
  const rows = missingChannels.map((channel) => {
    const url = resolveChannelUrl(channel);
    return [Markup.button.url(`📢 ${channel.title}`, url)];
  });
  rows.push([checkSubscriptionButton()]);
  return Markup.inlineKeyboard(rows);
}

function resolveChannelUrl(channel) {
  if (channel.invite_link) return channel.invite_link;
  if (typeof channel.id === 'string' && channel.id.startsWith('@')) {
    return `https://t.me/${channel.id.slice(1)}`;
  }
  return `https://t.me/${channel.id}`;
}

module.exports = { getSubscriptionKeyboard, resolveChannelUrl };
