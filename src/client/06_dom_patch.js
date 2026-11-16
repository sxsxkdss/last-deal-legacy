// Patch a container of cards to match new markup, reusing elements whose face is unchanged (matched by data-id).
const PARSE = document.createElement('template');
function cardSig(el) { // everything that decides how the face is drawn, except state classes and layout style
  return el.dataset.f + '|' + el.dataset.id + '|' + [...el.classList].filter(c => !STATE_CLS.has(c) && !/^(sel\d|ch\d)$/.test(c)).sort().join(' ') + '|' + el.innerHTML.length;
}
const STATE_CLS = new Set(['ok', 'dim', 'jump', 'locked', 'picked', 'sel', 'new', 'flipin', 'nope', 'lifted', 'uniq', 'topc', 'under']);
function patchCards(wrap, html, byId, wire = true) {
  PARSE.innerHTML = html;
  const next = [...PARSE.content.children];
  const old = new Map(); for (const el of wrap.children) if (el.dataset && el.dataset.id) old.set(el.dataset.id, el);
  const keep = [];
  for (const n of next) {
    const id = n.dataset && n.dataset.id;
    const o = id ? old.get(id) : null;
    if (o && !o.classList.contains('lifted') && cardSig(o) === cardSig(n)) {
      old.delete(id);
      const cls = n.className.replace(/\bnew\b/, '').trim();
      const want = o.classList.contains('flipin') ? cls + ' flipin' : cls;
      if (o.className !== want) o.className = want;
      const st = n.getAttribute('style').replace(/;?animation-delay:[^;]*/, '');
      if (o.getAttribute('style') !== st) o.setAttribute('style', st);
      keep.push(o);
    } else keep.push(n);
  }
  for (const el of old.values()) el.remove();
  for (const el of [...wrap.children]) if (!el.dataset || !el.dataset.id) el.remove(); // row breaks are rebuilt
  let prev = null;
  for (const el of keep) {
    const at = prev ? prev.nextSibling : wrap.firstChild;
    if (el !== at) wrap.insertBefore(el, at);
    prev = el;
  }
  if (wire) for (const el of keep) if (el.dataset && el.dataset.id) attachCard(el, byId[el.dataset.id]);
}
// Patch a list of keyed blocks (seats, badges): a block is replaced only when its own markup changed.
function patchBlocks(wrap, items) {
  const old = new Map(); for (const el of wrap.children) if (el.__key != null) old.set(el.__key, el);
  const keep = items.map(({ key, html }) => {
    const o = old.get(key);
    if (o && o.__html === html) { old.delete(key); return o; }
    PARSE.innerHTML = html; const n = PARSE.content.firstElementChild; n.__key = key; n.__html = html; return n;
  });
  for (const el of [...wrap.children]) if (!keep.includes(el)) el.remove();
  let prev = null;
  for (const el of keep) { const at = prev ? prev.nextSibling : wrap.firstChild; if (el !== at) wrap.insertBefore(el, at); prev = el; }
  wrap.__html = null;
}
