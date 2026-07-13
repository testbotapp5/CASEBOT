'use strict';

const { Markup } = require('telegraf');
const { CALLBACK } = require('../config/constants');

/**
 * Root admin panel keyboard. Every admin sub-feature is reachable from
 * here, grouped logically (movies together, communication together,
 * system together) with no duplicated buttons or callback ids.
 */
function getAdminRootKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🎬 Kino qo\'shish', CALLBACK.ADMIN_UPLOAD_START),
      Markup.button.callback('📃 Kinolar ro\'yxati', CALLBACK.ADMIN_LIST_MOVIES)
    ],
    [
      Markup.button.callback('✏️ Kino tahrirlash', CALLBACK.ADMIN_EDIT_START),
      Markup.button.callback('🗑 Kino o\'chirish', CALLBACK.ADMIN_DELETE_START)
    ],
    [
      Markup.button.callback('📢 Majburiy kanallar', CALLBACK.ADMIN_CHANNELS),
      Markup.button.callback('📣 Broadcast', CALLBACK.ADMIN_BROADCAST_START)
    ],
    [
      Markup.button.callback('💬 Fikr-mulohazalar', CALLBACK.ADMIN_FEEDBACK_LIST),
      Markup.button.callback('📊 Statistika', CALLBACK.ADMIN_STATS)
    ],
    [
      Markup.button.callback('🗄 Backup', CALLBACK.ADMIN_BACKUP_LIST),
      Markup.button.callback('👮 Administratorlar', CALLBACK.ADMIN_MANAGE_ADMINS)
    ],
    [
      Markup.button.callback('🚫 Bloklanganlar', CALLBACK.ADMIN_MANAGE_BLOCKS),
      Markup.button.callback('⚙️ Sozlamalar', CALLBACK.ADMIN_SETTINGS)
    ],
    [
      Markup.button.callback('✉️ Xabarlar tahriri', CALLBACK.ADMIN_MESSAGE_EDITOR)
    ]
  ]);
}

function getBackToAdminKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Admin panelga qaytish', CALLBACK.ADMIN_PANEL)]
  ]);
}

function getUploadWizardKeyboard({ showSkip, showBack }) {
  const row = [];
  if (showBack) row.push(Markup.button.callback('⬅️ Orqaga', CALLBACK.ADMIN_UPLOAD_BACK));
  if (showSkip) row.push(Markup.button.callback('⏭ O\'tkazib yuborish', CALLBACK.ADMIN_UPLOAD_SKIP));
  row.push(Markup.button.callback('❌ Bekor qilish', CALLBACK.ADMIN_UPLOAD_CANCEL));
  return Markup.inlineKeyboard([row]);
}

function getUploadPreviewKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Saqlash', CALLBACK.ADMIN_UPLOAD_CONFIRM)],
    [Markup.button.callback('❌ Bekor qilish', CALLBACK.ADMIN_UPLOAD_CANCEL)]
  ]);
}

function getChannelsListKeyboard(channels) {
  const rows = channels.map((c) => [
    Markup.button.callback(
      `${c.is_enabled ? '✅' : '⛔️'} ${c.title}`,
      `${CALLBACK.ADMIN_CHANNEL_TOGGLE}:${c.id}`
    ),
    Markup.button.callback('🗑', `${CALLBACK.ADMIN_CHANNEL_DEL}:${c.id}`)
  ]);
  rows.push([Markup.button.callback('➕ Kanal qo\'shish', CALLBACK.ADMIN_CHANNEL_ADD)]);
  rows.push([Markup.button.callback('⬅️ Admin panelga qaytish', CALLBACK.ADMIN_PANEL)]);
  return Markup.inlineKeyboard(rows);
}

function getBroadcastConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Yuborish', CALLBACK.ADMIN_BROADCAST_CONFIRM)],
    [Markup.button.callback('❌ Bekor qilish', CALLBACK.ADMIN_BROADCAST_CANCEL)]
  ]);
}

function getFeedbackItemKeyboard(feedbackId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('↩️ Javob berish', `${CALLBACK.ADMIN_FEEDBACK_REPLY}:${feedbackId}`),
      Markup.button.callback('🗑 O\'chirish', `${CALLBACK.ADMIN_FEEDBACK_DELETE}:${feedbackId}`)
    ],
    [Markup.button.callback('⬅️ Ro\'yxatga qaytish', CALLBACK.ADMIN_FEEDBACK_LIST)]
  ]);
}

function getBackupListKeyboard(backups) {
  const rows = backups.map((b) => [
    Markup.button.callback(`🗄 ${b.name}`, `${CALLBACK.ADMIN_BACKUP_RESTORE}:${b.name}`)
  ]);
  rows.push([Markup.button.callback('➕ Yangi backup yaratish', CALLBACK.ADMIN_BACKUP_CREATE)]);
  rows.push([Markup.button.callback('⬅️ Admin panelga qaytish', CALLBACK.ADMIN_PANEL)]);
  return Markup.inlineKeyboard(rows);
}

module.exports = {
  getAdminRootKeyboard,
  getBackToAdminKeyboard,
  getUploadWizardKeyboard,
  getUploadPreviewKeyboard,
  getChannelsListKeyboard,
  getBroadcastConfirmKeyboard,
  getFeedbackItemKeyboard,
  getBackupListKeyboard
};
