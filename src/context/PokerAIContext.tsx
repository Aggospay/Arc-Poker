/**
 * PokerAIContext — shared AI toggle + hint state.
 * Translates hint keys through the active locale before storing.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { GameState, Player } from '../types/poker';
import { analyseState, type PokerHint } from '../hooks/usePokerAI';
import { useLocaleCtx } from '../i18n/LocaleContext';
import type { TranslationKey } from '../i18n/LocaleContext';

const STORAGE_KEY = 'arc_poker_ai_enabled';

function loadEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== 'false'; }
  catch { return true; }
}

/** Translate a hint key and replace {var} placeholders */
function translateHint(
  t: (k: TranslationKey) => string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  // Try as a translation key first; if the key doesn't exist t() returns the key itself
  let text = t(key as TranslationKey);
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

export interface ResolvedHint {
  id:         string;
  level:      PokerHint['level'];
  title:      string;
  body:       string;
  action?:    string;
  confidence: number;
}

interface PokerAICtx {
  enabled:    boolean;
  setEnabled: (v: boolean) => void;
  hint:       ResolvedHint | null;
  visible:    boolean;
  analyse:    (game: GameState, hero: Player) => void;
  dismiss:    () => void;
}

const PokerAIContext = createContext<PokerAICtx | null>(null);

export function PokerAIProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(loadEnabled);
  const [hint,    setHint]         = useState<ResolvedHint | null>(null);
  const [visible, setVisible]      = useState(false);
  const { t } = useLocaleCtx();

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(STORAGE_KEY, String(v)); } catch { /* noop */ }
    if (!v) setVisible(false);
  }, []);

  const analyse = useCallback((game: GameState, hero: Player) => {
    if (!enabled) { setVisible(false); return; }
    const raw = analyseState(game, hero);
    if (!raw) { setVisible(false); return; }

    const resolved: ResolvedHint = {
      id:         raw.id,
      level:      raw.level,
      confidence: raw.confidence,
      title:      translateHint(t, raw.titleKey, raw.titleVars),
      body:       translateHint(t, raw.bodyKey,  raw.bodyVars),
      action:     raw.actionKey ? translateHint(t, raw.actionKey) : undefined,
    };
    setHint(prev => prev?.id === resolved.id ? prev : resolved);
    setVisible(true);
  }, [enabled, t]);

  const dismiss = useCallback(() => setVisible(false), []);

  return (
    <PokerAIContext.Provider value={{ enabled, setEnabled, hint, visible, analyse, dismiss }}>
      {children}
    </PokerAIContext.Provider>
  );
}

export function usePokerAICtx(): PokerAICtx {
  const ctx = useContext(PokerAIContext);
  if (!ctx) throw new Error('usePokerAICtx must be used inside <PokerAIProvider>');
  return ctx;
}
