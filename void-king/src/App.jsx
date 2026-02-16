import './App.css'

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
          <a className="btn primary" href="/docs/PLAN.md" target="_blank">View roadmap</a>
          <a className="btn ghost" href="https://github.com/skysmith" target="_blank" rel="noreferrer">GitHub</a>
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

      <footer className="footer">
        <p>© {new Date().getFullYear()} Void King — built with Vite + React.</p>
      </footer>
    </div>
  )
}

export default App
