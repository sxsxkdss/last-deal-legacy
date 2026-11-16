// ===== ASSETS: an optional pack of card sprites, fonts, sounds and a background, loaded from /assets =====
// Anything missing falls back to the built-in look and synthesized sounds. See template/README.md.
const ASSETS = (() => {
  let man = null, cfg = {}, ready = false;
  const cards = new Set();
  const sounds = {};      // name -> [file]
  const buffers = {};     // file -> AudioBuffer | 'loading' | 'bad'
  // (music lives in the crossfading decks below)
  const keyOf = (f, side) => `${side}-${f.c}-${f.v}`;
  const cls = k => 'spr-' + k.replace(/[^a-z0-9-]/gi, '_');
  function cardClass(f, side) { const k = keyOf(f, side); return cards.has(k) ? cls(k) : ''; }
  function css(text) { const s = document.createElement('style'); s.textContent = text; document.head.appendChild(s); }

  // the room's music is only decided once we know whether the pack has a music file
  const settle = () => { ready = true; if (typeof AMB !== 'undefined') AMB.apply(); };
  async function load() {
    try { const r = await fetch('assets/manifest.json', { cache: 'no-cache' }); if (!r.ok) return settle(); man = await r.json(); } catch (e) { return settle(); }
    cfg = man.config || {};
    const rules = [];
    // cards: assets/cards/<side>-<color>-<value>.png, e.g. L-r-7.png, D-w-bhole.png
    for (const file of man.cards || []) {
      const k = file.replace(/\.[^.]+$/, '');
      if (!/^[LD]-[a-z]-[a-z0-9]+$/i.test(k)) continue;
      cards.add(k); rules.push(`.${cls(k)}{background-image:url("assets/cards/${encodeURIComponent(file)}")}`);
    }
    if (cards.size) rules.push(`.card.spr{background-color:transparent;background-position:center;background-size:100% 100%;background-repeat:no-repeat;border:0;border-radius:${cfg.cardRadius ?? 0}px;box-shadow:none${cfg.pixelated ? ';image-rendering:pixelated' : ''}}`,
      `.card.spr .oval,.card.spr .cor,.card.spr .suit,.card.spr::before,.card.spr::after{display:none}`);
    // fonts: assets/font/ui.* replaces all text, assets/font/display.* replaces titles, numbers, buttons and toasts
    const F = man.font || {};
    if (F.ui) rules.push(`@font-face{font-family:'PackUI';src:url("assets/font/${encodeURIComponent(F.ui)}");font-display:swap}`,
      `:root{--f-ui:'PackUI',system-ui,sans-serif;--f-type:'PackUI',ui-monospace,monospace;--f-chalk:'PackUI',system-ui,sans-serif}`);
    if (F.display || F.ui) rules.push(`@font-face{font-family:'PackDisplay';src:url("assets/font/${encodeURIComponent(F.display || F.ui)}");font-display:swap}`,
      `:root{--f-stamp:'PackDisplay',system-ui,sans-serif;--f-card:'PackDisplay',system-ui,sans-serif}`);
    if (cfg.pixelated && (F.ui || F.display)) rules.push(`*{-webkit-font-smoothing:none;font-synthesis:none}`);
    // background: assets/bg.png (or .jpg/.webp/.gif) replaces the animated swirl
    if (man.bg) rules.push(`#bg{display:none}html{background:#07070a url("assets/${encodeURIComponent(man.bg)}") center/cover fixed${cfg.pixelated ? ';image-rendering:pixelated' : ''}}`);
    if (cfg.crt === false) rules.push(`#crt,#grain{display:none}`);
    if (rules.length) css(rules.join('\n'));
    // sounds: assets/sounds/<name>.ogg; play-2.ogg, play-3.ogg ... are variants picked at random
    Object.assign(sounds, man.sounds || {});
    if (sounds.music) startMusicOnGesture();
    if (typeof G !== 'undefined' && G) render();
    settle();
  }

  function decode(file) {
    if (buffers[file] || !SFX.ctx) return;
    buffers[file] = 'loading';
    fetch('assets/sounds/' + encodeURIComponent(file)).then(r => r.arrayBuffer()).then(b => SFX.ctx.decodeAudioData(b))
      .then(buf => { buffers[file] = buf; }).catch(() => { buffers[file] = 'bad'; });
  }
  // returns true when a pack sound handled it (the synth then stays quiet)
  function playSound(name, k = 1) {
    const files = sounds[name]; if (!files || !files.length || !SFX.ctx) return false;
    files.forEach(decode);
    const ready = files.filter(f => buffers[f] && typeof buffers[f] === 'object');
    if (!ready.length) return false; // still decoding: the synth covers this one
    const buf = buffers[ready[Math.floor(Math.random() * ready.length)]];
    const src = SFX.ctx.createBufferSource(), g = SFX.ctx.createGain();
    src.buffer = buf;
    // combos and bigger stacks ring higher, like the built-in sounds
    if (['play', 'stack', 'draw'].includes(name) && cfg.pitchCombos !== false) src.playbackRate.value = Math.pow(2, Math.min(k - 1, 12) / 24);
    g.gain.value = (cfg.volume ?? 1) * ((cfg.volumes || {})[name] ?? 1);
    src.connect(g); g.connect(SFX.out ? SFX.out.dry : SFX.ctx.destination); src.start();
    return true;
  }
  // the pack's music: every music*.mp3/ogg is one playlist, picked at random (never the same track twice in a row
  // when there are several). Two decks crossfade: near the end of a track the next one, already buffered on the
  // other deck, fades in while the current one fades out, so there is no hard cut or gap at the seam.
  // Turning music off/on fades too. Played through Web Audio so the room can listen to it (see JUICE).
  const XFADE = 4, FADE_IN = 2.5, FADE_TOGGLE = 1.2;
  // night in the back room: the tape runs slow (pitch drops with it) and the sound gets muffled behind the door
  const NIGHT_RATE = 0.84, NIGHT_LP = 2600, DAY_LP = 20000;
  let an = null, fbuf = null, bus = null, lp = null, decks = [], cur = 0, playing = false, rate = 1;
  const musicVol = () => { const v = Math.max(0, Math.min(1, S.ambVol ?? cfg.musicVolume ?? 0.35)); return v * v; }; // perceived loudness: square the slider
  function makeDeck(url) {
    const el = new Audio(url); el.preload = 'auto'; el.crossOrigin = 'anonymous';
    el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = false; el.playbackRate = rate;
    const g = SFX.ctx.createGain(); g.gain.value = 0;
    SFX.ctx.createMediaElementSource(el).connect(g); g.connect(bus);
    return { el, g };
  }
  function ramp(param, to, secs) {
    const t = SFX.ctx.currentTime;
    param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + Math.max(0.02, secs));
  }
  // equal-power curve for the seam, so the loudness holds while the two passes overlap
  function curve(param, up, secs) {
    const t = SFX.ctx.currentTime, n = 64, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1); c[i] = up ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2); }
    param.cancelScheduledValues(t);
    try { param.setValueCurveAtTime(c, t, secs); } catch (e) { ramp(param, up ? 1 : 0, secs); }
  }
  // Firefox and Chrome treat element.volume differently once the element is routed through Web Audio, so the level
  // is split: half on the element (with the fades mirrored there too), half on the graph. Either way the slider works.
  let master = { v: 0, to: 1, rate: 1 };
  const env = (d, to, secs) => { d.env = d.env ?? 0; d.to = to; d.rate = Math.abs(to - d.env) / Math.max(0.05, secs); };
  const halfVol = () => Math.sqrt(musicVol());
  function stepEnv(o, dt) { if (o.to === undefined) return; const k = o.rate * dt; o.env = (o.env ?? o.v ?? 0); if (Math.abs(o.to - o.env) <= k) o.env = o.to; else o.env += Math.sign(o.to - o.env) * k; }
  function startDeck(d, fadeIn) { d.el.currentTime = 0; d.el.play().catch(() => {}); ramp(d.g.gain, 1, fadeIn); env(d, 1, fadeIn); d.started = true; }
  let lastTrack = null;
  const trackURL = f => 'assets/sounds/' + encodeURIComponent(f);
  function nextTrack() {
    const list = sounds.music || [];
    const pool = list.length > 1 ? list.filter(f => f !== lastTrack) : list;
    lastTrack = pool[Math.floor(Math.random() * pool.length)];
    return lastTrack;
  }
  function startMusicOnGesture() {
    const want = () => S.sound && S.ambient !== 'off';
    const go = () => {
      if (decks.length || !want() || !SFX.ctx) return; // wait for the first tap: the audio graph needs it
      try {
        const url = trackURL(nextTrack());
        bus = SFX.ctx.createGain(); bus.gain.value = halfVol();
        an = SFX.ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.6; fbuf = new Uint8Array(an.frequencyBinCount);
        lp = SFX.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
        lp.frequency.value = document.body.classList.contains('dark') ? NIGHT_LP : DAY_LP;
        rate = document.body.classList.contains('dark') ? NIGHT_RATE : 1;
        bus.connect(lp); lp.connect(an); an.connect(SFX.ctx.destination);
        decks = [makeDeck(url), makeDeck(trackURL(nextTrack()))]; decks.forEach(d => { d.env = 0; d.to = 0; d.rate = 1; d.el.volume = 0; }); master = { env: 1, to: 1, rate: 1 };
        cur = 0; startDeck(decks[0], FADE_IN); playing = true;
      } catch (e) { decks = []; an = null; }
    };
    addEventListener('pointerdown', go, { once: false });
    let last = performance.now();
    setInterval(() => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      if (decks.length) { stepEnv(master, dt); for (const d of decks) { stepEnv(d, dt); d.el.volume = Math.max(0, Math.min(1, halfVol() * (d.env || 0) * (master.env ?? 1))); } }
      if (!decks.length) { if (want()) go(); return; }
      ramp(bus.gain, playing ? halfVol() : 0, 0.3);
      // ease the tape speed and the muffling toward day or night over a couple of seconds
      const night = document.body.classList.contains('dark');
      const tr = night ? NIGHT_RATE : 1;
      if (Math.abs(rate - tr) > 0.0005) { rate += (tr - rate) * (1 - Math.exp(-dt / 2.6)); if (Math.abs(rate - tr) < 0.001) rate = tr; decks.forEach(d => { d.el.playbackRate = rate; }); }
      const tf = night ? NIGHT_LP : DAY_LP;
      if (lp && Math.abs(lp.frequency.value - tf) > 1) lp.frequency.setTargetAtTime(tf, SFX.ctx.currentTime, 2.6);
      const on = want();
      if (!on && playing) { playing = false; ramp(bus.gain, 0, FADE_TOGGLE); master.to = 0; master.rate = 1 / FADE_TOGGLE; setTimeout(() => { if (!playing) decks.forEach(d => d.el.pause()); }, FADE_TOGGLE * 1000 + 50); return; }
      if (on && !playing) { playing = true; decks.forEach(d => { if (d.started && d.el.currentTime > 0 && !d.el.ended) d.el.play().catch(() => {}); }); bus.gain.value = 0; ramp(bus.gain, halfVol(), FADE_TOGGLE); master.env = 0; master.to = 1; master.rate = 1 / FADE_TOGGLE; return; }
      if (!playing) return;
      // the seam: when the current pass is XFADE seconds from its end, the other deck takes over from the top
      const a = decks[cur], dur = a.el.duration;
      if (isFinite(dur) && dur > XFADE * 3 && dur - a.el.currentTime <= XFADE) {
        const b = decks[cur ^ 1];
        b.el.currentTime = 0; b.el.play().catch(() => {}); b.started = true; curve(b.g.gain, true, XFADE); env(b, 1, XFADE);
        curve(a.g.gain, false, XFADE); env(a, 0, XFADE);
        const old = a; setTimeout(() => { if (old !== decks[cur]) { old.el.pause(); old.started = false; if ((sounds.music || []).length > 1) { old.el.src = trackURL(nextTrack()); old.el.load(); old.el.playbackRate = rate; } } }, XFADE * 1000 + 200);
        cur ^= 1;
      } else if (a.el.ended || (a.el.paused && playing && a.started)) { startDeck(a, FADE_IN); }
    }, 50);
  }
  // { bass, level } in 0..1 while the music plays; null otherwise
  function musicLevel() {
    if (!an || !playing || !decks.length) return null;
    an.getByteFrequencyData(fbuf);
    const hz = SFX.ctx.sampleRate / an.fftSize; let b = 0, nb = 0, all = 0;
    for (let i = 0; i < fbuf.length; i++) { all += fbuf[i]; if (i * hz > 30 && i * hz < 150) { b += fbuf[i]; nb++; } }
    const lat = (SFX.ctx.outputLatency || 0) + (SFX.ctx.baseLatency || 0);
    return { bass: nb ? b / nb / 255 : 0, level: all / fbuf.length / 255, spec: fbuf, hz, lat };
  }
  return { load, cardClass, playSound, musicLevel, get manifest() { return man; }, get ready() { return ready; } };
})();
