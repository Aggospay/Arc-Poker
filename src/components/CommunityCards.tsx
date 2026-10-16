import { motion } from 'framer-motion';
import type { Card, GamePhase } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { formatUsdc } from '../utils/poker';

interface Props {
  cards: Card[];
  phase: GamePhase;
  pot: number;
}

const phaseLabel: Record<GamePhase, string> = {
  waiting:  'Waiting',
  dealing:  'Dealing',
  preflop:  'Pre-Flop',
  flop:     'Flop',
  turn:     'Turn',
  river:    'River',
  showdown: 'Showdown',
  end:      'End',
};

export function CommunityCards({ cards, phase, pot }: Props) {
  const visibleCards = cards.filter((c) => c.faceUp);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phase badge */}
      <div className="flex items-center gap-3">
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: 'rgba(56,182,255,0.12)',
            border: '1px solid rgba(56,182,255,0.3)',
            color: 'var(--accent)',
          }}
        >
          {phaseLabel[phase]}
        </div>
        <motion.div
          key={pot}
          initial={{ scale: 1.1, color: '#f5c842' }}
          animate={{ scale: 1, color: '#f0f6ff' }}
          transition={{ duration: 0.4 }}
          className="tabnum font-bold text-sm"
          style={{ fontFamily: 'Space Grotesk' }}
        >
          Pot: {formatUsdc(pot)} USDC
        </motion.div>
      </div>

      {/* Community card slots */}
      <div className="flex gap-2 items-center">
        {[0, 1, 2, 3, 4].map((i) => {
          const card = cards[i];
          if (card && card.faceUp) {
            return <PlayingCard key={i} card={card} size="md" delay={i * 0.1} />;
          }
          return (
            <div
              key={i}
              className="rounded-lg border border-dashed opacity-20"
              style={{
                width: 52,
                height: 74,
                borderColor: 'var(--accent)',
              }}
            />
          );
        })}
      </div>

      {/* Visible card count label */}
      {visibleCards.length > 0 && phase !== 'waiting' && (
        <div className="text-xs" style={{ color: 'var(--subtle)' }}>
          {visibleCards.length} of 5 community cards dealt
        </div>
      )}
    </div>
  );
}
