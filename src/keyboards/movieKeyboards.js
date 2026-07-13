'use strict';

const { Markup } = require('telegraf');
const { CALLBACK, MOVIE_FIELDS } = require('../config/constants');
const { chunkButtons } = require('./commonButtons');

const EDITABLE_FIELD_LABELS = Object.freeze({
  name: '📝 Nomi',
  original_name: '📝 Original nomi',
  year: '🗓 Yili',
  country: '🌍 Davlat',
  language: '🗣 Til',
  genres: '🎭 Janr',
  quality: '📀 Sifat',
  resolution: '🖥 Resolution',
  duration: '⏱ Davomiyligi',
  dub_type: '🎙 Dublyaj/Subtitr',
  description: '📝 Tavsif',
  actors: '👥 Aktyorlar',
  director: '🎬 Rejissyor',
  poster_id: '🖼 Poster',
  screenshots: '🖼 Skrinshotlar',
  trailer_url: '🎞 Treyler',
  keywords: '🔑 Kalit so\'zlar',
  tags: '🏷 Teglar',
  age_rating: '🔞 Yosh chegarasi',
  notes: '📌 Izoh',
  file_id: '🎥 Kino fayli'
});

/**
 * Keyboard attached to a movie information card sent to a regular user:
 * favorite toggle, trailer link (if available), and a button that
 * actually triggers sending the video file.
 */
function getMovieCardKeyboard(movie, isFavorite) {
  const rows = [];

  const favButton = isFavorite
    ? Markup.button.callback('💔 Sevimlilardan olib tashlash', `${CALLBACK.FAV_REMOVE}:${movie.code}`)
    : Markup.button.callback('⭐️ Sevimlilarga qo\'shish', `${CALLBACK.FAV_ADD}:${movie.code}`);

  rows.push([Markup.button.callback('🎥 Kinoni yuborish', `${CALLBACK.MOVIE_SEND}:${movie.code}`)]);

  if (movie.trailer_url) {
    rows.push([Markup.button.url('🎞 Treyler', movie.trailer_url)]);
  }

  rows.push([favButton]);

  return Markup.inlineKeyboard(rows);
}

/**
 * Keyboard listing every editable field for the admin edit wizard.
 * Built from MOVIE_FIELDS so it can never drift out of sync with the
 * actual schema (adding a field to constants.js automatically surfaces
 * it here).
 */
function getEditFieldKeyboard(currentCode) {
  const buttons = MOVIE_FIELDS
    .filter((f) => f !== 'code') // code is immutable once created
    .map((field) => Markup.button.callback(
      EDITABLE_FIELD_LABELS[field] || field,
      `${CALLBACK.ADMIN_EDIT_FIELD}:${field}`
    ));
  buttons.push(Markup.button.callback('🎥 Kino fayli', `${CALLBACK.ADMIN_EDIT_FIELD}:file_id`));

  const rows = chunkButtons(buttons, 2);
  rows.push([Markup.button.callback('⬅️ Orqaga', CALLBACK.ADMIN_PANEL)]);
  return Markup.inlineKeyboard(rows);
}

function getDeleteConfirmKeyboard(code) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Ha, o\'chirish', `${CALLBACK.ADMIN_DELETE_CONFIRM}:${code}`),
      Markup.button.callback('❌ Bekor qilish', CALLBACK.ADMIN_DELETE_CANCEL)
    ]
  ]);
}

module.exports = {
  getMovieCardKeyboard,
  getEditFieldKeyboard,
  getDeleteConfirmKeyboard,
  EDITABLE_FIELD_LABELS
};
