'use strict';

const moviesRepo = require('../../database/moviesRepo');
const usersRepo = require('../../database/usersRepo');
const { tMovie } = require('../../messages/messageStore');
const { getMovieCardKeyboard } = require('../../keyboards/movieKeyboards');
const { orDash, originalNameLine } = require('../../utils/formatters');
const movieService = require('../../services/movieService');
const { safeHandler } = require('../../utils/asyncWrapper');
const { replyT } = require('../../utils/replyHelpers');

/**
 * Renders the full movie information card (poster + every admin-entered
 * field) as required by prompts 2/3/5: users must ALWAYS see this card
 * before the video file itself is sent. Uses tMovie() (not t()) so
 * Premium Custom Emoji tags an administrator entered into genre/country/
 * etc. during upload render correctly instead of showing as raw text.
 */
async function sendMovieCard(ctx, movie) {
  const favorites = await usersRepo.getFavorites(ctx.from.id);
  const isFavorite = favorites.includes(movie.code);

  const text = await tMovie('movie_card', {
    name: movie.name,
    original_name_line: originalNameLine(movie),
    year: orDash(movie.year),
    country: orDash(movie.country),
    language: orDash(movie.language),
    genres: orDash(movie.genres),
    duration: orDash(movie.duration),
    quality: orDash(movie.quality),
    resolution: orDash(movie.resolution),
    dub_type: orDash(movie.dub_type),
    description: orDash(movie.description),
    actors: orDash(movie.actors),
    director: orDash(movie.director),
    views: movie.views || 0,
    code: movie.code
  });

  const keyboard = getMovieCardKeyboard(movie, isFavorite);

  if (movie.poster_id) {
    await ctx.replyWithPhoto(movie.poster_id, {
      caption: text,
      parse_mode: 'HTML',
      ...keyboard
    });
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  }
}

/**
 * Handles the "🎥 Kinoni yuborish" button on a movie card: sends the
 * actual video file and records a view. Kept as a separate, explicit
 * step (rather than auto-sending with the card) so the information card
 * is always shown first, exactly as required.
 */
async function handleSendMovie(ctx) {
  const code = ctx.callbackQuery.data.split(':')[2];
  const movie = await moviesRepo.getByCode(code);

  await ctx.answerCbQuery();

  if (!movie) {
    return replyT(ctx, 'movie_not_found', { code });
  }

  await ctx.replyWithVideo(movie.file_id, {
    caption: `🎬 ${movie.name} (${orDash(movie.year)}) — <code>${movie.code}</code>`,
    parse_mode: 'HTML'
  });

  await movieService.registerView(movie.code);
}

async function handleViewMovie(ctx) {
  const code = ctx.callbackQuery.data.split(':')[2];
  const movie = await moviesRepo.getByCode(code);

  await ctx.answerCbQuery();

  if (!movie) {
    return replyT(ctx, 'movie_not_found', { code });
  }

  await sendMovieCard(ctx, movie);
}

module.exports = {
  sendMovieCard,
  handleSendMovie: safeHandler('movie_view', handleSendMovie),
  handleViewMovie: safeHandler('movie_view', handleViewMovie)
};
