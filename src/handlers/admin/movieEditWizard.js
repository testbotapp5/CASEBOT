'use strict';

const moviesRepo = require('../../database/moviesRepo');
const { t } = require('../../messages/messageStore');
const { getEditFieldKeyboard } = require('../../keyboards/movieKeyboards');
const { getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { FLOW } = require('../../config/constants');
const { setFlow, getFlow, clearFlow, ensureSessionShape } = require('../../utils/sessionHelper');
const { getFieldMeta } = require('./movieFieldMeta');
const { orDash } = require('../../utils/formatters');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { logger } = require('../../services/logger');

async function handleEditStart(ctx) {
  await ctx.answerCbQuery();
  setFlow(ctx, FLOW.EDIT_SELECT_CODE);
  await replyT(ctx, 'admin_edit_ask_code');
}

/**
 * Handles the text message expected right after "edit" is started: the
 * movie code to edit. Looks it up and, if found, shows the field picker.
 */
async function handleEditCodeAnswer(ctx) {
  const code = ctx.message.text.trim();
  const movie = await moviesRepo.getByCode(code);

  if (!movie) {
    return replyT(ctx, 'movie_not_found', { code });
  }

  ensureSessionShape(ctx);
  ctx.session.temp.editCode = movie.code;
  setFlow(ctx, FLOW.EDIT_SELECT_FIELD);

  const text = await t('admin_edit_select_field', { movie_name: movie.name });
  const keyboard = getEditFieldKeyboard(movie.code);
  await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
}

async function handleEditFieldSelect(ctx) {
  const field = ctx.callbackQuery.data.split(':')[3];
  await ctx.answerCbQuery();

  const code = ctx.session.temp.editCode;
  const movie = await moviesRepo.getByCode(code);
  if (!movie) {
    clearFlow(ctx);
    return replyT(ctx, 'movie_not_found', { code });
  }

  ensureSessionShape(ctx);
  ctx.session.temp.editField = field;
  setFlow(ctx, FLOW.EDIT_AWAITING_VALUE);

  const meta = getFieldMeta(field);
  const currentValue = Array.isArray(movie[field]) ? movie[field].join(', ') : orDash(movie[field]);

  const text = await t('admin_edit_ask_value', { current_value: currentValue });
  await ctx.reply(`✏️ <b>${meta.label}</b>\n\n${text}`, { parse_mode: 'HTML' });
}

async function handleEditValueAnswer(ctx) {
  const field = ctx.session.temp.editField;
  const code = ctx.session.temp.editCode;
  const meta = getFieldMeta(field);

  if (meta.isMedia) {
    return; // handled by handleEditMediaAnswer instead
  }

  const raw = ctx.message.text.trim();
  const validation = meta.validate(raw);
  if (!validation.valid) {
    return ctx.reply(`⚠️ ${validation.error}`);
  }

  await applyEdit(ctx, code, field, meta.parse(raw));
}

async function handleEditMediaAnswer(ctx) {
  const field = ctx.session.temp.editField;
  if (!field) return;
  const meta = getFieldMeta(field);
  if (!meta.isMedia) return;

  const code = ctx.session.temp.editCode;

  if (field === 'poster_id' && ctx.message.photo) {
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;
    return applyEdit(ctx, code, field, fileId);
  }

  if (field === 'file_id' && ctx.message.video) {
    return applyEdit(ctx, code, field, ctx.message.video.file_id);
  }
}

async function applyEdit(ctx, code, field, value) {
  try {
    await moviesRepo.updateMovieField(code, field, value);
  } catch (err) {
    logger.error('edit_wizard', 'Kino tahrirlashda xato', { error: err });
    clearFlow(ctx);
    return ctx.reply(`❌ ${err.message}`);
  }

  logger.admin('movie_edit', `Kino tahrirlandi: ${code}.${field}`, { adminId: ctx.from.id, code, field });

  const meta = getFieldMeta(field);
  clearFlow(ctx);
  await replyT(ctx, 'admin_edit_success', { field_label: meta.label }, getBackToAdminKeyboard());
}

function isInEditFlow(ctx) {
  const state = getFlow(ctx);
  return state === FLOW.EDIT_SELECT_CODE || state === FLOW.EDIT_AWAITING_VALUE;
}

module.exports = {
  handleEditStart: safeHandler('edit_wizard', handleEditStart),
  handleEditCodeAnswer: safeHandler('edit_wizard', handleEditCodeAnswer),
  handleEditFieldSelect: safeHandler('edit_wizard', handleEditFieldSelect),
  handleEditValueAnswer: safeHandler('edit_wizard', handleEditValueAnswer),
  handleEditMediaAnswer: safeHandler('edit_wizard', handleEditMediaAnswer),
  isInEditFlow
};
