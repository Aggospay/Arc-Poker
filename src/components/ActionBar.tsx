import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUsdc } from '../utils/poker';
import { useLocaleCtx } from '../i18n/LocaleContext';

interface Props {
  callAmount:  number;
  minRaise:    number;
  heroBalance: number;
  pot:         number;
  onFold:      () => void;
  onCheck:     () => void;
  onCall:      () => void;
  onRaise:     (amount: number) => void;
  onAllIn:     () => void;
  canCheck:    boolean;
  disabled?:   boolean;
}

export function ActionBar({
  callAmount, minRaise, heroBalance, pot,
  onFold, onCheck, onCall, onRaise, onAllIn,
  canCheck, disabled = false,
}: Props) {
  const { t } = useLocaleCtx();
  const maxRaise = heroBalance;
  const safeMin  = Math.max(minRaise, callAmount + 1, 1);

  const [showSlider, setShowSlider] = useState(false);
  const [_rawAmt,    setRawAmt]     = useState(safeMin);
  // Clamp raw amount to current valid range every render (no effect needed)
  const raiseAmt = Math.max(safeMin, Math.min(_rawAmt, maxRaise));
  const setRaiseAmt = (v: number) => setRawAmt(Math.max(safeMin, Math.min(v, maxRaise)));

  // Quick-raise presets: 25%, 50%, 75%, Pot, Max
  const presets = [
    { label: '25%', value: Math.round(pot * 0.25) },
    { label: '50%', value: Math.round(pot * 0.50) },
    { label: '75%', value: Math.round(pot * 0.75) },
    { label: 'Pot', value: pot },
    { label: 'Max', value: maxRaise },
  ].map((p) => ({ ...p, value: Math.min(Math.max(p.value, safeMin), maxRaise) }));

  const pct = maxRaise > safeMin
    ? ((raiseAmt - safeMin) / (maxRaise - safeMin)) * 100
    : 0;

  const handleConfirm = () => {
    onRaise(raiseAmt);
    setShowSlider(false);
  };

  return (
    <div className="w-full select-none">
      {/* ── Raise panel ──────────────────────────── */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ opacity: 0, y: 14, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            transition={{ duration: 0.20 }}
            className="glass-strong rounded-2xl p-4 mb-3 overflow-hidden"
          >
            {/* Amount display */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Raise Amount</span>
              <span
                className="tabnum text-xl font-bold"
                style={{ fontFamily: 'Space Grotesk', color: 'var(--accent)', textShadow: '0 0 14px rgba(56,182,255,0.4)' }}
              >
                <span className="usdc-val">{formatUsdc(raiseAmt)}<span className="usdc-label">USDC</span></span>
              </span>
            </div>

            {/* Preset chips */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setRaiseAmt(p.value)}
                  className={`bet-preset ${raiseAmt === p.value ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="relative mb-3">
              <input
                type="range"
                className="raise-slider w-full"
                min={safeMin}
                max={maxRaise}
                step={Math.max(1, Math.floor(maxRaise / 200))}
                value={raiseAmt}
                onChange={(e) => setRaiseAmt(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
                }}
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--subtle)' }}>
                <span className="tabnum">{formatUsdc(safeMin)}</span>
                <span className="tabnum">{formatUsdc(maxRaise)}</span>
              </div>
            </div>

            {/* Confirm row */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSlider(false)}
                className="btn-ghost flex-1 py-2.5 rounded-xl text-sm"
              >
                {t('btn_cancel')}
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleConfirm}
                disabled={disabled}
                className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-bold"
              >
                {t('raise')} {formatUsdc(raiseAmt)}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main action buttons ───────────────────── */}
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1.6fr 1fr' }}>
        {/* FOLD */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onFold}
          disabled={disabled}
          className="action-btn fold"
        >
          <span className="label">{t('fold')}</span>
        </motion.button>

        {/* CHECK / CALL */}
        {canCheck ? (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onCheck}
            disabled={disabled}
            className="action-btn check"
          >
            <span className="label">{t('check')}</span>
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onCall}
            disabled={disabled}
            className="action-btn call"
          >
            <span className="label">{t('call')}</span>
            <span className="sub">{formatUsdc(callAmount)}</span>
          </motion.button>
        )}

        {/* RAISE / BET */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setShowSlider((v) => !v)}
          disabled={disabled}
          className={`action-btn raise ${showSlider ? 'active-raise' : ''}`}
        >
          <span className="label">{canCheck ? t('bet') : t('raise')}</span>
          <span className="sub">{formatUsdc(raiseAmt)}</span>
        </motion.button>

        {/* ALL-IN */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onAllIn}
          disabled={disabled}
          className="action-btn all-in"
        >
          <span className="label">{t('all_in')}</span>
          <span className="sub">{formatUsdc(heroBalance)}</span>
        </motion.button>
      </div>
    </div>
  );
}
