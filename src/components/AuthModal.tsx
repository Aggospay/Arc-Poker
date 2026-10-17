import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, CheckCircle2 } from 'lucide-react';
import { ConnectKitButton } from 'connectkit';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
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
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-xl hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--subtle)', background: 'var(--surface)' }}
                >
                  <X size={15} />
                </button>
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(56,182,255,0.18), rgba(14,165,233,0.10))', border: '1px solid rgba(56,182,255,0.24)' }}
                >
                  <img src="/icon22.svg" alt="ARC" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                </div>
                <h2 className="display text-xl font-bold mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                  Sign in to ARC Poker
                </h2>
                <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
                  Connect your wallet to play
                </p>
              </div>

              <div className="px-6 pb-8">
                <ConnectKitButton.Custom>
                  {({ show, isConnected }) => (
                    isConnected
                      ? (
                        <div className="text-center py-4">
                          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--success)' }} />
                          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--ink)' }}>Wallet connected!</div>
                          <button
                            onClick={onClose}
                            className="btn-primary rounded-2xl px-8 py-3 text-sm font-bold"
                          >
                            Continue →
                          </button>
                        </div>
                      )
                      : (
                        <div className="space-y-4">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={show}
                            className="btn-primary w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5"
                            style={{ fontSize: '15px' }}
                          >
                            <Wallet size={18} /> Connect Wallet
                          </motion.button>
                          <p className="text-[11px] text-center" style={{ color: 'var(--subtle)' }}>
                            MetaMask · WalletConnect · Coinbase · and more
                          </p>
                        </div>
                      )
                  )}
                </ConnectKitButton.Custom>

                <div className="flex items-center gap-3 pt-5">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--subtle)' }}>secure · non-custodial</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
