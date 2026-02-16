import { pushLog, isRoundOver } from "./state.js";

export function startTurn(game){
  // called before each roll to track phase transitions
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
  bankPlayer(game, game.activeIdx);
}

export function bankOffTurn(game, idx){
  bankPlayer(game, idx, { offTurn: true });
}

function bankPlayer(game, idx, { offTurn = false } = {}){
  const ps = game.roundStatus[idx];
  if (ps.done) return;

  const score = game.tally;
  const player = game.players[idx];
  player.rounds.push(score);
  player.total += score;
  ps.done = true;
  ps.banked = true;

  const note = offTurn ? " (off-turn)" : "";
  pushLog(game, `✅ ${player.name} banked ${score}${note}.`);

  if (!offTurn && idx === game.activeIdx){
    endTurn(game);
  }
}

export function bustActivePlayer(game){
  const idx = game.activeIdx;
  const ps = game.roundStatus[idx];
  if (ps.done) return;

  game.players[idx].rounds.push(0);
  ps.done = true;
  ps.busted = true;

  pushLog(game, `💥 ${game.players[idx].name} busted (0). round ends.`);

  // new rule: once any player busts, the whole round is over.
  endRoundImmediately(game, idx);
}

function endRoundImmediately(game, bustedIdx){
  game.players.forEach((player, idx) => {
    if (idx === bustedIdx) return; // already marked
    const status = game.roundStatus[idx];
    if (status.done) return; // already banked earlier

    player.rounds.push(0);
    status.done = true;
    status.busted = true;
  });

  pushLog(game, `⛔ round ended due to bust. remaining active players scored 0.`);
}

export function afterSafeRollPassTurn(game){
  // key new behavior: after ONE roll, pass to next player automatically
  endTurn(game);
}

function announceWinners(game){
  const sorted = [...game.players].map((p, idx) => ({ ...p, idx })).sort((a, b) => b.total - a.total);
  const top = sorted[0];
  const medal = (rank) => (rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "");

  pushLog(game, `🏁 game over. winner: ${top.name} (${top.total}).`);
  sorted.forEach((p, rank) => {
    pushLog(game, `${medal(rank)} ${p.name}: ${p.total} pts`);
  });
}

export function maybeAdvanceRound(game){
  if (!isRoundOver(game)) return false;

  if (game.round >= 10){
    game.round = 11; // mark game over
    announceWinners(game);
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