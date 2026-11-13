// UNO Flip · No Mercy — game server.
// Serves index.html and runs every match on the server, so all players see the same table
// and anyone can drop out and rejoin a live match in their own seat.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Game, serialize, cardCode } = require('./engine.js');

const PORT = process.env.PORT || 3000;
const MAX_SEATS = 6;
const AWAY_SKIP_MS = 15000;   // a disconnected player's turn is skipped after this
const IDLE_SKIP_MS = 60000;   // a connected but idle player's turn is skipped after this
const ROOM_TTL_MS = 30 * 60 * 1000; // empty rooms are removed after this
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const EXTRA = ['mirror', 'shield', 'dflip', 'duel', 'wd15', 'bhole'];
const RULE_KEYS = ['flip', 'stacking', 'multi', 'drawUntil', 'seven', 'zero', 'jumpIn', 'uno'];

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
  res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found');
});

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
    rules: { flip: true, stacking: true, multi: true, drawUntil: true, seven: true, zero: true, jumpIn: true, uno: true },
    cards: Object.fromEntries(EXTRA.map(k => [k, true])),
    G: null, seats: [], timer: null, emptySince: null
  };
  rooms.set(room.code, room);
  return room;
}
const online = m => !!(m.ws && m.ws.readyState === 1);
function seatOf(room, token) { const i = room.seats.indexOf(token); return i < 0 ? null : i; }
function lobbyFor(room, viewer) {
  const list = room.order.map(t => room.members.get(t)).filter(Boolean);
  return {
    code: room.code,
    players: list.map(m => [m.name, online(m) ? 1 : 0, m.token === room.host ? 1 : 0, m.token === viewer ? 1 : 0]),
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
    if (!online(m)) continue;
    const seat = room.G ? seatOf(room, m.token) : null;
    if (room.G && seat !== null) {
      const st = serialize(room.G, seat, 12);
      st.aw = room.G.players.map(p => (p.away ? 1 : 0));
      send(m.ws, { t: 'state', code: room.code, seat, host: m.token === room.host, st, lobby: lobbyFor(room, m.token) });
    } else send(m.ws, { t: 'lobby', lobby: lobbyFor(room, m.token) });
  }
  armTimer(room);
}
// skip the turn of someone who is away or idle, so the table never freezes
function armTimer(room) {
  clearTimeout(room.timer); room.timer = null;
  const G = room.G; if (!G || G.winner !== null) return;
  const pi = G.roulette !== null ? G.roulette : G.turn;
  const m = room.members.get(room.seats[pi]);
  const wait = m && online(m) ? IDLE_SKIP_MS : AWAY_SKIP_MS;
  const key = `${G.seq}:${G.turn}:${G.roulette}:${G.evSeq}`;
  room.timer = setTimeout(() => {
    if (room.G !== G || `${G.seq}:${G.turn}:${G.roulette}:${G.evSeq}` !== key) return;
    if (G.skipTurn(pi)) sync(room);
  }, wait);
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
    m.ws = null;
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
  ws.room = room.code; ws.token = token;
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
      // a seat in a live match is kept so the player can come back; in the lobby they are removed
      const live = room.G && room.G.winner === null && seatOf(room, m.token) !== null;
      m.ws = null; ws.room = null;
      if (!live) {
        room.members.delete(m.token); room.order = room.order.filter(t => t !== m.token);
        if (room.host === m.token && room.order.length) room.host = room.order[0];
      }
      send(ws, { t: 'left' });
      sync(room); return;
    }
  }
}
// the host role moves on if the host has been gone a while, so someone can always start the next round
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const anyOnline = [...room.members.values()].some(online);
    if (!anyOnline) { room.emptySince = room.emptySince || now; if (now - room.emptySince > ROOM_TTL_MS) { clearTimeout(room.timer); rooms.delete(code); } continue; }
    const host = room.members.get(room.host);
    if (!host || !online(host)) {
      host && (host.awaySince = host.awaySince || now);
      if (!host || now - host.awaySince > 20000) {
        const next = room.order.map(t => room.members.get(t)).find(online);
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
