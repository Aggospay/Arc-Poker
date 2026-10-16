/**
 * PlayingCard — renders face cards from uploaded PNG assets in /public/
 * Naming: ace_of_spades.png, 2_of_clubs.png, jack_of_hearts.png, queen_of_diamonds.png …
 * Card back: /card.svg
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../types/poker';

interface Props {
  card:       Card;
  size?:      'xs' | 'sm' | 'md' | 'lg' | 'xl';
  delay?:     number;
  className?: string;
  winner?:    boolean;
  hero?:      boolean;
}

const SIZES = {
  xs: { w: 36,  h: 50  },
  sm: { w: 52,  h: 72  },
  md: { w: 68,  h: 96  },
  lg: { w: 84,  h: 118 },
  xl: { w: 108, h: 152 },
};

const RANK_FILE: Record<string, string> = {
  A: 'ace', J: 'jack', Q: 'queen', K: 'king',
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
};

const SUIT_SYM: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

function cardPath(rank: string, suit: string): string {
  const r = RANK_FILE[rank] ?? rank.toLowerCase();
  const s = suit.toLowerCase();
  return `/${r}_of_${s}.svg`;
}

function FallbackFace({ w, h, r, rank, suit }: { w: number; h: number; r: number; rank: string; suit: string }) {
  const color = RED_SUITS.has(suit) ? '#d20000' : '#111827';
  const sym   = SUIT_SYM[suit] ?? '';
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      color,
      gap: 2,
      userSelect: 'none',
    }}>
      <span style={{ fontSize: w * 0.32, fontWeight: 900, lineHeight: 1 }}>{rank}</span>
      <span style={{ fontSize: w * 0.26, lineHeight: 1 }}>{sym}</span>
    </div>
  );
}

export function PlayingCard({
  card, size = 'md', delay = 0, className = '', winner = false, hero = false,
}: Props) {
  const { w, h } = SIZES[size];
  const r = Math.max(5, Math.round(w * 0.09));
  const [imgError, setImgError] = useState(false);

  // ── Card back ──────────────────────────────────────────────────────────
  if (!card.faceUp) {
    return (
      <motion.div
        initial={{ rotateY: 90, opacity: 0, scale: 0.85 }}
        animate={{ rotateY: 0,  opacity: 1, scale: 1    }}
        transition={{ duration: 0.26, delay, type: 'spring', stiffness: 260, damping: 24 }}
        className={className}
        style={{ flexShrink: 0, perspective: 800 }}
      >
        <div style={{
          width: w, height: h, borderRadius: r, overflow: 'hidden', flexShrink: 0,
          boxShadow: '0 4px 18px rgba(0,0,0,0.65)',
          border: '1.5px solid rgba(100,30,110,0.5)',
        }}>
          <img
            src="/card.svg"
            alt="card back"
            draggable={false}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
          />
        </div>
      </motion.div>
    );
  }

  // ── Card face ──────────────────────────────────────────────────────────
  const src = cardPath(card.rank, card.suit);

  const boxShadow = winner
    ? '0 0 0 3px #fbbf24, 0 6px 28px rgba(251,191,36,0.55)'
    : hero
    ? '0 0 0 2px rgba(56,182,255,0.5), 0 4px 18px rgba(0,0,0,0.45)'
    : '0 2px 14px rgba(0,0,0,0.40)';

  const border = winner
    ? '2px solid #fbbf24'
    : hero
    ? '1.5px solid rgba(56,182,255,0.55)'
    : '1.5px solid rgba(255,255,255,0.12)';

  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0, y: -10, scale: 0.88 }}
      animate={{ rotateY: 0,  opacity: 1, y: 0,   scale: 1    }}
      transition={{ duration: 0.26, delay, type: 'spring', stiffness: 270, damping: 22 }}
      className={className}
      style={{ flexShrink: 0, perspective: 800 }}
    >
      <div style={{ width: w, height: h, borderRadius: r, overflow: 'hidden', flexShrink: 0, boxShadow, border }}>
        {imgError ? (
          <FallbackFace w={w} h={h} r={r} rank={card.rank} suit={card.suit} />
        ) : (
          <img
            key={src}
            src={src}
            alt={`${card.rank} of ${card.suit}`}
            draggable={false}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
            onError={() => setImgError(true)}
          />
        )}
      </div>
    </motion.div>
  );
}
