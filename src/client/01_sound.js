// ================= SOUND (synthesized, no files) =================
const SFX = {
  ctx: null, out: null, noise: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const ctx = this.ctx = arguments[0] || new (window.AudioContext || window.webkitAudioContext)();
      // master chain: gentle compressor + a short room so sounds sit together
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
      const master = ctx.createGain(); master.gain.value = 0.9 * (S.vol ?? 0.8); this.master = master;
      const dry = ctx.createGain(), wet = ctx.createGain(); wet.gain.value = 0.18;
      // a concrete back room: a long, dark reverb tail
      const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d2 = ir.getChannelData(ch); for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d2.length, 3.2); }
      const dl = ctx.createConvolver(); dl.buffer = ir;
      const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2200;
      dl.connect(damp); damp.connect(wet); wet.gain.value = 0.32;
      dry.connect(comp); wet.connect(comp); comp.connect(master); master.connect(ctx.destination);
      this.out = { dry, send: dl };
      const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ctx = null; }
  },
  route(node, wet = 0.3) { node.connect(this.out.dry); if (wet) { const g = this.ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(this.out.send); } },
  // a burst of filtered noise: the body of every card sound
  rustle(t, dur, f1, f2, q, vol, type = 'bandpass') {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const flt = c.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f1, t); flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); this.route(g, 0.15);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  },
  // a tuned strike: sine + a couple of partials with fast decay (marimba / chime feel)
  strike(t, freq, dur, vol, partials = [1, 2.76, 5.4]) {
    const c = this.ctx;
    partials.forEach((p, k) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = freq * p;
      const v = vol / (1 + k * 2.2);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + k * 0.8));
      o.connect(g); this.route(g, 0.35); o.start(t); o.stop(t + dur + 0.05);
    });
  },
  // a poker chip: short, bright, a little inharmonic
  chip(t, pitch = 1, vol = 0.2) { this.strike(t, 2300 * pitch, 0.07, vol, [1, 1.57, 2.31]); this.rustle(t, 0.02, 5200 * pitch, 3000, 3, vol * 0.8); },
  coin(t, pitch = 1) { this.strike(t, 1975 * pitch, 0.28, 0.12, [1, 2.7, 4.2]); },
  bell(t, pitch = 1) { this.strike(t, 330 * pitch, 1.6, 0.16, [1, 2.76, 5.4, 8.9]); this.rustle(t, 0.04, 5000, 2000, 2, 0.12); }, // a struck pipe, not a bell
  clank(t, pitch = 1, vol = 0.3) { this.strike(t, 180 * pitch, 0.5, vol, [1, 2.31, 3.89, 5.2]); this.thump(t, 70 * pitch, 0.2, vol); this.rustle(t, 0.05, 3000, 900, 1.5, vol * 0.6); },
  // a gunshot: a crack of noise and a heavy low body
  gun(t, power = 1) { this.rustle(t, 0.09, 6000, 1200, 0.5, 0.9 * power, 'lowpass'); this.rustle(t + 0.02, 0.5, 900, 120, 0.6, 0.5 * power, 'lowpass'); this.thump(t, 46, 0.6, 0.9 * power); },
  thump(t, freq, dur, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.8, t); o.frequency.exponentialRampToValueAtTime(freq, t + dur * 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); this.route(g, 0); o.start(t); o.stop(t + dur + 0.05);
  },
  play(name, k = 1) {
    if (!S.sound || !this.ctx || (this.ctx.state !== 'running' && !this.offline)) return;
    if (!this.offline && ASSETS.playSound(name, k)) return; // a sound file from the asset pack wins
    const t = this.ctx.currentTime + 0.005;
    try {
      switch (name) {
        case 'play': // a card slapped down hard on the felt
          this.rustle(t, 0.06, 1800, 600, 0.8, 0.5); this.thump(t + 0.015, 62, 0.16, 0.6);
          if (k > 1) this.chip(t + 0.05, 0.8 + Math.min(k, 10) * 0.05, 0.2);
          break;
        case 'tick': this.rustle(t, 0.012, 4200, 2600, 3, 0.12); break;
        case 'spin': for (let i = 0; i < 12; i++) this.rustle(t + i * 0.05, 0.022, 4500, 2800, 4, 0.18); break;
        case 'click2': this.clank(t, 2.2, 0.22); break;
        case 'bang': this.gun(t, 1.2); break;
        case 'mult': for (let i = 0; i < 2 + Math.min(4, k || 2); i++) this.chip(t + i * 0.06, 0.75 + i * 0.06, 0.24); this.thump(t, 44, 0.6, 0.6); break;
        case 'lucky': [0, 0.09, 0.18].forEach((d, i) => this.coin(t + d, 0.8 + i * 0.1)); break;
        case 'glass': this.strike(t, 1568, 0.7, 0.14, [1, 2.4, 3.9]); this.rustle(t + 0.02, 0.3, 3000, 7000, 0.6, 0.07); break;
        case 'devil': this.gun(t, 1.3); break;
        case 'coin': this.coin(t, 0.85); this.coin(t + 0.1, 1.05); break;
        case 'reel': this.clank(t, 0.8 + k * 0.15, 0.26); break;
        case 'chaos': // an old slot machine: the lever grinds, the reels clank to life
          this.rustle(t, 0.3, 200, 900, 1.2, 0.35); this.thump(t + 0.2, 45, 0.6, 0.6);
          [0, 0.14, 0.28].forEach((d, i) => this.clank(t + 0.3 + d, 0.9 + i * 0.12, 0.2)); break;
        case 'draw': for (let i = 0; i < Math.min(k, 4); i++) this.rustle(t + i * 0.06, 0.12, 900, 2600, 1.1, 0.26); break;
        case 'flip': // the bulb is switched: a heavy relay clunk, the hum drops
          this.clank(t, 0.6, 0.35); this.thump(t + 0.05, 36, 1.1, 0.7); this.rustle(t + 0.05, 0.8, 120, 900, 0.7, 0.18); break;
        case 'shuffle': for (let i = 0; i < 16; i++) this.rustle(t + i * 0.03 + Math.random() * 0.01, 0.035, 2600, 1600, 2.2, 0.2); break;
        case 'stack': { const n = 2 + Math.min(6, Math.floor((k || 1) / 4)); for (let i = 0; i < n; i++) this.chip(t + i * 0.04, 0.7 + Math.random() * 0.25, 0.24); this.thump(t, 50 - Math.min(20, k), 0.4, 0.4); break; }
        case 'took': for (let i = 0; i < 8; i++) this.chip(t + i * 0.035, 0.6 + Math.random() * 0.3, 0.18); this.thump(t, 48, 0.5, 0.6); break;
        case 'skip': this.rustle(t, 0.18, 600, 2600, 0.8, 0.2); this.clank(t + 0.03, 1.6, 0.12); break;
        case 'swap': this.rustle(t, 0.25, 400, 2200, 0.8, 0.2); this.rustle(t + 0.2, 0.25, 2200, 400, 0.8, 0.2); break;
        case 'turn': this.bell(t, 1); break;
        case 'lastcall': [0, 0.5, 1.0].forEach(d => this.bell(t + d, 0.55)); this.thump(t, 40, 0.6, 0.5); break;
        case 'ko': this.gun(t, 0.8); this.strike(t + 0.2, 98, 1.6, 0.16, [1, 2.4]); break;
        case 'win': // a slow, ugly chord and the machine coughing up coins
          [110, 131, 165].forEach((f, i) => this.strike(t + i * 0.12, f, 2.2, 0.16, [1, 2, 3.01])); for (let i = 0; i < 10; i++) this.coin(t + 0.5 + i * 0.07, 0.8 + (i % 4) * 0.1); break;
        case 'bad': { const c2 = this.ctx, o = c2.createOscillator(), g = c2.createGain(); o.type = 'sawtooth'; o.frequency.value = 55; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); this.route(g, 0.2); o.start(t); o.stop(t + 0.4); break; }
        case 'click': this.rustle(t, 0.02, 3400, 2200, 2, 0.15); break;
      }
    } catch (e) {}
  }
};
document.addEventListener('pointerdown', () => SFX.init(), { capture: true });

