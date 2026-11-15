// LAST DEAL — game server.
// Serves index.html and runs every match on the server, so all players see the same table
// and anyone can drop out and rejoin a live match in their own seat.
'use strict';
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Game, Bot, serialize, cardCode, PRESETS, debtValue, TOKENS, PRICES, DEBT_LIMITS, EXTRA_CARDS, hasDeal, canLight, canDark, LIGHT_DEALS, DARK_DEALS, DEBT_TURN, WAR_SECS } = require('./engine.js');

const PORT = process.env.PORT || 3000;
const MAX_SEATS = 6;
const AWAY_SKIP_MS = 15000;   // a disconnected player's turn is skipped after this
const IDLE_SKIP_MS = 60000;   // a connected but idle player's turn is skipped after this
const ROOM_TTL_MS = 30 * 60 * 1000; // empty rooms are removed after this
const DROP_OUT_MS = 60000;    // a player disconnected this long is out of the match (others play on)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const EXTRA = ['mirror', 'shield', 'dflip', 'wd15', 'mul2', 'mul3', 'lucky', 'glass', 'spin', 'loan', 'gift', 'echo', 'freeze', 'bomb', 'd6', 'pill', 'maze', 'deal'];
const RULE_KEYS = ['flip', 'stacking', 'multi', 'combos', 'gamble', 'lastCall', 'potato', 'drawUntil', 'uno', 'chaos'];
const BOT_NAMES = ['Glitch', 'Turbo', 'Vex', 'Nova', 'Byte', 'Rusty', 'Pixel', 'Zap', 'Hex', 'Static'];

const clean = s => String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g, '').trim().slice(0, 14);
const validToken = t => typeof t === 'string' && /^[a-z0-9]{12,40}$/.test(t);

// ---------- http: the page itself ----------
const PAGE = path.join(__dirname, 'index.html');
// the page is read once per change, gzipped once, and answered with 304 when the browser already has it
let pageCache = null;
function servePage(req, res) {
  fs.stat(PAGE, (err, st) => {
    if (err) { res.writeHead(500); res.end('index.html missing'); return; }
    const tag = `"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
    if (!pageCache || pageCache.tag !== tag) {
      const raw = fs.readFileSync(PAGE);
      pageCache = { tag, raw, gz: zlib.gzipSync(raw, { level: 9 }) };
    }
    const head = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', etag: tag, vary: 'accept-encoding' };
    if (req.headers['if-none-match'] === tag) { res.writeHead(304, head); res.end(); return; }
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) { res.writeHead(200, Object.assign(head, { 'content-encoding': 'gzip', 'content-length': pageCache.gz.length })); res.end(pageCache.gz); }
    else { res.writeHead(200, Object.assign(head, { 'content-length': pageCache.raw.length })); res.end(pageCache.raw); }
  });
}
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/' || url === '/index.html') { servePage(req, res); return; }
  if (url.startsWith('/assets/')) { serveAsset(url, res, req); return; }
  res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found');
});

// ---------- asset pack: drop files into ./assets and they replace the built-in cards, fonts and sounds ----------
const ASSET_DIR = path.join(__dirname, 'assets');
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.json': 'application/json' };
const IMG = ['.png', '.webp', '.gif', '.jpg', '.jpeg', '.svg'], FONT = ['.woff2', '.woff', '.ttf', '.otf'], SND = ['.ogg', '.mp3', '.wav', '.m4a'];
const list = dir => { try { return fs.readdirSync(path.join(ASSET_DIR, dir)).filter(f => !f.startsWith('.')); } catch (e) { return []; } };
// built fresh on every request, so new files show up after a page refresh, no restart needed
function buildManifest() {
  const ext = f => path.extname(f).toLowerCase();
  const m = { cards: list('cards').filter(f => IMG.includes(ext(f))), sounds: {}, font: {}, bg: null, config: {} };
  for (const f of list('sounds').filter(f => SND.includes(ext(f)))) {
    const name = path.basename(f, path.extname(f)).replace(/[-_]\d+$/, '').toLowerCase();
    (m.sounds[name] = m.sounds[name] || []).push(f);
  }
  for (const f of list('font').filter(f => FONT.includes(ext(f)))) {
    const base = path.basename(f, path.extname(f)).toLowerCase();
    if (base === 'ui' || base === 'display') { if (!m.font[base] || FONT.indexOf(ext(f)) < FONT.indexOf(ext(m.font[base]))) m.font[base] = f; }
  }
  const bg = list('').find(f => /^bg\./i.test(f) && IMG.includes(ext(f))); if (bg) m.bg = bg;
  try { m.config = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'pack.json'), 'utf8')); } catch (e) {}
  return m;
}
function serveAsset(url, res, req) {
  let rel; try { rel = decodeURIComponent(url.slice('/assets/'.length)); } catch (e) { res.writeHead(400); res.end(); return; }
  if (rel === 'manifest.json' && !fs.existsSync(path.join(ASSET_DIR, 'manifest.json'))) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' }); res.end(JSON.stringify(buildManifest())); return;
  }
  const file = path.normalize(path.join(ASSET_DIR, rel));
  if (!file.startsWith(ASSET_DIR + path.sep)) { res.writeHead(403); res.end(); return; }
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type) { res.writeHead(404); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    // revalidated with an ETag (304 when unchanged) and streamed with byte ranges, so the music loops
    // and seeks without the browser downloading the whole file again
    const tag = `"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
    const head = { 'content-type': type, 'cache-control': 'no-cache', etag: tag, 'accept-ranges': 'bytes' };
    if (req && req.headers['if-none-match'] === tag) { res.writeHead(304, head); res.end(); return; }
    const m = req && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let a = m[1] ? +m[1] : st.size - +m[2], b = m[1] && m[2] ? +m[2] : st.size - 1;
      if (isNaN(a) || a < 0 || a >= st.size || b < a) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); res.end(); return; }
      b = Math.min(b, st.size - 1);
      res.writeHead(206, Object.assign(head, { 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 }));
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
      return;
    }
    res.writeHead(200, Object.assign(head, { 'content-length': st.size }));
    fs.createReadStream(file).pipe(res);
  });
}

// ---------- rooms ----------
const rooms = new Map(); // code -> room
function newCode() {
  for (let k = 0; k < 1000; k++) {
    const c = Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
    if (!rooms.has(c)) return c;
  }
  throw new Error('no codes left');
}
function makeRoom(hostToken) {
  const room = {
    code: newCode(), host: hostToken, members: new Map(), order: [],
    rules: Object.assign({}, PRESETS.den.rules),
    cards: Object.assign({}, PRESETS.den.cards),
    G: null, seats: [], timer: null, emptySince: null,
    mode: 'debt', limit: 500, M: null
  };
  rooms.set(room.code, room);
  return room;
}
const online = m => !!(m && (m.bot || (m.ws && m.ws.readyState === 1)));
function seatOf(room, token) { const i = room.seats.indexOf(token); return i < 0 ? null : i; }
function lobbyFor(room, viewer) {
  const list = room.order.map(t => room.members.get(t)).filter(Boolean);
  return {
    code: room.code,
    players: list.map(m => [m.name, online(m) ? 1 : 0, m.token === room.host ? 1 : 0, m.token === viewer ? 1 : 0, m.bot ? 1 : 0]),
    live: !!(room.M ? room.M.phase !== 'over' : room.G && room.G.winner === null),
    rules: room.rules, cards: room.cards, mode: room.mode, limit: room.limit,
    host: viewer === room.host
  };
}
function send(ws, obj) { if (ws && ws.readyState === 1) try { ws.send(JSON.stringify(obj)); } catch (e) {} }
function sync(room) {
  const M = room.M;
  if (room.G && (!M || M.phase === 'play')) for (let k = 0; k < 8 && room.G.beginTurn(); k++);
  if (M && M.phase === 'play' && room.G && room.G.winner !== null) settle(room);
  // mark who is connected, so seats show "away"
  if (room.G) room.seats.forEach((t, i) => { const m = room.members.get(t); room.G.players[i].away = !(m && online(m)); });
  armTimer(room);
  for (const m of room.members.values()) {
    if (m.bot || !online(m)) continue;
    const seat = room.G ? seatOf(room, m.token) : null;
    if (room.G && seat !== null) {
      const st = serialize(room.G, seat, 12);
      st.aw = room.G.players.map(p => (p.away ? 1 : 0));
      send(m.ws, { t: 'state', code: room.code, seat, host: m.token === room.host, st, lobby: lobbyFor(room, m.token), match: matchFor(room, seat) });
    } else send(m.ws, { t: 'lobby', lobby: lobbyFor(room, m.token) });
  }
  armBots(room);
}
// skip the turn of someone who is away or idle, so the table never freezes
function armTimer(room) {
  clearTimeout(room.timer); room.timer = null;
  const G = room.G; if (!G || G.winner !== null || (room.M && room.M.phase !== 'play')) return;
  const pi = G.offer ? G.offer.pi : G.roulette !== null ? G.roulette : G.turn;
  const m = room.members.get(room.seats[pi]);
  // War (timer): a short clock on every human turn
  if (G.horseOn('war', 'timer') && !G.offer && G.roulette === null && !(m && m.bot)) {
    const wk = G.turnKey + ':' + G.turn;
    if (G.owes(G.turn) || room.warKey !== wk) { room.warKey = wk; room.warPi = G.turn; room.warAt = Date.now() + (WAR_SECS + 1) * 1000; }
    const at = room.warAt;
    room.timer = setTimeout(() => { if (room.G === G && room.warAt === at && room.warKey === wk && G.warTimeout(G.turn)) { room.warAt = 0; sync(room); } }, Math.max(0, at - Date.now()));
    return;
  }
  room.warAt = 0;
  if (m && m.bot) return; // bots act on their own clock
  if (G.offer) {
    const o = G.offer;
    room.timer = setTimeout(() => { if (room.G === G && G.offer === o) { G.resolveDeal(o.pi, o.kind === 'light' ? o.opts[0] : null, null); sync(room); } }, 45000);
    return;
  }
  const wait = m && online(m) ? IDLE_SKIP_MS : AWAY_SKIP_MS;
  const key = `${G.seq}:${G.turn}:${G.roulette}:${G.evSeq}`;
  room.timer = setTimeout(() => {
    if (room.G !== G || `${G.seq}:${G.turn}:${G.roulette}:${G.evSeq}` !== key) return;
    if (G.skipTurn(pi)) sync(room);
  }, wait);
}
// ---------- bots (for testing, or to fill seats) ----------
// One action per tick, so humans can follow along; the next tick is armed by sync().
function armBots(room) {
  clearTimeout(room.botTimer); room.botTimer = null;
  const G = room.G; if (!G || G.winner !== null || (room.M && room.M.phase !== 'play')) return;
  const job = nextBotJob(room); if (!job) return;
  room.botTimer = setTimeout(() => {
    if (room.G !== G || G.winner !== null) return;
    const j = nextBotJob(room); if (!j) return;
    try { j.run(); } catch (e) { console.error('bot error', e); }
    sync(room);
  }, job.wait);
}
function nextBotJob(room) {
  const G = room.G, isBot = i => { const m = room.members.get(room.seats[i]); return !!(m && m.bot) && !G.players[i].out; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  // bots catch humans who forgot to call UNO
  for (let i = 0; i < G.players.length; i++) {
    if (!isBot(i) && G.players[i].vulnerable && G.players[i].hand.length === 1) {
      const catcher = G.players.findIndex((p, k) => isBot(k));
      if (catcher >= 0) return { wait: rnd(1500, 2600), run: () => G.catchUno(catcher, i) };
    }
  }
  // cards anyone owes are drawn automatically and quickly, one at a time, so everybody sees each card land
  // (stack pickups and penalties). Drawing until a color shows up stays by hand.
  const pace = got => Math.max(70, 170 - (got || 0) * 8);
  for (let i = 0; i < G.players.length; i++) if (!isBot(i) && G.owes(i)) return { wait: pace(0), run: () => G.draw(i) };
  if (G.debt && G.debt.n && !isBot(G.debt.pi) && G.roulette === null) { const v = G.debt.pi, got = G.debt.got; return { wait: pace(got), run: () => G.draw(v) }; }
  // owed cards first (UNO penalty, chaos tax, lost duel)
  for (let i = 0; i < G.players.length; i++) if (isBot(i) && G.owes(i)) return { wait: rnd(160, 260), run: () => G.draw(i) };
  if (G.roulette !== null && isBot(G.roulette)) { const v = G.roulette; return { wait: rnd(700, 1100), run: () => G.resolveRoulette(Bot.bestColor(G, G.players[v].hand, G.side)) }; }
  if (G.debt && isBot(G.debt.pi)) { const v = G.debt.pi; return { wait: rnd(140, 240), run: () => G.draw(v) }; }
  if (G.offer) {
    if (!isBot(G.offer.pi)) return null; // a human is reading the contract
    const v = G.offer.pi; return { wait: rnd(1400, 2400), run: () => { const r = Bot.deal(G, v); if (r) G.resolveDeal(v, r.id, r.target); } };
  }
  const pi = G.turn;
  if (!isBot(pi)) {
    // now and then a bot slams an exact copy out of turn
    const j = Bot.jumpCandidate(G);
    if (j && isBot(j.pi) && Math.random() < 0.5) return { wait: rnd(900, 1800), run: () => botPlay(G, j.pi, j.card) };
    return null;
  }
  return { wait: rnd(650, 1150), run: () => {
    const p = G.players[pi], m = Bot.choose(G, pi);
    if (m) { if (p.hand.length - 1 - (m.extra || []).length <= 1 && Math.random() < 0.85) G.callUno(pi); G.play(pi, m.cardId, m); return; }
    if (G.drewBy === pi) { G.pass(pi); return; }
    if (G.canGamble(pi) && Math.random() < 0.4) { G.gamble(pi); return; }
    G.draw(pi);
  } };
}
function botPlay(G, pi, card) {
  const p = G.players[pi], f = G.f(card);
  const extra = G.rules.multi ? p.hand.filter(c => c !== card && G.f(c).v === f.v && (G.f(c).c === 'w') === (f.c === 'w')) : [];
  const rest = p.hand.filter(c => c !== card && !extra.includes(c));
  G.play(pi, card.id, { color: Bot.bestColor(G, rest, G.side), flipColor: Bot.bestColor(G, rest, G.side === 'L' ? 'D' : 'L'), extra: extra.map(c => c.id) });
}

function startGame(room) {
  const players = room.order.map(t => room.members.get(t)).filter(m => m && online(m)).slice(0, MAX_SEATS);
  if (players.length < 2) return 'Need at least 2 connected players.';
  const used = new Set();
  const names = players.map(m => { let n = m.name, k = 2; while (used.has(n)) n = m.name.slice(0, 11) + ' ' + k++; used.add(n); return n; });
  room.seats = players.map(m => m.token);
  room.M = null;
  if (room.mode === 'debt') {
    const n = names.length;
    room.M = { names, limit: room.limit, round: 0, phase: 'play', debt: Array(n).fill(0), chips: Array(n).fill(0), tokens: names.map(() => []),
      col: Array(n).fill(false), colUsed: Array(n).fill(false), setup: Array(n).fill(0), offers: names.map(() => []), done: Array(n).fill(false),
      pass: names.map(() => null), last: null, champ: null, deadline: 0,
      ds: names.map(() => ({ angel: 0, demon: 0, deals: [], fallen: false, markT: null })),
      carry: names.map(() => []), hist: names.map(() => [0]), horse: null, horseUsed: false };
    newDeal(room);
    return null;
  }
  room.G = new Game(names, names.map((_, i) => i), Object.assign({}, room.rules, { cards: Object.assign({}, room.cards), mercy: 0 }));
  return null;
}

// ================= DEBT MATCH =================
// draft -> deal -> settle (cards left = debt) -> shop -> next draft. Over the limit: you become the house's collector.
const DRAFT_MS = 30000, SHOP_MS = 45000;
const isBotSeat = (room, i) => { const m = room.members.get(room.seats[i]); return !!(m && m.bot); };
const alive = M => M.col.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
function matchFor(room, seat) {
  const M = room.M; if (!M) return null;
  return { round: M.round, limit: M.limit, phase: M.phase, left: Math.max(0, M.deadline - Date.now()), debt: M.debt, chips: M.chips, tokens: M.tokens,
    col: M.col, colUsed: seat !== null ? M.colUsed[seat] : true, setup: M.setup, offers: seat !== null ? M.offers[seat] : [], done: M.done,
    passed: seat !== null && !!M.pass[seat], last: M.last, champ: M.champ, limits: M.ds.map(d => d.limitAdj || M.limit), hist: M.hist,
    war: room.warAt && room.G && room.G.horseOn('war', 'timer') ? [room.warPi, Math.max(0, room.warAt - Date.now() - 1000)] : null,
    hope: seat !== null && M.ds[seat] ? [M.ds[seat].angel || 0, M.ds[seat].demon || 0, !canLight(M.ds[seat]), !canDark(M.ds[seat])] : null };
}
function phaseTimer(room, ms, fn) {
  clearTimeout(room.phaseTimer);
  room.M.deadline = Date.now() + ms;
  room.phaseTimer = setTimeout(() => { try { fn(); } catch (e) { console.error('phase', e); } }, ms);
}
function houseCard(G) { for (let k = 0; k < 80; k++) { const c = G.newCard(); if (EXTRA_CARDS.includes(c.L.v) || EXTRA_CARDS.includes(c.D.v)) return c; } return G.newCard(); }
function newDeal(room) {
  const M = room.M, n = M.names.length;
  M.round++;
  const deals = M.ds.map((d, i) => Object.assign({}, d, { debt: M.debt[i], limit: hasDeal(d, 'bail') && d.limitAdj ? d.limitAdj : M.limit }));
  if (process.env.HORSE_FORCE && !M.horseUsed) { const [k, v] = process.env.HORSE_FORCE.split(':'); M.horse = { k, v, left: 10, fresh: true, curses: M.names.map((_, i) => (process.env.CURSE || 'dark,fever,mirror,static').split(',')[i % 4]) }; M.horseUsed = true; }
  const G = new Game(M.names, M.names.map((_, i) => i), Object.assign({}, room.rules, { cards: Object.assign({}, room.cards), mercy: 0, deals, horse: M.horse, horseUsed: M.horseUsed }));
  for (let i = 0; i < n; i++) {
    const p = G.players[i];
    if (M.col[i]) { p.hand = []; p.out = true; p.elim = true; p.collector = true; continue; }
    for (let k = 0; k < M.setup[i]; k++) p.hand.push(G.newCard());
    for (const v of M.carry[i] || []) { const c = G.newCard(); c.L = { c: 'w', v }; c.D = { c: 'w', v }; c.uniq = true; p.hand.push(c); }
    M.carry[i] = [];
  }
  M.setup = Array(n).fill(0);
  if (G.players[G.turn].out) G.turn = G.nextIdx(G.turn, 1);
  G.turnNo = 0;
  room.G = G;
  M.colUsed = Array(n).fill(false); M.pass = M.names.map(() => null); M.done = Array(n).fill(false);
  M.phase = 'draft';
  // bots pass two cards they need least: numbers of their thinnest colour
  for (const i of alive(M)) if (isBotSeat(room, i)) setTimeout(() => { if (room.M === M && M.phase === 'draft' && !M.pass[i]) { M.pass[i] = botPass(G, i); maybeEndDraft(room); } }, 1200 + Math.random() * 2500);
  phaseTimer(room, DRAFT_MS, () => endDraft(room));
  // bot collectors strike once, somewhere in the deal
  for (let i = 0; i < n; i++) if (M.col[i] && isBotSeat(room, i)) setTimeout(() => { if (room.M === M && room.G === G && M.phase === 'play' && G.winner === null && !M.colUsed[i]) { collector(room, i, Math.random() < 0.6 ? 'give' : 'lever', null); sync(room); } }, 25000 + Math.random() * 50000);
}
function botPass(G, i) {
  const h = G.players[i].hand.slice();
  const cnt = {}; for (const c of h) { const f = G.f(c); cnt[f.c] = (cnt[f.c] || 0) + 1; }
  h.sort((a, b) => { const fa = G.f(a), fb = G.f(b); const na = /^\d$/.test(fa.v) ? 0 : 1, nb = /^\d$/.test(fb.v) ? 0 : 1; return na - nb || (cnt[fa.c] || 0) - (cnt[fb.c] || 0); });
  return h.slice(0, 2);
}
function maybeEndDraft(room) { const M = room.M; if (alive(M).every(i => M.pass[i])) endDraft(room); else sync(room); }
function endDraft(room) {
  const M = room.M, G = room.G; if (!M || M.phase !== 'draft') return;
  const live = alive(M);
  for (const i of live) if (!M.pass[i]) M.pass[i] = G.players[i].hand.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  const give = live.map(i => ({ to: G.nextIdx(i, 1), cards: M.pass[i].filter(c => G.players[i].hand.includes(c)) }));
  live.forEach((i, k) => { G.players[i].hand = G.players[i].hand.filter(c => !give[k].cards.includes(c)); });
  for (const g of give) G.players[g.to].hand.push(...g.cards);
  for (const i of live) if (hasDeal(G.players[i], 'alms')) G.payDebt(i, -10, 'alms');
  G.addLog('Everyone passes two cards along. The deal begins.', 'n', 'draftDone', {});
  M.phase = 'play'; clearTimeout(room.phaseTimer); M.deadline = 0;
  sync(room);
}
function settle(room) {
  const M = room.M, G = room.G, live = alive(M);
  const rows = [];
  const paid = Array(M.names.length).fill(0), turnD = Array(M.names.length).fill(0);
  for (const i of live) {
    const p = G.players[i];
    turnD[i] = Math.max(0, (p.debt || 0) - M.debt[i]);
    M.carry[i] = p.hand.filter(c => c.uniq).map(c => G.f(c).v);
    let vals = p.hand.filter(c => !c.uniq).map(c => debtValue(G.f(c)));
    if (hasDeal(p, 'grace')) vals = vals.sort((a, b) => b - a).slice(3);
    paid[i] = i === G.winner ? 0 : vals.reduce((a, b) => a + b, 0);
    if (hasDeal(p, 'rosary')) paid[i] = Math.round(paid[i] * 0.85);
  }
  const total = paid.reduce((a, b) => a + b, 0);
  for (const i of live) {
    const p = G.players[i];
    let chips = (G.chipsWon && G.chipsWon[i]) || 0;
    if (i === G.winner) chips += 5 + Math.round(total * 0.1);
    M.chips[i] += chips; M.debt[i] = (p.debt || 0) + paid[i];
    M.ds[i] = { angel: p.angel, demon: p.demon, deals: (p.deals || []).slice(), fallen: p.fallen, markT: p.markT, limitAdj: hasDeal(p, 'bail') ? p.limit : 0 };
    rows.push({ i, cards: p.hand.length, paid: paid[i], turn: turnD[i], chips });
    M.hist[i].push(M.debt[i]);
  }
  M.horse = G.horse && G.horse.left > 0 ? G.horse : null; M.horseUsed = !!G.horseUsed;
  const out = live.filter(i => M.debt[i] > (M.ds[i].limitAdj || M.limit));
  for (const i of out) M.col[i] = true;
  M.last = { round: M.round, winner: G.winner, rows, out };
  afterChange(room, () => openShop(room));
}
// the match ends when one player (or none) is left under the limit
function afterChange(room, next) {
  const M = room.M, live = alive(M);
  if (live.length <= 1) {
    M.phase = 'over'; clearTimeout(room.phaseTimer); M.deadline = 0;
    M.champ = live.length ? live[0] : M.debt.indexOf(Math.min(...M.debt));
    return;
  }
  next();
}
function openShop(room) {
  const M = room.M;
  M.phase = 'shop'; M.done = M.names.map((_, i) => !!M.col[i]);
  M.offers = M.names.map(() => []);
  for (const i of alive(M)) if (isBotSeat(room, i)) setTimeout(() => { if (room.M === M && M.phase === 'shop') { botShop(M, i); M.done[i] = true; maybeEndShop(room); } }, 2500 + Math.random() * 4000);
  phaseTimer(room, SHOP_MS, () => endShop(room));
}
function botShop(M, i) {
  while (M.offers[i].length && M.chips[i] >= PRICES.token && M.tokens[i].length < 3 && M.debt[i] < M.limit * 0.6) buy(M, i, { k: 'token', id: M.offers[i][0] });
  while (M.chips[i] >= PRICES.pay && M.debt[i] > 0) buy(M, i, { k: 'pay' });
}
function buy(M, i, a) {
  if (M.phase !== 'shop' || M.col[i] || M.done[i]) return false;
  if (a.k === 'token') {
    if (!M.offers[i].includes(a.id) || M.chips[i] < PRICES.token || M.tokens[i].length >= 3) return false;
    M.chips[i] -= PRICES.token; M.tokens[i].push(a.id); M.offers[i] = M.offers[i].filter(x => x !== a.id); return true;
  }
  if (a.k === 'pay') {
    if (M.chips[i] < PRICES.pay || M.debt[i] <= 0) return false;
    M.chips[i] -= PRICES.pay; M.debt[i] = Math.max(0, M.debt[i] - PRICES.payAmount); return true;
  }
  if (a.k === 'candle') {
    const d = M.ds[i]; if (M.chips[i] < PRICES.candle || !canLight(d)) return false;
    M.chips[i] -= PRICES.candle; d.angel = Math.min(100, (d.angel || 0) + 5); return true;
  }
  if (a.k === 'blood') {
    const d = M.ds[i]; if (M.chips[i] < PRICES.blood || !canDark(d)) return false;
    M.chips[i] -= PRICES.blood; d.demon = (d.demon || 0) + 10; return true;
  }
  if (a.k === 'setup' || a.k === 'interest') {
    const t = a.target;
    if (!Number.isInteger(t) || t === i || !M.names[t] || M.col[t] || M.chips[i] < PRICES[a.k]) return false;
    M.chips[i] -= PRICES[a.k];
    if (a.k === 'setup') M.setup[t] += 3; else M.debt[t] += Math.max(10, Math.ceil(M.debt[t] * 0.1));
    return true;
  }
  return false;
}
function maybeEndShop(room) { const M = room.M; if (M.done.every(Boolean)) endShop(room); else sync(room); }
function endShop(room) {
  const M = room.M; if (!M || M.phase !== 'shop') return;
  for (const i of alive(M)) if (M.debt[i] > (M.ds[i].limitAdj || M.limit)) { M.col[i] = true; M.last.out.push(i); }
  afterChange(room, () => newDeal(room));
  sync(room);
}
function collector(room, i, k, target) {
  const M = room.M, G = room.G;
  if (!M || !G || M.phase !== 'play' || G.winner !== null || !M.col[i] || M.colUsed[i]) return;
  if (k === 'give') {
    if (!Number.isInteger(target) || M.col[target] || G.players[target].out) { const l = alive(M).filter(j => !G.players[j].out); if (!l.length) return; target = l.reduce((a, b) => (G.players[b].hand.length < G.players[a].hand.length ? b : a)); }
    G.players[target].oweN = (G.players[target].oweN || 0) + 2;
    G.addLog(`The collector ${M.names[i]} slips ${M.names[target]} two cards.`, 'bad', 'colGive', { n: M.names[i], t: M.names[target] });
    G.ev('colgive', { pi: i, t: target });
  } else {
    G.addLog(`The collector ${M.names[i]} pulls the lever.`, 'n', 'colLever', { n: M.names[i] });
    G.rollChaos();
  }
  M.colUsed[i] = true; G.seq++;
}
function applyAct(G, pi, a) {
  if (!a || typeof a !== 'object') return;
  const target = Number.isInteger(a.target) && a.target >= 0 && a.target < G.players.length ? a.target : null;
  const col = typeof a.color === 'string' ? a.color : null, fcol = typeof a.flipColor === 'string' ? a.flipColor : null;
  switch (a.k) {
    case 'play': {
      if (typeof a.card !== 'string' || a.card.length !== 2) return;
      const hand = G.players[pi].hand, c = hand.find(x => cardCode(x) === a.card);
      if (!c) return;
      const used = new Set([c]), extra = [];
      if (Array.isArray(a.extra)) for (const code of a.extra.slice(0, 20)) {
        const x = hand.find(h => !used.has(h) && cardCode(h) === code);
        if (x) { used.add(x); extra.push(x.id); }
      }
      G.play(pi, c.id, { color: col, flipColor: fcol, target, extra });
      break;
    }
    case 'draw': G.draw(pi); break;
    case 'pass': G.pass(pi); break;
    case 'gamble': G.gamble(pi); break;
    case 'uno': G.callUno(pi); break;
    case 'catch': if (target !== null) G.catchUno(pi, target); break;
    case 'roul': if (G.roulette === pi) G.resolveRoulette(col); break;
    case 'deal': if (G.offer && G.offer.pi === pi) G.resolveDeal(pi, typeof a.id === 'string' ? a.id : null, target); break;
    case 'ability': {
      const hand = G.players[pi].hand, ids = [];
      if (Array.isArray(a.cards)) for (const code of a.cards.slice(0, 3)) { const c = hand.find(x => !ids.includes(x.id) && cardCode(x) === code); if (c) ids.push(c.id); }
      G.ability(pi, String(a.ab || ''), ids); break;
    }
  }
}

// ---------- websocket protocol ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });
wss.on('connection', ws => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    ws.alive = true;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;
    try { handle(ws, msg); } catch (e) { console.error('handle error', e); }
  });
  ws.on('close', () => {
    const room = ws.room && rooms.get(ws.room); if (!room) return;
    const m = room.members.get(ws.token); if (!m || m.ws !== ws) return;
    m.ws = null; m.offSince = Date.now();
    if (!room.G || room.G.winner !== null) { /* lobby: keep the seat briefly so a refresh doesn't lose it */ }
    sync(room);
  });
});
function attach(ws, room, token, name) {
  let m = room.members.get(token);
  if (m) {
    if (m.ws && m.ws !== ws) { send(m.ws, { t: 'replaced' }); try { m.ws.close(); } catch (e) {} }
    m.ws = ws;
    if (name && !seatOf(room, token)) m.name = name; // names lock once you are seated in a live match
  } else {
    m = { token, name: name || 'Player', ws };
    room.members.set(token, m); room.order.push(token);
  }
  ws.room = room.code; ws.token = token; m.offSince = null;
  room.emptySince = null;
  return m;
}
function handle(ws, msg) {
  if (msg.t === 'ping') { send(ws, { t: 'pong' }); return; }
  if (msg.t === 'create') {
    if (!validToken(msg.token)) return send(ws, { t: 'error', code: 'bad', msg: 'Bad request.' });
    const room = makeRoom(msg.token);
    if (msg.rules && typeof msg.rules === 'object') for (const k of RULE_KEYS) if (k in msg.rules) room.rules[k] = !!msg.rules[k];
    if (msg.cards && typeof msg.cards === 'object') for (const k of EXTRA) if (k in msg.cards) room.cards[k] = !!msg.cards[k];
    if (msg.mode === 'one' || msg.mode === 'debt') room.mode = msg.mode;
    if (DEBT_LIMITS.includes(msg.limit)) room.limit = msg.limit;
    attach(ws, room, msg.token, clean(msg.name) || 'Host');
    send(ws, { t: 'joined', code: room.code });
    sync(room);
    return;
  }
  if (msg.t === 'join') {
    const code = String(msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const room = rooms.get(code);
    if (!validToken(msg.token)) return send(ws, { t: 'error', code: 'bad', msg: 'Bad request.' });
    if (!room) return send(ws, { t: 'error', code: 'no-room', msg: 'No room with that code. It may have closed.' });
    attach(ws, room, msg.token, clean(msg.name));
    send(ws, { t: 'joined', code: room.code });
    sync(room);
    return;
  }
  const room = ws.room && rooms.get(ws.room); if (!room) return;
  const m = room.members.get(ws.token); if (!m || m.ws !== ws) return;
  const isHost = ws.token === room.host;
  switch (msg.t) {
    case 'rename': {
      const n = clean(msg.name); if (!n) return;
      m.name = n;
      const seat = seatOf(room, m.token);
      if (room.G && seat !== null && room.G.winner !== null) room.G.players[seat].name = n;
      sync(room); return;
    }
    case 'draft': {
      const M = room.M, seat = seatOf(room, m.token);
      if (!M || M.phase !== 'draft' || seat === null || M.col[seat] || M.pass[seat] || !Array.isArray(msg.cards)) return;
      const hand = room.G.players[seat].hand, pick = [];
      for (const code of msg.cards.slice(0, 2)) { const c = hand.find(x => !pick.includes(x) && cardCode(x) === code); if (c) pick.push(c); }
      if (pick.length !== Math.min(2, hand.length)) return;
      M.pass[seat] = pick; maybeEndDraft(room); return;
    }
    case 'shop': {
      const M = room.M, seat = seatOf(room, m.token);
      if (!M || seat === null || !msg.a || typeof msg.a !== 'object') return;
      if (msg.a.k === 'done') { if (M.phase === 'shop') { M.done[seat] = true; maybeEndShop(room); } return; }
      if (buy(M, seat, { k: msg.a.k, id: msg.a.id, target: msg.a.target })) sync(room);
      return;
    }
    case 'col': {
      const seat = seatOf(room, m.token); if (seat === null) return;
      collector(room, seat, msg.k === 'lever' ? 'lever' : 'give', Number.isInteger(msg.target) ? msg.target : null);
      sync(room); return;
    }
    case 'settings': {
      if (!isHost || (room.G && room.G.winner === null) || (room.M && room.M.phase !== 'over')) return;
      if (msg.mode === 'one' || msg.mode === 'debt') room.mode = msg.mode;
      if (DEBT_LIMITS.includes(msg.limit)) room.limit = msg.limit;
      if (msg.rules && typeof msg.rules === 'object') for (const k of RULE_KEYS) if (k in msg.rules) room.rules[k] = !!msg.rules[k];
      if (msg.cards && typeof msg.cards === 'object') for (const k of EXTRA) if (k in msg.cards) room.cards[k] = !!msg.cards[k];
      sync(room); return;
    }
    case 'start': {
      if (!isHost || (room.G && room.G.winner === null) || (room.M && room.M.phase !== 'over')) return;
      const err = startGame(room);
      if (err) send(ws, { t: 'error', code: 'start', msg: err });
      sync(room); return;
    }
    case 'addbot': {
      if (!isHost || (room.G && room.G.winner === null) || room.order.length >= 10) return;
      const used = new Set([...room.members.values()].map(x => x.name));
      const name = BOT_NAMES.find(n => !used.has(n)) || 'Bot ' + (room.order.length + 1);
      const token = 'bot' + crypto.randomBytes(8).toString('hex');
      room.members.set(token, { token, name, bot: true, ws: null }); room.order.push(token);
      sync(room); return;
    }
    case 'rmbot': {
      if (!isHost || (room.G && room.G.winner === null)) return;
      const t = [...room.order].reverse().find(x => room.members.get(x) && room.members.get(x).bot);
      if (t) { room.members.delete(t); room.order = room.order.filter(x => x !== t); }
      sync(room); return;
    }
    case 'tolobby': {
      if (!isHost || (room.G && room.G.winner === null && !(room.M && room.M.phase === 'over'))) return;
      if (room.M && room.M.phase !== 'over') return;
      clearTimeout(room.phaseTimer); room.G = null; room.M = null; room.seats = []; sync(room); return;
    }
    case 'act': {
      const seat = seatOf(room, m.token);
      if (!room.G || seat === null || room.G.winner !== null || (room.M && room.M.phase !== 'play')) return;
      applyAct(room.G, seat, msg.a);
      sync(room); return;
    }
    case 'leave': {
      // leaving a live match takes you out of it; everyone else keeps playing
      const seat = seatOf(room, m.token);
      if (room.G && room.G.winner === null && seat !== null) room.G.removePlayer(seat, 'left');
      m.ws = null; ws.room = null;
      room.members.delete(m.token); room.order = room.order.filter(t => t !== m.token);
      if (room.host === m.token && room.order.length) room.host = room.order[0];
      send(ws, { t: 'left' });
      sync(room); return;
    }
  }
}
// the host role moves on if the host has been gone a while, so someone can always start the next round
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    // disconnected for a full minute in a live match: out, so the others aren't held up
    if (room.G && room.G.winner === null && (!room.M || room.M.phase === 'play')) {
      let changed = false;
      room.seats.forEach((t, i) => {
        const m = room.members.get(t);
        if ((!m || (!online(m) && m.offSince && now - m.offSince > DROP_OUT_MS)) && !room.G.players[i].out) changed = room.G.removePlayer(i, 'away') || changed;
      });
      if (changed) sync(room);
    }
    const anyOnline = [...room.members.values()].some(m => !m.bot && online(m));
    if (!anyOnline) { room.emptySince = room.emptySince || now; clearTimeout(room.botTimer); if (now - room.emptySince > ROOM_TTL_MS) { clearTimeout(room.timer); rooms.delete(code); } continue; }
    const host = room.members.get(room.host);
    if (!host || !online(host)) {
      host && (host.awaySince = host.awaySince || now);
      if (!host || now - host.awaySince > 20000) {
        const next = room.order.map(t => room.members.get(t)).find(m => m && !m.bot && online(m));
        if (next) { room.host = next.token; if (host) host.awaySince = null; sync(room); }
      }
    } else host.awaySince = null;
  }
}, 5000);
// drop dead sockets (also keeps idle proxies from cutting live ones)
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; try { ws.ping(); } catch (e) {} }
}, 20000);

server.listen(PORT, () => console.log(`LAST DEAL listening on :${PORT}`));
