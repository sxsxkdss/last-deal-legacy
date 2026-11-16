// ===== TEXT: English + Russian. The House talks: short, dry, a little threatening. =====
const LANGS = { en: 'English', ru: 'Русский' };
let LANG = (() => {
  try { const s = JSON.parse(localStorage.getItem('unoFlipNoMercy') || 'null'); if (s && LANGS[s.lang]) return s.lang; } catch (e) {}
  return /^ru\b/i.test(navigator.language || '') ? 'ru' : 'en';
})();
// Russian plural: 1 карта, 2 карты, 5 карт
function plural(n, one, few, many) { if (LANG !== 'ru') return n === 1 ? one : few; const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return many; if (b > 1 && b < 5) return few; if (b === 1) return one; return many; }
const cardsW = n => LANG === 'ru' ? plural(n, 'карта', 'карты', 'карт') : (n === 1 ? 'card' : 'cards');
const cardsAcc = n => LANG === 'ru' ? plural(n, 'карту', 'карты', 'карт') : (n === 1 ? 'card' : 'cards');

// ---------- card names ----------
const NAMES = {
  en: {
    colors: { r: 'Red', y: 'Yellow', g: 'Green', b: 'Blue', p: 'Pink', t: 'Teal', o: 'Orange', v: 'Purple', w: 'Wild', x: 'Dead' },
    values: {
      skip: 'Skip', rev: 'Reverse', d1: 'Draw 1', d2: 'Draw 2', d4: 'Draw 4', d5: 'Draw 5', flip: 'Shift', dflip: 'Eclipse', discall: 'Discard All', skipall: 'Skip Everyone',
      mirror: 'Mirror', shield: 'Vest', wild: 'Wild', wd2: 'Wild +2', wd4: 'Wild +4', wrd4: 'Wild Reverse +4', wd6: 'Wild +6', wd10: 'Wild +10', wd15: 'Wild +15', wrd8: 'Wild Reverse +8',
      wdc: 'Draw Till Color', roul: 'Color Roulette', mul2: 'Double Down', mul3: 'Triple Down', lucky: 'Horseshoe', glass: 'Shot Glass',
      spin: 'Jackpot', loan: 'Loan', gift: 'Tip', echo: 'Encore', freeze: 'Handcuffs', bomb: 'Shotgun', d6: 'Redeal',
      pill: 'Scratch Card', maze: 'Spinner', deal: 'Contract',
      swind: 'Second Wind', sacr: 'Sacrifice', lead: 'Lead', leech: 'Leech', fuse: 'Lit Fuse'
    }
  },
  ru: {
    colors: { r: 'Красный', y: 'Жёлтый', g: 'Зелёный', b: 'Синий', p: 'Розовый', t: 'Бирюзовый', o: 'Оранжевый', v: 'Фиолетовый', w: 'Джокер', x: 'Мёртвая' },
    values: {
      skip: 'Пропуск', rev: 'Разворот', d1: 'Возьми 1', d2: 'Возьми 2', d4: 'Возьми 4', d5: 'Возьми 5', flip: 'Смена', dflip: 'Затмение', discall: 'Сброс цвета', skipall: 'Пропуск всех',
      mirror: 'Зеркало', shield: 'Бронежилет', wild: 'Джокер', wd2: 'Джокер +2', wd4: 'Джокер +4', wrd4: 'Джокер разворот +4', wd6: 'Джокер +6', wd10: 'Джокер +10', wd15: 'Джокер +15', wrd8: 'Джокер разворот +8',
      wdc: 'Тяни до цвета', roul: 'Цветная рулетка', mul2: 'Дабл', mul3: 'Трипл', lucky: 'Подкова', glass: 'Рюмка',
      spin: 'Джекпот', loan: 'Займ', gift: 'Чаевые', echo: 'Бис', freeze: 'Наручники', bomb: 'Обрез', d6: 'Пересдача',
      pill: 'Лотерейка', maze: 'Вертушка', deal: 'Контракт',
      swind: 'Второе дыхание', sacr: 'Жертва', lead: 'Свинец', leech: 'Пиявка', fuse: 'Фитиль'
    }
  }
};
const colorName = c => NAMES[LANG].colors[c] || c;
const cardName = f => !f ? '' : ((f.c === 'w' || f.c === 'x') ? NAMES[LANG].values[f.v] : colorName(f.c) + ' ' + (NAMES[LANG].values[f.v] || f.v));
// short labels printed on the cards themselves
const CARD_TXT = {
  en: { flip: 'shift', dflip: 'eclipse', discall: 'discard', skipall: 'everyone', mirror: 'mirror', shield: 'vest', wild: 'wild', reverse: 'reverse', wdc: 'till color', roul: 'roulette',
    mult: 'double', mult3: 'triple', lucky: 'horseshoe', glass: 'shot', spin: 'jackpot', loan: 'loan', gift: 'tip', echo: 'encore', freeze: 'cuffs',
    bomb: 'shotgun', d6: 'redeal', pill: 'scratch',
    maze: 'spinner', deal: 'contract', swind: 'second wind', sacr: 'sacrifice', lead: 'lead', leech: 'leech', fuse: 'fuse' },
  ru: { flip: 'смена', dflip: 'затмение', discall: 'сброс', skipall: 'всех', mirror: 'зеркало', shield: 'жилет', wild: 'джокер', reverse: 'разворот', wdc: 'до цвета', roul: 'рулетка',
    mult: 'дабл', mult3: 'трипл', lucky: 'подкова', glass: 'рюмка', spin: 'джекпот', loan: 'займ', gift: 'чаевые', echo: 'бис', freeze: 'наручники',
    bomb: 'обрез', d6: 'пересдача', pill: 'лотерейка',
    maze: 'вертушка', deal: 'контракт', swind: 'второе дыхание', sacr: 'жертва', lead: 'свинец', leech: 'пиявка', fuse: 'фитиль' }
};
