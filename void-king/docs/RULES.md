# Void King Rules (Draft)

A space-themed adaptation of Skull King. Ten rounds of trick-taking with escalating hand sizes, bold bids, and special faction cards that upset the balance.

## 1. Components
- **Factions / Suits**
  - **Nova Fleet** (Hearts) – primary light suit
  - **Ember Syndicate** (Diamonds)
  - **Nebula Nomads** (Clubs)
  - **Obsidian Order** (Spades)
- **Special Cards**
  - **Rogue Captains** (Pirates) – beat any standard card except Quantum Siren when Siren catches them.
  - **Quantum Sirens** (Mermaids) – beat Rogue Captains and Void Leviathan; lose to Warp Jumps.
  - **Void Leviathan** (Kraken) – beats everything except Quantum Siren.
  - **Warp Jumps** (Escape cards) – automatically lose the trick unless only jumps are played; great for zero bids.
- **Deck Composition**: same counts as Skull King (numbers 1–13 in four suits + special card counts). Adjust text/art only.

## 2. Objective
Accumulate the highest score after 10 rounds by accurately bidding how many tricks you will win and executing that plan. Rounds start at 1 card per player and escalate to 10.

## 3. Setup
1. Shuffle full deck.
2. Determine player order (host chooses). Each round deals `roundNumber` cards to each player.
3. Reveal round-specific trump rules:
   - Rounds 1–10: Obsidian Order (Spades) acts as permanent trump.
   - Optional variant later: rotating trump or no-trump rounds.

## 4. Bidding Phase
1. After reviewing their hands, players secretly choose a bid (0–roundNumber) representing how many tricks they will try to win.
2. Reveal bids simultaneously (UI: confirm button; for multiplayer we’ll queue until all confirm).
3. Zero bids (“Void Runs”) are allowed; they score a bonus if successful.
4. Total bids can be higher/lower than round number (no restriction).

## 5. Trick Play
1. First trick lead is the dealer’s left (or host’s left). Winner leads next trick.
2. Standard play: must follow suit if possible; otherwise play any card.
3. Card hierarchy when suits lead:
   - Within a suit, higher rank wins (13 highest).
   - Trump (Obsidian Order) beats other suits.
   - Rogue Captains beat numbered cards, but lose to Quantum Sirens.
   - Quantum Siren beats Rogue Captain and Void Leviathan (unless Kraken is alone? we’ll follow Skull King exact logic).
   - Void Leviathan beats everything except Quantum Siren.
   - Warp Jump essentially forfeits the trick unless only jumps are played.
4. If multiple Rogue Captains appear, highest played first wins (per Skull King). Need to confirm exact original logic and mirror it.

### Special Card Interactions
- **Rogue Captain vs Rogue Captain**: the first Captain played wins unless a later player plays a higher-ranked Captain? (Check original rules; some versions treat pirates equally and the first played wins.)
- **Quantum Siren**:
  - If played against a Rogue Captain, Siren automatically wins.
  - If Siren encounters Void Leviathan, Siren wins.
  - Against numbered/trump cards, treat as highest trump.
- **Void Leviathan**: wins over suits, rogue captains, warp jumps; only loses to Quantum Siren.
- **Warp Jumps**: always lose unless all players warp (then lead player wins). Perfect for zero bids.

## 6. Scoring
- **Exact bid hit**: +20 points per trick won + 10 bonus for accurate prediction (matching Skull King). Example: bid 3, won 3 → +70.
- **Failed bid**: -10 points per trick of difference (over or under). Example: bid 4, won 2 → -20.
- **Zero bid success**: round number * 10 (e.g., round 5, zero bid success = +50).
- **Zero bid failure**: -10 * round number.

## 7. Round End
- Log each player’s tricks vs bids, update totals.
- Increase round number, reshuffle/discard as needed, deal again.
- After round 10, announce winner (tie breaker: highest total, then most exact bids, etc.).

## 8. UI / UX Notes
- **Bidding UI**: numeric slider or +/- buttons with “confirm” and quick zero shortcut.
- **Trick display**: highlight lead suit, show trump badge, logs each card play.
- **Special card tooltips**: since the theme renames everything, include hover tooltips or rule overlay.

## 9. Open Questions / TODO
- Confirm exact Skull King tie rules for multiple pirates and interactions we forgot (e.g., Pirate vs Pirate vs Skull King itself). Need to mirror official logic.
- Consider optional events (e.g., special rounds) after MVP.
- Decide whether to implement asynchronous play (turn-based) or live-only.
