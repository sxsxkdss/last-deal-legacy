// stable little offsets per card on the pile, so it looks like a real heap
function pileSpot(i) { return { rot: ((i * 47) % 25) - 12, dx: ((i * 31) % 13) - 6, dy: ((i * 17) % 11) - 5 }; }
function discardHTML() {
  const codes = (G.pile && G.pile.length ? G.pile : [cardCode(G.top)]).slice(-5);
  const base = (G.pileN || codes.length) - codes.length;
  return codes.map((code, k) => {
    const card = codeCard(code), sp = pileSpot(base + k), top = k === codes.length - 1, w = String(code).length > 2 ? String(code).slice(3) : null;
    return faceHTML(card[G.side], G.side, top ? 'topc' : 'under', 'p' + (base + k), w != null ? w : top && G.top.wid != null ? G.top.wid : null).replace('style="', `style="--rot:${sp.rot}deg;--dx:${sp.dx}px;--dy:${sp.dy}px;transform:translate(${sp.dx}px,${sp.dy}px) rotate(${sp.rot}deg);z-index:${k};`);
  }).join('');
}
// Sizes render() needs (pile width, hand width, where the felt goes) are read after the browser has laid the page out,
// by a ResizeObserver, instead of in the middle of render(), where every read forced a full synchronous layout.
const LAY = { ready: false, discardW: 0, handW: 0 };
function measureLayout() {
  const d = $('discard'), h = $('hand'); if (!d || !h) return;
  LAY.discardW = parseFloat(getComputedStyle(d).width) || 0; LAY.handW = h.clientWidth;
  const tr = $('table').getBoundingClientRect(), hr = $('bottom').getBoundingClientRect(), orr = $('opps').getBoundingClientRect();
  const top = orr.top + orr.height * 0.55, bottom = hr.bottom - 6;
  JUICE.setTable({ x: tr.left + tr.width / 2, y: (top + bottom) / 2, w: tr.width / 2 - 8, h: (bottom - top) / 2 });
  LAY.ready = LAY.discardW > 0 && LAY.handW > 0;
}
let layRerender = 0;
const layObs = new ResizeObserver(() => {
  const was = [LAY.discardW, LAY.handW]; measureLayout();
  // the hand is sized from these numbers: if they moved, lay the hand out again (once per frame at most)
  if ((was[0] !== LAY.discardW || was[1] !== LAY.handW) && G && !layRerender) layRerender = requestAnimationFrame(() => { layRerender = 0; lastHandHTML = ''; render(); });
});
['discard', 'hand', 'table', 'bottom', 'opps'].forEach(id => { const el = $(id); if (el) layObs.observe(el); });
function render() {
  if (!G) return;
  const me = G.players[ME];
  document.body.classList.toggle('dark', G.side === 'D');
  const ob = otherSide();
  const tk = `${G.turn}:${G.roulette}:${G.seq}:${G.gid}`;
  if (tk !== turnKey) { const was = turnKey.split(':')[0]; turnKey = tk; turnStartedAt = Date.now(); if (myTurnNow()) { SFX.play('turn'); if (was !== String(ME)) toast(t('yourTurnStamp')); } }
  const elapsed = (Date.now() - turnStartedAt) / 1000;
  const cc = G.roulette !== null ? 'var(--muted)' : CVAR[G.color];
  document.documentElement.style.setProperty('--cc-now', cc);
  // seats
  const n0 = G.players.length, playOrder = [];
  for (let k = 1; k < n0; k++) playOrder.push((ME + k) % n0); // seats as they come after you, clockwise
  const upNext = G.winner === null ? (G.roulette !== null ? G.nextIdx(G.roulette, 1) : G.nextIdx(G.turn, 1)) : -1;
  const arrow = `<span class="sep">${G.dir === 1 ? '›' : '‹'}</span>`;
  const seatHTML = i => {
    const p = G.players[i];
    const n = p.hand.length, fanN = Math.min(n, 12);
    const fan = p.hand.slice(-fanN).map((c, k) => { const bf = c[ob] || { c: 'w' }; return `<i class="${ob} ${bf.c === 'w' ? 'w' : ''}" style="left:${k * 9}px;${bf.c !== 'w' ? `background:${CVAR[bf.c]}` : ''}"></i>`; }).join('');
    const turn = (G.roulette !== null ? G.roulette === i : G.turn === i) && G.winner === null;
    const tags = [];
    if (G.winner === i) tags.push(`<b>${t('tagWinner')}</b>`);
    if (p.shield) tags.push(`<b>${t('tagShield')}</b>`);
    if (p.loan > 0) tags.push(`<b class="next">${t('tagLoan', p.loan)}</b>`);
    if (p.left) tags.push(`<b>${t('tagLeft')}</b>`); else if (away[i]) tags.push(`<b>${t('tagAway')}</b>`);
    if (p.oweN > 0) tags.push(`<b>${t('tagOwes', p.oweN)}</b>`);
    if (i === upNext && !turn && !p.out) tags.push(`<b class="next">${t('tagNext')}</b>`);
    if (MATCH) {
      if (MATCH.col[i]) tags.unshift(`<b class="next">${t('tagCollector')}</b>`);
      else tags.unshift(`<b>${t('tagDebt', p.debt, p.limit || MATCH.limit)}</b>`, `${t('tagChips', MATCH.chips[i])}`);
    }
    if (!tags.length) tags.push(t('tagPlayer'));
    const limit = away[i] ? AWAY_MS : IDLE_MS;
    const timer = turn ? `<div class="timer" data-ts="${turnStartedAt}" style="animation-duration:${limit / 1000}s"></div>` : ''; // the delay is set once, below, so the seat markup stays the same all turn
    const dealRow = MATCH && !MATCH.col[i] ? dealBadges(p) : '';
    return `<div class="opp ${turn ? 'turn' : ''} ${p.out && G.winner !== i ? 'out' : ''} ${MATCH && MATCH.col[i] ? 'collector' : ''}" id="opp${i}">
      ${turn ? `<span class="turnflag">${t('tagTurn')}</span>` : ''}<div class="top"><span class="ini">${initials(p.name)}</span><span class="nm">${esc(p.name)}</span></div>
      <div class="fan">${fan}</div>
      <div class="meta"><span class="cnt">${n}</span><span class="tags">${tags.join(' · ')}</span></div>${dealRow}
      ${timer}
</div>`;
  };
  { const items = [{ key: 'a0', html: arrow }]; playOrder.forEach((i, k) => { items.push({ key: 'o' + i, html: seatHTML(i) }, { key: 'a' + (k + 1), html: arrow }); }); patchBlocks($('opps'), items);
    for (const tm of $('opps').querySelectorAll('.timer:not([data-set])')) { tm.dataset.set = 1; tm.style.animationDelay = -((Date.now() - +tm.dataset.ts) / 1000) + 's'; } }
  // piles: the draw pile shows the back of the next card (its other side)
  const nb = G.next && G.next[ob] ? G.next[ob] : { c: 'w', v: 'wild' };
  const back = me && hasDeal(me, 'sharp') && G.next && G.next[G.side] ? faceHTML(G.next[G.side], G.side, 'peek') : faceHTML(nb, ob);
  setHTML($('drawpile'), back + back + back);
  const myTurn = myTurnNow();
  $('bottom').classList.toggle('myturn', myTurn && !me.out && G.winner === null);
  const owe = G.owes(ME), myDebt = G.debt && G.debt.pi === ME && myTurn;
  const canDraw = !me.out && G.winner === null && (owe || myDebt || (myTurn && !G.debt && (G.pending > 0 || G.drewBy !== ME)));
  $('drawpile').classList.toggle('can', canDraw && (owe || myDebt || G.pending > 0 || G.playable(ME).length === 0));
  patchCards($('discard'), discardHTML(), null, false);
  // hud
  const lcLeft = G.lastCallLeft ? G.lastCallLeft() : null;
  setHTML($('hud'), `<span class="phase ${G.side === 'L' ? 'day' : 'night'}"><b>${G.side === 'L' ? '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 1.2v2M8 12.8v2M1.2 8h2M12.8 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></g></svg>' : '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M10.8 2.2A6 6 0 1 0 13.8 11 5 5 0 0 1 10.8 2.2z" fill="currentColor"/></svg>'}</b>${G.side === 'L' ? t('lightSide') : t('darkSide')}</span>
    <span class="phaserules">${G.side === 'L' ? t('phaseDayRules') : t('phaseNightRules')}</span>
    <span class="row"><span class="chip">${suitSVG(G.color)}</span><span>${G.roulette !== null ? t('colorPending') : colorName(G.color)}</span></span>
    <span class="row dirtxt">${G.dir === 1 ? UI_ICON.cw : UI_ICON.ccw} ${t(G.dir === 1 ? 'cw' : 'ccw')}</span>
    ${G.rules.chaos ? (G.side === 'L' || G.inflate || G.lock ? `<span class="chaosline ${G.inflate || G.lock || G.chaosIn <= 2 ? 'warn' : ''}">${G.inflate ? t('inflated', G.inflate) : G.lock ? t('locked', G.lock) : t('chaosIn', G.chaosIn)}</span>` : `<span class="chaosline dim">${t('slotsClosed')}</span>`) : ''}
    ${G.potatoState && G.side === 'D' ? `<span class="chaosline ${G.potatoState === 2 ? 'warn potato hot' : 'potato'}">${t(G.potatoState === 2 ? 'potatoHot' : 'potatoOn')}</span>` : ''}
    ${lcLeft !== null && lcLeft <= 10 && G.winner === null ? `<span class="chaosline warn lastcall">${lcLeft ? t('lastCallIn', lcLeft) : t('lastCallNow')}</span>` : ''}
    ${G.maze > 0 ? `<span class="chaosline warn">${t('mazeLeft', G.maze)}</span>` : ''}
    ${G.multNext > 1 ? `<span class="chaosline warn multchip">${t('multNext', G.multNext)}</span>` : ''}
    ${G.pending > 0 ? `<span class="label" style="margin-top:8px">${t('stack')}</span><span class="stack${G.pending >= 8 ? ' burning' : ''}" style="--heat:${Math.min(1, G.pending / 20).toFixed(2)}">+${G.pending}</span>` : ''}`);
  JUICE.setSide(G.side === 'D'); AMB.setSide(G.side);
  if (!LAY.ready) measureLayout(); // the felt under the piles follows the layout; measured by the observer below, not here
  JUICE.setHeat(Math.max(G.pending / 22, lcLeft !== null && lcLeft <= 10 ? (10 - lcLeft) / 15 : 0)); JUICE.fireLevel(G.pending, G.multNext || 1);
  // banner
  const ban = $('banner');
  let txt, you = false;
  if (G.winner !== null) txt = G.winner === ME ? t('youWin') : t('wins', G.players[G.winner].name);
  else if (me.out) txt = t('youLeft');
  else if (owe) txt = t('oweBanner', me.oweN);
  else if (G.debt) txt = G.debt.pi === ME
    ? (G.debt.n ? t('myStackDebt', G.debt.n) : t('myColorDebt', colorName(G.debt.until), G.debt.got))
    : (G.debt.n ? t('otherDebtN', G.players[G.debt.pi].name, G.debt.n) : t('otherDebtC', G.players[G.debt.pi].name, colorName(G.debt.until)));
  else if (G.roulette !== null) txt = G.roulette === ME ? t('rouletteMe') : t('rouletteOther', G.players[G.roulette].name);
  else if (myTurn) { you = true; txt = G.pending > 0 ? (G.playable(ME).length ? t('stackOrTake', G.stackMin, G.pending) : t('take', G.pending)) : (G.drewBy === ME ? t('playOrPass') : (G.playable(ME).length ? t('yourTurn') : (G.rules.drawUntil ? t('keepDrawing', colorName(G.color)) : t('drawOne')))); }
  else txt = t('turnOf', G.players[G.turn].name, away[G.turn]);
  ban.textContent = txt; ban.className = you ? 'you' : '';
  // me
  setHTML($('meIni'), initials(me.name));
  $('meName').textContent = me.name;
  $('meCnt').textContent = me.hand.length;
  setHTML($('meDeals'), MATCH && !MATCH.col[ME] ? dealBadges(me, true) : '');
  $('meTags').textContent = [MATCH ? (MATCH.col[ME] ? t('tagCollector') : t('tagDebt', me.debt, me.limit || MATCH.limit) + ' · ' + t('tagChips', MATCH.chips[ME])) : '', me.left ? t('tagLeft') : '', me.shield ? t('tagShield') : '', me.loan > 0 ? t('tagLoan', me.loan) : '', upNext === ME && !myTurn ? t('tagNext') : ''].filter(Boolean).join(' · ');
  // no Draw button: the deck itself is clicked; its tooltip says what a click does
  const digging = myTurn && G.rules.drawUntil && G.pending === 0 && G.drewBy !== ME && G.playable(ME).length === 0 && (G.drawRunPi === ME && G.drawRun > 0);
  canDrawNow = !!canDraw;
  $('drawpile').title = !canDraw ? '' : owe ? t('penalty', me.oweN)
    : myDebt ? (G.debt.n ? t('pickUpLeft', G.debt.n) : t('drawUntil', colorName(G.debt.until), G.debt.got))
    : G.pending > 0 && myTurn ? t('take', G.pending) : (digging ? t('drawAgain', G.drawRun) : t('draw'));
  $('btnPass').disabled = !(myTurn && G.drewBy === ME && G.pending === 0);
  const gb = $('btnGamble'), canG = G.canGamble && G.canGamble(ME);
  gb.classList.toggle('hidden', !canG); gb.textContent = t('gambleBtn');
  // a collector works for the house: once per deal, slip someone two cards or pull the lever
  const isCol = !!(MATCH && MATCH.col[ME] && MATCH.phase === 'play' && G.winner === null);
  $('colBar').classList.toggle('hidden', !isCol);
  if (isCol) {
    $('colTxt').textContent = MATCH.colUsed ? t('colUsed') : t('colReady');
    $('btnColGive').textContent = t('colGive'); $('btnColLever').textContent = t('colLever');
    $('btnColGive').disabled = $('btnColLever').disabled = !!MATCH.colUsed;
  }
  // deals you use by hand
  const ab = $('abBar'), free = myTurn && G.pending === 0 && !G.debt && !G.offer && !G.owes(ME);
  const abBtns = [];
  if (hasDeal(me, 'confess') && !me.used.confess) abBtns.push(`<button class="btn ab" data-ab="confess" ${free ? '' : 'disabled'}>${DEAL_ICON.confess}${confessSel ? t('abConfessGo', confessSel.size) : t('abConfess')}</button>`);
  if (hasDeal(me, 'puppet') && !me.used.puppet) abBtns.push(`<button class="btn ab" data-ab="puppet" ${free ? '' : 'disabled'}>${DEAL_ICON.puppet}${t('abPuppet')}</button>`);
  if (hasDeal(me, 'sharp')) abBtns.push(`<button class="btn ab" data-ab="burn" ${free ? '' : 'disabled'}>${DEAL_ICON.sharp}${t('abBurn')}</button>`);
  setHTML(ab, abBtns.join('')); ab.classList.toggle('hidden', !abBtns.length || !!(MATCH && MATCH.col[ME]));
  // the Dark shop's items: a separate inventory, usable at any moment
  const inv = $('invBar'), mineInv = (me.inv || []);
  const counts = {}; for (const id of mineInv) counts[id] = (counts[id] || 0) + 1;
  const invBtns = Object.keys(counts).map(id => {
    const ok = G.canUseItem(ME, id), auto = ITEM_AUTO[id] || (id === 'ward' && !ok);
    return `<button class="item use" data-use="${id}" data-tipitem="${id}" ${ok ? '' : 'disabled'}>${ITEM_ICON[id]}<b>${t('item_' + id)}</b>${counts[id] > 1 ? `<em>×${counts[id]}</em>` : ''}${ITEM_AUTO[id] ? `<i>${t('itemAuto')}</i>` : ''}</button>`;
  });
  setHTML(inv, invBtns.join('')); inv.classList.toggle('hidden', !invBtns.length || !!(MATCH && MATCH.col[ME]));
  if (!free && confessSel) confessSel = null;
  dealOffer();
  drawHorse();
  $('btnSort').textContent = t('sort', sortMode);
  if (innerWidth > 820 && selMode) selMode = false; // tap-to-pick is a phone thing; on a computer the right click picks
  $('btnSelect').textContent = innerWidth <= 820 ? (selMode ? t('selectOnShort') : t('selectShort')) : (selMode ? t('selectOn') : t('selectOff')); $('btnSelect').classList.toggle('on', selMode); $('btnSelect').classList.toggle('hidden', !G.rules.multi);
  $('btnQuit').textContent = t('leave');
  // hand (left alone while a card is being dragged)
  if (!dragging) {
    const hand = sortedHand(me.hand);
    const wrap = $('hand');
    const rootCw = LAY.discardW / 1.3 || 76;
    const n = Math.max(hand.length, 1), mobile = innerWidth <= 820;
    const minStrip = 0.3, MAX_TILT = 8; // degrees at the outer edge of the fan
    const base = Math.round(Math.min(rootCw * (mobile ? 1.12 : 1.15), (innerHeight * (mobile ? 0.16 : 0.18)) / 1.47));
    const pad = 16, tiltRoom = c => c * 1.47 * Math.sin(MAX_TILT * Math.PI / 180) + 4;
    // fixed card size: the hand never resizes as cards come and go; extra cards overlap tighter,
    // a second/third row only when even a thin sliver (~20%) of each card no longer fits
    const room = c => LAY.handW - 2 * pad - 2 * tiltRoom(c);
    const minFrac = 0.2;
    const fitsRow = (per, c) => c + (per - 1) * c * minFrac <= room(c);
    let rows = 1, per = n;
    while (rows < 3 && !fitsRow(per, base)) { rows++; per = Math.ceil(n / rows); }
    let cw = base;
    if (!fitsRow(per, cw)) { for (let k = 0; k < 3; k++) cw = Math.min(base, room(cw) / (1 + (per - 1) * minFrac)); }
    cw = Math.max(Math.round(cw), mobile ? 34 : 44);
    const availRow = LAY.handW - 2 * pad - 2 * tiltRoom(cw);
    const strip = per > 1 ? Math.min(cw + 8, Math.max((availRow - cw) / (per - 1), cw * 0.18)) : 0;
    const ch = cw * 1.47, rowLift = ch * 0.42;
    wrap.style.setProperty('--hcw', cw.toFixed(1) + 'px');
    wrap.style.setProperty('--cw', cw.toFixed(1) + 'px');
    wrap.style.setProperty('--ch', ch.toFixed(1) + 'px');
    wrap.style.minHeight = Math.ceil(ch * rows - (rows - 1) * rowLift + (mobile ? 40 : 44)) + 'px';
    wrap.style.flexWrap = rows > 1 ? 'wrap' : 'nowrap';
    wrap.style.justifyContent = 'center';
    let newIdx = 0;
    const handHTML = hand.map((c, k) => {
      const row = Math.floor(k / per), col = k % per, inRow = Math.min(per, n - row * per);
      let cls = '';
      if (myTurn) cls = G.canPlay(c) ? 'ok' : 'dim';
      if (c.lock) cls += ' locked' + (c.chain ? ' ch' + (c.chain + 1) : '');
      if (c.uniq) cls += ' uniq';
      if (confessSel && confessSel.has(c.id)) cls += ' picked';
      { const si = selIds.indexOf(c.id); if (si >= 0) cls += ' sel sel' + Math.min(si, 9); }
      const off = col - (inRow - 1) / 2, step = inRow > 1 ? Math.min(3, (2 * MAX_TILT) / (inRow - 1)) : 0;
      let st = `--i:${k};margin-left:${col ? (strip - cw).toFixed(1) : 0}px;z-index:${k};--rot:${(off * step).toFixed(2)}deg;--dy:${Math.min(12, off * off * step * 0.1).toFixed(1)}px`;
      if (row > 0) st += `;margin-top:${(-rowLift).toFixed(1)}px`;
      if (!lastHandIds.has(c.id)) { cls += ' new'; st += `;animation-delay:${Math.min(newIdx++, 7) * 20}ms`; }
      const html = faceHTML(G.f(c), G.side, cls, c.id).replace('style="', `style="${st};`);
      return (row > 0 && col === 0 ? '<i class="brk"></i>' : '') + html;
    }).join('');
    // nothing about the hand changed: keep the DOM (and the hover/tilt) as it is.
    // Otherwise patch it: a card already on screen keeps its element (no repaint of its texture, no restarted sway),
    // only its classes and position change; new cards are added, gone ones removed.
    if (handHTML !== lastHandHTML || !wrap.firstElementChild) {
      lastHandHTML = handHTML;
      patchCards(wrap, handHTML, Object.fromEntries(me.hand.map(c => [c.id, c])));
    }
    lastHandIds = new Set(me.hand.map(c => c.id));
    drawSelBar();
    wrap.classList.toggle('big', hand.length > 24);
  }
  // log
  const logKey = LANG + ':' + G.gid + ':' + (G.log.length ? G.log[G.log.length - 1].msg : '') + ':' + G.log.length;
  if (logKey !== lastLogKey) {
    const prev = new Set(lastLogMsgs); lastLogKey = logKey;
    const rows = G.log.slice(-60);
    lastLogMsgs = rows.map(l => l.msg);
    $('log').innerHTML = rows.slice().reverse().map(l => `<div class="${l.cls === 'win' ? 'win' : ''}${prev.has(l.msg) ? '' : ' n'}">${esc(youify(fmtLog(l)))}</div>`).join('');
  }
  const lastMsg = G.log.length ? youify(fmtLog(G.log[G.log.length - 1])) : '';
  if ($('ticker').textContent !== lastMsg) $('ticker').textContent = lastMsg;
  processEvents();
}
function youify(m) {
  if (LANG !== 'en' || !G.players[ME] || G.players[ME].name !== 'You' || !/^You /.test(m)) return m.replace(/You starts/, 'You start');
  return m.replace(/\bYou (plays|takes|draws|passes|calls|swaps|flips|empties|hit|is|jumps|must|mirrors|raises|duels|ran|drops|goes|throws|puts|loads|aims|pulls|signs|spins|scratches|tips|hands|gets|burns|confesses|makes|tears|leaves|was|holds|repeats|picked|drew)\b/g, (a, v) =>
    'You ' + ({ drops: 'drop', goes: 'go', throws: 'throw', puts: 'put', loads: 'load', aims: 'aim', pulls: 'pull', signs: 'sign', spins: 'spin', scratches: 'scratch', tips: 'tip', hands: 'hand', gets: 'get', burns: 'burn', confesses: 'confess', makes: 'make', tears: 'tear', leaves: 'leave', was: 'were', holds: 'hold', repeats: 'repeat', picked: 'picked', drew: 'drew', plays: 'play', takes: 'take', draws: 'draw', passes: 'pass', calls: 'call', swaps: 'swap', flips: 'flip', empties: 'empty', hit: 'hit', is: 'are', jumps: 'jump', must: 'must', mirrors: 'mirror', raises: 'raise', duels: 'duel', ran: 'ran' }[v]))
    .replace(/(You (?:play|draw|flip|empty|swap)[^.]*?)\btheir\b/g, '$1your').replace(/until they can/g, 'until you can').replace(/reaches them/, 'reaches you');
}

