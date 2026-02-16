# Void King Roadmap

## 1. Theme & Rules Mapping
- Map suits to factions (Nova Fleet, Void Corsairs, etc.).
- Rename special cards:
  - Pirate → Rogue Captain
  - Mermaid → Quantum Siren
  - Kraken → Void Leviathan
  - Escape → Warp Jump
- Document round count per player count, bidding rules, scoring formulas, and special card interactions.

## 2. Engine
- Modules:
  - `deck.ts`: build/shuffle deck, deal hands by round.
  - `bidding.ts`: enforce legal bids (0..round), store player predictions.
  - `trick.ts`: evaluate trick winner given lead suit + specials.
  - `score.ts`: compute per-round points.
- Add Vitest suite covering edge cases (Siren vs Leviathan, multiple captains, etc.).

## 3. Client UI
- **Lobby**: host/join via code; show connected players and ready states.
- **Bidding**: slider or numeric input with confirm button; show total bids vs round number.
- **Playfield**: card hand, center trick area, log of plays.
- **Scoreboard**: running totals + round summary.
- Global settings: theme toggle, rules modal.

## 4. Multiplayer
- Supabase tables:
  - `games`: state blob + metadata (host, status, settings).
  - `players`: name, avatar, join order.
  - `events`: optional log for analytics.
- Realtime subscriptions for bids and plays; optimistic updates with conflict resolution.

## 5. Polish
- Card art placeholders (SVG) with suits/faction icons.
- Animations: card fan, flip, highlight winner.
- Sound cues for bids, trick wins, round wrap.
- Tutorial overlay + keyboard shortcuts.
