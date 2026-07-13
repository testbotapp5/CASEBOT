'use strict';

const usersRepo = require('../../database/usersRepo');
const moviesRepo = require('../../database/moviesRepo');
const { t } = require('../../messages/messageStore');
const { getPaginatedKeyboard } = require('../../keyboards/paginationKeyboard');
const { orDash } = require('../../utils/formatters');
const { CALLBACK, LIMITS } = require('../../config/constants');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');

async function handleFavoritesList(ctx) {
  const isCallback = Boolean(ctx.callbackQuery);
  if (isCallback) await ctx.answerCbQuery();

  const favoriteCodes = await usersRepo.getFavorites(ctx.from.id);

  if (favoriteCodes.length === 0) {
    return replyT(ctx, 'favorites_empty');
  }

  const allMovies = await moviesRepo.getAll();
  const movies = favoriteCodes
    .map((code) => allMovies[code])
    .filter(Boolean);

  const header = await t('favorites_header', { count: movies.length });

  const { keyboard } = getPaginatedKeyboard({
    items: movies,
    page: 1,
    pageSize: LIMITS.MOVIES_PER_PAGE,
    labelFn: (m) => `🎬 ${m.name} (${orDash(m.year)}) — ${m.code}`,
    dataFn: (m) => `${CALLBACK.MOVIE_VIEW}:${m.code}`,
    pageCallbackPrefix: CALLBACK.FAV_LIST + ':page'
  });

  await ctx.reply(header, { parse_mode: 'HTML', ...keyboard });
}

async function handleAddFavorite(ctx) {
  const code = ctx.callbackQuery.data.split(':')[2];
  const movie = await moviesRepo.getByCode(code);

  if (!movie) {
    await ctx.answerCbQuery('❌ Kino topilmadi');
    return;
  }

  await usersRepo.addFavorite(ctx.from.id, code);
  await ctx.answerCbQuery('⭐️ Sevimlilarga qo\'shildi!');

  await replyT(ctx, 'favorites_added', { movie_name: movie.name });
}

async function handleRemoveFavorite(ctx) {
  const code = ctx.callbackQuery.data.split(':')[2];
  const movie = await moviesRepo.getByCode(code);

  await usersRepo.removeFavorite(ctx.from.id, code);
  await ctx.answerCbQuery('💔 Sevimlilardan olib tashlandi');

  await replyT(ctx, 'favorites_removed', { movie_name: movie ? movie.name : code });
}

module.exports = {
  handleFavoritesList: safeHandler('favorites', handleFavoritesList),
  handleAddFavorite: safeHandler('favorites', handleAddFavorite),
  handleRemoveFavorite: safeHandler('favorites', handleRemoveFavorite)
};
