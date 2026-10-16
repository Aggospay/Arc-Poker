import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Chrome, Wallet, ArrowRight, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { ConnectKitButton } from 'connectkit';
import { sendEmailOtp, verifyEmailOtp } from '../hooks/useAuth';
import type { AuthMethod } from '../hooks/useAuth';

function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onEmailLogin: (email: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
}

type Step = 'choose' | 'email-input' | 'email-otp' | 'loading' | 'error';

export function AuthModal({ open, onClose, onEmailLogin, onGoogleLogin }: Props) {
  const [step,       setStep]       = useState<Step>('choose');
  const [activeTab,  setActiveTab]  = useState<AuthMethod>('email');
  const [email,      setEmail]      = useState('');
  const [otp,        setOtp]        = useState(['', '', '', '', '', '']);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [devCode,    setDevCode]    = useState(''); // shown in dev mode
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  function reset() {
    setStep('choose');
    setEmail('');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setLoading(false);
    setDevCode('');
  }

  async function handleSendOtp() {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const code = await sendEmailOtp(email);
      setDevCode(code); // visible in dev mode only
      setStep('email-otp');
    } catch {
      setError('Failed to send code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      const ok = await verifyEmailOtp(email, code);
      if (!ok) { setError('Invalid code. Check and try again.'); setLoading(false); return; }
      await onEmailLogin(email);
      onClose();
      reset();
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError('');
    try {
      await onGoogleLogin();
      onClose();
      reset();
    } catch (e) {
      setError((e as Error).message ?? 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...otp];
    next[idx]   = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKey(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter') void handleVerifyOtp();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 6) {
      setOtp(digits);
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
            onClick={() => { onClose(); reset(); }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={   { opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="glass-strong rounded-3xl w-full max-w-sm pointer-events-auto overflow-hidden"
              style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(56,182,255,0.12)' }}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-2 text-center">
                <button
                  onClick={() => { onClose(); reset(); }}
                  className="absolute right-4 top-4 p-2 rounded-xl hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--subtle)', background: 'var(--surface)' }}
                >
                  <X size={15} />
                </button>
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(56,182,255,0.18), rgba(14,165,233,0.10))', border: '1px solid rgba(56,182,255,0.24)' }}>
                  <img src="/icon22.svg" alt="ARC" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                </div>
                <h2 className="display text-xl font-bold mb-0.5" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                  {step === 'email-otp' ? 'Check your email' : 'Sign in to ARC Poker'}
                </h2>
                <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                  {step === 'email-otp'
                    ? `We sent a 6-digit code to ${email}`
                    : 'Choose how you want to continue'}
                </p>
              </div>

              <div className="px-6 pb-6">
                <AnimatePresence mode="wait">

                  {/* ── Choose method ──────────────────────────────────── */}
                  {step === 'choose' && (
                    <motion.div key="choose" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-3">
                      {/* Tab bar */}
                      <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                        {([
                          { id: 'email',  label: 'Email',  icon: <Mail    size={13} /> },
                          { id: 'google',  label: 'Google',  icon: <Chrome  size={13} /> },
                          { id: 'discord', label: 'Discord', icon: <DiscordIcon /> },
                          { id: 'wallet',  label: 'Wallet',  icon: <Wallet  size={13} /> },
                        ] as { id: AuthMethod; label: string; icon: React.ReactNode }[]).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{
                              background: activeTab === t.id ? 'rgba(56,182,255,0.15)' : 'transparent',
                              color:      activeTab === t.id ? 'var(--accent)' : 'var(--muted)',
                              border:     activeTab === t.id ? '1px solid rgba(56,182,255,0.28)' : '1px solid transparent',
                            }}
                          >
                            {t.icon} {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Email tab */}
                      {activeTab === 'email' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--subtle)' }}>Email address</label>
                            <input
                              type="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') void handleSendOtp(); }}
                              autoFocus
                              className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                              style={{
                                background: 'var(--surface-muted)',
                                border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
                                color: 'var(--ink)',
                              }}
                            />
                          </div>
                          {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => void handleSendOtp()}
                            disabled={loading || !email}
                            className="btn-primary w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                          >
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <><ArrowRight size={15} /> Continue with Email</>}
                          </motion.button>
                        </div>
                      )}

                      {/* Google tab */}
                      {activeTab === 'google' && (
                        <div className="space-y-3">
                          {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => void handleGoogle()}
                            disabled={loading}
                            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all"
                            style={{
                              background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              color: 'var(--ink)',
                            }}
                          >
                            {loading
                              ? <Loader2 size={16} className="animate-spin" />
                              : <>
                                  <GoogleIcon />
                                  Continue with Google
                                </>
                            }
                          </motion.button>
                          <p className="text-[11px] text-center" style={{ color: 'var(--subtle)' }}>
                            Demo mode: uses a prompt. Set VITE_GOOGLE_CLIENT_ID for real OAuth.
                          </p>
                        </div>
                      )}

                      {/* Discord tab */}
                      {activeTab === 'discord' && (
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              const id = `discord_${Math.random().toString(36).slice(2, 10)}`;
                              void onEmailLogin(`${id}@discord.demo`);
                            }}
                            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl font-bold text-sm transition-all"
                            style={{ background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer' }}
                          >
                            <DiscordIcon />
                            Continue with Discord
                          </button>
                          <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                            Demo mode. Set VITE_DISCORD_CLIENT_ID for real OAuth.
                          </p>
                        </div>
                      )}

                      {/* Wallet tab */}
                      {activeTab === 'wallet' && (
                        <div className="space-y-3">
                          <div className="text-xs text-center mb-2" style={{ color: 'var(--muted)' }}>
                            Connect MetaMask, WalletConnect, or any injected wallet
                          </div>
                          <ConnectKitButton.Custom>
                            {({ show, isConnected }) => (
                              isConnected
                                ? <div className="text-center py-3">
                                    <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--success)' }} />
                                    <div className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Wallet connected!</div>
                                    <button onClick={() => { onClose(); reset(); }} className="btn-primary rounded-xl px-6 py-2.5 text-sm">
                                      Continue →
                                    </button>
                                  </div>
                                : <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={show}
                                    className="btn-primary w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                                  >
                                    <Wallet size={15} /> Connect Wallet
                                  </motion.button>
                            )}
                          </ConnectKitButton.Custom>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                        <span className="text-[11px]" style={{ color: 'var(--subtle)' }}>secure · non-custodial</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                      </div>
                    </motion.div>
                  )}

                  {/* ── OTP step ───────────────────────────────────────── */}
                  {step === 'email-otp' && (
                    <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                      {/* Dev hint */}
                      {devCode && (
                        <div className="px-3 py-2 rounded-xl text-center text-xs" style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)', color: '#f5c842' }}>
                          Dev mode — your code: <span className="font-bold font-mono tracking-widest">{devCode}</span>
                        </div>
                      )}

                      {/* 6-digit input */}
                      <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                        {otp.map((d, i) => (
                          <input
                            key={i}
                            ref={(el) => { otpRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={d}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKey(i, e)}
                            className="w-10 h-12 text-center text-lg font-bold rounded-xl outline-none transition-all"
                            style={{
                              background: 'var(--surface-muted)',
                              border: `1.5px solid ${d ? 'var(--accent)' : 'var(--border-strong)'}`,
                              color: 'var(--ink)',
                              caretColor: 'var(--accent)',
                            }}
                          />
                        ))}
                      </div>

                      {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void handleVerifyOtp()}
                        disabled={loading || otp.join('').length < 6}
                        className="btn-primary w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> Verify & Sign In</>}
                      </motion.button>

                      <button
                        onClick={() => { setStep('choose'); setError(''); setOtp(['','','','','','']); }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--muted)' }}
                      >
                        <RefreshCw size={12} /> Resend code or change email
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
