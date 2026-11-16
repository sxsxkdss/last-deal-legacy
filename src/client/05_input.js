// ================= ACTIONS + LOOP =================
function act(k, a = {}) { conn.send({ t: 'act', a: Object.assign({ k }, a) }); }
function tick() {
  render();
  if (!G) return;
  if (MATCH) { matchOverlay(); if (MATCH.phase !== 'play') return; }
  if (G.winner !== null) { if (!MATCH) setTimeout(showEnd, 1400); return; }
  if (G.roulette === ME && roulettePrompted !== G.seq && !busy) {
    roulettePrompted = G.seq; busy = true; rouletteOpen = true;
    pickColor(t('rouletteTitle'), t('rouletteSub'), G.side, true).then(c => { busy = false; rouletteOpen = false; act('roul', { color: c }); });
  }
  if (rouletteOpen && G.roulette !== ME) { rouletteOpen = false; busy = false; closeModal(); }
}

// ================= INPUT =================
function myTurnNow() { return !!(G && G.turn === ME && G.roulette === null && G.winner === null && G.players[ME] && !G.players[ME].out); }
// could this card go down right now (ignores whether a choice dialog is open)
function fits(card) { if (!G || G.winner !== null || (MATCH && MATCH.phase !== 'play') || !G.players[ME] || G.players[ME].out) return false; return myTurnNow() && G.canPlay(card); }
function usable(card) { return !busy && fits(card); }
async function useCard(card, el, fromRect, extrasIn) {
  if (!usable(card)) { if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } SFX.play('bad'); return; }
  const me = G.players[ME];
  let face = G.f(card), back = G.back(card);
  busy = true;
  let color = null, flipColor = null, target = null, extra = [];
  if (Array.isArray(extrasIn) && extrasIn.length) extra = extrasIn;
  const cancel = () => { busy = false; render(); };
  if (face.c === 'w' && face.v !== 'roul' && !(G.horseOn('plague', 'blank', ME) && !card.uniq)) { color = await pickColor(t('pickColor'), cardName(face), G.side); if (!color) return cancel(); }
  if ((face.v === 'flip' || face.v === 'dflip') && (back.c === 'w' || back.c === 'x')) { flipColor = await pickColor(t('flipWild'), t('flipWildSub', cardName(back)), G.side === 'L' ? 'D' : 'L'); if (!flipColor) return cancel(); }
  const keep = me.hand.length - 1 - extra.length;
  if (face.v === 'sacr' && G.active().length > 2) { target = await pickTarget(t('sacrQ'), t('sacrSub')); if (target === null) return cancel(); }
  if (face.v === 'gift' && G.active().length > 2) { target = await pickTarget(t('giftQ'), t('giftSub', Math.min(2 * (extra.length + 1), Math.max(0, keep)))); if (target === null) return cancel(); }
  busy = false;
  if (!G || !G.players[ME].hand.some(c => cardCode(c) === cardCode(card))) { tick(); return; }
  lastPlayRect = fromRect || rectOf(el);
  act('play', { card: cardCode(card), id: card.wid, color, flipColor, target, extra: extra.map(cardCode), extraIds: extra.map(c => c.wid) });
}
function overDiscard(x, y) { const r = rectOf($('discard')); return r && x > r.left - 40 && x < r.right + 40 && y > r.top - 40 && y < r.bottom + 40; }
// ---------- several cards at once: pick them in the hand (right click, Ctrl/Shift+click, or the Select button), then play ----------
let selIds = [], selMode = false;
const isNumF = f => /^\d$/.test(f.v) && f.c !== 'w';
function selCards() { const h = G && G.players[ME] ? G.players[ME].hand : []; return selIds.map(id => h.find(c => c.id === id)).filter(c => c && !c.lock); }
function toggleSel(card) {
  if (!G || !card || card.lock) return;
  if (!G.rules.multi) { toast(t('multiOff')); return; }
  const i = selIds.indexOf(card.id);
  if (i >= 0) selIds.splice(i, 1); else selIds.push(card.id);
  SFX.play('click'); render();
}
function clearSel() { if (selIds.length) { selIds = []; render(); } }
// what the picked cards make: a poker hand (numbers + one plain Wild), or cards of the same value; and which one leads
function selInfo(list) {
  const cards = list || selCards(), n = cards.length;
  if (!n) return null;
  const faces = cards.map(c => G.f(c));
  if (n === 1) return { cards, lead: cards[0], extra: [], ok: fits(cards[0]), kind: 'one' };
  let kind = null, cb = null;
  if (G.rules.combos !== false && faces.every(f => isNumF(f) || isJoker(f))) { cb = comboOf(faces); if (cb) kind = 'combo'; }
  if (!kind && faces.every(f => f.v === faces[0].v && (f.c === 'w') === (faces[0].c === 'w'))) kind = 'same';
  if (!kind) return { cards, ok: false, kind: 'none' };
  const lead = cards.find(c => fits(c) && (kind !== 'combo' || isNumF(G.f(c)) || isJoker(G.f(c))));
  if (!lead) return { cards, ok: false, kind, cb, why: 'lead' };
  return { cards, lead, extra: cards.filter(c => c !== lead), ok: true, kind, cb };
}
// the best poker hand you could lay down right now (for the hint)
function bestCombo(hand) {
  if (!G || G.rules.combos === false || !G.rules.multi) return null;
  let best = null, bestScore = -1;
  for (const cs of comboCands(hand, c => G.f(c))) {
    const cb = comboOf(cs.map(c => G.f(c))); if (!cb) continue;
    const sc = (cs.some(c => fits(c)) ? 10000 : 0) + comboWorth(cb, cs.length, G.side, 1) * 10 + COMBO_RANK.indexOf(cb.key);
    if (sc > bestScore) { bestScore = sc; best = { cards: cs, cb }; }
  }
  return best;
}
// every poker hand, always on view next to the log; the one your picked cards make lights up
// example hands for the reference, as mini cards: [value, colour slot 0..3]
const COMBO_EX = {
  five: [[7, 0], [7, 1], [7, 2], [7, 3], [7, 0]], straightflush: [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2]], rainbow: [[5, 0], [5, 1], [5, 2], [5, 3]],
  twothree: [[5, 0], [5, 1], [5, 3], [3, 2], [3, 0], [3, 1]], flush: [[1, 3], [4, 3], [6, 3], [8, 3], [9, 3]], four: [[5, 0], [5, 3], [5, 0], [5, 1]],
  cstraight: [[3, 1], [4, 1], [5, 1]], threepair: [[5, 0], [5, 2], [3, 1], [3, 3], [6, 0], [6, 1]], fullhouse: [[2, 0], [2, 1], [2, 3], [8, 2], [8, 0]],
  straight: [[3, 1], [4, 3], [5, 0], [6, 2], ['+', 1]], three: [[6, 0], [6, 2], [6, 3]], twopair: [[4, 1], [4, 3], [9, 0], [9, 2]], pair: [[7, 2], [7, 0]]
};
// what the runs pay depends on their length: shown as a formula
const COMBO_VAR = { straight: ['n−3', '(+1)', '−' + COMBOS.straight.r], cstraight: ['n−2', '', '−' + COMBOS.cstraight.r], straightflush: ['n−2', '+' + COMBOS.straightflush.m, '−' + COMBOS.straightflush.r] };
let comboRefKey = '';
function comboRefHTML(active) {
  const cols = SIDE_COLORS[G ? G.side : 'L'];
  const mini = k => COMBO_EX[k].map(([v, c]) => `<i class="mc c-${cols[c]}${v === '+' ? ' more' : ''}">${v === '+' ? '…' : v}</i>`).join('');
  const num = (n, cls) => n ? `<span class="${cls}">${n}</span>` : '<span class="nil">·</span>';
  const vr = (v, cls) => v ? `<span class="${cls}">${v}</span>` : '<span class="nil">·</span>';
  const rows = COMBO_RANK.slice().reverse().map(k => { const c = COMBOS[k], vv = COMBO_VAR[k];
    return `<div class="cr${k === active ? ' on' : ''}"><b class="cnm">${t('combo_' + k)}</b><span class="mcs">${mini(k)}</span>`
      + (vv ? vr(vv[0], 'toss') + vr(vv[1], 'hit') + vr(vv[2], 'debt')
        : `${num(c.d ? '−' + c.d : 0, 'toss')}${num(c.m ? '+' + c.m : 0, 'hit')}${num(c.r ? '−' + c.r : 0, 'debt')}`) + `</div>`; }).join('');
  return `<div class="crhead"><span class="label">${t('refTitle')}</span>${active ? `<span class="crnow">${t('combo_' + active)}</span>` : ''}</div>`
    + `<div class="cr crcols"><span>${t('refColHand')}</span><span></span><span title="${esc(t('refTossTip'))}">${t('refColToss')}</span><span title="${esc(t('refHitTip'))}">${t('refColHit')}</span><span title="${esc(t('refDebtTip'))}">${t('refColDebt')}</span></div>`
    + rows
    + `<div class="crfoot">${t('refShort')}</div>`;
}
function drawComboRef(active) {
  const el = $('comboRef'); if (!el || !G) return;
  const on = G.rules.combos !== false && G.rules.multi;
  const key = LANG + ':' + on + ':' + (active || '') + ':' + G.side;
  if (key === comboRefKey) return; comboRefKey = key;
  if (!on) { el.innerHTML = ''; el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = comboRefHTML(active);
}
function drawSelBar() {
  const bar = $('selBar'); if (!G || !G.players[ME]) { bar.classList.add('hidden'); return; }
  const me = G.players[ME];
  selIds = selIds.filter(id => me.hand.some(c => c.id === id && !c.lock));
  const info = selInfo(), myTurn = myTurnNow(), canGo = info && info.ok && myTurn && !busy;
  drawComboRef(info && info.kind === 'combo' ? info.cb.key : null);
  let html = '';
  // just the name of what the picked cards make; the buttons only in tap-to-pick mode (phones)
  if (info && info.cards.length > 1) {
    const name = info.kind === 'combo' ? t('combo_' + info.cb.key) : info.kind === 'same' ? t('togetherN', info.cards.length) : t('noCombo');
    html = `<b class="${info.ok ? '' : 'bad'}">${name}</b>${selMode ? `<button class="btn primary" id="selGo" ${canGo ? '' : 'disabled'}>${t('playN', info.cards.length)}</button><button class="btn quiet" id="selClear">${t('cancel')}</button>` : ''}`;
  } else if (info && selMode) {
    html = `<button class="btn primary" id="selGo" ${canGo ? '' : 'disabled'}>${t('playN', 1)}</button><button class="btn quiet" id="selClear">${t('cancel')}</button>`;
  }
  setHTML(bar, html); bar.classList.toggle('hidden', !html);
  if ($('selGo')) $('selGo').onclick = () => playSelection();
  if ($('selClear')) $('selClear').onclick = () => clearSel();
  if ($('selHint')) $('selHint').onclick = () => { const b = bestCombo(me.hand); if (b) { selIds = b.cards.map(c => c.id); SFX.play('click'); render(); } };
  // sit just above the hand, out of the layout flow
  // sits on the felt just above your strip, so it never covers the buttons or the cards
  // measured on the next frame, when the browser lays the page out anyway, not in the middle of render()
  if (html && !selBarRaf) selBarRaf = requestAnimationFrame(() => {
    selBarRaf = 0;
    const mr = $('bottom').querySelector('.me').getBoundingClientRect(), br = $('bottom').getBoundingClientRect();
    bar.style.top = (mr.top - br.top - 44) + 'px';
  });
}
let selBarRaf = 0;
function playSelection() {
  const info = selInfo(); if (!info || !info.ok || !myTurnNow()) { SFX.play('bad'); return false; }
  const el = $('hand').querySelector(`.card[data-id="${info.lead.id}"]`);
  selIds = []; useCard(info.lead, el, null, info.extra); return true;
}

// ---------- drag to reorder, Balatro style: the others slide apart to open a gap ----------
function slotRects(els) { return els.map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top }; }); }
function nearestSlot(rects, x, y, allowed) {
  let best = -1, bd = Infinity;
  rects.forEach((r, i) => { if (allowed && !allowed(i)) return; const d = Math.abs(r.x - x) + Math.abs(r.y - y) * 1.6; if (d < bd) { bd = d; best = i; } });
  return best;
}
// move element src to slot `to` (visually only), returns the new order of indices
function previewOrder(els, rects, src, to) {
  const order = els.map((_, i) => i); order.splice(src, 1); order.splice(to, 0, src);
  order.forEach((oi, ni) => { const e = els[oi]; const dx = rects[ni].l - rects[oi].l, dy = rects[ni].t - rects[oi].t; e.style.translate = (dx || dy) ? `${dx}px ${dy}px` : ''; });
  return order;
}
function clearPreview(els) { els.forEach(e => { e.style.translate = ''; }); }

