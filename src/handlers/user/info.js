'use strict';

const moviesRepo = require('../../database/moviesRepo');
const { t } = require('../../messages/messageStore');
const { getPaginatedKeyboard } = require('../../keyboards/paginationKeyboard');
const { orDash } = require('../../utils/formatters');
const { CALLBACK, LIMITS } = require('../../config/constants');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');

async function handleNewMovies(ctx) {
  const movies = await moviesRepo.getNewest(30);

  if (movies.length === 0) {
    return replyT(ctx, 'new_movies_empty');
  }

  const header = await t('new_movies_header');
  const { keyboard } = getPaginatedKeyboard({
    items: movies,
    page: 1,
    pageSize: LIMITS.MOVIES_PER_PAGE,
    labelFn: (m) => `🎬 ${m.name} (${orDash(m.year)}) — ${m.code}`,
    dataFn: (m) => `${CALLBACK.MOVIE_VIEW}:${m.code}`,
    pageCallbackPrefix: CALLBACK.NEW_MOVIES + ':page'
  });

  await ctx.reply(header, { parse_mode: 'HTML', ...keyboard });
}

async function handlePopularMovies(ctx) {
  const movies = await moviesRepo.getPopular(30);

  if (movies.length === 0 || movies.every((m) => !m.views)) {
    return replyT(ctx, 'popular_movies_empty');
  }

  const header = await t('popular_movies_header');
  const { keyboard } = getPaginatedKeyboard({
    items: movies,
    page: 1,
    pageSize: LIMITS.MOVIES_PER_PAGE,
    labelFn: (m) => `🎬 ${m.name} — 👁 ${m.views || 0}`,
    dataFn: (m) => `${CALLBACK.MOVIE_VIEW}:${m.code}`,
    pageCallbackPrefix: CALLBACK.POPULAR_MOVIES + ':page'
  });

  await ctx.reply(header, { parse_mode: 'HTML', ...keyboard });
}

async function handleHelp(ctx) {
  await ctx.reply(await t('help_text'), { parse_mode: 'HTML' });
}

module.exports = {
  handleNewMovies: safeHandler('new_movies', handleNewMovies),
  handlePopularMovies: safeHandler('popular_movies', handlePopularMovies),
  handleHelp: safeHandler('help', handleHelp)
};
