'use strict';

const { Markup } = require('telegraf');
const { getConfig } = require('../config/botConfig');
const { logger } = require('../services/logger');

/**
 * Normalizes and validates the configured Mini App URL. Telegram's
 * web_app button requires a full https:// URL — a bare domain (a common
 * copy-paste mistake, e.g. pasting "myapp.up.railway.app" without the
 * scheme) would otherwise make Telegram reject the ENTIRE keyboard,
 * which previously broke /start and every other menu for all users.
 * Returns null if the URL is missing or unusable, so the caller can
 * simply omit the button instead of crashing.
 */
function resolveMiniAppUrl() {
  const { MINI_APP_URL } = getConfig();
  if (!MINI_APP_URL) return null;

  let candidate = MINI_APP_URL.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') {
      logger.warn('mini_app', `MINI_APP_URL https:// bo'lishi shart, http topildi: ${MINI_APP_URL}. Mini App tugmasi yashirildi.`);
      return null;
    }
    return parsed.toString();
  } catch (err) {
    logger.warn('mini_app', `MINI_APP_URL noto'g'ri format: ${MINI_APP_URL}. Mini App tugmasi yashirildi.`, { error: err.message });
    return null;
  }
}

/**
 * Main reply keyboard shown to every regular user. Kept small, balanced
 * and predictable — no overcrowding, related actions grouped together.
 * The "🎬 Mini App" button only appears when MINI_APP_URL resolves to a
 * valid https:// URL, so a misconfigured value never breaks the keyboard
 * (and therefore never breaks /start) for every user.
 */
function buildRows(extraRow) {
  const rows = [
    ['🔍 Qidirish', '⭐️ Sevimlilar'],
    ['🆕 Yangi kinolar', '🔥 Mashhur kinolar'],
    ['💬 Aloqa', 'ℹ️ Yordam']
  ];

  const miniAppUrl = resolveMiniAppUrl();
  if (miniAppUrl) {
    rows.push([Markup.button.webApp('🎬 Mini App', miniAppUrl)]);
  }
  if (extraRow) rows.push(extraRow);
  return rows;
}

function getMainMenuKeyboard() {
  return Markup.keyboard(buildRows()).resize();
}

/**
 * Same as above but with an extra row for administrators to jump straight
 * into the admin panel without needing a separate command.
 */
function getMainMenuKeyboardForAdmin() {
  return Markup.keyboard(buildRows(['🛠 Admin panel'])).resize();
}

module.exports = { getMainMenuKeyboard, getMainMenuKeyboardForAdmin, resolveMiniAppUrl };
