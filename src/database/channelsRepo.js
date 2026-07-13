'use strict';

const { readJson, updateJson } = require('./jsonStore');
const { FILES } = require('./paths');

/**
 * channels.json shape: Array<{
 *   id: string,           // numeric channel id OR "@username"
 *   title: string,
 *   invite_link: string,  // for private channels, or https://t.me/username
 *   is_enabled: boolean,
 *   order: number,
 *   added_at: string
 * }>
 */

async function getAll() {
  return readJson(FILES.channels);
}

async function getEnabled() {
  const channels = await readJson(FILES.channels);
  return channels
    .filter((c) => c.is_enabled)
    .sort((a, b) => a.order - b.order);
}

async function addChannel({ id, title, invite_link }) {
  return updateJson(FILES.channels, (channels) => {
    if (channels.some((c) => c.id === id)) {
      throw new Error(`Bu kanal allaqachon ro'yxatda mavjud: ${id}`);
    }
    const maxOrder = channels.reduce((max, c) => Math.max(max, c.order || 0), 0);
    channels.push({
      id,
      title: title || id,
      invite_link: invite_link || '',
      is_enabled: true,
      order: maxOrder + 1,
      added_at: new Date().toISOString()
    });
    return channels;
  });
}

async function removeChannel(id) {
  return updateJson(FILES.channels, (channels) => channels.filter((c) => c.id !== id));
}

async function toggleChannel(id) {
  return updateJson(FILES.channels, (channels) => {
    const channel = channels.find((c) => c.id === id);
    if (channel) channel.is_enabled = !channel.is_enabled;
    return channels;
  });
}

async function reorderChannel(id, newOrder) {
  return updateJson(FILES.channels, (channels) => {
    const channel = channels.find((c) => c.id === id);
    if (channel) channel.order = newOrder;
    return channels;
  });
}

module.exports = { getAll, getEnabled, addChannel, removeChannel, toggleChannel, reorderChannel };
