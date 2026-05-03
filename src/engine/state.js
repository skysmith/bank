export function makeGame(players){
  // players: [{name, isAI}]
  return {
    version: 1,
    status: "active", // "lobby" | "active" | "finished"
    hostId: null,
    hostName: "Host",
    round: 1,
    tally: 0,
    turnCount: 0,          // total turns started this round
    activeIdx: 0,
    lastRoll: null,
    hasRolledThisTurn: false,

    players: players.map(p => ({
      name: p.name,
      isAI: !!p.isAI,
      total: 0,
      rounds: [] // length up to 10
    })),

    // per-player per-round status
    roundStatus: players.map(() => ({
      done: false,
      banked: false,
      busted: false
    })),

    log: []
  };
}

export function phase(game){
  // first three turns (turnCounts 1-3) keep 7s lucky
  return game.turnCount <= 3 ? "early" : "late";
}

export function phaseLabel(game){
  return phase(game) === "early"
    ? "7s are lucky (+70). doubles normal."
    : "7s bust. doubles double the tally.";
}

export function pushLog(game, text){
  game.log.push(text);
  if (game.log.length > 40) game.log.splice(0, game.log.length - 40);
}

export function isRoundOver(game){
  return game.roundStatus.every(s => s.done);
}

export function isGameOver(game){
  return game.round > 10;
}
