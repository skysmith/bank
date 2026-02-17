import { create } from 'zustand'
import { supabase } from '../supabaseClient'
import { rows } from '../constants'

const emptySheet = () => ({ red: [], yellow: [], green: [], blue: [] })
const defaultLocks = () => ({ red: false, yellow: false, green: false, blue: false })

const baseState = () => ({
  code: null,
  playerId: null,
  name: '',
  players: [],
  sheet: emptySheet(),
  locks: defaultLocks(),
  penalties: 0,
  roll: null,
  turnUsage: { white: false, color: false },
  gameOver: false,
  status: '',
  channel: null
})

const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

const getMarkType = (state, color, number) => {
  if (!state.roll) return null
  if (!state.turnUsage.white && number === state.roll.whiteSum) return 'white'
  if (!state.turnUsage.color && state.roll.combos.some((combo) => combo.color === color && combo.sum === number)) return 'color'
  return null
}

const makeEnvelope = (state) => ({
  code: state.code,
  playerId: state.playerId,
  name: state.name,
  players: state.players,
  sheet: state.sheet,
  locks: state.locks,
  penalties: state.penalties,
  roll: state.roll,
  turnUsage: state.turnUsage,
  gameOver: state.gameOver,
  status: state.status
})

export const useGameStore = create((set, get) => ({
  ...baseState(),

  setStatus: (status) => set({ status }),

  canMark: (color, number) => {
    const state = get()
    if (state.gameOver) return false
    if (state.locks[color]) return false
    if (state.sheet[color].includes(number)) return false
    const markType = getMarkType(state, color, number)
    if (!markType) return false
    const row = rows.find((r) => r.color === color)
    const idx = row.numbers.indexOf(number)
    if (idx === -1) return false
    if (state.sheet[color].length === 0) return true
    const last = state.sheet[color][state.sheet[color].length - 1]
    const lastIdx = row.numbers.indexOf(last)
    return idx > lastIdx
  },

  markNumber: (color, number) => {
    const state = get()
    if (state.gameOver) return
    const markType = getMarkType(state, color, number)
    if (!markType) return

    const newSheet = { ...state.sheet, [color]: [...state.sheet[color], number] }
    const newTurnUsage = { ...state.turnUsage, [markType]: true }
    let newLocks = state.locks
    let gameOver = state.gameOver

    const row = rows.find((r) => r.color === color)
    const isEndNumber = row.numbers[row.numbers.length - 1] === number
    const crosses = newSheet[color].length
    if (isEndNumber && crosses >= 5) {
      newLocks = { ...state.locks, [color]: true }
      const lockCount = Object.values(newLocks).filter(Boolean).length
      if (lockCount >= 2) gameOver = true
    }

    set({ sheet: newSheet, turnUsage: newTurnUsage, locks: newLocks, gameOver }, false)
    get().syncRemote()
  },

  rollDice: () => {
    const state = get()
    if (state.gameOver) return
    let penalties = state.penalties
    let gameOver = state.gameOver

    if (state.roll && !state.turnUsage.white && !state.turnUsage.color) {
      penalties = Math.min(4, penalties + 1)
      if (penalties >= 4) gameOver = true
    }

    const white = [1, 2].map(() => Math.ceil(Math.random() * 6))
    const colors = [1, 2, 3, 4].map(() => Math.ceil(Math.random() * 6))
    const combos = []
    for (let i = 0; i < colors.length; i++) {
      combos.push({ color: rows[i].color, sum: white[0] + colors[i] })
      combos.push({ color: rows[i].color, sum: white[1] + colors[i] })
    }
    const roll = { white, colors, combos, whiteSum: white[0] + white[1] }

    set({ roll, turnUsage: { white: false, color: false }, penalties, gameOver })
    get().syncRemote()
  },

  adjustPenalty: (delta) => {
    set((state) => {
      let penalties = Math.min(4, Math.max(0, state.penalties + delta))
      const gameOver = penalties >= 4 ? true : state.gameOver
      return { penalties, gameOver }
    })
    get().syncRemote()
  },

  resetLocal: () => {
    const { channel } = get()
    if (channel) channel.unsubscribe()
    set(baseState())
  },

  hostGame: async (name) => {
    const code = Math.random().toString(36).slice(2, 7).toUpperCase()
    const playerId = makeId()
    const envelope = { ...baseState(), code, playerId, name, players: [{ id: playerId, name }] }
    await supabase.from('qwixx_games').insert({ code, state: envelope })
    set(envelope)
    get().subscribe(code)
  },

  joinGame: async (name, code) => {
    const playerId = makeId()
    const { data, error } = await supabase.from('qwixx_games').select('state').eq('code', code).single()
    if (error || !data) {
      set({ status: 'Game not found' })
      return
    }
    const envelope = { ...data.state }
    if (!envelope.players.some((p) => p.id === playerId)) {
      envelope.players = [...(envelope.players || []), { id: playerId, name }]
    }
    envelope.code = code
    envelope.playerId = playerId
    envelope.name = name
    await supabase.from('qwixx_games').update({ state: envelope }).eq('code', code)
    set(envelope)
    get().subscribe(code)
  },

  leaveGame: () => {
    const { channel } = get()
    if (channel) channel.unsubscribe()
    set(baseState())
  },

  subscribe: (code) => {
    const { channel } = get()
    if (channel) channel.unsubscribe()
    const newChannel = supabase
      .channel(`qwixx:${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'qwixx_games', filter: `code=eq.${code}` }, (payload) => {
        if (payload.new?.state) {
          set((curr) => ({ ...curr, ...payload.new.state }))
        }
      })
      .subscribe()
    set({ channel: newChannel })
  },

  syncRemote: async () => {
    const state = get()
    if (!state.code) return
    const envelope = makeEnvelope(state)
    await supabase.from('qwixx_games').update({ state: envelope }).eq('code', state.code)
  }
}))
