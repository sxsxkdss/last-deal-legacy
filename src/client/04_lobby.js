// ================= START + LOBBY =================
function seg(el, opts, key, fmt, after) {
  el.innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button'); b.textContent = fmt ? fmt(o) : o;
    if (S[key] === o) b.className = 'on';
    b.onclick = () => { S[key] = o; SFX.play('click'); seg(el, opts, key, fmt, after); if (after) after(); };
    el.appendChild(b);
  }
}
// presets: one tap sets the whole table; the fine-tune list stays folded away
function presetOf(rules, cards) {
  for (const k of ['classic', 'den', 'mayhem']) {
    const P = PRESETS[k];
    if (RULE_ALL.every(r => !!rules[r] === P.rules[r]) && EXTRA_CARDS.every(c => (cards[c] !== false) === P.cards[c])) return k;
  }
  return 'custom';
}
const PRESET_T = { classic: ['presetClassic', 'presetClassicD'], den: ['presetDen', 'presetDenD'], mayhem: ['presetMayhem', 'presetMayhemD'] };
function drawMode() {
  $('lbMode').innerHTML = [['one', 'modeOne', 'modeOneD'], ['debt', 'modeDebt', 'modeDebtD']].map(([k, a, b]) => `<button class="preset ${S.mode === k ? 'on' : ''}" data-mode="${k}"><b>${t(a)}</b><span>${t(b)}</span></button>`).join('');
  $('lbLimitRow').classList.toggle('hidden', S.mode !== 'debt');
  $('lbLimit').innerHTML = [250, 500, 1000].map(v => `<button class="${S.limit === v ? 'on' : ''}" data-limit="${v}">${v}</button>`).join('');
}
const pushSettings = () => { saveSettings(); drawMode(); if (isHost) conn.send({ t: 'settings', rules: S.rules, cards: S.cards, mode: S.mode, limit: S.limit }); };
$('lbMode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; S.mode = b.dataset.mode; SFX.play('click'); pushSettings(); });
$('lbLimit').addEventListener('click', e => { const b = e.target.closest('[data-limit]'); if (!b) return; S.limit = +b.dataset.limit; SFX.play('click'); pushSettings(); });
function drawPresets() {
  const cur = presetOf(S.rules, S.cards);
  $('lbPresets').innerHTML = Object.keys(PRESET_T).map(k => `<button class="preset ${cur === k ? 'on' : ''}" data-preset="${k}"><b>${t(PRESET_T[k][0])}</b><span>${t(PRESET_T[k][1])}</span></button>`).join('');
  $('lbFineSum').textContent = t('fineTune') + (cur === 'custom' ? ' · ' + t('presetCustom') : '');
}
$('lbPresets').addEventListener('click', e => {
  const b = e.target.closest('[data-preset]'); if (!b) return;
  const P = PRESETS[b.dataset.preset];
  S.rules = Object.assign({}, S.rules, P.rules); S.cards = Object.assign({}, S.cards, P.cards);
  SFX.play('click'); saveSettings(); drawToggles();
  if (isHost) conn.send({ t: 'settings', rules: S.rules, cards: S.cards, mode: S.mode, limit: S.limit });
});
function drawToggles(dis) {
  const rules = RULES_L().map(([k, t, d]) => `<label class="opt"><input type="checkbox" data-rule="${k}" ${S.rules[k] ? 'checked' : ''}><div><b>${t}</b><span>${d}</span></div></label>`).join('');
  const cards = EXTRA_L().map(([k, t, d]) => `<label class="opt"><input type="checkbox" data-card="${k}" ${S.cards[k] ? 'checked' : ''}><div><b>${t}</b><span>${d}</span></div></label>`).join('');
  $('lbRules').innerHTML = rules; $('lbCards').innerHTML = cards;
  drawPresets(); drawMode();
}
drawToggles();
function onToggle(e) {
  const t = e.target; let hit = false;
  if (t.dataset.rule) { S.rules[t.dataset.rule] = t.checked; hit = true; }
  if (t.dataset.card) { S.cards[t.dataset.card] = t.checked; hit = true; }
  if (!hit) return;
  saveSettings(); drawPresets();
  if (isHost) conn.send({ t: 'settings', rules: S.rules, cards: S.cards, mode: S.mode, limit: S.limit });
}
for (const id of ['lbRules', 'lbCards']) $(id).addEventListener('change', onToggle);
$('pname').value = S.name;
$('btnCreate').onclick = createRoom;
$('btnJoin').onclick = () => joinRoom($('joinCode').value);
$('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('joinCode').value); });
document.querySelectorAll('[data-rules]').forEach(b => b.onclick = showRules);
$('btnSound').onclick = () => { S.sound = !S.sound; saveSettings(); setTimeout(() => AMB.apply(), 0); $('btnSound').textContent = S.sound ? t('soundOn') : t('soundOff'); if (S.sound) { SFX.init(); SFX.play('turn'); } };
function applyStatic() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $('btnSound').textContent = S.sound ? t('soundOn') : t('soundOff');
  $('btnFx').innerHTML = UI_ICON.gear + ' ' + esc(t('settings'));
  seg($('segLang'), Object.keys(LANGS), 'lang', k => LANGS[k], () => setLang(S.lang));
  drawToggles();
}
function setFx(m) { S.fx = m; saveSettings(); document.body.classList.toggle('lite', m !== 'full'); }
$('btnFx').onclick = showSettings;
function setLang(l) {
  if (!LANGS[l]) return;
  LANG = l; S.lang = l; saveSettings();
  applyStatic();
  if (lastLobby && !$('lobby').classList.contains('hidden')) renderLobby(lastLobby);
  if (G) { lastLogKey = ''; render(); }
}
applyStatic();
document.body.classList.toggle('lite', S.fx !== 'full');
ASSETS.load();
JUICE.startBg();
function readName() { S.name = cleanName($('pname').value) || 'Player'; saveSettings(); $('lbName').value = S.name; return S.name; }
function show(screen) { for (const id of ['start', 'lobby', 'game']) $(id).classList.toggle('hidden', id !== screen); if (screen !== 'game') document.body.classList.remove('dark'); }
function startMsg(t) { $('startMsg').textContent = t; }
function createRoom() { readName(); startMsg(t('connServer')); roomCode = ''; conn.open({ t: 'create', token: TOKEN, name: S.name, rules: S.rules, cards: S.cards, mode: S.mode, limit: S.limit }); }
function joinRoom(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { startMsg(t('enterCode')); return; }
  readName(); startMsg(t('connecting')); roomCode = code;
  conn.open({ t: 'join', code, token: TOKEN, name: S.name });
}
function leaveRoom() {
  conn.send({ t: 'leave' }); session.clear();
  setTimeout(() => conn.close(), 100);
  roomCode = ''; G = null; busy = false; lastGid = null; closeModal(); show('start'); setNet('');
}
$('btnLeave').onclick = leaveRoom;
let renameTimer;
$('lbName').addEventListener('input', () => {
  clearTimeout(renameTimer);
  renameTimer = setTimeout(() => {
    const nm = cleanName($('lbName').value); if (!nm || nm === S.name) return;
    S.name = nm; saveSettings(); $('pname').value = nm;
    conn.send({ t: 'rename', name: nm });
  }, 350);
});
$('btnRoomStart').onclick = () => conn.send({ t: 'start' });
$('btnAddBot').onclick = () => conn.send({ t: 'addbot' });
$('btnRmBot').onclick = () => conn.send({ t: 'rmbot' });
$('btnCopyLink').onclick = () => copyText($('shareLink').value, $('btnCopyLink'));
$('lbCode').onclick = () => copyText(roomCode, null);
function copyText(txt, btn) {
  try { navigator.clipboard.writeText(txt).then(() => { if (btn) { btn.textContent = t('copied'); setTimeout(() => btn.textContent = t('copyLink'), 1500); } else $('lbHint').textContent = t('codeCopied'); }, () => {}); } catch (e) {}
}
function renderLobby(l) {
  $('lbCode').textContent = l.code;
  $('shareLink').value = location.href.split('#')[0] + '#join-' + l.code;
  $('lbHint').textContent = l.host ? t('hintHost') : t('hintGuest');
  $('lbHost').classList.toggle('hidden', !l.host);
  $('lbGuest').classList.toggle('hidden', !!l.host);
  if (document.activeElement !== $('lbName')) $('lbName').value = S.name;
  $('lbSeats').innerHTML = l.players.map(([name, on, host, me, bot]) => `<div class="seatrow ${me ? 'me' : ''}"><span class="who"><span class="ini">${bot ? 'AI' : initials(name)}</span>${esc(name)}</span><span class="label ${bot ? 'bot' : ''}">${bot ? t('botTag') : host ? t('host') : t('player')}${on ? '' : ' · ' + t('away')}</span></div>`).join('');
  $('btnRmBot').disabled = !l.players.some(p => p[4]);
  if (l.host) {
    // the host's own toggles drive the room; keep them in step with what the server holds
    let changed = false;
    for (const k in l.rules) if (S.rules[k] !== l.rules[k]) { S.rules[k] = l.rules[k]; changed = true; }
    for (const k in l.cards) if (S.cards[k] !== l.cards[k]) { S.cards[k] = l.cards[k]; changed = true; }
    if (l.mode && (S.mode !== l.mode || S.limit !== l.limit)) { S.mode = l.mode; S.limit = l.limit; changed = true; }
    if (changed) { drawToggles(); saveSettings(); }
    const online = l.players.filter(p => p[1]).length;
    $('btnRoomStart').disabled = online < 2;
    $('lbWait').textContent = online < 2 ? t('needMore') : t('ready', Math.min(online, 6));
  } else {
    const row = (name, on) => `<div class="rv ${on ? '' : 'off'}"><span>${esc(name)}</span><span class="mono">${on ? t('on') : t('off')}</span></div>`;
    const pk = presetOf(l.rules, l.cards);
    $('lbRulesView').innerHTML = `<div class="rv"><span>${t('matchMode')}</span><span class="mono">${l.mode === 'one' ? t('modeOne') : t('modeDebt') + ' · ' + l.limit}</span></div><div class="rv"><span>${t('presets')}</span><span class="mono">${pk === 'custom' ? t('presetCustom') : t(PRESET_T[pk][0])}</span></div>`
      + `<details class="fine"><summary>${t('fineTune')}</summary>` + RULES_L().map(([k, t]) => row(t, !!l.rules[k])).join('') + EXTRA_L().map(([k, t]) => row(t, l.cards[k] !== false)).join('') + `</details>`;
    $('lbWait').textContent = l.live ? t('inProgress') : t('waitHost');
  }
}
function beginGameView() {
  lastHandIds = new Set(); busy = false; lastEvN = Math.max(0, G.evSeq - 1);
  show('game'); closeModal(); setNet('');
  tick();
}
// rejoin automatically after a refresh or a crash
(function resume() {
  const m = /^#join-([a-z0-9]{4})$/i.exec(location.hash || '');
  if (m) { $('joinCode').value = m[1].toUpperCase(); startMsg(t('enterName')); }
  const s = session.get();
  if (s && s.code && Date.now() - s.at < 6 * 3600 * 1000) { startMsg(t('rejoining', s.code)); roomCode = s.code; conn.open({ t: 'join', code: s.code, token: TOKEN, name: S.name }); }
})();

