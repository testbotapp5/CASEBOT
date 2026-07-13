'use strict';

const { readJson, updateJson } = require('../database/jsonStore');
const { FILES } = require('../database/paths');
const { DEFAULT_MESSAGES } = require('./defaultMessages');
const { render, renderWithEmoji, validateTemplate } = require('./templateEngine');
const { getConfig } = require('../config/botConfig');

/**
 * Returns the effective (possibly admin-overridden) raw template for a
 * message key, falling back to the built-in Uzbek default. This is the
 * single source of truth for "what text does the bot send" — handlers
 * must never hardcode user-facing strings, they call t(key, data) instead.
 */
async function getRawTemplate(key) {
  const overrides = await readJson(FILES.messages);
  if (Object.prototype.hasOwnProperty.call(overrides, key) && overrides[key]) {
    return overrides[key];
  }
  if (Object.prototype.hasOwnProperty.call(DEFAULT_MESSAGES, key)) {
    return DEFAULT_MESSAGES[key];
  }
  throw new Error(`Noma'lum xabar kaliti: "${key}". defaultMessages.js ga qo'shing.`);
}

/**
 * Renders a message by key, substituting {placeholders} and automatically
 * injecting common global values (bot_name, developer_username) so
 * individual call sites don't need to pass them every time.
 */
async function t(key, data = {}) {
  const template = await getRawTemplate(key);
  const { BOT_NAME, DEVELOPER_USERNAME } = getConfig();
  return render(template, {
    bot_name: BOT_NAME,
    developer_username: DEVELOPER_USERNAME,
    ...data
  });
}

/**
 * Same as t(), but for messages that display movie metadata (genre,
 * country, language, actors, director, etc.) which administrators may
 * have entered WITH Telegram Premium Custom Emoji tags during upload.
 * Use this specifically for movie_card and similar templates so those
 * tags render as real Premium Emoji instead of being escaped as plain
 * text — while still safely neutralizing any other injected HTML.
 */
async function tMovie(key, data = {}) {
  const template = await getRawTemplate(key);
  const { BOT_NAME, DEVELOPER_USERNAME } = getConfig();
  return renderWithEmoji(template, {
    bot_name: BOT_NAME,
    developer_username: DEVELOPER_USERNAME,
    ...data
  });
}

async function getAllOverrides() {
  return readJson(FILES.messages);
}

async function getEffectiveMessage(key) {
  return getRawTemplate(key);
}

async function isOverridden(key) {
  const overrides = await readJson(FILES.messages);
  return Boolean(overrides[key]);
}

/**
 * Sets an administrator override for a message key. Validates tg-emoji
 * tag balance before saving so a malformed edit can't silently break
 * every future render of that message.
 */
async function setOverride(key, newTemplate) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_MESSAGES, key)) {
    throw new Error(`Noma'lum xabar kaliti: "${key}"`);
  }
  const validation = validateTemplate(newTemplate);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  await updateJson(FILES.messages, (overrides) => {
    overrides[key] = newTemplate;
    return overrides;
  });
}

async function resetOverride(key) {
  await updateJson(FILES.messages, (overrides) => {
    delete overrides[key];
    return overrides;
  });
}

function listAvailableKeys() {
  return Object.keys(DEFAULT_MESSAGES);
}

module.exports = {
  t,
  tMovie,
  getRawTemplate,
  getAllOverrides,
  getEffectiveMessage,
  isOverridden,
  setOverride,
  resetOverride,
  listAvailableKeys
};
