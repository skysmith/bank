export type Suit = 'nova' | 'ember' | 'nebula' | 'obsidian'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export type SpecialType = 'captain' | 'siren' | 'leviathan' | 'warp'

export type Card =
  | { kind: 'standard'; suit: Suit; rank: Rank }
  | { kind: 'special'; special: SpecialType; id: string }

export const suitNames: Record<Suit, string> = {
  nova: 'Nova Fleet',
  ember: 'Ember Syndicate',
  nebula: 'Nebula Nomads',
  obsidian: 'Obsidian Order'
}

export const specialNames: Record<SpecialType, string> = {
  captain: 'Rogue Captain',
  siren: 'Quantum Siren',
  leviathan: 'Void Leviathan',
  warp: 'Warp Jump'
}

export interface DeckConfig {
  captainCount: number
  sirenCount: number
  leviathanCount: number
  warpCount: number
}

const defaultConfig: DeckConfig = {
  captainCount: 5,
  sirenCount: 2,
  leviathanCount: 1,
  warpCount: 5
}

export function buildDeck(config: DeckConfig = defaultConfig): Card[] {
  const deck: Card[] = []
  const suits: Suit[] = ['nova', 'ember', 'nebula', 'obsidian']

  suits.forEach((suit) => {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ kind: 'standard', suit, rank: rank as Rank })
    }
  })

  const specials: { type: SpecialType; count: number }[] = [
    { type: 'captain', count: config.captainCount },
    { type: 'siren', count: config.sirenCount },
    { type: 'leviathan', count: config.leviathanCount },
    { type: 'warp', count: config.warpCount }
  ]

  specials.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      deck.push({ kind: 'special', special: type, id: `${type}-${i + 1}` })
    }
  })

  return deck
}

export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
