import type { Card } from './cards'
import { buildDeck, shuffle } from './cards'
import type { GameState } from './state'

export function dealRound(game: GameState, round: number): GameState {
  const deck = shuffle(buildDeck())
  const cardsPerPlayer = round
  const players = game.players.map((player) => {
    const hand = deck.splice(0, cardsPerPlayer)
    return {
      ...player,
      bid: null,
      tricksWon: 0,
      hand
    }
  })

  return {
    ...game,
    round,
    deck,
    discard: [],
    bidsLocked: false,
    currentTrick: { plays: [], leadSuit: null, winnerId: null },
    players
  }
}
