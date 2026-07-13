'use strict';

/**
 * Static, non-configurable constants used across the whole project.
 * Anything the administrator should be able to change at runtime belongs
 * in database/settingsRepo.js instead.
 */

const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
});

const ADMIN_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR]);
const MANAGEMENT_ROLES = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

// Finite-state-machine states for multi-step conversations (wizards).
// Stored per-user in ctx.session.state.
const FLOW = Object.freeze({
  NONE: null,

  // Movie upload wizard
  UPLOAD_CODE: 'upload_code',
  UPLOAD_NAME: 'upload_name',
  UPLOAD_ORIGINAL_NAME: 'upload_original_name',
  UPLOAD_YEAR: 'upload_year',
  UPLOAD_COUNTRY: 'upload_country',
  UPLOAD_LANGUAGE: 'upload_language',
  UPLOAD_GENRES: 'upload_genres',
  UPLOAD_QUALITY: 'upload_quality',
  UPLOAD_RESOLUTION: 'upload_resolution',
  UPLOAD_DURATION: 'upload_duration',
  UPLOAD_DUB_TYPE: 'upload_dub_type',
  UPLOAD_DESCRIPTION: 'upload_description',
  UPLOAD_ACTORS: 'upload_actors',
  UPLOAD_DIRECTOR: 'upload_director',
  UPLOAD_POSTER: 'upload_poster',
  UPLOAD_SCREENSHOTS: 'upload_screenshots',
  UPLOAD_TRAILER: 'upload_trailer',
  UPLOAD_KEYWORDS: 'upload_keywords',
  UPLOAD_TAGS: 'upload_tags',
  UPLOAD_AGE_RATING: 'upload_age_rating',
  UPLOAD_NOTES: 'upload_notes',
  UPLOAD_VIDEO: 'upload_video',
  UPLOAD_PREVIEW: 'upload_preview',

  // Movie edit wizard
  EDIT_SELECT_CODE: 'edit_select_code',
  EDIT_SELECT_FIELD: 'edit_select_field',
  EDIT_AWAITING_VALUE: 'edit_awaiting_value',

  // Movie delete
  DELETE_SELECT_CODE: 'delete_select_code',
  DELETE_CONFIRM: 'delete_confirm',

  // Search
  SEARCH_BY_NAME: 'search_by_name',

  // Broadcast
  BROADCAST_AWAITING_CONTENT: 'broadcast_awaiting_content',
  BROADCAST_CONFIRM: 'broadcast_confirm',

  // Feedback
  FEEDBACK_AWAITING_TEXT: 'feedback_awaiting_text',
  FEEDBACK_AWAITING_REPLY: 'feedback_awaiting_reply',

  // Channel management
  CHANNEL_AWAITING_ID: 'channel_awaiting_id',

  // Admin management
  ADMIN_AWAITING_ID: 'admin_awaiting_id',
  ADMIN_AWAITING_ROLE: 'admin_awaiting_role',

  // Message / settings editor
  SETTINGS_AWAITING_VALUE: 'settings_awaiting_value',
  MESSAGE_EDITOR_AWAITING_TEXT: 'message_editor_awaiting_text'
});

const MOVIE_FIELDS = Object.freeze([
  'code', 'name', 'original_name', 'year', 'country', 'language',
  'genres', 'quality', 'resolution', 'duration', 'dub_type',
  'description', 'actors', 'director', 'poster_id', 'screenshots',
  'trailer_url', 'keywords', 'tags', 'age_rating', 'notes'
]);

// Fields the upload wizard will ask for, in order. `optional: true` fields
// can be skipped by the administrator.
const UPLOAD_STEPS = Object.freeze([
  { field: 'code', state: FLOW.UPLOAD_CODE, optional: false },
  { field: 'name', state: FLOW.UPLOAD_NAME, optional: false },
  { field: 'original_name', state: FLOW.UPLOAD_ORIGINAL_NAME, optional: true },
  { field: 'year', state: FLOW.UPLOAD_YEAR, optional: true },
  { field: 'country', state: FLOW.UPLOAD_COUNTRY, optional: true },
  { field: 'language', state: FLOW.UPLOAD_LANGUAGE, optional: true },
  { field: 'genres', state: FLOW.UPLOAD_GENRES, optional: true },
  { field: 'quality', state: FLOW.UPLOAD_QUALITY, optional: true },
  { field: 'resolution', state: FLOW.UPLOAD_RESOLUTION, optional: true },
  { field: 'duration', state: FLOW.UPLOAD_DURATION, optional: true },
  { field: 'dub_type', state: FLOW.UPLOAD_DUB_TYPE, optional: true },
  { field: 'description', state: FLOW.UPLOAD_DESCRIPTION, optional: true },
  { field: 'actors', state: FLOW.UPLOAD_ACTORS, optional: true },
  { field: 'director', state: FLOW.UPLOAD_DIRECTOR, optional: true },
  { field: 'poster_id', state: FLOW.UPLOAD_POSTER, optional: true },
  { field: 'screenshots', state: FLOW.UPLOAD_SCREENSHOTS, optional: true },
  { field: 'trailer_url', state: FLOW.UPLOAD_TRAILER, optional: true },
  { field: 'keywords', state: FLOW.UPLOAD_KEYWORDS, optional: true },
  { field: 'tags', state: FLOW.UPLOAD_TAGS, optional: true },
  { field: 'age_rating', state: FLOW.UPLOAD_AGE_RATING, optional: true },
  { field: 'notes', state: FLOW.UPLOAD_NOTES, optional: true },
  { field: 'file_id', state: FLOW.UPLOAD_VIDEO, optional: false }
]);

const CALLBACK = Object.freeze({
  // User
  CHECK_SUB: 'sub:check',
  MAIN_MENU: 'menu:main',
  SEARCH_START: 'search:start',
  FAV_ADD: 'fav:add',       // fav:add:<code>
  FAV_REMOVE: 'fav:del',    // fav:del:<code>
  FAV_LIST: 'fav:list',
  MOVIE_VIEW: 'movie:view', // movie:view:<code>
  MOVIE_SEND: 'movie:send', // movie:send:<code>
  NEW_MOVIES: 'movies:new',
  POPULAR_MOVIES: 'movies:popular',
  SEARCH_PAGE: 'search:page', // search:page:<page>

  // Admin root
  ADMIN_PANEL: 'admin:panel',
  ADMIN_BACK: 'admin:back',

  // Movie management
  ADMIN_UPLOAD_START: 'admin:upload:start',
  ADMIN_UPLOAD_SKIP: 'admin:upload:skip',
  ADMIN_UPLOAD_BACK: 'admin:upload:back',
  ADMIN_UPLOAD_CANCEL: 'admin:upload:cancel',
  ADMIN_UPLOAD_CONFIRM: 'admin:upload:confirm',
  ADMIN_UPLOAD_EDITFIELD: 'admin:upload:editfield', // :<field>

  ADMIN_EDIT_START: 'admin:edit:start',
  ADMIN_EDIT_FIELD: 'admin:edit:field', // :<field>
  ADMIN_EDIT_CANCEL: 'admin:edit:cancel',

  ADMIN_DELETE_START: 'admin:delete:start',
  ADMIN_DELETE_CONFIRM: 'admin:delete:confirm',
  ADMIN_DELETE_CANCEL: 'admin:delete:cancel',

  ADMIN_LIST_MOVIES: 'admin:movies:list',

  // Channels
  ADMIN_CHANNELS: 'admin:channels',
  ADMIN_CHANNEL_ADD: 'admin:channels:add',
  ADMIN_CHANNEL_DEL: 'admin:channels:del', // :<id>
  ADMIN_CHANNEL_TOGGLE: 'admin:channels:toggle', // :<id>

  // Broadcast
  ADMIN_BROADCAST_START: 'admin:broadcast:start',
  ADMIN_BROADCAST_CONFIRM: 'admin:broadcast:confirm',
  ADMIN_BROADCAST_CANCEL: 'admin:broadcast:cancel',

  // Feedback
  ADMIN_FEEDBACK_LIST: 'admin:feedback:list',
  ADMIN_FEEDBACK_VIEW: 'admin:feedback:view', // :<id>
  ADMIN_FEEDBACK_REPLY: 'admin:feedback:reply', // :<id>
  ADMIN_FEEDBACK_DELETE: 'admin:feedback:delete', // :<id>
  ADMIN_FEEDBACK_READ: 'admin:feedback:read', // :<id>

  // Stats / backup / admins
  ADMIN_STATS: 'admin:stats',
  ADMIN_BACKUP_CREATE: 'admin:backup:create',
  ADMIN_BACKUP_LIST: 'admin:backup:list',
  ADMIN_BACKUP_RESTORE: 'admin:backup:restore', // :<file>
  ADMIN_MANAGE_ADMINS: 'admin:admins',
  ADMIN_ADD_ADMIN: 'admin:admins:add',
  ADMIN_REMOVE_ADMIN: 'admin:admins:remove', // :<id>
  ADMIN_MANAGE_BLOCKS: 'admin:blocks',
  ADMIN_UNBLOCK: 'admin:blocks:unblock', // :<id>
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_SETTINGS_TOGGLE_MAINTENANCE: 'admin:settings:toggle_maintenance',
  ADMIN_MESSAGE_EDITOR: 'admin:messages',
  ADMIN_MESSAGE_CATEGORY: 'admin:messages:cat',
  ADMIN_MESSAGE_EDIT_SELECT: 'admin:messages:edit'
});

const LIMITS = Object.freeze({
  MAX_CAPTION_LENGTH: 1024,
  MAX_MESSAGE_LENGTH: 4096,
  MOVIES_PER_PAGE: 5,
  BROADCAST_DELAY_MS: 45,
  MAX_BACKUPS_KEPT: 10,
  LOG_MAX_ENTRIES: 20000,
  SPAM_WINDOW_MS: 10000,
  SPAM_MAX_ACTIONS: 15
});

module.exports = {
  ROLES,
  ADMIN_ROLES,
  MANAGEMENT_ROLES,
  FLOW,
  MOVIE_FIELDS,
  UPLOAD_STEPS,
  CALLBACK,
  LIMITS
};
