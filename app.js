/**
 * Sparx Media – Multi-platform web music player
 * Local files fully supported. Platform connects simulated (ready for real OAuth).
 * Inspired by Justin Shu's "sneaky!!" jam + Spotify UX.
 */

const COVER = 'https://raw.githubusercontent.com/justshhhhhhh-au/spotifywebapp/main/public/album-art.jpg';

// Demo tracks matching the reference UI (no real audio URLs for copyrighted tracks;
// when you add local files they become playable)
const DEMO_TRACKS = [
  {
    id: 't1',
    title: 'sneaky',
    artist: '21 Savage',
    album: 'american dream',
    duration: 201, // 3:21
    cover: COVER,
    source: 'demo',
    bpm: 155,
    key: '12B'
  },
  {
    id: 't2',
    title: 'Peaches & Eggplants (feat. 21 Savage)',
    artist: 'Young Nudy, 21 Savage',
    album: 'Peaches & Eggplants',
    duration: 203,
    cover: COVER,
    source: 'demo',
    bpm: 73,
    key: '2B'
  },
  {
    id: 't3',
    title: "Let's Go",
    artist: 'Key Glock',
    album: "Let's Go",
    duration: 165,
    cover: COVER,
    source: 'demo'
  },
  {
    id: 't4',
    title: 'letter to my brudda',
    artist: '21 Savage',
    album: 'american dream',
    duration: 198,
    cover: COVER,
    source: 'demo'
  }
];

// State
const state = {
  tracks: [...DEMO_TRACKS],
  localTracks: [],
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  shuffle: false,
  repeat: false, // false | 'all' | 'one'
  volume: 0.8,
  liked: new Set(),
  connected: { local: true, spotify: false, youtube: false, apple: false, soundcloud: false },
  view: 'home'
};

const audio = document.getElementById('audio');
audio.volume = state.volume;

// ---------- Helpers ----------
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function toast(msg, ms = 2400) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

function getCurrentTrack() {
  if (state.currentIndex < 0 || state.currentIndex >= state.queue.length) return null;
  return state.queue[state.currentIndex];
}

// ---------- Render ----------
function renderTrackList(container, tracks, opts = {}) {
  container.innerHTML = tracks.map((t, i) => {
    const playing = getCurrentTrack()?.id === t.id && state.isPlaying;
    return `
      <div class="track-row ${playing ? 'playing' : ''}" data-id="${t.id}" data-index="${i}">
        <div class="track-num">${i + 1}</div>
        <div class="track-play-icon">▶</div>
        <div class="track-info">
          <img src="${t.cover || COVER}" alt="" loading="lazy" />
          <div>
            <div class="track-title">${escapeHtml(t.title)}</div>
            <div class="track-artist">${escapeHtml(t.artist)}</div>
          </div>
        </div>
        <div class="track-album">${escapeHtml(t.album || t.source || '')}</div>
        <div class="track-duration">${fmtTime(t.duration)}</div>
        <div class="track-actions">
          <button class="icon-btn like-mini" data-like="${t.id}">${state.liked.has(t.id) ? '♥' : '♡'}</button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-like]')) return;
      const id = row.dataset.id;
      playTrackById(id, tracks);
    });
  });
  container.querySelectorAll('[data-like]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLike(btn.dataset.like);
      renderAll();
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAll() {
  renderTrackList(document.getElementById('track-list'), state.tracks);
  document.getElementById('track-count').textContent = state.tracks.length;
  renderTrackList(document.getElementById('local-tracks'), state.localTracks);
  document.getElementById('local-count').textContent = `${state.localTracks.length} file${state.localTracks.length !== 1 ? 's' : ''}`;

  // Now playing UI
  const t = getCurrentTrack();
  if (t) {
    document.getElementById('np-title').textContent = t.title;
    document.getElementById('np-artist').textContent = t.artist;
    document.getElementById('np-cover').src = t.cover || COVER;
    document.getElementById('source-tag').textContent = t.source === 'local' ? 'Local' : (t.source || 'Demo');
  }
  document.getElementById('play-icon').style.display = state.isPlaying ? 'none' : 'block';
  document.getElementById('pause-icon').style.display = state.isPlaying ? 'block' : 'none';
  document.getElementById('shuffle-toggle').classList.toggle('active', state.shuffle);
  document.getElementById('repeat-btn').classList.toggle('active', !!state.repeat);
}

// ---------- Playback ----------
function playTrackById(id, list = state.tracks) {
  const track = list.find(x => x.id === id) || state.localTracks.find(x => x.id === id) || state.tracks.find(x => x.id === id);
  if (!track) return;

  // Build queue from current context (playlist or local)
  state.queue = [...list];
  state.currentIndex = state.queue.findIndex(x => x.id === id);
  if (state.currentIndex < 0) {
    state.queue = [track];
    state.currentIndex = 0;
  }
  loadAndPlay(track);
}

function loadAndPlay(track) {
  // Demo tracks have no real audio (copyright). Local tracks have blob URLs.
  if (track.url) {
    audio.src = track.url;
    audio.play().then(() => {
      state.isPlaying = true;
      renderAll();
    }).catch(err => {
      console.warn(err);
      toast('Playback blocked – click play again or check file format');
      state.isPlaying = false;
      renderAll();
    });
  } else {
    // Simulated demo play (no audio stream available)
    audio.removeAttribute('src');
    audio.load();
    state.isPlaying = true;
    // Fake progress for demo
    startDemoProgress(track.duration || 180);
    toast(`Demo: "${track.title}" — add local MP3s for real playback`);
    renderAll();
  }
  document.getElementById('time-total').textContent = fmtTime(track.duration);
}

let demoTimer = null;
function startDemoProgress(total) {
  clearInterval(demoTimer);
  let current = 0;
  audio.currentTime = 0;
  const fill = document.getElementById('progress-fill');
  const thumb = document.getElementById('progress-thumb');
  const cur = document.getElementById('time-current');
  demoTimer = setInterval(() => {
    if (!state.isPlaying) return;
    current += 0.25;
    if (current >= total) {
      current = total;
      clearInterval(demoTimer);
      nextTrack();
      return;
    }
    const pct = (current / total) * 100;
    fill.style.width = pct + '%';
    thumb.style.left = pct + '%';
    cur.textContent = fmtTime(current);
  }, 250);
}

function togglePlay() {
  const t = getCurrentTrack();
  if (!t) {
    // start first track of main playlist
    if (state.tracks.length) playTrackById(state.tracks[0].id);
    return;
  }
  if (t.url) {
    if (state.isPlaying) {
      audio.pause();
      state.isPlaying = false;
    } else {
      audio.play();
      state.isPlaying = true;
    }
  } else {
    state.isPlaying = !state.isPlaying;
    if (!state.isPlaying) clearInterval(demoTimer);
    else startDemoProgress(t.duration || 180);
  }
  renderAll();
}

function nextTrack() {
  if (!state.queue.length) return;
  if (state.shuffle) {
    state.currentIndex = Math.floor(Math.random() * state.queue.length);
  } else {
    state.currentIndex = (state.currentIndex + 1) % state.queue.length;
  }
  loadAndPlay(state.queue[state.currentIndex]);
}

function prevTrack() {
  if (!state.queue.length) return;
  if (audio.currentTime > 3 || (!audio.src && document.getElementById('time-current').textContent !== '0:00')) {
    if (audio.src) audio.currentTime = 0;
    else {
      // reset demo
      const t = getCurrentTrack();
      if (t) startDemoProgress(t.duration);
    }
    return;
  }
  state.currentIndex = (state.currentIndex - 1 + state.queue.length) % state.queue.length;
  loadAndPlay(state.queue[state.currentIndex]);
}

// Real audio events
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-thumb').style.left = pct + '%';
  document.getElementById('time-current').textContent = fmtTime(audio.currentTime);
  document.getElementById('time-total').textContent = fmtTime(audio.duration);
});
audio.addEventListener('ended', () => {
  if (state.repeat === 'one') {
    audio.currentTime = 0;
    audio.play();
  } else nextTrack();
});
audio.addEventListener('play', () => { state.isPlaying = true; renderAll(); });
audio.addEventListener('pause', () => { state.isPlaying = false; renderAll(); });

// Progress seek
document.getElementById('progress-bar').addEventListener('click', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const t = getCurrentTrack();
  if (audio.src && audio.duration) {
    audio.currentTime = pct * audio.duration;
  } else if (t) {
    // demo seek not fully implemented; restart approx
    clearInterval(demoTimer);
    startDemoProgress(t.duration);
  }
});

// Volume
document.getElementById('volume').addEventListener('input', (e) => {
  state.volume = parseFloat(e.target.value);
  audio.volume = state.volume;
});
document.getElementById('mute-btn').addEventListener('click', () => {
  if (audio.volume > 0) {
    audio.dataset.prevVol = audio.volume;
    audio.volume = 0;
    document.getElementById('volume').value = 0;
    document.getElementById('mute-btn').textContent = '🔇';
  } else {
    audio.volume = parseFloat(audio.dataset.prevVol || 0.8);
    document.getElementById('volume').value = audio.volume;
    document.getElementById('mute-btn').textContent = '🔊';
  }
});

// ---------- Local files ----------
document.getElementById('add-local-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});
document.getElementById('file-input').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(file.name)) continue;
    const url = URL.createObjectURL(file);
    const id = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    // Try to get duration
    let duration = 0;
    try {
      duration = await getAudioDuration(url);
    } catch (_) {}
    const track = {
      id,
      title: file.name.replace(/\.[^.]+$/, ''),
      artist: 'Local File',
      album: 'Local Library',
      duration,
      cover: COVER,
      source: 'local',
      url,
      file
    };
    state.localTracks.unshift(track);
    state.tracks.push(track); // also surface in main for demo
    added++;
  }
  e.target.value = '';
  renderAll();
  toast(`Added ${added} local track${added !== 1 ? 's' : ''}`);
  // auto switch to library
  switchView('library');
});

function getAudioDuration(url) {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => resolve(a.duration);
    a.onerror = reject;
    a.src = url;
  });
}

// Drag & drop whole window
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
  document.body.addEventListener(ev, e => {
    e.preventDefault();
    e.stopPropagation();
  });
});
document.body.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files || []).filter(f =>
    f.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name)
  );
  if (!files.length) return;
  // reuse the input handler logic via DataTransfer simulation
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  const input = document.getElementById('file-input');
  input.files = dt.files;
  input.dispatchEvent(new Event('change'));
});

// ---------- Connect platforms (simulated) ----------
let pendingSource = null;
document.querySelectorAll('.source-item[data-source]').forEach(el => {
  el.addEventListener('click', () => {
    const src = el.dataset.source;
    if (src === 'local') return;
    pendingSource = src;
    document.getElementById('modal-title').textContent = `Connect ${src.charAt(0).toUpperCase() + src.slice(1)}`;
    document.getElementById('modal-body').innerHTML =
      `In production this would open the official OAuth / Web Playback flow for <strong>${src}</strong>.` +
      `<br><br>For this prototype we simulate a successful connection and mark the source as available. Local file playback already works fully offline via the File API.`;
    document.getElementById('modal').classList.remove('hidden');
  });
});
document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
  pendingSource = null;
});
document.getElementById('modal-confirm').addEventListener('click', () => {
  if (pendingSource) {
    state.connected[pendingSource] = true;
    const el = document.querySelector(`.source-item[data-source="${pendingSource}"]`);
    if (el) {
      el.classList.add('connected');
      el.querySelector('.badge').textContent = 'ON';
    }
    toast(`${pendingSource} connected (demo)`);
  }
  document.getElementById('modal').classList.add('hidden');
  pendingSource = null;
});

// ---------- Navigation ----------
function switchView(name) {
  state.view = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === name);
  });
  document.getElementById('sidebar').classList.remove('open');
}
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Search
document.getElementById('search-input').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  switchView('search');
  const all = [...state.tracks, ...state.localTracks];
  const unique = Array.from(new Map(all.map(t => [t.id, t])).values());
  const hits = unique.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    (t.album || '').toLowerCase().includes(q)
  );
  renderTrackList(document.getElementById('search-results'), hits);
});

// Controls
document.getElementById('play-pause').addEventListener('click', togglePlay);
document.getElementById('play-playlist').addEventListener('click', () => {
  if (state.tracks.length) playTrackById(state.tracks[0].id, state.tracks);
});
document.getElementById('next-btn').addEventListener('click', nextTrack);
document.getElementById('prev-btn').addEventListener('click', prevTrack);
document.getElementById('shuffle-toggle').addEventListener('click', () => {
  state.shuffle = !state.shuffle;
  document.getElementById('shuffle-toggle').classList.toggle('active', state.shuffle);
  toast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
});
document.getElementById('shuffle-btn').addEventListener('click', () => {
  state.shuffle = true;
  if (state.tracks.length) {
    const idx = Math.floor(Math.random() * state.tracks.length);
    playTrackById(state.tracks[idx].id, state.tracks);
  }
});
document.getElementById('repeat-btn').addEventListener('click', () => {
  state.repeat = state.repeat === false ? 'all' : state.repeat === 'all' ? 'one' : false;
  toast(state.repeat === 'one' ? 'Repeat one' : state.repeat === 'all' ? 'Repeat all' : 'Repeat off');
  renderAll();
});
document.getElementById('like-btn').addEventListener('click', () => {
  const t = getCurrentTrack();
  if (t) toggleLike(t.id);
  renderAll();
});

function toggleLike(id) {
  if (state.liked.has(id)) state.liked.delete(id);
  else state.liked.add(id);
  const btn = document.getElementById('like-btn');
  const t = getCurrentTrack();
  if (t && t.id === id) {
    btn.classList.toggle('liked', state.liked.has(id));
    btn.textContent = state.liked.has(id) ? '♥' : '♡';
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight') nextTrack();
  if (e.code === 'ArrowLeft') prevTrack();
});

// Init
renderAll();
console.log('%cSparx Media ready', 'color:#1ed760;font-weight:bold');
console.log('Drop audio files anywhere or use "+ Add Local Music". Demo tracks show UI only.');
