import { create } from 'zustand'
import { supabase } from '../supabaseClient'
import { createInitialGame, dealRound, setBid, playCard as enginePlayCard, finalizeTrick, scoreRound, addPlayer } from '../engine'

const defaultPlayers = ['Sky', 'Nova', 'Ember']

const makeInitial = (names = defaultPlayers) => createInitialGame(names)
const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
const generateCode = (len = 5) => Array.from({ length: len }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')

let applyingRemote = false

export const useGameStore = create((set, get) => ({
  game: makeInitial(),
  phase: 'idle',
  activeIdx: 0,
  log: [],
  online: { code: null, playerId: null, name: '', channel: null, status: '' },

  setStatus: (msg) => set((state) => ({ online: { ...state.online, status: msg } })),

  applyEnvelope: (envelope) => {
    applyingRemote = true
    set({
      game: envelope.game,
      phase: envelope.phase,
      activeIdx: envelope.activeIdx,
      log: envelope.log
    })
    applyingRemote = false
  },

  envelope(){
    const state = get()
    return {
      game: state.game,
      phase: state.phase,
      activeIdx: state.activeIdx,
      log: state.log
    }
  },

  syncRemote: async () => {
    const { online } = get()
    if (!online.code || applyingRemote) return
    const envelope = get().envelope()
    await supabase.from('games').update({ state: envelope }).eq('code', online.code)
  },

  cleanupChannel: () => {
    const { online } = get()
    if (online.channel) online.channel.unsubscribe()
    set((state) => ({ online: { ...state.online, channel: null, code: null, playerId: null } }))
  },

  subscribeToGame: (code) => {
    const { cleanupChannel } = get()
    cleanupChannel()
    const channel = supabase
      .channel(`game-${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `code=eq.${code}` }, (payload) => {
        if (payload.new?.state) get().applyEnvelope(payload.new.state)
      })
      .subscribe()
    set((state) => ({ online: { ...state.online, channel } }))
  },

  hostOnlineGame: async (name) => {
    const playerId = makeId()
    const code = generateCode(5)
    const game = makeInitial([name])
    const envelope = { game, phase: 'idle', activeIdx: 0, log: [] }
    await supabase.from('games').insert({ code, state: envelope, created_by: playerId })
    await supabase.from('game_players').insert({ game_code: code, player_id: playerId, name })
    set({ online: { code, playerId, name, channel: null, status: 'Waiting for players…' }, ...envelope })
    get().subscribeToGame(code)
  },

  joinOnlineGame: async (name, code) => {
    const playerId = makeId()
    const { data, error } = await supabase.from('games').select('state').eq('code', code).single()
    if (error || !data) return get().setStatus('Game not found')
    let envelope = data.state
    envelope = { ...envelope, game: addPlayer(envelope.game, name, playerId) }
    await supabase.from('game_players').insert({ game_code: code, player_id: playerId, name }).catch(() => {})
    await supabase.from('games').update({ state: envelope }).eq('code', code)
    get().applyEnvelope(envelope)
    set({ online: { code, playerId, name, channel: null, status: 'Joined game' } })
    get().subscribeToGame(code)
  },

  leaveOnlineGame: () => {
    get().cleanupChannel()
    set({ game: makeInitial(), phase: 'idle', activeIdx: 0, log: [] })
  },

  startMatch: () => {
    const base = makeInitial(get().game.players.map((p) => p.name))
    const dealt = dealRound(base, 1)
    set({ game: dealt, phase: 'bidding', activeIdx: 0, log: [{ text: 'Round 1 dealt' }] })
    get().syncRemote()
  },

  nextRound: () => {
    set((state) => {
      const nextRound = state.game.round + 1
      if (nextRound > 10){
        return { phase: 'complete', log: [...state.log, { text: 'Game complete' }] }
      }
      const dealt = dealRound({ ...state.game }, nextRound)
      return { game: dealt, phase: 'bidding', activeIdx: 0, log: [...state.log, { text: `Round ${nextRound} dealt` }] }
    })
    get().syncRemote()
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
    get().syncRemote()
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

      if (afterPlay.currentTrick.plays.length === afterPlay.players.length){
        const winnerId = afterPlay.currentTrick.winnerId
        const winnerName = afterPlay.players.find((p) => p.id === winnerId)?.name || 'Unknown'
        log = [...log, { text: `Trick won by ${winnerName}` }]
        const finalized = finalizeTrick(afterPlay)
        game = finalized
        activeIdx = finalized.players.findIndex((p) => p.id === winnerId)
        const handEmpty = finalized.players.every((p) => p.hand.length === 0)
        if (handEmpty){
          const scored = scoreRound(finalized)
          game = scored
          phase = 'roundEnd'
        }
      }

      return { game, phase, activeIdx, log }
    })
    get().syncRemote()
  }
}))
