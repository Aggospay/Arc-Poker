/**
 * PrivateLobbyRoom — waiting room, password prompt, join-by-code.
 * - Public rooms: show only a direct link (no Room Code field)
 * - Private (password) rooms: show both Room Code + direct link
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Lock, Users, Play, LogOut,
  Crown, Clock, Eye, EyeOff, Link2,
} from 'lucide-react';
import type { PrivateRoom } from '../hooks/usePrivateLobby';
import { toast } from 'sonner';
import { useLocaleCtx } from '../i18n/LocaleContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function makeDirectLink(code: string) {
  return `${window.location.origin}${window.location.pathname}?join=${code}`;
}

// ── Password prompt ──────────────────────────────────────────────────────────
interface PasswordPromptProps {
  room:     PrivateRoom;
  onSubmit: (pwd: string) => void;
  onCancel: () => void;
}
export function PasswordPrompt({ room, onSubmit, onCancel }: PasswordPromptProps) {
  const { t } = useLocaleCtx();
  const [pwd, setPwd]     = useState('');
  const [show, setShow]   = useState(false);
  const [error, setError] = useState('');

  const tryJoin = () => {
    if (!pwd.trim()) { setError(t('auth_enter_email')); return; }
    onSubmit(pwd.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 210, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: '#0d1628', border: '1px solid rgba(99,102,241,0.28)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,200,66,0.12)' }}>
            <Lock size={18} color="#f5c842" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{room.name}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Password required to join</div>
          </div>
        </div>

        <div className="relative mb-3">
          <input
            type={show ? 'text' : 'password'}
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && tryJoin()}
            placeholder="Enter password…"
            className="w-full px-4 pr-10 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: `1px solid ${error ? '#f06080' : 'var(--border)'}`, color: 'var(--ink)' }}
            autoFocus
          />
          <button onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--subtle)' }}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        {error && <p className="text-xs mb-3" style={{ color: '#f06080' }}>{error}</p>}

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            {t('btn_cancel')}
          </button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={tryJoin}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Join
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Waiting room ─────────────────────────────────────────────────────────────
interface WaitingRoomProps {
  room:          PrivateRoom;
  currentUserId: string;
  currentName:   string;
  onStart:       () => void;
  onLeave:       () => void;
}

export function PrivateLobbyWaiting({ room, currentUserId, currentName, onStart, onLeave }: WaitingRoomProps) {
  const { t } = useLocaleCtx();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mountedAt]                 = useState(() => Date.now());

  const isHost    = room.hostId === currentUserId;
  const canStart  = room.players.length >= 2;
  const isPrivate = Boolean(room.password);
  const directLink = makeDirectLink(room.id);

  const copyCode = () => {
    navigator.clipboard.writeText(room.id).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success(t('room_code_copied'));
    }).catch(() => toast.error('Could not copy'));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(directLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success(t('room_link_copied'));
    }).catch(() => toast.error('Could not copy'));
  };

  const playerSlots = Array.from({ length: room.maxPlayers }, (_, i) => {
    const uid = room.players[i];
    if (!uid) return null;
    const isMe      = uid === currentUserId;
    const isRoomHost = uid === room.hostId;
    return { uid, name: isMe ? currentName : (isRoomHost ? room.hostName : `Player ${i + 1}`), isMe, isRoomHost };
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const elapsed    = Math.floor((now - mountedAt) / 1000);
  const elapsedStr = elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 200, background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(150deg,#0c1425,#060c1a)',
          border: '1px solid rgba(99,102,241,0.22)',
          boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(99,102,241,0.10)', background: 'rgba(99,102,241,0.03)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="display text-xl font-bold truncate" style={{ color: 'var(--ink)' }}>{room.name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs tabnum" style={{ color: 'var(--muted)' }}>
                  {room.smallBlind}/{room.bigBlind} USDC · min {room.minBuyIn} USDC
                </span>
                {isPrivate && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ background: 'rgba(245,200,66,0.10)', color: '#f5c842' }}>
                    <Lock size={9} /> Protected
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--subtle)' }}>
                  <Clock size={9} /> Created {elapsedStr}
                </span>
              </div>
            </div>

            {/* Room Code — always shown */}
            <div className="flex-shrink-0 text-center">
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--subtle)' }}>
                {t('room_code_label')}
              </div>
              <button onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <span className="display font-black text-lg tracking-widest tabnum" style={{ color: '#818cf8', letterSpacing: '0.15em' }}>
                  {room.id}
                </span>
                {copiedCode ? <Check size={14} color="#3dd68c" /> : <Copy size={14} style={{ color: 'var(--muted)' }} />}
              </button>
            </div>
          </div>
        </div>

        {/* Player grid */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Players {room.players.length}/{room.maxPlayers}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {playerSlots.map((slot, i) => (
              <div key={i}
                className="rounded-2xl p-3 flex flex-col items-center gap-2 transition-all"
                style={{
                  background: slot ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${slot ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.06)'}`,
                  minHeight: 80,
                }}>
                {slot ? (
                  <>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold relative"
                      style={{ background: slot.isMe ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)', color: slot.isMe ? '#818cf8' : 'var(--muted)' }}>
                      {slot.name.slice(0, 2).toUpperCase()}
                      {slot.isRoomHost && <Crown size={10} color="#f5c842" className="absolute -top-1 -right-1" />}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold truncate max-w-[80px]"
                        style={{ color: slot.isMe ? '#818cf8' : 'var(--ink)' }}>
                        {slot.isMe ? 'You' : slot.name}
                      </div>
                      {slot.isRoomHost && <div className="text-[10px]" style={{ color: '#f5c842' }}>Host</div>}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
                      <Users size={14} style={{ color: 'var(--subtle)' }} />
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--subtle)' }}>Waiting…</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Invite section ── */}
          <div className="mt-4 space-y-2">
            {/* Direct link — always shown */}
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Link2 size={11} style={{ color: '#818cf8' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#818cf8' }}>
                      {t('room_direct_link')}
                    </span>
                  </div>
                  <div className="text-xs truncate font-mono" style={{ color: 'var(--muted)' }}>
                    {directLink}
                  </div>
                </div>
                <button onClick={copyLink}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                  {copiedLink ? <Check size={12} color="#3dd68c" /> : <Copy size={12} />}
                  {copiedLink ? t('room_link_copied') : t('room_copy_link')}
                </button>
              </div>
            </div>

            {/* Note */}
            <div className="text-xs text-center px-2" style={{ color: 'var(--subtle)' }}>
              {isPrivate
                ? <>{t('room_private_note')}<span style={{ color: '#f5c842' }}>{t('room_password_note')}</span></>
                : t('room_public_note')
              }
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onLeave}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            <LogOut size={14} /> Leave
          </button>

          {isHost && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={onStart} disabled={!canStart}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: canStart ? 'linear-gradient(135deg,#4f52e8,#818cf8)' : 'var(--surface)',
                color: canStart ? '#fff' : 'var(--subtle)',
                border: canStart ? 'none' : '1px solid var(--border)',
                boxShadow: canStart ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
                cursor: canStart ? 'pointer' : 'not-allowed',
              }}>
              <Play size={14} />
              {canStart ? 'Start Game' : `Need ${2 - room.players.length} more player${room.players.length < 1 ? 's' : ''}`}
            </motion.button>
          )}

          {!isHost && (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm" style={{ color: 'var(--muted)' }}>
              <Clock size={13} className="animate-pulse" />
              Waiting for host to start…
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Join by code ─────────────────────────────────────────────────────────────
interface JoinByCodeProps {
  onJoin:   (code: string) => void;
  onCancel: () => void;
}
export function JoinByCodeModal({ onJoin, onCancel }: JoinByCodeProps) {
  const { t } = useLocaleCtx();
  const [code, setCode] = useState('');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 210, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <motion.div
          initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }}
          className="w-full max-w-xs rounded-3xl p-6"
          style={{ background: '#0d1628', border: '1px solid rgba(99,102,241,0.28)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        >
          <h2 className="display font-bold text-lg mb-1" style={{ color: 'var(--ink)' }}>Join by Code</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Enter the 6-character room code</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && code.length >= 3 && onJoin(code)}
            placeholder="XXXXXX"
            className="w-full text-center px-4 py-3 rounded-xl text-2xl font-black outline-none tracking-widest tabnum mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: '#818cf8', letterSpacing: '0.2em' }}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              {t('btn_cancel')}
            </button>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => code.length >= 3 && onJoin(code)}
              disabled={code.length < 3}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: code.length >= 3 ? '#6366f1' : 'var(--surface)', color: code.length >= 3 ? '#fff' : 'var(--subtle)' }}>
              Join
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
