// ================= DEALS: the angel and the demon =================
let confessSel = null, offerKey = '';
function dealBadges(p, mine) {
  const out = [];
  const ds = p.deals || [], compact = false;
  for (const d of ds) out.push(`<span class="dealb ${isLightDeal(d) ? 'light' : 'dark'}${compact ? ' ico' : ''}" data-tipdeal="${d}">${DEAL_ICON[d] || ''}${compact ? '' : `<b>${t('deal_' + d)}</b>`}</span>`);
  for (const [k, v] of Object.entries(p.fx || {})) out.push(`<span class="itemb on" data-tipitem="${k}">${ITEM_ICON[k] || ''}${mine ? `<b>${t('item_' + k)}${k === 'rent' ? ' ' + v + '/10' : ''}</b>` : ''}</span>`);
  if ((p.inv || []).length) out.push(`<span class="itemb bag" title="${esc(p.inv.map(id => t('item_' + id)).join(', '))}">${ITEM_ICON.bag}${p.inv.length}</span>`);
  if (mine && (p.buff || 0) > 0) out.push(`<span class="chance buff" title="${t('eclipseBuff')}">${ITEM_ICON.eclipse}+${pct(p.buff)}</span>`);
  if (mine && canLight(p)) out.push(`<span class="chance light${(p.angel || 0) >= 20 && !p.signedNow ? ' hot' : ''}${p.signedNow ? ' wait' : ''}" title="${p.signedNow ? t('oddsWait') : t('angelChance')}">${DEAL_ICON.angel}${mine ? t('oddsAngel') + ' ' : ''}${pct(p.angel || 0)}</span>`);
  if (mine && canDark(p) && (p.demon || 0) > 0) out.push(`<span class="chance dark${p.demon >= 30 && !p.signedNow ? ' hot' : ''}${p.signedNow ? ' wait' : ''}" title="${p.signedNow ? t('oddsWait') : t('demonChance')}">${DEAL_ICON.demon}${mine ? t('oddsDemon') + ' ' : ''}${pct(Math.min(100, p.demon))}</span>`);
  
  return out.length ? `<div class="deals${mine ? ' mine' : ''}">${out.join('')}</div>` : '';
}
function dealOffer() {
  const o = G && G.offer;
  if (!o || o.pi !== ME) { if (offerKey) { offerKey = ''; if ($('modalBody').querySelector('.contract')) closeModal(); } return; }
  const key = G.gid + ':' + G.seq + ':' + o.kind;
  if (offerKey === key && (!$('modal').classList.contains('hidden') || modalState.min)) return;
  offerKey = key;
  const dark = o.kind === 'dark', me = G.players[ME], both = o.kind === 'both';
  const clause = id => `<button class="clause" data-deal="${id}">${DEAL_ICON[id] || ''}<b>${t('deal_' + id)}</b><span>${t('dealD_' + id)}</span>${dark && t('dealP_' + id) ? `<i>${t('price')}: ${t('dealP_' + id)}</i>` : ''}</button>`;
  const lit = (me.deals || []).filter(isLightDeal), fallWarn = dark && lit.length ? `<p class="fallwarn">${t('fallWarn', lit.map(d => t('deal_' + d)).join(', '))}</p>` : '';
  modalNext = { mode: 'min', key: 'offer' };
  if (both) {
    const cl = (id, dk) => `<button class="clause" data-deal="${id}">${DEAL_ICON[id] || ''}<b>${t('deal_' + id)}</b><span>${t('dealD_' + id)}</span>${dk && t('dealP_' + id) ? `<i>${t('price')}: ${t('dealP_' + id)}</i>` : ''}</button>`;
    openModal(`<div class="contract both"><div class="cHead">${ITEM_ICON.twoface}<h2>${t('item_twoface')}</h2></div><p>${t('twofaceSub')}</p>
      <div class="bothcols"><div class="contract light"><div class="cHead">${DEAL_ICON.angel}<h2>${t('angelTitle')}</h2></div><div class="clauses">${o.opts.filter(isLightDeal).map(id => cl(id, false)).join('')}</div></div>
      <div class="contract dark"><div class="cHead">${DEAL_ICON.demon}<h2>${t('demonTitle')}</h2></div><div class="clauses">${o.opts.filter(id => !isLightDeal(id)).map(id => cl(id, true)).join('')}</div></div></div></div>`);
  } else
  openModal(`<div class="contract ${dark ? 'dark' : 'light'}">
    <div class="cHead">${dark ? DEAL_ICON.demon : DEAL_ICON.angel}<h2>${dark ? t('demonTitle') : t('angelTitle')}</h2></div>
    <p>${dark ? t('demonSub') : t('angelSub')}</p>${fallWarn}
    <div class="clauses">${o.opts.map(clause).join('')}</div>
    ${dark ? `<button class="btn wide tear" id="dealNo">${t('tearUp')}</button>` : `<p class="mono small">${t('angelMust')}</p>`}</div>`);
  SFX.play(dark ? 'devil' : 'chaos');
  let done = false;
  $('modalBody').querySelectorAll('[data-deal]').forEach(b => b.onclick = async () => {
    if (done) return; done = true;
    const id = b.dataset.deal; let target = null;
    // the chosen clause gets signed (dark) or blessed (light) before the paper goes away
    b.classList.add('signed'); b.insertAdjacentHTML('beforeend', `<em class="sig">${dark ? t('signed') : t('blessed')}</em>`);
    SFX.play(dark ? 'bad' : 'win'); await new Promise(r => setTimeout(r, 650));
    if (id === 'mark') { closeModal(); target = await pickTarget(t('markQ'), t('markSub'), null, true); }
    if (id === 'exactor') { closeModal(); target = await pickTarget(t('exactorQ'), t('exactorSub'), null, true); }
    closeModal(); offerKey = ''; act('deal', { id, target });
  });
  if ($('dealNo')) $('dealNo').onclick = async () => {
    if (done) return; done = true;
    $('modalBody').querySelector('.contract').classList.add('burning'); SFX.play('flip');
    await new Promise(r => setTimeout(r, 900));
    closeModal(); offerKey = ''; act('deal', { id: null });
  };
}

// ================= ITEMS =================
const ITEM_ICON = (() => {
  const s = inner => `<svg class="dico" viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor" stroke="none">${inner}</g></svg>`;
  const cut = d => `<path d="${d}" fill="none" stroke="var(--cut, #000)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
  return {
    rent: s('<circle cx="12" cy="18" r="9"/><circle cx="20" cy="13" r="9" opacity=".8"/>' + cut('M20 8v10M17 10.5c1-1.2 5-1.2 5 .8s-5 1.4-5 3.4 4 2 5 .8')),
    veil: s('<path d="M20 3A13 13 0 1 0 29 22 10.5 10.5 0 1 1 20 3z"/><path d="M2 27h28v3H2z"/>' + cut('M6 24c4-2 8-2 12 0s8 2 12 0')),
    dawn: s('<path d="M4 24a12 12 0 0 1 24 0z"/><path d="M2 26h28v3H2z"/><path d="M16 3v6M6 8l3.5 4M26 8l-3.5 4" stroke="currentColor" stroke-width="2.4" fill="none"/>' + cut('M10 24a6 6 0 0 1 12 0')),
    shell: s('<path d="M16 2 28 7v9c0 7-5.6 12-12 14C9.6 28 4 23 4 16V7z"/>' + cut('M16 6v20M9 10l7 4 7-4M9 18l7 4 7-4')),
    oven: s('<rect x="4" y="6" width="24" height="23" rx="2"/><path d="M9 2h3v4H9zM20 2h3v4h-3z"/>' + cut('M8 13h16v12H8zM12 22c0-3 2-3 2-6 2 2 4 3 4 6a3 3 0 0 1-6 0z')),
    eclipse: s('<circle cx="16" cy="16" r="12"/><path d="M16 1v3M16 28v3M1 16h3M28 16h3M5.4 5.4l2.1 2.1M24.5 24.5l2.1 2.1M5.4 26.6l2.1-2.1M24.5 7.5l2.1-2.1" stroke="currentColor" stroke-width="2" fill="none"/>' + cut('M20 6a10 10 0 0 1 0 20 12 12 0 0 0 0-20z')),
    twoface: s('<path d="M16 3C9 3 5 8.5 5 15s4 14 11 14z"/><path d="M16 3c7 0 11 5.5 11 12s-4 14-11 14z" opacity=".55"/>' + cut('M9 13h4M19 13h4M11 21c2 1.5 3 1.5 5 0M16 21c2 2 4 2 6 0M16 3v26')),
    ward: s('<path d="M16 2c3 4 9 5 12 5 0 12-5 19-12 23C9 26 4 19 4 7c3 0 9-1 12-5z"/>' + cut('M16 9v14M10 15h12M12 12l8 8M20 12l-8 8')),
    penance: s('<path d="M9 13V9a7 7 0 0 1 14 0v4h-3V9a4 4 0 0 0-8 0v4z"/><rect x="6" y="13" width="20" height="16" rx="1.5"/>' + cut('M16 18v5M13 27h6')),
    bail: s('<circle cx="10" cy="16" r="7"/><path d="M15 14.5h14v3h-3v4h-3v-4h-2v3h-3v-3h-3z"/>' + cut('M10 16m-2.4 0a2.4 2.4 0 1 0 4.8 0 2.4 2.4 0 1 0-4.8 0')),
    cross: s('<path d="M14.5 2h3v18h6v3h-6v7h-3v-7h-6v-3h6z"/>' + cut('M12 26h8')),
    bag: s('<path d="M10 9h12l5 20H5z"/><path d="M12 9c0-6 8-6 8 0" stroke="currentColor" stroke-width="2.2" fill="none"/>' + cut('M9 16h14'))
  };
})();
