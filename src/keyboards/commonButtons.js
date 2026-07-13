'use strict';

const { Markup } = require('telegraf');
const { CALLBACK } = require('../config/constants');

/**
 * Shared button builders used across many keyboards, so "Back", "Cancel"
 * and "Skip" always look and behave identically everywhere in the bot.
 */

function backButton(callbackData = CALLBACK.ADMIN_BACK) {
  return Markup.button.callback('⬅️ Orqaga', callbackData);
}

function cancelButton(callbackData) {
  return Markup.button.callback('❌ Bekor qilish', callbackData);
}

function skipButton(callbackData = CALLBACK.ADMIN_UPLOAD_SKIP) {
  return Markup.button.callback("⏭ O'tkazib yuborish", callbackData);
}

function confirmButton(callbackData, label = '✅ Tasdiqlash') {
  return Markup.button.callback(label, callbackData);
}

function mainMenuButton() {
  return Markup.button.callback('🏠 Bosh menyu', CALLBACK.MAIN_MENU);
}

function checkSubscriptionButton() {
  return Markup.button.callback('✅ Obunani tekshirish', CALLBACK.CHECK_SUB);
}

/**
 * Splits an array of Markup buttons into rows of `perRow` for a consistent,
 * balanced inline keyboard layout instead of ad-hoc row arrays everywhere.
 */
function chunkButtons(buttons, perRow = 2) {
  const rows = [];
  for (let i = 0; i < buttons.length; i += perRow) {
    rows.push(buttons.slice(i, i + perRow));
  }
  return rows;
}

module.exports = {
  backButton,
  cancelButton,
  skipButton,
  confirmButton,
  mainMenuButton,
  checkSubscriptionButton,
  chunkButtons
};
