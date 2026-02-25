import { create } from 'zustand'
import { supabase } from '../supabaseClient'
import { rows } from '../constants'

const emptySheet = () => ({ red: [], yellow: [], green: [], blue: [] })
const defaultLocks = () => ({ red: false, yellow: false, green: false, blue: false })
const defaultLockOwners = () => ({ red: null, yellow: null, green: null, blue: null })

const makeId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
)

const scoreTable = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]
const ROLL_COOLDOWN_MS = 5000
const STALE_TURN_MS = 15000

const scoreRow = (crosses) => scoreTable[crosses] || 0

const normalizeRoom = (name) => (name || '').trim().replace(/\s+/g, '-').toUpperCase()

const roomPlayerKey = (code) => `qwixx:player:${code}`

const getOrMakeRoomPlayerId = (code) => {
  if (typeof window === 'undefined') return makeId()
  try {
    const key = roomPlayerKey(code)
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const created = makeId()
    window.localStorage.setItem(key, created)
    return created
  } catch {
    return makeId()
  }
}

const makePlayer = (id, name) => ({
  id,
  name,
  sheet: emptySheet(),
  penalties: 0
})

const createSoloState = () => {
  const id = makeId()
  return {
    code: null,
    playerId: id,
    name: 'Solo',
    players: [makePlayer(id, 'Solo')],
    roll: null,
    locks: defaultLocks(),
    lockOwners: defaultLockOwners(),
    whiteUsedBy: [],
    activeUsedWhite: false,
    activeUsedColor: false,
    activePlayerId: id,
    currentRollerId: id,
    nextRollAllowedAt: 0,
    turnStartedAt: 0,
    status: '',
    gameOver: false,
    channel: null
  }
}

const baseState = () => createSoloState()

const findPlayerIndexById = (players, id) => players.findIndex((p) => p.id === id)

const getPlayerById = (players, id) => players.find((p) => p.id === id)

const dedupePlayers = (players = []) => {
  const seen = new Set()
  const out = []
  for (const p of players) {
    if (!p?.id || seen.has(p.id)) continue
    seen.add(p.id)
    out.push({
      ...makePlayer(p.id, p.name || 'Player'),
      ...p,
      sheet: {
        ...emptySheet(),
        ...(p.sheet || {})
      },
      penalties: Math.min(4, Math.max(0, p.penalties || 0))
    })
  }
  return out
}

const sanitizeState = (raw) => {
  const state = { ...(raw || {}) }
  const players = dedupePlayers(state.players)
  const activeExists = players.some((p) => p.id === state.activePlayerId)
  const rollerExists = players.some((p) => p.id === state.currentRollerId)
  return {
    ...state,
    players,
    locks: { ...defaultLocks(), ...(state.locks || {}) },
    lockOwners: { ...defaultLockOwners(), ...(state.lockOwners || {}) },
    whiteUsedBy: Array.isArray(state.whiteUsedBy) ? state.whiteUsedBy : [],
    activeUsedWhite: Boolean(state.activeUsedWhite),
    activeUsedColor: Boolean(state.activeUsedColor),
    activePlayerId: activeExists ? state.activePlayerId : players[0]?.id || null,
    currentRollerId: rollerExists ? state.currentRollerId : players[0]?.id || null,
    nextRollAllowedAt: Number(state.nextRollAllowedAt || 0),
    turnStartedAt: Number(state.turnStartedAt || 0),
    gameOver: Boolean(state.gameOver),
    status: state.status || ''
  }
}

const isLegalRowMark = (player, color, number, locks) => {
  if (!player) return false
  if (locks[color]) return false
  if (player.sheet[color]?.includes(number)) return false
  const row = rows.find((r) => r.color === color)
  if (!row) return false
  const idx = row.numbers.indexOf(number)
  if (idx === -1) return false
  const crossed = player.sheet[color] || []
  if (crossed.length === 0) return true
  const last = crossed[crossed.length - 1]
  const lastIdx = row.numbers.indexOf(last)
  return idx > lastIdx
}

const canTakeWhite = (state, playerId, number) => {
  if (!state.roll) return false
  if (state.whiteUsedBy.includes(playerId)) return false
  return number === state.roll.whiteSum
}

const canTakeColor = (state, playerId, color, number) => {
  if (!state.roll) return false
  if (playerId !== state.activePlayerId) return false
  if (state.activeUsedColor) return false
  return state.roll.combos.some((combo) => combo.color === color && combo.sum === number)
}

const makeEnvelope = (state) => ({
  code: state.code,
  players: state.players,
  roll: state.roll,
  locks: state.locks,
  lockOwners: state.lockOwners,
  whiteUsedBy: state.whiteUsedBy,
  activeUsedWhite: state.activeUsedWhite,
  activeUsedColor: state.activeUsedColor,
  activePlayerId: state.activePlayerId,
  currentRollerId: state.currentRollerId,
  nextRollAllowedAt: state.nextRollAllowedAt,
  turnStartedAt: state.turnStartedAt,
  gameOver: state.gameOver,
  status: state.status
})

const rollDiceSet = () => {
  const white = [1, 2].map(() => Math.ceil(Math.random() * 6))
  const colors = [1, 2, 3, 4].map(() => Math.ceil(Math.random() * 6))
  const combos = []
  for (let i = 0; i < colors.length; i += 1) {
    combos.push({ color: rows[i].color, sum: white[0] + colors[i] })
    combos.push({ color: rows[i].color, sum: white[1] + colors[i] })
  }
  return { white, colors, combos, whiteSum: white[0] + white[1] }
}

export const useGameStore = create((set, get) => ({
  ...baseState(),

  scoreForPlayer: (player) => {
    const rowsScore = rows.reduce((sum, row) => sum + scoreRow((player.sheet[row.color] || []).length), 0)
    const state = get()
    const lockBonus = Object.values(state.lockOwners || {}).filter((ownerId) => ownerId === player.id).length * 5
    return rowsScore + lockBonus - (player.penalties || 0) * 5
  },

  setStatus: (status) => set({ status }),

  canMark: (color, number) => {
    const state = get()
    if (state.gameOver) return false
    const player = getPlayerById(state.players, state.playerId)
    if (!isLegalRowMark(player, color, number, state.locks)) return false
    if (!state.roll) return false
    if (canTakeWhite(state, state.playerId, number)) return true
    if (canTakeColor(state, state.playerId, color, number)) return true
    return false
  },

  canLockRow: (color) => {
    const state = get()
    if (state.gameOver) return false
    if (!state.roll) return false
    if (state.locks[color]) return false
    const player = getPlayerById(state.players, state.playerId)
    if (!player) return false
    return (player.sheet[color] || []).length >= 5
  },

  markNumber: (color, number) => {
    const state = get()
    if (state.gameOver) return

    const idx = findPlayerIndexById(state.players, state.playerId)
    if (idx === -1) return

    const player = state.players[idx]
    if (!isLegalRowMark(player, color, number, state.locks)) return

    const asWhite = canTakeWhite(state, state.playerId, number)
    const asColor = canTakeColor(state, state.playerId, color, number)
    if (!asWhite && !asColor) return

    const updated = {
      ...player,
      sheet: {
        ...player.sheet,
        [color]: [...(player.sheet[color] || []), number]
      }
    }

    const players = [...state.players]
    players[idx] = updated

    let locks = state.locks
    let lockOwners = state.lockOwners
    let gameOver = state.gameOver

    const row = rows.find((r) => r.color === color)
    const rowCrosses = updated.sheet[color].length
    const endNumber = row.numbers[row.numbers.length - 1]
    if (!locks[color] && number === endNumber && rowCrosses >= 5) {
      locks = { ...locks, [color]: true }
      lockOwners = { ...lockOwners, [color]: state.playerId }
      const lockCount = Object.values(locks).filter(Boolean).length
      if (lockCount >= 2) gameOver = true
    }

    const whiteUsedBy = asWhite && !state.whiteUsedBy.includes(state.playerId)
      ? [...state.whiteUsedBy, state.playerId]
      : state.whiteUsedBy

    const activeUsedWhite = asWhite && state.playerId === state.activePlayerId
      ? true
      : state.activeUsedWhite

    const activeUsedColor = asColor ? true : state.activeUsedColor

    set({ players, locks, lockOwners, gameOver, whiteUsedBy, activeUsedWhite, activeUsedColor }, false)
    get().syncRemote()
  },

  rollDice: () => {
    const state = get()
    if (state.gameOver) return
    if (!state.activePlayerId || state.playerId !== state.activePlayerId) return
    if (Date.now() < state.nextRollAllowedAt) return

    const players = [...state.players]
    const activeIdx = findPlayerIndexById(players, state.activePlayerId)
    if (activeIdx === -1) return

    let gameOver = state.gameOver

    if (state.roll && !state.activeUsedWhite && !state.activeUsedColor) {
      const active = players[activeIdx]
      const penalties = Math.min(4, (active.penalties || 0) + 1)
      players[activeIdx] = { ...active, penalties }
      if (penalties >= 4) gameOver = true
    }

    const roll = rollDiceSet()
    const now = Date.now()

    set({
      players,
      roll,
      gameOver,
      whiteUsedBy: [],
      activeUsedWhite: false,
      activeUsedColor: false,
      currentRollerId: state.activePlayerId,
      // Keep turn ownership with the roller until they explicitly end turn.
      activePlayerId: state.activePlayerId,
      nextRollAllowedAt: now + ROLL_COOLDOWN_MS,
      turnStartedAt: now
    }, false)

    get().syncRemote()
  },

  endTurn: () => {
    const state = get()
    if (state.gameOver) return
    if (!state.roll) return
    if (!state.activePlayerId || state.playerId !== state.activePlayerId) return

    const players = [...state.players]
    const activeIdx = findPlayerIndexById(players, state.activePlayerId)
    if (activeIdx === -1) return

    let gameOver = state.gameOver
    if (!state.activeUsedWhite && !state.activeUsedColor) {
      const active = players[activeIdx]
      const penalties = Math.min(4, (active.penalties || 0) + 1)
      players[activeIdx] = { ...active, penalties }
      if (penalties >= 4) gameOver = true
    }

    const nextIdx = players.length ? (activeIdx + 1) % players.length : activeIdx
    const nextActive = players[nextIdx]?.id || state.activePlayerId

    set({
      players,
      gameOver,
      activePlayerId: nextActive,
      roll: null,
      whiteUsedBy: [],
      activeUsedWhite: false,
      activeUsedColor: false,
      turnStartedAt: Date.now()
    }, false)

    get().syncRemote()
  },

  lockRow: (color) => {
    const state = get()
    if (!get().canLockRow(color)) return

    const locks = { ...state.locks, [color]: true }
    const lockOwners = { ...state.lockOwners, [color]: state.playerId }
    const lockCount = Object.values(locks).filter(Boolean).length
    const gameOver = lockCount >= 2 ? true : state.gameOver

    set({ locks, lockOwners, gameOver }, false)
    get().syncRemote()
  },

  takeTurnIfStuck: () => {
    const state = get()
    if (!state.code || state.gameOver) return
    if (!state.playerId) return

    const now = Date.now()
    const stale = state.turnStartedAt > 0 && (now - state.turnStartedAt) > STALE_TURN_MS
    if (!stale && state.activePlayerId && state.activePlayerId !== state.playerId) return

    set({ activePlayerId: state.playerId, nextRollAllowedAt: 0 }, false)
    get().syncRemote()
  },

  adjustPenalty: (delta) => {
    set((state) => {
      const idx = findPlayerIndexById(state.players, state.playerId)
      if (idx === -1) return state
      const players = [...state.players]
      const player = players[idx]
      const penalties = Math.min(4, Math.max(0, (player.penalties || 0) + delta))
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
    const cleanName = (name || '').trim()
    const code = normalizeRoom(roomName || cleanName || Math.random().toString(36).slice(2, 7))
    if (!cleanName || !code) {
      set({ status: 'Name and room are required' })
      return
    }

    const playerId = getOrMakeRoomPlayerId(code)
    const player = makePlayer(playerId, cleanName)

    const envelope = {
      ...sanitizeState(baseState()),
      code,
      players: [player],
      activePlayerId: playerId,
      currentRollerId: playerId,
      roll: null,
      whiteUsedBy: [],
      activeUsedWhite: false,
      activeUsedColor: false,
      lockOwners: defaultLockOwners(),
      nextRollAllowedAt: 0,
      turnStartedAt: 0,
      gameOver: false,
      status: ''
    }

    const { error } = await supabase.from('qwixx_games').upsert({ code, state: envelope }, { onConflict: 'code' })
    if (error) {
      set({ status: `Host failed: ${error.message}` })
      return
    }

    set({ ...envelope, playerId, name: cleanName, status: '' })
    get().subscribe(code)
  },

  joinGame: async (name, roomName) => {
    const cleanName = (name || '').trim()
    const code = normalizeRoom(roomName)
    if (!cleanName || !code) {
      set({ status: 'Name and room are required' })
      return
    }

    const playerId = getOrMakeRoomPlayerId(code)
    const { data, error } = await supabase.from('qwixx_games').select('state').eq('code', code).single()
    if (error || !data?.state) {
      set({ status: 'Game not found' })
      return
    }

    const remote = sanitizeState(data.state)
    const idx = findPlayerIndexById(remote.players, playerId)
    if (idx === -1) {
      remote.players = [...remote.players, makePlayer(playerId, cleanName)]
    } else if (remote.players[idx].name !== cleanName) {
      const players = [...remote.players]
      players[idx] = { ...players[idx], name: cleanName }
      remote.players = players
    }

    const { error: updateError } = await supabase.from('qwixx_games').update({ state: makeEnvelope(remote) }).eq('code', code)
    if (updateError) {
      set({ status: `Join failed: ${updateError.message}` })
      return
    }

    set({ ...remote, playerId, name: cleanName, code, status: '' })
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'qwixx_games', filter: `code=eq.${code}` },
        (payload) => {
          if (!payload.new?.state) return
          const remote = sanitizeState(payload.new.state)
          set((curr) => ({
            ...curr,
            ...remote,
            playerId: curr.playerId,
            name: curr.name,
            channel: curr.channel
          }))
        }
      )
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
