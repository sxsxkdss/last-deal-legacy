# UNO Flip × No Mercy — Ultimate Edition

A browser card game that mashes classic UNO, UNO Flip and UNO Show 'Em No Mercy into one brutal ruleset. Play against bots, or open a room and play friends online. No accounts and no server of your own: everything lives in a single `index.html`.

## Features

- **Endless two-sided deck.** Every card has a light side and a dark side, drawn at random from a mix of classic, Flip and No Mercy cards, plus a few originals: Mirror, Shield, Double Flip, Wild Duel, Wild Draw 15 and Black Hole. Each original can be switched off.
- **Flip.** Flip cards turn the whole table over. You can see the backs of other players' cards and of the next card on the draw pile.
- **No Mercy rules, each one switchable:**
  - draw until playable, one card per tap, with no passing until one fits
  - stacking (+1 → +2 → +4 → +5 → +6 → +8 → +10 → +15), with Mirror and Shield as counters
  - 7 swaps hands (optional each time), 0 rotates hands, as separate toggles
  - same-number drops: play every card of one number or symbol at once
  - jump-in
  - Skip Everyone, Discard All, Color Roulette and Wild Draw Color
  - the Mercy Rule (solo only)
- **Bots** that stack, flip, swap and hold their wilds.
- **Online rooms** with 4-character codes and shareable `#join-CODE` links. Up to 6 seats, and empty ones can be filled with bots.
- **Interface:** drag-to-play, short card movements, a darker palette on the dark side, synthesized sounds, and keyboard shortcuts (D/Space draw, U UNO, P pass).

## Publish on GitHub Pages

1. Create a new repository and add `index.html` (and this README) to it.
2. Go to **Settings → Pages**, set **Source** to "Deploy from a branch", and choose `main` and `/ (root)`.
3. After a minute your game is live at `https://<your-username>.github.io/<repo-name>/`.

Any static host works too (Netlify, Vercel, Cloudflare Pages, itch.io as an HTML game). Opening the file straight from disk works for solo play. For online rooms, serve it over `https://` (or `localhost`).

## How online play works

Rooms use [PeerJS](https://peerjs.com/) (WebRTC) and PeerJS's free public matchmaking server.

- **The host runs the game.** The host's browser runs the table, including the bots, and sends each player only their own hand. Nobody can peek at other hands.
- **Connections are direct.** After matchmaking, players connect browser to browser. No game data goes through a server you have to run.
- **Leaving.** If the host closes the tab, the room ends. If a player drops, a bot takes over their hand. Players who go quiet for 45 seconds get an autopilot move.
- **Strict networks.** Some strict networks (corporate or university Wi-Fi, some mobile carriers) block direct WebRTC connections. To make those work, you'd need to add a TURN server in the `new Peer(...)` options inside `openPeer()` in `index.html`.

The public PeerJS server is free but best-effort. For something you rely on, you can run your own [PeerServer](https://github.com/peers/peerjs-server) and point `new Peer(id, { host, port, path })` at it.

## Credits

UNO, UNO Flip and UNO Show 'Em No Mercy are trademarks of Mattel. This is an unofficial fan project, not affiliated with or endorsed by Mattel. If you publish it, consider giving it your own name.
