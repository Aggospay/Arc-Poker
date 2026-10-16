export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
  faceUp: boolean;
}

export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'allIn' | 'sitting-out' | 'winner';

export interface Player {
  id: string;
  address: string;
  name: string;
  balance: number;
  currentBet: number;
  status: PlayerStatus;
  cards: Card[];
  isHero: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  position: number;
  avatar: string;
  avatarColor: string;
  avatarUrl?: string | null;
  lastAction?: string;
}

export type GamePhase = 'waiting' | 'dealing' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'end';

export interface GameState {
  phase: GamePhase;
  pot: number;
  sidePots: number[];
  communityCards: Card[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  callAmount: number;
  players: Player[];
  lastAction?: string;
  winners?: string[];
  handCount: number;
}

export type TableVariant = 'cash' | 'sng' | 'tournament' | 'highstakes';

export interface TableInfo {
  id: string;
  name: string;
  variant: TableVariant;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  players: number;
  maxPlayers: number;
  avgPot: number;
  featured?: boolean;
  speed?: 'normal' | 'fast' | 'turbo';
}

// ── Inventory ────────────────────────────────────────────────
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemCategory = 'cardSkin' | 'tableTheme' | 'avatar' | 'badge' | 'trophy';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: Rarity;
  owned: boolean;
  equipped: boolean;
  previewGradient: string;
  accentColor: string;
  price?: number;
}

// ── Rewards ──────────────────────────────────────────────────
export interface Reward {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: 'USDC';
  expiry: string;
  claimed: boolean;
  type: 'tournament' | 'daily' | 'achievement' | 'referral';
}

// ── Navigation ───────────────────────────────────────────────
export type AppView =
  | 'lobby'
  | 'cashgames'
  | 'tournaments'
  | 'sitandgo'
  | 'table'
  | 'profile'
  | 'leaderboard'
  | 'history'
  | 'inventory'
  | 'rewards'
  | 'wallet';
