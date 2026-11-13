// ===== ENGINE: UNO Flip × No Mercy × Classic (no DOM) =====
const SIDE_COLORS = { L: ['r', 'y', 'g', 'b'], D: ['p', 't', 'o', 'v'] };
const COLOR_NAME = { r: 'Red', y: 'Yellow', g: 'Green', b: 'Blue', p: 'Pink', t: 'Teal', o: 'Orange', v: 'Purple', w: 'Wild' };
const VALUE_NAME = {
  skip: 'Skip', rev: 'Reverse', d1: 'Draw 1', d2: 'Draw 2', d4: 'Draw 4', d5: 'Draw 5', flip: 'Flip',
  discall: 'Discard All', skipall: 'Skip Everyone', wild: 'Wild', wd2: 'Wild Draw 2', wd4: 'Wild Draw 4',
  wrd4: 'Wild Reverse Draw 4', wd6: 'Wild Draw 6', wd10: 'Wild Draw 10', wrd8: 'Wild Reverse Draw 8',
  wdc: 'Wild Draw Color', roul: 'Wild Color Roulette',
  mirror: 'Mirror', shield: 'Shield', dflip: 'Double Flip', duel: 'Wild Duel', wd15: 'Wild Draw 15', bhole: 'Black Hole'
};
const EXTRA_CARDS = ['mirror', 'shield', 'dflip', 'duel', 'wd15', 'bhole'];
const DRAW_VAL = { d1: 1, d2: 2, wd2: 2, d4: 4, wd4: 4, wrd4: 4, d5: 5, wd6: 6, wrd8: 8, wd10: 10, wd15: 15 };
// Weights for each side. Light = classic UNO + Flip light side + No Mercy. Dark = Flip dark side, nastier.
const SIDE_WEIGHTS = {
  L: { colored: { '0': 1, '1': 2, '2': 2, '3': 2, '4': 2, '5': 2, '6': 2, '7': 2, '8': 2, '9': 2, skip: 2, rev: 2, d1: 2, d2: 2, flip: 2, d4: 1, discall: 2, skipall: 1, mirror: 1, shield: 1, dflip: 1 },
       wild: { wild: 4, wd2: 2, wd4: 3, wrd4: 3, wd6: 2, wd10: 1, roul: 2, duel: 2 } },
  D: { colored: { '1': 2, '2': 2, '3': 2, '4': 2, '5': 2, '6': 2, '7': 2, '8': 2, '9': 2, skipall: 2, rev: 2, d5: 2, flip: 2, discall: 2, dflip: 1 },
       wild: { wild: 4, wdc: 4, wd6: 2, wd10: 2, wrd8: 2, roul: 2, wd15: 1, bhole: 1 } }
};
const FACES = {}, FACE_W = {};
for (const s of ['L', 'D']) {
  FACES[s] = []; FACE_W[s] = [];
  for (const c of SIDE_COLORS[s]) for (const [v, w] of Object.entries(SIDE_WEIGHTS[s].colored)) { FACES[s].push({ c, v }); FACE_W[s].push(w); }
  for (const [v, w] of Object.entries(SIDE_WEIGHTS[s].wild)) { FACES[s].push({ c: 'w', v }); FACE_W[s].push(w); }
}
// Safe printable chars ('#'..'~' minus backslash, then Latin-1 ¡..ÿ) index faces on the wire: 1 char per side.
const ALPHA = (Array.from({ length: 92 }, (_, i) => String.fromCharCode(35 + i)).filter(ch => ch !== '\\').join('') + Array.from({ length: 95 }, (_, i) => String.fromCharCode(161 + i)).join(''));
const faceIdx = (s, f) => FACES[s].findIndex(x => x.c === f.c && x.v === f.v);
let CARD_ID = 1;
function randFace(s) {
  const w = FACE_W[s]; let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return Object.assign({}, FACES[s][i]);
  return Object.assign({}, FACES[s][0]);
}
function randCard() { return { id: CARD_ID++, L: randFace('L'), D: randFace('D') }; }
const cardCode = card => ALPHA[faceIdx('L', card.L)] + ALPHA[faceIdx('D', card.D)];
const codeCard = code => ({ id: CARD_ID++, L: Object.assign({}, FACES.L[ALPHA.indexOf(code[0])]), D: Object.assign({}, FACES.D[ALPHA.indexOf(code[1])]) });
const other = s => s === 'L' ? 'D' : 'L';
function faceName(f) { return f.c === 'w' ? VALUE_NAME[f.v] : COLOR_NAME[f.c] + ' ' + (VALUE_NAME[f.v] || f.v); }

class Game {
  constructor(names, humans, rules) {
    rules = Object.assign({}, rules);
    if ('sevenZero' in rules && !('seven' in rules)) { rules.seven = rules.zero = rules.sevenZero; }
    delete rules.sevenZero;
    this.rules = Object.assign({ stacking: true, drawUntil: true, seven: true, zero: true, multi: true, jumpIn: true, mercy: 25, handSize: 7, uno: true, flip: true }, rules);
    this.rules.cards = Object.assign(Object.fromEntries(EXTRA_CARDS.map(k => [k, true])), rules.cards);
    // card values that never get dealt at this table
    this.rules.off = EXTRA_CARDS.filter(k => !this.rules.cards[k]).concat(this.rules.flip ? [] : ['flip', 'dflip']);
    const hum = Array.isArray(humans) ? humans : [humans];
    this.gid = Math.random().toString(36).slice(2, 8);
    this.side = 'L';
    this.next = this.newCard();
    this.players = names.map((n, i) => ({ name: n, hand: [], human: hum.includes(i), out: false, elim: false, unoCalled: false, vulnerable: false, shield: false, av: '', peer: '' }));
    for (const p of this.players) for (let i = 0; i < this.rules.handSize; i++) p.hand.push(this.newCard());
    let top;
    do { top = this.newCard(); } while (top.L.c === 'w' || isNaN(+top.L.v));
    this.top = top; this.color = top.L.c; this.dir = 1;
    this.turn = Math.floor(Math.random() * names.length);
    this.pending = 0; this.stackMin = 0; this.stackFrom = -1; this.roulette = null; this.flipBack = null;
    this.drewBy = -1; this.winner = null; this.log = []; this.seq = 0;
    this.events = []; this.evSeq = 0;
    this.addLog(`First card: ${faceName(top.L)}. ${this.players[this.turn].name} starts.`);
    this.ev('start');
  }
  newCard() {
    const c = randCard(), off = this.rules.off || [];
    for (const s of ['L', 'D']) { let g = 0; while (off.includes(c[s].v) && g++ < 60) c[s] = randFace(s); }
    return c;
  }
  f(card) { return card[this.side]; }
  back(card) { return card[other(this.side)]; }
  colors() { return SIDE_COLORS[this.side]; }
  addLog(msg, cls = '') { this.log.push({ msg, cls }); if (this.log.length > 200) this.log.shift(); }
  ev(type, data = {}) { this.events.push(Object.assign({ type, n: ++this.evSeq }, data)); if (this.events.length > 24) this.events.shift(); }
  active() { return this.players.filter(p => !p.out); }
  nextIdx(from, steps = 1) {
    let i = from; const n = this.players.length;
    for (let s = 0; s < steps; s++) { let g = 0; do { i = (i + this.dir + n) % n; } while (this.players[i].out && ++g < n); }
    return i;
  }
  canPlay(card) {
    if (this.roulette !== null || card.hidden) return false;
    const f = this.f(card), t = this.f(this.top);
    if (this.pending > 0) return f.v === 'mirror' || (this.rules.stacking && (DRAW_VAL[f.v] || 0) >= this.stackMin);
    return f.c === 'w' || f.c === this.color || f.v === t.v;
  }
  canJumpIn(pi, card) {
    if (!this.rules.jumpIn || this.winner !== null || this.roulette !== null || pi === this.turn || this.players[pi].out || card.hidden) return false;
    const f = this.f(card), t = this.f(this.top);
    return f.c !== 'w' && f.c === t.c && f.v === t.v;
  }
  playable(pi) { return this.players[pi].hand.filter(c => this.canPlay(c)); }
  validColor(c, pi) { return this.colors().includes(c) ? c : Bot.bestColor(this, this.players[pi].hand, this.side); }
  give(pi, k, until) {
    const p = this.players[pi]; const got = [];
    while (true) {
      if (until) { if (got.length && until(got[got.length - 1])) break; }
      else if (got.length >= k) break;
      const c = this.next; this.next = this.newCard();
      p.hand.push(c); got.push(c);
      if (this.rules.mercy && p.hand.length >= this.rules.mercy) break;
      if (got.length > 300) break;
    }
    if (p.hand.length !== 1) p.vulnerable = false;
    if (got.length) this.ev('draw', { pi, k: got.length });
    return got;
  }
  mercyCheck() {
    if (this.rules.mercy) for (const p of this.players) {
      if (!p.out && p.hand.length >= this.rules.mercy) {
        p.out = true; p.elim = true;
        this.addLog(`${p.name} hit ${p.hand.length} cards and is knocked out by the Mercy Rule.`, 'bad');
        this.ev('ko', { pi: this.players.indexOf(p) });
      }
    }
    const act = this.active();
    if (act.length === 1 && this.winner === null) {
      this.winner = this.players.indexOf(act[0]);
      this.addLog(`${act[0].name} is the last one standing.`, 'win');
      this.ev('win', { pi: this.winner });
    }
    if (this.winner === null && this.players[this.turn].out) this.turn = this.nextIdx(this.turn, 1);
    if (this.roulette !== null && this.players[this.roulette].out) { this.roulette = null; }
  }
  play(pi, cardId, opts = {}) {
    const p = this.players[pi];
    const idx = p.hand.findIndex(c => c.id === cardId);
    if (idx < 0 || this.winner !== null) return false;
    const card = p.hand[idx];
    const jump = pi !== this.turn;
    if (jump ? !this.canJumpIn(pi, card) : !this.canPlay(card)) return false;
    const face = this.f(card);
    // Same-number drop: extra cards with the same value (never wilds) go down with the first one.
    const chain = [card];
    if (this.rules.multi && face.c !== 'w' && Array.isArray(opts.extra)) {
      for (const id of opts.extra) {
        const c = p.hand.find(x => x.id === id);
        if (c && !chain.includes(c) && this.f(c).c !== 'w' && this.f(c).v === face.v) chain.push(c);
      }
    }
    const k = chain.length;
    p.hand = p.hand.filter(c => !chain.includes(c));
    const last = chain[k - 1];
    this.top = last;
    this.color = face.c === 'w' ? this.validColor(opts.color, pi) : this.f(last).c;
    this.seq++; this.drawRun = 0;
    let extra = '';
    if (face.v === 'discall') {
      const cols = new Set(chain.map(c => this.f(c).c));
      const same = p.hand.filter(c => cols.has(this.f(c).c));
      p.hand = p.hand.filter(c => !cols.has(this.f(c).c));
      if (same.length) extra = ` and discards ${same.length} more card${same.length > 1 ? 's' : ''} of ${k > 1 ? 'those colors' : 'that color'}`;
    }
    const showColor = face.c === 'w' && face.v !== 'roul';
    const what = k > 1 ? chain.map(c => faceName(this.f(c))).join(', ') : faceName(face);
    this.addLog(`${jump ? p.name + ' jumps in with' : p.name + ' plays'} ${what}${showColor ? ' → ' + COLOR_NAME[this.color] : ''}${extra}.`, jump ? 'jump' : '');
    this.ev('play', { pi, code: cardCode(last), side: this.side, jump, k });
    if (k > 1) this.ev('multi', { pi, k });
    if (showColor) this.ev('color', { c: this.color });
    this.turn = pi;
    this.drewBy = -1;
    if (p.hand.length === 1) { p.vulnerable = this.rules.uno && !p.unoCalled; if (p.unoCalled) { this.addLog(`${p.name} calls UNO.`, 'uno'); this.ev('uno', { pi }); } }
    else p.vulnerable = false;
    p.unoCalled = false;
    if (p.hand.length === 0) {
      this.winner = pi; p.out = true;
      this.addLog(`${p.name} empties their hand and wins.`, 'win');
      this.ev('win', { pi });
      return true;
    }
    let steps = 1;
    const n = this.active().length;
    switch (face.v) {
      case '7':
        if (this.rules.seven && opts.target != null && opts.target !== pi && this.players[opts.target] && !this.players[opts.target].out) {
          const t = this.players[opts.target];
          [p.hand, t.hand] = [t.hand, p.hand];
          this.addLog(`${p.name} swaps hands with ${t.name} (${p.hand.length} ↔ ${t.hand.length}).`, 'swap');
          this.ev('swap', { a: pi, b: opts.target });
          for (const q of [p, t]) if (q.hand.length !== 1) q.vulnerable = false;
        }
        break;
      case '0':
        if (this.rules.zero) {
          const order = []; let i = pi;
          do { order.push(i); i = this.nextIdx(i, 1); } while (i !== pi && order.length < 20);
          const hands = order.map(j => this.players[j].hand);
          order.forEach((j, k) => { this.players[order[(k + 1) % order.length]].hand = hands[k]; });
          for (const q of this.players) q.vulnerable = false;
          this.addLog(`Everyone passes their hand ${this.dir === 1 ? 'clockwise' : 'counter-clockwise'}!`, 'swap');
          this.ev('rotate', {});
        }
        break;
      case 'skip':
        steps = 1 + k;
        for (let s = 1; s <= k; s++) this.ev('skip', { pi: this.nextIdx(pi, s) });
        break;
      case 'rev':
        if (k % 2) { this.dir *= -1; steps = n === 2 ? 2 : 1; this.ev('reverse', { dir: this.dir }); }
        break;
      case 'skipall': steps = 0; this.ev('skipall', { pi }); break;
      case 'd1': case 'd2': case 'd4': case 'd5': case 'wd2': case 'wd4': case 'wd6': case 'wd10': case 'wd15':
        this.pending += DRAW_VAL[face.v] * k; this.stackMin = DRAW_VAL[face.v]; this.stackFrom = pi; break;
      case 'wrd4': case 'wrd8':
        this.dir *= -1; this.pending += DRAW_VAL[face.v]; this.stackMin = DRAW_VAL[face.v]; this.stackFrom = pi; this.ev('reverse', { dir: this.dir }); break;
      case 'mirror':
        if (this.pending > 0) {
          const back = this.stackFrom;
          if (back >= 0 && back !== pi && !this.players[back].out) {
            this.addLog(`${p.name} mirrors the +${this.pending} stack back to ${this.players[back].name}.`, 'swap');
            this.ev('mirror', { a: pi, b: back, k: this.pending });
            this.stackFrom = pi; this.turn = back; steps = -1;
          }
        }
        break;
      case 'shield':
        if (!p.shield) { p.shield = true; this.addLog(`${p.name} raises a shield. The next stack that reaches them breaks.`, 'swap'); this.ev('shieldup', { pi }); }
        break;
      case 'duel': {
        const tgt = opts.target != null && opts.target !== pi && this.players[opts.target] && !this.players[opts.target].out ? opts.target : this.nextIdx(pi, 1);
        const flipNum = () => { const got = []; let n = null; while (n === null && got.length < 40) { const c = this.newCard(); got.push(c); const fv = this.f(c).v; if (!isNaN(+fv)) n = +fv; } return { got, n: n || 0 }; };
        let pool = [], a, b, rounds = 0;
        do { a = flipNum(); b = flipNum(); pool = pool.concat(a.got, b.got); rounds++; } while (a.n === b.n && rounds < 5);
        const loser = a.n < b.n ? pi : tgt;
        this.players[loser].hand.push(...pool);
        this.addLog(`${p.name} duels ${this.players[tgt].name}: ${a.n} vs ${b.n}. ${this.players[loser].name} takes all ${pool.length} flipped cards.`, 'bad');
        this.ev('duel', { a: pi, b: tgt, na: a.n, nb: b.n, loser, k: pool.length });
        this.ev('draw', { pi: loser, k: pool.length });
        if (this.players[loser].hand.length !== 1) this.players[loser].vulnerable = false;
        break;
      }
      case 'bhole': {
        const act = this.players.map((q, i) => i).filter(i => !this.players[i].out);
        const all = act.flatMap(i => this.players[i].hand);
        if (all.length >= act.length * 2) {
          for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
          const order = []; let i = this.nextIdx(pi, 1);
          for (let k = 0; k < act.length; k++) { order.push(i); i = this.nextIdx(i, 1); }
          for (const j of act) this.players[j].hand = [];
          all.forEach((c, k) => this.players[order[k % order.length]].hand.push(c));
          for (const q of this.players) q.vulnerable = false;
          this.addLog(`Black hole. Every hand is pooled and dealt back out: ${act.map(j => this.players[j].name + ' ' + this.players[j].hand.length).join(', ')}.`, 'swap');
          this.ev('bhole', {});
        }
        break;
      }
      case 'roul':
        this.roulette = this.nextIdx(pi, 1); this.ev('roulette', { pi: this.roulette }); break;
      case 'wdc': {
        const vi = this.nextIdx(pi, 1), col = this.color;
        const got = this.give(vi, 0, c => c && this.f(c).c === col);
        this.addLog(`${this.players[vi].name} must draw until ${COLOR_NAME[col]}: +${got.length} cards.`, 'bad');
        steps = 2; break;
      }
      case 'dflip':
      case 'flip': {
        if (k % 2 === 0) { this.addLog(`${k} flips cancel out. The table stays on the ${this.side === 'D' ? 'dark' : 'light'} side.`, 'flip'); break; }
        this.side = other(this.side);
        this.flipBack = face.v === 'dflip' ? { pi: this.nextIdx(pi, 1), seq: this.seq } : null;
        const nf = this.f(this.top);
        this.color = nf.c === 'w' ? this.validColor(opts.flipColor, pi) : nf.c;
        this.addLog(`Flip. Everything turns to the ${this.side === 'D' ? 'dark' : 'light'} side. Top card is now ${faceName(nf)}${nf.c === 'w' ? ' → ' + COLOR_NAME[this.color] : ''}.`, 'flip');
        this.ev('flip', { side: this.side });
        if (face.v === 'dflip') this.addLog(`Double flip: it turns back after ${this.players[this.nextIdx(pi, 1)].name}'s turn.`, 'flip');
        break;
      }
    }
    if (face.v === 'roul') this.turn = this.roulette;
    else if (steps >= 0) this.turn = steps === 0 ? pi : this.nextIdx(pi, steps);
    this.applyShield();
    this.checkFlipBack();
    if (this.pending > 0 && DRAW_VAL[face.v]) {
      this.addLog(`Stack is now +${this.pending}. ${this.players[this.turn].name} must stack or take it.`, 'stack');
      this.ev('stack', { k: this.pending, pi: this.turn });
    }
    this.mercyCheck();
    return true;
  }
  // Double Flip: once the player after the flipper has acted, the table turns back.
  checkFlipBack() {
    const fb = this.flipBack;
    if (!fb || this.winner !== null) return;
    if (this.seq > fb.seq && this.turn !== fb.pi) {
      this.flipBack = null;
      this.side = other(this.side);
      const nf = this.f(this.top);
      this.color = nf.c === 'w' ? Bot.bestColor(this, this.players[this.turn].hand, this.side) : nf.c;
      this.addLog(`The double flip wears off. Back to the ${this.side === 'D' ? 'dark' : 'light'} side: ${faceName(nf)}${nf.c === 'w' ? ' → ' + COLOR_NAME[this.color] : ''}.`, 'flip');
      this.ev('flip', { side: this.side });
    }
  }
  applyShield() {
    const t = this.players[this.turn];
    if (this.pending > 0 && t && t.shield && !t.out) {
      t.shield = false;
      this.addLog(`${t.name}'s shield breaks the +${this.pending} stack.`, 'swap');
      this.ev('shield', { pi: this.turn, k: this.pending });
      this.pending = 0; this.stackMin = 0; this.stackFrom = -1;
    }
  }
  draw(pi) {
    if (pi !== this.turn || this.roulette !== null || this.winner !== null) return null;
    const p = this.players[pi];
    if (this.pending > 0) {
      const k = this.pending;
      const got = this.give(pi, k);
      this.addLog(`${p.name} takes the stack: +${got.length} card${got.length === 1 ? '' : 's'} (now ${p.hand.length}).`, 'bad');
      this.ev('took', { pi, k: got.length });
      this.pending = 0; this.stackMin = 0; this.stackFrom = -1;
      this.turn = this.nextIdx(pi, 1); this.seq++;
      this.mercyCheck(); this.checkFlipBack();
      return got;
    }
    if (this.drewBy === pi) return null;
    const got = this.give(pi, 1);
    this.seq++;
    if (!this.rules.drawUntil) {
      this.drewBy = pi;
      this.addLog(`${p.name} draws a card.`);
    } else {
      // one card per draw: the player keeps drawing by hand until something is playable
      this.drawRun = (this.drawRunPi === pi ? this.drawRun || 0 : 0) + got.length; this.drawRunPi = pi;
      if (got[0] && this.canPlay(got[0])) {
        this.drewBy = pi;
        this.addLog(`${p.name} draws ${this.drawRun} card${this.drawRun > 1 ? 's' : ''} before finding a playable one.`);
        this.drawRun = 0;
      }
    }
    this.mercyCheck();
    return got;
  }
  pass(pi) {
    if (pi !== this.turn || this.drewBy !== pi || this.pending > 0) return false;
    this.addLog(`${this.players[pi].name} passes.`);
    this.drewBy = -1; this.drawRun = 0; this.seq++;
    this.turn = this.nextIdx(pi, 1);
    this.checkFlipBack();
    return true;
  }
  resolveRoulette(color) {
    const vi = this.roulette; if (vi === null) return null;
    if (!this.colors().includes(color)) color = Bot.bestColor(this, this.players[vi].hand, this.side);
    const got = this.give(vi, 0, c => c && this.f(c).c === color);
    this.color = color;
    this.addLog(`${this.players[vi].name} calls ${COLOR_NAME[color]} and flips ${got.length} card${got.length > 1 ? 's' : ''} before hitting it.`, 'bad');
    this.ev('color', { c: color });
    this.roulette = null; this.seq++;
    this.turn = this.nextIdx(vi, 1);
    this.mercyCheck(); this.checkFlipBack();
    return got;
  }
  callUno(pi) {
    const p = this.players[pi];
    if (p.out) return false;
    if (p.hand.length === 1 && p.vulnerable) { p.vulnerable = false; this.addLog(`${p.name} calls UNO just in time`, 'uno'); this.ev('uno', { pi }); return true; }
    if ((p.hand.length <= 2 || (this.rules.multi && this.unoReach(pi))) && !p.unoCalled) { p.unoCalled = true; this.ev('uno', { pi }); return true; }
    return false;
  }
  // A player who is away (disconnected, or idle too long) has their turn skipped.
  // If a stack is waiting on them, they take it, so nobody else is punished for their absence.
  skipTurn(pi) {
    if (this.winner !== null) return false;
    const p = this.players[pi];
    if (this.roulette === pi) {
      const cols = this.colors();
      this.addLog(`${p.name} is away. A random color is called for them.`, 'stk');
      this.resolveRoulette(cols[Math.floor(Math.random() * cols.length)]);
      return true;
    }
    if (this.turn !== pi) return false;
    if (this.pending > 0) { this.addLog(`${p.name} is away and takes the stack.`, 'stk'); this.draw(pi); return true; }
    this.addLog(`${p.name} is away. Turn skipped.`, 'stk');
    this.drewBy = -1; this.drawRun = 0; this.seq++;
    this.ev('skip', { pi });
    this.turn = this.nextIdx(pi, 1);
    this.applyShield(); this.checkFlipBack();
    return true;
  }
  // can this player get down to one card in a single same-number drop?
  unoReach(pi) {
    const h = this.players[pi].hand, cnt = {};
    for (const c of h) { const f = this.f(c); if (f.c !== 'w') cnt[f.v] = (cnt[f.v] || 0) + 1; }
    return Object.values(cnt).some(n => n >= h.length - 1);
  }
  catchUno(catcher, target) {
    const t = this.players[target];
    if (!t || !t.vulnerable || t.hand.length !== 1 || t.out || catcher === target) return false;
    t.vulnerable = false;
    this.addLog(`${this.players[catcher].name} catches ${t.name} not saying UNO: +2 cards.`, 'bad');
    this.ev('caught', { pi: target, by: catcher });
    this.give(target, 2); this.seq++;
    this.mercyCheck();
    return true;
  }
}

// ===== BOT BRAIN =====
const Bot = {
  strength(f) { if (!f) return 0; if (f.c === 'w') return 3 + (DRAW_VAL[f.v] || 0) / 2; if (DRAW_VAL[f.v]) return 1.5 + DRAW_VAL[f.v] / 2; return isNaN(+f.v) ? 2 : 1; },
  bestColor(g, hand, side) {
    const cols = SIDE_COLORS[side]; const cnt = Object.fromEntries(cols.map(c => [c, 0]));
    for (const c of hand) { if (c.hidden) continue; const f = c[side]; if (f.c !== 'w') cnt[f.c] += 1 + (isNaN(+f.v) ? 0.5 : 0); }
    let best = cols[Math.floor(Math.random() * 4)], bv = 0;
    for (const k of cols) if (cnt[k] > bv) { bv = cnt[k]; best = k; }
    return best;
  },
  choose(g, pi) {
    const p = g.players[pi];
    const opts = g.playable(pi);
    if (!opts.length) return null;
    const nextI = g.nextIdx(pi, 1), nl = g.players[nextI].hand.length;
    const others = g.players.map((q, i) => ({ q, i })).filter(o => o.i !== pi && !o.q.out);
    const minOther = others.reduce((a, b) => (b.q.hand.length < a.q.hand.length ? b : a), others[0]);
    const colorCount = c => p.hand.filter(x => g.f(x).c === c).length;
    let best = null, bestScore = -Infinity;
    for (const card of opts) {
      const f = g.f(card);
      let s = 10 + Math.random() * 3;
      if (g.pending > 0) {
        if (f.v === 'mirror') s += g.pending >= 4 ? 30 : -2;
        else { s -= DRAW_VAL[f.v]; if (f.c === 'w') s -= 3; }
      }
      else {
        const dv = DRAW_VAL[f.v] || 0;
        if (f.c === 'w') s -= p.hand.length > 3 ? 8 : 0;
        if (dv) s += dv * 1.5 + (nl <= 3 ? 20 : 0);
        if (f.v === 'skip' || f.v === 'rev') s += nl <= 3 ? 12 : 3;
        if (f.v === 'skipall') s += 6 + (nl <= 3 ? 10 : 0);
        if (f.v === 'discall') s += 5 * (colorCount(f.c) - 1);
        if (f.v === 'roul' || f.v === 'wdc') s += nl <= 3 ? 18 : 6;
        if (f.v === 'mirror') s -= 6; // save it for a stack
        if (f.v === 'shield') s += p.shield ? -8 : 4;
        if (f.v === 'duel') s += minOther.q.hand.length <= 3 ? 16 : 5;
        if (f.v === 'bhole') { const avg = others.reduce((a, o) => a + o.q.hand.length, p.hand.length) / (others.length + 1); s += (p.hand.length - 1 - avg) * 3; }
        if (f.v === 'dflip') s += nl <= 3 ? 8 : 1;
        if (f.v === 'flip') {
          const rest = p.hand.filter(c => c !== card);
          const gain = rest.reduce((a, c) => a + Bot.strength(g.back(c)) - Bot.strength(g.f(c)), 0);
          s += gain * 0.7 + (nl <= 3 ? 5 : 0);
        }
        if (f.v === '7' && g.rules.seven) { const diff = p.hand.length - 1 - minOther.q.hand.length; s += diff >= 2 ? 6 * diff : 0; }
        if (f.v === '0' && g.rules.zero) {
          const n = g.players.length; let j = pi;
          do { j = (j - g.dir + n) % n; } while (g.players[j].out);
          s += (p.hand.length - 1 - g.players[j].hand.length) * 5;
        }
        if (f.c !== 'w') s += colorCount(f.c) * 0.8;
      }
      if (s > bestScore) { bestScore = s; best = card; }
    }
    const bf = g.f(best);
    // drop every matching card when the table allows it
    const extra = g.rules.multi && bf.c !== 'w' ? p.hand.filter(c => c !== best && g.f(c).c !== 'w' && g.f(c).v === bf.v) : [];
    const rest = p.hand.filter(c => c !== best && !extra.includes(c));
    const swapGain = minOther ? rest.length - minOther.q.hand.length : 0;
    return {
      cardId: best.id, extra: extra.map(c => c.id),
      color: bf.c === 'w' ? this.bestColor(g, rest, g.side) : null,
      flipColor: (bf.v === 'flip' || bf.v === 'dflip') ? this.bestColor(g, rest, other(g.side)) : null,
      target: bf.v === 'duel' ? minOther.i : (bf.v === '7' && g.rules.seven && swapGain >= 2 ? minOther.i : null)
    };
  },
  jumpCandidate(g) {
    if (!g.rules.jumpIn || g.winner !== null || g.roulette !== null) return null;
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      if (p.human || p.out || i === g.turn) continue;
      const c = p.hand.find(c => g.canJumpIn(i, c));
      if (c && Math.random() < 0.35) return { pi: i, card: c };
    }
    return null;
  }
};

// ===== WIRE FORMAT =====
// viewer = -1 → everything; otherwise other players' hands carry only their visible backs (as in real UNO Flip).
function serialize(g, viewer = -1, logN = 8) {
  const ob = other(g.side);
  return {
    gid: g.gid, ru: g.rules, sd: g.side,
    p: g.players.map((p, i) => [p.name, p.av || '', p.peer || '',
      (viewer < 0 || i === viewer) ? p.hand.map(cardCode).join('') : '!' + p.hand.map(c => ALPHA[faceIdx(ob, c[ob])]).join(''),
      (p.out ? 1 : 0) | (p.elim ? 2 : 0) | (p.vulnerable ? 4 : 0) | (p.unoCalled ? 8 : 0) | (p.human ? 16 : 0) | (p.shield ? 32 : 0)]),
    t: cardCode(g.top), nb: ALPHA[faceIdx(ob, g.next[ob])], c: g.color, d: g.dir, u: g.turn, k: g.pending, m: g.stackMin, sf: g.stackFrom, dr: [g.drawRunPi == null ? -1 : g.drawRunPi, g.drawRun || 0], fb: g.flipBack ? [g.flipBack.pi, g.flipBack.seq] : null,
    o: g.roulette === null ? -1 : g.roulette, w: g.drewBy, x: g.winner === null ? -1 : g.winner, s: g.seq,
    l: g.log.slice(-logN).map(l => [String(l.msg).slice(0, 160), l.cls]),
    ev: g.events.slice(-12), es: g.evSeq
  };
}
function deserialize(st) {
  const g = Object.create(Game.prototype);
  g.gid = String(st.gid); g.rules = st.ru; g.side = st.sd === 'D' ? 'D' : 'L';
  const ob = other(g.side);
  g.players = st.p.map(a => {
    const hs = String(a[3] || '');
    let hand;
    if (hs[0] === '!') hand = [...hs.slice(1)].map(ch => { const c = { id: CARD_ID++, hidden: true }; c[ob] = Object.assign({}, FACES[ob][ALPHA.indexOf(ch)] || { c: 'w', v: 'wild' }); return c; });
    else { hand = []; for (let i = 0; i + 1 < hs.length; i += 2) hand.push(codeCard(hs.slice(i, i + 2))); }
    return { name: String(a[0]).slice(0, 20), av: String(a[1]).slice(0, 8), peer: String(a[2] || ''), hand,
      out: !!(a[4] & 1), elim: !!(a[4] & 2), vulnerable: !!(a[4] & 4), unoCalled: !!(a[4] & 8), human: !!(a[4] & 16), shield: !!(a[4] & 32) };
  });
  g.top = codeCard(st.t);
  g.next = { id: 0, hidden: true }; g.next[ob] = Object.assign({}, FACES[ob][ALPHA.indexOf(st.nb)] || { c: 'w', v: 'wild' });
  g.color = st.c; g.dir = st.d; g.turn = st.u; g.pending = st.k; g.stackMin = st.m; g.stackFrom = typeof st.sf === 'number' ? st.sf : -1; if (Array.isArray(st.dr)) { g.drawRunPi = st.dr[0]; g.drawRun = st.dr[1]; } g.flipBack = Array.isArray(st.fb) ? { pi: st.fb[0], seq: st.fb[1] } : null;
  g.roulette = st.o < 0 ? null : st.o; g.drewBy = st.w; g.winner = st.x < 0 ? null : st.x; g.seq = st.s;
  g.log = (st.l || []).map(([msg, cls]) => ({ msg: String(msg), cls: String(cls || '') }));
  g.events = Array.isArray(st.ev) ? st.ev : []; g.evSeq = st.es || 0;
  return g;
}

if (typeof module !== 'undefined') module.exports = { Game, Bot, serialize, deserialize, cardCode, faceName, FACES };
