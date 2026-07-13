'use strict';

/**
 * Renders a message template: replaces {placeholder} tokens with values
 * and leaves <tg-emoji emoji-id="..."></tg-emoji> tags completely intact,
 * since these are Telegram Premium Custom Emoji markers that must survive
 * unescaped and unmodified for HTML parse_mode to render them correctly.
 *
 * IMPORTANT: this function does NOT HTML-escape the surrounding text,
 * because the message templates are administrator-authored HTML (bold,
 * italic, tg-emoji, links) that is meant to be sent with parse_mode: HTML.
 * Only the *values* substituted into {placeholders} are escaped, so a
 * movie name or user first_name containing "<" or "&" can never break the
 * surrounding HTML markup or get interpreted as a tag.
 */

function escapeHtmlValue(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitizes free-text content that administrators enter for DATA fields
 * (movie genre, country, language, actors, etc. — as opposed to message
 * TEMPLATES edited via the message editor). This allows Telegram Premium
 * Custom Emoji tags to be used inside movie metadata (e.g. genre "🎭
 * Drama" using a Premium emoji) while still preventing any other HTML
 * from being injected — a plain escapeHtmlValue() would also escape a
 * deliberately-pasted <tg-emoji> tag, making Premium emoji impossible to
 * use anywhere in movie data; a blanket "don't escape" would allow HTML
 * injection through movie fields. This is the safe middle ground:
 *   1. Escape everything (neutralizes any HTML/script injection).
 *   2. Selectively "unescape" back into real <tg-emoji>...</tg-emoji>
 *      tags, but ONLY for text that matches the exact expected shape
 *      (numeric emoji-id, matched open/close pair) — never for arbitrary
 *      tags a malicious value might contain.
 */
function sanitizeUserHtml(value) {
  if (value === null || value === undefined) return '';
  const escaped = escapeHtmlValue(value);

  // Restore well-formed tg-emoji tags that survived escaping (their
  // "<" and ">" are now "&lt;"/"&gt;"), validating emoji-id is numeric
  // and that every restored open tag has a matching close tag.
  const tagPattern = /&lt;tg-emoji\s+emoji-id="(\d+)"\s*&gt;(.*?)&lt;\/tg-emoji&gt;/g;
  return escaped.replace(tagPattern, (match, emojiId, innerContent) => {
    return `<tg-emoji emoji-id="${emojiId}">${innerContent}</tg-emoji>`;
  });
}

/**
 * Renders `template` by substituting {key} tokens from `data`.
 * Unknown placeholders are left as-is (rather than turned into "undefined")
 * so a typo in a template doesn't silently corrupt admin-authored text.
 */
function render(template, data = {}) {
  if (!template) return '';
  return String(template).replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return escapeHtmlValue(data[key]);
    }
    return match;
  });
}

/**
 * Same as render(), but data fields are passed through sanitizeUserHtml
 * instead of plain escaping — used for movie card rendering, where movie
 * metadata (genre, country, actors, etc.) may legitimately contain
 * administrator-pasted Premium Custom Emoji tags.
 */
function renderWithEmoji(template, data = {}) {
  if (!template) return '';
  return String(template).replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return sanitizeUserHtml(data[key]);
    }
    return match;
  });
}

/**
 * Validates that a template's <tg-emoji> tags are well-formed before it is
 * saved via the admin message editor, so a malformed tag entered by an
 * administrator can be rejected with a clear error instead of silently
 * breaking every message that uses it later.
 */
function validateTemplate(template) {
  const openTags = (template.match(/<tg-emoji[^>]*>/g) || []).length;
  const closeTags = (template.match(/<\/tg-emoji>/g) || []).length;
  if (openTags !== closeTags) {
    return {
      valid: false,
      error: `<tg-emoji> teglari muvozanatsiz: ${openTags} ta ochilgan, ${closeTags} ta yopilgan.`
    };
  }

  const emojiIdPattern = /<tg-emoji\s+emoji-id="(\d+)"\s*>/g;
  const matches = [...template.matchAll(/<tg-emoji[^>]*>/g)];
  for (const tag of matches) {
    if (!/emoji-id="\d+"/.test(tag[0])) {
      return {
        valid: false,
        error: `Noto'g'ri <tg-emoji> tegi topildi: ${tag[0]} (emoji-id="..." raqam bo'lishi kerak).`
      };
    }
  }

  return { valid: true, error: null };
}

module.exports = { render, renderWithEmoji, validateTemplate, escapeHtmlValue, sanitizeUserHtml };
