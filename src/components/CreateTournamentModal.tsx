/**
 * CreateTournamentModal — lepoker.io-inspired step wizard for tournament creation.
 * Step 1: Format + name
 * Step 2: Players + buy-in + chips
 * Step 3: Structure + privacy + confirm
 */
import { useState } from 'react';
import { useLocaleCtx } from '../i18n/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Trophy, Lock, Unlock, Users, Eye, EyeOff,
  ChevronRight, ChevronLeft, Check, Zap, Crown, Timer,
} from 'lucide-react';
import { calcPrizes } from '../hooks/useTournament';

const PLAYER_PRESETS = [4, 8, 16, 32, 64, 128, 256, 500];
const BUYIN_PRESETS  = [5, 10, 25, 50, 100, 200, 500, 1000];
const CHIPS_PRESETS  = [1_000, 2_000, 5_000, 10_000, 25_000, 50_000];

const FORMATS = [
  { id: 'knockout',  icon: <Zap size={18} />,   label: 'Knockout (KO)',    desc: 'Bounty on every player — earn chips when you eliminate someone', color: '#f59e0b' },
  { id: 'freezeout', icon: <Trophy size={18} />, label: 'Freezeout',        desc: 'Classic elimination — lose your chips and you\'re out',          color: '#6366f1' },
  { id: 'rebuy',     icon: <Crown size={18} />,  label: 'Rebuy',            desc: 'Buy back in until the rebuy period ends',                        color: '#10b981' },
  { id: 'turbo',     icon: <Timer size={18} />,  label: 'Turbo',            desc: 'Fast blind levels — quick games under 60 minutes',               color: '#e879f9' },
];

const LEVEL_STRUCTURES: Record<string, { label: string; duration: number }[]> = {
  standard: [
    { label: '10 min', duration: 10 }, { label: '15 min', duration: 15 },
    { label: '20 min', duration: 20 }, { label: '30 min', duration: 30 },
  ],
  turbo: [
    { label: '4 min', duration: 4 }, { label: '6 min', duration: 6 },
    { label: '8 min', duration: 8 }, { label: '10 min', duration: 10 },
  ],
};

interface Props {
  open:     boolean;
  onClose:  () => void;
  onCreate: (opts: {
    name: string; password: string; maxPlayers: number;
    buyIn: number; startingChips: number;
  }) => void;
  hostName: string;
}

export function CreateTournamentModal({ open, onClose, onCreate, hostName }: Props) {
  const [step,          setStep]      = useState(0);
  const [format,        setFormat]    = useState('freezeout');
  const [name,          setName]      = useState('');
  const [maxPlayers,    setMaxP]      = useState(16);
  const [customPlayers, setCustomP]   = useState('');
  const [useCustomP,    setUseCP]     = useState(false);
  const [buyIn,         setBuyIn]     = useState(25);
  const [customBuyIn,   setCustomBI]  = useState('');
  const [useCustomBI,   setUseCBI]    = useState(false);
  const [startChips,    setChips]     = useState(5_000);
  const [levelDur,      setLevelDur]  = useState(15);
  const [usePassword,   setUsePwd]    = useState(false);
  const [password,      setPwd]       = useState('');
  const [showPwd,       setShowPwd]   = useState(false);

  const effPlayers = useCustomP ? Math.min(500, Math.max(4, parseInt(customPlayers) || 4)) : maxPlayers;
  const effBuyIn   = useCustomBI ? Math.max(1, parseFloat(customBuyIn) || 1) : buyIn;
  const prizePool  = effPlayers * effBuyIn;
  const prizes     = calcPrizes(prizePool, effPlayers);
  const isTurbo    = format === 'turbo';
  const levelOpts  = isTurbo ? LEVEL_STRUCTURES.turbo : LEVEL_STRUCTURES.standard;
  const tourName   = name.trim() || `${hostName}'s Tournament`;

  const { t } = useLocaleCtx();
  const steps = [t('create_step_format'), t('create_step_players'), t('create_step_structure')];

  const handleCreate = () => {
    onCreate({ name: tourName, password: usePassword ? password : '', maxPlayers: effPlayers, buyIn: effBuyIn, startingChips: startChips });
    setStep(0); setName(''); setPwd(''); setUsePwd(false);
    setMaxP(16); setUseCP(false); setBuyIn(25); setUseCBI(false); setChips(5_000);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="w-full max-w-lg rounded-3xl flex flex-col"
            style={{
              background: 'linear-gradient(160deg,#0f1b2e,#080e1c)',
              border: '1px solid rgba(251,191,36,0.25)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.85), 0 0 60px rgba(251,191,36,0.06)',
              maxHeight: '92vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)' }}>
                  <Trophy size={16} style={{ color: '#fbbf24' }} />
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{t('create_tournament_title')}</h2>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('create_tournament_subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'var(--muted)' }}>
                <X size={15} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center px-6 pt-4 pb-2 flex-shrink-0">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                      style={{
                        background: i < step ? '#f59e0b' : i === step ? 'rgba(251,191,36,0.22)' : 'var(--surface)',
                        border: `1.5px solid ${i <= step ? '#f59e0b' : 'var(--border)'}`,
                        color: i < step ? '#0c1525' : i === step ? '#fbbf24' : 'var(--subtle)',
                      }}>
                      {i < step ? <Check size={11} /> : i + 1}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: i === step ? 'var(--ink)' : 'var(--subtle)' }}>{s}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="h-px flex-1 mx-3" style={{ background: i < step ? '#f59e0b' : 'var(--border)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="px-6 pb-2 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <AnimatePresence mode="wait">

                {/* STEP 0 — Format + name */}
                {step === 0 && (
                  <motion.div key="s0"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }} className="space-y-5 py-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        Tournament Format
                      </label>
                      <div className="space-y-2">
                        {FORMATS.map((f) => (
                          <button key={f.id} onClick={() => setFormat(f.id)}
                            className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
                            style={{
                              background: format === f.id ? `rgba(${f.id === 'knockout' ? '245,158,11' : f.id === 'freezeout' ? '99,102,241' : f.id === 'rebuy' ? '16,185,129' : '232,121,249'},0.12)` : 'var(--surface)',
                              border: `1.5px solid ${format === f.id ? f.color : 'var(--border)'}`,
                            }}>
                            <div className="mt-0.5 flex-shrink-0" style={{ color: format === f.id ? f.color : 'var(--subtle)' }}>{f.icon}</div>
                            <div className="flex-1">
                              <div className="text-sm font-bold" style={{ color: format === f.id ? f.color : 'var(--ink)' }}>{f.label}</div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{f.desc}</div>
                            </div>
                            {format === f.id && <Check size={15} style={{ color: f.color, flexShrink: 0, marginTop: 2 }} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--muted)' }}>
                        {t('create_tourney_name')} <span style={{ color: 'var(--subtle)', fontWeight: 400, textTransform: 'none' }}>{t('create_table_name_opt')}</span>
                      </label>
                      <input
                        value={name} onChange={(e) => setName(e.target.value)}
                        placeholder={`${hostName}'s Tournament`} maxLength={48}
                        className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 1 — Players + buy-in + chips */}
                {step === 1 && (
                  <motion.div key="s1"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }} className="space-y-5 py-4">

                    {/* Players */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1.5"><Users size={11} /> {t('create_max_players')}</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {PLAYER_PRESETS.map((n) => (
                          <button key={n} onClick={() => { setMaxP(n); setUseCP(false); }}
                            className="px-3 py-2 rounded-xl text-xs font-bold transition-all tabnum"
                            style={{
                              background: !useCustomP && maxPlayers === n ? 'rgba(251,191,36,0.18)' : 'var(--surface)',
                              border: `1px solid ${!useCustomP && maxPlayers === n ? '#fbbf24' : 'var(--border)'}`,
                              color: !useCustomP && maxPlayers === n ? '#fbbf24' : 'var(--muted)',
                            }}>
                            {n}
                          </button>
                        ))}
                        <button onClick={() => setUseCP(true)}
                          className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: useCustomP ? 'rgba(251,191,36,0.18)' : 'var(--surface)',
                            border: `1px solid ${useCustomP ? '#fbbf24' : 'var(--border)'}`,
                            color: useCustomP ? '#fbbf24' : 'var(--muted)',
                          }}>
                          Custom
                        </button>
                      </div>
                      {useCustomP && (
                        <input type="number" min={4} max={500}
                          value={customPlayers} onChange={(e) => setCustomP(e.target.value)}
                          className="w-28 px-3 py-2 rounded-xl text-sm outline-none tabnum"
                          style={{ background: 'var(--surface)', border: '1px solid #fbbf24', color: 'var(--ink)' }}
                          placeholder="4–500"
                        />
                      )}
                    </div>

                    {/* Buy-in */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        {t('create_buyin_usdc')}
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {BUYIN_PRESETS.map((n) => (
                          <button key={n} onClick={() => { setBuyIn(n); setUseCBI(false); }}
                            className="px-3 py-2 rounded-xl text-xs font-bold transition-all tabnum"
                            style={{
                              background: !useCustomBI && buyIn === n ? 'rgba(99,102,241,0.18)' : 'var(--surface)',
                              border: `1px solid ${!useCustomBI && buyIn === n ? '#6366f1' : 'var(--border)'}`,
                              color: !useCustomBI && buyIn === n ? '#818cf8' : 'var(--muted)',
                            }}>
                            ${n}
                          </button>
                        ))}
                        <button onClick={() => setUseCBI(true)}
                          className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{
                            background: useCustomBI ? 'rgba(99,102,241,0.18)' : 'var(--surface)',
                            border: `1px solid ${useCustomBI ? '#6366f1' : 'var(--border)'}`,
                            color: useCustomBI ? '#818cf8' : 'var(--muted)',
                          }}>
                          Custom
                        </button>
                      </div>
                      {useCustomBI && (
                        <input type="number" min={1}
                          value={customBuyIn} onChange={(e) => setCustomBI(e.target.value)}
                          className="w-28 px-3 py-2 rounded-xl text-sm outline-none tabnum"
                          style={{ background: 'var(--surface)', border: '1px solid #6366f1', color: 'var(--ink)' }}
                          placeholder="USDC"
                        />
                      )}
                    </div>

                    {/* Starting chips */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        Starting Chips
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {CHIPS_PRESETS.map((n) => (
                          <button key={n} onClick={() => setChips(n)}
                            className="px-3 py-2 rounded-xl text-xs font-bold transition-all tabnum"
                            style={{
                              background: startChips === n ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                              border: `1px solid ${startChips === n ? '#10b981' : 'var(--border)'}`,
                              color: startChips === n ? '#10b981' : 'var(--muted)',
                            }}>
                            {n.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prize pool preview */}
                    <div className="rounded-2xl px-4 py-3 text-xs space-y-1.5 tabnum"
                      style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--muted)' }}>Prize Pool (if full)</span>
                        <span className="usdc-val font-bold">${prizePool.toLocaleString()}<span className="usdc-label">USDC</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--muted)' }}>Paid Places</span>
                        <span className="font-bold" style={{ color: '#fbbf24' }}>{prizes.length} {t('create_of')} {effPlayers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--muted)' }}>1st Place</span>
                        <span className="usdc-val font-bold">${prizes[0]?.amount.toLocaleString() ?? 0}<span className="usdc-label">USDC</span></span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 — Structure + privacy + summary */}
                {step === 2 && (
                  <motion.div key="s2"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }} className="space-y-5 py-4">

                    {/* Blind level duration */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        Blind Level Duration
                      </label>
                      <div className="flex gap-2">
                        {levelOpts.map((l) => (
                          <button key={l.duration} onClick={() => setLevelDur(l.duration)}
                            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
                            style={{
                              background: levelDur === l.duration ? 'rgba(232,121,249,0.15)' : 'var(--surface)',
                              border: `1.5px solid ${levelDur === l.duration ? '#e879f9' : 'var(--border)'}`,
                              color: levelDur === l.duration ? '#e879f9' : 'var(--muted)',
                            }}>
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Privacy */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        Registration
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: false, icon: <Unlock size={15} />, label: t('create_open'), desc: t('create_public_desc') },
                          { val: true,  icon: <Lock size={15} />,   label: t('create_password'), desc: t('create_password_desc') },
                        ].map((opt) => (
                          <button key={String(opt.val)} onClick={() => setUsePwd(opt.val)}
                            className="flex flex-col items-center gap-1 py-4 rounded-2xl transition-all"
                            style={{
                              background: usePassword === opt.val ? 'rgba(99,102,241,0.14)' : 'var(--surface)',
                              border: `1.5px solid ${usePassword === opt.val ? '#6366f1' : 'var(--border)'}`,
                              color: usePassword === opt.val ? '#818cf8' : 'var(--muted)',
                            }}>
                            {opt.icon}
                            <span className="text-sm font-bold">{opt.label}</span>
                            <span className="text-xs opacity-60">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                      <AnimatePresence>
                        {usePassword && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                            <div className="relative">
                              <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
                              <input
                                type={showPwd ? 'text' : 'password'}
                                value={password} onChange={(e) => setPwd(e.target.value)}
                                placeholder="Set a password…" maxLength={32}
                                className="w-full pl-8 pr-10 py-3 rounded-2xl text-sm outline-none"
                                style={{ background: 'var(--surface)', border: '1px solid #6366f1', color: 'var(--ink)' }}
                              />
                              <button type="button" onClick={() => setShowPwd((s) => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--subtle)' }}>
                                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Full summary */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {t('create_summary')}
                      </div>
                      {[
                        [t('create_tourney_name'),    tourName],
                        [t('create_format'),          FORMATS.find((f) => f.id === format)?.label ?? format],
                        [t('create_max_players'),     `${effPlayers}`],
                        [t('create_min_to_start'),    `4 ${t('create_players')}`],
                        [t('create_buyin_usdc'),      `$${effBuyIn} USDC`],
                        [t('create_prize_pool'),      `$${prizePool.toLocaleString()} USDC`],
                        [t('create_starting_chips'),  startChips.toLocaleString()],
                        [t('create_blind_duration'),  `${levelDur} ${t('create_min_per_level')}`],
                        [t('create_room_privacy'),    usePassword ? `🔒 ${t('create_password_protected')}` : `🔓 ${t('create_open')}`],
                        ['Bots',                      `— ${t('create_no_bots')}`],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center px-4 py-2.5 text-xs"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ color: 'var(--muted)' }}>{k}</span>
                          <span className="font-semibold tabnum" style={{ color: 'var(--ink)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            <div className="px-6 py-4 flex gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {step > 0 && (
                <button onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-2xl text-sm font-semibold transition-all hover:bg-white/5"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  <ChevronLeft size={15} /> {t('create_back')}
                </button>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => step < steps.length - 1 ? setStep((s) => s + 1) : handleCreate()}
                className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'linear-gradient(135deg,#d97706,#fbbf24)',
                  color: '#0c1525',
                  boxShadow: '0 4px 28px rgba(251,191,36,0.35)',
                }}>
                {step < steps.length - 1
                  ? <><span>{t('create_continue')}</span><ChevronRight size={15} /></>
                  : <><Trophy size={15} /><span>{t('create_tournament_title')}</span></>}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
