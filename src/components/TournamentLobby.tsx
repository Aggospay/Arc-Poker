/**
 * TournamentLobby — waiting room and live tournament view.
 * Shows participant list, prize pool, blind structure, start/leave controls.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Users, Clock, Copy, Lock, Play, ChevronDown, ChevronUp, Crown, Link2, Check } from 'lucide-react';
import type { Tournament, TournamentPlayer } from '../hooks/useTournament';
import { calcPrizes } from '../hooks/useTournament';
import { toast } from 'sonner';
import { useLocaleCtx } from '../i18n/LocaleContext';

interface Props {
  tournament:  Tournament;
  currentUserId: string | undefined;
  onStart:     () => void;
  onLeave:     () => void;
  onClose:     () => void;
}

function PlayerRow({ p, rank, isMe, isHost }: { p: TournamentPlayer; rank: number; isMe: boolean; isHost: boolean }) {
  const eliminated = p.chips === 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
      style={{
        background: isMe ? 'rgba(56,182,255,0.1)' : 'rgba(255,255,255,0.03)',
        border: isMe ? '1px solid rgba(56,182,255,0.25)' : '1px solid transparent',
        opacity: eliminated ? 0.45 : 1,
      }}
    >
      {/* Rank badge */}
      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold tabnum flex-shrink-0"
        style={{
          background: rank === 1 ? 'rgba(251,191,36,0.2)' : rank === 2 ? 'rgba(180,180,200,0.15)' : rank === 3 ? 'rgba(180,100,50,0.15)' : 'rgba(255,255,255,0.06)',
          color: rank === 1 ? '#fbbf24' : rank === 2 ? '#b8bcc8' : rank === 3 ? '#cd7c3a' : 'var(--muted)',
        }}>
        {rank}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,rgba(56,182,255,0.3),rgba(56,182,255,0.1))', color: 'var(--accent)', border: '1.5px solid rgba(56,182,255,0.3)' }}>
        {p.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate" style={{ color: isMe ? 'var(--accent)' : 'var(--ink)' }}>
            {p.name}
          </span>
          {isHost && <Crown size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />}
          {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(56,182,255,0.18)', color: 'var(--accent)' }}>You</span>}
        </div>
        {eliminated && <div className="text-[10px]" style={{ color: '#ef4444' }}>Eliminated</div>}
      </div>

      {/* Chips */}
      <div className="text-xs font-bold tabnum" style={{ color: eliminated ? 'var(--subtle)' : '#3dd68c' }}>
        {eliminated ? '—' : p.chips.toLocaleString()}
      </div>
    </motion.div>
  );
}

export function TournamentLobby({ tournament, currentUserId, onStart, onLeave, onClose }: Props) {
  const { t }                         = useLocaleCtx();
  const [showPrizes,  setShowPrizes]  = useState(false);
  const [showBlinds,  setShowBlinds]  = useState(false);
  const [copiedCode,  setCopiedCode]  = useState(false);
  const [copiedLink,  setCopiedLink]  = useState(false);

  const isHost        = tournament.hostId === (currentUserId ?? 'anon');
  const me            = tournament.players.find((p) => p.userId === (currentUserId ?? 'anon'));
  const activePlayers = tournament.players.filter((p) => p.chips > 0);
  const eliminated    = tournament.players.filter((p) => p.chips === 0);
  const prizes        = calcPrizes(tournament.prizePool, tournament.players.length);
  const currentBlind  = tournament.blindLevels[tournament.currentLevel];
  const canStart      = isHost && tournament.status === 'registering' && tournament.players.length >= tournament.minPlayers;
  const isPrivate     = Boolean(tournament.password);
  const directLink    = `${window.location.origin}${window.location.pathname}?tourney=${tournament.id}`;

  const copyCode = () => {
    void navigator.clipboard.writeText(tournament.id).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success(t('room_code_copied'));
    });
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(directLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success(t('room_link_copied'));
    });
  };

  // Sort: active first (by join order), then eliminated
  const sortedPlayers = [
    ...tournament.players.filter((p) => p.chips > 0).sort((a, b) => a.joinedAt - b.joinedAt),
    ...tournament.players.filter((p) => p.chips === 0).sort((a, b) => (b.eliminatedAt ?? 0) - (a.eliminatedAt ?? 0)),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ zIndex: 200, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(145deg,#0c1525,#07101e)',
          border: '1px solid rgba(251,191,36,0.2)',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.6)',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.22),rgba(251,191,36,0.08))', border: '1px solid rgba(251,191,36,0.3)' }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} />
            </div>
            <div className="min-w-0">
              <h2 className="display text-lg font-bold truncate" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                {tournament.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: tournament.status === 'registering' ? 'rgba(56,182,255,0.15)' : tournament.status === 'running' ? 'rgba(61,214,140,0.15)' : 'rgba(255,255,255,0.08)',
                    color: tournament.status === 'registering' ? 'var(--accent)' : tournament.status === 'running' ? '#3dd68c' : 'var(--muted)',
                  }}>
                  {tournament.status === 'registering' ? '⏳ Registering' : tournament.status === 'running' ? '🟢 Running' : '✅ Finished'}
                </span>
                {tournament.password && <Lock size={10} style={{ color: 'var(--muted)' }} />}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 px-6 pb-4 flex-shrink-0">
          {[
            { label: 'Players',    value: `${tournament.players.length} / ${tournament.maxPlayers}`, icon: <Users size={13} /> },
            { label: 'Prize Pool', value: `$${tournament.prizePool.toLocaleString()} USDC`,          icon: <Trophy size={13} /> },
            { label: 'Buy-In',     value: `$${tournament.buyIn} USDC`,                              icon: <Clock size={13} /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-2xl px-3 py-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color: 'var(--muted)' }}>
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <div className="text-xs font-bold tabnum" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Invite section (registering only) */}
        {tournament.status === 'registering' && (
          <div className="mx-6 mb-4 space-y-2 flex-shrink-0">
            {/* Room code — always shown */}
            <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted)' }}>
                  {t('room_code_label')}
                </div>
                <div className="text-2xl font-black tracking-[0.15em] tabnum" style={{ color: '#fbbf24', letterSpacing: '0.2em' }}>
                  {tournament.id}
                </div>
              </div>
              <button onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                {copiedCode ? <Check size={12} color="#3dd68c" /> : <Copy size={12} />}
                {copiedCode ? t('room_code_copied') : 'Copy'}
              </button>
            </div>

            {/* Direct link — always shown */}
            <div className="rounded-2xl px-4 py-3"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Link2 size={11} style={{ color: '#818cf8' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#818cf8' }}>
                      {t('room_direct_link')}
                    </span>
                  </div>
                  <div className="text-xs truncate font-mono" style={{ color: 'var(--muted)' }}>{directLink}</div>
                </div>
                <button onClick={copyLink}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                  {copiedLink ? <Check size={12} color="#3dd68c" /> : <Copy size={12} />}
                  {copiedLink ? t('room_link_copied') : t('room_copy_link')}
                </button>
              </div>
            </div>

            <div className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
              {isPrivate
                ? <>{t('room_private_note')}<span style={{ color: '#f5c842' }}> {t('room_password_note')}</span></>
                : t('room_public_note')
              }
            </div>
          </div>
        )}

        {/* Collapsible sections */}
        <div className="px-6 space-y-2 flex-shrink-0">
          {/* Prize breakdown */}
          <button onClick={() => setShowPrizes((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}>
            <span className="flex items-center gap-1.5"><Trophy size={12} /> Prize Breakdown</span>
            {showPrizes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <AnimatePresence>
            {showPrizes && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(251,191,36,0.12)' }}>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {prizes.slice(0, 6).map((p) => (
                    <div key={p.place} className="flex justify-between items-center px-4 py-2 text-xs">
                      <span style={{ color: p.place <= 3 ? '#fbbf24' : 'var(--muted)' }}>{p.label}</span>
                      <span className="font-bold tabnum" style={{ color: '#3dd68c' }}>${p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {prizes.length > 6 && (
                    <div className="px-4 py-2 text-xs" style={{ color: 'var(--subtle)' }}>+ {prizes.length - 6} more paid positions</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Blind structure */}
          <button onClick={() => setShowBlinds((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(56,182,255,0.05)', border: '1px solid rgba(56,182,255,0.15)', color: 'var(--accent)' }}>
            <span className="flex items-center gap-1.5"><Clock size={12} /> Blind Structure (Level {tournament.currentLevel + 1}/{tournament.blindLevels.length})</span>
            {showBlinds ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <AnimatePresence>
            {showBlinds && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(56,182,255,0.12)' }}>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {tournament.blindLevels.map((l) => (
                    <div key={l.level} className="flex items-center justify-between px-4 py-2 text-xs"
                      style={{ background: l.level === tournament.currentLevel + 1 ? 'rgba(56,182,255,0.08)' : 'transparent' }}>
                      <span style={{ color: 'var(--muted)' }}>
                        {l.level === tournament.currentLevel + 1 && <span className="text-[#38b6ff] font-bold">▶ </span>}
                        Level {l.level} ({l.duration}min)
                      </span>
                      <span className="font-bold tabnum" style={{ color: 'var(--ink)' }}>{l.smallBlind}/{l.bigBlind}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-2 space-y-1.5 min-h-0" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Players ({tournament.players.length})
            </div>
            {activePlayers.length < tournament.players.length && (
              <div className="text-xs" style={{ color: '#ef4444' }}>
                {eliminated.length} eliminated
              </div>
            )}
          </div>
          {sortedPlayers.map((p, i) => (
            <PlayerRow key={p.userId} p={p} rank={i + 1}
              isMe={p.userId === (currentUserId ?? 'anon')}
              isHost={p.userId === tournament.hostId} />
          ))}
          {tournament.status === 'registering' && tournament.players.length < tournament.maxPlayers && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: '1.5px dashed rgba(255,255,255,0.2)' }}>
                <Users size={13} style={{ color: 'var(--muted)' }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                Waiting for {tournament.maxPlayers - tournament.players.length} more player{tournament.maxPlayers - tournament.players.length !== 1 ? 's' : ''}…
              </span>
            </div>
          )}
        </div>

        {/* Current blind display */}
        {tournament.status === 'running' && currentBlind && (
          <div className="mx-6 mb-4 rounded-xl px-4 py-2.5 flex items-center justify-between flex-shrink-0"
            style={{ background: 'rgba(56,182,255,0.07)', border: '1px solid rgba(56,182,255,0.15)' }}>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>Level {tournament.currentLevel + 1}</span> — Blinds
            </div>
            <div className="text-sm font-bold tabnum" style={{ color: 'var(--ink)' }}>
              {currentBlind.smallBlind} / {currentBlind.bigBlind}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {currentBlind.duration} min
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3 flex-shrink-0">
          {canStart ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#d97706,#fbbf24)', color: '#0c1525', boxShadow: '0 4px 24px rgba(251,191,36,0.3)' }}>
              <Play size={15} /> Start Tournament
            </motion.button>
          ) : tournament.status === 'registering' && !isHost ? (
            <div className="flex-1 py-3 rounded-2xl text-xs text-center font-semibold"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              Waiting for host to start… ({tournament.players.length}/{tournament.minPlayers} min)
            </div>
          ) : null}
          {me && (
            <button onClick={onLeave}
              className="px-4 py-3.5 rounded-2xl font-semibold text-sm"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
              {isHost && tournament.status === 'registering' ? 'Cancel' : 'Leave'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
