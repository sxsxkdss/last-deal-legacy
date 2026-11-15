# Sounds

Every sound the game plays has a name. Put a file with that name in `assets/sounds/` and it replaces the built-in synthesized sound; anything you leave out keeps the synth.

- Formats: `.ogg`, `.mp3`, `.wav`, `.m4a`.
- Variants: `play.ogg`, `play-2.ogg`, `play-3.ogg` … one is picked at random each time.
- `play`, `stack` and `draw` are pitched up a little for bigger plays (combos, bigger stacks). Turn that off with `"pitchCombos": false` in `pack.json`.
- Per-sound volume: `"volumes": { "devil": 0.6, "click": 0.4 }` in `pack.json`; overall: `"volume": 0.8`.

## Music

- `music.mp3`, `music2.mp3`, `music3.mp3` … (any `music*` file) form one playlist.
- A random track plays, then another random one (never the same twice in a row), with a 4-second crossfade between them.
- At night the music slows to 0.84× and gets muffled; it eases back by day.
- The Settings volume slider controls it.

## Sound effects

| Name | When it plays |
|---|---|
| `click` | Buttons, menus, picking cards, reordering cards, choosing a colour/target, shop "done", setting toggles |
| `turn` | Your turn starts; "your turn again" (Skip Everyone); turning sound on |
| `play` | A card lands on the pile (yours or anyone's); confirming the draft |
| `draw` | Someone draws a card |
| `took` | Someone picks up a whole stack |
| `stack` | A draw stack grows; roulette starts; Revenge armed |
| `mult` | ×2 / ×3 on a stack; Echo copies a card; Revenge hits; a poker hand is scored |
| `lucky` | Horseshoe win; a good pill; poker hand payout (second note); the horseman leaves; using an item; finding the cactus |
| `bad` | A card that can't be played; Horseshoe loss; bad pill; Echo with nothing to copy; wheel loss; loan due; caught not calling the last card; devil deal comes due; collector gives cards; War timer runs out; signing the demon's contract |
| `glass` | Glass card breaks |
| `devil` | The demon's offer appears; signing a dark deal; the fall; Sacrifice; bomb; dynamite goes off; the Tower, Brimstone, Mom's Foot, Monstro; buying blood in the shop |
| `chaos` | The angel's offer appears; slot machine result; maze; puppet string; collector pulls the lever |
| `coin` | Loan paid out; interest; rent (+3¢); every shop purchase |
| `swap` | Gift; hands swap / rotate; Mirror reflects; shield breaks a stack; snitch; War arms a card; Famine hands cards over; guardian angel |
| `skip` | Skip, Skip Everyone, Reverse |
| `uno` | Someone calls their last card |
| `spin` | Russian roulette is spun |
| `click2` | Roulette: the chamber was empty |
| `bang` | Roulette: the gun goes off; a Sacrifice card is played |
| `reel` | Slot reels spin (chaos slot, Glitch card, the wheel) |
| `tick` | Slot reel ticks; the dynamite fuse is lit; knocking on the Settings title; poking the cactus |
| `shuffle` | D6 reroll; black hole |
| `flip` | Day/night flip; tearing up the demon's contract; the Oven burns cards |
| `lastcall` | Last call warning; a horseman rides in |
| `win` | You win a deal; signing the angel's deal; Second Wind |
| `ko` | Someone is knocked out / goes broke |

Twenty-six names in all. The built-in versions are synthesized in `controller.js` (the `SFX` object, `play()`), so you can listen to each one before replacing it.
