// ================= EVENTS → FEEDBACK =================
const TOAST_PRI = { bad: 8, lastcall: 10, gamble: 10, potato: 9, deal: 9, maze: 9, d6: 7, pill: 7, bomb: 8, gift: 6, echo: 6, fire: 8, mult: 7, glass: 6, lucky: 5, loan: 5, multi: 5, win: 9, flip: 8, took: 6, mirror: 6, shield: 6, stack: 5, skipall: 4, rotate: 4, swap: 4, roulette: 4, reverse: 2 };
function seatRect(pi) { return pi === ME ? rectOf($('hand')) : rectOf($('opp' + pi)); }
function nm(pi) { return pi === ME ? (LANG === 'ru' ? 'Вы' : 'You') : (G.players[pi] ? G.players[pi].name : ''); }
function processEvents() {
  const evs = (G.events || []).filter(e => e.n > lastEvN);
  if (!evs.length) return;
  lastEvN = evs[evs.length - 1].n;
  const recent = evs.slice(-8);
  const cw = rectOf($('discard'));
  let best = null; const bump = (pri, text) => { if (!best || pri > best.pri) best = { pri, text }; };
  const lastPlay = [...recent].reverse().find(e => e.type === 'play');
  for (const e of recent) {
    switch (e.type) {
      case 'play': {
        SFX.play('play', (e.k || 1) + Math.floor((G.pending || 0) / 4));
        { const r = rectOf($('discard')), f = codeCard(e.code)[e.side]; const col = CVAR[f.c] ? getComputedStyle(document.documentElement).getPropertyValue('--' + f.c).trim() : '#fff';
          setTimeout(() => JUICE.burst(r.left + r.width / 2, r.top + r.height / 2, 14 + (e.k || 1) * 10, [col || '#fff', '#fff', '#141414'], 0.8 + (e.k || 1) * 0.2), 190);
          if ((e.k || 1) > 1) setTimeout(() => JUICE.shake(e.k), 200);
          if ((e.k || 1) >= 3) { JUICE.ignite(1); bump(TOAST_PRI.fire, t('tFire')); } }
        if (e !== lastPlay) break;
        const k = Math.max(1, Math.min(e.k || 1, 5));
        const els = [...document.querySelectorAll('#discard .card')].slice(-k);
        const codes = (G.pile || []).slice(-k);
        const from = e.pi === ME && lastPlayRect ? lastPlayRect : centerRect(seatRect(e.pi) || cw, cw.width * 0.6, cw.height * 0.6);
        els.forEach(el => el.style.opacity = '0');
        codes.forEach((code, j) => {
          const card = codeCard(code), el = els[j], w = String(code).length > 2 ? String(code).slice(3) : null;
          fly(faceHTML(card[e.side], e.side, '', '', w != null ? w : null), from, el ? rectOf(el) : cw, { delay: j * 60, onDone: () => {
            if (!el) return; el.style.opacity = ''; el.classList.remove('land'); void el.offsetWidth; el.classList.add('land');
            if (j) SFX.play('play');
          } });
        });
        lastPlayRect = null;
        break;
      }
      case 'draw': {
        SFX.play('draw', e.k);
        const p = G.players[e.pi]; if (!p) break;
        const to = seatRect(e.pi), from = rectOf($('drawpile'));
        if (!to || !from) break;
        const ob = otherSide(), tail = p.hand.slice(-Math.min(e.k, 5));
        tail.forEach((c, k) => fly(faceHTML(c[ob] || { c: 'w', v: 'wild' }, ob), from, centerRect(to, from.width * 0.5, from.height * 0.5), { delay: k * 18 }));
        floatText(e.pi, '+' + e.k);
        break;
      }
      case 'took': SFX.play('took'); if (e.k >= 10) JUICE.shake(4); if (e.k >= 10) bump(TOAST_PRI.took, `+${e.k}`); break;
      case 'stack': SFX.play('stack', e.k); JUICE.shake(Math.min(4, 1 + e.k / 8)); bump(TOAST_PRI.stack, t('tStack', e.k)); if (e.k >= 15) { JUICE.ignite(Math.min(1, e.k / 30)); bump(TOAST_PRI.fire, t('tFire')); } break;
      case 'mult': SFX.play('mult', e.x); JUICE.shake(3); if (e.k) { JUICE.ignite(1); bump(TOAST_PRI.mult, `${t('tMult', e.x)} → +${e.k}`); } else bump(TOAST_PRI.mult, t('tArm', e.x)); break;
      case 'lucky': SFX.play(e.h || e.w ? 'lucky' : 'bad'); if (e.h || e.w) { const r = seatRect(e.pi) || cw; JUICE.burst(r.left + r.width / 2, r.top + r.height / 2, 60, ['#22c55e', '#a3e635', '#ffd23f', '#fff'], 1.4); } bump(TOAST_PRI.lucky, e.w ? t('tLuckyDebt', e.w) : e.h ? t('tLucky') : t('tMiss')); break;
      case 'glass': SFX.play('glass'); JUICE.burst(cw.left + cw.width / 2, cw.top + cw.height / 2, 70, ['#e0f2fe', '#7dd3fc', '#ffffff', '#94a3b8'], 1.6); JUICE.shake(2); bump(TOAST_PRI.glass, e.broke ? t('tGlass') : t('tGlassHit')); break;
      case 'loan': SFX.play('coin'); floatText(e.pi, t('tLoan')); break;
      case 'gift': SFX.play('swap'); floatText(e.b, '+' + e.g); bump(TOAST_PRI.gift, t('tGift', nm(e.b))); break;
      case 'echo': SFX.play(e.ok ? 'mult' : 'bad', 2); bump(TOAST_PRI.echo, e.ok ? t('tEcho') : t('tEchoNone')); break;
      case 'bomb': SFX.play('devil'); JUICE.shake(6); { const r = seatRect(e.v) || cw; JUICE.burst(r.left + r.width / 2, r.top + r.height / 2, 90, ['#fff', '#ffd23f', '#ff7814', '#e63c0a', '#222'], 2); } bump(TOAST_PRI.bomb, t('tBomb')); break;
      case 'loanDue': SFX.play('bad'); JUICE.shake(2); floatText(e.pi, t('tDue')); bump(TOAST_PRI.loan, `${nm(e.pi)}: ${t('tDue')}`); break;
      case 'skip': SFX.play('skip'); floatText(e.pi, t('tSkipped')); break;
      case 'skipall': SFX.play('skip'); bump(TOAST_PRI.skipall, t('tSkipAll')); break;
      case 'reverse': SFX.play('skip'); bump(TOAST_PRI.reverse, t('tReverse')); break;
      case 'swap': SFX.play('swap'); bump(TOAST_PRI.swap, t('tSwap')); break;
      case 'rotate': SFX.play('swap'); bump(TOAST_PRI.rotate, t('tRotate')); break;
      case 'roulette': SFX.play('stack', 3); bump(TOAST_PRI.roulette, t('tRoulette')); break;
      case 'multi': bump(TOAST_PRI.multi, t('tMulti', e.k)); break;
      case 'combo': showCombo(e); break;
      case 'gamble': SFX.play('spin'); setTimeout(() => { SFX.play(e.ok ? 'click2' : 'bang'); if (!e.ok) { JUICE.shake(8); JUICE.ignite(1); } if (e.ok && e.t !== undefined) floatText(e.t, '+' + e.k); else if (!e.ok) floatText(e.pi, '+' + e.k); }, 380); setTimeout(() => bump(TOAST_PRI.gamble, e.ok ? t('tShot', G.players[e.t] ? G.players[e.t].name : '', e.k) : t('tBang', e.k)), 380); break;
      case 'lastcall': SFX.play('lastcall'); JUICE.shake(4); bump(TOAST_PRI.lastcall, t('tLastCall')); break;
      case 'bad': {
        const r = seatRect(e.pi) || cw;
        if (e.v === 'fuse') { SFX.play('devil'); JUICE.shake(7); JUICE.burst(r.left + r.width / 2, r.top + r.height / 2, 80, ['#fff', '#ffd23f', '#ff7814', '#3a3632'], 2); }
        else SFX.play('bad');
        floatText(e.pi, '+' + e.k); bump(TOAST_PRI.bad, t('tBad_' + e.v, nm(e.pi), e.k, e.full)); break;
      }
      case 'potato': SFX.play('devil'); JUICE.shake(6); { const r = seatRect(e.pi) || cw; JUICE.burst(r.left + r.width / 2, r.top + r.height / 2, 70, ['#c9a227', '#7a5230', '#ff7814', '#fff'], 1.8); } floatText(e.pi, '+3'); bump(TOAST_PRI.potato, t('tPotato', nm(e.pi))); break;
      case 'potatoLit': SFX.play('tick'); break;
      case 'd6': SFX.play('shuffle'); floatText(e.pi, '', ICON.d6); bump(TOAST_PRI.d6, t('tD6')); break;
      case 'pill': SFX.play(e.p === 'fine' || e.p === 'draw' ? 'bad' : 'lucky'); bump(TOAST_PRI.pill, t('pill_' + e.p)); break;
      case 'maze': SFX.play('chaos'); bump(TOAST_PRI.maze, t('tMaze')); break;
      case 'deal': SFX.play('devil'); JUICE.ignite(1); bump(TOAST_PRI.deal, t('tDeal')); break;
      case 'win': SFX.play('win'); JUICE.burst(innerWidth / 2, innerHeight * 0.4, 160, ['#ff2d55', '#ffd23f', '#22d3ee', '#a3e635', '#fff'], 2); bump(TOAST_PRI.win, e.pi === ME ? t('youWin') : t('wins', nm(e.pi))); break;
      case 'mirror': SFX.play('swap'); bump(TOAST_PRI.mirror, t('tMirror', nm(e.b))); break;
      case 'shieldup': SFX.play('click'); floatText(e.pi, t('tShieldUp')); break;
      case 'shield': SFX.play('swap'); bump(TOAST_PRI.shield, t('tShield', e.k)); break;
      case 'chaos': JUICE.slot(e.e); break;
      case 'colgive': SFX.play('bad'); floatText(e.t, '+2'); bump(5, t('tColGive', nm(e.t))); break;
      case 'pad': case 'halo': SFX.play('click'); floatText(e.pi, '½'); break;
      case 'debt': if (e.k) floatText(e.pi, (e.k > 0 ? '+' : '−') + Math.abs(e.k) + '$'); break;
      case 'offer': JUICE.visit(e.kind); if (e.pi !== ME) bump(4, e.kind === 'dark' ? t('tDemonCame', nm(e.pi)) : t('tAngelCame', nm(e.pi))); break;
      case 'overLimit': if (e.pi === ME) bump(7, t('tOverLimit')); break;
      case 'item': if (e.pi !== ME) floatText(e.pi, '', ITEM_ICON[e.id]); bump(6, t('itemUsed', nm(e.pi), t('item_' + e.id))); break;
      case 'oven': SFX.play('flip'); JUICE.shake(3); break;
      case 'rent': if (e.pi === ME) { SFX.play('coin'); floatText(e.pi, '+3¢'); } break;
      case 'eclipseMiss': if (e.pi === ME) floatText(e.pi, '', ITEM_ICON.eclipse + ' +' + pct(e.k)); break;
      case 'again': if (e.pi === ME) { SFX.play('turn'); bump(7, t('tAgain')); } break;
      case 'horse': SFX.play('lastcall'); JUICE.shake(8); setTimeout(() => horsePop(e.k, e.v), 30); break;
      case 'horseEnd': SFX.play('lucky'); bump(8, t('horseGone', t('horse_' + e.k))); break;
      case 'warTime': SFX.play('bad'); JUICE.shake(4); floatText(e.pi, '+2'); break;
      case 'arms': case 'rot': SFX.play('swap'); break;
      case 'tithe': SFX.play('swap'); floatText(e.t, '+1'); break;
      case 'dealTaken': SFX.play(e.kind === 'dark' ? 'devil' : 'win'); bump(6, t('tDealTaken', nm(e.pi), t('deal_' + e.d))); break;
      case 'fall': SFX.play('devil'); JUICE.shake(6); bump(8, t('tFall', nm(e.pi))); break;
      case 'guardian': SFX.play('swap'); bump(6, t('tGuardian', nm(e.pi))); break;
      case 'veilBurn': SFX.play('bad'); floatText(e.t, '', '+' + e.k); break;
      case 'fangs': floatText(e.pi, '', '×2'); break;
      case 'djoker': SFX.play('devil'); JUICE.shake(6); bump(8, t('tDjoker', nm(e.pi))); break;
      case 'cross': SFX.play('devil'); bump(8, t('tCross', nm(e.pi))); break;
      case 'sacr': SFX.play('bang'); JUICE.shake(8); bump(9, t('tSacr', nm(e.t))); break;
      case 'swind': SFX.play('win'); bump(6, t('tSwind', nm(e.pi))); break;
      case 'broke': SFX.play('ko'); bump(9, t('tBroke', nm(e.pi))); break;
      case 'chained': if (e.pi === ME) floatText(e.pi, t('tChained', e.k)); break;
      case 'puppet': SFX.play('chaos'); bump(5, t('tPuppet', nm(e.t))); break;
      case 'demonCharge': if (e.pi === ME) floatText(e.pi, '', DEAL_ICON.demon + ' ' + pct(e.k)); break;
      case 'flip':
        SFX.play('flip'); JUICE.shake(2); bump(TOAST_PRI.flip, e.side === 'D' ? t('tDark') : t('tLight'));
        document.querySelectorAll('#hand .card').forEach(el => { el.classList.remove('new'); el.classList.add('flipin'); });
        break;
    }
  }
  if (best) toast(best.text);
}
window.addEventListener('resize', () => render());

