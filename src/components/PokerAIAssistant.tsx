/**
 * PokerAIAssistant — non-intrusive hint overlay for the poker table.
 *
 * Renders as a compact pill in the bottom-right corner that expands on click.
 * It never blocks action buttons.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, ChevronUp, ChevronDown, Lightbulb, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { HintLevel } from '../hooks/usePokerAI';
import type { ResolvedHint } from '../context/PokerAIContext';

interface Props {
  hint:    ResolvedHint | null;
  visible: boolean;
  enabled: boolean;
  onDismiss: () => void;
}

const LEVEL_META: Record<HintLevel, { color: string; bg: string; border: string; Icon: React.ElementType }> = {
  info:   { color: '#38b6ff', bg: 'rgba(56,182,255,0.10)',  border: 'rgba(56,182,255,0.25)',  Icon: Info          },
  good:   { color: '#3dd68c', bg: 'rgba(61,214,140,0.10)',  border: 'rgba(61,214,140,0.25)',  Icon: CheckCircle   },
  warn:   { color: '#f5c842', bg: 'rgba(245,200,66,0.10)',  border: 'rgba(245,200,66,0.25)',  Icon: AlertTriangle },
  danger: { color: '#f06080', bg: 'rgba(240,96,128,0.10)',  border: 'rgba(240,96,128,0.25)',  Icon: AlertTriangle },
};

export function PokerAIAssistant({ hint, visible, enabled, onDismiss }: Props) {
  // ResolvedHint already has translated plain strings — render directly
  const [expanded, setExpanded] = useState(false);

  if (!enabled || !hint || !visible) {
    return (
      // Always show the AI indicator pill even when idle
      <div
        style={{
          position: 'absolute',
          bottom: 88,
          right: 12,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 20,
          background: 'rgba(10,14,30,0.6)',
          border: '1px solid rgba(56,182,255,0.15)',
          color: 'rgba(56,182,255,0.4)',
          fontSize: 11,
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <Bot size={12} />
        {enabled ? 'AI' : 'AI off'}
      </div>
    );
  }

  const meta = LEVEL_META[hint.level];
  const LevelIcon = meta.Icon;

  return (
    <AnimatePresence>
      <motion.div
        key={hint.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,  scale: 1      }}
        exit={{    opacity: 0, y: 10, scale: 0.95   }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        style={{
          position: 'absolute',
          bottom: 80,
          right: 12,
          zIndex: 50,
          width: expanded ? 280 : 'auto',
          maxWidth: 300,
          borderRadius: 16,
          background: `rgba(8,12,26,0.92)`,
          border: `1px solid ${meta.border}`,
          backdropFilter: 'blur(16px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${meta.color}22`,
          overflow: 'hidden',
        }}
      >
        {/* ── Header row ── */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: expanded ? '10px 12px 8px' : '8px 12px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {/* AI badge */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8,
              background: meta.bg,
              border: `1px solid ${meta.border}`,
              flexShrink: 0,
            }}
          >
            <Bot size={14} color={meta.color} />
          </div>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <LevelIcon size={11} color={meta.color} />
              <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, whiteSpace: 'nowrap' }}>
                {hint.title}
              </span>
            </div>
            {!expanded && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                {hint.action ?? hint.body.slice(0, 40)}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center' }}>
              {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
              }}
            >
              <X size={11} />
            </button>
          </div>
        </div>

        {/* ── Expanded body ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '0 12px 12px' }}>
                {/* Divider */}
                <div style={{ height: 1, background: meta.border, marginBottom: 10 }} />

                {/* Body text */}
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  {hint.body}
                </p>

                {/* Suggested action */}
                {hint.action && (
                  <div
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 8,
                      background: meta.bg, border: `1px solid ${meta.border}`,
                    }}
                  >
                    <Lightbulb size={11} color={meta.color} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>
                      {hint.action}
                    </span>
                  </div>
                )}

                {/* Confidence bar */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confidence</span>
                    <span style={{ fontSize: 9, color: meta.color, fontWeight: 700 }}>{Math.round(hint.confidence * 100)}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${hint.confidence * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
                    />
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{ marginTop: 8, fontSize: 9, color: 'rgba(255,255,255,0.22)', lineHeight: 1.4 }}>
                  AI hints are suggestions, not guarantees. Always use your own judgement.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
