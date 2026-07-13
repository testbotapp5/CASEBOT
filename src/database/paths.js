'use strict';

const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const FILES = Object.freeze({
  users: path.join(DATA_DIR, 'users.json'),
  movies: path.join(DATA_DIR, 'movies.json'),
  admins: path.join(DATA_DIR, 'admins.json'),
  channels: path.join(DATA_DIR, 'channels.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  feedback: path.join(DATA_DIR, 'feedback.json'),
  blocked: path.join(DATA_DIR, 'blocked.json'),
  stats: path.join(DATA_DIR, 'stats.json')
});

module.exports = { ROOT_DIR, DATA_DIR, LOGS_DIR, BACKUPS_DIR, FILES };
