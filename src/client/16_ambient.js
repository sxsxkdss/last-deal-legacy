// ================= AMBIENT: the room you play in =================
// 'house' = a synthesized back-room hum (or the asset pack's music file), 'youtube' = a YouTube video playing hidden.
const AMB = {
  nodes: null, yt: null, side: 'L',
  YT: 'a8P8ATq9eFA',
  ytId(url) { const m = String(url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(url || '') ? url : 'hFBn_Ro9y7I'); },
  // the room's music: a music file from the asset pack if there is one, otherwise the YouTube track
  apply() {
    this.stopHouse();
    const pack = ASSETS.manifest && ASSETS.manifest.sounds && ASSETS.manifest.sounds.music;
    // never start YouTube before we know there's no music file, or both play (and YouTube starts at full volume)
    if (!S.sound || S.ambient === 'off' || pack || !ASSETS.ready) { this.stopYT(); return; }
    this.startYT();
  },
  // a low drone, a slow murmur and vinyl crackle; brighter by day, heavier at night
  startHouse() {
    if (this.nodes || !SFX.ctx) return;
    const c = SFX.ctx, out = c.createGain(); out.gain.value = 0; out.connect(c.destination);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(out);
    const oscs = [55, 55.4, 82.4, 110.2].map((f, i) => { const o = c.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; const g = c.createGain(); g.gain.value = i < 2 ? 0.05 : 0.03; o.connect(g); g.connect(lp); o.start(); return o; });
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 140; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    const mur = c.createBufferSource(); mur.buffer = SFX.noise; mur.loop = true;
    const mf = c.createBiquadFilter(); mf.type = 'bandpass'; mf.frequency.value = 520; mf.Q.value = 0.8;
    const mg = c.createGain(); mg.gain.value = 0.05; mur.connect(mf); mf.connect(mg); mg.connect(out); mur.start();
    const crackle = setInterval(() => { if (!this.nodes || !S.sound) return; if (Math.random() < 0.5) SFX.rustle(c.currentTime + Math.random() * 0.2, 0.01, 3000 + Math.random() * 3000, 2000, 4, 0.03 * (S.ambVol ?? 0.35)); }, 180);
    this.nodes = { out, lp, oscs, lfo, mur, mf, crackle };
    this.setSide(this.side); this.volume();
  },
  stopHouse() {
    if (!this.nodes) return; const n = this.nodes; this.nodes = null; clearInterval(n.crackle);
    try { n.out.gain.setTargetAtTime(0, SFX.ctx.currentTime, 0.3); setTimeout(() => { n.oscs.forEach(o => o.stop()); n.lfo.stop(); n.mur.stop(); n.out.disconnect(); }, 1200); } catch (e) {}
  },
  startYT() {
    if (this.yt) { this.volume(); return; }
    const id = this.YT, f = document.createElement('iframe');
    f.src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&enablejsapi=1&playsinline=1&origin=${encodeURIComponent(location.origin)}`;
    f.allow = 'autoplay; encrypted-media'; f.title = 'ambient'; f.tabIndex = -1;
    Object.assign(f.style, { position: 'fixed', width: '1px', height: '1px', left: '-10px', bottom: '-10px', opacity: '0', pointerEvents: 'none', border: '0' });
    document.body.appendChild(f); this.yt = f;
    // the player only takes commands once it is ready, so keep telling it the volume for a few seconds, then unmute
    f.addEventListener('load', () => { let k = 0; const iv = setInterval(() => { this.volume(); if (++k > 12 || !this.yt) clearInterval(iv); }, 500); });
  },
  stopYT() { if (this.yt) { this.yt.remove(); this.yt = null; } },
  volume() {
    const v = S.ambVol ?? 0.35;
    if (this.nodes) this.nodes.out.gain.setTargetAtTime(v * 1.4, SFX.ctx.currentTime, 0.4);
    if (this.yt && this.yt.contentWindow) {
      const cmd = (func, args = []) => this.yt.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      cmd('setVolume', [Math.round(v * v * 100)]); cmd(v > 0 ? 'unMute' : 'mute');
    }
  },
  setSide(side) {
    this.side = side;
    if (!this.nodes) return;
    const night = side === 'D', t0 = SFX.ctx.currentTime;
    this.nodes.lp.frequency.setTargetAtTime(night ? 260 : 520, t0, 1.2);
    this.nodes.mf.frequency.setTargetAtTime(night ? 300 : 700, t0, 1.2);
    this.nodes.oscs.forEach((o, i) => o.detune.setTargetAtTime(night ? -300 : 0, t0, 1.5)); // a minor third down at night
  }
};
// ambient starts with the first interaction (browsers block sound before that)
document.addEventListener('pointerdown', () => { SFX.init(); AMB.apply(); }, { once: true });

