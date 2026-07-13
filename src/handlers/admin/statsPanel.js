'use strict';

const statsService = require('../../services/statsService');
const { t } = require('../../messages/messageStore');
const { getBackToAdminKeyboard } = require('../../keyboards/adminMenu');
const { clearFlow } = require('../../utils/sessionHelper');
const { safeHandler } = require('../../utils/asyncWrapper');

async function handleStatsView(ctx) {
  await ctx.answerCbQuery();
  clearFlow(ctx);

  const stats = await statsService.collectFullStats();

  const text = await t('admin_stats_header', {
    total_users: stats.totalUsers,
    active_today: stats.activeToday,
    active_week: stats.activeWeek,
    blocked_users: stats.blockedUsers,
    total_movies: stats.totalMovies,
    total_views: stats.totalViews,
    total_searches: stats.totalSearches,
    total_broadcasts: stats.totalBroadcasts,
    unread_feedback: stats.unreadFeedback,
    database_size: stats.databaseSize,
    backup_count: stats.backupCount,
    server_uptime: stats.serverUptime
  });

  const keyboard = getBackToAdminKeyboard();

  await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard }).catch(async () => {
    await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  });
}

module.exports = {
  handleStatsView: safeHandler('stats_panel', handleStatsView)
};
