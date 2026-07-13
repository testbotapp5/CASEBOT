'use strict';

/**
 * Input validators used throughout admin wizards and user-facing input
 * handling. Each returns { valid: boolean, error: string|null } so
 * callers can show a specific, actionable Uzbek error message.
 */

function validateMovieCode(raw) {
  const code = String(raw || '').trim();
  if (!code) return { valid: false, error: 'Kino kodi bo\'sh bo\'lishi mumkin emas.' };
  if (code.length < 2 || code.length > 20) {
    return { valid: false, error: 'Kino kodi 2 dan 20 gacha belgidan iborat bo\'lishi kerak.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
    return { valid: false, error: 'Kino kodi faqat lotin harflari, raqamlar, "_" va "-" belgilaridan iborat bo\'lishi kerak.' };
  }
  return { valid: true, error: null };
}

function validateMovieName(raw) {
  const name = String(raw || '').trim();
  if (!name) return { valid: false, error: 'Kino nomi bo\'sh bo\'lishi mumkin emas.' };
  if (name.length > 200) return { valid: false, error: 'Kino nomi juda uzun (maksimum 200 belgi).' };
  return { valid: true, error: null };
}

function validateYear(raw) {
  const text = String(raw || '').trim();
  const year = parseInt(text, 10);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(year) || String(year) !== text) {
    return { valid: false, error: 'Yil butun son bo\'lishi kerak (masalan: 2024).' };
  }
  if (year < 1888 || year > currentYear + 2) {
    return { valid: false, error: `Yil 1888 dan ${currentYear + 2} gacha oralig'ida bo'lishi kerak.` };
  }
  return { valid: true, error: null };
}

function validateUrl(raw) {
  const text = String(raw || '').trim();
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Havola http:// yoki https:// bilan boshlanishi kerak.' };
    }
    return { valid: true, error: null };
  } catch (_) {
    return { valid: false, error: 'Noto\'g\'ri havola formati.' };
  }
}

function validateTelegramId(raw) {
  const text = String(raw || '').trim();
  if (!/^\d{5,15}$/.test(text)) {
    return { valid: false, error: 'Telegram ID faqat raqamlardan iborat bo\'lishi kerak (5-15 ta raqam).' };
  }
  return { valid: true, error: null };
}

/**
 * Validates a mandatory-channel identifier: either a numeric channel id
 * (typically starting with -100 for supergroups/channels) or a
 * "@username" handle.
 */
function validateChannelId(raw) {
  const text = String(raw || '').trim();
  if (/^@[a-zA-Z0-9_]{5,32}$/.test(text)) {
    return { valid: true, error: null, normalized: text };
  }
  if (/^-?\d{6,15}$/.test(text)) {
    return { valid: true, error: null, normalized: text };
  }
  return {
    valid: false,
    error: 'Kanal @username (masalan @mychannel) yoki raqamli ID (masalan -1001234567890) shaklida bo\'lishi kerak.',
    normalized: null
  };
}

function trimOrNull(raw) {
  const text = String(raw || '').trim();
  return text === '' ? null : text;
}

module.exports = {
  validateMovieCode,
  validateMovieName,
  validateYear,
  validateUrl,
  validateTelegramId,
  validateChannelId,
  trimOrNull
};
