'use strict';

const usersRepo = require('../database/usersRepo');
const blockedRepo = require('../database/blockedRepo');
const statsCounterRepo = require('../database/statsCounterRepo');
const { LIMITS } = require('../config/constants');
const { logger } = require('./logger');

// In-memory registry of currently running broadcasts, keyed by an
// arbitrary broadcast id, so an admin can cancel one in progress.
const activeBroadcasts = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Re-sends a captured Telegram message (any content type: text, photo,
 * video, document, animation, voice, video_note, audio) to a single chat
 * using copyMessage, which preserves formatting, captions and Premium
 * Custom Emoji without the bot needing to know the specific content type.
 */
async function sendToChat(telegram, chatId, sourceChatId, messageId) {
  await telegram.copyMessage(chatId, sourceChatId, messageId);
}

/**
 * Broadcasts a previously sent message (identified by sourceChatId +
 * messageId, i.e. the admin's own message) to every registered user.
 * Reports progress via onProgress({ sent, failed, total }) and supports
 * cooperative cancellation via the returned control object's cancel().
 */
function startBroadcast({ telegram, sourceChatId, messageId, onProgress, onComplete }) {
  const broadcastId = `bc_${Date.now()}`;
  const controller = { cancelled: false };
  activeBroadcasts.set(broadcastId, controller);

  (async () => {
    const users = await usersRepo.getAll();
    const userIds = Object.keys(users);
    const total = userIds.length;
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      if (controller.cancelled) break;

      const isBlocked = await blockedRepo.isBlocked(userId);
      if (isBlocked) {
        failed++;
        continue;
      }

      try {
        await sendToChat(telegram, userId, sourceChatId, messageId);
        sent++;
      } catch (err) {
        failed++;
        await handleSendFailure(userId, err);
      }

      if ((sent + failed) % 20 === 0 && typeof onProgress === 'function') {
        onProgress({ sent, failed, total });
      }

      await sleep(LIMITS.BROADCAST_DELAY_MS);
    }

    activeBroadcasts.delete(broadcastId);
    await statsCounterRepo.incrementBroadcasts();
    logger.admin('broadcast', `Broadcast tugadi: ${sent} muvaffaqiyatli, ${failed} muvaffaqiyatsiz`, {
      total, sent, failed, cancelled: controller.cancelled
    });

    if (typeof onComplete === 'function') {
      onComplete({ sent, failed, total, cancelled: controller.cancelled });
    }
  })().catch((err) => {
    activeBroadcasts.delete(broadcastId);
    logger.error('broadcast', 'Broadcast jarayonida kutilmagan xato', { error: err });
  });

  return {
    broadcastId,
    cancel: () => { controller.cancelled = true; }
  };
}

/**
 * Interprets a failed send: if Telegram reports the user blocked the bot
 * or the chat no longer exists, mark them blocked in our own records so
 * future broadcasts skip them automatically instead of retrying forever.
 */
async function handleSendFailure(userId, err) {
  const description = (err && err.response && err.response.description) || err.message || '';
  const permanentFailures = [
    'bot was blocked by the user',
    'user is deactivated',
    'chat not found',
    'PEER_ID_INVALID'
  ];

  if (permanentFailures.some((needle) => description.toLowerCase().includes(needle.toLowerCase()))) {
    await blockedRepo.block(userId, description).catch(() => {});
  } else {
    logger.warn('broadcast', `Xabar yuborilmadi: ${userId}`, { userId, error: description });
  }
}

function cancelBroadcast(broadcastId) {
  const controller = activeBroadcasts.get(broadcastId);
  if (!controller) return false;
  controller.cancelled = true;
  return true;
}

module.exports = { startBroadcast, cancelBroadcast };
