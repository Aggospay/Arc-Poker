import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Target, Copy, ExternalLink, User, Pencil, Check, X, Camera, Upload, Bot, Globe, ChevronDown } from 'lucide-react';
import { useArcBalance } from '../hooks/useArcBalance';
import { useAuth } from '../hooks/useAuth';
import { useInternalWallet } from '../hooks/useInternalWallet';
import { useProfileStorage } from '../hooks/useProfileStorage';
import { usePokerAICtx } from '../context/PokerAIContext';
import { useLocaleCtx, SUPPORTED_LOCALES } from '../i18n/LocaleContext';
import type { LocaleInfo } from '../i18n/LocaleContext';
import { shortenAddress, avatarColor } from '../utils/poker';
import { buildAddressExplorerUrl } from '@/onchain-facts';
import { toast } from 'sonner';


const SESSION_HISTORY = [
  { id: 'h1', date: 'Oct 10', table: 'Electric Neon 5/10',  result: 'win'  as const, amount: 145  },
  { id: 'h2', date: 'Oct 10', table: 'ARC Beginners 1/2',   result: 'loss' as const, amount: -40  },
  { id: 'h3', date: 'Oct 9',  table: 'ARC Fast 50 SNG',     result: 'win'  as const, amount: 320  },
  { id: 'h4', date: 'Oct 9',  table: 'Cyber Circuit 25/50', result: 'loss' as const, amount: -200 },
  { id: 'h5', date: 'Oct 8',  table: 'Electric Neon 5/10',  result: 'win'  as const, amount: 88   },
];

export function Profile({ gameBalance: gameBalanceProp }: { gameBalance?: number } = {}) {
  const { isConnected } = useArcBalance();
  const { isLoggedIn, userId, method } = useAuth();
  const sessionMethod = method === 'wallet' ? 'wallet' : 'offline';
  const { state: walletState, cachedAddress, internalBalance } = useInternalWallet({
    sessionUserId: userId ?? undefined,
    sessionMethod,
  });
  // Use userId as the stable identity key for profile storage and avatar color
  const externalAddress = userId ?? undefined;

  // Internal wallet address is the one shown everywhere
  const internalAddress = walletState.status === 'ready' ? walletState.address
    : cachedAddress ?? undefined;

  // Profile is keyed by external address (stable wallet identity)
  const bg = avatarColor(externalAddress ?? 'guest');
  const { displayName, setDisplayName, avatarUrl, setAvatarUrl } = useProfileStorage(externalAddress);

  // ── AI assistant + locale ───────────────────────────────────────────────
  const { enabled: aiEnabled, setEnabled: setAiEnabled } = usePokerAICtx();
  const { locale, setLocale, currentLocale } = useLocaleCtx();
  const [langOpen, setLangOpen] = useState(false);

  // ── Editing state (session only — no persistence needed) ───────────────
  const [editingName, setEditingName] = useState(false);
  const [draftName,   setDraftName]   = useState('');
  const [hovering,    setHovering]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed.length > 0) {
      setDisplayName(trimmed);   // persists to localStorage
      toast.success('Name saved');
    }
    setEditingName(false);
  };

  const cancelName = () => {
    setEditingName(false);
  };

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      // Compress to 150×150 JPEG (~15 KB) so localStorage quota is never exceeded
      const img = new Image();
      img.onload = () => {
        const SIZE = 150;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setAvatarUrl(src); toast.success('Avatar saved'); return; }
        // Centre-crop
        const ratio = Math.min(img.width, img.height);
        const sx = (img.width  - ratio) / 2;
        const sy = (img.height - ratio) / 2;
        ctx.drawImage(img, sx, sy, ratio, ratio, 0, 0, SIZE, SIZE);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        setAvatarUrl(compressed);
        toast.success('Avatar saved');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAvatarFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleAvatarFile(file);
  };

  if (!isLoggedIn && !isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <User size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--accent)' }} />
          <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Connect your wallet</div>
          <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>to view your profile</div>
        </div>
      </div>
    );
  }

  const explorerUrl = internalAddress ? buildAddressExplorerUrl(5042002, internalAddress) : '#';

  return (
    <div className="px-6 py-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="display text-2xl font-bold mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>Profile</h2>

        {/* ── Profile card ──────────────────────────────── */}
        <div className="glass-strong rounded-3xl p-6 mb-6">
          <div className="flex items-start gap-5">

            {/* Avatar with upload overlay */}
            <div className="relative flex-shrink-0">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              <motion.div
                className="relative cursor-pointer select-none"
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ width: 72, height: 72 }}
              >
                {/* Avatar image or fallback */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    style={{
                      width: 72, height: 72, borderRadius: 18,
                      objectFit: 'cover',
                      boxShadow: `0 0 24px ${bg}55`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72, height: 72, borderRadius: 18,
                      background: bg,
                      boxShadow: `0 0 24px ${bg}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 800, color: '#fff',
                    }}
                  >
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Hover overlay */}
                <AnimatePresence>
                  {hovering && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 18,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}
                    >
                      <Camera size={16} color="#fff" />
                      <span style={{ color: '#fff', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>CHANGE</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Upload button badge */}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center rounded-full transition-all"
                style={{
                  width: 24, height: 24,
                  background: 'linear-gradient(135deg,#1a7fd4,#0ea5e9)',
                  border: '2px solid var(--bg)',
                  boxShadow: '0 2px 8px rgba(56,182,255,0.4)',
                  color: '#fff',
                }}
                title="Upload avatar"
              >
                <Upload size={10} />
              </button>
            </div>

            {/* Name + address */}
            <div className="flex-1 min-w-0">
              {/* Editable name row */}
              <div className="flex items-center gap-2 mb-1">
                <AnimatePresence mode="wait">
                  {editingName ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitName();
                          if (e.key === 'Escape') cancelName();
                        }}
                        maxLength={24}
                        className="display font-bold rounded-lg px-2 py-1 text-base outline-none"
                        style={{
                          background: 'rgba(56,182,255,0.08)',
                          border: '1.5px solid var(--accent)',
                          color: 'var(--ink)',
                          width: 160,
                          letterSpacing: '-0.02em',
                        }}
                      />
                      <button
                        onClick={commitName}
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                        style={{ background: 'rgba(61,214,140,0.15)', color: 'var(--success)', border: '1px solid rgba(61,214,140,0.3)' }}
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={cancelName}
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                        style={{ background: 'rgba(240,96,128,0.12)', color: 'var(--danger)', border: '1px solid rgba(240,96,128,0.25)' }}
                      >
                        <X size={13} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2"
                    >
                      <h3 className="display text-lg font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                        {displayName}
                      </h3>
                      <button
                        onClick={() => { setDraftName(displayName); setEditingName(true); /* seed from saved name */ }}
                        className="flex items-center justify-center w-6 h-6 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'rgba(56,182,255,0.10)', color: 'var(--accent)', border: '1px solid rgba(56,182,255,0.22)' }}
                        title="Edit name"
                      >
                        <Pencil size={11} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <span className="mono text-xs" style={{ color: 'var(--muted)' }}>{shortenAddress(internalAddress ?? '')}</span>
                <button
                  onClick={() => { if (internalAddress) { void navigator.clipboard.writeText(internalAddress); toast.success('Copied!'); } }}
                  className="hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--subtle)' }}
                >
                  <Copy size={11} />
                </button>
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70" style={{ color: 'var(--subtle)' }}>
                  <ExternalLink size={11} />
                </a>
              </div>

              {/* Drag-and-drop hint */}
              <div className="mt-2 text-[10px]" style={{ color: 'var(--subtle)' }}>
                Click avatar or drag & drop to change photo
              </div>
            </div>

            {/* Balance */}
            <div className="text-right flex-shrink-0">
              <div className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>Balance</div>
              <div className="usdc-val tabnum text-xl">
                {internalAddress
                  ? (gameBalanceProp !== undefined
                      ? gameBalanceProp.toFixed(2)
                      : internalBalance)
                  : '—'}
                <span className="usdc-label">USDC</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Hands Played', value: '248',        icon: <Target size={13} /> },
            { label: 'Win Rate',     value: '52.4%',      icon: <TrendingUp size={13} /> },
            { label: 'Total Won',    value: '1,420 USDC', icon: <Trophy size={13} /> },
            { label: 'Best Hand',    value: 'Full House', icon: <Trophy size={13} /> },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-3 text-center">
              <div className="flex justify-center mb-1" style={{ color: 'var(--accent)' }}>{s.icon}</div>
              <div className="tabnum font-bold text-sm display" style={{ color: 'var(--ink)' }}>{s.value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--subtle)' }}>{s.label}</div>
            </div>
          ))}
        </div>


        {/* ── Settings: Language + AI ───────────────────── */}
        <div className="glass rounded-2xl p-4 mb-6" style={{ position: 'relative', zIndex: 100, overflow: 'visible' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--subtle)' }}>
            <Globe size={11} style={{ color: 'var(--accent)' }} /> Preferences
          </div>

          {/* Language selector */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Language</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Interface language</div>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
                style={{
                  background: 'rgba(56,182,255,0.08)',
                  border: '1px solid rgba(56,182,255,0.2)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  minWidth: 140,
                  justifyContent: 'space-between',
                }}
              >
                <span>{currentLocale.flag} {currentLocale.nativeName}</span>
                <ChevronDown size={13} style={{ color: 'var(--muted)', transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                      zIndex: 999,
                      width: 220,
                      maxHeight: 320,
                      overflowY: 'auto',
                      borderRadius: 14,
                      background: 'rgba(8,12,28,0.97)',
                      border: '1px solid rgba(56,182,255,0.18)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                      padding: 6,
                    }}
                  >
                    {SUPPORTED_LOCALES.map((l: LocaleInfo) => (
                      <button
                        key={l.code}
                        onClick={() => { setLocale(l.code); setLangOpen(false); toast.success(`Language: ${l.nativeName}`); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                        style={{
                          background: locale === l.code ? 'rgba(56,182,255,0.12)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: locale === l.code ? 'var(--accent)' : 'var(--ink-2)',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{l.flag}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{l.nativeName}</div>
                          <div style={{ fontSize: 10, color: 'var(--subtle)' }}>{l.name}</div>
                        </div>
                        {locale === l.code && <Check size={12} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* AI assistant toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bot size={14} style={{ color: aiEnabled ? 'var(--accent)' : 'var(--subtle)' }} />
                <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>AI Assistant</div>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {aiEnabled ? 'Providing hints during play' : 'Disabled — no hints shown'}
              </div>
            </div>
            <button
              onClick={() => { setAiEnabled(!aiEnabled); toast.success(aiEnabled ? 'AI Assistant disabled' : 'AI Assistant enabled'); }}
              style={{
                width: 48, height: 26, borderRadius: 13,
                background: aiEnabled ? 'linear-gradient(135deg,#1a7fd4,#0ea5e9)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${aiEnabled ? 'rgba(56,182,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <motion.div
                animate={{ x: aiEnabled ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                  position: 'absolute', top: 3,
                  width: 18, height: 18, borderRadius: 9,
                  background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              />
            </button>
          </div>
        </div>

        {/* ── Match history ─────────────────────────────── */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-widest" style={{ borderColor: 'var(--border)', color: 'var(--subtle)' }}>
            Recent Sessions
          </div>
          {SESSION_HISTORY.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between px-4 py-3 border-b last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{row.table}</div>
                <div className="text-[10px]" style={{ color: 'var(--subtle)' }}>{row.date}</div>
              </div>
              <div className="usdc-val tabnum text-sm">
                {row.result === 'win' ? '+' : ''}{row.amount.toFixed(2)}
                <span className="usdc-label">USDC</span>
              </div>
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
