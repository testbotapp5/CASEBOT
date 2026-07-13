'use strict';

const moviesRepo = require('../../database/moviesRepo');
const { getPaginatedKeyboard } = require('../../keyboards/paginationKeyboard');
const { orDash } = require('../../utils/formatters');
const { CALLBACK, LIMITS } = require('../../config/constants');
const { clearFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');

async function handleMoviesList(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);

  const all = await moviesRepo.getAll();
  const movies = Object.values(all).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

  if (movies.length === 0) {
    return ctx.reply('📃 Hozircha kinolar mavjud emas.', {
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Admin panelga qaytish', callback_data: CALLBACK.ADMIN_PANEL }]] }
    });
  }

  const { keyboard } = getPaginatedKeyboard({
    items: movies,
    page: 1,
    pageSize: LIMITS.MOVIES_PER_PAGE,
    labelFn: (m) => `🎬 ${m.name} (${orDash(m.year)}) — ${m.code} — 👁 ${m.views || 0}`,
    dataFn: (m) => `${CALLBACK.MOVIE_VIEW}:${m.code}`,
    pageCallbackPrefix: CALLBACK.ADMIN_LIST_MOVIES + ':page',
    extraRows: [[{ text: '⬅️ Admin panelga qaytish', callback_data: CALLBACK.ADMIN_PANEL }]]
  });

  await ctx.reply(`📃 Barcha kinolar (${movies.length}):`, keyboard);
}

module.exports = {
  handleMoviesList: safeHandler('movies_list', handleMoviesList)
};
