import type { GameState } from './state'

export function setBid(game: GameState, playerId: string, bid: number): GameState {
  const players = game.players.map((p) =>
    p.id === playerId ? { ...p, bid } : p
  )
  const allBidsPlaced = players.every((p) => p.bid !== null)

  return {
    ...game,
    players,
    bidsLocked: allBidsPlaced
  }
}

export function totalBids(game: GameState): number {
  return game.players.reduce((sum, p) => sum + (p.bid ?? 0), 0)
}
