// ===== CLIENT: talks to the game server; the server runs every match =====
// When the page is hosted somewhere other than the server (for example GitHub Pages),
// put the server address here, e.g. 'wss://your-app.onrender.com/ws'. Leave empty when the server serves this page.
const SERVER_URL = '';
let ME = 0;
const RULES_L = () => RULES_I18N[LANG].filter(r => RULE_ALL.includes(r[0])), EXTRA_L = () => EXTRA_I18N[LANG].filter(r => EXTRA_CARDS.includes(r[0]));
const IDLE_MS = 60000, AWAY_MS = 15000;
const CVAR = { r: 'var(--r)', y: 'var(--y)', g: 'var(--g)', b: 'var(--b)', p: 'var(--p)', t: 'var(--t)', o: 'var(--o)', v: 'var(--v)' };
const S = loadSettings();
let G = null, busy = false, sortMode = 'color', lastHandIds = new Set();
let handOrder = []; // card ids in the order you dragged them (sortMode 'manual')
let lastLogKey = '', lastLogMsgs = [], lastEvN = 0, lastPlayRect = null, dragging = false, turnKey = '', turnStartedAt = 0;
let roomCode = '', isHost = false, lastLobby = null, lastGid = null, rouletteOpen = false, roulettePrompted = -1, away = [];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g, '').trim().slice(0, 14);

function loadSettings() {
  const d = { vol: 0.8, ambient: 'on', ambVol: 0.35, ytUrl: '', shake: true, bgMotion: true, tips: true, name: 'Player', sound: true, fx: ((window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 && (navigator.deviceMemory || 8) <= 4)) ? 'lite' : 'full', lang: LANG, rules: Object.assign({}, PRESETS.den.rules), cards: Object.assign({}, PRESETS.den.cards) };
  try {
    const s = JSON.parse(localStorage.getItem('unoFlipNoMercy') || 'null');
    if (s) {
      const r = Object.assign({}, s.rules || {});
      if ('sevenZero' in r) { if (!('seven' in r)) r.seven = r.sevenZero; if (!('zero' in r)) r.zero = r.sevenZero; delete r.sevenZero; }
      return Object.assign(d, { vol: typeof s.vol === 'number' ? s.vol : 0.8, ambient: s.ambient === 'off' ? 'off' : 'on', ambVol: typeof s.ambVol === 'number' ? s.ambVol : 0.35, ytUrl: typeof s.ytUrl === 'string' ? s.ytUrl : '', shake: s.shake !== false, musicFx: s.musicFx !== false, mode: s.mode === 'one' ? 'one' : 'debt', limit: [250, 500, 1000].includes(s.limit) ? s.limit : 500, bgMotion: s.bgMotion !== false, tips: s.tips !== false }, { name: s.name || d.name, sound: s.sound !== false, fx: s.fx === 'lite' ? 'lite' : (s.fx === 'full' ? 'full' : d.fx), lang: LANGS[s.lang] ? s.lang : d.lang, rules: Object.assign(d.rules, r), cards: Object.assign(d.cards, s.cards || {}) });
    }
  } catch (e) {}
  return d;
}
function saveSettings() { try { localStorage.setItem('unoFlipNoMercy', JSON.stringify(S)); } catch (e) {} }
// a private id for this browser: it is what lets you rejoin your seat
function myToken() {
  try {
    let t = localStorage.getItem('unoFlipNoMercy.token');
    if (!t || !/^[a-z0-9]{12,40}$/.test(t)) { t = Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(36)).join('').replace(/[^a-z0-9]/g, '').slice(0, 24).padEnd(16, '0'); localStorage.setItem('unoFlipNoMercy.token', t); }
    return t;
  } catch (e) { return window.__tok || (window.__tok = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)); }
}
const TOKEN = myToken();
const session = {
  get() { try { return JSON.parse(localStorage.getItem('unoFlipNoMercy.room') || 'null'); } catch (e) { return null; } },
  set(code) { try { localStorage.setItem('unoFlipNoMercy.room', JSON.stringify({ code, at: Date.now() })); } catch (e) {} },
  clear() { try { localStorage.removeItem('unoFlipNoMercy.room'); } catch (e) {} }
};


// chances on screen always carry one decimal: 10.0%, 2.5%
const pct = x => { const v = (+x || 0).toFixed(1) + '%'; return LANG === 'ru' ? v.replace('.', ',') : v; };
