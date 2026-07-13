'use strict';

const { t } = require('../messages/messageStore');

/**
 * Sends a centralized message template by key, always with parse_mode:
 * 'HTML'. This exists because every message template can contain HTML
 * (bold/italic, and especially <tg-emoji> Premium Custom Emoji tags), and
 * a plain ctx.reply(await t(...)) without parse_mode renders those tags
 * as literal text instead of formatting them — a mistake that had crept
 * into many handlers. Handlers should use this instead of calling
 * ctx.reply(await t(...)) directly.
 */
async function replyT(ctx, key, data, extra) {
  const text = await t(key, data || {});
  return ctx.reply(text, { parse_mode: 'HTML', ...(extra || {}) });
}

/**
 * Same as replyT but for editing an existing message, with the same
 * automatic HTML parse_mode guarantee.
 */
async function editMessageT(ctx, key, data, extra) {
  const text = await t(key, data || {});
  return ctx.editMessageText(text, { parse_mode: 'HTML', ...(extra || {}) });
}

module.exports = { replyT, editMessageT };
