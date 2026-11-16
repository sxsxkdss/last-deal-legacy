// ================= FX (short, ease-out, no overshoot) =================
function rectOf(el) { return el ? el.getBoundingClientRect() : null; }
function centerRect(r, w, h) { return { left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w, height: h }; }
function fly(html, from, to, { dur = 120, delay = 0, onDone } = {}) {
  if (!from || !to) { if (onDone) onDone(); return; }
  const wrap = document.createElement('div'); wrap.innerHTML = html; const el = wrap.firstElementChild;
  if (!el) return;
  el.style.width = from.width + 'px'; el.style.height = from.height + 'px';
  $('fx').appendChild(el);
  const sx = to.width / from.width, sy = to.height / from.height;
  const tx = to.left + (to.width - from.width) / 2, ty = to.top + (to.height - from.height) / 2;
  const a = el.animate([
    { transform: `translate(${from.left}px,${from.top}px)` },
    { transform: `translate(${tx}px,${ty}px) scale(${sx},${sy})` }
  ], { duration: dur, delay, easing: 'ease-out', fill: 'backwards' });
  a.onfinish = () => { el.remove(); if (onDone) onDone(); };
  setTimeout(() => { if (el.isConnected) el.remove(); }, dur + delay + 400);
}
let toastTimer;
function toast(text) {
  const t = $('toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 900);
}
const UI_ICON = {
  gear: '<svg class="uico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M6.8 1h2.4l.4 2 1.3.6 1.7-1.2 1.7 1.7-1.2 1.7.6 1.3 2 .4v2.4l-2 .4-.6 1.3 1.2 1.7-1.7 1.7-1.7-1.2-1.3.6-.4 2H6.8l-.4-2-1.3-.6-1.7 1.2-1.7-1.7 1.2-1.7L2.4 9.6l-2-.4V6.8l2-.4.6-1.3-1.2-1.7 1.7-1.7 1.7 1.2 1.3-.6zM8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"/></svg>',
  cw: '<svg class="uico" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13.6 1.5v4.4H9.2z" fill="currentColor"/></svg>',
  ccw: '<svg class="uico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.5-3.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.4 1.5v4.4h4.4z" fill="currentColor"/></svg>'
};
function floatText(pi, txt, html) {
  const host = pi === ME ? $('hand') : $('opp' + pi); if (!host) return;
  host.style.position = 'relative';
  const f = document.createElement('div'); f.className = 'float'; if (html) f.innerHTML = html; else f.textContent = txt;
  host.appendChild(f);
  requestAnimationFrame(() => f.classList.add('in'));
  setTimeout(() => f.classList.remove('in'), 900);
  setTimeout(() => f.remove(), 1100);
}
function initials(name) {
  const w = String(name || '?').trim().split(/\s+/);
  return esc((w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase());
}

