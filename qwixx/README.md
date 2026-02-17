# Qwixx Arcade

Digital adaptation of the Qwixx roll-and-write party game.

## Goals
- Support solo mode (practice sheet) and shared turn multiplayer (local + online).
- Mirror the classic scoring sheet: red/yellow ascending rows, green/blue descending rows, penalties, locks.
- Provide helpful UX: highlight legal moves, auto-calc score, undo.

## Planned features
1. **Rules & sheet model**
   - Document row constraints, lock conditions, penalty logic.
2. **Engine**
   - Dice roller, move validator, scoreboard, game-end conditions (two rows locked or four penalties).
3. **UI**
   - Responsive score sheet with row interactions.
   - Dice tray (two white + four color dice).
   - History/log + scoreboard.
4. **Multiplayer**
   - Supabase lobby (host/join), share dice rolls, let players mark their own sheets concurrently.
5. **Polish**
   - Animations, audio, alternate color themes, stats.

## Scripts
```
npm install
npm run dev
npm run build
```
