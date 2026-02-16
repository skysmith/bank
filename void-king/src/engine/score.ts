import type { GameState } from './state'

export function finalizeTrick(game: GameState): GameState {
  const winner = game.currentTrick.winnerId
  if (!winner) return game

  const players = game.players.map((p) =>
    p.id === winner
      ? { ...p, tricksWon: p.tricksWon + 1 }
      : p
  )

  return {
    ...game,
    players,
    currentTrick: { plays: [], leadSuit: null, winnerId: null }
  }
}

export function scoreRound(game: GameState): GameState {
  const players = game.players.map((p) => {
    const bid = p.bid ?? 0
    const success = bid === p.tricksWon
    let delta = 0

    if (bid === 0){
      delta = success ? game.round * 10 : -game.round * 10
    }else{
      delta = success ? (bid * 20) : -Math.abs(bid - p.tricksWon) * 10
    }

    return {
      ...p,
      total: p.total + delta
    }
  })

  return {
    ...game,
    players,
    scoreLog: [
      ...game.scoreLog,
      ...players.map(p => ({ round: game.round, playerId: p.id, delta: (p.total - (p.total - (p.bid ?? 0))) }))
    ]
  }
}
