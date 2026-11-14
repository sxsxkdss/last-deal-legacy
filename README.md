# LAST DEAL

A two-sided shedding card game played in a back room under a casino. Day on the floor, night in the back room. Rooms of up to 6 friends, no accounts. A small Node server runs every match, so everyone sees the same table and anyone who drops out can rejoin their seat.

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
5. Click **Create Web Service**. After a minute or two you get a link like `https://last-deal.onrender.com`. That link is the game: share it with friends.

Render redeploys automatically every time you push to the repo.

**About the free plan:** after 15 minutes with nobody connected, the server goes to sleep. The next visitor waits about a minute while it wakes up. Rooms live in memory, so a sleeping or redeployed server forgets them. A live game keeps the server awake.

Any host that runs Node and supports WebSockets works the same way (Railway, Fly.io, a VPS): `npm install`, then `npm start`. The server listens on the `PORT` environment variable (default 3000).

### Keeping GitHub Pages (optional)

The simplest setup is to use the Render link for everything. If you'd rather keep the GitHub Pages address, open `index.html`, find `const SERVER_URL = '';` near the top of the last script, and set it to your server, for example `const SERVER_URL = 'wss://last-deal.onrender.com/ws';`. The Pages copy will then play on your server.

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

- **Basics:** match the top card by colour or symbol, or play a wild. Empty your hand to win. Call **Last card** (button **LAST** / **ОДНА**) at two cards or right after dropping to one; get caught and you draw 2.
- **Table presets:** the host picks one of three tables in the lobby. **Classic**: plain cards and stacking, no house tricks. **Back room** (default): the house table, balanced. **No limits**: every rule and every card on. Every rule and card can still be switched one by one under *Fine-tune*.
- **Day and night:** every card has two faces. A **Shift** card turns the table over. Day: the slot machine runs, poker hands pay you, the revolver needs +8. Night: no slots, poker hands hit the next player, the revolver works from +4, the dynamite burns. **Eclipse** swaps for one turn.
- **Stacking:** +1 → +2 → +4 → +5 → +6 → +8 → +10 → +15. Double / Triple Down multiply a stack (up to +60), Mirror sends it back, the Vest stops one.
- **Russian roulette:** facing a big stack, pull the trigger: 50% it is gone, 50% you take it doubled.
- **Poker hands:** number cards can go down together as poker hands (pair up to straight flush). Bigger hands throw away extra cards; the biggest hit everyone.
- **Last call:** after 250 turns the house closes the table and whoever holds the fewest cards wins. The table counts down the last 30, so no game runs forever.
- **House cards:** luck (Horseshoe, Scratch Card, Jackpot, Redeal), money (Loan, Tip, Contract) and violence (Shot Glass, Shotgun, Handcuffs, Spinner).
- **Drawing:** stacks and penalties come in by themselves, one card at a time. Drawing until a colour shows up is by hand.
- **Accessibility:** every colour also has its own shape in the card corners, so no card depends on colour alone.
- **Bots:** the host can add bots in the lobby.
- **Languages:** English and Russian.

## Credits

LAST DEAL is an independent game. It is not affiliated with Mattel or any other card game brand.

## Your own sprites, fonts and sounds

Drop files into `assets/` and they replace the built-in cards, fonts, sounds and background, one file at a time. No code, no restart: push, `git pull` on the server, refresh. Everything you leave out keeps the built-in version.

`template/` has starting points and the full naming guide: every card exported as a PNG, every sound as a WAV, a pixel font you can draw in text, and an example `pack.json`. Read `template/README.md`.
