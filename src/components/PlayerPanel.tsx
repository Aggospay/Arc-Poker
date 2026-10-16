import { motion } from 'framer-motion';
import type { Player } from '../types/poker';
import { PlayingCard } from './PlayingCard';
import { formatUsdc, avatarColor } from '../utils/poker';

interface Props {
  player: Player;
  isCurrentTurn: boolean;
  showCards?: boolean;
}

const statusBadge: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#3dd68c' },
  folded: { label: 'Folded', color: '#5a7898' },
  allIn: { label: 'All-In', color: '#f5c842' },
  'sitting-out': { label: 'Away', color: '#5a7898' },
  winner: { label: 'Winner!', color: '#f5c842' },
  waiting: { label: 'Waiting', color: '#5a7898' },
};

export function PlayerPanel({ player, isCurrentTurn, showCards = false }: Props) {
  const status = statusBadge[player.status] ?? { label: '', color: '#5a7898' };
  const isFolded = player.status === 'folded';
  const bg = avatarColor(player.id);

  return (
    <motion.div
      layout
      className={`relative flex flex-col items-center gap-1 ${isFolded ? 'opacity-50' : ''}`}
    >
      {/* Turn ring */}
      {isCurrentTurn && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ boxShadow: ['0 0 0 2px #38b6ff, 0 0 14px rgba(56,182,255,0.5)', '0 0 0 3px #38b6ff, 0 0 28px rgba(56,182,255,0.8)', '0 0 0 2px #38b6ff, 0 0 14px rgba(56,182,255,0.5)'] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {/* Cards */}
      <div className="flex gap-1">
        {player.cards.map((card, i) => (
          <PlayingCard
            key={i}
            card={player.isHero || showCards ? { ...card, faceUp: true } : card}
            size="sm"
            delay={i * 0.08}
          />
        ))}
      </div>

      {/* Panel */}
      <div
        className={`glass rounded-xl px-3 py-2 min-w-[120px] text-center ${isCurrentTurn ? 'border border-[var(--accent)]' : ''}`}
        style={{ background: isCurrentTurn ? 'rgba(56,182,255,0.08)' : undefined }}
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: bg }}
          >
            {player.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {player.name}
            </div>
            {player.isDealer && (
              <span className="text-[9px] px-1 rounded-sm font-bold" style={{ background: 'var(--accent)', color: '#060d18' }}>
                D
              </span>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="tabnum font-semibold text-xs" style={{ color: 'var(--accent)' }}>
          {formatUsdc(player.balance)} USDC
        </div>

        {/* Current bet */}
        {player.currentBet > 0 && (
          <div className="tabnum text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
            Bet: {formatUsdc(player.currentBet)}
          </div>
        )}

        {/* Status */}
        <div className="mt-1 text-[10px] font-semibold" style={{ color: status.color }}>
          {status.label}
        </div>
      </div>
    </motion.div>
  );
}
