import './App.css'
import { useState, useEffect } from 'react'
import { rows, colorHex } from './constants'
import { useGameStore } from './store/useGameStore'

function Sheet(){
  const player = useGameStore((state) => state.players.find(p => p.id === state.playerId))
  const locks = useGameStore((state) => state.locks)
  const markNumber = useGameStore((state) => state.markNumber)
  const canMark = useGameStore((state) => state.canMark)
  if (!player) return null
  return (
    <div className="sheet">
      {rows.map((row) => (
        <div className="sheet-row" key={row.color}>
          <span className="row-label" style={{ color: colorHex[row.color] }}>{row.color}</span>
          {row.numbers.map((num) => {
            const crossed = player.sheet[row.color].includes(num)
            const locked = locks[row.color]
            const legal = !locked && canMark(row.color, num)
            return (
              <button
                key={num}
                className={`cell ${crossed ? 'crossed' : ''} ${legal ? 'legal' : 'illegal'} ${locked ? 'locked' : ''}`}
                onClick={() => legal && markNumber(row.color, num)}
                disabled={!legal || locked}
              >
                {num}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}


function PlayerBoards(){
  const players = useGameStore((state) => state.players)
  const playerId = useGameStore((state) => state.playerId)
  const adjustPenalty = useGameStore((state) => state.adjustPenalty)
  const gameOver = useGameStore((state) => state.gameOver)

  return (
    <section className="card player-cards">
      <h3>Players {gameOver ? '(complete)' : ''}</h3>
      <div className="player-card-grid">
        {players.map((player) => {
          const rowScore = rows.reduce((total, row) => total + scoreRow(player.sheet[row.color].length), 0)
          const total = rowScore - player.penalties * 5
          const isMe = player.id === playerId
          return (
            <article key={player.id} className={`mini-card ${isMe ? 'me' : ''}`}>
              <div className="mini-card-head">
                <strong>{player.name}{isMe ? ' (you)' : ''}</strong>
                <span>{total} pts</span>
              </div>
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

function DiceTray(){
  const roll = useGameStore((state) => state.roll)
  const rollDice = useGameStore((state) => state.rollDice)
  const gameOver = useGameStore((state) => state.gameOver)
  const nextRollAllowedAt = useGameStore((state) => state.nextRollAllowedAt)
  const playerId = useGameStore((state) => state.playerId)
  const activePlayerId = useGameStore((state) => state.activePlayerId)
  const players = useGameStore((state) => state.players)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const cooldownMs = Math.max(0, (nextRollAllowedAt || 0) - now)
  const activePlayer = players.find((p) => p.id === activePlayerId)
  const isMyTurn = Boolean(playerId && activePlayerId && playerId === activePlayerId)
  const disabled = gameOver || cooldownMs > 0 || !isMyTurn

  return (
    <div className="dice-tray">
      <button className="btn" onClick={rollDice} disabled={disabled}>
        {gameOver
          ? 'Game over'
          : !activePlayerId
            ? 'Waiting for host'
            : !isMyTurn
              ? `Waiting for ${activePlayer?.name ?? 'other player'}`
              : cooldownMs > 0
                ? `Next roll in ${(cooldownMs/1000).toFixed(1)}s`
                : 'Roll dice'}
      </button>
      {roll && (
        <>
        <p className="muted small">
          {isMyTurn ? 'Use the white sum or a color combo before rolling again.' : 'Only the active roller can start the next turn.'}
        </p>
        <div className="dice-values">
          <div>
            <span>White</span>
            <strong>{roll.white[0]} + {roll.white[1]}</strong>
          </div>
          <div className="color-dice">
            {['red','yellow','green','blue'].map((color, idx) => (
              <div key={color}>
                <span style={{ color: colorHex[color] }}>{color}</span>
                <strong>{roll.colors[idx]}</strong>
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  )
}



function OnlineControls(){
  const { code, status, hostGame, joinGame, leaveGame } = useGameStore()
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
            <button className="btn primary" onClick={() => hostName && roomName && hostGame(hostName, roomName)}>Create room</button>
          </div>
          <div>
            <p className="muted">Join by room name.</p>
            <input type="text" placeholder="Your name" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
            <input type="text" placeholder="Room name" value={joinRoom} onChange={(e) => setJoinRoom(e.target.value)} />
            <button className="btn ghost" onClick={() => joinName && joinRoom && joinGame(joinName, joinRoom)}>Join room</button>
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

function scoreRow(crosses){
  const table = [0,1,3,6,10,15,21,28,36,45,55,66]
  return table[crosses] || 0
}

function App() {
  const { joinGame } = useGameStore()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    const name = params.get('name')
    if (room && name) {
      joinGame(name, room)
    }
  }, [])

  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">Prototype</p>
          <h1>Qwixx Arcade</h1>
          <p className="muted">Cross numbers carefully. Locks and penalties end the game.</p>
        </div>
      </header>

      <DiceTray />
      <Sheet />
      <PlayerBoards />
      <OnlineControls />
    </div>
  )
}

export default App
