'use strict';

const backupService = require('../../services/backupService');
const { t } = require('../../messages/messageStore');
const { getBackupListKeyboard, getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { clearFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function renderBackupList() {
  const backups = await backupService.listBackups();
  const keyboard = getBackupListKeyboard(backups);
  const text = backups.length === 0
    ? await t('admin_backup_empty')
    : `🗄 <b>Backuplar</b> (${backups.length})\n\nTiklash uchun backup faylini tanlang:`;
  return { text, keyboard };
}

async function handleBackupList(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);
  const { text, keyboard } = await renderBackupList();
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  });
}

async function handleBackupCreate(ctx) {
  await ctx.answerCbQuery('⏳ Backup yaratilmoqda...');

  const path = await backupService.createBackup();
  const fileName = path.split('/').pop();

  logger.admin('backup', `Backup qo'lda yaratildi: ${fileName}`, { adminId: ctx.from.id });

  await replyT(ctx, 'admin_backup_created', { file_name: fileName }, getBackToAdminKeyboard());
}

async function handleBackupRestore(ctx) {
  const fileName = ctx.callbackQuery.data.split(':').slice(3).join(':');
  await ctx.answerCbQuery('⏳ Tiklanmoqda...');

  try {
    await backupService.restoreBackup(fileName);
  } catch (err) {
    logger.error('backup', 'Tiklashda xato', { error: err });
    return ctx.reply(`❌ ${err.message}`);
  }

  logger.admin('backup', `Backupdan tiklandi: ${fileName}`, { adminId: ctx.from.id });
  await replyT(ctx, 'admin_backup_restored', { file_name: fileName }, getBackToAdminKeyboard());
}

module.exports = {
  handleBackupList: safeHandler('backup_panel', handleBackupList),
  handleBackupCreate: safeHandler('backup_panel', handleBackupCreate),
  handleBackupRestore: safeHandler('backup_panel', handleBackupRestore)
};
