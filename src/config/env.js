'use strict';

/**
 * Environment variable loading and startup validation.
 * The bot must NEVER start with invalid/missing critical configuration.
 */

require('dotenv').config();

/**
 * Thrown when startup configuration is invalid. Caught at the top level
 * in index.js to print a clear, readable error instead of a stack trace.
 */
class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function requireString(name, { allowEmpty = false } = {}) {
  const value = process.env[name];
  if (value === undefined || (!allowEmpty && value.trim() === '')) {
    throw new ConfigError(
      `Majburiy environment o'zgaruvchisi topilmadi yoki bo'sh: ${name}\n` +
      `Iltimos, .env faylida "${name}" qiymatini to'g'ri kiriting (.env.example faylga qarang).`
    );
  }
  return value.trim();
}

function requireInteger(name) {
  const raw = requireString(name);
  const value = parseInt(raw, 10);
  if (!Number.isInteger(value) || String(value) !== raw.replace(/^\+/, '')) {
    throw new ConfigError(
      `Environment o'zgaruvchisi "${name}" butun son bo'lishi kerak, lekin qiymat: "${raw}"`
    );
  }
  return value;
}

function optionalString(name, fallback = '') {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim();
}

function optionalInteger(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function optionalBoolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Validates and returns the full environment configuration.
 * Throws ConfigError with a human-readable message on any problem.
 */
function loadEnv() {
  const errors = [];
  let BOT_TOKEN, SUPER_ADMIN_ID;

  try {
    BOT_TOKEN = requireString('BOT_TOKEN');
    if (!/^\d+:[\w-]+$/.test(BOT_TOKEN)) {
      errors.push('BOT_TOKEN formati noto\'g\'ri ko\'rinadi (BotFather tokeni "123456:ABC-..." shaklida bo\'lishi kerak).');
    }
  } catch (e) {
    errors.push(e.message);
  }

  try {
    SUPER_ADMIN_ID = requireInteger('SUPER_ADMIN_ID');
    if (SUPER_ADMIN_ID <= 0) {
      errors.push('SUPER_ADMIN_ID musbat butun son bo\'lishi kerak (Telegram foydalanuvchi ID raqami).');
    }
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    throw new ConfigError(
      'Konfiguratsiya xatolari topildi, bot ishga tushmaydi:\n\n' +
      errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
    );
  }

  return {
    BOT_TOKEN,
    SUPER_ADMIN_ID,
    BOT_NAME: optionalString('BOT_NAME', 'Kino Bot'),
    DEVELOPER_USERNAME: optionalString('DEVELOPER_USERNAME', ''),
    MINI_APP_URL: optionalString('MINI_APP_URL', ''),
    FLOOD_LIMIT: optionalInteger('FLOOD_LIMIT', 8),
    COOLDOWN_TIME: optionalInteger('COOLDOWN_TIME', 800),
    NODE_ENV: optionalString('NODE_ENV', 'production'),
    WEBHOOK_DOMAIN: optionalString('WEBHOOK_DOMAIN', ''),
    WEBHOOK_PORT: optionalInteger('WEBHOOK_PORT', 8443),
    API_PORT: optionalInteger('PORT', optionalInteger('API_PORT', 3000)),
    API_ENABLED: optionalBoolean('API_ENABLED', false),
    IS_PRODUCTION: optionalString('NODE_ENV', 'production') === 'production'
  };
}

module.exports = { loadEnv, ConfigError };
