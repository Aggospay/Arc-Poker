import type { Card, GameState, Player, Rank, Suit } from '../types/poker';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function suitSymbol(suit: Suit): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}

export function suitClass(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'card-suit-red' : 'card-suit-black';
}

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: true });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = d[i];
    d[i] = d[j];
    d[j] = tmp;
  }
  return d;
}

export function formatUsdc(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function shortenAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function avatarColor(seed: string): string {
  const colors = [
    '#1a7fd4', '#0ea5e9', '#0891b2', '#059669',
    '#7c3aed', '#db2777', '#ea580c', '#ca8a04',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? '#1a7fd4';
}

// ── Rank strength for simple hand evaluation ──────────────
const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function rankValue(r: Rank): number {
  return RANK_VALUE[r];
}

/** Very rough hand strength 0–1 for a 2-card hole hand */
export function holeStrength(cards: Card[]): number {
  if (cards.length < 2) return 0.4;
  const [a, b] = cards as [Card, Card];
  const va = rankValue(a.rank);
  const vb = rankValue(b.rank);
  const paired   = a.rank === b.rank;
  const suited   = a.suit === b.suit;
  const high     = Math.max(va, vb);
  const gap      = Math.abs(va - vb);
  let score = (high / 14) * 0.5 + (paired ? 0.3 : 0) + (suited ? 0.08 : 0) - (gap * 0.015);
  return Math.max(0.05, Math.min(0.98, score));
}

/** Build a fresh hand game state */
export function buildNewHand(
  heroAddress: string,
  heroName: string,
  heroBalance: number,
  existingBots?: Player[],
  handCount = 1,
  dealerIdx = 0,
  heroAvatarUrl?: string | null,
): GameState {
  const deck = shuffleDeck(makeDeck());
  let di = 0;
  const draw = (): Card => {
    const c = deck[di++];
    return c ?? { rank: 'A', suit: 'spades', faceUp: false };
  };

  const BOT_NAMES  = ['CryptoSam', 'ArcAngel', 'BlueChip', 'Satoshi99', 'TheMiner'];
  const BOT_BALS   = [640, 1200, 880, 450, 1750];
  const SB = 5;
  const BB = 10;

  const numSeats = 6;
  const sbIdx = (dealerIdx + 1) % numSeats;
  const bbIdx = (dealerIdx + 2) % numSeats;

  const players: Player[] = Array.from({ length: numSeats }, (_, seatIdx) => {
    const isHero = seatIdx === 0;
    const botIdx = seatIdx - 1;
    const existing = isHero ? null : (existingBots?.[botIdx] ?? null);
    const name = isHero ? heroName : BOT_NAMES[botIdx] ?? `Bot${botIdx}`;
    const bal  = isHero
      ? heroBalance
      : (existing ? Math.max(existing.balance, 0) : BOT_BALS[botIdx] ?? 500);
    const isSB = seatIdx === sbIdx;
    const isBB = seatIdx === bbIdx;
    const blind = isSB ? SB : isBB ? BB : 0;
    return {
      id:          isHero ? 'hero' : `bot-${botIdx}`,
      address:     isHero ? heroAddress : `0x${String(botIdx + 1).padStart(40, '0')}`,
      name,
      balance:     Math.max(0, bal - blind),
      currentBet:  blind,
      status:      bal <= 0 ? 'sitting-out' : 'active',
      cards:       [{ ...draw(), faceUp: isHero }, { ...draw(), faceUp: isHero }],
      isHero,
      isDealer:    seatIdx === dealerIdx % numSeats,
      isSmallBlind: isSB,
      isBigBlind:   isBB,
      position:    seatIdx,
      avatar:      initials(name) || (isHero ? 'ME' : `B${botIdx}`),
      avatarColor: avatarColor(isHero ? heroAddress : name),
      avatarUrl:   isHero ? (heroAvatarUrl ?? null) : null,
      lastAction:  isSB ? 'Small Blind' : isBB ? 'Big Blind' : undefined,
    };
  });

  const communityCards: Card[] = Array.from({ length: 5 }, () => ({ ...draw(), faceUp: false }));

  return {
    phase:              'preflop',
    pot:                SB + BB,
    sidePots:           [],
    communityCards,
    currentPlayerIndex: (bbIdx + 1) % numSeats,
    dealerIndex:        dealerIdx % numSeats,
    smallBlind:         SB,
    bigBlind:           BB,
    minRaise:           BB * 2,
    callAmount:         BB,
    players,
    lastAction:         'New hand started',
    winners:            [],
    handCount,
  };
}

/** Determine a simple winner from remaining active players (first by highest hole card) */
export function pickWinners(players: Player[]): string[] {
  const active = players.filter((p) => p.status === 'active' || p.status === 'allIn');
  if (active.length === 0) return [];
  if (active.length === 1) return [active[0].id];
  let best = -1;
  let winners: string[] = [];
  for (const p of active) {
    const score = holeStrength(p.cards);
    if (score > best) { best = score; winners = [p.id]; }
    else if (score === best) { winners.push(p.id); }
  }
  return winners;
}

// Removed legacy buildDemoGameState in favour of buildNewHand
export { buildNewHand as buildDemoGameState };
