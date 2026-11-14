// ===== ENGINE: UNO Flip × No Mercy × Classic (no DOM) =====
const SIDE_COLORS = { L: ['r', 'y', 'g', 'b'], D: ['p', 't', 'o', 'v'] };
const COLOR_NAME = { r: 'Red', y: 'Yellow', g: 'Green', b: 'Blue', p: 'Pink', t: 'Teal', o: 'Orange', v: 'Purple', w: 'Wild' };
const VALUE_NAME = {
  skip: 'Skip', rev: 'Reverse', d1: 'Draw 1', d2: 'Draw 2', d4: 'Draw 4', d5: 'Draw 5', flip: 'Flip',
  discall: 'Discard All', skipall: 'Skip Everyone', wild: 'Wild', wd2: 'Wild Draw 2', wd4: 'Wild Draw 4',
  wrd4: 'Wild Reverse Draw 4', wd6: 'Wild Draw 6', wd10: 'Wild Draw 10', wrd8: 'Wild Reverse Draw 8',
  wdc: 'Wild Draw Color', roul: 'Wild Color Roulette',
  mirror: 'Mirror', shield: 'Shield', dflip: 'Double Flip', duel: 'Wild Duel', wd15: 'Wild Draw 15', bhole: 'Black Hole',
  mul2: 'Mult ×2', mul3: 'Mult ×3', lucky: 'Lucky', glass: 'Glass', devil: '666', spin: 'Spin', loan: 'Loan',
  gift: 'Gift', echo: 'Wild Echo', freeze: 'Freeze', interest: 'Interest', sacrifice: 'Wild Sacrifice', wheel: 'Wild Wheel', bomb: 'Bomb',
  d6: 'Wild D6', pill: 'Pill', tower: 'The Tower', glitch: 'Wild Glitch', brim: 'Wild Brimstone', foot: "Mom's Foot", maze: 'Curse of the Maze', deal: 'Wild Devil Deal', monstro: 'Wild Monstro'
};
// ---------- Balatro combos: number cards played together in one drop ----------
// d = extra random cards you throw away, m = cards every opponent picks up (the big hands only)
const COMBOS = {
  pair: { d: 0, m: 0 }, twopair: { d: 1, m: 0 }, three: { d: 1, m: 0 }, straight: { d: 1, m: 0 }, flush: { d: 2, m: 0 },
  fullhouse: { d: 2, m: 0 }, four: { d: 0, m: 1 }, straightflush: { d: 1, m: 2 }, five: { d: 1, m: 2 }
};
// faces: [{c, v}] in play order. Returns { key, m, all, chips } for a valid combo, null otherwise.
function comboOf(faces) {
  if (!faces || faces.length < 2 || faces.some(f => !/^\d$/.test(f.v) || f.c === 'w')) return null;
  const n = faces.length, nums = faces.map(f => +f.v), chips = nums.reduce((a, b) => a + b, 0);
  const cnt = Object.values(nums.reduce((o, x) => (o[x] = (o[x] || 0) + 1, o), {})).sort((a, b) => b - a);
  const oneColor = faces.every(f => f.c === faces[0].c);
  const sorted = nums.slice().sort((a, b) => a - b);
  const run = cnt[0] === 1 && sorted.every((x, i) => !i || x === sorted[i - 1] + 1);
  let key = null;
  if (cnt[0] === n) key = n === 2 ? 'pair' : n === 3 ? 'three' : n === 4 ? 'four' : 'five';
  else if (oneColor && run && n >= 3) key = n >= 5 ? 'straightflush' : 'straight';
  else if (n === 4 && cnt[0] === 2 && cnt[1] === 2) key = 'twopair';
  else if (n === 5 && cnt[0] === 3 && cnt[1] === 2) key = 'fullhouse';
  else if (oneColor && n >= 5) key = 'flush';
  if (!key) return null;
  const C = COMBOS[key];
  const d = key === 'straight' ? n - 2 : C.d;
  return { key, d, m: C.m, chips: chips + n * 5, mult: Math.max(1, d + C.m * 2) };
}
const EXTRA_CARDS = ['mirror', 'shield', 'dflip', 'wd15', 'bhole', 'mul2', 'mul3', 'lucky', 'glass', 'devil', 'spin', 'loan', 'gift', 'echo', 'freeze', 'interest', 'sacrifice', 'wheel', 'bomb', 'd6', 'pill', 'tower', 'glitch', 'brim', 'foot', 'maze', 'deal', 'monstro'];
const DRAW_VAL = { d1: 1, d2: 2, wd2: 2, d4: 4, wd4: 4, wrd4: 4, d5: 5, wd6: 6, wrd8: 8, wd10: 10, wd15: 15 };
// Weights for each side. Light = classic UNO + Flip light side + No Mercy. Dark = Flip dark side, nastier.
const SIDE_WEIGHTS = {
  L: { colored: { '0': 2, '1': 3, '2': 3, '3': 3, '4': 3, '5': 3, '6': 3, '7': 3, '8': 3, '9': 3, skip: 2, rev: 2, d1: 2, d2: 2, flip: 2, d4: 1, discall: 2, skipall: 1, mirror: 1, shield: 1, dflip: 1, lucky: 1, glass: 1, loan: 1, gift: 1, pill: 2, tower: 1 },
       wild: { wild: 4, wd2: 2, wd4: 3, wrd4: 3, wd6: 2, wd10: 1, roul: 2, mul2: 2, spin: 2, echo: 2, wheel: 2, d6: 1, glitch: 2 } },
  D: { colored: { '1': 3, '2': 3, '3': 3, '4': 3, '5': 3, '6': 3, '7': 3, '8': 3, '9': 3, skipall: 2, rev: 2, d5: 2, flip: 2, discall: 2, dflip: 1, glass: 1, freeze: 1, bomb: 1, interest: 1, foot: 1, maze: 1 },
       wild: { wild: 4, wdc: 4, wd6: 2, wd10: 2, wrd8: 2, roul: 2, wd15: 1, bhole: 1, mul3: 1, devil: 1, sacrifice: 1, brim: 1, deal: 1, monstro: 1 } }
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
    this.rules = Object.assign({ stacking: true, drawUntil: true, seven: true, zero: true, multi: true, combos: true, gamble: true, overload: true, potato: true, revenge: true, snitch: true, finisher: true, jumpIn: true, mercy: 25, handSize: 7, uno: true, flip: true, chaos: true }, rules);
    this.rules.cards = Object.assign(Object.fromEntries(EXTRA_CARDS.map(k => [k, true])), rules.cards);
    // card values that never get dealt at this table
    this.rules.off = EXTRA_CARDS.filter(k => !this.rules.cards[k]).concat(this.rules.flip ? [] : ['flip', 'dflip']);
    const hum = Array.isArray(humans) ? humans : [humans];
    this.gid = Math.random().toString(36).slice(2, 8);
    this.side = 'L';
    this.next = this.newCard();
    this.players = names.map((n, i) => ({ name: n, hand: [], human: hum.includes(i), out: false, elim: false, unoCalled: false, vulnerable: false, shield: false, oweN: 0, owed: [], av: '', peer: '' }));
    for (const p of this.players) for (let i = 0; i < this.rules.handSize; i++) p.hand.push(this.newCard());
    let top;
    do { top = this.newCard(); } while (top.L.c === 'w' || isNaN(+top.L.v));
    this.top = top; this.color = top.L.c; this.dir = 1;
    this.pile = [cardCode(top)]; this.pileN = 1; // recent discards, so the pile can show a few cards underneath
    this.turn = Math.floor(Math.random() * names.length);
    this.pending = 0; this.stackMin = 0; this.stackFrom = -1; this.roulette = null; this.flipBack = null;
    this.debt = null; // cards someone must draw by hand before play moves on: { pi, n | until, got, kind }
    // Chaos: every few plays the table rolls a random event
    this.chaosIn = 9; this.inflate = 0; this.lock = 0; this.lastChaos = null; this.maze = 0;
    this.potato = { fuse: 12 + Math.floor(Math.random() * 10), cool: 0 }; // Hot Potato: a hidden fuse ticking down with every play
    this.multNext = 1; // a multiplier played with no stack waits for the next draw card
    this.drewBy = -1; this.winner = null; this.log = []; this.seq = 0;
    this.events = []; this.evSeq = 0;
    this.addLog(`First card: ${faceName(top.L)}. ${this.players[this.turn].name} starts.`, '', 'first', { f: top.L, n: this.players[this.turn].name });
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
  addLog(msg, cls = '', k = null, a = null) { this.log.push({ msg, cls, k, a }); if (this.log.length > 200) this.log.shift(); }
  ev(type, data = {}) { this.events.push(Object.assign({ type, n: ++this.evSeq }, data)); if (this.events.length > 24) this.events.shift(); }
  active() { return this.players.filter(p => !p.out); }
  nextIdx(from, steps = 1) {
    let i = from; const n = this.players.length;
    for (let s = 0; s < steps; s++) { let g = 0; do { i = (i + this.dir + n) % n; } while (this.players[i].out && ++g < n); }
    return i;
  }
  owes(pi) { const p = this.players[pi]; return !!p && !p.out && ((p.oweN || 0) > 0 || (p.owed && p.owed.length > 0)); }
  canPlay(card) {
    if (this.roulette !== null || this.debt || card.hidden || this.owes(this.turn)) return false;
    const f = this.f(card), t = this.f(this.top);
    if (this.pending > 0) return f.v === 'mirror' || f.v === 'mul2' || f.v === 'mul3' || (f.v === 'echo' && (DRAW_VAL[this.f(this.top).v] || 0) >= this.stackMin) || (this.rules.stacking && (DRAW_VAL[f.v] || 0) >= this.stackMin);
    if (this.lock > 0) return f.c === 'w' || f.c === this.color;
    return f.c === 'w' || f.c === this.color || f.v === t.v;
  }
  canJumpIn(pi, card) {
    if (!this.rules.jumpIn || this.winner !== null || this.roulette !== null || this.debt || pi === this.turn || this.players[pi].out || card.hidden || this.owes(pi)) return false;
    const f = this.f(card), t = this.f(this.top);
    return f.c === t.c && f.v === t.v;
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
    if (!this.rules.mercy && this.rules.overload !== false) for (const p of this.players) {
      if (!p.out && p.hand.length >= 100) {
        const pi = this.players.indexOf(p), others = this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out);
        if (!others.length) break;
        for (let i = p.hand.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p.hand[i], p.hand[j]] = [p.hand[j], p.hand[i]]; }
        const burnt = p.hand.splice(50).length;
        for (const i of others) this.players[i].oweN = (this.players[i].oweN || 0) + 2;
        this.addLog(`OVERLOAD: ${p.name}'s hand explodes. ${burnt} cards burn, everyone else catches 2.`, 'bad', 'overload', { n: p.name, k: burnt });
        this.ev('overload', { pi, k: burnt });
      }
    }
    if (this.rules.mercy) for (const p of this.players) {
      if (!p.out && p.hand.length >= this.rules.mercy) {
        p.out = true; p.elim = true;
        this.addLog(`${p.name} hit ${p.hand.length} cards and is knocked out by the Mercy Rule.`, 'bad', 'ko', { n: p.name, k: p.hand.length });
        this.ev('ko', { pi: this.players.indexOf(p) });
      }
    }
    const act = this.active();
    if (act.length === 1 && this.winner === null) {
      this.winner = this.players.indexOf(act[0]);
      this.addLog(`${act[0].name} is the last one standing.`, 'win', 'lastLeft', { n: act[0].name });
      this.ev('win', { pi: this.winner });
    }
    if (this.winner === null && this.players[this.turn].out) this.turn = this.nextIdx(this.turn, 1);
    if (this.roulette !== null && this.players[this.roulette].out) { this.roulette = null; }
    if (this.debt && this.players[this.debt.pi].out) this.debt = null;
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
    if (this.rules.multi && Array.isArray(opts.extra)) {
      if (this.rules.combos !== false && /^\d$/.test(face.v) && face.c !== 'w') {
        const want = [card];
        for (const id of opts.extra) { const c = p.hand.find(x => x.id === id); if (c && !want.includes(c)) want.push(c); }
        if (want.length > 1 && comboOf(want.map(c => this.f(c)))) chain.push(...want.slice(1));
      }
      if (chain.length === 1) for (const id of opts.extra) {
        const c = p.hand.find(x => x.id === id);
        // same value; a wild only goes with wilds, a colored card only with colored cards
        if (c && !chain.includes(c) && this.f(c).v === face.v && (this.f(c).c === 'w') === (face.c === 'w')) chain.push(c);
      }
    }
    const k = chain.length;
    p.hand = p.hand.filter(c => !chain.includes(c));
    if (p.loan > 0 && face.v !== 'loan' && --p.loan === 0) {
      p.oweN = (p.oweN || 0) + (p.loanAmt || 4);
      this.addLog(`${p.name}'s loan comes due: pick up ${p.loanAmt || 4}.`, 'bad', 'loanDue', { n: p.name });
      this.ev('loanDue', { pi });
    }
    const last = chain[k - 1];
    const prevFace = this.top ? this.f(this.top) : null; // what Echo copies
    this.top = last;
    for (const c of chain) { this.pile.push(cardCode(c)); this.pileN++; }
    if (this.pile.length > 6) this.pile.splice(0, this.pile.length - 6);
    this.color = face.c === 'w' ? this.validColor(opts.color, pi) : this.f(last).c;
    this.seq++; this.drawRun = 0;
    let extra = '';
    if (face.v === 'discall') {
      const cols = new Set(chain.map(c => this.f(c).c));
      const same = p.hand.filter(c => cols.has(this.f(c).c)); p.handDumped = same.length;
      p.hand = p.hand.filter(c => !cols.has(this.f(c).c));
      if (same.length) extra = ` and discards ${same.length} more card${same.length > 1 ? 's' : ''} of ${k > 1 ? 'those colors' : 'that color'}`;
    }
    const showColor = face.c === 'w' && face.v !== 'roul';
    const what = k > 1 ? chain.map(c => faceName(this.f(c))).join(', ') : faceName(face);
    this.addLog(`${jump ? p.name + ' jumps in with' : p.name + ' plays'} ${what}${showColor ? ' → ' + COLOR_NAME[this.color] : ''}${extra}.`, jump ? 'jump' : '', 'play',
      { n: p.name, j: jump ? 1 : 0, cards: chain.map(c => this.f(c)), c: showColor ? this.color : null, d: face.v === 'discall' ? (p.handDumped || 0) : 0 });
    this.ev('play', { pi, code: cardCode(last), side: this.side, jump, k });
    if (k > 1) this.ev('multi', { pi, k });
    const combo = k > 1 && this.rules.combos !== false ? comboOf(chain.map(c => this.f(c))) : null;
    if (showColor) this.ev('color', { c: this.color });
    this.turn = pi;
    this.drewBy = -1;
    if (p.hand.length === 1) { p.vulnerable = this.rules.uno && !p.unoCalled; if (p.unoCalled) { this.addLog(`${p.name} calls UNO.`, 'uno', 'uno', { n: p.name }); this.ev('uno', { pi }); } }
    else p.vulnerable = false;
    p.unoCalled = false;
    if (p.hand.length === 0) {
      this.winner = pi; p.out = true;
      this.addLog(`${p.name} empties their hand and wins.`, 'win', 'win', { n: p.name });
      this.ev('win', { pi });
      return true;
    }
    let steps = 1;
    const n = this.active().length;
    if (combo) {
      // Balatro scoring, UNO payout: throw away extra cards, and the big hands hit everyone
      let tossed = 0;
      for (let r = 0; r < combo.d && p.hand.length > 1; r++) { p.hand.splice(Math.floor(Math.random() * p.hand.length), 1); tossed++; }
      const hit = combo.m ? this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out) : [];
      for (const i of hit) this.players[i].oweN = (this.players[i].oweN || 0) + combo.m;
      this.addLog(`${p.name} plays a ${combo.key}: ${combo.chips} × ${combo.mult}.${tossed ? ` ${tossed} more cards gone.` : ''}${hit.length ? ` Everyone else picks up ${combo.m}.` : ''}`, 'stack', 'combo', { n: p.name, h: combo.key, c: combo.chips, x: combo.mult, d: tossed, m: hit.length ? combo.m : 0 });
      this.ev('combo', { pi, key: combo.key, chips: combo.chips, mult: combo.mult, d: tossed, m: hit.length ? combo.m : 0 });
    }
    switch (face.v) {
      case '7':
        if (this.rules.seven && opts.target != null && opts.target !== pi && this.players[opts.target] && !this.players[opts.target].out) {
          const t = this.players[opts.target];
          [p.hand, t.hand] = [t.hand, p.hand];
          this.addLog(`${p.name} swaps hands with ${t.name} (${p.hand.length} ↔ ${t.hand.length}).`, 'swap', 'swap', { n: p.name, t: t.name, a: p.hand.length, b: t.hand.length });
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
          this.addLog(`Everyone passes their hand ${this.dir === 1 ? 'clockwise' : 'counter-clockwise'}!`, 'swap', 'rotate', { cw: this.dir === 1 ? 1 : 0 });
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
        this.pending += DRAW_VAL[face.v] * k * (this.inflate > 0 ? 2 : 1) * this.multNext; this.multNext = 1; this.stackMin = DRAW_VAL[face.v]; this.stackFrom = pi; break;
      case 'wrd4': case 'wrd8':
        if (k % 2) { this.dir *= -1; this.ev('reverse', { dir: this.dir }); }
        this.pending += DRAW_VAL[face.v] * k * (this.inflate > 0 ? 2 : 1) * this.multNext; this.multNext = 1; this.stackMin = DRAW_VAL[face.v]; this.stackFrom = pi; break;
      case 'mirror':
        if (this.pending > 0) {
          const back = this.stackFrom;
          if (back >= 0 && back !== pi && !this.players[back].out) {
            this.addLog(`${p.name} mirrors the +${this.pending} stack back to ${this.players[back].name}.`, 'swap', 'mirror', { n: p.name, k: this.pending, t: this.players[back].name });
            this.ev('mirror', { a: pi, b: back, k: this.pending });
            this.stackFrom = pi; this.turn = back; steps = -1;
          }
        }
        break;
      case 'shield':
        if (!p.shield) { p.shield = true; this.addLog(`${p.name} raises a shield. The next stack that reaches them breaks.`, 'swap', 'shieldUp', { n: p.name }); this.ev('shieldup', { pi }); }
        break;
      case 'mul2': case 'mul3': {
        const m = face.v === 'mul2' ? 2 : 3;
        const x = Math.pow(m, k);
        if (this.pending > 0) {
          const before = this.pending;
          this.pending = Math.min(60, this.pending * x); this.stackFrom = pi;
          this.addLog(`${p.name} multiplies the stack: +${before} ×${x} = +${this.pending}.`, 'stack', 'mult', { n: p.name, a: before, x, b: this.pending });
          this.ev('mult', { pi, x, k: this.pending });
        } else {
          this.multNext *= x;
          this.addLog(`${p.name} arms ×${this.multNext}: the next draw card is multiplied.`, 'stack', 'multArm', { n: p.name, x: this.multNext });
          this.ev('mult', { pi, x: this.multNext, k: 0 });
        }
        break;
      }
      case 'lucky': {
        // a roll of the dice: 1 in 3 per Lucky card to throw away 2 random cards
        let hits = 0;
        for (let r = 0; r < k; r++) if (Math.random() < 1 / 3 && p.hand.length > 2) { for (let q = 0; q < 2; q++) p.hand.splice(Math.floor(Math.random() * p.hand.length), 1); hits++; }
        this.addLog(hits ? `${p.name} gets lucky and throws away ${hits * 2} random cards.` : `${p.name} rolls Lucky: nothing.`, hits ? 'win' : '', 'lucky', { n: p.name, h: hits * 2 });
        this.ev('lucky', { pi, h: hits * 2 });
        break;
      }
      case 'glass': {
        // fragile: the next player picks up 2, unless the glass breaks in your hand (1 in 4)
        const vi = this.nextIdx(pi, 1);
        let mine = 0, theirs = 0;
        for (let r = 0; r < k; r++) (Math.random() < 0.25 ? mine++ : theirs++);
        if (theirs) this.players[vi].oweN = (this.players[vi].oweN || 0) + 2 * theirs;
        if (mine) p.oweN = (p.oweN || 0) + 2 * mine;
        this.addLog(mine && !theirs ? `${p.name}'s glass shatters: ${p.name} picks up ${2 * mine}.` : `${p.name}'s glass hits ${this.players[vi].name}: +${2 * theirs}${mine ? `, but a shard cuts back: ${p.name} picks up ${2 * mine}` : ''}.`, 'bad', 'glass', { n: p.name, t: this.players[vi].name, a: 2 * theirs, b: 2 * mine });
        this.ev('glass', { pi, broke: mine > 0 });
        break;
      }
      case 'devil': {
        // a pact: everyone else picks up 3 per card, you pay 1 per card
        for (const i of this.players.map((q, i) => i)) if (i !== pi && !this.players[i].out) this.players[i].oweN = (this.players[i].oweN || 0) + 2 * k;
        p.oweN = (p.oweN || 0) + k;
        this.addLog(`${p.name} plays 666: everyone else picks up ${2 * k}, ${p.name} pays ${k}.`, 'bad', 'devil', { n: p.name, a: 2 * k, b: k });
        this.ev('devil', { pi });
        break;
      }
      case 'gift': {
        // give 2 random cards per Gift to a chosen player (never your last card)
        const tgt = opts.target != null && opts.target !== pi && this.players[opts.target] && !this.players[opts.target].out ? opts.target : this.nextIdx(pi, 1);
        let given = 0;
        for (let r = 0; r < 2 * k && p.hand.length > 1; r++) { const c = p.hand.splice(Math.floor(Math.random() * p.hand.length), 1)[0]; this.players[tgt].hand.push(c); given++; }
        if (given) this.players[tgt].vulnerable = false;
        this.addLog(`${p.name} gives ${this.players[tgt].name} ${given} cards.`, 'swap', 'gift', { n: p.name, t: this.players[tgt].name, g: given });
        this.ev('gift', { a: pi, b: tgt, g: given });
        break;
      }
      case 'echo': {
        // repeats the card it was played on: draw cards, skips and reverses
        const pv = prevFace ? prevFace.v : null;
        if (pv && DRAW_VAL[pv]) {
          this.pending += DRAW_VAL[pv] * k * (this.inflate > 0 ? 2 : 1) * this.multNext; this.multNext = 1; this.stackMin = DRAW_VAL[pv]; this.stackFrom = pi;
          if (pv === 'wrd4' || pv === 'wrd8') { if (k % 2) { this.dir *= -1; this.ev('reverse', { dir: this.dir }); } }
        } else if (pv === 'skip' || pv === 'freeze') { steps = 1 + k * (pv === 'freeze' ? 2 : 1); for (let s = 1; s < steps; s++) this.ev('skip', { pi: this.nextIdx(pi, s) }); }
        else if (pv === 'skipall') { steps = 0; this.ev('skipall', { pi }); }
        else if (pv === 'rev') { if (k % 2) { this.dir *= -1; steps = n === 2 ? 2 : 1; this.ev('reverse', { dir: this.dir }); } }
        const copied = pv && (DRAW_VAL[pv] || ['skip', 'freeze', 'skipall', 'rev'].includes(pv));
        this.addLog(copied ? `${p.name}'s echo repeats ${faceName(prevFace)}.` : `${p.name}'s echo fades: nothing to repeat.`, copied ? 'stack' : '', copied ? 'echo' : 'echoNone', { n: p.name, f: prevFace });
        this.ev('echo', { pi, ok: copied ? 1 : 0 });
        break;
      }
      case 'freeze':
        // skips the next two players per card
        steps = Math.min(n, 1 + 2 * k);
        for (let s = 1; s < steps; s++) this.ev('skip', { pi: this.nextIdx(pi, s) });
        this.addLog(`${p.name} freezes the next ${steps - 1} players.`, 'flip', 'freeze', { n: p.name, k: steps - 1 });
        break;
      case 'interest': {
        // everyone sitting on 8+ cards pays 2, you included
        const hit = this.players.filter(q => !q.out && q.hand.length >= 8);
        for (const q of hit) q.oweN = (q.oweN || 0) + 2 * k;
        this.addLog(hit.length ? `Interest: ${hit.map(q => q.name).join(', ')} pick up ${2 * k}.` : 'Interest: nobody has 8 cards yet.', 'bad', 'interest', { l: hit.map(q => q.name), a: 2 * k });
        this.ev('interest', { pis: hit.map(q => this.players.indexOf(q)) });
        break;
      }
      case 'sacrifice': {
        // burn 3 random cards per card; everyone else picks up 1
        let burnt = 0;
        for (let r = 0; r < 3 * k && p.hand.length > 1; r++) { p.hand.splice(Math.floor(Math.random() * p.hand.length), 1); burnt++; }
        this.players.forEach((q, i) => { if (i !== pi && !q.out) q.oweN = (q.oweN || 0) + k; });
        this.addLog(`${p.name} sacrifices ${burnt} cards. Everyone else picks up ${k}.`, 'bad', 'sacrifice', { n: p.name, b: burnt, a: k });
        this.ev('sacrifice', { pi, b: burnt });
        break;
      }
      case 'wheel': {
        // spins on a random other player: they pick up 4
        const others = this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out);
        const tgt = others[Math.floor(Math.random() * others.length)];
        if (tgt != null) this.players[tgt].oweN = (this.players[tgt].oweN || 0) + 4 * k;
        this.addLog(`${p.name} spins the wheel: it lands on ${this.players[tgt].name}, +${4 * k}.`, 'bad', 'wheel', { n: p.name, t: this.players[tgt].name, a: 4 * k });
        this.ev('wheel', { pi, t: tgt });
        break;
      }
      case 'bomb': {
        // the next player takes the blast (+3), both of their neighbours catch shrapnel (+1), you included
        const v = this.nextIdx(pi, 1), after = this.nextIdx(v, 1);
        this.players[v].oweN = (this.players[v].oweN || 0) + 3 * k;
        const shr = [...new Set([pi, after])].filter(i => i !== v);
        for (const i of shr) this.players[i].oweN = (this.players[i].oweN || 0) + k;
        this.addLog(`${p.name}'s bomb goes off on ${this.players[v].name}: +${3 * k}; ${shr.map(i => this.players[i].name).join(' and ')} +${k}.`, 'bad', 'bomb', { n: p.name, t: this.players[v].name, a: 3 * k, l: shr.map(i => this.players[i].name), b: k });
        this.ev('bomb', { pi, v });
        break;
      }
      case 'spin': {
        this.addLog(`${p.name} pulls the lever.`, 'flip', 'spin', { n: p.name });
        for (let r = 0; r < k; r++) this.rollChaos();
        break;
      }
      case 'd6': {
        // reroll: your whole hand is replaced by the same number of fresh cards
        const cnt = p.hand.length;
        p.hand = []; for (let r = 0; r < cnt; r++) p.hand.push(this.newCard());
        p.vulnerable = false;
        this.addLog(`${p.name} rolls the D6: a fresh hand of ${cnt}.`, 'flip', 'd6', { n: p.name, k: cnt });
        this.ev('d6', { pi, k: cnt });
        break;
      }
      case 'pill': {
        // an unidentified pill: one of six effects, good or bad
        const pills = ['health', 'badtrip', 'steel', 'drowsy', 'telepills', 'wizard'];
        for (let r = 0; r < k; r++) {
          const pl = pills[Math.floor(Math.random() * pills.length)];
          if (pl === 'health') { for (let q = 0; q < 2 && p.hand.length > 1; q++) p.hand.splice(Math.floor(Math.random() * p.hand.length), 1); }
          else if (pl === 'badtrip') p.oweN = (p.oweN || 0) + 3;
          else if (pl === 'steel') p.shield = true;
          else if (pl === 'drowsy') { steps += 1; this.ev('skip', { pi: this.nextIdx(pi, steps - 1) }); }
          else if (pl === 'telepills') {
            const others = this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out);
            const t = others[Math.floor(Math.random() * others.length)];
            if (t != null) { const h = p.hand; p.hand = this.players[t].hand; this.players[t].hand = h; p.vulnerable = this.players[t].vulnerable = false; this.ev('swap', { a: pi, b: t }); }
          }
          else if (pl === 'wizard') { this.dir *= -1; if (n === 2) steps = 2; this.ev('reverse', { dir: this.dir }); }
          this.addLog(`${p.name} takes a pill: ${pl}.`, pl === 'badtrip' ? 'bad' : 'swap', 'pill', { n: p.name, p: pl });
          this.ev('pill', { pi, p: pl });
        }
        break;
      }
      case 'tower': {
        // The Tower: three random players, anyone at all, pick up 2 each
        const alive = this.players.map((q, i) => i).filter(i => !this.players[i].out), hits = [];
        for (let r = 0; r < 3 * k; r++) { const i = alive[Math.floor(Math.random() * alive.length)]; hits.push(i); this.players[i].oweN = (this.players[i].oweN || 0) + 1; }
        this.addLog(`The Tower falls: ${hits.map(i => this.players[i].name).join(', ')} pick up 1.`, 'bad', 'tower', { l: hits.map(i => this.players[i].name) });
        this.ev('tower', { hits });
        break;
      }
      case 'glitch': {
        // a glitched card: acts as a random effect
        const opts2 = ['skip', 'rev', 'skipall', 'd4', 'wd6', 'freeze'];
        const gv = opts2[Math.floor(Math.random() * opts2.length)];
        if (DRAW_VAL[gv]) { this.pending += DRAW_VAL[gv] * k * (this.inflate > 0 ? 2 : 1) * this.multNext; this.multNext = 1; this.stackMin = DRAW_VAL[gv]; this.stackFrom = pi; }
        else if (gv === 'skip' || gv === 'freeze') { steps = Math.min(n, 1 + k * (gv === 'freeze' ? 2 : 1)); for (let s = 1; s < steps; s++) this.ev('skip', { pi: this.nextIdx(pi, s) }); }
        else if (gv === 'skipall') { steps = 0; this.ev('skipall', { pi }); }
        else if (gv === 'rev') { if (k % 2) { this.dir *= -1; steps = n === 2 ? 2 : 1; this.ev('reverse', { dir: this.dir }); } }
        this.addLog(`${p.name}'s card glitches into ${faceName({ c: 'w', v: gv })}.`, 'flip', 'glitch', { n: p.name, v: gv });
        this.ev('glitch', { pi, v: gv });
        break;
      }
      case 'brim': {
        // Brimstone: a beam through the next two players, 2 cards each
        const hits = [];
        for (let s = 1; s <= Math.min(2, n - 1); s++) { const i = this.nextIdx(pi, s); hits.push(i); this.players[i].oweN = (this.players[i].oweN || 0) + 2 * k; }
        this.addLog(`${p.name} fires Brimstone: ${hits.map(i => this.players[i].name).join(', ')} pick up ${2 * k}.`, 'bad', 'brim', { n: p.name, l: hits.map(i => this.players[i].name), a: 2 * k });
        this.ev('brim', { pi, hits });
        break;
      }
      case 'foot': {
        // Mom's Foot stomps whoever is closest to winning (not you)
        const others = this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out);
        const t = others.reduce((a, b) => this.players[b].hand.length < this.players[a].hand.length ? b : a, others[0]);
        if (t != null) this.players[t].oweN = (this.players[t].oweN || 0) + 4 * k;
        this.addLog(`Mom's Foot stomps ${this.players[t].name}: +${4 * k}.`, 'bad', 'foot', { t: this.players[t].name, a: 4 * k });
        this.ev('foot', { pi, t });
        break;
      }
      case 'maze':
        this.maze = 6 * k;
        this.addLog(`${p.name} curses the table: Curse of the Maze for ${this.maze} plays.`, 'flip', 'maze', { n: p.name, k: this.maze });
        this.ev('maze', { pi, k: this.maze });
        break;
      case 'deal': {
        // a deal with the devil: half your hand is gone, but the next stack you take is doubled
        const gone = Math.floor(p.hand.length / 2);
        for (let r = 0; r < gone; r++) p.hand.splice(Math.floor(Math.random() * p.hand.length), 1);
        p.marked = true;
        this.addLog(`${p.name} makes a deal with the devil: ${gone} cards gone. The next stack they take is doubled.`, 'bad', 'deal', { n: p.name, g: gone });
        this.ev('deal', { pi, g: gone });
        break;
      }
      case 'monstro': {
        // Monstro lands on the next player: they pick up as many cards as you hold (max 8)
        const vi = this.nextIdx(pi, 1), amt = Math.min(6, Math.max(1, p.hand.length)) * k;
        this.players[vi].oweN = (this.players[vi].oweN || 0) + amt;
        this.addLog(`Monstro lands on ${this.players[vi].name}: +${amt}.`, 'bad', 'monstro', { t: this.players[vi].name, a: amt });
        this.ev('monstro', { pi, t: vi, k: amt });
        break;
      }
      case 'loan': {
        // take 2 cards off your hands now; after 3 more of your plays, pay back 4 (per card)
        let gone = 0;
        for (let r = 0; r < 2 * k && p.hand.length > 1; r++) { p.hand.splice(Math.floor(Math.random() * p.hand.length), 1); gone++; }
        p.loan = 3; p.loanAmt = 4 * k;
        this.addLog(`${p.name} takes a loan: ${gone} cards gone now, 4 due after 3 plays.`, 'swap', 'loan', { n: p.name, g: gone });
        this.ev('loan', { pi });
        break;
      }
      case 'duel': {
        const tgt = opts.target != null && opts.target !== pi && this.players[opts.target] && !this.players[opts.target].out ? opts.target : this.nextIdx(pi, 1);
        const flipNum = () => { const got = []; let n = null; while (n === null && got.length < 40) { const c = this.newCard(); got.push(c); const fv = this.f(c).v; if (!isNaN(+fv)) n = +fv; } return { got, n: n || 0 }; };
        let pool = [], a, b, rounds = 0;
        do { a = flipNum(); b = flipNum(); pool = pool.concat(a.got, b.got); rounds++; } while (a.n === b.n && rounds < 5);
        const loser = a.n < b.n ? pi : tgt;
        this.players[loser].owed = (this.players[loser].owed || []).concat(pool);
        this.addLog(`${p.name} duels ${this.players[tgt].name}: ${a.n} vs ${b.n}. ${this.players[loser].name} must pick up all ${pool.length} turned-over cards.`, 'bad', 'duel', { n: p.name, t: this.players[tgt].name, na: a.n, nb: b.n, l: this.players[loser].name, k: pool.length });
        this.ev('duel', { a: pi, b: tgt, na: a.n, nb: b.n, loser, k: pool.length });
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
          this.addLog(`Black hole. Every hand is pooled and dealt back out: ${act.map(j => this.players[j].name + ' ' + this.players[j].hand.length).join(', ')}.`, 'swap', 'bhole', { l: act.map(j => [this.players[j].name, this.players[j].hand.length]) });
          this.ev('bhole', {});
        }
        break;
      }
      case 'roul':
        this.roulette = this.nextIdx(pi, 1); this.ev('roulette', { pi: this.roulette }); break;
      case 'wdc': {
        const vi = this.nextIdx(pi, 1), col = this.color;
        this.debt = { pi: vi, until: col, got: 0, kind: 'wdc' };
        this.addLog(`${this.players[vi].name} must draw until they hit ${COLOR_NAME[col]}.`, 'bad', 'wdc', { n: this.players[vi].name, c: col });
        this.turn = vi; steps = -1; break;
      }
      case 'dflip':
      case 'flip': {
        if (k % 2 === 0) { this.addLog(`${k} flips cancel out. The table stays on the ${this.side === 'D' ? 'dark' : 'light'} side.`, 'flip', 'flipsCancel', { k, dk: this.side === 'D' ? 1 : 0 }); break; }
        this.side = other(this.side);
        this.flipBack = face.v === 'dflip' ? { pi: this.nextIdx(pi, 1), seq: this.seq } : null;
        const nf = this.f(this.top);
        this.color = nf.c === 'w' ? this.validColor(opts.flipColor, pi) : nf.c;
        this.addLog(`Flip. Everything turns to the ${this.side === 'D' ? 'dark' : 'light'} side. Top card is now ${faceName(nf)}${nf.c === 'w' ? ' → ' + COLOR_NAME[this.color] : ''}.`, 'flip', 'flip', { dk: this.side === 'D' ? 1 : 0, f: nf, c: nf.c === 'w' ? this.color : null });
        this.ev('flip', { side: this.side });
        if (face.v === 'dflip') this.addLog(`Double flip: it turns back after ${this.players[this.nextIdx(pi, 1)].name}'s turn.`, 'flip', 'dflip', { n: this.players[this.nextIdx(pi, 1)].name });
        break;
      }
    }
    if (p.revenge && DRAW_VAL[face.v] && this.pending > 0) {
      const add = DRAW_VAL[face.v] * k; this.pending += add; p.revenge = false;
      this.addLog(`REVENGE: ${p.name}'s card counts double. The stack is +${this.pending}.`, 'stack', 'revenge', { n: p.name, k: this.pending });
      this.ev('revenge', { pi, k: this.pending });
    }
    if (face.v === 'roul') this.turn = this.roulette;
    else if (steps >= 0) this.turn = steps === 0 ? pi : this.nextIdx(pi, steps);
    this.applyShield();
    this.checkFlipBack();
    if (this.inflate > 0) this.inflate--;
    if (this.lock > 0) this.lock--;
    if (this.rules.potato !== false && this.winner === null && this.potato) {
      const pt = this.potato;
      if (pt.fuse > 0 && --pt.fuse === 0) {
        const v = this.turn; this.players[v].oweN = (this.players[v].oweN || 0) + 3;
        this.addLog(`The hot potato blows up on ${this.players[v].name}: +3.`, 'bad', 'potato', { n: this.players[v].name });
        this.ev('potato', { pi: v });
        pt.cool = 10 + Math.floor(Math.random() * 8);
      } else if (pt.fuse === 0 && pt.cool > 0 && --pt.cool === 0) {
        pt.fuse = 10 + Math.floor(Math.random() * 10);
        this.addLog('A new hot potato starts ticking.', 'flip', 'potatoLit', {}); this.ev('potatoLit', {});
      }
    }
    if (this.maze > 0 && face.v !== 'maze') {
      this.maze--;
      if (Math.random() < 0.5 && steps >= 0 && face.v !== 'roul') { this.dir *= -1; this.turn = steps === 0 ? pi : this.nextIdx(pi, steps); this.ev('reverse', { dir: this.dir }); this.addLog('The maze twists: direction flips.', 'flip', 'mazeTwist', {}); }
    }
    if (this.rules.chaos && this.winner === null && --this.chaosIn <= 0) this.rollChaos();
    if (this.pending > 0 && DRAW_VAL[face.v]) {
      this.addLog(`Stack is now +${this.pending}. ${this.players[this.turn].name} must stack or take it.`, 'stack', 'stack', { k: this.pending, n: this.players[this.turn].name });
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
      this.addLog(`The double flip wears off. Back to the ${this.side === 'D' ? 'dark' : 'light'} side: ${faceName(nf)}${nf.c === 'w' ? ' → ' + COLOR_NAME[this.color] : ''}.`, 'flip', 'dflipOff', { dk: this.side === 'D' ? 1 : 0, f: nf, c: nf.c === 'w' ? this.color : null });
      this.ev('flip', { side: this.side });
    }
  }
  applyShield() {
    const t = this.players[this.turn];
    if (this.pending > 0 && t && t.shield && !t.out) {
      t.shield = false;
      this.addLog(`${t.name}'s shield breaks the +${this.pending} stack.`, 'swap', 'shieldBreak', { n: t.name, k: this.pending });
      this.ev('shield', { pi: this.turn, k: this.pending });
      this.pending = 0; this.stackMin = 0; this.stackFrom = -1;
    }
  }
  // Every draw is one card by hand. Owed cards (UNO penalty, a lost duel) can be paid any time;
  // a debt (a taken stack, roulette, draw-color) has to be paid before play moves on.
  draw(pi) {
    const p = this.players[pi];
    if (!p || p.out || this.winner !== null) return null;
    if (this.owes(pi)) {
      let got;
      if (p.owed && p.owed.length) { const c = p.owed.shift(); p.hand.push(c); got = [c]; this.ev('draw', { pi, k: 1 }); }
      else { got = this.give(pi, 1); p.oweN--; }
      if (p.hand.length !== 1) p.vulnerable = false;
      this.seq++; this.mercyCheck();
      return got;
    }
    if (pi !== this.turn || this.roulette !== null) return null;
    const d = this.debt;
    if (d && d.pi === pi) {
      const got = this.give(pi, 1); this.seq++; d.got += got.length;
      let done = false;
      if (d.n) { d.n--; done = d.n <= 0; }
      else if (d.until) done = !!(got[0] && this.f(got[0]).c === d.until);
      if (d.got >= 300) done = true;
      if (done) {
        this.addLog(d.kind === 'stack' ? `${p.name} picked up all ${d.got} cards (now ${p.hand.length}).`
          : `${p.name} drew ${d.got} card${d.got > 1 ? 's' : ''} before hitting ${COLOR_NAME[d.until]}.`, 'bad',
          d.kind === 'stack' ? 'pickedUp' : 'drewUntil', { n: p.name, k: d.got, h: p.hand.length, c: d.until || null });
        if (d.got >= 10) this.ev('took', { pi, k: d.got });
        if (d.kind === 'stack' && d.got >= 10 && this.rules.revenge !== false) { p.revenge = true; this.addLog(`${p.name} swears revenge: their next draw card counts double.`, 'stack', 'revengeOn', { n: p.name }); this.ev('revengeOn', { pi }); }
        this.debt = null; this.drewBy = -1; this.drawRun = 0;
        this.turn = this.nextIdx(pi, 1);
        this.applyShield(); this.checkFlipBack();
      }
      this.mercyCheck();
      return got;
    }
    if (this.pending > 0) {
      // taking the stack: the cards are picked up one by one
      if (this.rules.finisher !== false && p.hand.length <= 2) { this.pending += 4; this.addLog(`FINISHER: ${p.name} was about to win. The stack grows to +${this.pending}.`, 'bad', 'finisher', { n: p.name, k: this.pending }); this.ev('finisher', { pi, k: this.pending }); }
      if (p.marked) { p.marked = false; this.pending *= 2; this.addLog(`The devil collects: ${p.name}'s stack is doubled to +${this.pending}.`, 'bad', 'dealDue', { n: p.name, k: this.pending }); this.ev('dealDue', { pi, k: this.pending }); }
      this.debt = { pi, n: this.pending, got: 0, kind: 'stack' };
      this.addLog(`${p.name} takes the +${this.pending} stack.`, 'bad', 'takes', { n: p.name, k: this.pending });
      this.pending = 0; this.stackMin = 0; this.stackFrom = -1;
      return this.draw(pi);
    }
    if (this.drewBy === pi) return null;
    const got = this.give(pi, 1);
    this.seq++;
    if (!this.rules.drawUntil) {
      this.drewBy = pi;
      this.addLog(`${p.name} draws a card.`, '', 'drawOne', { n: p.name });
    } else {
      // one card per draw: the player keeps drawing by hand until something is playable
      this.drawRun = (this.drawRunPi === pi ? this.drawRun || 0 : 0) + got.length; this.drawRunPi = pi;
      // the run only ends on the current color (or a wild); a matching number or symbol doesn't count
      const f = got[0] && this.f(got[0]);
      if (f && (f.c === 'w' || f.c === this.color)) {
        this.drewBy = pi;
        this.addLog(`${p.name} draws ${this.drawRun} card${this.drawRun > 1 ? 's' : ''} before hitting ${COLOR_NAME[this.color]}.`, '', 'drawRun', { n: p.name, k: this.drawRun, c: this.color });
        this.drawRun = 0;
      }
    }
    this.mercyCheck();
    return got;
  }
  pass(pi) {
    if (pi !== this.turn || this.drewBy !== pi || this.pending > 0 || this.debt || this.owes(pi)) return false;
    this.addLog(`${this.players[pi].name} passes.`, '', 'pass', { n: this.players[pi].name });
    this.drewBy = -1; this.drawRun = 0; this.seq++;
    this.turn = this.nextIdx(pi, 1);
    this.checkFlipBack();
    return true;
  }
  resolveRoulette(color) {
    const vi = this.roulette; if (vi === null) return null;
    if (!this.colors().includes(color)) color = Bot.bestColor(this, this.players[vi].hand, this.side);
    this.color = color;
    this.addLog(`${this.players[vi].name} calls ${COLOR_NAME[color]} and must draw until it shows up.`, 'bad', 'roulette', { n: this.players[vi].name, c: color });
    this.ev('color', { c: color });
    this.roulette = null; this.seq++;
    this.turn = vi;
    this.debt = { pi: vi, until: color, got: 0, kind: 'roulette' };
    return [];
  }
  callUno(pi) {
    const p = this.players[pi];
    if (p.out) return false;
    if (p.hand.length === 1 && p.vulnerable) { p.vulnerable = false; this.addLog(`${p.name} calls UNO just in time`, 'uno', 'unoLate', { n: p.name }); this.ev('uno', { pi }); return true; }
    if ((p.hand.length <= 2 || (this.rules.multi && this.unoReach(pi))) && !p.unoCalled) { p.unoCalled = true; this.ev('uno', { pi }); return true; }
    return false;
  }
  // ---- Chaos events ----
  rollChaos() {
    this.chaosIn = 8 + Math.floor(Math.random() * 5);
    const act = this.players.map((p, i) => i).filter(i => !this.players[i].out);
    const pool = ['inflation', 'tax', 'revolution', 'storm', 'lock', 'bleed', 'jackpot', 'mirrorworld'];
    if (!this.rules.flip) pool.splice(pool.indexOf('storm'), 1);
    if (this.debt || this.roulette !== null) { const s = pool.indexOf('revolution'); if (s >= 0) pool.splice(s, 1); }
    const e = pool[Math.floor(Math.random() * pool.length)];
    const data = { e };
    switch (e) {
      case 'inflation': this.inflate = 6; break; // draw cards count double for the next 6 plays
      case 'lock': this.lock = 4; break;          // only the color (or a wild) can be played for 4 plays
      case 'tax': {                               // whoever is closest to winning pays 2
        const min = Math.min(...act.map(i => this.players[i].hand.length));
        data.who = act.filter(i => this.players[i].hand.length === min);
        for (const i of data.who) this.players[i].oweN = (this.players[i].oweN || 0) + 2;
        break;
      }
      case 'bleed': for (const i of act) this.players[i].oweN = (this.players[i].oweN || 0) + 1; break; // everyone pays 1
      case 'revolution': {                        // every hand moves one seat along
        const hands = act.map(i => this.players[i].hand);
        act.forEach((i, k) => { this.players[act[(k + 1) % act.length]].hand = hands[k]; });
        for (const i of act) this.players[i].vulnerable = false;
        break;
      }
      case 'storm': {                             // the table flips
        this.side = other(this.side);
        const nf = this.f(this.top);
        this.color = nf.c === 'w' ? this.colors()[Math.floor(Math.random() * 4)] : nf.c;
        this.ev('flip', { side: this.side });
        break;
      }
      case 'jackpot': {                           // one lucky player throws away 2 random cards
        const cands = act.filter(i => this.players[i].hand.length > 2);
        if (cands.length) {
          const w = cands[Math.floor(Math.random() * cands.length)], h = this.players[w].hand;
          for (let k = 0; k < 2; k++) h.splice(Math.floor(Math.random() * h.length), 1);
          data.who = [w];
        }
        break;
      }
      case 'mirrorworld': this.dir *= -1; this.ev('reverse', { dir: this.dir }); break;
    }
    this.lastChaos = data;
    const names = data.who ? data.who.map(i => this.players[i].name) : [];
    this.addLog(`Chaos: ${e}${names.length ? ' (' + names.join(', ') + ')' : ''}.`, 'flip', 'chaos', { e, w: names });
    this.ev('chaos', data);
  }
  // A player who leaves (or stays disconnected too long) is out of this match; everyone else plays on.
  removePlayer(pi, why = 'left') {
    const p = this.players[pi];
    if (!p || p.out || this.winner !== null) return false;
    p.out = true; p.left = true; p.vulnerable = false; p.shield = false;
    this.addLog(`${p.name} ${why === 'left' ? 'left the match' : 'was away too long and is out of the match'}. Everyone else plays on.`, 'bad', 'left', { n: p.name, aw: why === 'left' ? 0 : 1 });
    this.ev('ko', { pi });
    if (this.roulette === pi) this.roulette = null;
    if (this.debt && this.debt.pi === pi) this.debt = null;
    p.oweN = 0; p.owed = [];
    if (this.stackFrom === pi) this.stackFrom = -1;
    if (this.flipBack && this.flipBack.pi === pi) this.flipBack.pi = this.nextIdx(pi, 1);
    if (this.turn === pi) {
      if (this.pending > 0) { this.addLog(`The +${this.pending} stack aimed at ${p.name} is discarded.`, 'stk', 'stackGone', { n: p.name, k: this.pending }); this.pending = 0; this.stackMin = 0; this.stackFrom = -1; }
      this.drewBy = -1; this.drawRun = 0;
      this.turn = this.nextIdx(pi, 1);
    }
    this.seq++;
    const act = this.active();
    if (act.length === 1) {
      this.winner = this.players.indexOf(act[0]);
      this.addLog(`${act[0].name} is the last player left and wins.`, 'win', 'lastLeft', { n: act[0].name });
      this.ev('win', { pi: this.winner });
    }
    return true;
  }
  // A player who is away (disconnected, or idle too long) has their turn skipped.
  // If a stack is waiting on them, they take it, so nobody else is punished for their absence.
  skipTurn(pi) {
    if (this.winner !== null) return false;
    const p = this.players[pi];
    if (this.roulette === pi) {
      const cols = this.colors();
      this.addLog(`${p.name} is away. A random color is called for them.`, 'stk', 'awayColor', { n: p.name });
      this.resolveRoulette(cols[Math.floor(Math.random() * cols.length)]);
      return true;
    }
    if (this.turn !== pi) return false;
    if (this.pending > 0 || (this.debt && this.debt.pi === pi)) {
      if (this.pending > 0) this.addLog(`${p.name} is away and takes the stack.`, 'stk', 'awayStack', { n: p.name });
      let g = 0; while (this.turn === pi && this.winner === null && ++g < 400 && this.draw(pi));
      return true;
    }
    while (this.owes(pi)) this.draw(pi);
    this.addLog(`${p.name} is away. Turn skipped.`, 'stk', 'awaySkip', { n: p.name });
    this.drewBy = -1; this.drawRun = 0; this.seq++;
    this.ev('skip', { pi });
    this.turn = this.nextIdx(pi, 1);
    this.applyShield(); this.checkFlipBack();
    return true;
  }
  // can this player get down to one card in a single same-number drop?
  unoReach(pi) {
    const h = this.players[pi].hand, cnt = {};
    for (const c of h) { const f = this.f(c); const key = (f.c === 'w' ? 'w:' : '') + f.v; cnt[key] = (cnt[key] || 0) + 1; }
    return Object.values(cnt).some(n => n >= h.length - 1);
  }
  // Russian roulette: facing a stack of +8 or more, pull the trigger instead of answering it.
  // Click: the stack is gone and the turn passes. Bang: you take it doubled.
  canGamble(pi) { return this.rules.gamble !== false && pi === this.turn && this.pending >= 8 && !this.debt && this.roulette === null && !this.owes(pi) && this.winner === null; }
  gamble(pi) {
    if (!this.canGamble(pi)) return null;
    const p = this.players[pi], k = this.pending;
    this.seq++;
    if (Math.random() < 0.5) {
      this.addLog(`${p.name} spins the revolver… click. The +${k} stack is gone.`, 'win', 'gambleWin', { n: p.name, k });
      this.ev('gamble', { pi, ok: 1, k });
      this.pending = 0; this.stackMin = 0; this.stackFrom = -1; this.drewBy = -1;
      this.turn = this.nextIdx(pi, 1); this.applyShield(); this.checkFlipBack();
      return true;
    }
    this.pending *= 2;
    this.addLog(`${p.name} spins the revolver… BANG. The stack doubles to +${this.pending}.`, 'bad', 'gambleLose', { n: p.name, k: this.pending });
    this.ev('gamble', { pi, ok: 0, k: this.pending });
    this.draw(pi);
    return false;
  }
  catchUno(catcher, target) {
    const t = this.players[target];
    if (!t || !t.vulnerable || t.hand.length !== 1 || t.out || catcher === target) return false;
    t.vulnerable = false;
    this.addLog(`${this.players[catcher].name} catches ${t.name} not saying UNO. ${t.name} must draw 2.`, 'bad', 'caught', { n: this.players[catcher].name, t: t.name });
    this.ev('caught', { pi: target, by: catcher });
    t.oweN = (t.oweN || 0) + 2; this.seq++;
    if (this.rules.snitch !== false) {
      // the snitch also dumps two of their own cards on the victim
      const c = this.players[catcher]; let given = 0;
      for (let r = 0; r < 1 && c.hand.length > 1; r++) { t.hand.push(c.hand.splice(Math.floor(Math.random() * c.hand.length), 1)[0]); given++; }
      if (given) { this.addLog(`Snitch: ${c.name} also dumps ${given} of their cards on ${t.name}.`, 'bad', 'snitch', { n: c.name, t: t.name, g: given }); this.ev('snitch', { a: catcher, b: target, g: given }); }
    }
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
        else if (f.v === 'mul2' || f.v === 'mul3') s += g.pending >= 4 ? 18 : 4;
        else if (f.v === 'echo') s += 6;
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
        if (f.v === 'mul2' || f.v === 'mul3') s -= 5;             // better saved for a stack
        if (f.v === 'lucky') s += 3;
        if (f.v === 'glass') s += nl <= 3 ? 14 : 6;
        if (f.v === 'devil') s += minOther.q.hand.length <= 3 ? 20 : 8;
        if (f.v === 'spin') s += 2;
        if (f.v === 'loan') s += p.loan ? -10 : (p.hand.length >= 6 ? 6 : -2);
        if (f.v === 'gift') s += p.hand.length >= 4 ? 10 : 2;
        if (f.v === 'echo') { const tv = g.top ? g.f(g.top).v : null; s += DRAW_VAL[tv] ? 9 : (['skip', 'skipall'].includes(tv) ? 5 : -4); }
        if (f.v === 'freeze') s += nl <= 3 ? 12 : 5;
        if (f.v === 'interest') s += p.hand.length >= 8 ? -8 : (others.some(o => o.q.hand.length >= 8) ? 9 : -2);
        if (f.v === 'sacrifice') s += p.hand.length >= 5 ? 10 : 1;
        if (f.v === 'wheel') s += 6;
        if (f.v === 'bomb') s += nl <= 3 ? 14 : 6;
        if (f.v === 'd6') s += p.hand.length >= 8 ? 4 : -6;
        if (f.v === 'pill') s += 2;
        if (f.v === 'tower') s += 1;
        if (f.v === 'glitch') s += 4;
        if (f.v === 'brim') s += 10;
        if (f.v === 'foot') s += minOther.q.hand.length <= 3 ? 18 : 6;
        if (f.v === 'maze') s += 0;
        if (f.v === 'deal') s += p.marked ? -20 : (p.hand.length >= 6 ? 12 : -4);
        if (f.v === 'monstro') s += Math.min(8, p.hand.length) * 1.5;
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
    let extra = g.rules.multi ? p.hand.filter(c => c !== best && g.f(c).v === bf.v && (g.f(c).c === 'w') === (bf.c === 'w')) : [];
    if (g.rules.multi && g.rules.combos !== false && /^\d$/.test(bf.v) && bf.c !== 'w') {
      // a same-color run through the chosen card beats a plain pair
      const same = p.hand.filter(c => c !== best && g.f(c).c === bf.c && /^\d$/.test(g.f(c).v));
      const byNum = {}; for (const c of same) byNum[+g.f(c).v] = byNum[+g.f(c).v] || c;
      let lo = +bf.v, hi = +bf.v; while (byNum[lo - 1]) lo--; while (byNum[hi + 1]) hi++;
      if (hi - lo + 1 >= 3 && hi - lo + 1 > extra.length + 1) { extra = []; for (let x = lo; x <= hi; x++) if (x !== +bf.v) extra.push(byNum[x]); }
    }
    const rest = p.hand.filter(c => c !== best && !extra.includes(c));
    const swapGain = minOther ? rest.length - minOther.q.hand.length : 0;
    return {
      cardId: best.id, extra: extra.map(c => c.id),
      color: bf.c === 'w' ? this.bestColor(g, rest, g.side) : null,
      flipColor: (bf.v === 'flip' || bf.v === 'dflip') ? this.bestColor(g, rest, other(g.side)) : null,
      target: bf.v === 'duel' || bf.v === 'gift' ? minOther.i : (bf.v === '7' && g.rules.seven && swapGain >= 2 ? minOther.i : null)
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
      (p.out ? 1 : 0) | (p.elim ? 2 : 0) | (p.vulnerable ? 4 : 0) | (p.unoCalled ? 8 : 0) | (p.human ? 16 : 0) | (p.shield ? 32 : 0) | (p.left ? 64 : 0) | (p.marked ? 128 : 0) | (p.revenge ? 256 : 0), (p.oweN || 0) + ((p.owed && p.owed.length) || 0), p.loan || 0]),
    t: cardCode(g.top), cx: [g.chaosIn || 0, g.inflate || 0, g.lock || 0, g.multNext || 1, g.maze || 0, g.potato && g.potato.fuse > 0 ? (g.potato.fuse <= 2 ? 2 : 1) : 0], db: g.debt ? [g.debt.pi, g.debt.n || 0, g.debt.until || '', g.debt.got || 0, g.debt.kind] : null, pl: (g.pile || []).slice(-5), pn: g.pileN || 1, nb: ALPHA[faceIdx(ob, g.next[ob])], c: g.color, d: g.dir, u: g.turn, k: g.pending, m: g.stackMin, sf: g.stackFrom, dr: [g.drawRunPi == null ? -1 : g.drawRunPi, g.drawRun || 0], fb: g.flipBack ? [g.flipBack.pi, g.flipBack.seq] : null,
    o: g.roulette === null ? -1 : g.roulette, w: g.drewBy, x: g.winner === null ? -1 : g.winner, s: g.seq,
    l: g.log.slice(-logN).map(l => [String(l.msg).slice(0, 200), l.cls, l.k || null, l.a || null]),
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
      out: !!(a[4] & 1), elim: !!(a[4] & 2), vulnerable: !!(a[4] & 4), unoCalled: !!(a[4] & 8), human: !!(a[4] & 16), shield: !!(a[4] & 32), left: !!(a[4] & 64), marked: !!(a[4] & 128), revenge: !!(a[4] & 256), oweN: a[5] || 0, owed: [], loan: a[6] || 0 };
  });
  g.top = codeCard(st.t); if (Array.isArray(st.cx)) { g.chaosIn = st.cx[0]; g.inflate = st.cx[1]; g.lock = st.cx[2]; g.multNext = st.cx[3] || 1; g.maze = st.cx[4] || 0; g.potatoState = st.cx[5] || 0; } g.debt = Array.isArray(st.db) ? { pi: st.db[0], n: st.db[1], until: st.db[2] || null, got: st.db[3], kind: st.db[4] } : null; g.pile = Array.isArray(st.pl) ? st.pl.map(String) : []; g.pileN = st.pn || 1;
  g.next = { id: 0, hidden: true }; g.next[ob] = Object.assign({}, FACES[ob][ALPHA.indexOf(st.nb)] || { c: 'w', v: 'wild' });
  g.color = st.c; g.dir = st.d; g.turn = st.u; g.pending = st.k; g.stackMin = st.m; g.stackFrom = typeof st.sf === 'number' ? st.sf : -1; if (Array.isArray(st.dr)) { g.drawRunPi = st.dr[0]; g.drawRun = st.dr[1]; } g.flipBack = Array.isArray(st.fb) ? { pi: st.fb[0], seq: st.fb[1] } : null;
  g.roulette = st.o < 0 ? null : st.o; g.drewBy = st.w; g.winner = st.x < 0 ? null : st.x; g.seq = st.s;
  g.log = (st.l || []).map(([msg, cls, k, a]) => ({ msg: String(msg), cls: String(cls || ''), k: typeof k === 'string' ? k : null, a: a && typeof a === 'object' ? a : null }));
  g.events = Array.isArray(st.ev) ? st.ev : []; g.evSeq = st.es || 0;
  return g;
}

if (typeof module !== 'undefined') module.exports = { Game, Bot, serialize, deserialize, cardCode, faceName, FACES, comboOf };
