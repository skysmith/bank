import type { Card, Suit } from './cards'
import type { GameState, TrickPlay } from './state'

function cardStrength(card: Card, lead: Suit | null): number {
  if (card.kind === 'special'){
    switch(card.special){
      case 'warp': return 1
      case 'captain': return 80
      case 'siren': return 90
      case 'leviathan': return 95
    }
  }

  // trump suit highest
  if (card.kind === 'standard'){
    if (card.suit === 'obsidian') return 60 + card.rank
    if (lead && card.suit === lead) return 40 + card.rank
    return 10 + card.rank
  }
  return 0
}

export function playCard(game: GameState, playerId: string, card: Card): GameState {
  const trick = game.currentTrick
  const player = game.players.find(p => p.id === playerId)
  if (!player) return game

  const newHand = player.hand.filter((c) => c !== card)
  const plays: TrickPlay[] = [...trick.plays, { playerId, card, order: trick.plays.length }]
  const leadSuit = trick.leadSuit ?? (card.kind === 'standard' ? card.suit : null)

  const updatedPlayers = game.players.map((p) => p.id === playerId ? { ...p, hand: newHand } : p)

  let winnerId = trick.winnerId
  if (plays.length === updatedPlayers.length){
    const winningPlay = plays.reduce((best, current) => {
      const bestStrength = cardStrength(best.card, leadSuit)
      const currentStrength = cardStrength(current.card, leadSuit)
      return currentStrength > bestStrength ? current : best
    })

    winnerId = winningPlay.playerId
  }

  return {
    ...game,
    players: updatedPlayers,
    currentTrick: {
      plays,
      leadSuit,
      winnerId
    }
  }
}
