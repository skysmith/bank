import { useState } from 'react'
import './App.css'
import { useGameStore } from './store/useGameStore'

const suitGlyph = {
  nova: '♢',
  ember: '△',
  nebula: '✦',
  obsidian: '♠'
}

const specialGlyph = {
  captain: '🛸',
  siren: '🌌',
  leviathan: '🜨',
  warp: '🌀'
}

function cardLabel(card){
  if (card.kind === 'standard'){
    return `${card.rank} ${suitGlyph[card.suit]}`
  }
  return `${specialGlyph[card.special]} ${card.special}`
}

const features = [
  {
    title: 'Spacefaring Trick-Taking',
    detail: 'Classic Skull King depth with factions, rogue captains, quantum sirens, and a void leviathan.'
  },
  {
    title: 'Multiplayer Ready',
    detail: 'Host hot-seat, solo vs AI, or real-time Supabase lobbies with per-turn logs.'
  },
  {
    title: 'Playable Anywhere',
    detail: 'Responsive layout, light/dark themes, and accessibility-first controls.'
  }
]

const timeline = [
  { phase: 'Spec & Theme', date: 'Week 1', items: ['Finalize faction mapping', 'Card art explorations', 'Rules doc'] },
  { phase: 'Engine', date: 'Week 2', items: ['Deck + shuffle', 'Bidding validator', 'Trick resolver & scoring'] },
  { phase: 'UI Shell', date: 'Week 3', items: ['Lobby + host/join', 'Bidding panel', 'Trick table & scoreboard'] },
  { phase: 'Multiplayer & Polish', date: 'Week 4', items: ['Supabase sync', 'Animations + SFX', 'Tutorial + deploy'] }
]

function Prototype(){
  const { game, phase, activeIdx, log, startMatch, nextRound, submitBid, playCard } = useGameStore()
  const [drafts, setDrafts] = useState({})

  const handleBid = (playerId) => {
    const value = Number(drafts[playerId] ?? 0)
    submitBid(playerId, value)
  }

  const activePlayer = game.players[activeIdx]

  return (
    <section className="card prototype">
      <div className="prototype-header">
        <h2>Prototype Sandbox</h2>
        <p className="muted">Rough UI for testing the engine. Hot-seat only for now.</p>
      </div>

      <div className="controls">
        {phase === 'idle' && <button className="btn primary" onClick={startMatch}>Deal Round 1</button>}
        {phase === 'roundEnd' && game.round < 10 && (
          <button className="btn primary" onClick={nextRound}>Start Round {game.round + 1}</button>
        )}
        {phase === 'complete' && <p>Campaign complete.</p>}
        <div className="pill">Phase: {phase}</div>
        <div className="pill">Round {game.round}</div>
      </div>

      <div className="player-grid">
        {game.players.map((player, idx) => (
          <div key={player.id} className={`player-card ${idx === activeIdx ? 'active' : ''}`}>
            <div className="player-head">
              <strong>{player.name}</strong>
              <span className="muted">Total {player.total}</span>
            </div>
            <div className="player-meta">
              <div>Bid: {player.bid ?? '—'}</div>
              <div>Tricks: {player.tricksWon}</div>
            </div>

            {phase === 'bidding' && (
              <div className="bid-row">
                <input
                  type="number"
                  min={0}
                  max={game.round}
                  value={drafts[player.id] ?? player.bid ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [player.id]: e.target.value })}
                />
                <button className="btn small" onClick={() => handleBid(player.id)}>Lock Bid</button>
              </div>
            )}

            {phase === 'playing' && idx === activeIdx && (
              <div className="hand-grid">
                {player.hand.map((card, cardIdx) => (
                  <button key={cardIdx} className="card-btn" onClick={() => playCard(card)}>
                    {cardLabel(card)}
                  </button>
                ))}
              </div>
            )}

            {phase === 'playing' && idx !== activeIdx && (
              <p className="muted" style={{ marginTop: 8 }}>Cards: {player.hand.length}</p>
            )}
          </div>
        ))}
      </div>

      <div className="log">
        <h4>Log</h4>
        <ul>
          {log.map((entry, idx) => <li key={idx}>{entry.text}</li>)}
        </ul>
      </div>
    </section>
  )
}

function App() {
  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Project Brief</p>
          <h1>Void King</h1>
          <p className="lead">
            A neon space-opera reskin of Skull King. Bid, bluff, and blast through ten rounds of trick-taking chaos with rogue captains,
            quantum sirens, and a hungry void leviathan.
          </p>
        </div>
        <div className="cta-group">
          <a className="btn primary" href="/void-king/docs/PLAN.md" target="_blank">View roadmap</a>
          <a className="btn ghost" href="/void-king/docs/RULES.md" target="_blank" rel="noreferrer">Rules draft</a>
        </div>
      </header>

      <section className="card features">
        {features.map((feat) => (
          <article key={feat.title}>
            <h3>{feat.title}</h3>
            <p>{feat.detail}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Timeline</h2>
        <div className="timeline">
          {timeline.map((block) => (
            <div key={block.phase} className="timeline-block">
              <p className="eyebrow">{block.date}</p>
              <h3>{block.phase}</h3>
              <ul>
                {block.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card suits">
        <h2>Faction Mapping</h2>
        <div className="grid">
          <div>
            <h4>Original</h4>
            <ul>
              <li>Hearts / Diamonds / Clubs / Spades</li>
              <li>Pirates</li>
              <li>Mermaids</li>
              <li>Kraken</li>
              <li>Escape Cards</li>
            </ul>
          </div>
          <div>
            <h4>Void Edition</h4>
            <ul>
              <li>Nova Fleet / Ember Syndicate / Nebula Nomads / Obsidian Order</li>
              <li>Rogue Captains</li>
              <li>Quantum Sirens</li>
              <li>Void Leviathan</li>
              <li>Warp Jumps</li>
            </ul>
          </div>
        </div>
      </section>

      <Prototype />

      <footer className="footer">
        <p>© {new Date().getFullYear()} Void King — built with Vite + React.</p>
      </footer>
    </div>
  )
}

export default App
