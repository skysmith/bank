import './App.css'
import { useState } from 'react'
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

function DiceTray(){
  const { roll, rollDice, gameOver } = useGameStore()
  return (
    <div className="dice-tray">
      <button className="btn" onClick={rollDice} disabled={gameOver}>Roll dice</button>
      {roll && (
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
      )}
    </div>
  )
}

function PlayerList(){
  const players = useGameStore((state) => state.players)
  return (
    <section className="card">
      <h3>Players</h3>
      <ul className="player-list">
        {players.map((p) => {
          const rowScore = rows.reduce((total, row) => total + scoreRow(p.sheet[row.color].length), 0)
          const total = rowScore - p.penalties * 5
          return (
            <li key={p.id}>
              <strong>{p.name}</strong> · {total} pts · penalties: {p.penalties}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ScoreCard(){
  const player = useGameStore((state) => state.players.find(p => p.id === state.playerId))
  const adjustPenalty = useGameStore((state) => state.adjustPenalty)
  const gameOver = useGameStore((state) => state.gameOver)
  if (!player) return null
  const rowScore = rows.reduce((total, row) => total + scoreRow(player.sheet[row.color].length), 0)
  const total = rowScore - player.penalties * 5

  return (
    <section className="card">
      <h3>{player.name}'s sheet {gameOver ? '(complete)' : ''}</h3>
      <ul>
        {rows.map((row) => (
          <li key={row.color}><strong style={{ color: colorHex[row.color] }}>{row.color}</strong>: {scoreRow(player.sheet[row.color].length)}</li>
        ))}
      </ul>
      <div className="penalties">
        <span>Penalties: {player.penalties} ( -{player.penalties * 5} )</span>
        <button className="penalty-btn" onClick={() => adjustPenalty(1)}>+ penalty</button>
        <button className="penalty-btn" onClick={() => adjustPenalty(-1)}>-</button>
      </div>
      <p>Total: {total}</p>
    </section>
  )
}

function OnlineControls(){
  const { code, status, hostGame, joinGame, leaveGame } = useGameStore()
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <section className="card">
      <h3>Online lobby</h3>
      {!code ? (
        <div className="online-grid">
          <div>
            <p className="muted">Host a room.</p>
            <input type="text" placeholder="Your name" value={hostName} onChange={(e) => setHostName(e.target.value)} />
            <button className="btn primary" onClick={() => hostName && hostGame(hostName)}>Create room</button>
          </div>
          <div>
            <p className="muted">Join by code.</p>
            <input type="text" placeholder="Your name" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
            <input type="text" placeholder="Code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
            <button className="btn ghost" onClick={() => joinName && joinCode && joinGame(joinName, joinCode)}>Join room</button>
            {status && <p className="status muted">{status}</p>}
          </div>
        </div>
      ) : (
        <div>
          <p className="muted">Connected to <strong>{code}</strong></p>
          <p>Share <code>{origin}/qwixx/index.html?code={code}</code></p>
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
  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">Prototype</p>
          <h1>Qwixx Arcade</h1>
          <p className="muted">Cross numbers carefully. Locks and penalties end the game.</p>
        </div>
      </header>

      <OnlineControls />
      <DiceTray />
      <Sheet />
      <ScoreCard />
      <PlayerList />
    </div>
  )
}

export default App
