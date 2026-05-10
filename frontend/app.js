/** MUSIX — Two-Page Frontend App */
const API_BASE = 'https://musix-pogx.onrender.com/';

const state = {
  library: [], searchResults: [], currentSong: null, currentIndex: -1,
  isPlaying: false, isShuffle: false, repeatMode: 0, volume: 0.75, isMuted: false, searchTimeout: null, currentPage: 'player'
};

const $ = (id) => document.getElementById(id);
const audio = $('audio-player');
const els = {
  pagePlayer: $('page-player'), pageLibrary: $('page-library'),
  searchInput: $('search-input'), searchSpinner: $('search-spinner'), searchClear: $('search-clear'),
  searchResults: $('search-results'), resultsList: $('results-list'),
  libraryItems: $('library-items'), libraryCount: $('library-count'),
  albumArt: $('album-art'), albumArtPlaceholder: $('album-art-placeholder'),
  songTitle: $('song-title'), songArtist: $('song-artist'),
  progressBarWrapper: $('progress-bar-wrapper'), progressFill: $('progress-fill'), progressThumb: $('progress-thumb'),
  currentTime: $('current-time'), totalTime: $('total-time'),
  btnPlay: $('btn-play'), iconPlay: $('icon-play'), iconPause: $('icon-pause'),
  btnPrev: $('btn-prev'), btnNext: $('btn-next'), btnShuffle: $('btn-shuffle'), btnRepeat: $('btn-repeat'),
  btnVolume: $('btn-volume'), btnVolumeMax: $('btn-volume-max'),
  iconVolumeOn: $('icon-volume-on'), iconVolumeMute: $('icon-volume-mute'),
  volumeSliderWrapper: $('volume-slider-wrapper'), volumeFill: $('volume-fill'), volumeThumb: $('volume-thumb'),
  loadingOverlay: $('loading-overlay'), toastContainer: $('toast-container'),
};

// ─── Page Switching ──────────────────────────────────────────────────
function switchPage(page) {
  state.currentPage = page;
  if (page === 'player') {
    els.pagePlayer.classList.add('active');
    els.pageLibrary.classList.remove('active');
  } else {
    els.pageLibrary.classList.add('active');
    els.pagePlayer.classList.remove('active');
    loadLibrary();
  }
}

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  audio.volume = state.volume;
  updateVolumeUI();
  loadLibrary();
});

function setupEventListeners() {
  els.searchInput.addEventListener('input', handleSearchInput);
  els.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearSearch(); });
  els.searchClear.addEventListener('click', clearSearch);
  els.btnPlay.addEventListener('click', togglePlayPause);
  els.btnPrev.addEventListener('click', playPrevious);
  els.btnNext.addEventListener('click', playNext);
  els.btnShuffle.addEventListener('click', toggleShuffle);
  els.btnRepeat.addEventListener('click', toggleRepeat);
  els.progressBarWrapper.addEventListener('click', seekTo);
  setupDrag(els.progressBarWrapper, seekTo);
  els.btnVolume.addEventListener('click', toggleMute);
  els.btnVolumeMax.addEventListener('click', () => setVolume(1));
  els.volumeSliderWrapper.addEventListener('click', setVolumeFromEvent);
  setupDrag(els.volumeSliderWrapper, setVolumeFromEvent);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => { els.totalTime.textContent = formatTime(audio.duration); });
  audio.addEventListener('ended', onSongEnded);
  audio.addEventListener('error', () => { hideLoading(); state.isPlaying = false; updatePlayButton(); showToast('Audio playback error', 'error'); });
  audio.addEventListener('playing', () => { state.isPlaying = true; updatePlayButton(); hideLoading(); });
  document.addEventListener('keydown', handleKeyboard);
}

// ─── Search ──────────────────────────────────────────────────────────
function handleSearchInput(e) {
  const q = e.target.value.trim();
  els.searchClear.classList.toggle('hidden', !q);
  clearTimeout(state.searchTimeout);
  if (!q) { els.searchResults.classList.add('hidden'); return; }
  state.searchTimeout = setTimeout(() => searchSongs(q), 500);
}

async function searchSongs(query) {
  els.searchSpinner.classList.remove('hidden');
  els.searchResults.classList.remove('hidden');
  try {
    const res = await fetch(`${API_BASE}/music/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error();
    state.searchResults = await res.json();
    renderSearchResults(state.searchResults);
  } catch { showToast('Search failed', 'error'); }
  finally { els.searchSpinner.classList.add('hidden'); }
}

function renderSearchResults(results) {
  if (!results.length) {
    els.resultsList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-sec);font-size:0.8rem;">No results found</div>';
    return;
  }
  els.resultsList.innerHTML = results.map((s, i) => `
    <div class="result-item" data-index="${i}" onclick="playSong(${i},'search')">
      <img class="result-thumb" src="${s.thumbnail}" alt="" loading="lazy" onerror="this.style.opacity='0.3'">
      <div class="result-info">
        <div class="result-title">${esc(s.title)}</div>
        <div class="result-artist">${esc(s.artist || 'Unknown')}</div>
      </div>
      <span class="result-duration">${fmtDur(s.duration)}</span>
      <button class="result-add" id="add-${i}" onclick="event.stopPropagation();addToLibrary(${i})" title="Add to Library">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>`).join('');
}

function clearSearch() {
  els.searchInput.value = '';
  els.searchClear.classList.add('hidden');
  els.searchResults.classList.add('hidden');
  state.searchResults = [];
}

// ─── Library ─────────────────────────────────────────────────────────
async function loadLibrary() {
  try {
    const res = await fetch(`${API_BASE}/library`);
    if (!res.ok) throw new Error();
    state.library = await res.json();
  } catch { state.library = []; }
  renderLibrary();
}

function renderLibrary() {
  els.libraryCount.textContent = state.library.length ? `${state.library.length} SONG${state.library.length > 1 ? 'S' : ''}` : '';
  if (!state.library.length) { els.libraryItems.innerHTML = ''; return; }
  els.libraryItems.innerHTML = state.library.map((s, i) => `
    <div class="library-item ${state.currentSong?.videoId === s.videoId ? 'active' : ''}" onclick="playFromLibrary(${i})">
      <img class="library-thumb" src="${s.thumbnail}" alt="" loading="lazy" onerror="this.style.opacity='0.3'">
      <div class="library-info">
        <div class="library-title">${esc(s.title)}</div>
        <div class="library-artist">${esc(s.artist || 'Unknown')}</div>
      </div>
      <button class="library-delete" onclick="event.stopPropagation();removeFromLibrary('${s.videoId}')" title="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>`).join('');
}

function playFromLibrary(index) {
  switchPage('player');
  playSong(index, 'library');
}

async function addToLibrary(index) {
  const song = state.searchResults[index]; if (!song) return;
  const btn = $(`add-${index}`);
  try {
    const res = await fetch(`${API_BASE}/library`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(song) });
    if (!res.ok) throw new Error();
    if (btn) { btn.classList.add('added'); btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'; }
    showToast('Music added to library', 'success');
    loadLibrary();
  } catch { showToast('Failed to add song', 'error'); }
}

async function removeFromLibrary(videoId) {
  try {
    await fetch(`${API_BASE}/library/${videoId}`, { method: 'DELETE' });
    showToast('Removed from library', 'info');
    loadLibrary();
  } catch { showToast('Failed to remove', 'error'); }
}

// ─── Play ────────────────────────────────────────────────────────────
async function playSong(index, source = 'library') {
  const list = source === 'search' ? state.searchResults : state.library;
  const song = list[index]; if (!song) return;
  state.currentSong = song; state.currentIndex = index;
  updatePlayerUI(song); showLoading();
  try {
    const res = await fetch(`${API_BASE}/music/stream/${song.videoId}`);
    if (!res.ok) throw new Error();
    const { audioUrl } = await res.json();
    if (!audioUrl) throw new Error();
    audio.src = audioUrl; audio.load();
    audio.play().catch(() => { hideLoading(); showToast('Playback failed', 'error'); });
    if (source === 'search') { fetch(`${API_BASE}/library`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(song) }).then(() => loadLibrary()).catch(() => { }); }
  } catch { hideLoading(); showToast('Failed to play', 'error'); }
}

function updatePlayerUI(song) {
  els.songTitle.textContent = song.title || '';
  els.songArtist.textContent = song.artist || '';
  if (song.thumbnail) { els.albumArt.src = song.thumbnail; els.albumArt.style.opacity = '1'; els.albumArtPlaceholder.classList.add('hidden'); els.albumArt.onerror = () => { els.albumArt.style.opacity = '0'; els.albumArtPlaceholder.classList.remove('hidden'); }; }
  else { els.albumArt.style.opacity = '0'; els.albumArtPlaceholder.classList.remove('hidden'); }
  els.progressFill.style.width = '0%'; els.progressThumb.style.left = '0%';
  els.currentTime.textContent = '0:00'; els.totalTime.textContent = fmtDur(song.duration) || '0:00';
  document.title = `${song.title} — MUSIX`;
}

// ─── Controls ────────────────────────────────────────────────────────
function togglePlayPause() { if (!audio.src) return; if (state.isPlaying) { audio.pause(); state.isPlaying = false; } else { audio.play().catch(() => { }); state.isPlaying = true; } updatePlayButton(); }
function updatePlayButton() { els.iconPlay.classList.toggle('hidden', state.isPlaying); els.iconPause.classList.toggle('hidden', !state.isPlaying); }
function playNext() { const l = state.library.length ? state.library : state.searchResults; if (!l.length) return; const i = state.isShuffle ? Math.floor(Math.random() * l.length) : (state.currentIndex + 1) % l.length; playSong(i, state.library.length ? 'library' : 'search'); }
function playPrevious() { if (audio.currentTime > 3) { audio.currentTime = 0; return; } const l = state.library.length ? state.library : state.searchResults; if (!l.length) return; let i = state.isShuffle ? Math.floor(Math.random() * l.length) : state.currentIndex - 1; if (i < 0) i = l.length - 1; playSong(i, state.library.length ? 'library' : 'search'); }
function toggleShuffle() { state.isShuffle = !state.isShuffle; els.btnShuffle.classList.toggle('active', state.isShuffle); showToast(state.isShuffle ? 'Shuffle on' : 'Shuffle off', 'info'); }
function toggleRepeat() { state.repeatMode = (state.repeatMode + 1) % 3; els.btnRepeat.classList.toggle('active', state.repeatMode > 0); showToast(['Repeat off', 'Repeat all', 'Repeat one'][state.repeatMode], 'info'); }
function onSongEnded() { state.isPlaying = false; updatePlayButton(); if (state.repeatMode === 2) { audio.currentTime = 0; audio.play(); state.isPlaying = true; updatePlayButton(); } else if (state.repeatMode === 1 || state.currentIndex < (state.library.length || state.searchResults.length) - 1) { playNext(); } }

// ─── Progress / Volume ──────────────────────────────────────────────
function updateProgress() { if (!audio.duration) return; const p = (audio.currentTime / audio.duration) * 100; els.progressFill.style.width = p + '%'; els.progressThumb.style.left = p + '%'; els.currentTime.textContent = formatTime(audio.currentTime); }
function seekTo(e) { if (!audio.duration) return; const r = els.progressBarWrapper.getBoundingClientRect(); audio.currentTime = Math.max(0, Math.min(e.clientX - r.left, r.width)) / r.width * audio.duration; }
function setVolumeFromEvent(e) { const r = els.volumeSliderWrapper.getBoundingClientRect(); setVolume(Math.max(0, Math.min(e.clientX - r.left, r.width)) / r.width); }
function setVolume(v) { state.volume = Math.max(0, Math.min(1, v)); state.isMuted = state.volume === 0; audio.volume = state.volume; audio.muted = false; updateVolumeUI(); }
function toggleMute() { state.isMuted = !state.isMuted; audio.muted = state.isMuted; updateVolumeUI(); }
function updateVolumeUI() { const v = state.isMuted ? 0 : state.volume; els.volumeFill.style.width = (v * 100) + '%'; els.volumeThumb.style.left = (v * 100) + '%'; els.iconVolumeOn.classList.toggle('hidden', state.isMuted || state.volume === 0); els.iconVolumeMute.classList.toggle('hidden', !state.isMuted && state.volume > 0); }

// ─── Drag ────────────────────────────────────────────────────────────
function setupDrag(el, cb) {
  let d = false;
  el.addEventListener('mousedown', e => { d = true; cb(e); e.preventDefault(); });
  document.addEventListener('mousemove', e => { if (d) cb(e); });
  document.addEventListener('mouseup', () => { d = false; });
  el.addEventListener('touchstart', e => { d = true; cb(e.touches[0]); }, { passive: true });
  document.addEventListener('touchmove', e => { if (d) cb(e.touches[0]); }, { passive: true });
  document.addEventListener('touchend', () => { d = false; });
}

// ─── Keyboard ────────────────────────────────────────────────────────
function handleKeyboard(e) {
  if (e.target === els.searchInput) return;
  switch (e.code) {
    case 'Space': e.preventDefault(); togglePlayPause(); break;
    case 'ArrowRight': if (audio.duration) audio.currentTime = Math.min(audio.currentTime + 5, audio.duration); break;
    case 'ArrowLeft': audio.currentTime = Math.max(audio.currentTime - 5, 0); break;
    case 'ArrowUp': e.preventDefault(); setVolume(state.volume + 0.05); break;
    case 'ArrowDown': e.preventDefault(); setVolume(state.volume - 0.05); break;
    case 'KeyM': toggleMute(); break; case 'KeyN': playNext(); break; case 'KeyP': playPrevious(); break;
    case 'KeyS': toggleShuffle(); break; case 'KeyR': toggleRepeat(); break;
    case 'Slash': e.preventDefault(); els.searchInput.focus(); break;
    case 'KeyL': switchPage(state.currentPage === 'player' ? 'library' : 'player'); break;
  }
}

// ─── Utils ───────────────────────────────────────────────────────────
function formatTime(s) { if (!s || isNaN(s)) return '0:00'; return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
function fmtDur(s) { if (!s) return ''; return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function showLoading() { els.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { els.loadingOverlay.classList.add('hidden'); }

const TOAST_ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
};
function showToast(msg, type = 'info') {
  const t = document.createElement('div'); t.className = `toast toast--${type}`;
  t.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span class="toast-text">${esc(msg)}</span>`;
  els.toastContainer.appendChild(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 350); }, 2800);
}
