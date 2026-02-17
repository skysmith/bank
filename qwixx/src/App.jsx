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

function Sheet({ sheet, onMark, canMark, locks }){
  return (
    <div className="sheet">
      {rows.map((row) => (
        <div className="sheet-row" key={row.color}>
          <span className="row-label" style={{ color: colorHex[row.color] }}>{row.color}</span>
          {row.numbers.map((num, idx) => {
            const crossed = sheet[row.color].includes(num)
            const locked = locks[row.color]
            const legal = !locked && canMark(row.color, num)
            return (
              <button
                key={num}
                className={`cell ${crossed ? 'crossed' : ''} ${legal ? 'legal' : 'illegal'} ${locked ? 'locked' : ''}`}
                onClick={() => legal && onMark(row.color, num)}
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
  const [locks, setLocks] = useState({ red:false, yellow:false, green:false, blue:false })
  const [penalties, setPenalties] = useState(0)
  const [roll, setRoll] = useState(null)
  const [turnUsage, setTurnUsage] = useState({ white:false, color:false })

  const getMarkType = (color, number) => {
    if (!roll) return null
    if (!turnUsage.white && number === roll.whiteSum) return 'white'
    if (!turnUsage.color && roll.combos.some((combo) => combo.color === color && combo.sum === number)) return 'color'
    return null
  }

  const canMark = (color, number) => {
    const markType = getMarkType(color, number)
    if (!markType) return false
    if (locks[color]) return false
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
    const markType = getMarkType(color, number)
    if (!markType) return
    setSheet((prev) => ({ ...prev, [color]: [...prev[color], number] }))
    setTurnUsage((prev) => ({ ...prev, [markType]: true }))
    setLocks((prev) => {
      const row = rows.find(r => r.color === color)
      const isEndNumber = row.numbers[row.numbers.length - 1] === number
      const crosses = sheet[color].length + 1
      if (!(isEndNumber && crosses >= 5)) return prev
      return { ...prev, [color]: true }
    })
  }

  const onRoll = () => {
    if (turnUsage.white === false && turnUsage.color === false && roll){
      setPenalties((prev) => Math.min(4, prev + 1))
    }
    const white = [1,2].map(() => Math.ceil(Math.random()*6))
    const colors = [1,2,3,4].map(() => Math.ceil(Math.random()*6))
    const combos = []
    for (let i = 0; i < colors.length; i++){
      combos.push({ color: rows[i].color, sum: white[0] + colors[i] })
      combos.push({ color: rows[i].color, sum: white[1] + colors[i] })
    }
    const whiteSum = white[0] + white[1]
    setRoll({ white, colors, combos, whiteSum })
    setTurnUsage({ white:false, color:false })
  }

  const rowScore = scoreRow(sheet.red.length) + scoreRow(sheet.yellow.length) + scoreRow(sheet.green.length) + scoreRow(sheet.blue.length)
  const totalScore = rowScore - penalties * 5

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
      <Sheet sheet={sheet} onMark={onMark} canMark={canMark} locks={locks} />

      <section className="card">
        <h3>Score preview</h3>
        <ul>
          {rows.map((row) => (
            <li key={row.color}><strong style={{ color: colorHex[row.color] }}>{row.color}</strong>: {scoreRow(sheet[row.color].length)}</li>
          ))}
        </ul>
        <div className="penalties">
          <span>Penalties: {penalties} ( -{penalties * 5} )</span>
          <button className="penalty-btn" onClick={() => setPenalties(Math.min(4, penalties + 1))}>+ penalty</button>
          <button className="penalty-btn" onClick={() => setPenalties(Math.max(0, penalties - 1))}>-</button>
        </div>
        <p>Total: {totalScore}</p>
      </section>
    </div>
  )
}

export default App
