'use strict';

const { loadEnv, ConfigError } = require('./src/config/env');
const { ensureAllFiles } = require('./src/database/jsonStore');
const { installProcessGuards } = require('./src/middlewares/errorBoundary');

/**
 * Startup sequence, in order:
 *   1. Validate environment variables (fail fast with a readable error).
 *   2. Ensure every database file exists and is structurally valid,
 *      repairing anything corrupted.
 *   3. Install process-level safety nets (uncaught exception / rejection).
 *   4. Create and launch the Telegraf bot.
 *   5. Register graceful shutdown handlers for SIGINT/SIGTERM.
 *
 * If step 1 fails, the process exits immediately with a clear message —
 * the bot must never start with invalid configuration. Every later step
 * degrades gracefully instead of crashing where possible.
 */
async function main() {
  let config;
  try {
    config = loadEnv();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error('\n========================================');
      console.error('  BOT ISHGA TUSHIRILMADI');
      console.error('========================================\n');
      console.error(err.message);
      console.error('\n========================================\n');
      process.exit(1);
    }
    throw err;
  }

  const { logger } = require('./src/services/logger');

  logger.info('startup', `${config.BOT_NAME} ishga tushmoqda...`, { nodeEnv: config.NODE_ENV });

  const repairActions = await ensureAllFiles();
  if (repairActions.length > 0) {
    for (const action of repairActions) {
      logger.warn('startup', action);
    }
  }

  installProcessGuards();

  const { createBot } = require('./src/bot');
  const bot = createBot();

  // IMPORTANT: bot.launch() does not reliably resolve while polling is
  // active — awaiting it here would block everything after it (including
  // starting the Mini App API server) for the entire lifetime of the
  // bot. We fire it and attach a rejection handler for startup failures
  // (e.g. invalid token), without blocking the rest of main().
  bot.launch().catch((err) => {
    logger.error('startup', 'Botni ishga tushirishda xato', { error: err });
    process.exit(1);
  });
  logger.info('startup', `${config.BOT_NAME} muvaffaqiyatli ishga tushdi va so'rovlarni kutmoqda.`);

  // Mini App REST API + static file server. Only started when explicitly
  // enabled via API_ENABLED=true, so plain bot-only deployments never
  // open an unused port. Serves the Mini App's own index.html/style.css/
  // app.js alongside the /api/* JSON endpoints on the same port.
  let apiServer = null;
  if (config.API_ENABLED) {
    const { startApiServer } = require('./src/api/server');
    apiServer = startApiServer(config.API_PORT);
    logger.info('startup', `Mini App REST API ${config.API_PORT}-portda ishga tushdi.`);
  }

  const shutdown = (signal) => {
    logger.info('shutdown', `${signal} qabul qilindi, bot to'xtatilmoqda...`);
    bot.stop(signal);
    if (apiServer) apiServer.close();
    logger.info('shutdown', 'Bot toza to\'xtatildi.');
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Kutilmagan startup xatosi:', err);
  process.exit(1);
});
