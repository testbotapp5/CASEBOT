'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const moviesRepo = require('../database/moviesRepo');
const statsService = require('../services/statsService');
const { logger } = require('../services/logger');

const MINIAPP_DIR = path.join(__dirname, '..', '..', 'miniapp');

const STATIC_MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
});

/**
 * Serves the Mini App's static files (index.html, style.css, app.js)
 * directly from disk. Deliberately simple — no caching headers or range
 * requests, since these are small first-party assets served over
 * Telegram's own WebView, not a public CDN workload.
 */
function serveStaticFile(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const resolvedPath = path.normalize(path.join(MINIAPP_DIR, relativePath));

  // Defend against path traversal (e.g. "/../../etc/passwd").
  if (!resolvedPath.startsWith(MINIAPP_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(resolvedPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(resolvedPath);
    const mimeType = STATIC_MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  });
}

/**
 * Minimal dependency-free REST API for the Mini App. Deliberately avoids
 * adding Express as a dependency for a handful of read-only JSON
 * endpoints — Node's built-in http module is enough, keeps the
 * dependency list small (per prompt 4's "remove unnecessary
 * dependencies" requirement), and starts instantly.
 *
 * All endpoints are read-only (GET) and reflect the live database on
 * every request — the Mini App never needs manual synchronization,
 * exactly as required.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS });
  res.end(body);
}

function publicMovieView(movie) {
  const { uploaded_by, ...publicFields } = movie;
  return publicFields;
}

async function handleListMovies(req, res, query) {
  const all = await moviesRepo.getAll();
  let movies = Object.values(all).filter((m) => m.is_active !== false);

  if (query.sort === 'popular') {
    movies = movies.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (query.sort === 'newest') {
    movies = movies.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  }

  const limit = Math.min(parseInt(query.limit, 10) || 60, 200);
  movies = movies.slice(0, limit);

  sendJson(res, 200, { movies: movies.map(publicMovieView) });
}

async function handleSearchMovies(req, res, query) {
  const q = (query.q || '').trim();
  if (!q) {
    return sendJson(res, 200, { movies: [] });
  }
  const results = await moviesRepo.search(q, 50);
  sendJson(res, 200, { movies: results.map(publicMovieView) });
}

async function handleGetMovie(req, res, code) {
  const movie = await moviesRepo.getByCode(code);
  if (!movie) {
    return sendJson(res, 404, { error: 'Kino topilmadi' });
  }
  sendJson(res, 200, { movie: publicMovieView(movie) });
}

async function handleStats(req, res) {
  const stats = await statsService.collectFullStats();
  sendJson(res, 200, {
    totalMovies: stats.totalMovies,
    totalViews: stats.totalViews,
    totalUsers: stats.totalUsers
  });
}

function createRequestHandler() {
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      return res.end();
    }

    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const query = parsed.query;

    try {
      if (req.method === 'GET' && pathname === '/api/movies') {
        return await handleListMovies(req, res, query);
      }
      if (req.method === 'GET' && pathname === '/api/movies/search') {
        return await handleSearchMovies(req, res, query);
      }
      if (req.method === 'GET' && pathname === '/api/stats') {
        return await handleStats(req, res);
      }
      const movieMatch = pathname.match(/^\/api\/movies\/([a-zA-Z0-9_-]+)$/);
      if (req.method === 'GET' && movieMatch) {
        return await handleGetMovie(req, res, movieMatch[1]);
      }

      // Anything not under /api/ is treated as a Mini App static asset
      // request (index.html, style.css, app.js).
      if (req.method === 'GET' && !pathname.startsWith('/api/')) {
        return serveStaticFile(req, res, pathname);
      }

      sendJson(res, 404, { error: 'Endpoint topilmadi' });
    } catch (err) {
      logger.error('api', 'API so\'rovida xato', { error: err, path: pathname });
      sendJson(res, 500, { error: 'Server xatosi' });
    }
  };
}

function startApiServer(port) {
  const server = http.createServer(createRequestHandler());
  server.listen(port);
  return server;
}

module.exports = { startApiServer };
