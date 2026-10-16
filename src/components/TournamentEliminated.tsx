/**
 * TournamentEliminated — fullscreen overlay shown when a player busts out.
 * Displays: final rank, prize (if paid), tournament standings, confetti for top 3.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, X, ArrowRight } from 'lucide-react';
import type { Tournament } from '../hooks/useTournament';
import { calcPrizes } from '../hooks/useTournament';

interface Props {
  tournament: Tournament;
  userId:     string;
  onClose:    () => void;
  onLobby:    () => void;
}

// Static confetti data — generated once at module level, not during render
const CONFETTI_PIECES = Array.from({ length: 30 }, (_, i) => {
  const hues = [56, 192, 280, 36, 142];
  return {
    id:       i,
    x:        (i * 37 + 11) % 100,
    delay:    (i * 0.17) % 1.5,
    duration: 3 + (i * 0.13) % 2,
    hue:      hues[i % hues.length],
  };
});

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {CONFETTI_PIECES.map((p) => (
        <motion.div key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: 720 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ background: `hsl(${p.hue},80%,60%)`, top: 0, left: 0 }}
        />
      ))}
    </div>
  );
}

function Rank1Badge() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 }}
      className="relative"
    >
      <div className="w-32 h-32 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg,#d97706,#fbbf24,#f59e0b)',
          boxShadow: '0 0 60px rgba(251,191,36,0.6), 0 0 120px rgba(251,191,36,0.25)',
        }}>
        <Trophy size={56} color="#0c1525" strokeWidth={2} />
      </div>
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full"
        style={{ border: '2px solid rgba(251,191,36,0.5)' }}
      />
    </motion.div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const color = rank === 2 ? '#b8bcc8' : rank === 3 ? '#cd7c3a' : 'var(--accent)';
  const bg    = rank === 2 ? 'rgba(180,180,200,0.15)' : rank === 3 ? 'rgba(180,100,50,0.15)' : 'rgba(56,182,255,0.15)';
  const glow  = rank === 2 ? '0 0 40px rgba(180,180,200,0.2)' : rank === 3 ? '0 0 40px rgba(180,100,50,0.2)' : '0 0 40px rgba(56,182,255,0.25)';
  return (
    <motion.div
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.3 }}
      className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
      style={{ background: bg, border: `2px solid ${color}`, boxShadow: glow }}>
      <span className="text-3xl font-black tabnum" style={{ color }}>{rank}</span>
      <span className="text-[10px] font-semibold" style={{ color }}>
        {rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
      </span>
    </motion.div>
  );
}

export function TournamentEliminated({ tournament, userId, onClose, onLobby }: Props) {
  const [showStandings, setShowStandings] = useState(false);

  const me     = tournament.players.find((p) => p.userId === userId);
  const rank   = me?.rank ?? tournament.players.length;
  const total  = tournament.players.length;
  const prizes = calcPrizes(tournament.prizePool, total);
  const myPrize = prizes.find((p) => p.place === rank);
  const isWinner = rank === 1;
  const isPaid   = !!myPrize;

  // Sorted standings: rank 1 first, then ascending, non-ranked last
  const standings = [...tournament.players].sort((a, b) => {
    if (a.rank === null && b.rank === null) return a.joinedAt - b.joinedAt;
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  });

  useEffect(() => {
    // auto-show standings after 4s
    const t = setTimeout(() => setShowStandings(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 300, background: 'rgba(4,9,22,0.96)', backdropFilter: 'blur(20px)' }}
      >
        {isWinner && <Confetti />}

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--muted)' }}>
          <X size={18} />
        </button>

        <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm w-full">
          {/* Badge */}
          {isWinner ? <Rank1Badge /> : <RankBadge rank={rank} />}

          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {isWinner ? (
              <>
                <div className="text-4xl font-black mb-1" style={{ color: '#fbbf24', letterSpacing: '-0.04em' }}>
                  Champion! 🏆
                </div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  You won <span className="font-bold" style={{ color: '#fbbf24' }}>{tournament.name}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl font-black mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
                  {rank === 2 ? '🥈' : rank === 3 ? '🥉' : '💀'} {rank}{ordinal(rank)} Place
                </div>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  Out of <span className="font-semibold tabnum" style={{ color: 'var(--ink)' }}>{total}</span> players in{' '}
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>{tournament.name}</span>
                </div>
              </>
            )}
          </motion.div>

          {/* Prize */}
          {isPaid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full rounded-2xl px-6 py-4"
              style={{ background: 'linear-gradient(135deg,rgba(61,214,140,0.12),rgba(61,214,140,0.05))', border: '1px solid rgba(61,214,140,0.25)' }}
            >
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#3dd68c' }}>
                Prize Awarded
              </div>
              <div className="text-3xl font-black tabnum" style={{ color: '#3dd68c', letterSpacing: '-0.04em' }}>
                ${myPrize.amount.toLocaleString()} USDC
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                Automatically sent to your internal wallet
              </div>
            </motion.div>
          )}

          {!isPaid && !isWinner && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="w-full rounded-2xl px-5 py-3 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)' }}
            >
              No prize this time — top {Math.max(1, Math.round(total * 0.15))} of {total} finish in the money
            </motion.div>
          )}

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
            className="w-full grid grid-cols-3 gap-2"
          >
            {[
              { label: 'Final Rank',    value: `#${rank}`,                 sub: `of ${total}` },
              { label: 'Starting Stack', value: tournament.startingChips.toLocaleString(), sub: 'chips' },
              { label: 'Buy-In',        value: `$${tournament.buyIn}`,     sub: 'USDC' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</div>
                <div className="text-sm font-bold tabnum mt-0.5" style={{ color: 'var(--ink)' }}>{value}</div>
                <div className="text-[10px]" style={{ color: 'var(--subtle)' }}>{sub}</div>
              </div>
            ))}
          </motion.div>

          {/* Standings toggle */}
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            onClick={() => setShowStandings((s) => !s)}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            <Target size={12} />
            {showStandings ? 'Hide standings' : 'View tournament standings'}
          </motion.button>

          <AnimatePresence>
            {showStandings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full overflow-hidden rounded-2xl"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {standings.map((p, i) => {
                    const isMe = p.userId === userId;
                    return (
                      <div key={p.userId} className="flex items-center gap-3 px-4 py-2.5"
                        style={{
                          borderBottom: i < standings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                          background: isMe ? 'rgba(56,182,255,0.08)' : 'transparent',
                        }}>
                        <span className="text-xs font-bold tabnum w-5 text-right flex-shrink-0"
                          style={{ color: p.rank === 1 ? '#fbbf24' : p.rank === 2 ? '#b8bcc8' : p.rank === 3 ? '#cd7c3a' : 'var(--subtle)' }}>
                          {p.rank ?? '—'}
                        </span>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(56,182,255,0.15)', color: 'var(--accent)' }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-xs truncate" style={{ color: isMe ? 'var(--accent)' : 'var(--ink)' }}>
                          {p.name}{isMe ? ' (you)' : ''}
                        </span>
                        {prizes.find((pr) => pr.place === p.rank) && (
                          <span className="text-xs font-bold tabnum" style={{ color: '#3dd68c' }}>
                            ${prizes.find((pr) => pr.place === p.rank)!.amount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}
            className="w-full flex gap-3"
          >
            <button onClick={onLobby}
              className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg,rgba(56,182,255,0.18),rgba(56,182,255,0.08))',
                border: '1px solid rgba(56,182,255,0.3)',
                color: 'var(--accent)',
              }}>
              <ArrowRight size={15} /> Back to Lobby
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
