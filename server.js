// UNO Flip · No Mercy — game server.
// Serves index.html and runs every match on the server, so all players see the same table
// and anyone can drop out and rejoin a live match in their own seat.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Game, Bot, serialize, cardCode } = require('./engine.js');

const PORT = process.env.PORT || 3000;
const MAX_SEATS = 6;
const AWAY_SKIP_MS = 15000;   // a disconnected player's turn is skipped after this
const IDLE_SKIP_MS = 60000;   // a connected but idle player's turn is skipped after this
const ROOM_TTL_MS = 30 * 60 * 1000; // empty rooms are removed after this
const DROP_OUT_MS = 60000;    // a player disconnected this long is out of the match (others play on)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const EXTRA = ['mirror', 'shield', 'dflip', 'wd15', 'bhole', 'mul2', 'mul3', 'lucky', 'glass', 'devil', 'spin', 'loan', 'gift', 'echo', 'freeze', 'interest', 'sacrifice', 'wheel', 'bomb'];
const RULE_KEYS = ['flip', 'stacking', 'multi', 'combos', 'drawUntil', 'seven', 'zero', 'jumpIn', 'uno', 'chaos'];
const BOT_NAMES = ['Glitch', 'Turbo', 'Vex', 'Nova', 'Byte', 'Rusty', 'Pixel', 'Zap', 'Hex', 'Static'];

const clean = s => String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g, '').trim().slice(0, 14);
const validToken = t => typeof t === 'string' && /^[a-z0-9]{12,40}$/.test(t);

// ---------- http: the page itself ----------
const PAGE = path.join(__dirname, 'index.html');
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/' || url === '/index.html') {
    fs.readFile(PAGE, (err, buf) => {
      if (err) { res.writeHead(500); res.end('index.html missing'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      res.end(buf);
    });
    return;
  }
  if (url.startsWith('/assets/')) { serveAsset(url, res); return; }
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
function serveAsset(url, res) {
  let rel; try { rel = decodeURIComponent(url.slice('/assets/'.length)); } catch (e) { res.writeHead(400); res.end(); return; }
  if (rel === 'manifest.json' && !fs.existsSync(path.join(ASSET_DIR, 'manifest.json'))) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' }); res.end(JSON.stringify(buildManifest())); return;
  }
  const file = path.normalize(path.join(ASSET_DIR, rel));
  if (!file.startsWith(ASSET_DIR + path.sep)) { res.writeHead(403); res.end(); return; }
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type) { res.writeHead(404); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' }); res.end(buf);
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
    rules: { flip: true, stacking: true, multi: true, combos: true, drawUntil: true, seven: true, zero: true, jumpIn: true, uno: true, chaos: true },
    cards: Object.fromEntries(EXTRA.map(k => [k, true])),
    G: null, seats: [], timer: null, emptySince: null
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
    live: !!(room.G && room.G.winner === null),
    rules: room.rules, cards: room.cards,
    host: viewer === room.host
  };
}
function send(ws, obj) { if (ws && ws.readyState === 1) try { ws.send(JSON.stringify(obj)); } catch (e) {} }
function sync(room) {
  // mark who is connected, so seats show "away"
  if (room.G) room.seats.forEach((t, i) => { const m = room.members.get(t); room.G.players[i].away = !(m && online(m)); });
  for (const m of room.members.values()) {
    if (m.bot || !online(m)) continue;
    const seat = room.G ? seatOf(room, m.token) : null;
    if (room.G && seat !== null) {
      const st = serialize(room.G, seat, 12);
      st.aw = room.G.players.map(p => (p.away ? 1 : 0));
      send(m.ws, { t: 'state', code: room.code, seat, host: m.token === room.host, st, lobby: lobbyFor(room, m.token) });
    } else send(m.ws, { t: 'lobby', lobby: lobbyFor(room, m.token) });
  }
  armTimer(room);
  armBots(room);
}
// skip the turn of someone who is away or idle, so the table never freezes
function armTimer(room) {
  clearTimeout(room.timer); room.timer = null;
  const G = room.G; if (!G || G.winner !== null) return;
  const pi = G.roulette !== null ? G.roulette : G.turn;
  const m = room.members.get(room.seats[pi]);
  if (m && m.bot) return; // bots act on their own clock
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
  const G = room.G; if (!G || G.winner !== null) return;
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
  // owed cards first (UNO penalty, chaos tax, lost duel)
  for (let i = 0; i < G.players.length; i++) if (isBot(i) && G.owes(i)) return { wait: rnd(160, 260), run: () => G.draw(i) };
  if (G.roulette !== null && isBot(G.roulette)) { const v = G.roulette; return { wait: rnd(700, 1100), run: () => G.resolveRoulette(Bot.bestColor(G, G.players[v].hand, G.side)) }; }
  if (G.debt && isBot(G.debt.pi)) { const v = G.debt.pi; return { wait: rnd(140, 240), run: () => G.draw(v) }; }
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
  room.G = new Game(names, names.map((_, i) => i), Object.assign({}, room.rules, { cards: Object.assign({}, room.cards), mercy: 0 }));
  room.seats = players.map(m => m.token);
  return null;
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
    case 'uno': G.callUno(pi); break;
    case 'catch': if (target !== null) G.catchUno(pi, target); break;
    case 'roul': if (G.roulette === pi) G.resolveRoulette(col); break;
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
    case 'settings': {
      if (!isHost || (room.G && room.G.winner === null)) return;
      if (msg.rules && typeof msg.rules === 'object') for (const k of RULE_KEYS) if (k in msg.rules) room.rules[k] = !!msg.rules[k];
      if (msg.cards && typeof msg.cards === 'object') for (const k of EXTRA) if (k in msg.cards) room.cards[k] = !!msg.cards[k];
      sync(room); return;
    }
    case 'start': {
      if (!isHost || (room.G && room.G.winner === null)) return;
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
      if (!isHost || (room.G && room.G.winner === null)) return;
      room.G = null; room.seats = []; sync(room); return;
    }
    case 'act': {
      const seat = seatOf(room, m.token);
      if (!room.G || seat === null || room.G.winner !== null) return;
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
    if (room.G && room.G.winner === null) {
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

server.listen(PORT, () => console.log(`UNO Flip · No Mercy listening on :${PORT}`));
