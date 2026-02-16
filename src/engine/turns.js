import { pushLog, isRoundOver } from "./state.js";

export function startTurn(game){
  // every action (roll OR bank) is a full turn now
  game.turnCount += 1;
  game.hasRolledThisTurn = false;
}

export function endTurn(game){
  game.hasRolledThisTurn = false;

  // advance to next not-done player
  const n = game.players.length;
  for (let i = 1; i <= n; i++){
    const idx = (game.activeIdx + i) % n;
    if (!game.roundStatus[idx].done){
      game.activeIdx = idx;
      return;
    }
  }
}

export function bankActivePlayer(game){
  const idx = game.activeIdx;
  const ps = game.roundStatus[idx];
  if (ps.done) return;

  const score = game.tally;
  game.players[idx].rounds.push(score);
  game.players[idx].total += score;
  ps.done = true;
  ps.banked = true;

  pushLog(game, `✅ ${game.players[idx].name} banked ${score}.`);
  endTurn(game);
}

export function bustActivePlayer(game){
  const idx = game.activeIdx;
  const ps = game.roundStatus[idx];
  if (ps.done) return;

  game.players[idx].rounds.push(0);
  ps.done = true;
  ps.busted = true;

  pushLog(game, `💥 ${game.players[idx].name} busted (0).`);
  endTurn(game);
}

export function afterSafeRollPassTurn(game){
  // key new behavior: after ONE roll, pass to next player automatically
  endTurn(game);
}

export function maybeAdvanceRound(game){
  if (!isRoundOver(game)) return false;

  if (game.round >= 10){
    game.round = 11; // mark game over
    pushLog(game, `🏁 game over.`);
    return true;
  }

  game.round += 1;
  game.tally = 0;
  game.turnCount = 0;
  game.activeIdx = 0;
  game.lastRoll = null;
  game.hasRolledThisTurn = false;
  game.roundStatus = game.players.map(() => ({ done:false, banked:false, busted:false }));

  pushLog(game, `🟨 new round: ${game.round}/10. tally reset.`);
  return true;
}