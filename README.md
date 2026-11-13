# UNO Flip × No Mercy

An online card game that mashes classic UNO, UNO Flip and UNO Show 'Em No Mercy into one ruleset. Play friends in rooms of up to 6. No accounts needed. A small Node server runs every match, so everyone always sees the same table and anyone who drops out can rejoin their seat.

## What's in the box

| File | What it is |
| --- | --- |
| `index.html` | The whole game client (one file). |
| `server.js` | The game server. It serves `index.html` and runs the matches over WebSockets. |
| `engine.js` | The rules engine, used by the server (and built into `index.html`). |
| `package.json` | Tells the host to install `ws` and run `node server.js`. |
| `render.yaml` | Optional one-click setup for Render. |

## Deploy on Render (free)

1. Put all the files above in a GitHub repository (replace what's there).
2. Sign in at [render.com](https://render.com) with GitHub.
3. Click **New → Web Service** and pick your repository.
4. Set:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
5. Click **Create Web Service**. After a minute or two you get a link like `https://uno-flip-no-mercy.onrender.com`. That link is the game: share it with friends.

Render redeploys automatically every time you push to the repo.

**About the free plan:** after 15 minutes with nobody connected, the server goes to sleep. The next visitor waits about a minute while it wakes up. Rooms live in memory, so a sleeping or redeployed server forgets them. A live game keeps the server awake.

Any host that runs Node and supports WebSockets works the same way (Railway, Fly.io, a VPS): `npm install`, then `npm start`. The server listens on the `PORT` environment variable (default 3000).

### Keeping GitHub Pages (optional)

The simplest setup is to use the Render link for everything. If you'd rather keep the GitHub Pages address, open `index.html`, find `const SERVER_URL = '';` near the top of the last script, and set it to your server, for example `const SERVER_URL = 'wss://uno-flip-no-mercy.onrender.com/ws';`. The Pages copy will then play on your server.

## How a room works

- **Create and join.** One player creates a room and shares the 4-character code or the link. Friends open the page, type a name and join.
- **Lobby.** Everyone can change their name. The host switches rules and extra cards on or off, and guests see the table rules live. At least 2 players are needed to start.
- **Server-run matches.** The server deals, checks every move and sends each player only their own hand.
- **Rejoining.** Each browser gets a private ID. Lose your connection, refresh or close the tab, and you have 60 seconds to come back to your seat and cards. Opening the page again puts you straight back in. Brief connection drops reconnect on their own.
- **Away players.** No bots take over. While a player is away, their turn is skipped after 15 seconds (60 seconds if they're connected but idle). A skipped player takes any stack that was waiting on them.
- **Leaving.** Pressing Leave, or staying disconnected for more than a minute, takes you out of that match. Everyone else keeps playing, and the last player left wins.
- **Host.** If the host is away for 20 seconds, the host role passes to the next connected player, so someone can always start the next round.
- **Cleanup.** Rooms with nobody connected are removed after 30 minutes.

## Rules

- **Chaos (on by default):** every 8–12 plays a slot machine spins and lands on a random event: Inflation (draw cards count double for 6 plays), Leader tax (fewest cards picks up 2), Revolution (every hand moves one seat), Flip storm, Color lock (only the color or a wild for 4 plays), Bleed (everyone picks up 1), Jackpot (a lucky player discards 2 random cards) or Mirror world (direction reverses).
- **Bots:** the host can add bots in the lobby to fill seats or to test on their own. The server plays them.
- **Effects:** a swirling shader table, CRT scanlines and grain, real pixel art (cards are 20×30 sprites scaled by whole numbers only, a built-in 5×7 bitmap font with Latin and Cyrillic, a dithered fixed-palette background, nothing rotates or blurs), card sway and tilt, particles, screen shake, glitches, and pixel fire that erupts from the pile on huge stacks, multi-drops, multipliers and 666. Switch to "lite" from the log header or the Menu if a device struggles. It starts in lite mode when the system asks for reduced motion.

- **Manual drawing:** every card is drawn by hand, one tap per card. That covers taking a stack, Color Roulette, Wild Draw Color, and the UNO penalty. You can't play while you owe cards.
- **Languages:** English and Russian, picked from the browser's language. Switch any time on the start screen or in the Menu. The game log is translated on each player's screen.
- **Sound:** card sounds are synthesized in the browser (slides, slaps, riffles, chimes), with no audio files to download.
- **Phones:** the layout switches to a single column with swipeable seats, big Draw/Pass/UNO buttons, a one-line log and a Menu for everything else.

- **Deck:** endless and two-sided. Each card has a light and a dark face, drawn from a mix of classic, Flip and No Mercy cards, plus originals: Mirror, Shield, Double Flip, Wild Draw 15 and Black Hole, and a casino set: Mult ×2 / ×3 (multiplies a stack, up to +60, or arms the next draw card), Lucky (1 in 3 to dump 2 random cards), Glass (next player +2, or it shatters on you), 666 (everyone else +2, you +1), Jackpot (pulls the chaos lever) and Loan (dump 2 now, pick up 4 after 3 plays). The host can switch each original off.
- **Flip:** turns every card over. You see the backs of other players' cards and of the next draw card.
- **Stacking:** +1 → +2 → +4 → +5 → +6 → +8 → +10 → +15. Mirror sends a stack back, and Shield breaks one.
- **Same-number drops:** play every card of one number or symbol at once, in the order you choose, matching wilds included. The last card sets the color.
- **Draw until playable:** one card per tap, and you can't pass until one fits.
- **Other rules:** 7 swaps hands (optional each time), 0 rotates hands, jump-in with an exact copy of the top card (wilds included), and the UNO penalty. Each rule can be switched on or off.

## Credits

UNO, UNO Flip and UNO Show 'Em No Mercy are trademarks of Mattel. This is an unofficial fan project, not affiliated with or endorsed by Mattel. If you publish it, consider giving it your own name.
