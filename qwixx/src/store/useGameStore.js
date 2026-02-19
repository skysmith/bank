import { create } from 'zustand'
import { supabase } from '../supabaseClient'
import { rows } from '../constants'

const emptySheet = () => ({ red: [], yellow: [], green: [], blue: [] })
const defaultLocks = () => ({ red: false, yellow: false, green: false, blue: false })

const makePlayer = (id, name) => ({ id, name, sheet: emptySheet(), locks: defaultLocks(), penalties: 0 })

const createSoloState = () => {
  const soloId = makeId()
  const soloPlayer = makePlayer(soloId, 'Solo')
  return {
    code: null,
    playerId: soloId,
    name: 'Solo',
    activePlayerId: soloId,
    currentRollerId: soloId,
    players: [soloPlayer],
    roll: null,
    turnUsage: { white: false, color: false },
    gameOver: false,
    status: '',
    channel: null,
    locks: defaultLocks(),
    whiteMarks: [],
    nextRollAllowedAt: 0
  }
}

const baseState = () => createSoloState()

const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

const getPlayerIndex = (players, id) => players.findIndex((p) => p.id === id)
const getPlayer = (state) => state.players.find((p) => p.id === state.playerId)

const getMarkType = (state, color, number, playerId) => {
  if (!state.roll) return null
  const hasWhite = state.whiteMarks?.includes(playerId)
  if (!hasWhite && number === state.roll.whiteSum) return 'white'
  const isRoller = playerId === state.currentRollerId
  if (isRoller && !state.turnUsage.color && state.roll.combos.some((combo) => combo.color === color && combo.sum === number)) return 'color'
  return null
}

const normalizeRoom = (name) => name.trim().replace(/\s+/g,'-').toUpperCase()

const makeEnvelope = (state) => ({
  code: state.code,
  playerId: state.playerId,
  name: state.name,
  players: state.players,
  locks: state.locks,
  roll: state.roll,
  turnUsage: state.turnUsage,
  gameOver: state.gameOver,
  status: state.status,
  whiteMarks: state.whiteMarks,
  nextRollAllowedAt: state.nextRollAllowedAt,
  activePlayerId: state.activePlayerId,
  currentRollerId: state.currentRollerId
})

export const useGameStore = create((set, get) => ({
  ...baseState(),

  setStatus: (status) => set({ status }),

  canMark: (color, number) => {
    const state = get()
    const player = getPlayer(state)
    if (!player) return false
    if (state.gameOver) return false
    if (state.locks[color]) return false
    if (player.sheet[color].includes(number)) return false
    const markType = getMarkType(state, color, number, state.playerId)
    if (!markType) return false
    const row = rows.find((r) => r.color === color)
    const idx = row.numbers.indexOf(number)
    if (idx === -1) return false
    if (player.sheet[color].length === 0) return true
    const last = player.sheet[color][player.sheet[color].length - 1]
    const lastIdx = row.numbers.indexOf(last)
    return idx > lastIdx
  },

  markNumber: (color, number) => {
    const state = get()
    if (state.gameOver) return
    if (state.playerId !== state.activePlayerId) return
    const playerIdx = getPlayerIndex(state.players, state.playerId)
    if (playerIdx === -1) return
    const player = state.players[playerIdx]
    if (player.sheet[color].includes(number)) return
    const markType = getMarkType(state, color, number, state.playerId)
    if (!markType) return

    const updatedPlayer = {
      ...player,
      sheet: { ...player.sheet, [color]: [...player.sheet[color], number] }
    }
    const players = [...state.players]
    players[playerIdx] = updatedPlayer

    const newTurnUsage = {
      white: markType === 'white' ? true : state.turnUsage.white,
      color: markType === 'color' ? true : state.turnUsage.color
    }
    const newWhiteMarks = markType === 'white' ? [...(state.whiteMarks || []), player.id] : state.whiteMarks
    let newLocks = state.locks
    let gameOver = state.gameOver

    const row = rows.find((r) => r.color === color)
    const isEndNumber = row.numbers[row.numbers.length - 1] === number
    const crosses = updatedPlayer.sheet[color].length
    if (isEndNumber && crosses >= 5) {
      newLocks = { ...state.locks, [color]: true }
      const lockCount = Object.values(newLocks).filter(Boolean).length
      if (lockCount >= 2) gameOver = true
    }

    set({ players, turnUsage: newTurnUsage, locks: newLocks, gameOver, whiteMarks: newWhiteMarks }, false)
    get().syncRemote()
  },

  rollDice: () => {
    const state = get()
    if (state.gameOver) return
    if (state.playerId !== state.activePlayerId) return
    const playerIdx = getPlayerIndex(state.players, state.playerId)
    if (playerIdx === -1) return
    let players = [...state.players]
    let gameOver = state.gameOver

    if (state.roll && !state.turnUsage.white && !state.turnUsage.color) {
      const player = players[playerIdx]
      const penalties = Math.min(4, player.penalties + 1)
      players[playerIdx] = { ...player, penalties }
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

    const nextRollAllowedAt = Date.now() + 3000
    const nextIdx = players.length ? (playerIdx + 1) % players.length : playerIdx
    const nextActive = players[nextIdx]?.id || state.activePlayerId

    set({ roll, turnUsage: { white: false, color: false }, players, gameOver, whiteMarks: [], nextRollAllowedAt, currentRollerId: state.playerId, activePlayerId: nextActive })
    get().syncRemote()
  },

  adjustPenalty: (delta) => {
    set((state) => {
      const idx = getPlayerIndex(state.players, state.playerId)
      if (idx === -1) return state
      const players = [...state.players]
      const player = players[idx]
      const penalties = Math.min(4, Math.max(0, player.penalties + delta))
      players[idx] = { ...player, penalties }
      const gameOver = penalties >= 4 ? true : state.gameOver
      return { players, gameOver }
    })
    get().syncRemote()
  },

  resetLocal: () => {
    const { channel } = get()
    if (channel) channel.unsubscribe()
    set(baseState())
  },

  hostGame: async (name, roomName) => {
    const code = normalizeRoom(roomName || name || Math.random().toString(36).slice(2,7))
    const playerId = makeId()
    const player = makePlayer(playerId, name)
    const envelope = { ...baseState(), code, playerId, name, players: [player], activePlayerId: playerId, currentRollerId: playerId }
    await supabase.from('qwixx_games').insert({ code, state: envelope })
    set(envelope)
    get().subscribe(code)
  },

  joinGame: async (name, roomName) => {
    const code = normalizeRoom(roomName)
    const playerId = makeId()
    const { data, error } = await supabase.from('qwixx_games').select('state').eq('code', code).single()
    if (error || !data) {
      set({ status: 'Game not found' })
      return
    }
    const envelope = { ...data.state }
    if (!envelope.players.some((p) => p.id === playerId)) {
      envelope.players = [...(envelope.players || []), makePlayer(playerId, name)]
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
