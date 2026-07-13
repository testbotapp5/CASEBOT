'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const archiver = require('archiver');
const { DATA_DIR, BACKUPS_DIR, FILES } = require('../database/paths');
const { LIMITS } = require('../config/constants');
const { logger } = require('./logger');

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Creates a zip archive of every JSON database file under data/ (excluding
 * previous backups) and writes it into data/backups/. Returns the absolute
 * path of the created archive.
 */
async function createBackup() {
  await fsp.mkdir(BACKUPS_DIR, { recursive: true });
  const fileName = `backup_${timestampSlug()}.zip`;
  const outputPath = path.join(BACKUPS_DIR, fileName);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    output.on('error', reject);

    archive.pipe(output);

    for (const [name, filePath] of Object.entries(FILES)) {
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `${name}.json` });
      }
    }

    archive.finalize();
  });

  logger.admin('backup', `Backup yaratildi: ${fileName}`);
  await rotateOldBackups();
  return outputPath;
}

/**
 * Keeps only the most recent LIMITS.MAX_BACKUPS_KEPT backup files, deleting
 * older ones. Never touches non-backup files in the backups directory.
 */
async function rotateOldBackups(keepCount = LIMITS.MAX_BACKUPS_KEPT) {
  const files = (await fsp.readdir(BACKUPS_DIR))
    .filter((f) => f.startsWith('backup_') && f.endsWith('.zip'))
    .map((f) => ({ name: f, fullPath: path.join(BACKUPS_DIR, f) }))
    .map((f) => ({ ...f, mtime: fs.statSync(f.fullPath).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const toDelete = files.slice(keepCount);
  for (const file of toDelete) {
    await fsp.unlink(file.fullPath).catch(() => {});
    logger.info('backup', `Eski backup o'chirildi: ${file.name}`);
  }
}

async function listBackups() {
  await fsp.mkdir(BACKUPS_DIR, { recursive: true });
  const files = (await fsp.readdir(BACKUPS_DIR))
    .filter((f) => f.startsWith('backup_') && f.endsWith('.zip'));

  return files
    .map((f) => {
      const fullPath = path.join(BACKUPS_DIR, f);
      const stat = fs.statSync(fullPath);
      return { name: f, fullPath, size: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Restores the database from a previously created backup zip. Before
 * overwriting anything, it first creates a safety backup of the CURRENT
 * state, so a bad restore can itself be undone. Uses the same atomic
 * write path as normal DB writes (temp + rename) for every extracted file.
 */
async function restoreBackup(backupFileName) {
  const AdmZip = requireAdmZipOrFallback();
  const backupPath = path.join(BACKUPS_DIR, backupFileName);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup fayl topilmadi: ${backupFileName}`);
  }

  // Safety net: snapshot current state before touching anything.
  await createBackup();

  const zip = new AdmZip(backupPath);
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\.json$/, '');
    const targetPath = FILES[name];
    if (!targetPath) continue; // ignore unknown entries defensively

    const content = entry.getData().toString('utf8');
    try {
      JSON.parse(content); // validate before writing
    } catch (err) {
      throw new Error(`Backup ichidagi "${entry.entryName}" fayli buzilgan, tiklash to'xtatildi.`);
    }

    const tmpPath = `${targetPath}.tmp-restore-${Date.now()}`;
    await fsp.writeFile(tmpPath, content, 'utf8');
    await fsp.rename(tmpPath, targetPath);
  }

  logger.admin('backup', `Backupdan tiklandi: ${backupFileName}`);
}

// archiver only writes zips; reading them back requires a separate reader.
// We lazily require adm-zip only when restore is actually used, and fall
// back to a clear error if it's unavailable, rather than crashing startup.
function requireAdmZipOrFallback() {
  try {
    return require('adm-zip');
  } catch (_) {
    throw new Error(
      'Backupni tiklash uchun "adm-zip" paketi o\'rnatilishi kerak: npm install adm-zip --save'
    );
  }
}

module.exports = { createBackup, listBackups, restoreBackup, rotateOldBackups };
