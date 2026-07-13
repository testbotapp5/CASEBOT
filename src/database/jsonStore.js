'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { DATA_DIR, BACKUPS_DIR, LOGS_DIR, FILES } = require('./paths');
const { getDefault, isValidShape } = require('./schema');

// Per-file write queues prevent two concurrent writers from interleaving
// and corrupting the same JSON file. Every write for a given path is
// chained onto the previous one.
const writeQueues = new Map();

// In-memory cache so repeated reads within the same tick/request don't hit
// disk repeatedly. Invalidated on every write.
const cache = new Map();

function nameFromPath(filePath) {
  const entry = Object.entries(FILES).find(([, p]) => p === filePath);
  return entry ? entry[0] : path.basename(filePath, '.json');
}

async function ensureDirectories() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(BACKUPS_DIR, { recursive: true });
  await fsp.mkdir(LOGS_DIR, { recursive: true });
}

/**
 * Ensures every known database file exists on disk with valid content.
 * If a file is missing, it is created with its default shape. If a file
 * exists but is corrupted (invalid JSON or wrong top-level shape), it is
 * quarantined (renamed with a .corrupted-<timestamp> suffix) and replaced
 * with a fresh default so the bot can keep running instead of crashing.
 * Returns a list of human-readable repair actions taken, for startup logs.
 */
async function ensureAllFiles() {
  await ensureDirectories();
  const actions = [];

  for (const [name, filePath] of Object.entries(FILES)) {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      await writeFileAtomic(filePath, getDefault(name));
      actions.push(`Yaratildi: ${name}.json (mavjud emas edi)`);
      continue;
    }

    try {
      const raw = await fsp.readFile(filePath, 'utf8');
      const parsed = raw.trim() === '' ? getDefault(name) : JSON.parse(raw);
      if (!isValidShape(name, parsed)) {
        throw new Error('noto\'g\'ri struktura');
      }
    } catch (err) {
      const quarantinePath = `${filePath}.corrupted-${Date.now()}`;
      try {
        await fsp.rename(filePath, quarantinePath);
      } catch (_) {
        // If rename fails the file may already be gone; ignore.
      }
      await writeFileAtomic(filePath, getDefault(name));
      actions.push(
        `TUZATILDI: ${name}.json buzilgan edi (${err.message}). ` +
        `Eski nusxa saqlandi: ${path.basename(quarantinePath)}, yangi bo'sh fayl yaratildi.`
      );
    }
  }

  return actions;
}

/**
 * Writes data to filePath atomically: writes to a temp file in the same
 * directory, then renames it over the target. A rename on the same
 * filesystem is atomic, so readers never observe a partially-written file.
 */
async function writeFileAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  const json = JSON.stringify(data, null, 2);
  await fsp.writeFile(tmpPath, json, 'utf8');
  await fsp.rename(tmpPath, filePath);
}

/**
 * Reads and parses a JSON file. If the file is missing or corrupted at
 * read-time, it self-heals by writing the default shape and returning it,
 * rather than throwing and crashing the caller.
 */
async function readJson(filePath) {
  if (cache.has(filePath)) {
    return clone(cache.get(filePath));
  }

  const name = nameFromPath(filePath);
  let data;
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    data = raw.trim() === '' ? getDefault(name) : JSON.parse(raw);
    if (!isValidShape(name, data)) throw new Error('noto\'g\'ri struktura');
  } catch (err) {
    data = getDefault(name);
    await writeFileAtomic(filePath, data).catch(() => {});
  }

  cache.set(filePath, clone(data));
  return clone(data);
}

/**
 * Queues a write so concurrent calls for the same file never race.
 * `mutator` receives the current value and must return the new value.
 * Returns the new value after it has been durably written.
 */
async function updateJson(filePath, mutator) {
  const previousInQueue = writeQueues.get(filePath) || Promise.resolve();

  const task = previousInQueue
    .catch(() => {}) // don't let a prior failure block the queue forever
    .then(async () => {
      const current = await readJson(filePath);
      const next = await mutator(current);
      await writeFileAtomic(filePath, next);
      cache.set(filePath, clone(next));
      return next;
    });

  writeQueues.set(filePath, task);
  return task;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  ensureAllFiles,
  readJson,
  updateJson,
  writeFileAtomic
};
