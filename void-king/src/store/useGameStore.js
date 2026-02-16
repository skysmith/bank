import { create } from 'zustand'
import { createInitialGame, dealRound, setBid, playCard as enginePlayCard, finalizeTrick, scoreRound } from '../engine'

const playerNames = ['Sky', 'Nova', 'Ember']

const makeInitial = () => createInitialGame(playerNames)

export const useGameStore = create((set, get) => ({
  game: makeInitial(),
  phase: 'idle',
  activeIdx: 0,
  log: [],

  startMatch: () => {
    const base = makeInitial()
    const dealt = dealRound(base, 1)
    set({ game: dealt, phase: 'bidding', activeIdx: 0, log: [{ text: 'Round 1 dealt' }] })
  },

  nextRound: () => {
    const state = get()
    const nextRound = state.game.round + 1
    if (nextRound > 10) {
      set({ phase: 'complete', log: [...state.log, { text: 'Game complete' }] })
      return
    }
    const dealt = dealRound({ ...state.game }, nextRound)
    set({ game: dealt, phase: 'bidding', activeIdx: 0, log: [...state.log, { text: `Round ${nextRound} dealt` }] })
  },

  submitBid: (playerId, bid) => {
    set((state) => {
      const updated = setBid(state.game, playerId, bid)
      const allBids = updated.bidsLocked
      return {
        game: updated,
        phase: allBids ? 'playing' : state.phase,
        activeIdx: allBids ? 0 : state.activeIdx,
        log: allBids ? [...state.log, { text: 'Bids locked. Begin play.' }] : state.log
      }
    })
  },

  playCard: (card) => {
    set((state) => {
      if (state.phase !== 'playing') return state
      const currentPlayer = state.game.players[state.activeIdx]
      const afterPlay = enginePlayCard(state.game, currentPlayer.id, card)
      let game = afterPlay
      let activeIdx = (state.activeIdx + 1) % afterPlay.players.length
      let phase = state.phase
      let log = state.log

      if (afterPlay.currentTrick.plays.length === afterPlay.players.length) {
        const winnerId = afterPlay.currentTrick.winnerId
        const winnerName = afterPlay.players.find((p) => p.id === winnerId)?.name || 'Unknown'
        log = [...log, { text: `Trick won by ${winnerName}` }]
        const finalized = finalizeTrick(afterPlay)
        game = finalized
        activeIdx = finalized.players.findIndex((p) => p.id === winnerId)

        const handEmpty = finalized.players.every((p) => p.hand.length === 0)
        if (handEmpty) {
          const scored = scoreRound(finalized)
          game = scored
          phase = 'roundEnd'
        }
      }

      return { game, phase, activeIdx, log }
    })
  }
}))
