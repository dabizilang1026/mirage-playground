export type Difficulty = 'easy' | 'normal' | 'hard' | 'cheat';

export type GameKey =
  | 'cleaning'
  | 'blackjack'
  | 'rps'
  | 'sword'
  | 'roulette'
  | 'tarot';

export type Outcome = 'win' | 'loss' | 'draw';

export interface GameStats {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  cleaningCorrect: number;
  cleaningWrong: number;
  cleaningPerfect: number;
  blackjackNaturals: number;
  rpsAllTies: number;
  swordHitHoles: number;
  swordAllHit: number;
  rouletteFireWins: number;
  tarotJokerWins: number;
  maxCoins: number;
}

export const emptyStats = (): GameStats => ({
  played: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  cleaningCorrect: 0,
  cleaningWrong: 0,
  cleaningPerfect: 0,
  blackjackNaturals: 0,
  rpsAllTies: 0,
  swordHitHoles: 0,
  swordAllHit: 0,
  rouletteFireWins: 0,
  tarotJokerWins: 0,
  maxCoins: 0,
});

export interface SaveData {
  id: string;
  name: string;
  difficulty: Difficulty;
  createdAt: number;
  updatedAt: number;
  coins: number;
  day: number;
  totalEarned: number;
  totalSpent: number;
  achievements: string[];
  skins: string[];
  equippedSkin: string;
  defeated: boolean;
  defeatedDay: number;
  cheatUsed: boolean;
  stats: GameStats;
}

export interface GameResult {
  kind: GameKey;
  outcome: Outcome;
  deltaCoins: number;
  stats?: Partial<GameStats>;
  title: string;
  subtitle: string;
  detail?: string;
}
