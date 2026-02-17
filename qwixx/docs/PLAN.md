# Qwixx Plan

## 1. Rules reference
- Red/Yellow rows (ascending 2-12).
- Green/Blue rows (descending 12-2).
- Cross numbers left-to-right; can skip numbers but cannot go backwards.
- Need 5 crosses in a row to lock (plus the end number).
- Game ends when two rows locked or a player has 4 penalties (-5 each).

## 2. Engine modules
- `dice.ts`: roll 2 white dice + 4 colored dice, compute combos.
- `sheet.ts`: data structure for a player's sheet, functions to mark numbers, check legality, compute score.
- `game.ts`: manages turns, penalties, locks, and game-end.

## 3. UI milestones
1. Build static sheet component with clickable cells.
2. Add dice tray + roll button.
3. Hook engine to update sheet and score summary.
4. Add history/log + scoreboard (for multiplayer).

## 4. Multiplayer (later)
- Supabase tables similar to Void King (games, players, turns, sheets).
- Host/join UI, real-time updates.

## 5. Polish
- Keyboard shortcuts, undo/confirm, theme toggle, confetti on total.
