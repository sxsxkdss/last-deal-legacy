// ================= DIALOGS =================
// Every dialog can be closed (× in the corner, Esc, or a click outside it).
// A choice you started yourself (a wild's colour, a target) is cancelled by closing.
// A choice the game is waiting for (colour roulette, the angel, passing cards, the shop) is only tucked away:
// a "Back to the choice" tab stays on screen and brings it back.
let modalState = { mode: 'close', onCancel: null, min: false, key: '' }, modalNext = null;
function openModal(html, o) {
  o = o || modalNext || {}; modalNext = null;
  const key = o.key || '', stayMin = modalState.min && key && key === modalState.key;
  $('modalBody').innerHTML = `<button class="modalx" id="modalX" title="${esc(t('close'))}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M5 5l14 14M19 5L5 19"/></svg></button>` + html;
  modalState = { mode: o.mode || 'close', onCancel: o.onCancel || null, min: !!stayMin, key, fit: !!o.fit };
  $('modalBody').className = 'dialog' + (o.cls ? ' ' + o.cls : '');
  $('modalX').onclick = dismissModal;
  $('modal').classList.toggle('hidden', !!stayMin); $('modalBack').classList.toggle('hidden', !stayMin);
  fitModal();
}
// a dialog that asks to fit (the shop) shrinks as a whole until it fits the window, down to 62%;
// past that it scrolls as before
function fitModal() {
  const d = $('modalBody');
  if (!modalState.fit || $('modal').classList.contains('hidden')) { d.style.zoom = ''; return; }
  d.style.zoom = '';
  const cs = getComputedStyle($('modal')), avail = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4;
  const z = Math.max(innerWidth <= 820 ? 0.86 : 0.62, Math.min(1, avail / d.offsetHeight)); // on a phone it scrolls rather than shrinking to unreadable
  if (z < 1) d.style.zoom = z.toFixed(3);
}
addEventListener('resize', () => { if (modalState.fit) fitModal(); });
function closeModal() { $('modal').classList.add('hidden'); $('modalBack').classList.add('hidden'); modalState.min = false; }
function dismissModal() {
  if ($('modal').classList.contains('hidden')) return;
  SFX.play('click');
  if (modalState.mode === 'min') { $('modal').classList.add('hidden'); $('modalBack').classList.remove('hidden'); modalState.min = true; return; }
  const cb = modalState.onCancel; modalState.onCancel = null; closeModal(); if (cb) cb();
}
$('modal').addEventListener('click', e => { if (e.target === $('modal')) dismissModal(); });
$('modalBack').onclick = () => { $('modal').classList.remove('hidden'); $('modalBack').classList.add('hidden'); modalState.min = false; fitModal(); };
const ON_COLOR = { y: 'var(--ink)', t: 'var(--ink)', o: 'var(--ink)' };
function pickColor(title, sub, side, forced) {
  return new Promise(res => {
    modalNext = forced ? { mode: 'min', key: 'roul' } : { onCancel: () => res(null) };
    openModal(`<h2>${esc(title)}</h2><p>${esc(sub)}</p><div class="colors">${SIDE_COLORS[side].map(c => `<button data-c="${c}" style="background:${CVAR[c]};color:${ON_COLOR[c] || '#fff'}">${suitSVG(c)}${colorName(c)}</button>`).join('')}</div>`);
    $('modalBody').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { SFX.play('click'); closeModal(); res(b.dataset.c); });
  });
}
function pickTarget(title, sub, skipLabel, forced) {
  return new Promise(res => {
    modalNext = forced ? { mode: 'min', key: 'target' } : { onCancel: () => res(null) };
    const list = G.players.map((p, i) => ({ p, i })).filter(o => o.i !== ME && !o.p.out);
    openModal(`<h2>${esc(title)}</h2><p>${esc(sub)}</p>
      <div class="list">${list.map(o => `<button data-t="${o.i}"><span style="display:flex;gap:8px;align-items:center"><span class="ini">${initials(o.p.name)}</span>${esc(o.p.name)}</span><span class="mono">${t('cardsN', o.p.hand.length)}</span></button>`).join('')}</div>
      ${skipLabel ? `<button class="btn wide" id="skipT" style="margin-top:16px">${esc(skipLabel)}</button>` : ''}`);
    $('modalBody').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { SFX.play('click'); closeModal(); res(+b.dataset.t); });
    if (skipLabel) $('skipT').onclick = () => { SFX.play('click'); closeModal(); res(null); };
  });
}
// choose which matching cards go down together, and in what order; resolves to the cards, or null to cancel
function pickExtras(card, same, pre) {
  return new Promise(res => {
    // The cards start in the order they sit in your hand. Play order is simply their order here, left to right:
    // drag to rearrange, tap to switch a card off or on (it stays where it is).
    const handPos = new Map(sortedHand(G.players[ME].hand).map((c, i) => [c, i]));
    let list = [card, ...same].sort((a, b) => handPos.get(a) - handPos.get(b));
    let sel = new Set([card, ...(pre || same)]), warn = '';
    const numbers = /^\d$/.test(G.f(card).v) && G.f(card).c !== 'w' && G.rules.combos !== false;
    const order = () => list.filter(c => sel.has(c));
    const comboLine = ord => {
      if (!numbers || ord.length < 2) return '';
      const cb = comboOf(ord.map(c => G.f(c)));
      if (!cb) return `<div class="pickcombo bad">${t('noCombo')}</div>`;
      const night = G.side === 'D', nx = night && cb.d ? nm(G.nextIdx(ME, 1)) : '';
      const pay = [cb.d ? (night ? t('comboNightSlap', nx, cb.d) : t('comboToss', cb.d)) : '', cb.m ? t('comboHit', cb.m) : ''].filter(Boolean).join(' · ');
      return `<div class="pickcombo"><b>${t('combo_' + cb.key)}</b><span class="chips">${cb.chips}</span><i>×</i><span class="mult">${cb.mult}</span>${pay ? `<em>${pay}</em>` : ''}</div>`;
    };
    const draw = () => {
      const ord = order();
      const valid = !numbers || ord.length < 2 || !!comboOf(ord.map(c => G.f(c)));
      const slot = (c, k) => { const at = ord.indexOf(c); return `<div class="slot" data-k="${k}">${at >= 0 ? `<span class="ord">${at + 1}</span>` : ''}${faceHTML(G.f(c), G.side, at >= 0 ? 'on' : 'off')}</div>`; };
      modalNext = { onCancel: () => res(null) };
      openModal(`<h2>${t(numbers ? 'comboQ' : 'togetherQ')}</h2><p>${t(numbers ? 'comboSub' : 'togetherSub')}</p>
        <div class="pick${list.length > 16 ? ' lots' : list.length > 9 ? ' many' : ''}" id="pickRow">${list.map(slot).join('')}</div>
        ${comboLine(ord)}
        ${warn ? `<p class="pickwarn">${esc(warn)}</p>` : ''}
        <button class="btn primary wide" id="pxGo" ${ord.length && valid ? '' : 'disabled'}>${t('playN', ord.length)}</button>
        <button class="btn wide" id="pxClear" style="margin-top:8px">${ord.length === list.length ? t('clearOrder') : t('selectAll')}</button>
        <button class="textlink" id="pxCancel">${t('cancel')}</button>`);
      const slots = [...$('pickRow').querySelectorAll('.slot[data-k]')];
      slots.forEach(el => el.onpointerdown = e => {
        if (e.button > 0) return;
        const sx = e.clientX, sy = e.clientY, k = +el.dataset.k;
        let moving = false, rects = null, target = k, ord2 = null;
        try { el.setPointerCapture(e.pointerId); } catch (x) {}
        const move = ev => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!moving && Math.hypot(dx, dy) > 8) { moving = true; TIP.hide(); rects = slotRects(slots); $('pickRow').classList.add('reorder'); el.classList.add('held'); }
          if (!moving) return;
          const r = rects[k];
          const t2 = nearestSlot(rects, r.x + dx, r.y + dy);
          if (t2 !== target) { target = t2; ord2 = previewOrder(slots, rects, k, target); SFX.play('click'); }
          el.style.translate = `${dx}px ${dy}px`;
        };
        const up = () => {
          el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
          warn = '';
          if (!moving) { const c = list[k]; if (sel.has(c)) sel.delete(c); else sel.add(c); SFX.play('click'); }
          else if (ord2 && target !== k) list = ord2.map(i => list[i]);
          draw();
        };
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
      $('pxClear').onclick = () => { sel = ord.length === list.length ? new Set() : new Set(list); warn = ''; draw(); };
      $('pxGo').onclick = () => {
        let o = order(); if (!o.length) return;
        // the first card has to fit the pile: if it doesn't, the first one that does goes in front automatically
        if (!fits(o[0])) {
          const f = o.find(fits);
          if (!f) { warn = t('firstMustFit'); SFX.play('bad'); draw(); return; }
          o = [f, ...o.filter(c => c !== f)];
        }
        closeModal(); res({ lead: o[0], extra: o.slice(1) });
      };
      $('pxCancel').onclick = () => { closeModal(); res(null); };
    };
    draw();
  });
}
function showEnd() {
  if (!G || G.winner === null || !$('modal').classList.contains('hidden') && $('modalBody').querySelector('#again,#menu')) return;
  const w = G.players[G.winner], meP = G.players[ME];
  const ranked = G.players.map((p, i) => ({ p, i })).sort((a, b) => (a.i === G.winner ? -1 : b.i === G.winner ? 1 : 0) || (a.p.elim - b.p.elim) || a.p.hand.length - b.p.hand.length);
  const won = G.winner === ME;
  modalNext = { mode: 'min', key: 'end' };
  const controls = !isHost
    ? `<p style="margin:16px 0 0">${t('waitNext')}</p><button class="textlink" id="menu">${t('leaveRoom')}</button>`
    : `<button class="btn primary wide" id="again">${t('playAgain')}</button><button class="textlink" id="menu">${t('backLobby')}</button>`;
  openModal(`<h2>${won ? t('youWin') : esc(t('wins', w.name))}</h2>
    <p>${won ? t('handEmptied') : t('finalCounts')}</p>
    <div class="list">${ranked.map((o, k) => `<div class="li"><span>${k + 1}. ${esc(o.p.name)}</span><span class="mono">${o.i === G.winner ? t('winner') : t('cardsN', o.p.hand.length)}</span></div>`).join('')}</div>
    ${controls}`);
  if ($('again')) $('again').onclick = () => { closeModal(); conn.send({ t: 'start' }); };
  $('menu').onclick = () => { closeModal(); if (isHost) conn.send({ t: 'tolobby' }); else leaveRoom(); };
}
