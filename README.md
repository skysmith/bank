# bank dice (web app)

## Workspace Metadata

- Name: Bank Dice
- Domain: lab
- Status: exploratory
- Purpose: Quick hot-seat dice game prototype with shared tally mechanics
- Path: lab/games/bank
- Related:
  - lab/games
- Tags:
  - game
  - dice
  - prototype
  - local

hot-seat dice game. shared tally. first 3 turns: 7 is lucky (+70). after that: 7 busts. late-phase doubles double the entire tally.

## run locally
quick + dirty:
- open `index.html`

better (modules + no weird caching):
```bash
python3 -m http.server 5173
