# Void King (Working Title)

Space-themed reimagining of the classic Skull King trick-taking party game.

## Vision
- Keep the depth of Skull King (bidding, trick resolution, special cards) but shift the aesthetics to a neon space opera.
- Support hot-seat, solo vs AI, and online multiplayer (Supabase real-time) similar to Bank Dice.
- Responsive layout; playable on desktop tablets phones.

## Milestones
1. **Rules spec + assets list**
   - Map every original card to its space counterpart and document effects.
   - Define round structure, scoring, and bidding UX.
2. **Engine prototype**
   - Pure TypeScript module for deck, bidding validation, trick resolution, scoring.
   - Jest/Vitest tests using real card scenarios.
3. **UI shell**
   - Lobby (host/join), bidding screen, trick view with placeholder cards.
   - Reuse Supabase multiplayer patterns from Bank Dice.
4. **Art + polish**
   - Card face/backs, animations, SFX, light/dark support.
   - Tutorial overlay + rulebook.

## Tech Stack
- Vite + React + TypeScript
- Zustand for client state
- Supabase for auth + real-time sync
- Tailwind or custom CSS modules for styling (TBD)

## Getting Started
```bash
npm install
npm run dev
```

---
More docs coming soon in `/docs`.
