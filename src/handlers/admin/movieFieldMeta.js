'use strict';

const { validateMovieCode, validateMovieName, validateYear, validateUrl, trimOrNull } = require('../../utils/validators');
const movieService = require('../../services/movieService');

/**
 * Per-field metadata for the movie upload/edit wizards: what to ask, an
 * example hint, how to validate the raw text, and how to turn valid raw
 * text into the stored value (e.g. splitting a comma list into an array).
 * Centralizing this means the wizard step logic itself never needs a
 * giant switch statement — it just looks up the current field here.
 */
const FIELD_META = Object.freeze({
  code: {
    label: 'Kino kodi',
    hint: "Masalan: KN001 (faqat harf/raqam, keyinchalik o'zgartirib bo'lmaydi)",
    validate: validateMovieCode,
    parse: (raw) => raw.trim().toUpperCase()
  },
  name: {
    label: 'Kino nomi',
    hint: 'Masalan: Sherlok Xolms',
    validate: validateMovieName,
    parse: (raw) => raw.trim()
  },
  original_name: {
    label: 'Original nomi',
    hint: 'Masalan: Sherlock Holmes (ixtiyoriy)',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  year: {
    label: 'Chiqarilgan yili',
    hint: 'Masalan: 2020',
    validate: validateYear,
    parse: (raw) => parseInt(raw.trim(), 10)
  },
  country: {
    label: 'Davlat',
    hint: "Masalan: AQSH, O'zbekiston",
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  language: {
    label: 'Til',
    hint: "Masalan: O'zbek, Rus, Ingliz",
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  genres: {
    label: 'Janr(lar)',
    hint: 'Vergul bilan ajrating. Masalan: Drama, Jangari, Komediya',
    validate: () => ({ valid: true, error: null }),
    parse: (raw) => movieService.parseListField(raw)
  },
  quality: {
    label: 'Sifat',
    hint: 'Masalan: HD, FullHD, CAM',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  resolution: {
    label: 'Resolution',
    hint: 'Masalan: 1080p, 720p',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  duration: {
    label: 'Davomiyligi',
    hint: 'Masalan: 120 daqiqa',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  dub_type: {
    label: 'Dublyaj/Subtitr turi',
    hint: "Masalan: O'zbek tilida dublyaj qilingan",
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  description: {
    label: 'Tavsif',
    hint: 'Kino haqida qisqacha ma\'lumot',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  actors: {
    label: 'Aktyorlar',
    hint: 'Vergul bilan ajrating',
    validate: () => ({ valid: true, error: null }),
    parse: (raw) => movieService.parseListField(raw)
  },
  director: {
    label: 'Rejissyor',
    hint: 'Masalan: Kristofer Nolan',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  poster_id: {
    label: 'Poster (rasm)',
    hint: 'Poster rasmini yuboring',
    validate: () => ({ valid: true, error: null }),
    parse: (raw) => raw,
    isMedia: true
  },
  screenshots: {
    label: 'Skrinshotlar',
    hint: 'Bir nechta rasm yuborish mumkin (ixtiyoriy)',
    validate: () => ({ valid: true, error: null }),
    parse: (raw) => raw,
    isMedia: true
  },
  trailer_url: {
    label: 'Treyler havolasi',
    hint: 'Masalan: https://youtube.com/watch?v=...',
    validate: (raw) => (raw && raw.trim() ? validateUrl(raw) : { valid: true, error: null }),
    parse: trimOrNull
  },
  keywords: {
    label: "Kalit so'zlar",
    hint: 'Qidiruvni yaxshilash uchun, vergul bilan ajrating',
    validate: () => ({ valid: true, error: null }),
    parse: (raw) => movieService.parseListField(raw)
  },
  tags: {
    label: 'Teglar',
    hint: 'Vergul bilan ajrating',
    validate: () => ({ valid: true, error: null }),
    parse: (raw) => movieService.parseListField(raw)
  },
  age_rating: {
    label: 'Yosh chegarasi',
    hint: 'Masalan: 16+',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  notes: {
    label: "Qo'shimcha izoh",
    hint: 'Ixtiyoriy izoh',
    validate: () => ({ valid: true, error: null }),
    parse: trimOrNull
  },
  file_id: {
    label: 'Kino fayli',
    hint: 'Video faylni yuboring',
    validate: () => ({ valid: true, error: null }),
    parse: (raw) => raw,
    isMedia: true
  }
});

function getFieldMeta(field) {
  const meta = FIELD_META[field];
  if (!meta) throw new Error(`Noma'lum kino maydoni: ${field}`);
  return meta;
}

module.exports = { FIELD_META, getFieldMeta };
