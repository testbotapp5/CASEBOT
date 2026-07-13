'use strict';

const moviesRepo = require('../../database/moviesRepo');
const usersRepo = require('../../database/usersRepo');
const movieService = require('../../services/movieService');
const { t } = require('../../messages/messageStore');
const { getPaginatedKeyboard } = require('../../keyboards/paginationKeyboard');
const { orDash } = require('../../utils/formatters');
const { CALLBACK, LIMITS } = require('../../config/constants');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');
const { sendMovieCard } = require('./movieView');

/**
 * Sends a paginated list of search results. If there's exactly one
 * result, skips the list entirely and shows the movie card directly —
 * a single-code search shouldn't force the user through an extra tap.
 */
async function presentSearchResults(ctx, query, page = 1) {
  const results = await moviesRepo.search(query);

  await movieService.registerSearch();
  await usersRepo.incrementSearchCount(ctx.from.id);

  if (results.length === 0) {
    return replyT(ctx, 'search_no_results', { query });
  }

  if (results.length === 1) {
    return sendMovieCard(ctx, results[0]);
  }

  ctx.session.lastSearchQuery = query;

  const header = await t('search_results_header', { query, count: results.length });

  const { keyboard } = getPaginatedKeyboard({
    items: results,
    page,
    pageSize: LIMITS.MOVIES_PER_PAGE,
    labelFn: (m) => `🎬 ${m.name} (${orDash(m.year)}) — ${m.code}`,
    dataFn: (m) => `${CALLBACK.MOVIE_VIEW}:${m.code}`,
    pageCallbackPrefix: CALLBACK.SEARCH_PAGE
  });

  await ctx.reply(header, { parse_mode: 'HTML', ...keyboard });
}

async function handleSearchText(ctx) {
  const query = ctx.message.text.trim();
  if (!query) return;
  await presentSearchResults(ctx, query, 1);
}

async function handleSearchPage(ctx) {
  const page = parseInt(ctx.callbackQuery.data.split(':')[2], 10) || 1;
  const query = ctx.session.lastSearchQuery;

  await ctx.answerCbQuery();

  if (!query) {
    return replyT(ctx, 'search_prompt');
  }

  const results = await moviesRepo.search(query);
  const header = await t('search_results_header', { query, count: results.length });

  const { keyboard } = getPaginatedKeyboard({
    items: results,
    page,
    pageSize: LIMITS.MOVIES_PER_PAGE,
    labelFn: (m) => `🎬 ${m.name} (${orDash(m.year)}) — ${m.code}`,
    dataFn: (m) => `${CALLBACK.MOVIE_VIEW}:${m.code}`,
    pageCallbackPrefix: CALLBACK.SEARCH_PAGE
  });

  await ctx.editMessageText(header, { parse_mode: 'HTML', ...keyboard }).catch(async () => {
    await ctx.reply(header, { parse_mode: 'HTML', ...keyboard });
  });
}

async function handleSearchPrompt(ctx) {
  await replyT(ctx, 'search_prompt');
}

module.exports = {
  presentSearchResults,
  handleSearchText: safeHandler('search', handleSearchText),
  handleSearchPage: safeHandler('search', handleSearchPage),
  handleSearchPrompt: safeHandler('search', handleSearchPrompt)
};
