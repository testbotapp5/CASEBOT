'use strict';

/* ============================================================
   TELEGRAM WEB APP INIT
   ============================================================ */
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#08080d'); } catch (_) {}
  try { tg.setBackgroundColor('#08080d'); } catch (_) {}
}

/* ============================================================
   CONFIG / STATE
   ============================================================ */
const API_BASE = window.KINO_API_BASE || '';

const state = {
  allMovies: [],
  newMovies: [],
  popularMovies: [],
  favorites: loadFavorites(),
  activeTab: 'home',
  activeGenre: null,
  searchQuery: '',
  searchResults: null,
  loading: true,
  error: null
};

const els = {
  mainContent: document.getElementById('mainContent'),
  movieCountPill: document.getElementById('movieCountPill'),
  searchInput: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  searchResultsCount: document.getElementById('searchResultsCount'),
  detailOverlay: document.getElementById('detailOverlay'),
  toast: document.getElementById('toast'),
  navItems: document.querySelectorAll('.nav-item')
};

/* ============================================================
   FAVORITES (local mirror; the bot itself tracks favorites
   server-side for its chat flow)
   ============================================================ */
function loadFavorites() {
  try {
    const raw = window.name.startsWith('kino_fav:') ? window.name.slice(9) : '';
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}
function saveFavorites() {
  try { window.name = 'kino_fav:' + JSON.stringify(state.favorites); } catch (_) {}
}
function isFavorite(code) { return state.favorites.includes(code); }
function toggleFavorite(code) {
  if (isFavorite(code)) {
    state.favorites = state.favorites.filter((c) => c !== code);
  } else {
    state.favorites.push(code);
  }
  saveFavorites();
}

/* ============================================================
   API
   ============================================================ */
async function apiGet(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `So'rov xatosi (${res.status})`);
  }
  return res.json();
}

async function fetchHome() {
  const [allRes, newRes, popularRes] = await Promise.all([
    apiGet('/api/movies?limit=200'),
    apiGet('/api/movies?sort=newest&limit=20'),
    apiGet('/api/movies?sort=popular&limit=20')
  ]);
  state.allMovies = allRes.movies;
  state.newMovies = newRes.movies;
  state.popularMovies = popularRes.movies;
}

async function fetchSearch(query) {
  const res = await apiGet('/api/movies/search?q=' + encodeURIComponent(query));
  return res.movies;
}

async function fetchMovie(code) {
  const res = await apiGet('/api/movies/' + encodeURIComponent(code));
  return res.movie;
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtList(value) {
  if (!value) return '';
  return Array.isArray(value) ? value.join(', ') : String(value);
}

function fmtViews(n) {
  const v = n || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return String(v);
}

function posterOrPlaceholder(movie, size) {
  if (movie.poster_url) {
    return `<img src="${escapeHtml(movie.poster_url)}" alt="" loading="lazy">`;
  }
  return `<div class="${size === 'lg' ? 'no-poster-lg' : 'no-poster'}">🎬</div>`;
}

function cardHtml(movie) {
  const yearMeta = movie.year ? `<span>${movie.year}</span>` : '';
  const qualityBadge = movie.quality ? `<div class="card-quality">${escapeHtml(movie.quality)}</div>` : '';
  return `
    <div class="card fade-in" data-code="${escapeHtml(movie.code)}">
      <div class="card-poster">
        ${posterOrPlaceholder(movie)}
        ${qualityBadge}
        <div class="card-views">👁 ${fmtViews(movie.views)}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(movie.name)}</div>
        <div class="card-meta">${yearMeta}<span class="dot">•</span><span>${escapeHtml(movie.code)}</span></div>
      </div>
    </div>`;
}

function skeletonRail(count) {
  return Array.from({ length: count }).map(() => `
    <div class="skel-card">
      <div class="skeleton skel-poster"></div>
      <div class="skeleton skel-line" style="width:90%"></div>
      <div class="skeleton skel-line" style="width:50%"></div>
    </div>`).join('');
}

function extractGenres(movies) {
  const set = new Set();
  for (const m of movies) {
    const list = Array.isArray(m.genres) ? m.genres : (m.genres ? [m.genres] : []);
    list.forEach((g) => set.add(g));
  }
  return Array.from(set).slice(0, 10);
}

/* ============================================================
   SCREENS
   ============================================================ */
function renderLoading() {
  els.mainContent.innerHTML = `
    <div class="hero skeleton" style="min-height:180px;"></div>
    <div class="section">
      <div class="section-header"><div class="section-title"><span class="accent-bar"></span>Yuklanmoqda</div></div>
      <div class="rail">${skeletonRail(4)}</div>
    </div>
    <div class="section">
      <div class="section-header"><div class="section-title"><span class="accent-bar"></span>Yuklanmoqda</div></div>
      <div class="rail">${skeletonRail(4)}</div>
    </div>`;
}

function renderError(message, onRetry) {
  els.mainContent.innerHTML = `
    <div class="state-panel fade-in">
      <div class="state-icon">⚠️</div>
      <div class="state-title">Ulanishda xatolik</div>
      <div class="state-sub">${escapeHtml(message || "Ma'lumotlarni yuklab bo'lmadi. Internetni tekshiring.")}</div>
      <button class="btn-retry" id="retryBtn">↻ Qayta urinish</button>
    </div>`;
  document.getElementById('retryBtn').addEventListener('click', onRetry);
}

function renderOffline() {
  els.mainContent.innerHTML = `
    <div class="state-panel fade-in">
      <div class="state-icon">📡</div>
      <div class="state-title">Internet aloqasi yo'q</div>
      <div class="state-sub">Ulanish tiklanganda avtomatik yangilanadi.</div>
      <button class="btn-retry" id="retryBtn">↻ Qayta urinish</button>
    </div>`;
  document.getElementById('retryBtn').addEventListener('click', boot);
}

function renderEmpty(title, sub) {
  return `
    <div class="state-panel fade-in">
      <div class="state-icon">🗂</div>
      <div class="state-title">${escapeHtml(title)}</div>
      <div class="state-sub">${escapeHtml(sub)}</div>
    </div>`;
}

function renderHome() {
  const genres = extractGenres(state.allMovies);
  const total = state.allMovies.length;

  const chipsHtml = genres.length ? `
    <div class="chip-row">
      <div class="chip ${!state.activeGenre ? 'active' : ''}" data-genre="">Hammasi</div>
      ${genres.map((g) => `<div class="chip ${state.activeGenre === g ? 'active' : ''}" data-genre="${escapeHtml(g)}">${escapeHtml(g)}</div>`).join('')}
    </div>` : '';

  let filteredGrid = state.allMovies;
  if (state.activeGenre) {
    filteredGrid = state.allMovies.filter((m) => {
      const list = Array.isArray(m.genres) ? m.genres : (m.genres ? [m.genres] : []);
      return list.includes(state.activeGenre);
    });
  }

  els.mainContent.innerHTML = `
    <div class="hero scanline-wrap fade-in">
      <div class="hero-content">
        <div class="hero-eyebrow">● ONLINE — BAZA FAOL</div>
        <div class="hero-title">Minglab kino,<br>bitta terminal.</div>
        <div class="hero-sub">${total} ta film mavjud. Kod yoki nom bo'yicha qidiring, sevimlilarga qo'shing.</div>
      </div>
    </div>

    ${chipsHtml}

    ${state.newMovies.length ? `
    <div class="section">
      <div class="section-header">
        <div class="section-title"><span class="accent-bar"></span>Yangi qo'shilgan</div>
        <div class="section-count">${state.newMovies.length} FILM</div>
      </div>
      <div class="rail" id="railNew">${state.newMovies.map(cardHtml).join('')}</div>
    </div>` : ''}

    ${state.popularMovies.length ? `
    <div class="section">
      <div class="section-header">
        <div class="section-title"><span class="accent-bar"></span>Mashhur kinolar</div>
        <div class="section-count">${state.popularMovies.length} FILM</div>
      </div>
      <div class="rail" id="railPopular">${state.popularMovies.map(cardHtml).join('')}</div>
    </div>` : ''}

    <div class="section">
      <div class="section-header">
        <div class="section-title"><span class="accent-bar"></span>${state.activeGenre ? escapeHtml(state.activeGenre) : 'Barcha kinolar'}</div>
        <div class="section-count">${filteredGrid.length} FILM</div>
      </div>
      ${filteredGrid.length
        ? `<div class="grid" id="gridAll">${filteredGrid.map(cardHtml).join('')}</div>`
        : renderEmpty('Kinolar topilmadi', "Bu janrda hozircha kino yo'q.")}
    </div>`;

  bindCardClicks();
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.activeGenre = chip.dataset.genre || null;
      renderHome();
    });
  });
}

function renderTabSection(title, movies, emptyTitle, emptySub) {
  els.mainContent.innerHTML = `
    <div class="section" style="margin-top:18px;">
      <div class="section-header">
        <div class="section-title"><span class="accent-bar"></span>${escapeHtml(title)}</div>
        <div class="section-count">${movies.length} FILM</div>
      </div>
      ${movies.length ? `<div class="grid">${movies.map(cardHtml).join('')}</div>` : renderEmpty(emptyTitle, emptySub)}
    </div>`;
  bindCardClicks();
}

function renderSearchResults() {
  const results = state.searchResults || [];
  els.searchResultsCount.style.display = 'block';
  els.searchResultsCount.textContent = `${results.length} TA NATIJA — "${state.searchQuery}"`;

  els.mainContent.innerHTML = results.length
    ? `<div class="grid" style="margin-top:14px;">${results.map(cardHtml).join('')}</div>`
    : renderEmpty('Hech narsa topilmadi', `"${state.searchQuery}" bo'yicha kino topilmadi. Boshqa so'z bilan urinib ko'ring.`);

  bindCardClicks();
}

function bindCardClicks() {
  document.querySelectorAll('.card[data-code]').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.code));
  });
}

/* ============================================================
   MOVIE DETAIL OVERLAY
   ============================================================ */
async function openDetail(code) {
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

  els.detailOverlay.innerHTML = `
    <div class="detail-loading">
      <div class="skeleton" style="width:64px;height:64px;border-radius:16px;"></div>
      <div style="font-family:var(--font-mono);color:var(--text-tertiary);font-size:12px;">YUKLANMOQDA...</div>
    </div>`;
  els.detailOverlay.classList.add('open');

  try {
    const movie = await fetchMovie(code);
    renderDetail(movie);
  } catch (err) {
    els.detailOverlay.innerHTML = `
      <div class="detail-error">
        <div class="state-icon">❌</div>
        <div class="state-title">Kino topilmadi</div>
        <div class="state-sub">${escapeHtml(err.message)}</div>
        <button class="btn-retry" id="detailCloseBtn">← Ortga qaytish</button>
      </div>`;
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
  }
}

function closeDetail() {
  els.detailOverlay.classList.remove('open');
}

function renderDetail(movie) {
  const fav = isFavorite(movie.code);
  const genreTags = (Array.isArray(movie.genres) ? movie.genres : (movie.genres ? [movie.genres] : []))
    .map((g) => `<div class="detail-tag accent">${escapeHtml(g)}</div>`).join('');

  const specs = [
    ['Yil', movie.year],
    ['Davlat', movie.country],
    ['Til', movie.language],
    ['Sifat', movie.quality],
    ['Resolution', movie.resolution],
    ['Davomiyligi', movie.duration],
    ['Dublyaj', movie.dub_type],
    ['Yosh chegarasi', movie.age_rating]
  ].filter(([, v]) => v);

  els.detailOverlay.innerHTML = `
    <div class="detail-hero">
      ${posterOrPlaceholder(movie, 'lg')}
      <div class="detail-hero-fade"></div>
      <div class="detail-back" id="detailBackBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4"><path d="m15 18-6-6 6-6"/></svg>
      </div>
      <div class="detail-code-badge">${escapeHtml(movie.code)}</div>
    </div>
    <div class="detail-body">
      <div class="detail-title">${escapeHtml(movie.name)}</div>
      ${movie.original_name ? `<div class="detail-original">${escapeHtml(movie.original_name)}</div>` : ''}
      <div class="detail-tags">${genreTags}</div>

      <div class="detail-actions">
        <button class="btn-primary" id="openBotBtn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Botda ko'rish
        </button>
        <button class="btn-secondary ${fav ? 'is-fav' : ''}" id="favBtn">
          ${fav ? '★' : '☆'}
        </button>
      </div>

      ${movie.description ? `
      <div class="detail-section-title">Tavsif</div>
      <div class="detail-desc">${escapeHtml(movie.description)}</div>` : ''}

      ${specs.length ? `
      <div class="detail-section-title">Ma'lumotlar</div>
      <div class="spec-grid">
        ${specs.map(([label, value]) => `
          <div class="spec-item">
            <div class="spec-label">${escapeHtml(label)}</div>
            <div class="spec-value">${escapeHtml(value)}</div>
          </div>`).join('')}
      </div>` : ''}

      ${movie.actors ? `
      <div class="detail-section-title">Aktyorlar</div>
      <div class="detail-desc">${escapeHtml(fmtList(movie.actors))}</div>` : ''}

      ${movie.director ? `
      <div class="detail-section-title">Rejissyor</div>
      <div class="detail-desc">${escapeHtml(movie.director)}</div>` : ''}

      <div class="detail-section-title">Statistika</div>
      <div class="spec-grid">
        <div class="spec-item"><div class="spec-label">Ko'rishlar</div><div class="spec-value">👁 ${fmtViews(movie.views)}</div></div>
        ${movie.trailer_url ? `<div class="spec-item"><div class="spec-label">Treyler</div><div class="spec-value"><a href="${escapeHtml(movie.trailer_url)}" target="_blank" style="color:var(--neon-blue);text-decoration:none;">▶ Ko'rish</a></div></div>` : ''}
      </div>
    </div>`;

  document.getElementById('detailBackBtn').addEventListener('click', closeDetail);
  document.getElementById('favBtn').addEventListener('click', (e) => {
    toggleFavorite(movie.code);
    const nowFav = isFavorite(movie.code);
    e.currentTarget.classList.toggle('is-fav', nowFav);
    e.currentTarget.textContent = nowFav ? '★' : '☆';
    showToast(nowFav ? "⭐ Sevimlilarga qo'shildi" : '💔 Sevimlilardan olib tashlandi');
  });
  document.getElementById('openBotBtn').addEventListener('click', () => {
    if (tg) {
      tg.sendData(JSON.stringify({ action: 'open_movie', code: movie.code }));
      tg.close();
    } else {
      showToast('Bu tugma faqat Telegram ichida ishlaydi');
    }
  });
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function setActiveTab(tab) {
  state.activeTab = tab;
  els.navItems.forEach((item) => item.classList.toggle('active', item.dataset.tab === tab));

  if (tab === 'home') return renderHome();
  if (tab === 'new') return renderTabSection("🆕 Yangi kinolar", state.newMovies, "Hozircha kinolar yo'q", 'Admin hali kino yuklamagan.');
  if (tab === 'popular') return renderTabSection('🔥 Mashhur kinolar', state.popularMovies, "Hozircha statistika yo'q", "Hech kim hali kino ko'rmagan.");
}

els.navItems.forEach((item) => {
  item.addEventListener('click', () => {
    clearSearch();
    setActiveTab(item.dataset.tab);
  });
});

/* ============================================================
   SEARCH (debounced, instant-feel)
   ============================================================ */
let searchDebounce = null;
els.searchInput.addEventListener('input', (e) => {
  const value = e.target.value;
  els.searchClear.classList.toggle('visible', value.length > 0);

  clearTimeout(searchDebounce);
  if (!value.trim()) {
    clearSearch();
    return;
  }
  searchDebounce = setTimeout(() => runSearch(value.trim()), 220);
});

els.searchClear.addEventListener('click', () => {
  els.searchInput.value = '';
  els.searchClear.classList.remove('visible');
  clearSearch();
});

async function runSearch(query) {
  state.searchQuery = query;
  try {
    const results = await fetchSearch(query);
    if (els.searchInput.value.trim() !== query) return;
    state.searchResults = results;
    renderSearchResults();
  } catch (err) {
    if (els.searchInput.value.trim() !== query) return;
    els.searchResultsCount.style.display = 'none';
    renderError(err.message, () => runSearch(query));
  }
}

function clearSearch() {
  state.searchQuery = '';
  state.searchResults = null;
  els.searchResultsCount.style.display = 'none';
  setActiveTab(state.activeTab);
}

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  if (!navigator.onLine) {
    renderOffline();
    return;
  }

  state.loading = true;
  renderLoading();

  try {
    await fetchHome();
    els.movieCountPill.textContent = `${state.allMovies.length} FILM`;
    state.loading = false;
    setActiveTab('home');
  } catch (err) {
    state.loading = false;
    renderError(err.message, boot);
  }
}

window.addEventListener('online', () => { if (state.error) boot(); });
window.addEventListener('offline', renderOffline);

boot();
