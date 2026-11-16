// ================= RENDER =================
// card symbols: crude stencilled icons, drawn as thick strokes and roughened by an SVG filter
const ICON = (() => {
  const s = (inner, fill) => `<svg class="ico" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.7" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${inner}</svg>`;
  const dot = (x, y, r = 1.7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
  return {
    skip: s('<circle cx="12" cy="12" r="8.3"/><path d="M6.3 17.7 17.7 6.3"/>'),
    skipall: s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2"/><path d="M5.6 18.4 18.4 5.6"/>'),
    rev: s('<path d="M3.5 8.5h14M14 5l3.5 3.5L14 12M20.5 15.5h-14M10 12l-3.5 3.5L10 19"/>'),
    flip: s('<path d="M18.5 13A6.8 6.8 0 1 1 16.5 7.2"/><path d="M18.5 3.5v5h-5"/>'),
    dflip: s('<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8a8.2 8.2 0 0 0 0 16.4z" fill="currentColor"/>'),
    mirror: s('<path d="M10.5 5 3.5 12l7 7zM13.5 5l7 7-7 7z"/>'),
    shield: s('<path d="M8 3 4.5 6.5V21h15V6.5L16 3l-4 4.5z"/><path d="M12 7.5V21M8.5 13h1M14.5 13h1"/>'),
    lucky: s('<path d="M6 20.5V11a6 6 0 0 1 12 0v9.5"/><path d="M3.5 20.5h5M15.5 20.5h5"/>' + dot(6, 13.5, 1) + dot(18, 13.5, 1) + dot(8, 8, 1) + dot(16, 8, 1)),
    glass: s('<path d="M5.5 3.5h13l-2.3 17H7.8z"/><path d="M6.8 10h10.4"/>'),
    spin: s('<path d="M4 4h16v16H4zM9.3 4v16M14.7 4v16"/>'),
    loan: s('<path d="M16.5 7.5C15.5 5 8.5 5 8 8.3S16.5 11.5 16.5 15.5 9 19.5 7.5 16.5M12 2.5v19"/>'),
    gift: s('<ellipse cx="12" cy="6.5" rx="7" ry="2.6"/><path d="M5 6.5v11c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7v-11M5 12c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7"/>'),
    echo: s('<path d="M4 5.5l6.5 6.5L4 18.5M12.5 5.5 19 12l-6.5 6.5"/>'),
    freeze: s('<circle cx="7" cy="15" r="4.5"/><circle cx="17" cy="15" r="4.5"/><path d="M9 9.5l3-3 3 3"/>'),
    bomb: s('<path d="M4.5 21V10l2.5-5 2.5 5v11zM14.5 21V10l2.5-5 2.5 5v11z"/><path d="M4.5 16.5h5M14.5 16.5h5"/>'),
    lead: s('<path d="M3 19.5 6.5 9h11L21 19.5z"/><path d="M9 9 10 5h4l1 4"/>'),
    leech: s('<path d="M5 18c-1.8-3 .2-6.5 3.5-6.5s3.4 3.5 6.5 3.5 4.5-3 3-6"/>' + dot(18.4, 7.4, 2.3) + dot(5.6, 18.6, 1.6)),
    fuse: s('<circle cx="10" cy="14.5" r="6.2"/><path d="M14.5 10 17 7.5M17 7.5c1-1.6 2.4-1.6 3.5-.5"/>' + dot(21, 4.2, 1.5)),
    d6: s('<path d="M4 4h16v16H4z"/>' + dot(8.3, 8.3) + dot(15.7, 15.7) + dot(15.7, 8.3) + dot(8.3, 15.7) + dot(12, 12)),
    pill: s('<path d="M3 6.5h18v11H3z"/><path d="M7 10.5h3M12.5 10.5h4.5M7 14h10" stroke-width="1.8"/>'),
    maze: s('<path d="M12 12.2a1.8 1.8 0 1 1 1.8 1.8 4 4 0 1 1-4-4 6.2 6.2 0 1 1 6.2 6.2 8.2 8.2 0 0 1-8.2-8.2"/>'),
    deal: s('<path d="M5.5 3h9.5l3.5 3.5V21h-13z"/><path d="M8.5 9h7M8.5 12.5h7"/>' + dot(14.5, 17, 2.2)),
    swind: s('<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h6"/>'),
    sacr: s('<path d="M12 2.5v13M8.5 6.5h7M9.5 15.5h5L12 21.5z"/>'),
  };
})();
// deals: small stencil glyphs, one per deal
const DEAL_ICON = (() => {
  // 32×32 stencil glyphs: a solid body (fill) with cut-out detail (stroke in the paper colour), drawn for this game
  const s = inner => `<svg class="dico" viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor" stroke="none">${inner}</g></svg>`;
  const cut = d => `<path d="${d}" fill="none" stroke="var(--cut, #000)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
  return {
    angel: s('<circle cx="16" cy="6" r="3.4"/><path d="M16 11c-3 0-4.5 2.2-4.5 5.2V28h9V16.2C20.5 13.2 19 11 16 11z"/><path d="M11.5 15C6 14 3 17 2 21c4 0 7-1 9.5-3zM20.5 15c5.5-1 8.5 2 9.5 6-4 0-7-1-9.5-3z"/>' + cut('M14 20h4M16 18v6')),
    demon: s('<path d="M16 4 4 28h24z"/><path d="M8 7c-1 3 0 5 2 6M24 7c1 3 0 5-2 6" stroke="currentColor" stroke-width="2.4" fill="none"/>' + cut('M12.5 20.5l2 1.5M19.5 20.5l-2 1.5M13 25h6')),
    rosary: s('<circle cx="16" cy="4" r="1.8"/><circle cx="21.5" cy="5.8" r="1.8"/><circle cx="25" cy="10.5" r="1.8"/><circle cx="25" cy="16" r="1.8"/><circle cx="10.5" cy="5.8" r="1.8"/><circle cx="7" cy="10.5" r="1.8"/><circle cx="7" cy="16" r="1.8"/><circle cx="10.5" cy="20.5" r="1.8"/><circle cx="21.5" cy="20.5" r="1.8"/><path d="M14.6 22h2.8v3h3v2.6h-3V31h-2.8v-3.4h-3V25h3z"/>'),
    candle: s('<path d="M16 2c3 3.4 3.4 6.2 0 8.4-3.4-2.2-3-5 0-8.4z"/><rect x="11.5" y="12" width="9" height="15" rx="1"/><path d="M8 27h16v3H8z"/>' + cut('M14 16v7M18 14c0 2-1 2-1 4')),
    wind: s('<path d="M3 10h14a4 4 0 1 0-4-4h-3a7 7 0 1 1 7 7H3zM3 16h20a4.5 4.5 0 1 1-4.5 4.5h3a1.5 1.5 0 1 0 1.5-1.5H3zM3 22h9v3H3z"/>'),
    halo: s('<path d="M16 3c7 0 12 1.8 12 4.2S23 11.4 16 11.4 4 9.6 4 7.2 9 3 16 3zm0 2.6c-5 0-8.4 1-8.4 1.6S11 8.8 16 8.8s8.4-1 8.4-1.6S21 5.6 16 5.6z" fill-rule="evenodd"/><path d="M16 14c-4 0-6.5 3-6.5 7v9h13v-9c0-4-2.5-7-6.5-7z"/>' + cut('M13 22h6')),
    confess: s('<path d="M5 3h22v26H5z"/>' + cut('M16 3v26M5 11h22M5 19h22M9 7h3M20 7h3') + '<circle cx="16" cy="30" r="1.2"/>'),
    alms: s('<path d="M3 15h26c0 6.5-5.8 11-13 11S3 21.5 3 15z"/><circle cx="16" cy="9" r="4.5"/><circle cx="23" cy="11" r="2.5"/>' + cut('M14.5 9h3M16 7.5v3M8 19c2 2.6 5 3.6 8 3.6')),
    clean: s('<path d="M16 2c6 7 9 11.5 9 16a9 9 0 0 1-18 0c0-4.5 3-9 9-16z"/>' + cut('M12 19c0 2.6 1.8 4.4 4 4.8')),
    grace: s('<path d="M27 3C14 3 6.5 10 5 25l2.5 2C9.5 18 15 12 21 10c-4 3.5-6.5 7.5-7.5 12.5 7-1.5 12-7.5 13.5-19.5z"/>' + cut('M10 22l7-8')),
    guardian: s('<path d="M16 2 4.5 6.5V15c0 7 4.7 12.3 11.5 15 6.8-2.7 11.5-8 11.5-15V6.5z"/>' + cut('M10.5 15.5l4 4 7.5-8')),
    penance: s('<path d="M9 13V9a7 7 0 0 1 14 0v4h-3V9a4 4 0 0 0-8 0v4z"/><rect x="6" y="13" width="20" height="16" rx="1.5"/>' + cut('M16 18v5M13 27h6')),
    double: s('<path d="M7 29 22 5l3 2L10 31zM12 29 27 5l3 2L15 31z" opacity=".95"/><path d="M4 22h9v3H4zM9 22h9v3H9z"/>'),
    usury: s('<ellipse cx="16" cy="7" rx="10" ry="3.5"/><path d="M6 7v4.5c0 1.9 4.5 3.5 10 3.5s10-1.6 10-3.5V7c0 1.9-4.5 3.5-10 3.5S6 8.9 6 7zM6 13.5V18c0 1.9 4.5 3.5 10 3.5s10-1.6 10-3.5v-4.5c0 1.9-4.5 3.5-10 3.5s-10-1.6-10-3.5zM6 20v4.5C6 26.4 10.5 28 16 28s10-1.6 10-3.5V20c0 1.9-4.5 3.5-10 3.5S6 21.9 6 20z"/>'),
    chains: s('<path d="M3 13a5 5 0 0 1 5-5h6a5 5 0 0 1 0 10H8a5 5 0 0 1-5-5zm5-2.2a2.2 2.2 0 0 0 0 4.4h6a2.2 2.2 0 0 0 0-4.4z" fill-rule="evenodd"/><path d="M13 19a5 5 0 0 1 5-5h6a5 5 0 0 1 0 10h-6a5 5 0 0 1-5-5zm5-2.2a2.2 2.2 0 0 0 0 4.4h6a2.2 2.2 0 0 0 0-4.4z" fill-rule="evenodd"/>'),
    blood: s('<path d="M16 2c6.5 7.5 9.5 12 9.5 16.5a9.5 9.5 0 0 1-19 0C6.5 14 9.5 9.5 16 2z"/><circle cx="25" cy="27" r="2.5"/><circle cx="6" cy="29" r="1.6"/>' + cut('M11.5 18.5c0 2.6 1.8 4.6 4.5 5')),
    bail: s('<circle cx="10" cy="16" r="7"/><path d="M15 14.5h14v3h-3v4h-3v-4h-2v3h-3v-3h-3z"/>' + cut('M10 16m-2.4 0a2.4 2.4 0 1 0 4.8 0 2.4 2.4 0 1 0-4.8 0')),
    devour: s('<path d="M3 6h26v8c0 3-2 5-5 5H8c-3 0-5-2-5-5z"/><path d="M5 21h22v3c0 3-2.5 5-5.5 5h-11C7.5 29 5 27 5 24z"/>' + cut('M7 6l2.5 6L12 6l2.5 6L17 6l2.5 6L22 6l2.5 6L27 6M8 29l2-5 2 5 2-5 2 5 2-5 2 5 2-5 2 5')),
    mark: s('<path d="M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28zm0 4.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z" fill-rule="evenodd"/><circle cx="16" cy="16" r="3"/><path d="M14.8 0h2.4v8h-2.4zM14.8 24h2.4v8h-2.4zM0 14.8h8v2.4H0zM24 14.8h8v2.4h-8z"/>'),
    drum: s('<path d="M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26z"/>' + cut('M16 9.2m-2.6 0a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0M22.2 13.8m-2.6 0a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0M9.8 13.8m-2.6 0a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0M19.8 21.4m-2.6 0a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0M12.2 21.4m-2.6 0a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0') + '<circle cx="16" cy="16" r="1.4"/>'),
    puppet: s('<path d="M4 3h24v3H4z"/><path d="M9 6h1v9H9zM22 6h1v7h-1zM15.5 6h1v5h-1z"/><circle cx="16" cy="14" r="3.2"/><path d="M12.5 18.5h7l1.5 6h-3v6h-1.5v-5h-1v5H14v-6h-3z"/><path d="M8.5 15h2l2 4-1.6.8zM21.5 13h2l-2.5 6.5-1.6-.8z"/>'),
    sharp: s('<path d="M2 16S7.5 6 16 6s14 10 14 10-5.5 10-14 10S2 16 2 16z"/>' + cut('M16 16m-4.6 0a4.6 4.6 0 1 0 9.2 0 4.6 4.6 0 1 0-9.2 0') + '<circle cx="16" cy="16" r="1.8" fill="var(--cut, #000)" opacity=".55"/>')
  };
})();
const isLightDeal = d => LIGHT_DEALS.includes(d);
// iron chain across a locked card: links alternate face-on and edge-on, shaded like old metal
// chained cards: thorned chains of black iron lit red from behind, thin barbed strands under them, a red haze over the face
const CHAIN_SVGS = [0, 1, 2, 3, 4, 5].map(vi => {
  let seed = 977 + vi * 7919; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const thorns = (len, w, n, big) => { let d = ''; for (let i = 0; i < n; i++) { const x = -len / 2 + (i + 0.5) * len / n + (r() - 0.5) * 2, side = i % 2 ? 1 : -1, h = big * (0.6 + r() * 0.8), lean = (r() - 0.5) * 3; d += `M${(x - 1.4).toFixed(1)} ${(side * w).toFixed(1)}L${(x + lean).toFixed(1)} ${(side * (w + h)).toFixed(1)}L${(x + 1.4).toFixed(1)} ${(side * w).toFixed(1)}Z`; } return d; };
  // a heavy chain: long rectangular links, alternating face-on and edge-on, thorns on the edge-on ones
  const chain = (x0, y0, ang, n, L, W, t) => {
    const rad = ang * Math.PI / 180, dx = Math.cos(rad) * L * 0.78, dy = Math.sin(rad) * L * 0.78; let body = '', rim = '';
    for (let k = 0; k < n; k++) {
      const x = (x0 + k * dx).toFixed(1), y = (y0 + k * dy).toFixed(1), g = `transform="translate(${x} ${y}) rotate(${ang})"`;
      if (k % 2 === 0) {
        const sh = `<rect x="${-L / 2}" y="${-W / 2}" width="${L}" height="${W}" rx="1.6" fill="none" stroke-width="${t}"/>`;
        body += `<g ${g}>${sh}</g>`; rim += `<g ${g}>${sh}</g>`;
      } else {
        const bar = `<rect x="${-L / 2}" y="${-t * 0.6}" width="${L}" height="${t * 1.2}" rx="1"/>`, th = `<path d="${thorns(L * 0.9, t * 0.6, 5, t * 1.5)}"/>`;
        body += `<g ${g}>${bar}${th}</g>`; rim += `<g ${g}>${bar}${th}</g>`;
      }
    }
    return { body, rim };
  };
  // a thin barbed strand
  const strand = (x0, y0, x1, y1, n) => {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    return `<g transform="translate(${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}) rotate(${ang.toFixed(1)})"><rect x="${(-len / 2).toFixed(1)}" y="-.5" width="${len.toFixed(1)}" height="1"/><path d="${thorns(len, 0.4, n, 2.6)}"/></g>`;
  };
  // never a mirrored pair: each variant throws its chains at its own angles and offsets
  const rr = (a, b) => a + r() * (b - a), flip = vi % 2 ? -1 : 1, cx = x => flip > 0 ? x : 100 - x, ca = a => flip > 0 ? a : -180 - a;
  const a1 = rr(-72, -48), a2 = rr(-150, -128), t1 = rr(4.6, 5.4), t2 = rr(2.8, 3.6);
  const A = chain(cx(rr(-14, 18)), rr(150, 175), ca(a1), 14, rr(23, 27), rr(9.5, 11), t1);
  const B = chain(cx(rr(95, 118)), rr(118, 150), ca(a2), 13, rr(15, 18), rr(6, 7.5), t2);
  const wires = strand(-5, rr(20, 60), 105, rr(40, 90), 26) + strand(-5, rr(90, 130), 105, rr(70, 120), 24) + (r() < 0.6 ? strand(rr(10, 90), -5, rr(0, 100), 152, 22) : '');
  return `<svg viewBox="0 0 100 147" preserveAspectRatio="none"><defs><filter id="chg" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter></defs>`
    + `<g fill="#1a0507" stroke="#1a0507" opacity=".8">${wires}</g><g fill="#c41e1a" stroke="none" opacity=".35" filter="url(#chg)">${wires}</g>`
    + `<g stroke="#e0281e" fill="#e0281e" opacity=".75" filter="url(#chg)">${A.rim}${B.rim}</g>`
    + `<g stroke="#0c0203" fill="#0c0203">${A.body}${B.body}</g>`
    + `<g stroke="#ff4a30" fill="none" stroke-width=".35" opacity=".55">${A.rim.replace(/stroke-width="[\d.]+"/g, '')}${B.rim.replace(/stroke-width="[\d.]+"/g, '')}</g></svg>`;
});
// ================= BAKED TEXTURES =================
// SVG noise (feTurbulence) and the blurred chains are drawn once into bitmaps at start-up; the page then only
// stretches pictures instead of re-running SVG filters for every card size (Firefox re-ran them constantly).
const BAKE = (() => {
  const svgURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const toBlobURL = (src, w, h) => new Promise(res => {
    const img = new Image();
    img.onload = () => { try { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); c.toBlob(b => res(b ? URL.createObjectURL(b) : null), 'image/png'); } catch (e) { res(null); } };
    img.onerror = () => res(null);
    img.src = src;
  });
  const set2x = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('background-image', 'image-set(url("x.png") 2x)');
  const css = []; const st = document.createElement('style'); document.head.appendChild(st);
  // chains: vector first (works at once), bitmaps as soon as they're baked
  CHAIN_SVGS.forEach((svg, k) => { css[k] = `.card .chainov.cv${k}{background:url("${svgURL(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}") center / 100% 100% no-repeat}`; });
  st.textContent = css.join('\n');
  async function run() {
    const root = getComputedStyle(document.documentElement);
    for (const v of ['--noise', '--tex-grain', '--tex-ink', '--tex-static']) {
      const m = /url\(\s*"(data:[\s\S]*)"\s*\)\s*$/.exec(root.getPropertyValue(v).trim()); if (!m) continue;
      const src = m[1], w = +(/width=(?:'|%27)(\d+)/.exec(src) || [])[1] || 140, h = +(/height=(?:'|%27)(\d+)/.exec(src) || [])[1] || w;
      const u = await toBlobURL(src, set2x ? w * 2 : w, set2x ? h * 2 : h); if (!u) continue;
      document.documentElement.style.setProperty(v, set2x ? `image-set(url("${u}") 2x)` : `url("${u}")`);
    }
    await Promise.all(CHAIN_SVGS.map(async (svg, k) => {
      const u = await toBlobURL(svgURL(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')), 300, 441);
      if (u) css[k] = `.card .chainov.cv${k}{background:url("${u}") center / 100% 100% no-repeat}`;
    }));
    st.textContent = css.join('\n');
  }
  (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => run());
  return { run };
})();
const LOCK_SVG = `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#120807" stroke="#2c1612" stroke-width="3"/>`
  + `<g fill="#120807" stroke="#2c1612" stroke-width="1.2">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path transform="rotate(${a} 20 20)" d="M18 4.5 20 0l2 4.5z"/>`).join('')}</g>`
  + `<circle cx="20" cy="20" r="12.5" fill="none" stroke="#ff3d1a" stroke-width="1" stroke-opacity=".8"/>`
  + `<g stroke="#ff3d1a" stroke-width=".8" stroke-opacity=".7">${[0, 60, 120, 180, 240, 300].map(a => `<path transform="rotate(${a} 20 20)" d="M20 7.5v3"/>`).join('')}</g></svg>`;
// [center, label key, small] ; text faces stay typographic, action faces use the vector icons
const SYM = {
  skip: [ICON.skip], rev: [ICON.rev], d1: ['+1'], d2: ['+2'], d4: ['+4'], d5: ['+5'], flip: [ICON.flip, 'flip'], dflip: [ICON.dflip, 'dflip', 'sm'],
  discall: ['ALL', 'discall', 'sm'], skipall: [ICON.skipall, 'skipall'], mirror: [ICON.mirror, 'mirror'], shield: [ICON.shield, 'shield'],
  wild: ['', 'wild'], wd2: ['+2'], wd4: ['+4'], wrd4: ['+4', 'reverse'], wd6: ['+6'], wd10: ['+10'], wd15: ['+15'],
  wrd8: ['+8', 'reverse'], wdc: ['+?', 'wdc'], roul: ['?', 'roul'],
  mul2: ['×2', 'mult'], mul3: ['×3', 'mult3'], lucky: [ICON.lucky, 'lucky'], glass: [ICON.glass, 'glass'], spin: ['777', 'spin', 'sm'], loan: [ICON.loan, 'loan'],
  gift: [ICON.gift, 'gift'], echo: [ICON.echo, 'echo'], freeze: [ICON.freeze, 'freeze'], bomb: [ICON.bomb, 'bomb'],
  lead: [ICON.lead, 'lead'], leech: [ICON.leech, 'leech'], fuse: [ICON.fuse, 'fuse'],
  d6: [ICON.d6, 'd6'], pill: [ICON.pill, 'pill', 'sm'], maze: [ICON.maze, 'maze'], deal: [ICON.deal, 'deal'], swind: [ICON.swind, 'swind'], sacr: [ICON.sacr, 'sacr'],
};
const CORNER = { lead: ICON.lead, leech: ICON.leech, fuse: ICON.fuse, swind: ICON.swind, sacr: ICON.sacr, skip: ICON.skip, rev: ICON.rev, d1: '+1', d2: '+2', d4: '+4', d5: '+5', flip: ICON.flip, dflip: ICON.dflip, discall: 'A', skipall: ICON.skipall, mirror: ICON.mirror, shield: ICON.shield, wild: 'W', wd2: '+2', wd4: '+4', wrd4: '+4', wd6: '+6', wd10: '+10', wd15: '+15', wrd8: '+8', wdc: '+?', roul: '?', mul2: '×2', mul3: '×3', lucky: ICON.lucky, glass: ICON.glass, spin: '7', loan: '$', gift: ICON.gift, echo: ICON.echo, freeze: ICON.freeze, bomb: ICON.bomb, d6: ICON.d6, pill: ICON.pill, maze: ICON.maze, deal: ICON.deal };
// every colour also has a shape, so a card never depends on colour alone
const SUIT_PATH = { r: 'M5 1L9.5 9H.5z', y: 'M5 .8a4.2 4.2 0 1 0 0 8.4A4.2 4.2 0 1 0 5 .8z', g: 'M1.3 1.3h7.4v7.4H1.3z', b: 'M5 .3L9.7 5 5 9.7.3 5z',
  p: 'M3.6 .8h2.8v2.8h2.8v2.8H6.4v2.8H3.6V6.4H.8V3.6h2.8z', t: 'M5 .6a4.4 4.4 0 1 0 0 8.8A4.4 4.4 0 1 0 5 .6zm0 2.5a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 1 1 0-3.8z', o: 'M1 .8h8L5 5zM1 9.2h8L5 5z', v: 'M6.3.6A4.4 4.4 0 1 0 9.4 7.3 3.5 3.5 0 1 1 6.3.6z' };
const suitSVG = (c, cls = '') => SUIT_PATH[c] ? `<svg class="suit ${cls}" viewBox="0 0 10 10" aria-hidden="true"><path fill-rule="evenodd" d="${SUIT_PATH[c]}"/></svg>` : '';
// ================= WEAR: every card is beaten up in its own way =================
// A seeded random per card decides its stains, burns, creases, scratches, faded ink and the shape of its torn edge.
const WEAR = (() => {
  const N = 40; // torn-edge outlines, generated once
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function outline(r) {
    // walk around a 100×147 card: fibrous roughness everywhere, rounded worn corners, a chipped corner now and then, a tear or two
    const W = 100, H = 147, pts = [];
    const rad = [0, 1, 2, 3].map(() => 3 + r() * 7), chip = [0, 1, 2, 3].map(() => r() < 0.28);
    const tears = []; const nT = r() < 0.55 ? 1 + (r() < 0.35 ? 1 : 0) : 0;
    for (let k = 0; k < nT; k++) tears.push({ side: Math.floor(r() * 4), at: 0.15 + r() * 0.7, w: 0.03 + r() * 0.07, d: 2.5 + r() * 6 });
    const rough = () => r() * 1.5;
    const edge = (x0, y0, x1, y1, nx, ny, side, len) => {
      const steps = Math.max(6, Math.round(len / 2.6));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps; let d = rough();
        for (const tr of tears) if (tr.side === side) { const u = Math.abs(t - tr.at) / tr.w; if (u < 1) d += tr.d * (1 - u) * (0.6 + r() * 0.8); }
        pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
      }
    };
    const corner = (cx, cy, a0, i) => {
      const R = rad[i];
      if (chip[i]) { const c = R * 1.4; pts.push([cx + Math.cos(a0) * c, cy + Math.sin(a0) * c]); pts.push([cx + Math.cos(a0 + Math.PI / 2) * c, cy + Math.sin(a0 + Math.PI / 2) * c]); return; }
      for (let k = 0; k <= 5; k++) { const a = a0 + (Math.PI / 2) * (k / 5); const rr = R + rough() * 0.8; pts.push([cx + Math.cos(a) * rr - Math.cos(a0 + Math.PI / 4) * 0, cy + Math.sin(a) * rr]); }
    };
    // top edge, top-right corner, right edge, ... (corner centres sit inside by the radius)
    edge(rad[0], 0, W - rad[1], 0, 0, 1, 0, W); corner(W - rad[1], rad[1], -Math.PI / 2, 1);
    edge(W, rad[1], W, H - rad[2], -1, 0, 1, H); corner(W - rad[2], H - rad[2], 0, 2);
    edge(W - rad[2], H, rad[3], H, 0, -1, 2, W); corner(rad[3], H - rad[3], Math.PI / 2, 3);
    edge(0, H - rad[3], 0, rad[0], 1, 0, 3, H); corner(rad[0], rad[0], Math.PI, 0);
    return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
  }
  const css = [];
  for (let i = 0; i < N; i++) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 147' preserveAspectRatio='none'><path d='${outline(rng(i * 7919 + 13))}' fill='black'/></svg>`;
    const url = `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23')}")`;
    css.push(`.card.tear${i}{--tear:${url}}`);
  }
  // burn marks: ragged char in dark tones, drawn once as sprites. Soot halo, a scorched ring, a black char core with cracks;
  // the same core shape is the hole when a burn has eaten through the edge.
  const NB = 16;
  const blob = (r, R, rough, max = 48) => {
    const h = [1, 2, 3, 5, 8, 13].map(k => ({ k, a: r() * rough / Math.sqrt(k), p: r() * Math.PI * 2 }));
    const pts = []; for (let i = 0; i < 72; i++) { const t = i / 72 * Math.PI * 2; let f = 1; for (const q of h) f += q.a * Math.sin(q.k * t + q.p); f += (r() - 0.5) * rough * 0.2; const rr = Math.min(max, R * f); pts.push([50 + Math.cos(t) * rr, 50 + Math.sin(t) * rr]); }
    return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
  };
  const enc = svg => `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23')}")`;
  for (let i = 0; i < NB; i++) {
    const r = rng(i * 104729 + 7);
    const halo = blob(r, 38, 0.3), scorch = blob(r, 31, 0.26, 44), sear = blob(r, 27, 0.22, 40), core = blob(r, 23, 0.32, 36);
    const cracks = Array.from({ length: 3 + Math.floor(r() * 3) }, () => { const a = r() * 6.28, l = 7 + r() * 10; let x = 50 + Math.cos(a) * 3, y = 50 + Math.sin(a) * 3, d = `M${x.toFixed(1)} ${y.toFixed(1)}`; for (let k = 0; k < 3; k++) { const b = a + (r() - 0.5) * 1.2; x += Math.cos(b) * l / 3; y += Math.sin(b) * l / 3; d += `L${x.toFixed(1)} ${y.toFixed(1)}`; } return d; }).join('');
    const mot = Array.from({ length: 5 }, (_, k) => { const a = r() * 6.28, d = r() * 11, sub = rng(i * 31 + k * 977 + 3); const pth = blob(sub, 4 + r() * 5, 0.5, 14).replace(/(\d+\.\d) (\d+\.\d)/g, (m, x, y) => (+x - 50 + 50 + Math.cos(a) * d).toFixed(1) + ' ' + (+y - 50 + 50 + Math.sin(a) * d).toFixed(1)); return `<path d='${pth}' fill='rgb(${k % 2 ? 70 : 24},${k % 2 ? 56 : 15},${k % 2 ? 46 : 10})' opacity='${k % 2 ? 0.45 : 0.5}'/>`; }).join('');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs>`
      + `<radialGradient id='h'><stop offset='.5' stop-color='rgb(46,28,16)' stop-opacity='.6'/><stop offset='.78' stop-color='rgb(60,40,24)' stop-opacity='.28'/><stop offset='1' stop-color='rgb(44,30,20)' stop-opacity='0'/></radialGradient>`
      + `<clipPath id='k'><path d='${core}'/></clipPath></defs>`
      + `<path d='${halo}' fill='url(#h)'/><path d='${scorch}' fill='rgb(58,30,14)' opacity='.72'/><path d='${sear}' fill='rgb(92,44,18)' opacity='.42'/>`
      + `<path d='${core}' fill='rgb(40,26,18)' opacity='.82'/><g clip-path='url(#k)'>${mot}</g><path d='${core}' fill='none' stroke='rgb(22,13,8)' stroke-width='1.4' opacity='.75'/><path d='${cracks}' fill='none' stroke='rgb(96,80,66)' stroke-width='.6' stroke-linecap='round' opacity='.4'/></svg>`;
    const hole = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${core}' transform='translate(50 50) scale(.84) translate(-50 -50)' fill='black'/></svg>`;
    css.push(`.card .burn.b${i}{background-image:${enc(svg)}}`, `.card.burnt.h${i}{--hole:${enc(hole)}}`);
  }
  const st = document.createElement('style'); st.textContent = css.join('\n'); document.head.appendChild(st);
  const pc = x => (x * 100).toFixed(0) + '%';
  const memo = new Map();
  return function wear(key) {
    const hit = memo.get(key); if (hit) return hit;
    if (memo.size > 4000) memo.clear();
    const out = wearOf(key); memo.set(key, out); return out;
  };
  function wearOf(key) {
    let h = 2166136261; for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const r = rng(h), on = p => (r() < p ? 1 : 0);
    const v = {
      '--rx': pc(0.15 + r() * 0.7), '--ry': pc(0.15 + r() * 0.7), '--rs': (14 + r() * 14).toFixed(0) + '%', '--ro': (on(0.45) * (0.18 + r() * 0.2)).toFixed(2),
      
      '--kx': pc(0.1 + r() * 0.8), '--ky': pc(0.1 + r() * 0.8), '--ks': (16 + r() * 22).toFixed(0) + '%', '--ko': (on(0.4) * (0.15 + r() * 0.25)).toFixed(2),
      // dried water: a pale patch where the dye lifted, with a darker tide line at its edge
      '--wx': pc(0.1 + r() * 0.8), '--wy': pc(0.1 + r() * 0.8), '--ws': (14 + r() * 24).toFixed(0) + '%', '--wh': (0.6 + r() * 0.8).toFixed(2), '--wo': (on(0.55) * (0.5 + r() * 0.5)).toFixed(2),
      '--vx': pc(0.1 + r() * 0.8), '--vy': pc(0.1 + r() * 0.8), '--vs': (8 + r() * 14).toFixed(0) + '%', '--vo': (on(0.3) * (0.5 + r() * 0.5)).toFixed(2),
      '--ca': (r() * 180).toFixed(0) + 'deg', '--cp': pc(0.25 + r() * 0.5), '--co': (on(0.38) * (0.25 + r() * 0.3)).toFixed(2),
      '--ga': (r() * 360).toFixed(0) + 'deg', '--go': (0.35 + r() * 0.4).toFixed(2),
      '--sx2': pc(r()), '--sy2': pc(r()), '--ss': (90 + r() * 120).toFixed(0) + '%', '--so': (r() * 0.25).toFixed(2),
      '--mx': (r() * 90).toFixed(0) + 'px', '--my': (r() * 90).toFixed(0) + 'px', '--ms': (60 + r() * 80).toFixed(0) + 'px'
    };
    // a burn is very rare; when it sits on the edge the card is burnt right through there
    const burn = r() < 0.03, edge = burn && r() < 0.55, bs = 0.24 + r() * 0.14;
    let bx = 0.2 + r() * 0.6, by = 0.2 + r() * 0.6, ax = 0, ay = 0;
    if (edge) {
      const sd = Math.floor(r() * 4), at = 0.15 + r() * 0.7, k = bs * 0.62;
      if (sd === 0) { bx = at; by = (r() - 0.5) * 0.03; ay = k / 1.47; } else if (sd === 2) { bx = at; by = 1 + (r() - 0.5) * 0.03; ay = -k / 1.47; }
      else if (sd === 1) { by = at; bx = 1 + (r() - 0.5) * 0.04; ax = -k; } else { by = at; bx = (r() - 0.5) * 0.04; ax = k; }
    }
    if (burn) Object.assign(v, { '--bx': pc(bx), '--by': pc(by), '--bxn': bx.toFixed(3), '--byn': by.toFixed(3), '--bs': bs.toFixed(3), '--bj': ((r() - 0.5) * 7).toFixed(1) + '%', '--bk': ((r() - 0.5) * 7).toFixed(1) + '%', '--ax': pc(bx + ax), '--ay': pc(by + ay) });
    const bi = Math.floor(r() * NB);
    return { cls: 'tear' + Math.floor(r() * N) + (edge ? ' burnt h' + bi : ''), burn: burn ? 'b' + bi : '', style: Object.entries(v).map(([k, x]) => k + ':' + x).join(';') };
  }
})();
// wear follows the real card: WID maps a hand card's local id to the server's card id
const WID = new Map();
function faceHTML(f, side, cls = '', id = '', wk = null) {
  // a drawn sprite from the asset pack wins; otherwise the built-in card
  const spr = ASSETS.cardClass(f, side);
  const tip = `data-f="${side}|${esc(f.c)}|${esc(f.v)}"`;
  const wkey = wk != null ? wk : (id !== '' && WID.has(String(id)) ? WID.get(String(id)) : null);
  const W = WEAR(wkey != null ? 'w' + wkey : id !== '' ? 'c' + id : f.c + f.v + side), stain = ' ' + W.cls;
  if (spr) return `<div class="card s-${side} c-${esc(f.c)} spr ${spr} ${cls}" style="" ${tip} ${id !== '' ? `data-id="${id}"` : ''}></div>`;
  const [m, subKey, sz] = SYM[f.v] || [esc(f.v)];
  const sub = subKey ? CARD_TXT[LANG][subKey] : '';
  const cor = CORNER[f.v] || esc(f.v);
  const uniq = f.v === 'swind' || f.v === 'sacr' || /\buniq\b/.test(cls) ? ' uniq' : '';
  // how rare the face is decides its shine: plain lacquer, a gold foil for wilds, prism for house cards, a living opal for the unique ones
  const tier = uniq ? ' tier-u' : EXTRA_CARDS.includes(f.v) ? ' tier-h' : f.c === 'w' ? ' tier-w' : '';
  const chainN = (cls.match(/\bch(\d)\b/) || [])[1];
  const chains = /\blocked\b/.test(cls) ? `<i class="chainglow"></i><i class="chainov cv${(parseInt(id, 10) || 0) % CHAIN_SVGS.length}"></i><i class="lock">${LOCK_SVG}${chainN ? `<b>${chainN}</b>` : ''}</i>` : '';
  return `<div class="card s-${side} c-${esc(f.c)}${stain}${uniq}${tier} ${cls}" style="${W.style}" ${tip} ${id !== '' ? `data-id="${id}"` : ''}>${tier ? '<i class="sheen"><b></b></i>' : ''}${W.burn ? `<i class="burn ${W.burn}"></i>` : ''}${chains}<span class="cor tl">${cor}</span><div class="oval"><span class="mid ${sz || ''}">${m}${sub ? `<em>${sub}</em>` : ''}</span></div><span class="cor br">${cor}</span>${suitSVG(f.c, 'tr')}${suitSVG(f.c, 'bl')}</div>`;
}
const otherSide = () => G.side === 'L' ? 'D' : 'L';
function sortedHand(h) {
  const order = { r: 0, y: 1, g: 2, b: 3, p: 0, t: 1, o: 2, v: 3, w: 4, x: 5 }, keys = Object.keys(SYM);
  const vr = v => isNaN(+v) ? 10 + keys.indexOf(v) : +v;
  const a = h.slice(), F = c => G.f(c);
  if (sortMode === 'manual') {
    const pos = new Map(handOrder.map((id, i) => [String(id), i]));
    const known = a.filter(c => pos.has(String(c.id))).sort((x, y) => pos.get(String(x.id)) - pos.get(String(y.id)));
    const fresh = a.filter(c => !pos.has(String(c.id)));   // newly drawn cards go to the right end
    handOrder = known.concat(fresh).map(c => String(c.id));
    return curseOn === 'fever' ? feverShuffle(known.concat(fresh)) : known.concat(fresh);
  }
  if (sortMode === 'color') a.sort((x, y) => order[F(x).c] - order[F(y).c] || vr(F(x).v) - vr(F(y).v));
  else if (sortMode === 'value') a.sort((x, y) => vr(F(x).v) - vr(F(y).v) || order[F(x).c] - order[F(y).c]);
  if (curseOn === 'fever') return feverShuffle(a);
  return a;
}
