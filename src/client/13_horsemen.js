// ================= THE HORSEMEN =================
const HORSE_ICON = (() => {
  const s = inner => `<svg class="dico" viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor" stroke="none">${inner}</g></svg>`;
  const cut = d => `<path d="${d}" fill="none" stroke="var(--cut, #000)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
  return {
    death: s('<path d="M6 30 24 4l2.6 1.8L8.6 31.6z"/><path d="M22.5 6.5C17 3 9 3.5 3 9c6-2 12-1.4 17.4 2.6z"/>' + cut('M8 8.4c3.6-1.6 7.6-1.6 11 .4')),
    war: s('<path d="M4 4l3 0 17 17-3 3L4 7z"/><path d="M28 4l-3 0L8 21l3 3L28 7z"/><path d="M5 23l4 4-3 3-4-4zM27 23l-4 4 3 3 4-4z"/>' + cut('M7 7l12 12M25 7 13 19')),
    famine: s('<path d="M3 14h26c0 7-5.6 12-13 12S3 21 3 14z"/><path d="M11 26h10v3H11z"/>' + cut('M7.5 17.5c1.5 3 4.6 5 8.5 5M16 14l-2 5 3 2-1.6 4')),
    plague: s('<ellipse cx="16" cy="19" rx="5" ry="8"/><circle cx="16" cy="9" r="3.6"/><path d="M11.5 15C6 8 2 11 3 15c1 3 5 3 8.5 2zM20.5 15C26 8 30 11 29 15c-1 3-5 3-8.5 2z" opacity=".75"/><path d="M13 5 10 2M19 5l3-3" stroke="currentColor" stroke-width="1.6" fill="none"/>' + cut('M12 18h8M12.5 22h7')),
    dark: s('<path d="M2 16C7 8 25 8 30 16 25 24 7 24 2 16z"/>' + cut('M6 16c5 4 15 4 20 0M10 20l-1.5 3M16 21.4V25M22 20l1.5 3')),
    fever: s('<path d="M13 4a3 3 0 0 1 6 0v14.6a6 6 0 1 1-6 0z"/>' + cut('M16 8v13M19.5 8h2M19.5 12h2M19.5 16h2')),
    mirror: s('<ellipse cx="16" cy="12" rx="9" ry="10"/><path d="M14 21h4v9h-4z"/>' + cut('M11 8c1-2 3-3 5-3M19 15l-5 3')),
    static: s('<rect x="3" y="7" width="26" height="19" rx="2"/><path d="M11 2l5 5 5-5" stroke="currentColor" stroke-width="1.8" fill="none"/>' + cut('M7 16l3-4 3 7 3-6 3 5 3-4 3 3'))
  };
})();
function myCurse() { const h = G && G.horse; return h && h.k === 'death' && h.left > 0 && !G.warded(ME) ? h.curses[ME] || null : null; }
let curseOn = '', feverSeed = 1, warEnd = 0, warMine = false;
function drawHorse() {
  const h = G && G.horse && G.horse.left > 0 && (!MATCH || MATCH.phase === 'play') ? G.horse : null;
  const bar = $('horseBar');
  if (!h) { bar.classList.add('hidden'); setCurse(''); warMine = false; $('warClock').classList.add('hidden'); return; }
  const c = myCurse();
  bar.classList.remove('hidden'); bar.className = 'hb-' + h.k;
  setHTML(bar, `${HORSE_ICON[h.k]}<b>${t('horse_' + h.k)}</b><span>${c ? `${HORSE_ICON[c]}<em>${t('curse_' + c)}</em> · ${t('curseD_' + c)}` : t('horseD_' + h.k + '_' + h.v)}</span><i>${t('horseLeft', h.left)}</i>`);
  setCurse(c || '');
  const w = MATCH && MATCH.war;
  warMine = !!(w && w[0] === ME && G.turn === ME && G.winner === null && !G.warded(ME));
  if (warMine) warEnd = performance.now() + w[1];
}
// Static: the old-software crash keeps hitting while the curse lasts
setInterval(() => { if (curseOn === 'static' && !document.hidden && Math.random() < 0.55) { JUICE.glitch(true); if (Math.random() < 0.35) setTimeout(() => JUICE.glitch(true), 260); } }, 2200);
function setCurse(c) {
  if (c === curseOn) return;
  document.body.classList.remove('curse-' + curseOn);
  curseOn = c;
  if (c) document.body.classList.add('curse-' + c);
  $('curseDark').classList.toggle('hidden', c !== 'dark');
  $('curseStatic').classList.toggle('hidden', c !== 'static');
  if (c === 'dark' && !curseDarkMoved) { const r = $('hand').getBoundingClientRect(); moveDark(r.left + r.width / 2, r.top + r.height / 2); }
}
let curseDarkMoved = false, darkRaf = 0, darkXY = [0, 0];
function moveDark(x, y) { darkXY = [x, y]; if (darkRaf) return; darkRaf = requestAnimationFrame(() => { darkRaf = 0; const el = $('curseDark'); el.style.setProperty('--mx', darkXY[0] + 'px'); el.style.setProperty('--my', darkXY[1] + 'px'); }); }
addEventListener('pointermove', e => { if (curseOn === 'dark') { curseDarkMoved = true; moveDark(e.clientX, e.clientY); } }, { passive: true });
addEventListener('pointerdown', e => { if (curseOn === 'dark') { curseDarkMoved = true; moveDark(e.clientX, e.clientY); } }, { passive: true });
// Fever: the hand reshuffles itself every 2 seconds (never while you hold a card)
setInterval(() => { if (curseOn === 'fever' && !dragging && G && !document.hidden) { feverSeed++; render(); } }, 1000);
function feverShuffle(a) {
  let x = feverSeed * 9301 + 49297; const r = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// War: the turn clock, shown big for the player whose turn it is
setInterval(() => {
  const el = $('warClock');
  if (!warMine) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
  const left = warEnd - performance.now(), n = Math.max(0, Math.ceil(left / 1000));
  el.classList.toggle('hidden', n <= 0);
  if (el.textContent !== String(n)) { el.textContent = n; el.classList.toggle('hot', n <= 2); el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
}, 100);
function horsePop(k, v) {
  const el = $('horsePop'), c = myCurse();
  el.className = 'hp-' + k;
  el.innerHTML = `<div class="hpIn"><small>${t('horseRides')}</small>${HORSE_ICON[k]}<h2>${t('horse_' + k)}</h2><p>${t('horseD_' + k + '_' + v)}</p>${c ? `<p class="hpCurse">${HORSE_ICON[c]}<b>${t('curse_' + c)}</b> ${t('curseD_' + c)}</p>` : ''}</div>`;
  clearTimeout(horsePop.tm); horsePop.tm = setTimeout(() => el.classList.add('hidden'), 4200);
}
document.addEventListener('click', e => {
  const u = e.target.closest && e.target.closest('[data-use]');
  if (u && !u.disabled) { SFX.play('lucky'); act('item', { id: u.dataset.use }); }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ab]'); if (!b || b.disabled || !G) return;
  const k = b.dataset.ab;
  if (k === 'confess') {
    if (!confessSel) { confessSel = new Set(); toast(t('abConfessHint')); render(); return; }
    const codes = G.players[ME].hand.filter(c => confessSel.has(c.id)).map(cardCode); confessSel = null;
    if (codes.length) act('ability', { ab: 'confess', cards: codes }); else render();
    return;
  }
  act('ability', { ab: k });
});
