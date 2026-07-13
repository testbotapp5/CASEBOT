'use strict';

const moviesRepo = require('../../database/moviesRepo');
const { t } = require('../../messages/messageStore');
const { getDeleteConfirmKeyboard } = require('../../keyboards/movieKeyboards');
const { getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { FLOW } = require('../../config/constants');
const { setFlow, getFlow, clearFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function handleDeleteStart(ctx) {
  await ctx.answerCbQuery();
  setFlow(ctx, FLOW.DELETE_SELECT_CODE);
  await replyT(ctx, 'admin_delete_ask_code');
}

async function handleDeleteCodeAnswer(ctx) {
  const code = ctx.message.text.trim();
  const movie = await moviesRepo.getByCode(code);

  if (!movie) {
    return replyT(ctx, 'movie_not_found', { code });
  }

  setFlow(ctx, FLOW.DELETE_CONFIRM);

  const text = await t('admin_delete_confirm', { movie_name: movie.name, code: movie.code });
  const keyboard = getDeleteConfirmKeyboard(movie.code);
  await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
}

async function handleDeleteConfirm(ctx) {
  const code = ctx.callbackQuery.data.split(':')[3];
  await ctx.answerCbQuery();

  const movie = await moviesRepo.getByCode(code);
  if (!movie) {
    clearFlow(ctx);
    return replyT(ctx, 'movie_not_found', { code });
  }

  await moviesRepo.deleteMovie(code);
  logger.admin('movie_delete', `Kino o'chirildi: ${code} (${movie.name})`, { adminId: ctx.from.id, code });

  clearFlow(ctx);
  await replyT(ctx, 'admin_delete_success', { movie_name: movie.name }, getBackToAdminKeyboard());
}

async function handleDeleteCancel(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);
  await replyT(ctx, 'admin_delete_cancelled');
}

function isInDeleteFlow(ctx) {
  return getFlow(ctx) === FLOW.DELETE_SELECT_CODE;
}

module.exports = {
  handleDeleteStart: safeHandler('delete_flow', handleDeleteStart),
  handleDeleteCodeAnswer: safeHandler('delete_flow', handleDeleteCodeAnswer),
  handleDeleteConfirm: safeHandler('delete_flow', handleDeleteConfirm),
  handleDeleteCancel: safeHandler('delete_flow', handleDeleteCancel),
  isInDeleteFlow
};
