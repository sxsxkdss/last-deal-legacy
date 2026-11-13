# Asset pack template

The game can swap in your own **card sprites**, **fonts**, **sounds** and **background** without touching any code.
Put files in the `assets/` folder next to `server.js`, push, `git pull` on the server, refresh the page.
No restart needed: the server rescans `assets/` on every page load.

Anything you don't provide keeps the built-in look and the built-in synthesized sounds, so you can replace one card or one sound at a time.

This `template/` folder is **not** read by the game. It holds starting points: copy a file into `assets/`, edit it there.

```
assets/
  cards/      L-r-7.png, D-w-wdc.png ...     card faces
  sounds/     play.ogg, play-2.ogg, win.mp3  sound effects (+ music.ogg)
  font/       ui.woff2, display.ttf          fonts
  bg.png                                     background (replaces the swirl)
  pack.json                                  options (see pack.example.json)
```

## Cards

`template/cards/` has **every card in the game** (141) exported at 256×376 px in the current look, plus empty frames in `template/cards/_blank/`.

- **Name:** `<side>-<color>-<value>.png`
  - side: `L` light, `D` dark
  - color: light `r y g b`, dark `p t o v`, wild cards `w`
  - value: see the table below
- **Size:** any, but keep the ratio about **1 : 1.47** (256×376, 128×188, 64×94, or 20×30 / 40×59 for pixel art). The image is stretched to the card.
- **Format:** PNG, WebP, GIF, JPG or SVG. Transparent corners are fine.
- Pixel art: set `"pixelated": true` in `pack.json` so it scales with hard edges.

| value | card | sides |
|---|---|---|
| `0` | 0 | light |
| `1`–`9` | numbers | both |
| `skip` | Skip | light |
| `rev` | Reverse | both |
| `skipall` | Skip Everyone | both |
| `d1` `d2` `d4` | Draw 1 / 2 / 4 | light |
| `d5` | Draw 5 | dark |
| `flip` | Flip | both |
| `discall` | Discard All | both |
| `wild` | Wild | both |
| `wd2` `wd4` | Wild Draw 2 / 4 | light |
| `wd6` `wd10` | Wild Draw 6 / 10 | both |
| `wrd4` | Wild Reverse Draw 4 | both |
| `roul` | Wild Color Roulette | both |
| `wdc` | Wild Draw Color | dark |

The complete list of file names is in `template/cards/CARDS.txt`.

Which colors and sides each value exists on: just look at the file names in `template/cards/`.

## Sounds

`template/sounds/` has every built-in sound rendered to WAV, so you can hear what each one is for (and use them as a base).

- **Name:** `<event>.ogg` (or `.mp3`, `.wav`, `.m4a`). OGG or MP3 keeps the size down.
- **Variants:** `play-2.ogg`, `play-3.ogg` … one is picked at random each time.
- **Music:** `music.ogg` loops in the background after the first click (volume: `musicVolume`).
- `play`, `stack` and `draw` are pitched up on combos and bigger stacks; turn off with `"pitchCombos": false`.

| event | when |
|---|---|
| `play` | a card hits the pile |
| `draw` | a card is drawn |
| `flip` | the table flips sides |
| `stack` | a draw stack grows |
| `took` | someone takes a stack |
| `uno` | someone calls UNO |
| `skip` | someone is skipped, Reverse, Skip Everyone |
| `swap` | hands swap (7) or rotate (0) |
| `turn` | your turn starts |
| `ko` | a player is knocked out |
| `win` | the game is won |
| `bad` | penalty, caught without UNO |
| `click` | buttons and picks |
| `tick` / `reel` / `chaos` | chaos slot machine: spinning, each reel stopping, the result |

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
