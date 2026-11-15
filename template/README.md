# Asset pack template

The game can swap in your own **card sprites**, **fonts**, **sounds** and **background** without touching any code.
Put files in the `assets/` folder next to `server.js`, push, `git pull` on the server, refresh the page.
No restart needed: the server rescans `assets/` on every page load.

Anything you don't provide keeps the built-in look and the built-in synthesized sounds, so you can replace one card or one sound at a time.

This `template/` folder is **not** read by the game. It holds starting points: copy a file into `assets/`, edit it there.

```
assets/
  cards/      L-r-7.png, D-w-bhole.png ...   card faces
  sounds/     play.ogg, play-2.ogg, win.mp3  sound effects (+ music.ogg)
  font/       ui.woff2, display.ttf          fonts
  bg.png                                     background (replaces the swirl)
  pack.json                                  options (see pack.example.json)
```

## Cards

`template/cards/` has **every card in the game** exported at 256×376 px in the current look, plus empty frames in `template/cards/_blank/`.

- **Name:** `<side>-<color>-<value>.png`
  - side: `L` light, `D` dark
  - color: light `r y g b`, dark `p t o v`, wild cards `w`
  - value: see the table below
- **Size:** any, but keep the ratio about **1 : 1.47** (256×376, 128×188, 64×94, or 20×30 / 40×59 for pixel art). The image is stretched to the card.
- **Format:** PNG, WebP, GIF, JPG or SVG. Transparent corners are fine.
- Pixel art: set `"pixelated": true` in `pack.json` so it scales with hard edges.

| value | card | value | card |
|---|---|---|---|
| `0`–`9` | numbers | `wild` | Wild |
| `skip` | Skip | `wd2` `wd4` `wd6` `wd10` `wd15` | Wild Draw 2 / 4 / 6 / 10 / 15 |
| `rev` | Reverse | `wrd4` `wrd8` | Wild Reverse Draw 4 / 8 |
| `skipall` | Skip Everyone | `wdc` | Wild Draw Color |
| `d1` `d2` `d4` `d5` | Draw 1 / 2 / 4 / 5 | `roul` | Color Roulette |
| `flip` | Flip | `dflip` | Eclipse (Затмение) |
| `discall` | Discard All | `bhole` | The Pot (Общак) |
| `mirror` | Mirror | `shield` | Vest (Бронежилет) |
| `mul2` `mul3` | Double / Triple Down (Дабл / Трипл) | `lucky` | Horseshoe (Подкова) |
| `glass` | Shot Glass (Рюмка) | `spin` | Jackpot (Джекпот) |
| `loan` | Loan (Займ) | `gift` | Tip (Чаевые) |
| `echo` | Encore (Бис) | `freeze` | Handcuffs (Наручники) |
| `interest` | Interest (Проценты) | `bomb` | Shotgun (Дробовик) |
| `d6` | Redeal (Пересдача) | `pill` | Scratch Card (Лотерейка) |
| `foot` | Collector (Коллектор) | `maze` | Spinner (Вертушка) |
| `deal` | Contract (Контракт) | `monstro` | All-In (Ва-банк) |

File names keep the internal value (`L-r-gift.png` is the Tip), so packs you already made keep working.

Which colors and sides each value exists on: just look at the file names in `template/cards/`.

## Sounds

`template/sounds/` has every built-in sound rendered to WAV, so you can hear what each one is for (and use them as a base).

- **Name:** `<event>.ogg` (or `.mp3`, `.wav`, `.m4a`). OGG or MP3 keeps the size down.
- **Variants:** `play-2.ogg`, `play-3.ogg` … one is picked at random each time.
- **Music:** `music.mp3` (or `.ogg`) loops in the background after the first click and replaces the default YouTube track.
- `play`, `stack` and `draw` are pitched up on combos and bigger stacks; turn off with `"pitchCombos": false`.

| event | when |
|---|---|
| `play` | a card hits the pile |
| `draw` | a card is drawn |
| `flip` | the table flips sides |
| `shuffle` | Black Hole deals hands out |
| `stack` | a draw stack grows |
| `took` | someone takes a stack |
| `skip` | Skip / Reverse / Skip Everyone |
| `swap` | hands swap / rotate, Mirror, Shield |
| `turn` | your turn starts |
| `ko` | a player is knocked out |
| `win` | the game is won |
| `bad` | penalty, caught without the call, loan due |
| `click` | buttons and picks |
| `tick` / `reel` / `chaos` | chaos slot machine: spinning, each reel stopping, the result |
| `mult` | Mult ×2 / ×3 |
| `lucky` | Lucky hits |
| `glass` | Glass |
| `devil` | 666 |
| `coin` | taking a Loan, Interest |
| `spin` | the revolver cylinder spinning |
| `click2` | revolver: empty chamber |
| `bang` | revolver: it fires |

## Fonts

- `assets/font/ui.*` replaces **all** text.
- `assets/font/display.*` replaces only the loud text: title, card numbers, buttons, toasts, the stack counter, the slot machine. Without it, `ui` is used there too.
- Formats: WOFF2, WOFF, TTF or OTF. Make sure the font has Cyrillic if you play in Russian.

**Make your own pixel font:** `template/font/make_font.py` is a font you draw in text. Every letter (Latin, Cyrillic, digits, symbols) is a grid of `X` and `.`. Edit the grids, run `python3 make_font.py` (needs `pip install fonttools`), and it writes `ui.ttf` and `ui.woff`. The ones already in that folder are the 5×7 pixel font built from it as-is.

## Background

`assets/bg.png` (or `.jpg`, `.webp`, `.gif`) is shown behind the table instead of the animated swirl, scaled to cover the screen.

## pack.json

Optional. Copy `pack.example.json` to `assets/pack.json`.

| key | default | what it does |
|---|---|---|
| `pixelated` | `false` | hard-edged scaling for cards, background and fonts |
| `cardRadius` | `0` | corner rounding of card sprites, in px |
| `crt` | `true` | `false` hides the scanlines and grain |
| `volume` | `1` | volume of all pack sounds |
| `volumes` | `{}` | per-sound volume, e.g. `{ "win": 0.6 }` |
| `musicVolume` | `0.35` | music loop volume |
| `pitchCombos` | `true` | pitch `play` / `stack` / `draw` up on combos |
