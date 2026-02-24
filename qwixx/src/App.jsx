import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { colorHex, rows } from './constants'
import { useGameStore } from './store/useGameStore'

function scoreRow(crosses) {
  const table = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]
  return table[crosses] || 0
}

function Sheet() {
  const players = useGameStore((state) => state.players)
  const playerId = useGameStore((state) => state.playerId)
  const locks = useGameStore((state) => state.locks)
  const canMark = useGameStore((state) => state.canMark)
  const markNumber = useGameStore((state) => state.markNumber)

  const player = players.find((p) => p.id === playerId)
  if (!player) return null

  return (
    <section className="sheet">
      {rows.map((row) => (
        <div className="sheet-row" key={row.color}>
          <span className="row-label" style={{ color: colorHex[row.color] }}>{row.color}</span>
          {row.numbers.map((num) => {
            const crossed = player.sheet[row.color].includes(num)
            const locked = locks[row.color]
            const legal = !locked && canMark(row.color, num)
            return (
              <button
                key={`${row.color}-${num}`}
                className={`cell ${crossed ? 'crossed' : ''} ${legal ? 'legal' : 'illegal'} ${locked ? 'locked' : ''}`}
                disabled={!legal || locked}
                onClick={() => legal && markNumber(row.color, num)}
              >
                {num}
              </button>
            )
          })}
        </div>
      ))}
    </section>
  )
}

function PlayerBoards() {
  const players = useGameStore((state) => state.players)
  const playerId = useGameStore((state) => state.playerId)
  const activePlayerId = useGameStore((state) => state.activePlayerId)
  const currentRollerId = useGameStore((state) => state.currentRollerId)
  const adjustPenalty = useGameStore((state) => state.adjustPenalty)
  const scoreForPlayer = useGameStore((state) => state.scoreForPlayer)

  return (
    <section className="card player-cards">
      <h3>Players</h3>
      <div className="player-card-grid">
        {players.map((player) => {
          const isMe = player.id === playerId
          const isActive = player.id === activePlayerId
          const isRoller = player.id === currentRollerId
          const total = scoreForPlayer(player)

          return (
            <article key={player.id} className={`mini-card ${isMe ? 'me' : ''}`}>
              <div className="mini-card-head">
                <strong>{player.name}{isMe ? ' (you)' : ''}</strong>
                <span>{total} pts</span>
              </div>
              <p className="muted small">{isActive ? 'Active turn' : isRoller ? 'Last roller' : 'Waiting'}</p>
              <ul>
                {rows.map((row) => (
                  <li key={row.color}>
                    <span style={{ color: colorHex[row.color] }}>{row.color}</span>
                    <span>{scoreRow(player.sheet[row.color].length)}</span>
                  </li>
                ))}
              </ul>
              <div className="mini-penalties">
                {isMe ? (
                  <>
                    <span>Penalties: {player.penalties}</span>
                    <button className="penalty-btn" onClick={() => adjustPenalty(1)}>+1</button>
                    <button className="penalty-btn" onClick={() => adjustPenalty(-1)}>-1</button>
                  </>
                ) : (
                  <span>Penalties: {player.penalties}</span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function DiceTray() {
  const roll = useGameStore((state) => state.roll)
  const gameOver = useGameStore((state) => state.gameOver)
  const playerId = useGameStore((state) => state.playerId)
  const activePlayerId = useGameStore((state) => state.activePlayerId)
  const nextRollAllowedAt = useGameStore((state) => state.nextRollAllowedAt)
  const players = useGameStore((state) => state.players)
  const code = useGameStore((state) => state.code)
  const rollDice = useGameStore((state) => state.rollDice)
  const takeTurnIfStuck = useGameStore((state) => state.takeTurnIfStuck)

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const activePlayer = players.find((p) => p.id === activePlayerId)
  const isMyTurn = Boolean(playerId && activePlayerId && playerId === activePlayerId)
  const cooldownMs = Math.max(0, (nextRollAllowedAt || 0) - now)
  const disabled = gameOver || cooldownMs > 0 || !isMyTurn

  const cta = useMemo(() => {
    if (gameOver) return 'Game over'
    if (!activePlayerId) return 'Waiting for players'
    if (!isMyTurn) return `Waiting for ${activePlayer?.name || 'other player'}`
    if (cooldownMs > 0) return `Next roll in ${(cooldownMs / 1000).toFixed(1)}s`
    return 'Roll dice'
  }, [gameOver, activePlayerId, isMyTurn, cooldownMs, activePlayer])

  return (
    <section className="dice-tray">
      <button className="btn" disabled={disabled} onClick={rollDice}>{cta}</button>
      {code && !isMyTurn && !gameOver && (
        <button className="btn ghost" onClick={takeTurnIfStuck}>Take turn if stuck</button>
      )}
      {roll && (
        <div className="dice-values">
          <div>
            <span>White</span>
            <strong>{roll.white[0]} + {roll.white[1]} = {roll.whiteSum}</strong>
          </div>
          <div className="color-dice">
            {['red', 'yellow', 'green', 'blue'].map((color, idx) => (
              <div key={color}>
                <span style={{ color: colorHex[color] }}>{color}</span>
                <strong>{roll.colors[idx]}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      {roll && <p className="muted small">Any player may take the white sum once. Active player may also take one color combo.</p>}
    </section>
  )
}

function OnlineControls() {
  const code = useGameStore((state) => state.code)
  const status = useGameStore((state) => state.status)
  const hostGame = useGameStore((state) => state.hostGame)
  const joinGame = useGameStore((state) => state.joinGame)
  const leaveGame = useGameStore((state) => state.leaveGame)

  const [hostName, setHostName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinRoom, setJoinRoom] = useState('')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <section className="card">
      <h3>Online lobby</h3>
      {!code ? (
        <div className="online-grid">
          <div>
            <p className="muted">Host a room.</p>
            <input type="text" placeholder="Your name" value={hostName} onChange={(e) => setHostName(e.target.value)} />
            <input type="text" placeholder="Room name" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            <button className="btn primary" onClick={() => hostGame(hostName, roomName)}>Create room</button>
          </div>
          <div>
            <p className="muted">Join an existing room.</p>
            <input type="text" placeholder="Your name" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
            <input type="text" placeholder="Room name" value={joinRoom} onChange={(e) => setJoinRoom(e.target.value)} />
            <button className="btn ghost" onClick={() => joinGame(joinName, joinRoom)}>Join room</button>
            {status && <p className="status muted">{status}</p>}
          </div>
        </div>
      ) : (
        <div>
          <p className="muted">Connected to <strong>{code}</strong></p>
          <p>Share <code>{origin}/qwixx/index.html?room={code}</code></p>
          <button className="btn ghost" onClick={leaveGame}>Leave</button>
        </div>
      )}
    </section>
  )
}

export default function App() {
  const joinGame = useGameStore((state) => state.joinGame)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    const name = params.get('name')
    if (room && name) joinGame(name, room)
  }, [joinGame])

  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">Qwixx</p>
          <h1>Qwixx Arcade</h1>
          <p className="muted">Stable multiplayer with explicit turn state.</p>
        </div>
      </header>

      <DiceTray />
      <Sheet />
      <PlayerBoards />
      <OnlineControls />
    </div>
  )
}
