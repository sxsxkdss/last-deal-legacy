// the card behind an element is looked up when it is touched: elements are reused across states, card objects are not
function attachCard(el, card) {
  el._card = card;
  if (el._wired) return; el._wired = true;
  el.addEventListener('contextmenu', e => { e.preventDefault(); if (!confessSel) toggleSel(el._card); });
  el.addEventListener('pointermove', e => { if (!dragging && !el.parentNode.classList.contains('big')) JUICE.tilt(el, e); });
  el.addEventListener('pointerleave', () => JUICE.untilt(el));
  el.onpointerdown = e => {
    if (e.button > 0) return;
    const card = el._card; if (!card) return;
    const sx = e.clientX, sy = e.clientY, r0 = el.getBoundingClientRect();
    let ghost = null, els = null, rects = null, src = -1, target = -1, order = null;
    const handBox = $('hand').getBoundingClientRect();
    const inHand = y => y > handBox.top - 40;
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    // the dragged card hangs from the pointer: it trails a little behind and swings with the motion
    const grab = { x: sx - r0.left, y: sy - r0.top }, lever = (0.5 - grab.y / r0.height) * 2;
    let want = { x: r0.left, y: r0.top }, pos = { x: r0.left, y: r0.top }, swing = 0, raf = 0;
    const paint = () => {
      const px = pos.x;
      pos.x += (want.x - pos.x) * 0.42; pos.y += (want.y - pos.y) * 0.42;
      const vx = pos.x - px;
      swing += (Math.max(-24, Math.min(24, vx * 1.6 * lever)) - swing) * 0.22;
      if (ghost) ghost.style.transform = `translate(${pos.x}px,${pos.y}px) rotate(${swing.toFixed(2)}deg) scale(1.06)`;
      raf = requestAnimationFrame(paint);
    };
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!ghost && Math.hypot(dx, dy) > 10) {
        dragging = true;
        els = [...$('hand').querySelectorAll('.card[data-id]')]; rects = slotRects(els); src = target = els.indexOf(el);
        $('hand').classList.add('reorder'); TIP.hide(); JUICE.untilt(el);
        const w = document.createElement('div'); w.innerHTML = el.outerHTML; ghost = w.firstElementChild;
        ghost.className = ghost.className.replace(/\b(ok|dim|jump|new|flipin|nope)\b/g, '') + ' held';
        Object.assign(ghost.style, { margin: '0', width: r0.width + 'px', height: r0.height + 'px', zIndex: 99, transition: 'none', transformOrigin: `${grab.x}px ${grab.y}px` });
        $('fx').appendChild(ghost); el.classList.add('lifted');
        raf = requestAnimationFrame(paint);
      }
      if (ghost) {
        want = { x: r0.left + dx, y: r0.top + dy };
        const onPile = (usable(card) || (selIds.includes(card.id) && selInfo() && selInfo().ok)) && overDiscard(ev.clientX, ev.clientY);
        $('discard').classList.toggle('drop', onPile);
        const t2 = !onPile && inHand(ev.clientY) && src >= 0 ? nearestSlot(rects, r0.left + dx + r0.width / 2, r0.top + dy + r0.height / 2) : src;
        if (t2 !== target) { target = t2; order = previewOrder(els, rects, src, target); if (target !== src) SFX.play('click'); }
      }
    };
    const up = ev => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      $('discard').classList.remove('drop');
      if (ghost) {
        const gr = ghost.getBoundingClientRect(), hit = ev.type === 'pointerup' && (usable(card) || (selIds.includes(card.id) && selInfo() && selInfo().ok)) && overDiscard(ev.clientX, ev.clientY);
        dragging = false; $('hand').classList.remove('reorder');
        if (hit) { clearPreview(els); ghost.remove(); el.classList.remove('lifted'); if (selIds.includes(card.id) && selIds.length > 1) playSelection(); else { selIds = []; useCard(card, el, gr); } }
        else if (ev.type === 'pointerup' && target >= 0 && target !== src) {
          // keep the new order: from now on the hand is sorted by hand
          handOrder = order.map(i => els[i].dataset.id); sortMode = 'manual';
          const dest = rects[target];
          const a = ghost.animate([{ transform: ghost.style.transform }, { transform: `translate(${dest.l}px,${dest.t}px)` }], { duration: 90, easing: 'ease-out' });
          a.onfinish = () => { ghost.remove(); clearPreview(els); el.classList.remove('lifted'); render(); };
        }
        else {
          clearPreview(els);
          const a = ghost.animate([{ transform: ghost.style.transform }, { transform: `translate(${r0.left}px,${r0.top}px)` }], { duration: 110, easing: 'ease-out' });
          a.onfinish = () => { ghost.remove(); el.classList.remove('lifted'); render(); };
        }
      } else if (ev.type === 'pointerup' && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 10) {
        if (confessSel) { if (!card.lock) { confessSel.has(card.id) ? confessSel.delete(card.id) : confessSel.size < 3 && confessSel.add(card.id); SFX.play('click'); render(); } }
        else if (selMode || ev.ctrlKey || ev.shiftKey || ev.metaKey) toggleSel(card);
        // picked with the right button, thrown with the left: a click on a picked card plays them all
        else if (selIds.includes(card.id)) playSelection();
        else { if (selIds.length) { selIds = []; } useCard(card, el); }
      }
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
}
let canDrawNow = false, canPassNow = false;
// the deck draws; after a draw with a card you'd rather keep, the same click passes
function drawNow() { if (busy || !G) return; if (canDrawNow) act('draw'); else if (canPassNow) act('pass'); }
$('btnGamble').onclick = async () => {
  if (busy || !G || !G.canGamble || !G.canGamble(ME)) return;
  const rivals = G.players.map((p, i) => i).filter(i => i !== ME && !G.players[i].out);
  const tg = rivals.length > 1 ? await pickTarget(t('gambleQ'), t('gambleSub', G.pending), t('cancel')) : rivals[0];
  if (tg === null || tg === undefined || !G.canGamble(ME)) return;
  act('gamble', { target: tg });
};
$('drawpile').onclick = drawNow;
$('btnSelect').onclick = () => { selMode = !selMode; if (!selMode) selIds = []; SFX.play('click'); render(); };
$('discard').addEventListener('click', () => { if (selIds.length) playSelection(); });
$('btnSort').onclick = () => { sortMode = { color: 'value', value: 'none', none: 'color', manual: 'color' }[sortMode]; render(); };
$('btnQuit').onclick = () => {
  openModal(`<h2>${t('leaveQ')}</h2><p>${t('leaveSub')}</p><button class="btn primary wide" id="lvGo">${t('leave')}</button><button class="textlink" id="lvNo">${t('stay')}</button>`);
  $('lvGo').onclick = leaveRoom; $('lvNo').onclick = closeModal;
};
$('btnMenu').onclick = () => {
  openModal(`<h2>${t('menu')}</h2><div class="list">
    <button id="mSort"><span>${t('menuSort')}</span><span class="mono">${t('sort', sortMode).split(': ')[1]}</span></button>
    <button id="mLog"><span>${t('menuLog')}</span><span class="mono">${G ? G.log.length : 0}</span></button>
    <button id="mRules"><span>${t('menuRules')}</span><span class="mono"></span></button>
    ${G && G.rules.combos !== false && G.rules.multi ? `<button id="mCombos"><span>${t('refTitle')}</span><span class="mono"></span></button>` : ''}
    <button id="mSound"><span>${t('menuSound')}</span><span class="mono">${S.sound ? t('on') : t('off')}</span></button>
    <button id="mLang"><span>${t('menuLang')}</span><span class="mono">${LANGS[LANG]}</span></button>
    <button id="mSet"><span>${t('settings')}</span><span class="mono">${UI_ICON.gear}</span></button>
    <button id="mLeave"><span>${t('menuLeave')}</span><span class="mono">${esc(roomCode)}</span></button>
  </div><button class="btn wide" id="mClose">${t('close')}</button>`);
  $('mSort').onclick = () => { $('btnSort').onclick(); $('btnMenu').onclick(); };
  $('mLog').onclick = () => {
    openModal(`<h2>${t('gameLog')}</h2><div class="rulestext mono" style="font-size:12px;line-height:16px">${(G ? G.log.slice(-60).reverse() : []).map(l => `<div style="padding:8px 0;border-top:1px solid var(--line)">${esc(youify(fmtLog(l)))}</div>`).join('')}</div><button class="btn wide" id="mClose2">${t('close')}</button>`);
    $('mClose2').onclick = closeModal;
  };
  $('mRules').onclick = showRules;
  if ($('mCombos')) $('mCombos').onclick = () => { openModal(`<div class="comboref modalref">${comboRefHTML(null)}</div><button class="btn wide" id="mClose3" style="margin-top:16px">${t('close')}</button>`); $('mClose3').onclick = closeModal; };
  $('mSound').onclick = () => { $('btnSound').onclick(); $('btnMenu').onclick(); };
  $('mLang').onclick = () => { setLang(LANG === 'ru' ? 'en' : 'ru'); $('btnMenu').onclick(); };
  $('mSet').onclick = showSettings;
  $('mLeave').onclick = () => $('btnQuit').onclick();
  $('mClose').onclick = closeModal;
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) { e.preventDefault(); dismissModal(); return; }
  if (!G || $('game').classList.contains('hidden') || e.target.tagName === 'INPUT') return;
  if (e.key === 'd' || e.key === ' ') { e.preventDefault(); drawNow(); }
});

