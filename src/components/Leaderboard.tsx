import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import { toast } from 'sonner';
import { avatarColor, shortenAddress } from '../utils/poker';
import { useLocaleCtx } from '../i18n/LocaleContext';

interface LeaderboardEntry {
  rank: number; address: string; name: string;
  totalWon: number; handsPlayed: number; winRate: number; badge?: string;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1,  address: '0xDEAD1234BEEF5678DEAD1234BEEF5678DEAD1234', name: 'ArcAngel',  totalWon: 48200, handsPlayed: 1840, winRate: 58.2, badge: 'Champion' },
  { rank: 2,  address: '0xCAFE1234BEEF5678CAFE1234BEEF5678CAFE1234', name: 'Satoshi99',  totalWon: 31500, handsPlayed: 1240, winRate: 55.7, badge: 'Legend' },
  { rank: 3,  address: '0xFACE1234BEEF5678FACE1234BEEF5678FACE1234', name: 'BlueChip',   totalWon: 24800, handsPlayed:  980, winRate: 54.1, badge: 'Pro' },
  { rank: 4,  address: '0xBEEF1234BEEF5678BEEF1234BEEF5678BEEF1234', name: 'TheMiner',   totalWon: 18400, handsPlayed:  820, winRate: 51.8 },
  { rank: 5,  address: '0x1234BEEF5678CAFE1234BEEF5678CAFE12345678', name: 'CryptoSam',  totalWon: 14200, handsPlayed:  640, winRate: 50.5 },
  { rank: 6,  address: '0x5678BEEF1234FACE5678BEEF1234FACE56781234', name: 'ArcHunter',  totalWon: 12100, handsPlayed:  580, winRate: 49.8 },
  { rank: 7,  address: '0x9ABC1234BEEF5678DEAD9ABC1234BEEF56789ABC', name: 'WebPlayer',  totalWon:  9800, handsPlayed:  520, winRate: 48.9 },
  { rank: 8,  address: '0xDEF01234BEEF5678CEFE1234BEEF5678DEF01234', name: 'GrindMode',  totalWon:  7400, handsPlayed:  480, winRate: 47.6 },
  { rank: 9,  address: '0x1111222233334444555566667777888899990000', name: 'Newcomer1',  totalWon:  5200, handsPlayed:  340, winRate: 46.2 },
  { rank: 10, address: '0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333', name: 'ArcRookie',  totalWon:  3100, handsPlayed:  220, winRate: 44.8 },
];

const RANK_STYLES: Record<number, { color: string; glow: string }> = {
  1: { color: '#f5c842', glow: 'rgba(245,200,66,0.3)' },
  2: { color: '#c0c8d4', glow: 'rgba(192,200,212,0.3)' },
  3: { color: '#cd7f32', glow: 'rgba(205,127,50,0.3)' },
};

export function Leaderboard() {
  const { t } = useLocaleCtx();

  return (
    <div className="min-h-dvh px-4 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Trophy size={36} style={{ color: '#f5c842' }} />
        </div>
        <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          {t('lb_title')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {t('lb_top_players')}
        </p>
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-8">
        {[MOCK_LEADERBOARD[1], MOCK_LEADERBOARD[0], MOCK_LEADERBOARD[2]].map((entry, displayPos) => {
          const heights = [72, 96, 60];
          const style = RANK_STYLES[entry.rank];
          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: displayPos * 0.12 }}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white mb-2"
                style={{ background: avatarColor(entry.address), boxShadow: `0 0 16px ${style?.glow ?? 'transparent'}` }}
              >
                {entry.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs font-semibold mb-1 truncate max-w-full" style={{ color: 'var(--ink-2)' }}>
                {entry.name}
              </div>
              <div
                className="w-full rounded-t-xl flex flex-col items-center justify-end pb-3"
                style={{
                  height: heights[displayPos],
                  background: style ? `rgba(${entry.rank === 1 ? '245,200,66' : entry.rank === 2 ? '192,200,212' : '205,127,50'},0.1)` : 'var(--surface)',
                  border: `1px solid ${style?.color ?? 'var(--border)'}40`,
                }}
              >
                <div className="tabnum font-bold text-sm" style={{ color: style?.color ?? 'var(--accent)', fontFamily: 'Space Grotesk' }}>
                  #{entry.rank}
                </div>
                <div className="tabnum text-xs" style={{ color: 'var(--muted)' }}>{entry.totalWon.toLocaleString()}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div
          className="grid grid-cols-[40px_1fr_80px_60px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider border-b"
          style={{ color: 'var(--subtle)', borderColor: 'var(--border)' }}
        >
          <div>{t('lb_rank')}</div>
          <div>{t('lb_player')}</div>
          <div className="text-right">{t('lb_won')}</div>
          <div className="text-right">{t('lb_win_rate')}</div>
        </div>
        {MOCK_LEADERBOARD.map((entry, i) => {
          const style = RANK_STYLES[entry.rank];
          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-[40px_1fr_80px_60px] gap-3 px-4 py-3 border-b last:border-0 items-center hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                {entry.rank <= 3
                  ? <Medal size={16} style={{ color: style?.color }} />
                  : <span className="tabnum text-sm font-bold" style={{ color: 'var(--subtle)' }}>{entry.rank}</span>
                }
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: avatarColor(entry.address) }}>
                  {entry.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{entry.name}</div>
                  <div className="mono text-[9px] truncate" style={{ color: 'var(--subtle)' }}>{shortenAddress(entry.address)}</div>
                </div>
                {entry.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold hidden sm:block"
                    style={{ background: `${style?.color}20`, color: style?.color }}>
                    {entry.badge}
                  </span>
                )}
              </div>
              <div className="tabnum text-sm font-bold text-right" style={{ color: 'var(--success)', fontFamily: 'Space Grotesk' }}>
                {entry.totalWon.toLocaleString()}
              </div>
              <div className="text-right">
                <div className="tabnum text-xs font-semibold" style={{ color: entry.winRate >= 50 ? 'var(--success)' : 'var(--muted)' }}>
                  {entry.winRate}%
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Referral */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="mt-6 rounded-2xl p-5 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(56,182,255,0.08), rgba(0,229,255,0.05))', border: '1px solid rgba(56,182,255,0.2)' }}
      >
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('lb_referral_title')}</div>
        <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>{t('lb_referral_body')}</div>
        <button className="btn-primary rounded-xl px-5 py-2 text-xs"
          onClick={() => { toast.success(t('lb_referral_copied')); }}>
          {t('lb_referral_copy')}
        </button>
      </motion.div>
    </div>
  );
}
