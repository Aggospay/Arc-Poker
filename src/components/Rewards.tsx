import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Trophy, Calendar, Users, CheckCircle2, Clock } from 'lucide-react';
import type { Reward } from '../types/poker';
import { formatUsdc } from '../utils/poker';
import { toast } from 'sonner';
import { useArcBalance } from '../hooks/useArcBalance';
import { useLocaleCtx } from '../i18n/LocaleContext';

const TYPE_COLOR: Record<Reward['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  tournament:  { icon: <Trophy size={14} />,       color: '#f5c842', bg: 'rgba(245,200,66,0.1)'  },
  daily:       { icon: <Calendar size={14} />,     color: '#38b6ff', bg: 'rgba(56,182,255,0.1)'  },
  achievement: { icon: <CheckCircle2 size={14} />, color: '#3dd68c', bg: 'rgba(61,214,140,0.1)'  },
  referral:    { icon: <Users size={14} />,        color: '#a855f7', bg: 'rgba(168,85,247,0.1)'  },
};

const MOCK_REWARDS: Reward[] = [
  { id: 'r1', title: 'Daily Login Bonus',       description: 'Log in every day to earn bonus USDC.',        amount: 5,   currency: 'USDC', expiry: '18h',    claimed: false, type: 'daily'       },
  { id: 'r2', title: 'ARC Fast 50 — 2nd Place', description: 'Tournament prize for finishing 2nd.',          amount: 120, currency: 'USDC', expiry: 'Now',    claimed: false, type: 'tournament'  },
  { id: 'r3', title: 'First Deposit Bonus',      description: '100% match on your first deposit up to 50.',  amount: 50,  currency: 'USDC', expiry: '3d',     claimed: false, type: 'achievement' },
  { id: 'r4', title: 'Referral — ArcAngel',      description: 'Your referral ArcAngel reached level 5.',     amount: 20,  currency: 'USDC', expiry: 'Now',    claimed: false, type: 'referral'    },
  { id: 'r5', title: 'Weekly Cash Back',         description: '5% cashback on losses this week.',            amount: 30,  currency: 'USDC', expiry: '2d',     claimed: true,  type: 'daily'       },
  { id: 'r6', title: 'Royal Flush Achievement',  description: 'Hit a Royal Flush at a live table.',          amount: 200, currency: 'USDC', expiry: 'Oct 8',  claimed: true,  type: 'achievement' },
];

export function Rewards() {
  const { isConnected } = useArcBalance();
  const { t } = useLocaleCtx();
  const [rewards, setRewards] = useState(MOCK_REWARDS);

  const unclaimed    = rewards.filter((r) => !r.claimed);
  const claimed      = rewards.filter((r) => r.claimed);
  const totalPending = unclaimed.reduce((s, r) => s + r.amount, 0);

  function claim(id: string) {
    setRewards((prev) => prev.map((r) => r.id === id ? { ...r, claimed: true } : r));
    toast.success(t('success'));
  }

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Gift size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--accent)' }} />
          <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{t('connect_wallet')}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t('rew_subtitle')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              {t('rew_title')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {unclaimed.length} {t('rew_available')}
            </p>
          </div>
          {totalPending > 0 && (
            <div
              className="px-4 py-2 rounded-xl text-center"
              style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)' }}
            >
              <div className="text-[10px] uppercase tracking-wider" style={{ color: '#f5c842' }}>
                {t('rew_total_claimable')}
              </div>
              <div className="tabnum font-bold text-lg" style={{ color: '#f5c842', fontFamily: 'Space Grotesk' }}>
                {formatUsdc(totalPending)} USDC
              </div>
            </div>
          )}
        </div>

        {/* Unclaimed */}
        {unclaimed.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--subtle)' }}>
              {t('rew_available')}
            </h3>
            <div className="space-y-3">
              {unclaimed.map((r, i) => {
                const meta = TYPE_COLOR[r.type];
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-strong rounded-2xl p-4 flex items-center gap-4"
                    style={{ border: `1px solid ${meta.color}30` }}
                  >
                    <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{r.title}</span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{r.description}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: 'var(--subtle)' }}>
                        <Clock size={9} /> {t('rew_expires')}: {r.expiry}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="tabnum font-bold text-base" style={{ color: '#f5c842', fontFamily: 'Space Grotesk' }}>
                        +{formatUsdc(r.amount)}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => claim(r.id)}
                        className="btn-primary rounded-xl px-4 py-1.5 text-xs"
                      >
                        {t('rew_claim')}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Claimed */}
        {claimed.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--subtle)' }}>
              {t('rew_claimed')}
            </h3>
            <div className="space-y-2">
              {claimed.map((r) => {
                const meta = TYPE_COLOR[r.type];
                return (
                  <div key={r.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3 opacity-50">
                    <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--ink-2)' }}>{r.title}</div>
                      <div className="text-[10px]" style={{ color: 'var(--subtle)' }}>{r.expiry}</div>
                    </div>
                    <div className="tabnum text-sm font-bold" style={{ color: 'var(--success)', fontFamily: 'Space Grotesk' }}>
                      +{formatUsdc(r.amount)} USDC
                    </div>
                    <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
