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

function Sheet({ sheet, onMark, canMark }){
  return (
    <div className="sheet">
      {rows.map((row) => (
        <div className="sheet-row" key={row.color}>
          <span className="row-label" style={{ color: colorHex[row.color] }}>{row.color}</span>
          {row.numbers.map((num, idx) => {
            const crossed = sheet[row.color].includes(num)
            const legal = canMark(row.color, num)
            return (
              <button
                key={num}
                className={`cell ${crossed ? 'crossed' : ''} ${legal ? 'legal' : 'illegal'}`}
                onClick={() => legal && onMark(row.color, num)}
                disabled={!legal}
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

  const diceAllows = (color, number) => {
    if (!roll) return false
    if (number === roll.whiteSum) return true
    return roll.combos.some((combo) => combo.color === color && combo.sum === number)
  }

  const canMark = (color, number) => {
    if (!diceAllows(color, number)) return false
    if (sheet[color].includes(number)) return false
    const row = rows.find(r => r.color === color)
    const idx = row.numbers.indexOf(number)
    if (idx === -1) return false
    if (sheet[color].length === 0) return true
    const last = sheet[color][sheet[color].length - 1]
    const lastIdx = row.numbers.indexOf(last)
    return idx > lastIdx
  }

  const onMark = (color, number) => {
    if (!canMark(color, number)) return
    setSheet((prev) => {
      return { ...prev, [color]: [...prev[color], number] }
    })
  }

  const onRoll = () => {
    const white = [1,2].map(() => Math.ceil(Math.random()*6))
    const colors = [1,2,3,4].map(() => Math.ceil(Math.random()*6))
    const combos = []
    for (let i = 0; i < colors.length; i++){
      combos.push({ color: rows[i].color, sum: white[0] + colors[i] })
      combos.push({ color: rows[i].color, sum: white[1] + colors[i] })
    }
    const whiteSum = white[0] + white[1]
    setRoll({ white, colors, combos, whiteSum })
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
      <Sheet sheet={sheet} onMark={onMark} canMark={canMark} />

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
