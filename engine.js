// ===== ENGINE: UNO Flip × No Mercy × Classic (no DOM) =====
const SIDE_COLORS = { L: ['r', 'y', 'g', 'b'], D: ['p', 't', 'o', 'v'] };
const COLOR_NAME = { r: 'Red', y: 'Yellow', g: 'Green', b: 'Blue', p: 'Pink', t: 'Teal', o: 'Orange', v: 'Purple', w: 'Wild' };
const VALUE_NAME = {
  skip: 'Skip', rev: 'Reverse', d1: 'Draw 1', d2: 'Draw 2', d4: 'Draw 4', d5: 'Draw 5', flip: 'Flip',
  discall: 'Discard All', skipall: 'Skip Everyone', wild: 'Wild', wd2: 'Wild Draw 2', wd4: 'Wild Draw 4',
  wrd4: 'Wild Reverse Draw 4', wd6: 'Wild Draw 6', wd10: 'Wild Draw 10', wrd8: 'Wild Reverse Draw 8',
  wdc: 'Wild Draw Color', roul: 'Wild Color Roulette',
  mirror: 'Mirror', shield: 'Vest', dflip: 'Eclipse', duel: 'Wild Duel', wd15: 'Wild Draw 15', bhole: 'Wild Pot',
  mul2: 'Wild Double Down', mul3: 'Wild Triple Down', lucky: 'Horseshoe', glass: 'Shot Glass', devil: '666', spin: 'Wild Jackpot', loan: 'Loan',
  gift: 'Tip', echo: 'Wild Encore', freeze: 'Handcuffs', interest: 'Interest', sacrifice: 'Wild Sacrifice', wheel: 'Wild Wheel', bomb: 'Shotgun',
  d6: 'Wild Redeal', pill: 'Scratch Card', tower: 'The Tower', glitch: 'Wild Glitch', brim: 'Wild Brimstone', foot: 'Collector', maze: 'Spinner', deal: 'Wild Contract', monstro: 'Wild All-In'
};
// ---------- Balatro combos: number cards played together in one drop ----------
// d = extra random cards you throw away, m = cards every opponent picks up (the big hands only)
const COMBOS = {
  // d: cards thrown away by day / slapped on the next player by night; m: everyone else picks up; r: debt the house forgives by day
  pair: { d: 0, m: 0, r: 2 }, twopair: { d: 1, m: 0, r: 4 }, three: { d: 1, m: 0, r: 4 }, straight: { d: 1, m: 0, r: 3 }, flush: { d: 2, m: 0, r: 8 },
  fullhouse: { d: 2, m: 1, r: 10 }, four: { d: 1, m: 1, r: 10 }, rainbow: { d: 2, m: 1, r: 12 }, straightflush: { d: 2, m: 2, r: 15 }, five: { d: 2, m: 2, r: 15 }
};
const COMBO_RANK = ['pair', 'twopair', 'three', 'straight', 'flush', 'fullhouse', 'four', 'rainbow', 'straightflush', 'five'];
// a plain Wild (no draw on it) can stand in for any number in a hand, one per hand
const isJoker = f => f && f.c === 'w' && f.v === 'wild';
function comboPlain(faces) {
  if (!faces || faces.length < 2 || faces.some(f => !/^\d$/.test(f.v) || f.c === 'w')) return null;
  const n = faces.length, nums = faces.map(f => +f.v), chips = nums.reduce((a, b) => a + b, 0);
  const cnt = Object.values(nums.reduce((o, x) => (o[x] = (o[x] || 0) + 1, o), {})).sort((a, b) => b - a);
  const oneColor = faces.every(f => f.c === faces[0].c);
  const sorted = nums.slice().sort((a, b) => a - b);
  const run = cnt[0] === 1 && sorted.every((x, i) => !i || x === sorted[i - 1] + 1);
  let key = null;
  if (cnt[0] === n && n === 4 && new Set(faces.map(f => f.c)).size === 4) key = 'rainbow';
  else if (cnt[0] === n) key = n === 2 ? 'pair' : n === 3 ? 'three' : n === 4 ? 'four' : 'five';
  else if (oneColor && run && n >= 3) key = n >= 5 ? 'straightflush' : 'straight';
  else if (n === 4 && cnt[0] === 2 && cnt[1] === 2) key = 'twopair';
  else if (n === 5 && cnt[0] === 3 && cnt[1] === 2) key = 'fullhouse';
  else if (oneColor && n >= 5) key = 'flush';
  if (!key) return null;
  const C = COMBOS[key];
  const d = key === 'straight' ? n - 2 : C.d, r = key === 'straight' ? C.r * (n - 2) : C.r;
  return { key, d, m: C.m, r, chips: chips + n * 5, mult: Math.max(1, d + C.m * 2) };
}
// faces: [{c, v}] in play order. Returns { key, d, m, r, chips, mult } for a valid hand, null otherwise.
function comboOf(faces) {
  if (!faces || faces.length < 2) return null;
  const jokers = faces.filter(isJoker);
  if (!jokers.length) return comboPlain(faces);
  if (jokers.length > 1) return null;
  const rest = faces.filter(f => !isJoker(f));
  if (!rest.length || rest.some(f => !/^\d$/.test(f.v) || f.c === 'w')) return null;
  const side = SIDE_COLORS.L.includes(rest[0].c) ? 'L' : 'D';
  let best = null;
  for (const c of SIDE_COLORS[side]) for (let v = 0; v <= 9; v++) {
    if (side === 'D' && v === 0) continue;
    const cb = comboPlain(rest.concat([{ c, v: String(v) }]));
    if (cb && (!best || COMBO_RANK.indexOf(cb.key) > COMBO_RANK.indexOf(best.key) || (cb.key === best.key && cb.chips * cb.mult > best.chips * best.mult))) best = cb;
  }
  return best ? Object.assign(best, { joker: true }) : null;
}
// The House's own cards. Each has one job; overlapping ones were cut.
const EXTRA_CARDS = ['mirror', 'shield', 'dflip', 'wd15', 'mul2', 'mul3', 'lucky', 'glass', 'spin', 'loan', 'gift', 'echo', 'freeze', 'bomb', 'd6', 'pill', 'maze', 'deal'];
const LAST_CALL = 150;
// ---- debt match: what a card left in your hand costs you at the end of a deal ----
function debtValue(f) {
  if (/^\d$/.test(f.v) && f.c !== 'w') return +f.v;
  if (f.c === 'w') return ['wild'].includes(f.v) ? 25 : 35;
  if (['d4', 'd5', 'skipall'].includes(f.v)) return 20;
  if (['skip', 'rev', 'd1', 'd2', 'flip', 'discall'].includes(f.v)) return 12;
  return 35; // house cards (and the unique ones)
}
// tokens sold in the shop; price in chips
// ---- deals: the angel (light, by day) and the demon (dark, by night). One active at a time, one of each per match. ----
const LIGHT_DEALS = ['rosary', 'candle', 'wind', 'halo', 'confess', 'alms', 'clean', 'grace', 'guardian', 'penance'];
const DARK_DEALS = ['double', 'usury', 'chains', 'blood', 'bail', 'devour', 'mark', 'drum', 'puppet', 'sharp'];
// per-turn debt: at the start of your turn you pay for every card past the free ones
const DEBT_TURN = { free: 10, rate: 0.5, cap: 4 };
const ANGEL_STEP = 1.25, DEMON_BASE = 10, DEMON_STEP = 1.5, DEMON_MIN = 10;
const ATTACK_FACES = new Set(['mirror', 'mul2', 'mul3', 'glass', 'bomb', 'gift', 'sacr']);
const TOKENS = ['safe', 'sharp', 'pad', 'counter', 'light', 'debtor', 'license', 'luck', 'usurer'];
const PRICES = { token: 20, pay: 10, payAmount: 25, setup: 15, interest: 25, candle: 10, blood: 10 };
const DEBT_LIMITS = [250, 500, 1000];
// ---- the Dark shop's items: kept in a separate inventory, used by hand at any moment (two trigger on their own) ----
const ITEMS = ['rent', 'veil', 'dawn', 'shell', 'oven', 'eclipse', 'twoface', 'ward'];
const ITEM_PRICE = { rent: 10, veil: 25, dawn: 25, shell: 25, oven: 25, eclipse: 25, twoface: 40, ward: 25 };
const ITEM_AUTO = { twoface: true }; // fires by itself when a deal is offered
// ---- the Horsemen: once per match, when anyone's debt reaches 70% of their limit, one rides in for 10 table turns ----
const HORSEMEN = { death: ['curse'], war: ['timer', 'fury', 'arms'], famine: ['two', 'tithe'], plague: ['blank', 'rot'] };
const CURSES = ['dark', 'fever', 'mirror', 'static'];
const HORSE_TURNS = 10, HORSE_AT = 0.7, HORSE_AGAIN = 0.05, WAR_SECS = 4;
const ATTACK_VALS = { L: ['d1', 'd2', 'd4'], D: ['d5'] };
// Lobby presets. Every rule key the server knows, every house card.
const RULE_ALL = ['flip', 'stacking', 'multi', 'combos', 'gamble', 'lastCall', 'potato', 'drawUntil', 'chaos'];
const PRESETS = (() => {
  const on = (keys, all) => Object.fromEntries(all.map(k => [k, keys.includes(k)]));
  const base = ['flip', 'stacking', 'multi', 'drawUntil', 'lastCall'];
  return {
    classic: { rules: on(base, RULE_ALL), cards: on([], EXTRA_CARDS) },
    den: { rules: on(base.concat(['combos', 'gamble', 'potato', 'chaos']), RULE_ALL), cards: on(EXTRA_CARDS.filter(k => !['deal', 'wd15'].includes(k)), EXTRA_CARDS) },
    mayhem: { rules: on(RULE_ALL, RULE_ALL), cards: on(EXTRA_CARDS, EXTRA_CARDS) }
  };
})();
const DRAW_VAL = { d1: 1, d2: 2, wd2: 2, d4: 4, wd4: 4, wrd4: 4, d5: 5, wd6: 6, wrd8: 8, wd10: 10, wd15: 15 };
// Weights for each side. Light = classic UNO + Flip light side + No Mercy. Dark = Flip dark side, nastier.
const SIDE_WEIGHTS = {
  L: { colored: { '0': 2, '1': 4, '2': 4, '3': 4, '4': 4, '5': 4, '6': 4, '7': 4, '8': 4, '9': 4, skip: 2, rev: 2, d1: 2, d2: 2, flip: 2, d4: 1, discall: 2, skipall: 1, mirror: 1.5, shield: 1, dflip: 1, lucky: 1, glass: 1, loan: 1, gift: 1, pill: 1 },
       wild: { wild: 4, wd2: 2, wd4: 2, wrd4: 2, wd6: 1, wd10: 0.5, roul: 1.5, mul2: 1.5, spin: 2, echo: 2, d6: 1, swind: 0, sacr: 0 } },
  D: { colored: { '1': 4, '2': 4, '3': 4, '4': 4, '5': 4, '6': 4, '7': 4, '8': 4, '9': 4, skipall: 2, rev: 2, d5: 1.5, flip: 2, discall: 2, dflip: 1, glass: 1, freeze: 1, bomb: 1, maze: 1 },
       wild: { wild: 4, wdc: 2, wd6: 1.5, wd10: 1, wrd8: 1, roul: 1.5, wd15: 0.5, mul3: 1, deal: 1, swind: 0, sacr: 0 } }
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
const pick2 = list => list.slice().sort(() => Math.random() - 0.5).slice(0, 2);
// several deals can be held at once: up to 2 from the angel, up to 3 from the demon
const DEAL_MAX = { light: 2, dark: 3 };
function hasDeal(p, id) { return !!(p && p.deals && p.deals.includes(id)); }
function nLight(p) { return p && p.deals ? p.deals.filter(d => LIGHT_DEALS.includes(d)).length : 0; }
function nDark(p) { return p && p.deals ? p.deals.filter(d => DARK_DEALS.includes(d)).length : 0; }
function canLight(p) { return !p.fallen && nLight(p) < DEAL_MAX.light; }
// one deal signed per hand dealt: after that the visitors wait for the next deal
function offerOpen(p) { return !p.signedNow; }
function canDark(p) { return nDark(p) < DEAL_MAX.dark; }
const uniqueCard = v => ({ id: CARD_ID++, L: { c: 'w', v }, D: { c: 'w', v }, uniq: true });
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
    this.rules = Object.assign({ stacking: true, drawUntil: true, seven: true, zero: true, multi: true, combos: true, gamble: true, lastCall: true, potato: true, revenge: true, finisher: true, jumpIn: true, mercy: 25, handSize: 7, flip: true, chaos: true }, rules);
    // cut from the game: 7 swap, 0 rotate, jump-in, revenge, finisher
    Object.assign(this.rules, { jumpIn: false, revenge: false, finisher: false });
    this.rules.cards = Object.assign(Object.fromEntries(EXTRA_CARDS.map(k => [k, true])), rules.cards);
    // card values that never get dealt at this table
    this.rules.off = EXTRA_CARDS.filter(k => !this.rules.cards[k]).concat(this.rules.flip ? [] : ['flip', 'dflip']);
    const hum = Array.isArray(humans) ? humans : [humans];
    this.gid = Math.random().toString(36).slice(2, 8);
    this.side = 'L';
    this.next = this.newCard();
    this.players = names.map((n, i) => ({ name: n, hand: [], human: hum.includes(i), out: false, elim: false, shield: false, oweN: 0, owed: [], av: '', peer: '' }));
    for (const p of this.players) for (let i = 0; i < this.rules.handSize; i++) p.hand.push(this.newCard());
    // debt match: house tokens bought in the shop (seat -> ids) and the chips earned this deal
    this.perks = rules.perks || {};
    this.offer = null; this.turnKey = '';
    // deal state carries over from deal to deal in a match (the server passes it in and reads it back)
    const ds = Array.isArray(rules.deals) ? rules.deals : [];
    this.players.forEach((p, i) => {
      const d = ds[i] || {};
      Object.assign(p, { angel: d.angel || 0, demon: d.demon || 0, inv: Array.isArray(d.inv) ? d.inv.slice() : [], fx: {}, buff: d.buff || 0, deals: Array.isArray(d.deals) ? d.deals.slice() : (d.deal ? [d.deal] : []), fallen: !!d.fallen, markT: d.markT ?? null,
        debt: d.debt || 0, limit: d.limit || 0, used: {}, peace: null, dayAt: null, skipNext: false, broke: false });
    });
    delete this.rules.deals;
    this.horse = rules.horse && rules.horse.left > 0 ? JSON.parse(JSON.stringify(rules.horse)) : null;
    this.horseCount = rules.horseCount || 0;
    this.horseUsed = !!rules.horseUsed || !!this.horse;
    delete this.rules.horse; delete this.rules.horseUsed; delete this.rules.horseCount;
    this.chipsWon = this.players.map(() => 0);
    this.padUsed = this.players.map(() => false);
    let top;
    do { top = this.newCard(); } while (top.L.c === 'w' || isNaN(+top.L.v));
    this.top = top; this.color = top.L.c; this.dir = 1;
    this.pile = [cardCode(top) + '!' + top.id]; this.pileN = 1; // recent discards, so the pile can show a few cards underneath
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
  ev(type, data = {}) { this.events.push(Object.assign({ type, n: ++this.evSeq }, data)); if (this.events.length > 24) this.events.shift(); if (type === 'flip') this.rentPay(); }
  active() { return this.players.filter(p => !p.out); }
  nextIdx(from, steps = 1) {
    let i = from; const n = this.players.length;
    for (let s = 0; s < steps; s++) { let g = 0; do { i = (i + this.dir + n) % n; } while (this.players[i].out && ++g < n); }
    return i;
  }
  owes(pi) { const p = this.players[pi]; return !!p && !p.out && ((p.oweN || 0) > 0 || (p.owed && p.owed.length > 0)); }
  canPlay(card) {
    if (this.roulette !== null || this.debt || this.offer || card.hidden || card.lock || this.owes(this.turn)) return false;
    const f = this.f(card), t = this.f(this.top);
    if (this.pending > 0 && (f.c === 'w' || EXTRA_CARDS.includes(f.v)) && !card.uniq && this.horseOn('plague', 'blank', this.turn)) return false;
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
    if (got.length) this.ev('draw', { pi, k: got.length });
    return got;
  }
  mercyCheck() {
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
    this.lastCallCheck();
    if (this.roulette !== null && this.players[this.roulette].out) { this.roulette = null; }
    if (this.debt && this.players[this.debt.pi].out) this.debt = null;
  }
  // ================= THE HORSEMEN =================
  horseOn(k, v, pi) { const h = this.horse; if (pi != null && this.players[pi] && this.players[pi].fx && this.players[pi].fx.ward) return false; return !!(h && h.left > 0 && h.k === k && (!v || h.v === v)); }
  warded(pi) { return !!(this.players[pi] && this.players[pi].fx && this.players[pi].fx.ward); }
  horseCheck() {
    if (this.horse && this.horse.left > 0) return;
    let who;
    if (!this.horseUsed) {
      who = this.players.findIndex(p => !p.out && p.limit > 0 && (p.debt || 0) >= p.limit * HORSE_AT);
      if (who < 0) return;
    } else {
      // after the first one, any turn may bring another (5%)
      if (!this.players.some(p => p.limit > 0) || Math.random() >= HORSE_AGAIN) return;
      who = this.turn;
    }
    const ks = Object.keys(HORSEMEN), k = ks[Math.floor(Math.random() * ks.length)];
    const vs = HORSEMEN[k], v = vs[Math.floor(Math.random() * vs.length)];
    this.horse = { k, v, left: HORSE_TURNS, fresh: true, curses: k === 'death' ? this.players.map(() => CURSES[Math.floor(Math.random() * CURSES.length)]) : [] };
    this.horseUsed = true; this.horseCount = (this.horseCount || 0) + 1;
    this.addLog(`A horseman rides in: ${k}. ${HORSE_TURNS} turns.`, 'bad', 'horse', { k, v, n: this.players[who].name });
    this.ev('horse', { k, v, pi: who });
    this.wardCheck();
  }
  // the horseman's work at the start of pi's turn
  horseTurn(pi) {
    const h = this.horse; if (!h || h.left <= 0) return;
    if (h.fresh) h.fresh = false;
    else if (--h.left <= 0) {
      this.addLog(`The horseman rides off. The table is back to normal.`, 'win', 'horseEnd', { k: h.k });
      this.ev('horseEnd', { k: h.k });
      return;
    }
    const p = this.players[pi], rnd = a => a[Math.floor(Math.random() * a.length)];
    if (h.k === 'famine' && h.v === 'tithe' && this.prevTurnPi != null && this.prevTurnPi !== pi && !this.warded(this.prevTurnPi)) {
      const gi = this.prevTurnPi, g = this.players[gi];
      if (g && !g.out && g.hand.length > 1) {
        const live = this.players.map((q, i) => i).filter(i => !this.players[i].out);
        const min = Math.min(...live.map(i => this.players[i].hand.length));
        const to = live.filter(i => i !== gi && !this.warded(i) && this.players[i].hand.length === min);
        const free = g.hand.filter(c => !c.lock && !c.uniq);
        if (to.length && free.length && !(g.hand.length === min && to.length === 0)) {
          const ti = rnd(to);
          for (let r = 0; r < 2 && free.length && g.hand.length > 1; r++) { const c = free.splice(Math.floor(Math.random() * free.length), 1)[0]; g.hand.splice(g.hand.indexOf(c), 1); this.players[ti].hand.push(c); }
          this.addLog(`Famine: ${g.name} hands two cards to ${this.players[ti].name}.`, 'swap', 'tithe', { n: g.name, t: this.players[ti].name });
          this.ev('tithe', { pi: gi, t: ti });
        }
      }
    }
    if (h.k === 'war' && h.v === 'arms' && !this.warded(pi)) {
      const calm = p.hand.filter(c => { const f = this.f(c); return !c.lock && !c.uniq && f.c !== 'w' && !DRAW_VAL[f.v] && !ATTACK_FACES.has(f.v); });
      for (let r = 0; r < 2 && calm.length; r++) {
        const c = calm.splice(Math.floor(Math.random() * calm.length), 1)[0], f = this.f(c);
        c[this.side] = { c: f.c, v: rnd(ATTACK_VALS[this.side]) };
        this.addLog(`War arms ${p.name}: a card turns into ${faceName(c[this.side])}.`, 'bad', 'arms', { n: p.name, f: c[this.side] });
        this.ev('arms', { pi });
      }
    }
    if (h.k === 'plague' && h.v === 'rot' && !this.warded(pi)) {
      const pool = p.hand.filter(c => !c.uniq && !c.lock);
      let n = 0;
      for (let r = 0; r < 3 && pool.length; r++) { const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; p.hand[p.hand.indexOf(c)] = this.newCard(); n++; }
      if (n) { this.addLog(`Plague: ${n} of ${p.name}'s cards rot and are replaced.`, 'bad', 'rot', { n: p.name, k: n }); this.ev('rot', { pi, k: n }); }
    }
  }
  // War (timer): the clock ran out on pi's turn. The turn ends and pi picks up 2 more.
  warTimeout(pi) {
    if (!this.horseOn('war', 'timer', pi) || this.turn !== pi || this.winner !== null || this.offer || this.roulette !== null) return false;
    const p = this.players[pi]; if (!p || p.out) return false;
    if (this.debt && this.debt.pi === pi) { if (this.debt.n) p.oweN = (p.oweN || 0) + this.debt.n; this.debt = null; }
    else if (this.pending > 0) { p.oweN = (p.oweN || 0) + this.pending; this.afterHit(this.stackFrom, pi, this.pending); this.pending = 0; this.stackMin = 0; this.stackFrom = -1; }
    p.oweN = (p.oweN || 0) + 3;
    this.drewBy = -1; this.drawRun = 0; this.seq++;
    this.addLog(`War: ${p.name} ran out of time and picks up 3.`, 'bad', 'warTime', { n: p.name });
    this.ev('warTime', { pi });
    this.turn = this.nextIdx(pi, 1);
    this.applyShield(); this.checkFlipBack(); this.lastCallCheck();
    return true;
  }
  // ================= DEALS =================
  dmul(pi) { const p = this.players[pi]; return p && hasDeal(p, 'double') ? 2 : 1; }
  payDebt(pi, amt, why) {
    const p = this.players[pi]; if (!p) return 0;
    if (amt > 0 && hasDeal(p, 'rosary')) amt = Math.round(amt * 0.85);
    p.debt = Math.max(0, Math.round((p.debt || 0) + amt));
    if (amt) this.ev('debt', { pi, k: amt, why });
    return amt;
  }
  // a player used an attack card: the angel turns away, Double Strike charges its price
  attacked(pi) {
    const p = this.players[pi]; if (!p) return;
    p.peace = false; p.angel = 0;
    if (hasDeal(p, 'double')) { const add = Math.ceil((p.debt || 0) * 0.05); if (add) this.payDebt(pi, add, 'double'); }
  }
  // cards forced on someone by an attack: deals bend the number, then the demon and friends take note
  hit(from, to, n) {
    const a = this.players[from], t = this.players[to];
    if (!t || t.out || n <= 0) return 0;
    if (from === to || !a) { t.oweN = (t.oweN || 0) + n; return n; }
    n *= this.dmul(from);
    if (this.horseOn('war', 'fury', to)) n += 3;
    if (hasDeal(t, 'chains')) n = Math.ceil(n * 1.5);
    if (hasDeal(a, 'mark') && a.markT === to) n += 2;
    if (hasDeal(t, 'mark') && t.markT === from) n += 2;
    if (hasDeal(t, 'guardian') && !t.used.guardian) {
      t.used.guardian = true; a.oweN = (a.oweN || 0) + n;
      this.addLog(`${t.name}'s guardian turns the hit back on ${a.name}: +${n}.`, 'win', 'guardian', { n: t.name, t: a.name, k: n });
      this.ev('guardian', { pi: to, t: from, k: n });
      return 0;
    }
    t.oweN = (t.oweN || 0) + n;
    this.afterHit(from, to, n);
    return n;
  }
  afterHit(from, to, n) {
    const a = this.players[from]; if (!a || from === to || from < 0) return;
    if (n >= DEMON_MIN && canDark(a) && !a.out) { const ch = DEMON_BASE + (n - DEMON_MIN) * DEMON_STEP; if (ch > (a.demon || 0)) { a.demon = ch; this.ev('demonCharge', { pi: from, k: ch }); } }
    if (hasDeal(a, 'blood') && this.chipsWon) this.chipsWon[from] += n;
    if (n >= 10) this.players.forEach((q, i) => { if (i !== to && !q.out && hasDeal(q, 'devour')) this.payDebt(i, -10, 'devour'); });
  }
  // a stack lands on pi; returns true if a guardian bounced it back to whoever sent it
  takeStack(pi, sf) {
    const p = this.players[pi], a = sf >= 0 ? this.players[sf] : null;
    if (this.horseOn('war', 'fury', pi)) this.pending += 3;
    if (a && sf !== pi) {
      if (hasDeal(p, 'chains')) this.pending = Math.ceil(this.pending * 1.5);
      if (hasDeal(a, 'mark') && a.markT === pi) this.pending += 2;
      if (hasDeal(p, 'mark') && p.markT === sf) this.pending += 2;
      if (hasDeal(p, 'guardian') && !p.used.guardian && !a.out) {
        p.used.guardian = true; const n = this.pending;
        a.oweN = (a.oweN || 0) + n;
        this.addLog(`${p.name}'s guardian turns the +${n} stack back on ${a.name}.`, 'win', 'guardian', { n: p.name, t: a.name, k: n });
        this.ev('guardian', { pi, t: sf, k: n });
        this.pending = 0; this.stackMin = 0; this.stackFrom = -1; this.drewBy = -1;
        this.turn = this.nextIdx(pi, 1); this.applyShield(); this.checkFlipBack();
        return true;
      }
    }
    if (hasDeal(p, 'halo') && !p.used.halo) {
      p.used.halo = true; this.pending = Math.ceil(this.pending / 2);
      this.addLog(`${p.name}'s halo takes half the hit: +${this.pending}.`, 'win', 'halo', { n: p.name, k: this.pending });
      this.ev('halo', { pi, k: this.pending });
    }
    return false;
  }
  // per-turn debt for pi's hand right now
  turnDebt(pi) {
    const p = this.players[pi];
    const counted = p.hand.filter(c => { if (c.uniq) return false; if (!hasDeal(p, 'clean')) return true; const f = this.f(c); return !(/^\d$/.test(f.v) && f.c !== 'w'); }).length;
    let d = Math.min(DEBT_TURN.cap, Math.max(0, counted - DEBT_TURN.free) * DEBT_TURN.rate);
    if (this.players.some((q, i) => i !== pi && !q.out && hasDeal(q, 'usury'))) d *= 1.5;
    if (hasDeal(p, 'blood')) d *= 1.25;
    if (p.fx.shell) d *= 0.8;
    if (p.fx.veil && this.side === 'D') d *= 0.6;
    if (p.fx.dawn && this.side === 'L') d *= 0.6;
    return Math.round(d);
  }
  // Called after every action (server, simulator): runs the start of the current player's turn once.
  // Debt for the hand, chains, the angel's patience, the demon's charge, a puppet's skip.
  beginTurn() {
    if (this.winner !== null || this.roulette !== null || this.debt || this.offer) return false;
    const pi = this.turn, p = this.players[pi];
    if (!p || p.out) return false;
    const key = (this.turnNo || 0) + ':' + pi;
    if (this.turnKey === key) return false;
    this.turnKey = key;
    this.horseCheck();
    this.wardCheck();
    this.horseTurn(pi);
    this.prevTurnPi = pi;
    // the angel counts the turn you just finished: peaceful, and by day
    if (p.peace === true) {
      if (p.dayAt === 'L' && canLight(p)) p.angel = Math.min(100, (p.angel || 0) + ANGEL_STEP);
      if (hasDeal(p, 'candle') && p.debt > 0) this.payDebt(pi, -5, 'candle');
    }
    // chains: cards from a Sacrifice count down; anything else from last turn falls off
    for (const c of p.hand) { if (c.chain > 0) { c.lock = true; c.chain--; } else c.lock = false; }
    // debt for the hand you hold
    if (p.limit > 0) {
      const d = this.turnDebt(pi);
      if (d) this.payDebt(pi, d, 'turn');
      if (p.debt > p.limit && !p.overWarned) { p.overWarned = true; this.ev('overLimit', { pi, d: p.debt, l: p.limit }); }
    }
    // the demon's chains on an opponent's hand, for this turn
    if (this.players.some((q, i) => i !== pi && !q.out && hasDeal(q, 'chains')) && p.hand.length > 1) {
      const free = p.hand.filter(c => !c.lock).sort(() => Math.random() - 0.5);
      const n = Math.max(1, Math.floor(p.hand.length * 0.2));
      for (const c of free.slice(0, n)) c.lock = true;
      this.ev('chained', { pi, k: Math.min(n, free.length) });
    }
    // a puppet's string
    if (p.skipNext) {
      p.skipNext = false;
      this.addLog(`${p.name} dances on a string and misses the turn.`, 'stk', 'puppetSkip', { n: p.name });
      this.ev('skip', { pi });
      p.peace = null; this.turn = this.nextIdx(pi, 1);
      return true;
    }
    // the visitors: the demon only by night, the angel only by day
    const roll = x => Math.random() * 100 < x;
    if (!(p.limit > 0)) { /* single deal: no house, no visitors */ }
    else if (this.side === 'D' && ((canDark(p) && offerOpen(p)) || p.inv.includes('twoface')) && (p.demon || 0) > 0) {
      const ch = Math.min(100, p.demon + this.dealBonus(pi)); p.demon = 0;
      if (roll(ch)) this.offer = { pi, kind: 'dark', opts: pick2(DARK_DEALS.filter(d => !hasDeal(p, d))) };
      else this.ev('demonMiss', { pi, k: ch });
    } else if (this.side === 'L' && ((canLight(p) && offerOpen(p)) || (p.inv.includes('twoface') && !p.fallen)) && (p.angel || 0) > 0 && roll(p.angel + this.dealBonus(pi))) {
      this.offer = { pi, kind: 'light', opts: pick2(LIGHT_DEALS.filter(d => !hasDeal(p, d))) };
    }
    this.twoFace();
    if (this.offer) { this.addLog(`${this.offer.kind === 'dark' ? 'The demon' : 'The angel'} comes to ${p.name}.`, 'n', this.offer.kind === 'dark' ? 'demonCome' : 'angelCome', { n: p.name }); this.ev('offer', { pi, kind: this.offer.kind }); }
    p.peace = true; p.dayAt = this.side;
    this.seq++;
    return true;
  }
  // choose a deal (or tear up the demon's contract with id = null)
  resolveDeal(pi, id, target) {
    const o = this.offer, p = this.players[pi];
    if (!o || o.pi !== pi) return false;
    if (o.kind === 'light' && !o.opts.includes(id)) return false;
    if (o.kind === 'dark' && id !== null && !o.opts.includes(id)) return false;
    if (o.kind === 'both' && !o.opts.includes(id)) return false;
    this.offer = null; this.seq++;
    p.buff = 0;
    if (o.kind === 'both') {
      // Two-faced: whichever is picked, no fall, no limits, and it doesn't count as this hand's deal
      const lightPick = LIGHT_DEALS.includes(id);
      if (lightPick) p.angel = 0; else p.demon = 0;
      p.deals.push(id);
      this.dealEffect(pi, id, target);
      this.addLog(`${p.name} takes a ${lightPick ? 'light' : 'dark'} deal: ${id}.`, lightPick ? 'win' : 'bad', 'dealTaken', { n: p.name, d: id, kind: lightPick ? 'light' : 'dark', t: p.markT != null && id === 'mark' ? this.players[p.markT].name : null });
      this.ev('dealTaken', { pi, d: id, kind: lightPick ? 'light' : 'dark' });
      return true;
    }
    if (o.kind === 'dark' && id === null) {
      this.addLog(`${p.name} tears up the demon's contract.`, 'n', 'demonNo', { n: p.name });
      this.ev('dealNo', { pi });
      return true;
    }
    if (o.kind === 'light') { p.angel = 0; }
    else {
      if (nLight(p)) {
        // the fall: the light deal burns and a Sacrifice is left in your hand
        this.addLog(`${p.name}'s light deal burns. A Sacrifice is left behind.`, 'bad', 'fall', { n: p.name });
        this.ev('fall', { pi });
        p.hand.push(uniqueCard('sacr'));
        p.deals = p.deals.filter(d => !LIGHT_DEALS.includes(d));
      }
      p.fallen = true; p.angel = 0; p.demon = 0;
    }
    p.deals.push(id); p.signedNow = true;
    this.dealEffect(pi, id, target);
    this.addLog(`${p.name} takes a ${o.kind} deal: ${id}.`, o.kind === 'dark' ? 'bad' : 'win', 'dealTaken', { n: p.name, d: id, kind: o.kind, t: p.markT != null && id === 'mark' ? this.players[p.markT].name : null });
    this.ev('dealTaken', { pi, d: id, kind: o.kind });
    return true;
  }
  dealEffect(pi, id, target) {
    const p = this.players[pi];
    switch (id) {
      case 'wind': p.hand.push(uniqueCard('swind')); break;
      case 'penance': this.payDebt(pi, -Math.round(p.debt * 0.25), 'penance'); break;
      case 'usury': p.debt = Math.round(p.debt * 1.2); this.ev('debt', { pi, k: 0, why: 'usury' }); break;
      case 'bail': p.debt = Math.round(p.debt * 0.6); p.limit = Math.round(p.limit * 0.8); this.ev('debt', { pi, k: 0, why: 'bail' }); break;
      case 'mark': {
        const ok = Number.isInteger(target) && target !== pi && this.players[target] && !this.players[target].out;
        p.markT = ok ? target : this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out).sort((a, b) => this.players[a].hand.length - this.players[b].hand.length)[0] ?? null;
        break;
      }
    }
  }
  // ================= ITEMS =================
  dealBonus(pi) {
    const p = this.players[pi];
    return (p.buff || 0) + (p.fx.veil && this.side === 'D' ? 2 : 0) + (p.fx.dawn && this.side === 'L' ? 2 : 0);
  }
  canUseItem(pi, id) {
    const p = this.players[pi];
    if (!p || p.out || this.winner !== null || this.offer || !p.inv.includes(id) || ITEM_AUTO[id]) return false;
    if (p.fx[id] !== undefined && id !== 'eclipse' && id !== 'oven') return false; // already running this hand
    if (id === 'oven' && p.hand.length < 30) return false;
    return true;
  }
  useItem(pi, id) {
    if (!this.canUseItem(pi, id)) return false;
    const p = this.players[pi];
    p.inv.splice(p.inv.indexOf(id), 1); this.seq++;
    this.addLog(`${p.name} uses ${id}.`, 'n', 'item', { n: p.name, it: id });
    this.ev('item', { pi, id });
    switch (id) {
      case 'rent': p.fx.rent = 0; break;
      case 'veil': case 'dawn': case 'shell': case 'ward': p.fx[id] = true; break;
      case 'oven': {
        const pool = p.hand.filter(c => !c.uniq), n = Math.floor(p.hand.length / 2);
        const burn = pool.sort(() => Math.random() - 0.5).slice(0, n);
        p.hand = p.hand.filter(c => !burn.includes(c));
        for (const c of burn) { this.pile.splice(Math.max(0, this.pile.length - 1), 0, cardCode(c) + '!' + c.id); this.pileN++; }
        if (this.pile.length > 6) this.pile.splice(0, this.pile.length - 6);
        this.addLog(`The oven eats ${burn.length} of ${p.name}'s cards.`, 'win', 'oven', { n: p.name, k: burn.length });
        this.ev('oven', { pi, k: burn.length });
        break;
      }
      case 'eclipse': {
        this.side = other(this.side);
        const nf = this.f(this.top);
        this.color = nf.c === 'w' ? Bot.bestColor(this, p.hand, this.side) : nf.c;
        this.addLog(`Eclipse: ${p.name} turns the table to the ${this.side === 'D' ? 'dark' : 'light'} side.`, 'flip', 'eclipse', { n: p.name, dk: this.side === 'D' ? 1 : 0 });
        this.ev('flip', { side: this.side });
        const dark = this.side === 'D', tf = p.inv.includes('twoface');
        const ok = dark ? (canDark(p) && offerOpen(p)) || tf : (canLight(p) && offerOpen(p)) || (tf && !p.fallen);
        if (ok && Math.random() < 0.25) {
          this.offer = { pi, kind: dark ? 'dark' : 'light', opts: pick2((dark ? DARK_DEALS : LIGHT_DEALS).filter(d => !hasDeal(p, d))) };
          this.addLog(`${dark ? 'The demon' : 'The angel'} comes to ${p.name}.`, 'n', dark ? 'demonCome' : 'angelCome', { n: p.name });
          this.ev('offer', { pi, kind: this.offer.kind });
          this.twoFace();
        } else { p.buff = (p.buff || 0) + 5; this.ev('eclipseMiss', { pi, k: p.buff }); }
        break;
      }
    }
    return true;
  }
  // Two-faced fires by itself on an offer: both visitors lay out their deals, pick any one
  twoFace() {
    const o = this.offer; if (!o || o.kind === 'both') return;
    const p = this.players[o.pi]; if (!p.inv.includes('twoface')) return;
    p.inv.splice(p.inv.indexOf('twoface'), 1);
    o.kind = 'both';
    o.opts = pick2(LIGHT_DEALS.filter(d => !hasDeal(p, d))).concat(pick2(DARK_DEALS.filter(d => !hasDeal(p, d))));
    this.addLog(`${p.name} is two-faced: both visitors lay out their deals.`, 'n', 'twoface', { n: p.name });
    this.ev('item', { pi: o.pi, id: 'twoface' });
  }
  // Ward fires by itself while a horseman rides, and keeps its owner out of reach for the rest of the hand
  wardCheck() {
    if (!this.horse || this.horse.left <= 0) return;
    this.players.forEach((p, i) => {
      if (p.out || p.fx.ward || !p.inv.includes('ward')) return;
      p.inv.splice(p.inv.indexOf('ward'), 1); p.fx.ward = true;
      this.addLog(`${p.name}'s ward holds the horseman off.`, 'win', 'ward', { n: p.name });
      this.ev('item', { pi: i, id: 'ward' });
    });
  }
  // Rent: +3 chips for every change of day and night, up to 10 times a hand
  rentPay() {
    this.players.forEach((p, i) => {
      if (p.fx && p.fx.rent !== undefined && p.fx.rent < 10 && this.chipsWon) { p.fx.rent++; this.chipsWon[i] += 3; this.ev('rent', { pi: i, k: p.fx.rent }); }
    });
  }
  // the deals you use by hand, on your own turn
  ability(pi, k, cards) {
    const p = this.players[pi];
    if (!p || p.out || this.turn !== pi || this.winner !== null || this.offer || this.roulette !== null || this.debt || this.pending > 0 || this.owes(pi)) return false;
    if (k === 'confess' && hasDeal(p, 'confess') && !p.used.confess && Array.isArray(cards)) {
      const pick = []; for (const id of cards.slice(0, 3)) { const c = p.hand.find(x => x.id === id && !x.lock && !pick.includes(x)); if (c) pick.push(c); }
      if (!pick.length || p.hand.length - pick.length < 1) return false;
      p.hand = p.hand.filter(c => !pick.includes(c)); p.used.confess = true;
      this.addLog(`${p.name} confesses: ${pick.length} cards are let go.`, 'win', 'confess', { n: p.name, k: pick.length });
      this.ev('confess', { pi, k: pick.length }); this.seq++; return true;
    }
    if (k === 'puppet' && hasDeal(p, 'puppet') && !p.used.puppet) {
      const t = this.nextIdx(pi, 1); if (t === pi) return false;
      this.players[t].skipNext = true; p.used.puppet = true; this.payDebt(pi, 15, 'puppet');
      this.addLog(`${p.name} pulls the strings: ${this.players[t].name} will miss a turn.`, 'bad', 'puppet', { n: p.name, t: this.players[t].name });
      this.ev('puppet', { pi, t }); this.seq++; return true;
    }
    if (k === 'burn' && hasDeal(p, 'sharp')) {
      this.next = this.newCard(); this.payDebt(pi, 5, 'sharp');
      this.addLog(`${p.name} burns the top card.`, 'stk', 'burn', { n: p.name });
      this.ev('burn', { pi }); this.seq++; return true;
    }
    return false;
  }
  hasPerk(pi, id) { const l = this.perks && this.perks[pi]; return !!(l && l.includes(id)); }
  // Last Call: after LAST_CALL handovers the house closes. Fewest cards wins; a tie goes to whoever sits soonest in turn order.
  lastCallLeft() { return this.rules.lastCall === false ? null : Math.max(0, LAST_CALL - (this.turnNo || 0)); }
  lastCallCheck() {
    if (this.winner !== null || this.rules.lastCall === false || (this.turnNo || 0) < LAST_CALL) return;
    if (this.pending > 0 || this.debt || this.roulette !== null) return; // let the stack land first
    let best = -1, i = this.turn;
    for (let k = 0; k < this.players.length; k++, i = (i + this.dir + this.players.length) % this.players.length) {
      const p = this.players[i]; if (p.out) continue;
      if (best < 0 || p.hand.length + (p.oweN || 0) < this.players[best].hand.length + (this.players[best].oweN || 0)) best = i;
    }
    if (best < 0) return;
    this.winner = best;
    this.addLog(`Last call. The house closes the table: ${this.players[best].name} holds the fewest cards and wins.`, 'win', 'lastCall', { n: this.players[best].name, k: this.players[best].hand.length });
    this.ev('lastcall', { pi: best }); this.ev('win', { pi: best });
  }
  play(pi, cardId, opts = {}) {
    const p = this.players[pi];
    const idx = p.hand.findIndex(c => c.id === cardId);
    if (idx < 0 || this.winner !== null) return false;
    const card = p.hand[idx];
    const jump = pi !== this.turn;
    if (jump ? !this.canJumpIn(pi, card) : !this.canPlay(card)) return false;
    const face = this.f(card);
    const blank = (face.c === 'w' || EXTRA_CARDS.includes(face.v)) && !card.uniq && this.horseOn('plague', 'blank', pi); // Plague: wilds go down as blank paper
    if (this.horseOn('famine', 'two', pi) && Array.isArray(opts.extra)) opts = Object.assign({}, opts, { extra: [] });
    // Same-number drop: extra cards with the same value (never wilds) go down with the first one.
    const chain = [card];
    if (this.rules.multi && Array.isArray(opts.extra)) {
      if (this.rules.combos !== false && ((/^\d$/.test(face.v) && face.c !== 'w') || isJoker(face))) {
        const want = [card];
        for (const id of opts.extra) { const c = p.hand.find(x => x.id === id); if (c && !c.lock && !want.includes(c)) want.push(c); }
        if (want.length > 1 && comboOf(want.map(c => this.f(c)))) {
          // a joker never ends the hand: the pile shows a real number and colour
          if (want.length > 2 && isJoker(this.f(want[want.length - 1]))) { const j = want.pop(); want.splice(want.length - 1, 0, j); }
          chain.push(...want.slice(1));
        }
      }
      if (chain.length === 1) for (const id of opts.extra) {
        const c = p.hand.find(x => x.id === id);
        // same value; a wild only goes with wilds, a colored card only with colored cards
        if (c && !c.lock && !chain.includes(c) && this.f(c).v === face.v && (this.f(c).c === 'w') === (face.c === 'w')) chain.push(c);
      }
    }
    const k = chain.length;
    p.hand = p.hand.filter(c => !chain.includes(c));
    if (p.loan > 0 && face.v !== 'loan' && --p.loan === 0) {
      this.payDebt(pi, p.loanAmt || 30, 'loan');
      this.addLog(`${p.name}'s loan comes due: +${p.loanAmt || 30} debt.`, 'bad', 'loanDue2', { n: p.name, d: p.loanAmt || 30 });
      this.ev('loanDue', { pi });
    }
    const last = chain[k - 1];
    const prevFace = this.top ? this.f(this.top) : null; // what Echo copies (and what a Mirror throws back)
    const prevBy = this.topBy != null ? this.topBy : -1;
    this.top = last; this.topBy = pi;
    for (const c of chain) { this.pile.push(cardCode(c) + '!' + c.id); this.pileN++; }
    if (this.pile.length > 6) this.pile.splice(0, this.pile.length - 6);
    if (!blank) this.color = k > 1 && this.f(last).c !== 'w' ? this.f(last).c : (this.f(last).c === 'w' || face.c === 'w') ? this.validColor(opts.color || (face.c !== 'w' ? face.c : null), pi) : this.f(last).c;
    this.seq++; this.drawRun = 0;
    let extra = '';
    if (face.v === 'discall') {
      const cols = new Set(chain.map(c => this.f(c).c));
      let same = p.hand.filter(c => cols.has(this.f(c).c));
      if (this.horseOn('famine', null, pi)) same = same.filter(c => !c.lock).slice(0, 1); // Famine: the purge only takes one more card of its colour
      p.handDumped = same.length;
      p.hand = p.hand.filter(c => !same.includes(c));
      if (same.length) extra = ` and discards ${same.length} more card${same.length > 1 ? 's' : ''} of ${k > 1 ? 'those colors' : 'that color'}`;
    }
    const showColor = face.c === 'w' && face.v !== 'roul' && !blank;
    const what = k > 1 ? chain.map(c => faceName(this.f(c))).join(', ') : faceName(face);
    this.addLog(`${jump ? p.name + ' jumps in with' : p.name + ' plays'} ${what}${showColor ? ' → ' + COLOR_NAME[this.color] : ''}${extra}.`, jump ? 'jump' : '', 'play',
      { n: p.name, j: jump ? 1 : 0, cards: chain.map(c => this.f(c)), c: showColor ? this.color : null, d: face.v === 'discall' ? (p.handDumped || 0) : 0 });
    this.ev('play', { pi, code: cardCode(last), side: this.side, jump, k });
    if (k > 1) this.ev('multi', { pi, k });
    let combo = k > 1 && this.rules.combos !== false ? comboOf(chain.map(c => this.f(c))) : null;
    if (combo && combo.key === 'pair' && this.hasPerk(pi, 'sharp')) combo = Object.assign({}, combo, { key: 'three', d: COMBOS.three.d, mult: Math.max(1, COMBOS.three.d) }); // Sharp: a pair plays as three of a kind
    if (combo && this.chipsWon && !hasDeal(p, 'devour')) this.chipsWon[pi] += Math.max(1, Math.round(combo.chips * combo.mult / 10));
    if (!blank && (DRAW_VAL[face.v] || ATTACK_FACES.has(face.v)) || (face.v === 'echo' && DRAW_VAL[this.f(this.top).v]) || (combo && (combo.m || (this.side === 'D' && combo.d)))) this.attacked(pi);
    if (this.chipsWon && !/^\d$/.test(face.v) && this.hasPerk(pi, 'counter')) this.chipsWon[pi] += 1; // Bookkeeper
    if (showColor) this.ev('color', { c: this.color });
    this.turn = pi;
    this.drewBy = -1;
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
      let tossed = 0, slap = -1;
      if (this.side === 'D' && combo.d) { slap = this.nextIdx(pi, 1); this.hit(pi, slap, combo.d); } // by night a hand hurts the next player
      else for (let r = 0; r < combo.d && p.hand.length > 1; r++) { const free = p.hand.filter(c => !c.lock); if (!free.length) break; p.hand.splice(p.hand.indexOf(free[Math.floor(Math.random() * free.length)]), 1); tossed++; }
      let relief = 0;
      if (this.side === 'L' && combo.r && p.limit > 0 && p.debt > 0) { relief = Math.min(p.debt, combo.r); this.payDebt(pi, -relief, 'combo'); }
      const hit = combo.m ? this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out) : [];
      for (const i of hit) this.hit(pi, i, combo.m);
      this.addLog(`${p.name} plays a ${combo.key}: ${combo.chips} × ${combo.mult}.${tossed ? ` ${tossed} more cards gone.` : ''}${hit.length ? ` Everyone else picks up ${combo.m}.` : ''}`, 'stack', 'combo', { n: p.name, h: combo.key, c: combo.chips, x: combo.mult, d: tossed, m: hit.length ? combo.m : 0, s: slap >= 0 ? this.players[slap].name : null, sd: slap >= 0 ? combo.d : 0 });
      this.ev('combo', { pi, key: combo.key, chips: combo.chips, mult: combo.mult, d: tossed, m: hit.length ? combo.m : 0, slap, sd: slap >= 0 ? combo.d : 0, r: relief, j: combo.joker ? 1 : 0 });
    }
    switch (blank ? '' : face.v) {
      case 'skip':
        steps = 1 + k;
        for (let s = 1; s <= k; s++) this.ev('skip', { pi: this.nextIdx(pi, s) });
        break;
      case 'rev':
        if (k % 2) { this.dir *= -1; steps = n === 2 ? 2 : 1; this.ev('reverse', { dir: this.dir }); }
        break;
      case 'skipall': steps = 0; this.ev('skipall', { pi }); break;
      case 'd1': case 'd2': case 'd4': case 'd5': case 'wd2': case 'wd4': case 'wd6': case 'wd10': case 'wd15':
        this.pending += DRAW_VAL[face.v] * k * (this.inflate > 0 ? 2 : 1) * this.multNext * this.dmul(pi); this.multNext = 1; this.stackMin = DRAW_VAL[face.v]; this.stackFrom = pi; break;
      case 'wrd4': case 'wrd8':
        if (k % 2) { this.dir *= -1; this.ev('reverse', { dir: this.dir }); }
        this.pending += DRAW_VAL[face.v] * k * (this.inflate > 0 ? 2 : 1) * this.multNext * this.dmul(pi); this.multNext = 1; this.stackMin = DRAW_VAL[face.v]; this.stackFrom = pi; break;
      case 'mirror':
        if (this.pending > 0) {
          const back = this.stackFrom;
          if (back >= 0 && back !== pi && !this.players[back].out) {
            this.addLog(`${p.name} mirrors the +${this.pending} stack back to ${this.players[back].name}.`, 'swap', 'mirror', { n: p.name, k: this.pending, t: this.players[back].name });
            this.ev('mirror', { a: pi, b: back, k: this.pending });
            this.stackFrom = pi; this.turn = back; steps = -1;
          }
        } else if (prevFace && prevBy >= 0 && prevBy !== pi && !this.players[prevBy].out) {
          // no stack: the Mirror throws whatever the last card did straight back at whoever played it
          const v = prevFace.v, q = this.players[prevBy]; let what = null;
          if (DRAW_VAL[v]) { this.hit(pi, prevBy, DRAW_VAL[v]); what = '+' + DRAW_VAL[v]; }
          else if (v === 'wdc') { this.hit(pi, prevBy, 4); what = '+4'; }
          else if (v === 'skip' || v === 'skipall' || v === 'freeze') { q.skipNext = true; what = 'skip'; }
          else if (v === 'rev') { this.dir *= -1; this.ev('reverse', { dir: this.dir }); what = 'reverse'; }
          else if (!/^\d$/.test(v) && v !== 'wild' && v !== 'flip' && v !== 'mirror') { this.hit(pi, prevBy, 2); what = '+2'; }
          if (what) {
            this.addLog(`${p.name}'s mirror throws ${faceName(prevFace)} back at ${q.name}.`, 'swap', 'mirrorAny', { n: p.name, t: q.name, f: prevFace });
            this.ev('mirror', { a: pi, b: prevBy, k: DRAW_VAL[v] || 0 });
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
        // a horseshoe: heads, 15 debt is written off; tails, you throw away 2 random cards (never chained ones)
        let wipe = 0, toss = 0;
        for (let r = 0; r < k; r++) {
          if (Math.random() < 0.5) { wipe += 15; } else { for (let q = 0; q < 2 && p.hand.length > 1; q++) { const free = p.hand.filter(c => !c.lock); if (!free.length) break; p.hand.splice(p.hand.indexOf(free[Math.floor(Math.random() * free.length)]), 1); toss++; } }
        }
        if (wipe) this.payDebt(pi, -wipe, 'lucky');
        this.addLog(`${p.name}'s horseshoe: ${wipe ? `−${wipe} debt` : ''}${wipe && toss ? ', ' : ''}${toss ? `${toss} cards gone` : ''}.`, 'win', 'lucky2', { n: p.name, w: wipe, h: toss });
        this.ev('lucky', { pi, h: toss, w: wipe });
        break;
      }
      case 'glass': {
        // fragile: the next player picks up 2, unless the glass breaks in your hand (1 in 4)
        const vi = this.nextIdx(pi, 1);
        let mine = 0, theirs = 0;
        for (let r = 0; r < k; r++) (Math.random() < 0.25 ? mine++ : theirs++);
        if (theirs) this.hit(pi, vi, 2 * theirs);
        if (mine) p.oweN = (p.oweN || 0) + 2 * mine;
        this.addLog(mine && !theirs ? `${p.name}'s glass shatters: ${p.name} picks up ${2 * mine}.` : `${p.name}'s glass hits ${this.players[vi].name}: +${2 * theirs}${mine ? `, but a shard cuts back: ${p.name} picks up ${2 * mine}` : ''}.`, 'bad', 'glass', { n: p.name, t: this.players[vi].name, a: 2 * theirs, b: 2 * mine });
        this.ev('glass', { pi, broke: mine > 0 });
        break;
      }
      case 'devil': {
        // a pact: everyone else picks up 3 per card, you pay 1 per card
        for (const i of this.players.map((q, i) => i)) if (i !== pi && !this.players[i].out) this.hit(pi, i, 2 * k);
        p.oweN = (p.oweN || 0) + k;
        this.addLog(`${p.name} plays 666: everyone else picks up ${2 * k}, ${p.name} pays ${k}.`, 'bad', 'devil', { n: p.name, a: 2 * k, b: k });
        this.ev('devil', { pi });
        break;
      }
      case 'gift': {
        // give 2 random cards per Gift to a chosen player (never your last card)
        const tgt = opts.target != null && opts.target !== pi && this.players[opts.target] && !this.players[opts.target].out ? opts.target : this.nextIdx(pi, 1);
        let given = 0;
        for (let r = 0; r < 2 * k && p.hand.length > 1; r++) { const free = p.hand.filter(c => !c.lock); if (!free.length) break; const c = free[Math.floor(Math.random() * free.length)]; p.hand.splice(p.hand.indexOf(c), 1); this.players[tgt].hand.push(c); given++; }
        if (given && hasDeal(p, 'alms')) this.payDebt(pi, -10, 'alms');
        this.addLog(`${p.name} gives ${this.players[tgt].name} ${given} cards.`, 'swap', 'gift', { n: p.name, t: this.players[tgt].name, g: given });
        this.ev('gift', { a: pi, b: tgt, g: given });
        break;
      }
      case 'echo': {
        // repeats the card it was played on: draw cards, skips and reverses
        const pv = prevFace ? prevFace.v : null;
        if (pv && DRAW_VAL[pv]) {
          this.pending += DRAW_VAL[pv] * k * (this.inflate > 0 ? 2 : 1) * this.multNext * this.dmul(pi); this.multNext = 1; this.stackMin = DRAW_VAL[pv]; this.stackFrom = pi;
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
        for (const q of hit) this.hit(pi, this.players.indexOf(q), 2 * k);
        this.addLog(hit.length ? `Interest: ${hit.map(q => q.name).join(', ')} pick up ${2 * k}.` : 'Interest: nobody has 8 cards yet.', 'bad', 'interest', { l: hit.map(q => q.name), a: 2 * k });
        this.ev('interest', { pis: hit.map(q => this.players.indexOf(q)) });
        break;
      }
      case 'sacrifice': {
        // burn 3 random cards per card; everyone else picks up 1
        let burnt = 0;
        for (let r = 0; r < 3 * k && p.hand.length > 1; r++) { p.hand.splice(Math.floor(Math.random() * p.hand.length), 1); burnt++; }
        this.players.forEach((q, i) => { if (i !== pi && !q.out) this.hit(pi, i, k); });
        this.addLog(`${p.name} sacrifices ${burnt} cards. Everyone else picks up ${k}.`, 'bad', 'sacrifice', { n: p.name, b: burnt, a: k });
        this.ev('sacrifice', { pi, b: burnt });
        break;
      }
      case 'wheel': {
        // spins on a random other player: they pick up 4
        const others = this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out);
        const tgt = others[Math.floor(Math.random() * others.length)];
        if (tgt != null) this.hit(pi, tgt, 4 * k);
        this.addLog(`${p.name} spins the wheel: it lands on ${this.players[tgt].name}, +${4 * k}.`, 'bad', 'wheel', { n: p.name, t: this.players[tgt].name, a: 4 * k });
        this.ev('wheel', { pi, t: tgt });
        break;
      }
      case 'bomb': {
        // the next player takes the blast (+3), both of their neighbours catch shrapnel (+1), you included
        const v = this.nextIdx(pi, 1), after = this.nextIdx(v, 1);
        this.hit(pi, v, 3 * k);
        const shr = [...new Set([pi, after])].filter(i => i !== v);
        for (const i of shr) this.hit(pi, i, k);
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
        const keep = p.hand.filter(c => c.lock || c.chain), cnt = p.hand.length - keep.length;
        p.hand = keep; for (let r = 0; r < cnt; r++) p.hand.push(this.newCard());
        this.addLog(`${p.name} rolls the D6: a fresh hand of ${cnt}.`, 'flip', 'd6', { n: p.name, k: cnt });
        this.ev('d6', { pi, k: cnt });
        break;
      }
      case 'pill': {
        // a scratch card: −10 debt, +10 debt, pick up 2, throw away 2, or 10 chips
        for (let r = 0; r < k; r++) {
          const pl = ['wipe', 'fine', 'draw', 'toss', 'chips'][Math.floor(Math.random() * 5)];
          if (pl === 'wipe') this.payDebt(pi, -10, 'pill');
          else if (pl === 'fine') this.payDebt(pi, 10, 'pill');
          else if (pl === 'draw') p.oweN = (p.oweN || 0) + 2;
          else if (pl === 'toss') { for (let q = 0; q < 2 && p.hand.length > 1; q++) { const free = p.hand.filter(c => !c.lock); if (!free.length) break; p.hand.splice(p.hand.indexOf(free[Math.floor(Math.random() * free.length)]), 1); } }
          else if (this.chipsWon) this.chipsWon[pi] += 10;
          this.addLog(`${p.name} scratches a ticket: ${pl}.`, pl === 'fine' || pl === 'draw' ? 'bad' : 'win', 'pill2', { n: p.name, p: pl });
          this.ev('pill', { pi, p: pl });
        }
        break;
      }
      case 'tower': {
        // The Tower: three random players, anyone at all, pick up 2 each
        const alive = this.players.map((q, i) => i).filter(i => !this.players[i].out), hits = [];
        for (let r = 0; r < 3 * k; r++) { const i = alive[Math.floor(Math.random() * alive.length)]; hits.push(i); this.hit(pi, i, 1); }
        this.addLog(`The Tower falls: ${hits.map(i => this.players[i].name).join(', ')} pick up 1.`, 'bad', 'tower', { l: hits.map(i => this.players[i].name) });
        this.ev('tower', { hits });
        break;
      }
      case 'glitch': {
        // a glitched card: acts as a random effect
        const opts2 = ['skip', 'rev', 'skipall', 'd4', 'wd6', 'freeze'];
        const gv = opts2[Math.floor(Math.random() * opts2.length)];
        if (DRAW_VAL[gv]) { this.pending += DRAW_VAL[gv] * k * (this.inflate > 0 ? 2 : 1) * this.multNext * this.dmul(pi); this.multNext = 1; this.stackMin = DRAW_VAL[gv]; this.stackFrom = pi; }
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
        for (let s = 1; s <= Math.min(2, n - 1); s++) { const i = this.nextIdx(pi, s); hits.push(i); this.hit(pi, i, 2 * k); }
        this.addLog(`${p.name} fires Brimstone: ${hits.map(i => this.players[i].name).join(', ')} pick up ${2 * k}.`, 'bad', 'brim', { n: p.name, l: hits.map(i => this.players[i].name), a: 2 * k });
        this.ev('brim', { pi, hits });
        break;
      }
      case 'foot': {
        // Mom's Foot stomps whoever is closest to winning (not you)
        const others = this.players.map((q, i) => i).filter(i => i !== pi && !this.players[i].out);
        const t = others.reduce((a, b) => this.players[b].hand.length < this.players[a].hand.length ? b : a, others[0]);
        if (t != null) this.hit(pi, t, 4 * k);
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
        // a contract: half your hand burns (chained cards stay), and the demon takes notice: +15% to its charge
        const gone = Math.floor(p.hand.filter(c => !c.lock).length / 2);
        for (let r = 0; r < gone; r++) { const free = p.hand.filter(c => !c.lock); p.hand.splice(p.hand.indexOf(free[Math.floor(Math.random() * free.length)]), 1); }
        if (canDark(p)) p.demon = (p.demon || 0) + 15;
        this.addLog(`${p.name} signs a contract: ${gone} cards burn. The demon takes notice.`, 'bad', 'deal2', { n: p.name, g: gone });
        this.ev('deal', { pi, g: gone });
        break;
      }
      case 'swind': {
        // Second Wind: half of the rest of your hand (rounded up) turns into wilds
        const free = p.hand.filter(c => !c.lock && this.f(c).c !== 'w').sort(() => Math.random() - 0.5);
        const n2 = Math.ceil(p.hand.length / 2);
        for (const c of free.slice(0, n2)) { c.L = { c: 'w', v: 'wild' }; c.D = { c: 'w', v: 'wild' }; }
        this.addLog(`${p.name} catches a second wind: ${Math.min(n2, free.length)} cards turn wild.`, 'win', 'swind', { n: p.name, k: Math.min(n2, free.length) });
        this.ev('swind', { pi, k: Math.min(n2, free.length) });
        break;
      }
      case 'sacr': {
        // Sacrifice: the target takes 10 cards, chained for 2 of their turns. Nothing blocks it.
        const tgt = opts.target != null && opts.target !== pi && this.players[opts.target] && !this.players[opts.target].out ? opts.target : this.nextIdx(pi, 1);
        const t = this.players[tgt];
        for (let r = 0; r < 10; r++) { const c = this.next; this.next = this.newCard(); c.chain = 2; t.hand.push(c); }
        this.addLog(`${p.name} offers a sacrifice: ${t.name} takes 10 chained cards.`, 'bad', 'sacr', { n: p.name, t: t.name });
        this.ev('sacr', { pi, t: tgt }); this.ev('draw', { pi: tgt, k: 10 });
        if (this.chipsWon && hasDeal(p, 'blood')) this.chipsWon[pi] += 10;
        break;
      }
      case 'monstro': {
        // Monstro lands on the next player: they pick up as many cards as you hold (max 8)
        const vi = this.nextIdx(pi, 1), amt = Math.min(6, Math.max(1, p.hand.length)) * k;
        this.hit(pi, vi, amt);
        this.addLog(`Monstro lands on ${this.players[vi].name}: +${amt}.`, 'bad', 'monstro', { t: this.players[vi].name, a: amt });
        this.ev('monstro', { pi, t: vi, k: amt });
        break;
      }
      case 'loan': {
        // 20 chips now; after 3 more of your plays, 30 debt
        if (this.chipsWon) this.chipsWon[pi] += 20 * k;
        p.loan = 3; p.loanAmt = 30 * k;
        this.addLog(`${p.name} takes a loan: ${20 * k}¢ now, ${30 * k} debt after 3 plays.`, 'swap', 'loan2', { n: p.name, c: 20 * k, d: 30 * k });
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
    if (face.v === 'roul' && !blank) this.turn = this.roulette;
    else if (steps >= 0) this.turn = steps === 0 ? pi : this.nextIdx(pi, steps);
    if (steps === 0 && this.turn === pi) { this.againN = (this.againN || 0) + 1; this.drewBy = -1; this.addLog(`${p.name} goes again.`, 'stk', 'again', { n: p.name }); this.ev('again', { pi }); }
    this.applyShield();
    this.checkFlipBack();
    if (this.inflate > 0) this.inflate--;
    if (this.lock > 0) this.lock--;
    if (this.rules.potato !== false && this.winner === null && this.potato && this.side === 'D') { // the dynamite only burns at night
      const pt = this.potato;
      if (pt.fuse > 0 && --pt.fuse === 0) {
        const v = this.turn; this.hit(pi, v, 3);
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
    if (this.rules.chaos && this.winner === null && this.side === 'L' && --this.chaosIn <= 0) this.rollChaos(); // the slot machine only runs by day
    if (this.pending > 0 && DRAW_VAL[face.v] && !blank) {
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
  // Every draw is one card by hand. Owed cards (a lost duel, chaos tax) can be paid any time;
  // a debt (a taken stack, roulette, draw-color) has to be paid before play moves on.
  draw(pi) {
    const p = this.players[pi];
    if (!p || p.out || this.winner !== null) return null;
    if (this.owes(pi)) {
      let got;
      if (p.owed && p.owed.length) { const c = p.owed.shift(); p.hand.push(c); got = [c]; this.ev('draw', { pi, k: 1 }); }
      else { got = this.give(pi, 1); p.oweN--; }
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
      const sf = this.stackFrom;
      if (this.takeStack && this.takeStack(pi, sf)) return true; // the guardian sent it back
      if (this.hasPerk(pi, 'pad') && this.padUsed && !this.padUsed[pi]) { this.padUsed[pi] = true; this.pending = Math.ceil(this.pending / 2); this.addLog(`${p.name}'s padding takes half the hit: +${this.pending}.`, 'win', 'pad', { n: p.name, k: this.pending }); this.ev('pad', { pi, k: this.pending }); }
      this.debt = { pi, n: this.pending, got: 0, kind: 'stack' };
      this.afterHit(sf, pi, this.pending);
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
    this.checkFlipBack(); this.lastCallCheck();
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
  // ---- Chaos events ----
  rollChaos() {
    this.chaosIn = 8 + Math.floor(Math.random() * 5);
    const act = this.players.map((p, i) => i).filter(i => !this.players[i].out);
    const pool = ['inflation', 'storm', 'lock', 'bleed', 'jackpot', 'mirrorworld'];
    if (!this.rules.flip) pool.splice(pool.indexOf('storm'), 1);
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
    p.out = true; p.left = why !== 'broke'; p.shield = false;
    if (why !== 'broke') this.addLog(`${p.name} ${why === 'left' ? 'left the match' : 'was away too long and is out of the match'}. Everyone else plays on.`, 'bad', 'left', { n: p.name, aw: why === 'left' ? 0 : 1 });
    if (this.offer && this.offer.pi === pi) this.offer = null;
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
  // Russian roulette: facing a stack (+8 by day, +4 at night), aim the revolver at a rival instead of answering it.
  // Click: the whole stack goes to them and play moves on. Bang: you take it doubled (tripled with the Cursed Drum).
  canGamble(pi) { return this.rules.gamble !== false && pi === this.turn && this.pending >= (this.side === 'D' ? 4 : 8) && !this.debt && this.roulette === null && !this.owes(pi) && this.winner === null; }
  gamble(pi, target) {
    if (!this.canGamble(pi)) return null;
    const p = this.players[pi], k = this.pending;
    let tg = Number.isInteger(target) ? target : -1;
    if (tg === pi || !this.players[tg] || this.players[tg].out) tg = this.nextIdx(pi, 1);
    const t = this.players[tg];
    this.seq++;
    const drum = hasDeal(p, 'drum');
    if (Math.random() < (drum || this.hasPerk(pi, 'luck') ? 2 / 3 : 0.5)) {
      this.pending = 0; this.stackMin = 0; this.stackFrom = -1; this.drewBy = -1;
      const got = this.hit(pi, tg, k);
      this.addLog(`${p.name} aims at ${t.name}… click. ${t.name} takes the +${got} stack.`, 'win', 'gambleWin', { n: p.name, t: t.name, k: got });
      this.ev('gamble', { pi, t: tg, ok: 1, k: got });
      this.turn = this.nextIdx(pi, 1); this.applyShield(); this.checkFlipBack();
      return true;
    }
    this.pending *= drum ? 3 : 2;
    this.addLog(`${p.name} aims at ${t.name}… BANG. ${p.name} takes the stack doubled: +${this.pending}.`, 'bad', 'gambleLose', { n: p.name, t: t.name, k: this.pending });
    this.ev('gamble', { pi, t: tg, ok: 0, k: this.pending });
    this.draw(pi);
    return false;
  }
}

// ===== BOT BRAIN =====
const Bot = {
  // who to aim the revolver at: whoever is closest to going out
  gambleTarget(G, pi) { let best = -1; G.players.forEach((q, i) => { if (i !== pi && !q.out && (best < 0 || q.hand.length < G.players[best].hand.length)) best = i; }); return best; },
  // deals: light ones are always taken (best for the moment), dark ones while the debt is still manageable
  // bots and the Dark shop's items: simple habits
  item(g, pi) {
    const p = g.players[pi], has = id => g.canUseItem(pi, id);
    if (has('rent')) return 'rent';
    if (has('oven')) return 'oven';
    const big = p.hand.length > 12;
    if (big && has('shell')) return 'shell';
    if (big && g.side === 'D' && has('veil')) return 'veil';
    if (big && g.side === 'L' && has('dawn')) return 'dawn';
    if (has('eclipse') && Math.random() < 0.1) return 'eclipse';
    return null;
  },
  deal(g, pi) {
    const o = g.offer, p = g.players[pi]; if (!o || o.pi !== pi) return null;
    const LP = ['penance', 'rosary', 'grace', 'guardian', 'halo', 'wind', 'clean', 'candle', 'confess', 'alms'], DP = ['bail', 'double', 'blood', 'mark', 'drum', 'devour', 'chains', 'usury', 'puppet', 'sharp'];
    const pref = o.kind === 'light' ? LP : o.kind === 'dark' ? DP : LP.concat(DP);
    const best = o.opts.slice().sort((a, b) => pref.indexOf(a) - pref.indexOf(b))[0];
    if (o.kind === 'dark') {
      const room = p.limit ? p.debt / p.limit : 0;
      if (best !== 'bail' && (room > 0.65 || Math.random() < 0.35)) return { id: null };
    }
    const tgt = g.players.map((q, i) => i).filter(i => i !== pi && !g.players[i].out).sort((a, b) => g.players[a].hand.length - g.players[b].hand.length)[0];
    return { id: best, target: tgt };
  },
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
        if (f.v === 'swind') s += p.hand.length >= 6 ? 14 : -6;
        if (f.v === 'sacr') s += 16;
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
    return {
      cardId: best.id, extra: extra.map(c => c.id),
      color: bf.c === 'w' ? this.bestColor(g, rest, g.side) : null,
      flipColor: (bf.v === 'flip' || bf.v === 'dflip') ? this.bestColor(g, rest, other(g.side)) : null,
      target: bf.v === 'duel' || bf.v === 'gift' || bf.v === 'sacr' ? minOther.i : null
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
      (p.out ? 1 : 0) | (p.elim ? 2 : 0) | (p.human ? 16 : 0) | (p.shield ? 32 : 0) | (p.left ? 64 : 0) | (p.marked ? 128 : 0) | (p.revenge ? 256 : 0), (p.oweN || 0) + ((p.owed && p.owed.length) || 0), p.loan || 0,
      p.hand.map((c, k) => (c.lock || c.chain ? [k, c.chain || 0, c.lock ? 1 : 0] : null)).filter(Boolean),
      [Math.round((p.angel || 0) * 10) / 10, p.demon || 0, (p.deals || []).join('+'), (p.fallen ? 4 : 0) | (p.broke ? 8 : 0) | (p.skipNext ? 16 : 0) | (p.signedNow ? 32 : 0), p.debt || 0, p.limit || 0, p.markT ?? -1, Object.keys(p.used || {}).join(',')],
      p.hand.map(c => (c.uniq ? 1 : 0)).join(''),
      [(p.inv || []).join(','), Object.entries(p.fx || {}).map(([k, v]) => v === true ? k : k + ':' + v).join(','), p.buff || 0],
      (viewer < 0 || i === viewer) ? p.hand.map(c => c.id) : null]),
    of: g.offer ? [g.offer.pi, g.offer.kind, g.offer.opts] : null,
    hz: g.horse && g.horse.left > 0 ? [g.horse.k, g.horse.v, g.horse.left, (g.horse.curses || []).join(',')] : null,
    nf: viewer >= 0 && g.players[viewer] && hasDeal(g.players[viewer], 'sharp') ? cardCode(g.next) : null,
    t: cardCode(g.top), ti: g.top.id, cx: [g.chaosIn || 0, g.inflate || 0, g.lock || 0, g.multNext || 1, g.maze || 0, g.potato && g.potato.fuse > 0 ? (g.potato.fuse <= 2 ? 2 : 1) : 0, g.turnNo || 0], db: g.debt ? [g.debt.pi, g.debt.n || 0, g.debt.until || '', g.debt.got || 0, g.debt.kind] : null, pl: (g.pile || []).slice(-5), pn: g.pileN || 1, nb: ALPHA[faceIdx(ob, g.next[ob])], c: g.color, d: g.dir, u: g.turn, k: g.pending, m: g.stackMin, sf: g.stackFrom, dr: [g.drawRunPi == null ? -1 : g.drawRunPi, g.drawRun || 0], fb: g.flipBack ? [g.flipBack.pi, g.flipBack.seq] : null,
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
      out: !!(a[4] & 1), elim: !!(a[4] & 2), human: !!(a[4] & 16), shield: !!(a[4] & 32), left: !!(a[4] & 64), marked: !!(a[4] & 128), revenge: !!(a[4] & 256), oweN: a[5] || 0, owed: [], loan: a[6] || 0,
      ...(() => { const d = Array.isArray(a[8]) ? a[8] : []; return { angel: d[0] || 0, demon: d[1] || 0, deals: String(d[2] || '').split('+').filter(Boolean), fallen: !!(d[3] & 4), broke: !!(d[3] & 8), skipNext: !!(d[3] & 16), signedNow: !!(d[3] & 32), debt: d[4] || 0, limit: d[5] || 0, markT: d[6] >= 0 ? d[6] : null, used: Object.fromEntries(String(d[7] || '').split(',').filter(Boolean).map(k => [k, true])) }; })(),
      ...(() => { const d = Array.isArray(a[10]) ? a[10] : []; return { inv: String(d[0] || '').split(',').filter(Boolean), fx: Object.fromEntries(String(d[1] || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, v === undefined ? true : +v]; })), buff: d[2] || 0 }; })() };
  });
  // chains and unique cards travel by position in the hand
  st.p.forEach((a, i) => {
    const h = g.players[i].hand;
    if (Array.isArray(a[7])) for (const [k, ch, lk] of a[7]) if (h[k]) { h[k].chain = ch; h[k].lock = !!lk; }
    const u = String(a[9] || ''); for (let k = 0; k < u.length; k++) if (u[k] === '1' && h[k]) h[k].uniq = true;
    if (Array.isArray(a[11])) a[11].forEach((w, k) => { if (h[k]) h[k].wid = w; });
  });
  g.horse = Array.isArray(st.hz) ? { k: st.hz[0], v: st.hz[1], left: st.hz[2], curses: String(st.hz[3] || '').split(',').filter(Boolean) } : null;
  g.offer = Array.isArray(st.of) ? { pi: st.of[0], kind: st.of[1], opts: st.of[2] || [] } : null;
  g.top = codeCard(st.t); g.top.wid = st.ti; if (Array.isArray(st.cx)) { g.chaosIn = st.cx[0]; g.inflate = st.cx[1]; g.lock = st.cx[2]; g.multNext = st.cx[3] || 1; g.maze = st.cx[4] || 0; g.potatoState = st.cx[5] || 0; g.turnNo = st.cx[6] || 0; } g.debt = Array.isArray(st.db) ? { pi: st.db[0], n: st.db[1], until: st.db[2] || null, got: st.db[3], kind: st.db[4] } : null; g.pile = Array.isArray(st.pl) ? st.pl.map(String) : []; g.pileN = st.pn || 1;
  g.next = { id: 0, hidden: true }; g.next[ob] = Object.assign({}, FACES[ob][ALPHA.indexOf(st.nb)] || { c: 'w', v: 'wild' });
  if (typeof st.nf === 'string' && st.nf.length === 2) g.next = codeCard(st.nf);
  g.color = st.c; g.dir = st.d; g.turn = st.u; g.pending = st.k; g.stackMin = st.m; g.stackFrom = typeof st.sf === 'number' ? st.sf : -1; if (Array.isArray(st.dr)) { g.drawRunPi = st.dr[0]; g.drawRun = st.dr[1]; } g.flipBack = Array.isArray(st.fb) ? { pi: st.fb[0], seq: st.fb[1] } : null;
  g.roulette = st.o < 0 ? null : st.o; g.drewBy = st.w; g.winner = st.x < 0 ? null : st.x; g.seq = st.s;
  g.log = (st.l || []).map(([msg, cls, k, a]) => ({ msg: String(msg), cls: String(cls || ''), k: typeof k === 'string' ? k : null, a: a && typeof a === 'object' ? a : null }));
  g.events = Array.isArray(st.ev) ? st.ev : []; g.evSeq = st.es || 0;
  return g;
}

// every handover of the turn ticks the Last Call clock
Object.defineProperty(Game.prototype, 'turn', {
  get() { return this._turn; },
  set(v) { if (v !== this._turn) { if (this._turn !== undefined) this.turnNo = (this.turnNo || 0) + 1; this._turn = v; } },
  configurable: true
});
if (typeof module !== 'undefined') module.exports = { comboOf, isJoker, COMBOS, COMBO_RANK, Game, Bot, serialize, deserialize, cardCode, faceName, FACES, comboOf, PRESETS, RULE_ALL, debtValue, TOKENS, PRICES, DEBT_LIMITS, EXTRA_CARDS, LIGHT_DEALS, DARK_DEALS, DEBT_TURN, hasDeal, nLight, nDark, canLight, canDark, offerOpen, ITEMS, ITEM_PRICE, ITEM_AUTO, DEAL_MAX, HORSEMEN, CURSES, HORSE_TURNS, HORSE_AT, WAR_SECS };
