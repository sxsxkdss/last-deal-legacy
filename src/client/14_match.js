// ================= DEBT MATCH: draft, settlement + shop, final =================
let overlayKey = '', draftSel = new Set();
const secsLeft = () => MATCH ? Math.max(0, Math.ceil((MATCH.until - Date.now()) / 1000)) : 0;
setInterval(() => { const el = document.getElementById('phaseClock'); if (el) el.textContent = t('secsLeft', secsLeft()); }, 500);
const TOKEN_T = id => [t('tok_' + id), t('tokD_' + id)];
function matchOverlay() {
  const M = MATCH; if (!M || !G) return;
  const rulesOpen = !$('modal').classList.contains('hidden') && $('modalBody').querySelector('#closeR');
  if (rulesOpen) return;
  if (M.phase === 'play') { if (overlayKey) { overlayKey = ''; closeModal(); } return; }
  // re-render only when something the dialog shows has changed
  const key = JSON.stringify([M.phase, M.round, M.passed, M.chips, M.debt, M.done, M.setup, M.hope, M.dark, M.inv, G.players[ME].hand.length, [...draftSel]]);
  if (key === overlayKey) return; overlayKey = key;
  modalNext = { mode: 'min', key: 'phase:' + M.phase + ':' + M.round };
  if (M.phase === 'draft') return drawDraft(M);
  if (M.phase === 'shop') return drawShop(M);
  if (M.phase === 'over') return drawOver(M);
}
function drawDraft(M) {
  if (M.col[ME]) return openModal(`<h2>${t('draftTitle')}</h2><p>${t('draftCol')}</p><p class="mono" id="phaseClock">${t('secsLeft', secsLeft())}</p>`);
  if (M.passed) return openModal(`<h2>${t('draftTitle')}</h2><p>${t('draftWait')}</p><p class="mono" id="phaseClock">${t('secsLeft', secsLeft())}</p>`);
  const hand = sortedHand(G.players[ME].hand), to = G.players[G.nextIdx(ME, 1)];
  for (const id of [...draftSel]) if (!hand.some(c => c.id === id)) draftSel.delete(id);
  openModal(`<h2>${t('draftTitle')} · ${t('roundN', M.round)}</h2><p>${t('draftSub', esc(to ? to.name : ''))}${hand.some(c => G.f(c).c === 'x') ? `<br><b class="badhint">${t('draftBadHint')}</b>` : ''}</p>
    <div class="pick draftpick">${hand.map(c => `<div class="slot">${faceHTML(G.f(c), G.side, draftSel.has(c.id) ? 'lead' : 'off', c.id)}</div>`).join('')}</div>
    <button class="btn primary wide" id="draftGo" ${draftSel.size === Math.min(2, hand.length) ? '' : 'disabled'}>${t('draftGo', draftSel.size)}</button>
    <p class="mono" id="phaseClock">${t('secsLeft', secsLeft())}</p>`);
  $('modalBody').querySelectorAll('.draftpick .card').forEach(el => el.onclick = () => {
    const id = +el.dataset.id || el.dataset.id; const c = hand.find(x => String(x.id) === String(el.dataset.id)); if (!c) return;
    if (draftSel.has(c.id)) draftSel.delete(c.id); else if (draftSel.size < 2) draftSel.add(c.id);
    SFX.play('click'); overlayKey = ''; matchOverlay();
  });
  $('draftGo').onclick = () => { const cards = hand.filter(c => draftSel.has(c.id)).map(cardCode); draftSel.clear(); SFX.play('play'); conn.send({ t: 'draft', cards }); };
}
// a small line of a player's debt after each deal, with the limit drawn across the top
function debtSpark(M, i) {
  const h = (M.hist || [])[i] || [0], lim = ((M.limits || [])[i] || M.limit), W = 84, H = 22;
  const top = Math.max(lim, ...h) * 1.05, x = k => h.length < 2 ? W : (k / (h.length - 1)) * W, y = v => H - (v / top) * H;
  const pts = h.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="-2 -2 ${W + 4} ${H + 4}" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(lim).toFixed(1)}" y2="${y(lim).toFixed(1)}" class="lim"/><polyline points="${pts}"/>${h.map((v, k) => `<circle cx="${x(k).toFixed(1)}" cy="${y(v).toFixed(1)}" r="1.6"/>`).join('')}</svg>`;
}
function settleTable(M) {
  const L = M.last; if (!L) return '';
  return `<div class="list settle">${L.rows.slice().sort((a, b) => M.debt[a.i] - M.debt[b.i]).map(r => `<div class="li ${L.out.includes(r.i) ? 'outrow' : ''}">
    <span>${debtSpark(M, r.i)}${esc(G.players[r.i].name)}${r.i === L.winner ? ` <b class="stampmini">${t('dealWon')}</b>` : ''}${L.out.includes(r.i) ? ` <b class="stampmini">${t('outCollector')}</b>` : ''}</span>
    <span class="mono">${(r.i === L.winner ? '—' : t('cardsN', r.cards)) + ` · ${t('turnDebt', r.turn || 0)} · ${t('handDebt', r.paid)}`} · ${t('debtTot', M.debt[r.i], (M.limits || [])[r.i] || M.limit)} · +${r.chips}¢</span></div>`).join('')}</div>`;
}
function drawShop(M) {
  const L = M.last, won = L && L.winner === ME;
  modalNext = Object.assign(modalNext || {}, { cls: 'shop', fit: true });
  const head = `<h2>${t('shopTitle', M.round)}</h2>${settleTable(M)}`;
  if (M.col[ME]) return openModal(head + `<p>${t('youCollector')}</p><p class="mono" id="phaseClock">${t('secsLeft', secsLeft())}</p>`);
  if (M.done[ME]) return openModal(head + `<p>${t('shopWait')}</p><p class="mono" id="phaseClock">${t('secsLeft', secsLeft())}</p>`);
  const chips = M.chips[ME], P = { token: 20, pay: 10, payAmount: 25, setup: 15, interest: 25, candle: 10, blood: 10 };
  const rivals = G.players.map((p, i) => i).filter(i => i !== ME && !M.col[i]);
  const mine = M.tokens[ME].map(id => `<div class="tok own"><b>${TOKEN_T(id)[0]}</b><span>${TOKEN_T(id)[1]}</span></div>`).join('');
  const offers = M.offers.map(id => `<button class="tok" data-tok="${id}" ${chips < P.token || M.tokens[ME].length >= 3 ? 'disabled' : ''}><b>${TOKEN_T(id)[0]}</b><span>${TOKEN_T(id)[1]}</span><i>${P.token}¢</i></button>`).join('');
  openModal(`<h2>${t('shopTitle', M.round)}</h2><div class="shopgrid"><div class="shopl">${settleTable(M)}
    <div class="wallet"><span>${t('walletChips', chips)}</span><span>${t('walletDebt', M.debt[ME], M.limit)}</span></div>
    <span class="label sublabel">${t('shopPay')}</span>
    <button class="btn" id="shopPay" ${chips < P.pay || M.debt[ME] <= 0 ? 'disabled' : ''}>${t('payBtn', P.pay, P.payAmount)}</button>
    </div><div class="shopr">
    ${M.hope ? `<span class="label sublabel">${t('shopVisitors')}</span><div class="goods">
      <button class="btn good light" id="buyCandle" ${chips < P.candle || M.hope[2] ? 'disabled' : ''}>${DEAL_ICON.candle}<span>${t('buyCandle', P.candle)}</span><i>${M.hope[2] ? '—' : pct(M.hope[0])}</i></button>
      <button class="btn good dark" id="buyBlood" ${chips < P.blood || M.hope[3] ? 'disabled' : ''}>${DEAL_ICON.blood}<span>${t('buyBlood', P.blood)}</span><i>${M.hope[3] ? '—' : pct(Math.min(100, M.hope[1]))}</i></button></div>` : ''}
    ${(M.dark || []).length || (M.inv && M.inv[ME] && M.inv[ME].length) ? `<span class="label sublabel">${t('darkShop')}</span>
      ${(M.dark || []).length ? `<div class="darkshop">${M.dark.map(id => `<button class="item buy" data-item="${id}" data-tipitem="${id}" ${chips < ITEM_PRICE[id] ? 'disabled' : ''}>${ITEM_ICON[id]}<b>${t('item_' + id)}</b><span>${t('itemD_' + id)}</span><i>${ITEM_PRICE[id]}¢</i></button>`).join('')}</div>` : ''}
      ${M.inv && M.inv[ME] && M.inv[ME].length ? `<p class="mono small">${t('invHave')}: ${M.inv[ME].map(id => t('item_' + id)).join(', ')}</p>` : ''}` : ''}
    <span class="label sublabel">${t('shopTricks')}</span>
    <div class="tricks">${rivals.map(i => `<div class="trick"><span>${esc(G.players[i].name)}${M.setup[i] ? ` · +${M.setup[i]}` : ''}</span>
      <button class="btn" data-trick="setup" data-t="${i}" ${chips < P.setup ? 'disabled' : ''}>${t('trickSetup', P.setup)}</button>
      <button class="btn" data-trick="interest" data-t="${i}" ${chips < P.interest ? 'disabled' : ''}>${t('trickInterest', P.interest)}</button></div>`).join('')}</div>
    </div></div>
    <button class="btn primary wide" id="shopDone">${t('shopDone')}</button>
    <p class="mono" id="phaseClock">${t('secsLeft', secsLeft())}</p>`);
  $('modalBody').querySelectorAll('[data-tok]').forEach(b => b.onclick = () => { SFX.play('coin'); conn.send({ t: 'shop', a: { k: 'token', id: b.dataset.tok } }); });
  $('modalBody').querySelectorAll('[data-item]').forEach(b => b.onclick = () => { SFX.play('coin'); conn.send({ t: 'shop', a: { k: 'item', id: b.dataset.item } }); });
  $('shopPay').onclick = () => { SFX.play('coin'); conn.send({ t: 'shop', a: { k: 'pay' } }); };
  if ($('buyCandle')) $('buyCandle').onclick = () => { SFX.play('coin'); conn.send({ t: 'shop', a: { k: 'candle' } }); };
  if ($('buyBlood')) $('buyBlood').onclick = () => { SFX.play('devil'); conn.send({ t: 'shop', a: { k: 'blood' } }); };
  $('modalBody').querySelectorAll('[data-trick]').forEach(b => b.onclick = () => { SFX.play('bad'); conn.send({ t: 'shop', a: { k: b.dataset.trick, target: +b.dataset.t } }); });
  $('shopDone').onclick = () => { SFX.play('click'); conn.send({ t: 'shop', a: { k: 'done' } }); };
}
function drawOver(M) {
  const champ = M.champ, won = champ === ME;
  const order = G.players.map((p, i) => i).sort((a, b) => (a === champ ? -1 : b === champ ? 1 : M.debt[a] - M.debt[b]));
  const controls = !isHost
    ? `<p style="margin:16px 0 0">${t('waitNext')}</p><button class="textlink" id="menu">${t('leaveRoom')}</button>`
    : `<button class="btn primary wide" id="again">${t('playAgain')}</button><button class="textlink" id="menu">${t('backLobby')}</button>`;
  openModal(`<h2>${won ? t('matchWon') : esc(t('matchWins', G.players[champ].name))}</h2><p>${t('matchOverSub', M.round)}</p>${settleTable(M)}
    <div class="list">${order.map((i, k) => `<div class="li"><span>${k + 1}. ${esc(G.players[i].name)}</span><span class="mono">${t('debtTot', M.debt[i], M.limit)}</span></div>`).join('')}</div>${controls}`);
  if ($('again')) $('again').onclick = () => { closeModal(); overlayKey = ''; conn.send({ t: 'start' }); };
  $('menu').onclick = () => { closeModal(); overlayKey = ''; if (isHost) conn.send({ t: 'tolobby' }); else leaveRoom(); };
}
$('btnColGive').onclick = async () => { if (!MATCH || MATCH.colUsed) return; const tg = await pickTarget(t('colGiveQ'), t('colGiveSub'), t('cancel')); if (tg === null) return; conn.send({ t: 'col', k: 'give', target: tg }); };
$('btnColLever').onclick = () => { if (!MATCH || MATCH.colUsed) return; SFX.play('chaos'); conn.send({ t: 'col', k: 'lever' }); };
function showRules() {
  modalNext = { onCancel: () => { if (MATCH) { overlayKey = ''; matchOverlay(); } else if (G && G.winner !== null) showEnd(); } };
  openModal(`<h2>${t('howTo')}</h2><div class="rulestext">${RULES_HTML[LANG]}</div><button class="btn primary wide" id="closeR">${t('close')}</button>`);
  $('closeR').onclick = () => { closeModal(); if (MATCH) { overlayKey = ''; matchOverlay(); } else if (G && G.winner !== null) showEnd(); };
}


