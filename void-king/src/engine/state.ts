import type { Card, Suit } from './cards'

export interface PlayerState {
  id: string
  name: string
  bid: number | null
  tricksWon: number
  hand: Card[]
  total: number
}

export interface TrickPlay {
  playerId: string
  card: Card
  order: number
}

export interface TrickState {
  plays: TrickPlay[]
  leadSuit: Suit | null
  winnerId: string | null
}

export interface GameState {
  round: number
  players: PlayerState[]
  deck: Card[]
  discard: Card[]
  bidsLocked: boolean
  currentTrick: TrickState
  scoreLog: Array<{ round: number; playerId: string; delta: number }>
}

export function createInitialGame(playerNames: string[]): GameState {
  return {
    round: 1,
    players: playerNames.map((name, idx) => ({
      id: `p-${idx + 1}`,
      name,
      bid: null,
      tricksWon: 0,
      hand: [],
      total: 0
    })),
    deck: [],
    discard: [],
    bidsLocked: false,
    currentTrick: { plays: [], leadSuit: null, winnerId: null },
    scoreLog: []
  }
}


export function addPlayer(game: GameState, name: string, id: string){
  if (game.players.some(p => p.id === id)) return game
  return {
    ...game,
    players: [
      ...game.players,
      {
        id,
        name,
        bid: null,
        tricksWon: 0,
        hand: [],
        total: 0
      }
    ]
  }
}
