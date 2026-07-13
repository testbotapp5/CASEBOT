'use strict';

const moviesRepo = require('../../database/moviesRepo');
const { t, tMovie } = require('../../messages/messageStore');
const { getUploadWizardKeyboard, getUploadPreviewKeyboard } = require('../../keyboards/adminMenu');
const { UPLOAD_STEPS, FLOW } = require('../../config/constants');
const { setFlow, getFlow, clearFlow, ensureSessionShape } = require('../../utils/sessionHelper');
const { getFieldMeta } = require('./movieFieldMeta');
const { orDash, originalNameLine } = require('../../utils/formatters');
const { safeHandler } = require('../../utils/asyncWrapper');
const { logger } = require('../../services/logger');

/**
 * The upload wizard walks through UPLOAD_STEPS in order, storing answers
 * in ctx.session.draft keyed by field name, and tracking the current step
 * index in ctx.session.temp.stepIndex. Back/Skip/Cancel are always
 * available (Skip only for optional fields), and nothing is written to
 * the database until the administrator confirms the Preview screen —
 * so an abandoned upload never leaves a half-created movie behind.
 */

function currentStep(ctx) {
  ensureSessionShape(ctx);
  const index = ctx.session.temp.stepIndex || 0;
  return { index, step: UPLOAD_STEPS[index] };
}

async function askCurrentStep(ctx) {
  const { index, step } = currentStep(ctx);
  const meta = getFieldMeta(step.field);

  setFlow(ctx, step.state);

  const text = await t('admin_upload_ask_field', {
    field_label: meta.label,
    field_hint: meta.hint
  });

  const keyboard = getUploadWizardKeyboard({
    showBack: index > 0,
    showSkip: step.optional
  });

  await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
}

async function handleUploadStart(ctx) {
  await ctx.answerCbQuery();
  ensureSessionShape(ctx);
  ctx.session.draft = {};
  ctx.session.temp = { stepIndex: 0 };
  await askCurrentStep(ctx);
}

/**
 * Handles a text answer for whichever field the wizard is currently on.
 * Validates, stores, and advances — or re-asks the same step with the
 * validation error if the input was invalid.
 */
async function handleUploadTextAnswer(ctx) {
  const { step } = currentStep(ctx);
  const meta = getFieldMeta(step.field);
  const raw = ctx.message.text.trim();

  if (meta.isMedia) {
    const reAskText = await t('admin_upload_ask_field', { field_label: meta.label, field_hint: meta.hint });
    return ctx.reply(reAskText, { parse_mode: 'HTML' });
  }

  const validation = meta.validate(raw);
  if (!validation.valid) {
    return ctx.reply(`⚠️ ${validation.error}`);
  }

  if (step.field === 'code') {
    const normalized = raw.trim().toUpperCase();
    const exists = await moviesRepo.codeExists(normalized);
    if (exists) {
      const existsText = await t('admin_upload_code_exists', { code: normalized });
      return ctx.reply(existsText, { parse_mode: 'HTML' });
    }
  }

  ctx.session.draft[step.field] = meta.parse(raw);
  await advanceStep(ctx);
}

/**
 * Handles a photo message during the wizard: only valid when the current
 * step is `poster_id` (single image) or `screenshots` (accumulates,
 * confirmed done via the Skip/next-step button).
 */
async function handleUploadPhotoAnswer(ctx) {
  const { step } = currentStep(ctx);
  if (step.field !== 'poster_id' && step.field !== 'screenshots') {
    return; // ignore stray photos sent at the wrong step
  }

  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id; // highest resolution

  if (step.field === 'poster_id') {
    ctx.session.draft.poster_id = fileId;
    return advanceStep(ctx);
  }

  if (!Array.isArray(ctx.session.draft.screenshots)) {
    ctx.session.draft.screenshots = [];
  }
  ctx.session.draft.screenshots.push(fileId);
  await ctx.reply(`✅ Skrinshot qabul qilindi (${ctx.session.draft.screenshots.length} ta). Yana yuborishingiz yoki "O'tkazib yuborish" tugmasi bilan davom etishingiz mumkin.`);
}

/**
 * Handles a video message: only valid for the final `file_id` step.
 */
async function handleUploadVideoAnswer(ctx) {
  const { step } = currentStep(ctx);
  if (step.field !== 'file_id') return;

  ctx.session.draft.file_id = ctx.message.video.file_id;
  await advanceStep(ctx);
}

async function advanceStep(ctx) {
  ensureSessionShape(ctx);
  const nextIndex = (ctx.session.temp.stepIndex || 0) + 1;

  if (nextIndex >= UPLOAD_STEPS.length) {
    return showPreview(ctx);
  }

  ctx.session.temp.stepIndex = nextIndex;
  await askCurrentStep(ctx);
}

async function handleUploadBack(ctx) {
  await ctx.answerCbQuery();
  const { index } = currentStep(ctx);
  if (index === 0) {
    return askCurrentStep(ctx);
  }
  ctx.session.temp.stepIndex = index - 1;
  await askCurrentStep(ctx);
}

async function handleUploadSkip(ctx) {
  await ctx.answerCbQuery();
  const { step } = currentStep(ctx);
  if (!step.optional) {
    return; // Skip is not offered for required fields, defensively ignore
  }
  await advanceStep(ctx);
}

async function handleUploadCancel(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);
  const text = await t('admin_upload_cancelled');
  await ctx.reply(text, { parse_mode: 'HTML' });
}

async function showPreview(ctx) {
  setFlow(ctx, FLOW.UPLOAD_PREVIEW);
  const draft = ctx.session.draft;

  const text = await tMovie('movie_card', {
    name: draft.name,
    original_name_line: originalNameLine(draft),
    year: orDash(draft.year),
    country: orDash(draft.country),
    language: orDash(draft.language),
    genres: orDash(draft.genres),
    duration: orDash(draft.duration),
    quality: orDash(draft.quality),
    resolution: orDash(draft.resolution),
    dub_type: orDash(draft.dub_type),
    description: orDash(draft.description),
    actors: orDash(draft.actors),
    director: orDash(draft.director),
    views: 0,
    code: draft.code
  });

  const previewHeader = await t('admin_upload_preview_header');
  const keyboard = getUploadPreviewKeyboard();

  if (draft.poster_id) {
    await ctx.replyWithPhoto(draft.poster_id, {
      caption: `${previewHeader}\n\n${text}`,
      parse_mode: 'HTML',
      ...keyboard
    });
  } else {
    await ctx.reply(`${previewHeader}\n\n${text}`, { parse_mode: 'HTML', ...keyboard });
  }
}

async function handleUploadConfirm(ctx) {
  await ctx.answerCbQuery();
  const draft = ctx.session.draft;

  try {
    await moviesRepo.createMovie(draft, ctx.from.id);
  } catch (err) {
    logger.error('upload_wizard', 'Kino saqlashda xato', { error: err });
    clearFlow(ctx);
    return ctx.reply(`❌ ${err.message}`);
  }

  logger.admin('movie_upload', `Yangi kino qo'shildi: ${draft.code} (${draft.name})`, {
    adminId: ctx.from.id,
    code: draft.code
  });

  clearFlow(ctx);
  const successText = await t('admin_upload_success', { name: draft.name, code: draft.code });
  await ctx.reply(successText, { parse_mode: 'HTML' });
}

function isInUploadFlow(ctx) {
  const state = getFlow(ctx);
  return typeof state === 'string' && state.startsWith('upload_');
}

module.exports = {
  handleUploadStart: safeHandler('upload_wizard', handleUploadStart),
  handleUploadTextAnswer: safeHandler('upload_wizard', handleUploadTextAnswer),
  handleUploadPhotoAnswer: safeHandler('upload_wizard', handleUploadPhotoAnswer),
  handleUploadVideoAnswer: safeHandler('upload_wizard', handleUploadVideoAnswer),
  handleUploadBack: safeHandler('upload_wizard', handleUploadBack),
  handleUploadSkip: safeHandler('upload_wizard', handleUploadSkip),
  handleUploadCancel: safeHandler('upload_wizard', handleUploadCancel),
  handleUploadConfirm: safeHandler('upload_wizard', handleUploadConfirm),
  isInUploadFlow
};
