import './App.css'
import { useState } from 'react'

const rows = [
  { color: 'red', numbers: [2,3,4,5,6,7,8,9,10,11,12], direction: 'asc' },
  { color: 'yellow', numbers: [2,3,4,5,6,7,8,9,10,11,12], direction: 'asc' },
  { color: 'green', numbers: [12,11,10,9,8,7,6,5,4,3,2], direction: 'desc' },
  { color: 'blue', numbers: [12,11,10,9,8,7,6,5,4,3,2], direction: 'desc' }
]

const colorHex = {
  red: '#ef4444',
  yellow: '#facc15',
  green: '#22c55e',
  blue: '#3b82f6'
}

function Sheet({ sheet, onMark }){
  return (
    <div className="sheet">
      {rows.map((row) => (
        <div className="sheet-row" key={row.color}>
          <span className="row-label" style={{ color: colorHex[row.color] }}>{row.color}</span>
          {row.numbers.map((num, idx) => {
            const crossed = sheet[row.color].includes(num)
            return (
              <button
                key={num}
                className={`cell ${crossed ? 'crossed' : ''}`}
                onClick={() => onMark(row.color, num)}
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

function DiceTray({ roll, onRoll }){
  return (
    <div className="dice-tray">
      <button className="btn" onClick={onRoll}>Roll dice</button>
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

function scoreRow(crosses){
  const table = [0,1,3,6,10,15,21,28,36,45,55,66]
  return table[crosses] || 0
}

function App() {
  const [sheet, setSheet] = useState({ red: [], yellow: [], green: [], blue: [] })
  const [roll, setRoll] = useState(null)

  const onMark = (color, number) => {
    setSheet((prev) => {
      if (prev[color].includes(number)) return prev
      return { ...prev, [color]: [...prev[color], number].sort((a,b) => a-b) }
    })
  }

  const onRoll = () => {
    const white = [1,2].map(() => Math.ceil(Math.random()*6))
    const colors = [1,2,3,4].map(() => Math.ceil(Math.random()*6))
    setRoll({ white, colors })
  }

  const totalScore = scoreRow(sheet.red.length) + scoreRow(sheet.yellow.length) + scoreRow(sheet.green.length) + scoreRow(sheet.blue.length)

  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">Prototype</p>
          <h1>Qwixx Arcade</h1>
          <p className="muted">Click numbers after each roll to cross them off. Lock rows after five crosses + the last number.</p>
        </div>
      </header>

      <DiceTray roll={roll} onRoll={onRoll} />
      <Sheet sheet={sheet} onMark={onMark} />

      <section className="card">
        <h3>Score preview</h3>
        <ul>
          {rows.map((row) => (
            <li key={row.color}><strong style={{ color: colorHex[row.color] }}>{row.color}</strong>: {scoreRow(sheet[row.color].length)}</li>
          ))}
        </ul>
        <p>Total: {totalScore}</p>
      </section>
    </div>
  )
}

export default App
