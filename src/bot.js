'use strict';

const { Telegraf } = require('telegraf');
const { getConfig } = require('./config/botConfig');
const { CALLBACK, FLOW } = require('./config/constants');

// Middlewares
const { userRegistration } = require('./middlewares/userRegistration');
const { blockGuard } = require('./middlewares/blockGuard');
const { rateLimiter } = require('./middlewares/rateLimiter');
const { subscriptionGuard } = require('./middlewares/subscriptionGuard');
const { errorBoundary } = require('./middlewares/errorBoundary');
const { requireAnyAdmin } = require('./middlewares/adminAuth');

// User handlers
const start = require('./handlers/user/start');
const movieView = require('./handlers/user/movieView');
const search = require('./handlers/user/search');
const favorites = require('./handlers/user/favorites');
const info = require('./handlers/user/info');
const feedback = require('./handlers/user/feedback');

// Admin handlers
const adminPanel = require('./handlers/admin/panel');
const uploadWizard = require('./handlers/admin/movieUploadWizard');
const editWizard = require('./handlers/admin/movieEditWizard');
const deleteFlow = require('./handlers/admin/movieDelete');
const channelManager = require('./handlers/admin/channelManager');
const broadcastFlow = require('./handlers/admin/broadcastFlow');
const feedbackPanel = require('./handlers/admin/feedbackPanel');
const statsPanel = require('./handlers/admin/statsPanel');
const backupPanel = require('./handlers/admin/backupPanel');
const adminManager = require('./handlers/admin/adminManager');
const settingsPanel = require('./handlers/admin/settingsPanel');
const messageEditor = require('./handlers/admin/messageEditor');
const moviesList = require('./handlers/admin/moviesList');

const { getFlow } = require('./utils/sessionHelper');
const { logger } = require('./services/logger');

/**
 * A minimal in-memory session middleware. Sessions are keyed by chat id
 * (mirroring Telegraf's default) and live only for the process lifetime —
 * an in-progress wizard is not expected to survive a restart, which is an
 * acceptable tradeoff since the underlying data (movies, users, etc.) is
 * always durably persisted regardless of session state.
 */
function inMemorySession() {
  const store = new Map();
  return (ctx, next) => {
    const key = ctx.chat ? String(ctx.chat.id) : (ctx.from ? String(ctx.from.id) : 'anon');
    ctx.session = store.get(key) || {};
    return Promise.resolve(next()).then(() => {
      store.set(key, ctx.session);
    });
  };
}

/**
 * Routes an incoming text message to whichever wizard/flow is currently
 * active for this user, based on ctx.session.state. This is the single
 * place that maps FLOW states to their handler, replacing what would
 * otherwise be many competing bot.on('text') registrations (the root
 * cause of the duplicate-handler bugs found in the original project).
 */
async function textStateRouter(ctx, next) {
  const state = getFlow(ctx);

  const stateHandlers = {
    [FLOW.EDIT_SELECT_CODE]: editWizard.handleEditCodeAnswer,
    [FLOW.EDIT_AWAITING_VALUE]: editWizard.handleEditValueAnswer,
    [FLOW.DELETE_SELECT_CODE]: deleteFlow.handleDeleteCodeAnswer,
    [FLOW.CHANNEL_AWAITING_ID]: channelManager.handleChannelIdAnswer,
    [FLOW.BROADCAST_AWAITING_CONTENT]: broadcastFlow.handleBroadcastContentAnswer,
    [FLOW.FEEDBACK_AWAITING_TEXT]: feedback.handleFeedbackSubmission,
    [FLOW.FEEDBACK_AWAITING_REPLY]: feedbackPanel.handleFeedbackReplyAnswer,
    [FLOW.ADMIN_AWAITING_ID]: adminManager.handleAdminIdAnswer,
    [FLOW.MESSAGE_EDITOR_AWAITING_TEXT]: messageEditor.handleMessageEditAnswer
  };

  if (uploadWizard.isInUploadFlow(ctx)) {
    return uploadWizard.handleUploadTextAnswer(ctx);
  }

  const handler = stateHandlers[state];
  if (handler) {
    return handler(ctx);
  }

  return next();
}

/**
 * Routes an incoming photo message the same way, for the two flows that
 * expect image input (movie upload poster/screenshots, movie edit poster).
 */
async function photoStateRouter(ctx, next) {
  if (uploadWizard.isInUploadFlow(ctx)) {
    return uploadWizard.handleUploadPhotoAnswer(ctx);
  }
  const state = getFlow(ctx);
  if (state === FLOW.EDIT_AWAITING_VALUE) {
    return editWizard.handleEditMediaAnswer(ctx);
  }
  return next();
}

async function videoStateRouter(ctx, next) {
  if (uploadWizard.isInUploadFlow(ctx)) {
    return uploadWizard.handleUploadVideoAnswer(ctx);
  }
  const state = getFlow(ctx);
  if (state === FLOW.EDIT_AWAITING_VALUE) {
    return editWizard.handleEditMediaAnswer(ctx);
  }
  return next();
}

/**
 * Reply-keyboard text labels that map directly to a handler, checked
 * after the state router so an in-progress wizard always takes priority
 * over accidentally-matching menu text.
 */
function getMenuTextHandlers() {
  return {
    '🔍 Qidirish': search.handleSearchPrompt,
    '⭐️ Sevimlilar': favorites.handleFavoritesList,
    '🆕 Yangi kinolar': info.handleNewMovies,
    '🔥 Mashhur kinolar': info.handlePopularMovies,
    '💬 Aloqa': feedback.handleFeedbackPrompt,
    'ℹ️ Yordam': info.handleHelp,
    '🛠 Admin panel': adminPanel.handleAdminPanel
  };
}

function createBot() {
  const { BOT_TOKEN } = getConfig();
  const bot = new Telegraf(BOT_TOKEN);

  // Outermost: catch absolutely everything so the bot never crashes.
  bot.use(errorBoundary());

  // Session must be available before anything that reads ctx.session.
  bot.use(inMemorySession());

  // Identify the user and their role before any authorization decision.
  bot.use(userRegistration());

  // Registered BEFORE rate limiting and subscription so a blocked user
  // is dropped as early as possible.
  bot.use(blockGuard());

  bot.use(rateLimiter());

  // Global mandatory-subscription gate, as required: runs before every
  // command, text message and callback query.
  bot.use(subscriptionGuard());

  // ---- Commands ----
  bot.start(start.handleStart);
  bot.command('admin', requireAnyAdmin(), adminPanel.handleAdminPanel);

  // ---- Reply keyboard text routing ----
  bot.on('text', async (ctx) => {
    // 1. Active wizard/flow always wins.
    return textStateRouter(ctx, async () => {
      // 2. Known menu button labels.
      const menuHandlers = getMenuTextHandlers();
      const handler = menuHandlers[ctx.message.text];
      if (handler) {
        return handler(ctx);
      }
      // 3. Anything else typed is treated as a search query.
      return search.handleSearchText(ctx);
    });
  });

  bot.on('photo', (ctx, next) => photoStateRouter(ctx, next));
  bot.on('video', (ctx, next) => videoStateRouter(ctx, next));

  // ---- Callback queries: user-facing ----
  bot.action(CALLBACK.MAIN_MENU, start.handleMainMenuCallback);
  bot.action(CALLBACK.CHECK_SUB, async (ctx) => {
    await ctx.answerCbQuery();
    await start.handleMainMenuCallback(ctx);
  });
  bot.action(new RegExp(`^${CALLBACK.MOVIE_VIEW}:`), movieView.handleViewMovie);
  bot.action(new RegExp(`^${CALLBACK.MOVIE_SEND}:`), movieView.handleSendMovie);
  bot.action(new RegExp(`^${CALLBACK.FAV_ADD}:`), favorites.handleAddFavorite);
  bot.action(new RegExp(`^${CALLBACK.FAV_REMOVE}:`), favorites.handleRemoveFavorite);
  bot.action(new RegExp(`^${CALLBACK.SEARCH_PAGE}:`), search.handleSearchPage);

  // ---- Callback queries: admin ----
  bot.action(CALLBACK.ADMIN_PANEL, requireAnyAdmin(), adminPanel.handleAdminPanel);
  bot.action(CALLBACK.ADMIN_BACK, requireAnyAdmin(), adminPanel.handleAdminPanel);

  bot.action(CALLBACK.ADMIN_UPLOAD_START, requireAnyAdmin(), uploadWizard.handleUploadStart);
  bot.action(CALLBACK.ADMIN_UPLOAD_BACK, requireAnyAdmin(), uploadWizard.handleUploadBack);
  bot.action(CALLBACK.ADMIN_UPLOAD_SKIP, requireAnyAdmin(), uploadWizard.handleUploadSkip);
  bot.action(CALLBACK.ADMIN_UPLOAD_CANCEL, requireAnyAdmin(), uploadWizard.handleUploadCancel);
  bot.action(CALLBACK.ADMIN_UPLOAD_CONFIRM, requireAnyAdmin(), uploadWizard.handleUploadConfirm);

  bot.action(CALLBACK.ADMIN_EDIT_START, requireAnyAdmin(), editWizard.handleEditStart);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_EDIT_FIELD}:`), requireAnyAdmin(), editWizard.handleEditFieldSelect);

  bot.action(CALLBACK.ADMIN_DELETE_START, requireAnyAdmin(), deleteFlow.handleDeleteStart);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_DELETE_CONFIRM}:`), requireAnyAdmin(), deleteFlow.handleDeleteConfirm);
  bot.action(CALLBACK.ADMIN_DELETE_CANCEL, requireAnyAdmin(), deleteFlow.handleDeleteCancel);

  bot.action(CALLBACK.ADMIN_LIST_MOVIES, requireAnyAdmin(), moviesList.handleMoviesList);

  bot.action(CALLBACK.ADMIN_CHANNELS, requireAnyAdmin(), channelManager.handleChannelsList);
  bot.action(CALLBACK.ADMIN_CHANNEL_ADD, requireAnyAdmin(), channelManager.handleChannelAddStart);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_CHANNEL_TOGGLE}:`), requireAnyAdmin(), channelManager.handleChannelToggle);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_CHANNEL_DEL}:`), requireAnyAdmin(), channelManager.handleChannelRemove);

  bot.action(CALLBACK.ADMIN_BROADCAST_START, requireAnyAdmin(), broadcastFlow.handleBroadcastStart);
  bot.action(CALLBACK.ADMIN_BROADCAST_CONFIRM, requireAnyAdmin(), broadcastFlow.handleBroadcastConfirm);
  bot.action(CALLBACK.ADMIN_BROADCAST_CANCEL, requireAnyAdmin(), broadcastFlow.handleBroadcastCancel);

  bot.action(CALLBACK.ADMIN_FEEDBACK_LIST, requireAnyAdmin(), feedbackPanel.handleFeedbackList);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_FEEDBACK_VIEW}:`), requireAnyAdmin(), feedbackPanel.handleFeedbackView);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_FEEDBACK_REPLY}:`), requireAnyAdmin(), feedbackPanel.handleFeedbackReplyStart);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_FEEDBACK_DELETE}:`), requireAnyAdmin(), feedbackPanel.handleFeedbackDelete);

  bot.action(CALLBACK.ADMIN_STATS, requireAnyAdmin(), statsPanel.handleStatsView);

  bot.action(CALLBACK.ADMIN_BACKUP_LIST, requireAnyAdmin(), backupPanel.handleBackupList);
  bot.action(CALLBACK.ADMIN_BACKUP_CREATE, requireAnyAdmin(), backupPanel.handleBackupCreate);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_BACKUP_RESTORE}:`), requireAnyAdmin(), backupPanel.handleBackupRestore);

  bot.action(CALLBACK.ADMIN_MANAGE_ADMINS, requireAnyAdmin(), adminManager.handleAdminsList);
  bot.action(CALLBACK.ADMIN_ADD_ADMIN, requireAnyAdmin(), adminManager.handleAdminAddStart);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_REMOVE_ADMIN}:`), requireAnyAdmin(), adminManager.handleAdminRemove);

  bot.action(CALLBACK.ADMIN_MANAGE_BLOCKS, requireAnyAdmin(), settingsPanel.handleBlockedList);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_UNBLOCK}:`), requireAnyAdmin(), settingsPanel.handleUnblock);

  bot.action(CALLBACK.ADMIN_SETTINGS, requireAnyAdmin(), settingsPanel.handleSettingsView);
  bot.action(CALLBACK.ADMIN_SETTINGS_TOGGLE_MAINTENANCE, requireAnyAdmin(), settingsPanel.handleToggleMaintenance);

  bot.action(CALLBACK.ADMIN_MESSAGE_EDITOR, requireAnyAdmin(), messageEditor.handleMessageEditorList);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_MESSAGE_CATEGORY}:`), requireAnyAdmin(), messageEditor.handleMessageCategorySelect);
  bot.action(new RegExp(`^${CALLBACK.ADMIN_MESSAGE_EDIT_SELECT}:`), requireAnyAdmin(), messageEditor.handleMessageEditSelect);

  // A harmless no-op target for purely informational buttons (e.g. the
  // "2/5" page indicator in pagination keyboards) so tapping it doesn't
  // produce a Telegram "query too old / invalid" error in the client.
  bot.action('noop:page', async (ctx) => ctx.answerCbQuery());

  // Catch-all for any callback_data that reaches this point unhandled
  // (e.g. a stale button from a previous bot version). Logged so it's
  // visible during development instead of silently failing.
  bot.on('callback_query', async (ctx) => {
    logger.warn('router', `Ishlanmagan callback: ${ctx.callbackQuery.data}`, { userId: ctx.from.id });
    await ctx.answerCbQuery().catch(() => {});
  });

  return bot;
}

module.exports = { createBot };
