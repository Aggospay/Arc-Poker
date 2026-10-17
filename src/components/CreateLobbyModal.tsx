/**
 * CreateLobbyModal — lepoker.io-inspired step wizard for private table creation.
 * Step 1: Game type + table name
 * Step 2: Players + blinds
 * Step 3: Privacy + confirm
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Lock, Unlock, Users, Eye, EyeOff,
  ChevronRight, ChevronLeft, Check, Spade,
} from 'lucide-react';
import { useLocaleCtx } from '../i18n/LocaleContext';

interface BlindPreset { label: string; sb: number; bb: number; buyIn: number; }
const BLIND_PRESETS: BlindPreset[] = [
  { label: '1 / 2',     sb: 1,   bb: 2,   buyIn: 40    },
  { label: '5 / 10',    sb: 5,   bb: 10,  buyIn: 200   },
  { label: '25 / 50',   sb: 25,  bb: 50,  buyIn: 1000  },
  { label: '100 / 200', sb: 100, bb: 200, buyIn: 4000  },
  { label: 'Custom',    sb: 0,   bb: 0,   buyIn: 0     },
];



interface Props {
  open:     boolean;
  onClose:  () => void;
  onCreate: (opts: {
    name: string; password: string; maxPlayers: number;
    smallBlind: number; bigBlind: number; minBuyIn: number;
  }) => void;
  hostName: string;
}

export function CreateLobbyModal({ open, onClose, onCreate, hostName }: Props) {
  const { t } = useLocaleCtx();
  const GAME_TYPES = [
    { id: 'nlh', label: t('gtype_nlh_label'), desc: t('gtype_nlh_desc') },
    { id: 'plo', label: t('gtype_plo_label'), desc: t('gtype_plo_desc') },
    { id: 'flh', label: t('gtype_flh_label'), desc: t('gtype_flh_desc') },
  ];
  const [step,        setStep]     = useState(0);
  const [gameType,    setGameType] = useState('nlh');
  const [name,        setName]     = useState('');
  const [maxPlayers,  setMaxP]     = useState(6);
  const [blindIdx,    setBlindIdx] = useState(1);
  const [customSB,    setCSB]      = useState('');
  const [customBB,    setCBB]      = useState('');
  const [customBI,    setCBI]      = useState('');
  const [usePassword, setUsePwd]   = useState(false);
  const [password,    setPwd]      = useState('');
  const [showPwd,     setShowPwd]  = useState(false);

  const preset   = BLIND_PRESETS[blindIdx];
  const isCustom = preset.label === 'Custom';
  const sb       = isCustom ? (parseFloat(customSB) || 5)   : preset.sb;
  const bb       = isCustom ? (parseFloat(customBB) || 10)  : preset.bb;
  const buyIn    = isCustom ? (parseFloat(customBI) || 200) : preset.buyIn;
  const tableName = name.trim() || `${hostName}'s Table`;

  const steps = [t('create_step_game'), t('create_step_table'), t('create_step_privacy')];

  const handleCreate = () => {
    onCreate({ name: tableName, password: usePassword ? password : '', maxPlayers, smallBlind: sb, bigBlind: bb, minBuyIn: buyIn });
    setStep(0); setName(''); setPwd(''); setUsePwd(false); setMaxP(6); setBlindIdx(1);
    onClose();
  };

  const canNext = step === 0 ? true : step === 1 ? bb > 0 : true;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 300, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(160deg,#0f1b2e,#080e1c)',
              border: '1px solid rgba(99,102,241,0.28)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
              maxHeight: '92vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)' }}>
                  <Spade size={16} style={{ color: '#818cf8' }} />
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{t('create_table_title')}</h2>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{t('create_table_subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'var(--muted)' }}>
                <X size={15} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-0 px-6 pt-4 pb-2 flex-shrink-0">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-0 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                      style={{
                        background: i < step ? '#6366f1' : i === step ? 'rgba(99,102,241,0.25)' : 'var(--surface)',
                        border: `1.5px solid ${i <= step ? '#6366f1' : 'var(--border)'}`,
                        color: i < step ? '#fff' : i === step ? '#818cf8' : 'var(--subtle)',
                      }}>
                      {i < step ? <Check size={11} /> : i + 1}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: i === step ? 'var(--ink)' : 'var(--subtle)' }}>{s}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="h-px flex-1 mx-2" style={{ background: i < step ? '#6366f1' : 'var(--border)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="px-6 pb-2 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <AnimatePresence mode="wait">
                {/* STEP 0 — Game type + name */}
                {step === 0 && (
                  <motion.div key="s0"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }} className="space-y-5 py-4">

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        {t('create_game_type')}
                      </label>
                      <div className="space-y-2">
                        {GAME_TYPES.map((g) => (
                          <button key={g.id} onClick={() => setGameType(g.id)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all"
                            style={{
                              background: gameType === g.id ? 'rgba(99,102,241,0.14)' : 'var(--surface)',
                              border: `1.5px solid ${gameType === g.id ? '#6366f1' : 'var(--border)'}`,
                            }}>
                            <div>
                              <div className="text-sm font-semibold" style={{ color: gameType === g.id ? '#818cf8' : 'var(--ink)' }}>{g.label}</div>
                              <div className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{g.desc}</div>
                            </div>
                            {gameType === g.id && <Check size={15} style={{ color: '#6366f1', flexShrink: 0 }} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--muted)' }}>
                        {t('create_table_name')} <span style={{ color: 'var(--subtle)', fontWeight: 400, textTransform: 'none' }}>{t('create_table_name_opt')}</span>
                      </label>
                      <input
                        value={name} onChange={(e) => setName(e.target.value)}
                        placeholder={`${hostName}'s Table`} maxLength={32}
                        className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 1 — Players + blinds */}
                {step === 1 && (
                  <motion.div key="s1"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }} className="space-y-5 py-4">

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1.5"><Users size={11} /> {t('create_seats')}</span>
                      </label>
                      <div className="flex gap-2">
                        {[2, 3, 4, 5, 6].map((n) => (
                          <button key={n} onClick={() => setMaxP(n)}
                            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
                            style={{
                              background: maxPlayers === n ? 'rgba(99,102,241,0.18)' : 'var(--surface)',
                              border: `1.5px solid ${maxPlayers === n ? '#6366f1' : 'var(--border)'}`,
                              color: maxPlayers === n ? '#818cf8' : 'var(--muted)',
                            }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        {t('create_blinds')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {BLIND_PRESETS.map((p, i) => (
                          <button key={p.label} onClick={() => setBlindIdx(i)}
                            className="py-3 px-4 rounded-2xl text-sm font-semibold transition-all text-left"
                            style={{
                              background: blindIdx === i ? 'rgba(99,102,241,0.14)' : 'var(--surface)',
                              border: `1.5px solid ${blindIdx === i ? '#6366f1' : 'var(--border)'}`,
                              color: blindIdx === i ? '#818cf8' : 'var(--muted)',
                            }}>
                            <div className="font-bold">{p.label}</div>
                            {p.buyIn > 0 && <div className="text-xs opacity-60 mt-0.5">Buy-in {p.buyIn}</div>}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence>
                        {isCustom && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: t('create_small_blind'), val: customSB, set: setCSB },
                                { label: t('create_big_blind'),   val: customBB, set: setCBB },
                                { label: t('create_min_buyin'),   val: customBI, set: setCBI },
                              ].map((f) => (
                                <div key={f.label}>
                                  <div className="text-[10px] mb-1 font-medium" style={{ color: 'var(--subtle)' }}>{f.label}</div>
                                  <input type="number" min="1" value={f.val}
                                    onChange={(e) => f.set(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none tabnum"
                                    style={{ background: 'var(--surface)', border: '1px solid #6366f1', color: 'var(--ink)' }}
                                  />
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Live preview card */}
                    <div className="rounded-2xl px-4 py-3 text-sm space-y-1.5 tabnum"
                      style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--muted)' }}>{t('create_blinds')}</span>
                        <span className="usdc-val font-bold">{sb} / {bb}<span className="usdc-label">USDC</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--muted)' }}>{t('create_min_buyin')}</span>
                        <span className="usdc-val font-bold">{buyIn}<span className="usdc-label">USDC</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--muted)' }}>{t('create_seats')}</span>
                        <span style={{ color: 'var(--ink)' }} className="font-bold">{maxPlayers} {t('create_players')}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 — Privacy + summary */}
                {step === 2 && (
                  <motion.div key="s2"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }} className="space-y-5 py-4">

                    {/* Privacy toggle */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--muted)' }}>
                        {t('create_room_privacy')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: false, icon: <Unlock size={15} />, label: t('create_public'),   desc: t('create_public_desc') },
                          { id: true,  icon: <Lock size={15} />,   label: t('create_password'), desc: t('create_password_desc')  },
                        ].map((opt) => (
                          <button key={String(opt.id)} onClick={() => setUsePwd(opt.id)}
                            className="flex flex-col items-center gap-1 py-4 rounded-2xl transition-all"
                            style={{
                              background: usePassword === opt.id ? 'rgba(99,102,241,0.14)' : 'var(--surface)',
                              border: `1.5px solid ${usePassword === opt.id ? '#6366f1' : 'var(--border)'}`,
                              color: usePassword === opt.id ? '#818cf8' : 'var(--muted)',
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
                                placeholder={t('create_password_placeholder')} maxLength={32}
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
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {t('create_summary')}
                      </div>
                      {[
                        [t('create_table_name'), tableName],
                        [t('create_game_type'),  GAME_TYPES.find((g) => g.id === gameType)?.label ?? gameType],
                        [t('create_seats'),      `${maxPlayers} ${t('create_players')}`],
                        [t('create_blinds'),     `${sb} / ${bb} USDC`],
                        [t('create_min_buyin'),  `${buyIn} USDC`],
                        [t('create_room_privacy'), usePassword ? `🔒 ${t('create_password_protected')}` : `🔓 ${t('create_public_only')}`],
                        ['Bots', `— ${t('create_no_bots')}`],
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
                disabled={!canNext}
                className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: canNext ? 'linear-gradient(135deg,#4f52e8,#818cf8)' : 'var(--surface)',
                  color: canNext ? '#fff' : 'var(--subtle)',
                  boxShadow: canNext ? '0 4px 24px rgba(99,102,241,0.35)' : 'none',
                }}>
                {step < steps.length - 1
                  ? <><span>{t('create_continue')}</span><ChevronRight size={15} /></>
                  : <><Check size={15} /><span>{t('create_table_title')}</span></>}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
