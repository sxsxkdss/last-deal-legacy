// ================= CONNECTION =================
// One WebSocket to the server. It reconnects by itself and puts you back in your room and seat.
const conn = {
  ws: null, want: null, retry: 0, timer: null, pingTimer: null, connected: false,
  url() { return SERVER_URL || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); },
  open(first) {
    this.want = first; clearTimeout(this.timer);
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) { if (this.ws.readyState === 1) this.send(first); return; }
    let ws;
    try { ws = new WebSocket(this.url()); } catch (e) { onNetError(t('cantReach')); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true; this.retry = 0; setNet('');
      if (this.want) ws.send(JSON.stringify(this.want));
      clearInterval(this.pingTimer); this.pingTimer = setInterval(() => this.send({ t: 'ping' }), 20000);
    };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onServer(m); };
    ws.onclose = () => {
      this.connected = false; clearInterval(this.pingTimer);
      if (!this.want) return;
      setNet(this.retry > 1 ? t('reconnecting') : t('connLost'));
      const wait = Math.min(8000, 500 * Math.pow(2, this.retry++));
      this.timer = setTimeout(() => this.open(this.rejoinMsg() || this.want), wait);
    };
    ws.onerror = () => {};
  },
  rejoinMsg() { return roomCode ? { t: 'join', code: roomCode, token: TOKEN, name: S.name } : null; },
  send(obj) { if (this.ws && this.ws.readyState === 1) try { this.ws.send(JSON.stringify(obj)); } catch (e) {} },
  close() { this.want = null; clearTimeout(this.timer); clearInterval(this.pingTimer); try { this.ws && this.ws.close(); } catch (e) {} this.ws = null; }
};
function setNet(t) { $('netTag').textContent = t || (roomCode ? STR[LANG].room(roomCode) : ''); $('netBanner').textContent = t; $('netBanner').classList.toggle('hidden', !t); }
function onNetError(t) { startMsg(t); }
function onServer(m) {
  switch (m.t) {
    case 'joined': roomCode = m.code; session.set(m.code); startMsg(''); setNet(''); break;
    case 'error':
      if (m.code === 'no-room') { session.clear(); roomCode = ''; conn.close(); show('start'); }
      { const txt = m.code === 'no-room' ? t('noRoom') : m.code === 'start' ? t('needMore') : m.code === 'bad' ? t('badReq') : m.msg;
        if ($('start').classList.contains('hidden')) $('lbWait').textContent = txt; else startMsg(txt); }
      break;
    case 'replaced': conn.close(); roomCode = ''; show('start'); startMsg(t('otherTab')); break;
    case 'left': break;
    case 'lobby': onLobby(m.lobby); break;
    case 'state': onState(m); break;
  }
}
function onLobby(l) {
  lastLobby = l; isHost = !!l.host;
  if (G) { G = null; MATCH = null; busy = false; rouletteOpen = false; closeModal(); }
  renderLobby(l);
  show('lobby');
}
let MATCH = null, lastHandHTML = '';
// the hand sways in 4-beat breaths when the room can hear the music's tempo
let swayDur = 0;
setInterval(() => {
  const bpm = JUICE.tempo && JUICE.tempo(), d = bpm ? (4 * 60 / bpm) : 3.6;
  if (Math.abs(d - swayDur) / (swayDur || 1) > 0.03) { swayDur = d; const h = document.getElementById('hand'); if (h) h.style.setProperty('--sway', d.toFixed(2) + 's'); }
}, 1500);
// write HTML only when it changed: keeps the DOM, hover state and running animations, and saves layout work
const setHTML = (el, html) => { if (el && el.__html !== html) { el.__html = html; el.innerHTML = html; return true; } return false; };
function onState(m) {
  let g; try { g = deserialize(m.st); } catch (e) { return; }
  isHost = !!m.host; lastLobby = m.lobby || lastLobby; away = m.st.aw || [];
  MATCH = m.match || null; if (MATCH) MATCH.until = Date.now() + (MATCH.left || 0);
  // keep card ids stable so only genuinely new cards animate in
  if (G && G.players[ME] && g.gid === lastGid && m.seat === ME) {
    const kOf = c => c.wid != null ? 'w' + c.wid : cardCode(c);
    const pool = {}; for (const c of G.players[ME].hand) (pool[kOf(c)] = pool[kOf(c)] || []).push(c.id);
    for (const c of g.players[m.seat].hand) { const l = pool[kOf(c)]; if (l && l.length) c.id = l.shift(); }
  }
  const fresh = g.gid !== lastGid || $('game').classList.contains('hidden');
  G = g; ME = m.seat; lastGid = g.gid;
  WID.clear(); if (g.players[ME]) for (const c of g.players[ME].hand) if (c.wid != null) WID.set(String(c.id), c.wid);
  if (fresh) beginGameView(); else tick();
}

