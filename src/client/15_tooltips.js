// ---------- card tooltip: name + what it does, on hover (mouse) or long-press (touch) ----------
const TIP = (() => {
  const el = document.createElement('div'); el.id = 'cardtip'; el.setAttribute('role', 'tooltip'); document.body.appendChild(el);
  let cur = null, pressT = 0, suppressClick = false;
  const faceOf = card => { const [side, c, v] = (card.dataset.f || '').split('|'); return v ? { side, f: { c, v } } : null; };
  function showDeal(b) {
    const id = b.dataset.tipdeal, light = isLightDeal(id); cur = b;
    const pr = t('dealP_' + id);
    el.innerHTML = `<span class="tipdealhead">${DEAL_ICON[id] || ''}<b>${esc(t('deal_' + id))}</b></span><span class="tipside">${esc(light ? t('tipLightDeal') : t('tipDarkDeal'))}</span><p>${esc(t('dealD_' + id))}</p>${pr ? `<p class="tipprice">${esc(pr)}</p>` : ''}`;
    el.className = 'show tipdeal ' + (light ? 'light' : 'dark');
    place(b);
  }
  function showItem(b) {
    const id = b.dataset.tipitem; cur = b;
    el.innerHTML = `<span class="tipdealhead">${ITEM_ICON[id] || ''}<b>${esc(t('item_' + id))}</b></span><span class="tipside">${esc(t('itemKind_' + id))} · ${ITEM_PRICE[id]}¢</span><p>${esc(t('itemD_' + id))}</p>`;
    el.className = 'show tipdeal dark tipitem';
    place(b);
  }
  function place(card) {
    const r = card.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let x = r.left + r.width / 2 - w / 2, y = r.top - h - 10;
    if (y < 6) y = r.bottom + 10;
    x = Math.max(6, Math.min(innerWidth - w - 6, x));
    el.style.left = x + 'px'; el.style.top = Math.min(innerHeight - h - 6, y) + 'px';
  }
  function show(card) {
    if (card.dataset.tipdeal) { if (!dragging && S.tips !== false) showDeal(card); return; }
    if (card.dataset.tipitem) { if (!dragging && S.tips !== false) showItem(card); return; }
    const d = faceOf(card); if (!d || dragging || S.tips === false) return;
    cur = card;
    const side = d.side === 'D' ? t('tDark') : t('tLight');
    // your own cards also show what's printed on their other side
    let backHTML = '';
    const mine = G && G.players[ME] && card.dataset.id && card.closest('#hand') ? G.players[ME].hand.find(c => String(c.id) === card.dataset.id) : null;
    if (mine) {
      const os = d.side === 'L' ? 'D' : 'L', bf = mine[os];
      if (bf) backHTML = `<div class="tipback"><div class="tipmini">${faceHTML(bf, os, 'mini')}</div><div><span class="tipside">${esc(t('tipBack'))} · ${esc(os === 'D' ? t('tDark') : t('tLight'))}</span><b>${esc(cardName(bf))}</b>${cardDesc(bf) ? `<p>${esc(cardDesc(bf))}</p>` : ''}</div></div>`;
    }
    el.innerHTML = `<b>${esc(cardName(d.f))}</b><span class="tipside">${esc(side)}</span>${cardDesc(d.f) ? `<p>${esc(cardDesc(d.f))}</p>` : ''}${backHTML}`;
    el.className = 'show s-' + d.side;
    place(card);
  }
  function hide() { cur = null; el.className = ''; }
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    if (dragging || document.querySelector('.pick.reorder')) { if (cur) hide(); return; }
    const card = e.target.closest && e.target.closest('.card[data-f], [data-tipdeal], [data-tipitem]');
    if (card && card !== cur) show(card); else if (!card && cur) hide();
  });
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { hide(); return; }
    const card = e.target.closest && e.target.closest('.card[data-f], [data-tipdeal], [data-tipitem]');
    clearTimeout(pressT); hide();
    if (card) { const x0 = e.clientX, y0 = e.clientY; pressT = setTimeout(() => { show(card); suppressClick = true; }, 450);
      const mv = ev => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) { clearTimeout(pressT); document.removeEventListener('pointermove', mv, true); } };
      document.addEventListener('pointermove', mv, true); setTimeout(() => document.removeEventListener('pointermove', mv, true), 600); }
  }, true);
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') hide(); }, true);
  const end = () => { clearTimeout(pressT); if (cur && suppressClick) setTimeout(hide, 1600); };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
  // a long-press to read a card must not also play it
  document.addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.card[data-f]')) e.preventDefault(); });
  addEventListener('scroll', hide, true);
  return { hide };
})();


// ---------- combo score panel, Balatro style: name, chips × mult, payout ----------
let comboTimer = 0;
function showCombo(e) {
  let el = $('combo');
  if (!el) { el = document.createElement('div'); el.id = 'combo'; $('game').appendChild(el); }
  const pay = [e.d ? t('comboToss', e.d) : '', e.slap >= 0 && e.sd ? t('comboNightSlap', nm(e.slap), e.sd) : '', e.m ? t('comboHit', e.m) : '', e.r ? t('comboRelief', e.r) : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<span class="cwho">${esc(nm(e.pi))}</span><b class="cname">${t('combo_' + e.key)}</b><div class="cscore"><span class="chips">${e.chips}</span><i>×</i><span class="mult">${e.mult}</span></div>${pay ? `<span class="cpay">${esc(pay)}</span>` : ''}`;
  // sits on the top edge of the pile area, never over the day/night panel next to it
  // over the draw pile and the discard, no wider than them, so it never covers the day/night panel
  { const pr = document.querySelector('.piles'); if (pr) { const r = pr.getBoundingClientRect(); el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = Math.max(8, r.top + 8) + 'px'; el.style.maxWidth = Math.max(220, r.width - 16) + 'px'; } }
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  const big = e.m > 0 || e.mult >= 3;
  SFX.play('mult', Math.min(4, e.mult)); setTimeout(() => SFX.play('lucky'), 180);
  JUICE.shake(big ? 4 : 2);
  JUICE.comboFlame(el.querySelector('.mult'), Math.min(8, 1.5 + e.mult * 1.2), 1700);
  const r = el.getBoundingClientRect(); JUICE.burst(r.left + r.width / 2, r.top + r.height / 2, 40 + e.mult * 10, ['#009dff', '#fe5f55', '#ffd23f', '#fff'], 1.2);
  clearTimeout(comboTimer); comboTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

