'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');
const { MOVIE_FIELDS } = require('../config/constants');

/**
 * movies.json shape: { [code: string]: MovieRecord }
 * MovieRecord contains every field in MOVIE_FIELDS plus:
 *   file_id, uploaded_by, uploaded_at, updated_at, views, is_active
 */

function normalizeCode(code) {
  return String(code).trim().toUpperCase();
}

// Normalizes Uzbek/Latin text for case- and character-insensitive search:
// lowercases and maps the common Uzbek apostrophe variants to one form.
function normalizeSearchText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc\u02bb`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function getAll() {
  return readJson(FILES.movies);
}

async function getByCode(code) {
  const movies = await readJson(FILES.movies);
  return movies[normalizeCode(code)] || null;
}

async function codeExists(code) {
  const movie = await getByCode(code);
  return movie !== null;
}

async function createMovie(data, adminId) {
  const code = normalizeCode(data.code);
  return updateJson(FILES.movies, (movies) => {
    if (movies[code]) {
      throw new Error(`"${code}" kodli kino allaqachon mavjud.`);
    }
    const record = {};
    for (const field of MOVIE_FIELDS) {
      record[field] = data[field] !== undefined ? data[field] : null;
    }
    record.code = code;
    record.file_id = data.file_id;
    record.uploaded_by = adminId;
    record.uploaded_at = new Date().toISOString();
    record.updated_at = record.uploaded_at;
    record.views = 0;
    record.is_active = true;
    movies[code] = record;
    return movies;
  });
}

async function updateMovieField(code, field, value) {
  const normalized = normalizeCode(code);
  return updateJson(FILES.movies, (movies) => {
    const movie = movies[normalized];
    if (!movie) {
      throw new Error(`"${normalized}" kodli kino topilmadi.`);
    }
    movie[field] = value;
    movie.updated_at = new Date().toISOString();
    return movies;
  });
}

async function deleteMovie(code) {
  const normalized = normalizeCode(code);
  return updateJson(FILES.movies, (movies) => {
    if (!movies[normalized]) {
      throw new Error(`"${normalized}" kodli kino topilmadi.`);
    }
    delete movies[normalized];
    return movies;
  });
}

async function incrementViews(code) {
  const normalized = normalizeCode(code);
  return updateJson(FILES.movies, (movies) => {
    if (movies[normalized]) {
      movies[normalized].views = (movies[normalized].views || 0) + 1;
    }
    return movies;
  });
}

async function countAll() {
  const movies = await readJson(FILES.movies);
  return Object.keys(movies).length;
}

async function getNewest(limit = 10) {
  const movies = await readJson(FILES.movies);
  return Object.values(movies)
    .filter((m) => m.is_active !== false)
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
    .slice(0, limit);
}

async function getPopular(limit = 10) {
  const movies = await readJson(FILES.movies);
  return Object.values(movies)
    .filter((m) => m.is_active !== false)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit);
}

/**
 * Searches movies by exact code, or by partial/exact name match against
 * name, original_name and keywords. Case-insensitive and Uzbek-character
 * aware via normalizeSearchText. Designed to stay fast into the thousands
 * by doing a single pass over the in-memory object.
 */
async function search(query, limit = 50) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return [];

  const movies = await readJson(FILES.movies);
  const all = Object.values(movies).filter((m) => m.is_active !== false);

  // Exact code match short-circuits with a single result.
  const byCode = all.find((m) => m.code === normalizeCode(trimmed));
  if (byCode) return [byCode];

  const needle = normalizeSearchText(trimmed);
  const needleWords = needle.split(' ').filter(Boolean);
  const scored = [];

  for (const movie of all) {
    const name = normalizeSearchText(movie.name);
    const originalName = normalizeSearchText(movie.original_name);
    const keywords = normalizeSearchText(
      Array.isArray(movie.keywords) ? movie.keywords.join(' ') : movie.keywords
    );
    const haystack = `${name} ${originalName} ${keywords}`;

    let score = 0;
    if (name === needle) score = 100;
    else if (name.startsWith(needle)) score = 80;
    else if (name.includes(needle)) score = 60;
    else if (originalName.includes(needle)) score = 40;
    else if (keywords.includes(needle)) score = 20;
    else if (needleWords.length > 1 && needleWords.every((w) => haystack.includes(w))) {
      score = 10;
    }

    if (score > 0) scored.push({ movie, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.movie);
}

module.exports = {
  getAll,
  getByCode,
  codeExists,
  createMovie,
  updateMovieField,
  deleteMovie,
  incrementViews,
  countAll,
  getNewest,
  getPopular,
  search,
  normalizeCode,
  normalizeSearchText
};
