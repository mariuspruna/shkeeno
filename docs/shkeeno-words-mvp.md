# Shkeeno Words — MVP plan

Private word-board game for Marius and Diana, hosted under Shkeeno. Working name is
**Shkeeno Words** to avoid using the Scrabble trademark publicly.

Target host:

- First implementation: `/play`
- Intended custom domain: `play.shkeeno.com`

## MVP goals

- Mobile-first two-player game.
- Engine should support 2–4 players later without redesign.
- Private invite link.
- No account required for the first version.
- Turn-based play with a shared server state.
- Tap-to-place tiles first; drag-and-drop can be layered in after the board feels right.

## Core rules

- 15 × 15 board.
- 7-tile rack per player.
- Tile bag indicator.
- Current player places tiles, previews score, then submits.
- Player can withdraw all newly placed tiles before submit.
- Player can pass and lose turn.
- Player can exchange selected tiles and lose turn.
- Player can resign.
- Consecutive pass counter. Initial interpretation: 3 total consecutive passes ends the game.
- Overall score per player.

## UX behaviours from the reference game

- Tiles can be arranged in the rack for thinking/visualisation.
- Board placement should be easy on mobile.
- Word validity feedback:
  - green if all formed words exist;
  - red if one or more formed words do not exist.
- Live score preview while tiles are placed.
- Nudge option.
- Premium board squares are visible and counted in scoring.

## Technical approach

- Astro page at `/play`.
- Cloudflare Pages Functions for game API.
- Supabase tables for game state.
- Polling every few seconds for MVP.
- Server stores:
  - game code;
  - board;
  - tile bag;
  - players, racks, scores, player tokens;
  - current player index;
  - pass streak;
  - status.

## Later upgrades

- Full UK English dictionary.
- Proper drag/drop with touch support.
- Supabase Realtime subscriptions.
- Better end-game scoring.
- Better nudge UX once `play.shkeeno.com` is final.
- Rack rearranging for visualisation.

## Current implementation notes

- The first version is live at `/play`.
- The server supports 2–4 players; the create form exposes 2, 3, and 4 players.
- Mobile interaction is tap-first: choose a rack tile, then tap a board square.
- Exchange mode is explicit for mobile: tap “Mark exchange”, select tiles, then exchange.
- Nudges use the existing Shkeeno ntfy topic.
- The dictionary is intentionally small for the MVP and should be replaced with a fuller word list.
