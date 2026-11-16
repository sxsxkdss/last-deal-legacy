// ===== JUICE: shader background, ash and embers, shake, lamp dropout, card tilt, chaos slot machine =====
const JUICE = (() => {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { side: 0, sideT: 0, heat: 0, heatT: 0, gl: null };
  const full = () => (S.fx || (reduce ? 'lite' : 'full')) === 'full';

  // ---- swirling background (WebGL, rendered at low resolution for a chunky look) ----
  function startBg() {
    const cv = document.getElementById('bg'); if (!cv) return;
    let gl; try { gl = cv.getContext('webgl', { antialias: false, alpha: false }); } catch (e) {}
    if (!gl) { cv.classList.add('nogl'); return; }
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    // The back room, seen from above: a worn felt table with a wooden rail under one hanging lamp,
    // darkness all around, slow smoke in the light. Day = a warm bulb, night = a red bulb. Big stacks make it flicker.
    // Two passes: the room itself (felt, rail, floor: lots of noise, never moves) is baked into a texture
    // whenever the layout changes; every frame only lights it, adds the smoke and dithers.
    const NOISE = `float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(17.,9.);a*=.5;}return v;}`;
    const fsRoom = `precision mediump float;uniform vec2 r;uniform vec4 tb;${NOISE}
      void main(){
        vec2 px=gl_FragCoord.xy;
        vec2 c=tb.xy, rad=tb.zw;
        vec2 q=(px-c)/rad;
        float sq=pow(pow(abs(q.x),4.)+pow(abs(q.y),4.),.25);
        float felt=1.-smoothstep(.93,.95,sq);
        float rail=smoothstep(.93,.95,sq)*(1.-smoothstep(1.04,1.07,sq));
        vec2 fp=px/min(r.x,r.y)*7.;
        float nap=fbm(fp*6.)*.5+fbm(fp*1.3)*.5;
        float scuff=smoothstep(.55,.85,fbm(fp*.8+3.))*.35;
        float wear=smoothstep(.9,.0,length(q*vec2(.9,1.2)))*.18;
        vec3 feltC=vec3(.07,.19,.14)*(.7+.45*nap)-scuff*.06+wear*vec3(.07,.07,.04);
        feltC=mix(feltC,vec3(dot(feltC,vec3(.33))),.35);
        float grain=fbm(vec2(atan(q.y,q.x)*22.,sq*40.));
        vec3 woodC=vec3(.13,.075,.045)*(.6+.6*grain);
        vec3 floorC=vec3(.035,.03,.027)*(.7+.5*fbm(vec2(px.x/r.x*3.,px.y/r.y*40.)));
        vec3 col=mix(floorC,woodC,rail+felt);
        col=mix(col,feltC,felt);
        gl_FragColor=vec4(col*4.,1.);   // stored x4 so the dark tones keep their steps in 8 bits
      }`;
    const fs = `precision mediump float;uniform float t;uniform vec2 r;uniform float side;uniform float heat;uniform float beat;uniform sampler2D room;${NOISE}
      void main(){
        vec2 px=gl_FragCoord.xy;
        vec3 col=texture2D(room,px/r).rgb*.25;
        float sway=sin(t*.35)*.015;
        vec2 lp=vec2(.5+sway,.52)*r;
        float d=length((px-lp)/min(r.x,r.y));
        float buzz=step(.985,n(vec2(floor(t*6.),3.)));
        float fl=1.-heat*.22*step(.88,n(vec2(t*6.,1.)))-.025*n(vec2(t*2.,7.))-.22*buzz;
        float spread=mix(2.2,2.7,side);
        float lamp=exp(-d*d*spread)*mix(1.45,1.35,side)*fl*(1.+beat*.16)+mix(.07,.055,side);
        vec3 bulb=mix(vec3(1.,.88,.66),vec3(1.,.18,.14),side);
        col*=lamp*bulb*mix(1.9,2.4,side);
        float sm=fbm(px/min(r.x,r.y)*2.5+vec2(t*.03,-t*.05));
        col+=bulb*smoothstep(.45,.9,sm)*exp(-d*d*1.8)*(.06+beat*.05);
        col*=smoothstep(mix(1.6,1.45,side),mix(.1,.12,side),d);
        vec2 ip=floor(mod(gl_FragCoord.xy,4.));
        float bay=mod(ip.x*2.+ip.y*3.,4.)/4.;
        col=floor(col*48.+bay)/48.;
        gl_FragColor=vec4(col,1.);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = src => { const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, src)); gl.linkProgram(pr); return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null; };
    const prRoom = prog(fsRoom), pr = prog(fs);
    if (!prRoom || !pr) { cv.classList.add('nogl'); return; }
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const bindQuad = p => { const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); };
    const U = { t: gl.getUniformLocation(pr, 't'), r: gl.getUniformLocation(pr, 'r'), side: gl.getUniformLocation(pr, 'side'), heat: gl.getUniformLocation(pr, 'heat'), beat: gl.getUniformLocation(pr, 'beat'), room: gl.getUniformLocation(pr, 'room') };
    const UR = { r: gl.getUniformLocation(prRoom, 'r'), tb: gl.getUniformLocation(prRoom, 'tb') };
    // the baked room
    const tex = gl.createTexture(), fbo = gl.createFramebuffer();
    let roomKey = '';
    const K = 3;
    const bakeRoom = () => {
      const T = state.table || { x: innerWidth * 0.4, y: innerHeight * 0.5, w: innerWidth * 0.38, h: innerHeight * 0.42 };
      const key = [cv.width, cv.height, Math.round(T.x), Math.round(T.y), Math.round(T.w), Math.round(T.h)].join(',');
      if (key === roomKey) return; roomKey = key;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cv.width, cv.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.useProgram(prRoom); bindQuad(prRoom);
      gl.uniform2f(UR.r, cv.width, cv.height); gl.uniform4f(UR.tb, T.x / K, (innerHeight - T.y) / K, T.w / K, T.h / K);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(pr); bindQuad(pr); gl.uniform1i(U.room, 0);
    };
    const size = () => { cv.width = Math.ceil(innerWidth / K); cv.height = Math.ceil(innerHeight / K); gl.viewport(0, 0, cv.width, cv.height); };
    size(); addEventListener('resize', size);
    gl.useProgram(pr); bindQuad(pr);
    state.gl = gl;
    const t0 = performance.now(); let last = 0;
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!full() || document.hidden) return;
      if (now - last < 33) return; last = now; // ~30 fps is plenty for a background
      bakeRoom();
      state.side += (state.sideT - state.side) * 0.06;
      state.heat += (state.heatT - state.heat) * 0.05;
      if (typeof S === 'undefined' || S.bgMotion !== false) state.tAcc = (state.tAcc || 0) + Math.min(0.05, (now - (state.tLast || now)) / 1000); state.tLast = now;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1f(U.t, 20 + (state.tAcc || 0)); gl.uniform2f(U.r, cv.width, cv.height);
      gl.uniform1f(U.side, state.side); gl.uniform1f(U.heat, Math.min(1, state.heat)); gl.uniform1f(U.beat, state.beat || 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    })(t0);
  }

  // ---- particles: no confetti in this room. Ash and dust drift down, a few embers rise and die. ----
  // Callers may still pass colours; only their brightness matters (bright = more embers).
  const ASH = ['#6d665c', '#8a8274', '#4e4942', '#a59c8b', '#3a3632'], EMBER = ['#c2531c', '#8e2a12', '#e07a2e'];
  let pc, px, parts = [], looping = false;
  function burst(x, y, n, colors, power = 1) {
    if (!full()) return;
    if (!pc) { pc = document.getElementById('fxc'); px = pc.getContext('2d'); const fit = () => { pc.width = innerWidth; pc.height = innerHeight; }; fit(); addEventListener('resize', fit); }
    if (!looping) { looping = true; requestAnimationFrame(loop); }
    n = Math.round(n * 0.6);
    const hot = Math.min(0.35, 0.08 + power * 0.08);
    for (let i = 0; i < n; i++) {
      const ember = Math.random() < hot, a = Math.random() * Math.PI * 2, s = (0.6 + Math.random() * 2.6) * Math.sqrt(power);
      parts.push(ember
        ? { x, y, vx: Math.cos(a) * s * 0.7, vy: -1 - Math.random() * 2.2 * power, g: -0.015, drag: 0.97, life: 50 + Math.random() * 50, c: EMBER[i % 3], sz: 1 + Math.random() * 2, ember: true, ph: Math.random() * 6 }
        : { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2 * power, g: 0.045, drag: 0.94, life: 60 + Math.random() * 60, c: ASH[i % ASH.length], sz: 1 + Math.random() * 3, ph: Math.random() * 6 });
    }
  }
  // a few sparks off a smouldering number
  function sparks(el, k = 3) {
    if (!full() || !el || !el.isConnected) return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    burst(r.left + r.width * (0.2 + Math.random() * 0.6), r.top + r.height * 0.4, k * 2, null, 2.5);
  }
  function loop() {
    if (!parts.length) { looping = false; px.clearRect(0, 0, pc.width, pc.height); return; }
    requestAnimationFrame(loop);
    px.clearRect(0, 0, pc.width, pc.height);
    parts = parts.filter(p => p.life-- > 0);
    for (const p of parts) {
      p.ph += 0.08; p.vy += p.g; p.vx = p.vx * p.drag + Math.sin(p.ph) * 0.05; p.vy *= p.drag; p.x += p.vx; p.y += p.vy;
      px.globalAlpha = Math.min(p.ember ? 1 : 0.75, p.life / 30) * (p.ember ? 0.6 + 0.4 * Math.sin(p.ph * 3) : 1);
      px.fillStyle = p.c;
      px.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.ember ? p.sz : p.sz * 0.7);
    }
    px.globalAlpha = 1;
    if (!parts.length) px.clearRect(0, 0, pc.width, pc.height);
  }

  // ---- screen shake + chromatic glitch ----
  function shake(power = 1) {
    if (typeof S !== 'undefined' && S.shake === false) return;
    if (!full()) return;
    const g = document.getElementById('game'); if (!g) return;
    g.style.setProperty('--shk', Math.min(18, 4 + power * 3) + 'px');
    g.classList.remove('shake2'); void g.offsetWidth; g.classList.add('shake2');
    setTimeout(() => g.classList.remove('shake2'), 420);
  }
  // a glitch looks like old software falling over: the picture drops to a 16-colour palette and tears in bands,
  // and an error box gets stuck and smears across the screen like a dragged window on a frozen desktop
  let crash = null, crashT = 0;
  function errBox() {
    return '<div class="ewin"><div class="etitle"><i></i><b>×</b></div><div class="ebody"><span class="eicon">×</span><span class="elines"><i></i><i></i></span></div><div class="ebtn"></div></div>';
  }
  function glitch(force) {
    if (!force && !full()) return;
    const g = document.getElementById('game'); if (!g) return;
    if (!crash) {
      crash = document.createElement('div'); crash.id = 'crash'; document.body.appendChild(crash);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
      svg.innerHTML = '<filter id="oldpal" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="discrete" tableValues="0 .5 .75 1"/><feFuncG type="discrete" tableValues="0 .5 .75 1"/><feFuncB type="discrete" tableValues="0 .5 1"/></feComponentTransfer></filter>';
      document.body.appendChild(svg);
    }
    // the trail: one box, stamped again and again along a drag path
    const n = 9, x0 = 15 + Math.random() * 40, y0 = 15 + Math.random() * 35, dx = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 1.6), dy = 2 + Math.random() * 2.4;
    let html = ''; for (let i = 0; i < n; i++) html += `<div class="estamp" style="left:${(x0 + dx * i).toFixed(1)}%;top:${(y0 + dy * i).toFixed(1)}%;animation-delay:${i * 45}ms">${errBox()}</div>`;
    crash.innerHTML = html;
    g.classList.remove('glitch'); crash.classList.remove('on'); void g.offsetWidth; g.classList.add('glitch'); crash.classList.add('on');
    clearTimeout(crashT); crashT = setTimeout(() => { g.classList.remove('glitch'); crash.classList.remove('on'); crash.innerHTML = ''; }, 720);
  }

  // ---- card tilt toward the pointer (desktop) ----
  function tilt(el, e) {
    if (!full() || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
    const ang = Math.min(16, Math.hypot(dx, dy) * 26).toFixed(1);
    // each card tilts around its own centre with its own perspective, so cards at the ends of a fan don't skew
    el.style.setProperty('--tilt', `translateY(-50%) perspective(520px) rotate3d(${(-dy).toFixed(3)}, ${dx.toFixed(3)}, 0, ${ang}deg) translateY(50%)`);
    el.style.setProperty('--gx', ((dx + 0.5) * 100).toFixed(0) + '%');
    el.style.setProperty('--gy', ((dy + 0.5) * 100).toFixed(0) + '%');
    el.style.setProperty('--sheen', '.22');
  }
  function untilt(el) { el.style.removeProperty('--tilt'); el.style.removeProperty('--sheen'); }

  // ---- chaos slot machine ----
  const GLYPH = { inflation: '×2', tax: 'TAX', revolution: 'REV', storm: 'D/N', lock: 'LOCK', bleed: '−1', jackpot: '$$$', mirrorworld: 'MIR' };
  let slotBusy = null;
  function slot(ev) {
    const el = document.getElementById('slot'); if (!el) return;
    const keys = Object.keys(GLYPH), [title, sub] = (STR[LANG].ev[ev] || STR.en.ev[ev] || [ev, '']);
    el.innerHTML = `<div class="slotbox"><div class="slottitle">${esc(t('chaosTitle'))}</div><div class="reels"><b></b><b></b><b></b></div><div class="slotres"><span class="slotname">${esc(title)}</span><span class="slotsub">${esc(sub)}</span></div></div>`;
    el.classList.remove('hidden', 'done'); void el.offsetWidth; el.classList.add('show');
    const reels = [...el.querySelectorAll('.reels b')];
    const spinMs = full() ? [700, 950, 1200] : [150, 200, 250];
    const t0 = performance.now();
    clearTimeout(slotBusy);
    const tickR = () => {
      const now = performance.now() - t0; let spinning = false;
      reels.forEach((r, k) => {
        if (now < spinMs[k]) { spinning = true; r.textContent = GLYPH[keys[Math.floor(Math.random() * keys.length)]]; r.classList.add('spin'); }
        else if (r.classList.contains('spin')) { r.classList.remove('spin'); r.textContent = GLYPH[ev] || '?'; r.classList.add('stop'); SFX.play('reel', k); }
      });
      if (spinning) { if (Math.random() < 0.5) SFX.play('tick'); requestAnimationFrame(tickR); }
      else { el.classList.add('done'); SFX.play('chaos'); shake(3); burst(innerWidth / 2, innerHeight / 2, 40, null, 1); slotBusy = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.classList.add('hidden'), 220); }, 1700); }
    };
    requestAnimationFrame(tickR);
  }

  // ---- the room listens to the music: the bulb, the smoke and the chalk pulse on the beat ----
  // Onsets come from spectral flux (how much the low and mid spectrum jumped since last frame) against an
  // adaptive threshold. The gaps between onsets vote for a tempo; a phase-locked clock then predicts each
  // beat, so the room hits on the beat instead of a few frames after it, shifted by the audio output latency.
  // Works when the music is a file the page can hear (assets/sounds/music.*). A YouTube embed can't be listened to.
  const TEMPO = { bpm: 0, period: 0, next: 0, conf: 0 };
  (function listen() {
    let env = 0, prev = null, flux = [], lastOn = 0, lastKick = 0, idle = true, curBin = 0, lastTempo = 0;
    const env10 = new Float32Array(600);
    const root = document.documentElement;
    function kick() {
      env = 1; lastKick = performance.now();
      document.body.classList.remove('kick'); void document.body.offsetWidth; document.body.classList.add('kick');
    }
    (function tick(now) {
      requestAnimationFrame(tick);
      const lv = typeof ASSETS !== 'undefined' && ASSETS.musicLevel ? ASSETS.musicLevel() : null;
      if (!lv || !full() || S.musicFx === false) { if (!idle) { idle = true; env = 0; state.beat = 0; root.style.setProperty('--beat', '0'); } return; }
      idle = false;
      const sp = lv.spec, n = sp.length, lo = Math.max(1, Math.round(35 / lv.hz)), hi = Math.min(n - 1, Math.round(2500 / lv.hz));
      // spectral flux, low end counted double
      let f = 0;
      if (prev) for (let i = lo; i <= hi; i++) { const d = sp[i] - prev[i]; if (d > 0) f += d * (i * lv.hz < 200 ? 2 : 1); }
      prev = prev || new Uint8Array(n); prev.set(sp);
      flux.push(f); if (flux.length > 50) flux.shift();
      const mean = flux.reduce((a, b) => a + b, 0) / flux.length, sd = Math.sqrt(flux.reduce((a, b) => a + (b - mean) * (b - mean), 0) / flux.length);
      // onset-strength envelope in 10 ms bins over the last 6 s; its autocorrelation gives the tempo
      const bin = Math.floor(now / 10);
      if (bin !== curBin) { for (let k = curBin + 1; k <= bin && k - curBin < 600; k++) env10[k % 600] = 0; curBin = bin; }
      env10[bin % 600] = Math.max(env10[bin % 600], Math.max(0, f - mean));
      if (now - lastTempo > 500) {
        lastTempo = now;
        const seq = new Float32Array(600); for (let k = 0; k < 600; k++) seq[k] = env10[(bin - 599 + k + 6000) % 600];
        let best = 0, bestL = 0, sum = 0, cnt = 0;
        for (let L = 33; L <= 100; L++) {
          let ac = 0; for (let k = L; k < 600; k++) ac += seq[k] * seq[k - L];
          ac /= (600 - L);
          const bpm = 6000 / L, w = Math.exp(-Math.pow(Math.log2(bpm / 115), 2) * 1.5); // gently prefer 80–160
          const sc = ac * w; sum += sc; cnt++;
          if (sc > best) { best = sc; bestL = L; }
        }
        const conf = cnt && sum ? best / (sum / cnt) : 0;
        if (bestL && conf > 1.6) {
          const bpm = 6000 / bestL;
          TEMPO.bpm = TEMPO.bpm && Math.abs(TEMPO.bpm - bpm) < 4 ? TEMPO.bpm * 0.7 + bpm * 0.3 : bpm;
          TEMPO.period = 60000 / TEMPO.bpm; TEMPO.conf = Math.min(1, (conf - 1.6) / 1.5 + 0.6);
        } else TEMPO.conf *= 0.8;
      }
      if (f > mean + 1.4 * sd && f > 40 && now - lastOn > 140) {
        lastOn = now;
        // phase lock: pull the predicted beat toward this onset when they're close
        if (TEMPO.period && TEMPO.conf > 0.6) {
          if (!TEMPO.next) TEMPO.next = now + TEMPO.period;
          let err = now - (TEMPO.next - TEMPO.period);
          if (err > TEMPO.period / 2) err -= TEMPO.period;
          if (Math.abs(err) < TEMPO.period * 0.2) TEMPO.next += err * 0.4;
        } else kick(); // no tempo yet: react to the onset itself
      }
      // fire on the predicted beat, late by the output latency so it lands with what you hear
      const lat = (lv.lat || 0.03) * 1000;
      if (TEMPO.period && TEMPO.conf > 0.6) {
        while (TEMPO.next + lat < now - TEMPO.period) TEMPO.next += TEMPO.period;
        if (now >= TEMPO.next + lat) { if (now - lastKick > TEMPO.period * 0.5) kick(); TEMPO.next += TEMPO.period; }
      }
      env *= 0.88;
      const b = Math.max(env, lv.bass * 0.18);
      if (Math.abs(b - state.beat) > 0.01) { state.beat = b; root.style.setProperty('--beat', b.toFixed(2)); }
    })(0);
  })();
  const tempo = () => (TEMPO.conf > 0.6 ? TEMPO.bpm : 0);
  function setSide(d) { state.sideT = d ? 1 : 0; }
  // where the table sits on screen (centre and half-size in CSS px)
  function setTable(rc) { if (rc) state.table = rc; }
  function setHeat(h) { state.heatT = Math.max(0, Math.min(1, h)); }
  // ---- embers: the stack counter and an armed multiplier smoulder, hotter as they grow ----
  // (CSS does the glow from --emb; this only sets the level and throws the odd spark.)
  const EMB = { stack: 0, arm: 0, burstT: 0 };
  function setEmber(el, v) { if (!el) return; el.classList.toggle('ember', v > 0.05); el.style.setProperty('--emb', Math.min(1, v).toFixed(2)); }
  function fireLevel(pending, multNext) {
    const lite = document.body.classList.contains('lite');
    EMB.stack = lite ? 0 : (pending >= 8 ? Math.min(1, 0.25 + (pending - 8) / 30) : 0);
    EMB.arm = lite ? 0 : (multNext > 1 ? Math.min(1, 0.3 + Math.log2(multNext) * 0.25) : 0);
    setEmber(document.querySelector('#hud .stack'), Math.max(EMB.stack, EMB.burstT > performance.now() ? 1 : 0));
    setEmber(document.querySelector('#hud .multchip'), EMB.arm);
  }
  setInterval(() => {
    if (document.hidden) return;
    if (EMB.stack > 0 && Math.random() < EMB.stack) sparks(document.querySelector('#hud .stack'), 1 + Math.round(EMB.stack * 2));
    if (EMB.arm > 0 && Math.random() < EMB.arm * 0.6) sparks(document.querySelector('#hud .multchip'), 1);
  }, 700);
  function comboFlame(el, amount, ms) {
    if (document.body.classList.contains('lite') || !el) return;
    setEmber(el, Math.min(1, amount / 4)); sparks(el, 3);
    setTimeout(() => setEmber(el, 0), ms);
  }
  function ignite(power = 1) {
    if (document.body.classList.contains('lite')) return;
    EMB.burstT = performance.now() + 900;
    const el = document.querySelector('#hud .stack');
    if (el) { setEmber(el, 1); sparks(el, 3 + Math.round(power * 3)); setTimeout(() => setEmber(el, EMB.stack), 900); }
  }
  // ---- a visitor at the table: warm light pours in for the angel, the room goes red and close for the demon ----
  function visit(kind) {
    let el = document.getElementById('visit');
    if (!el) { el = document.createElement('div'); el.id = 'visit'; document.body.appendChild(el); }
    el.className = ''; void el.offsetWidth; el.className = kind === 'dark' ? 'demon' : 'angel';
    if (kind === 'dark') { shake(5); }
    if (full()) burst(innerWidth / 2, innerHeight * 0.35, kind === 'dark' ? 40 : 24, null, kind === 'dark' ? 2 : 0.6);
  }
  return { tempo, visit, startBg, burst, shake, glitch, tilt, untilt, slot, setSide, setHeat, full, fireLevel, ignite, comboFlame, setTable };
})();
