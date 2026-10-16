/**
 * usePokerAI — professional poker AI with real hand evaluation.
 *
 * Hand evaluation pipeline (post-flop):
 *  1. Combine hero's 2 hole cards with N community cards (N = 3,4,5)
 *  2. Evaluate all C(total,5) 5-card combinations
 *  3. Score the best combination: High Card=1 … Royal Flush=10
 *  4. Advice based on absolute hand rank + position + pot odds
 *
 * Pre-flop: Chen formula score (0-20).
 * Localisation: hints are returned as keys; the context translates them.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Player, Card } from '../types/poker';

const AI_ENABLED_KEY = 'arc_poker_ai_enabled';

// ─── rank helpers ────────────────────────────────────────────────────────────
const RANK_VAL: Record<string, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,
};
function rv(r: string) { return RANK_VAL[r] ?? 0; }

// ─── 5-card hand evaluator ────────────────────────────────────────────────────
/** Returns 1(high card)…10(royal flush). Higher = better. */
function eval5(hand: Card[]): number {
  const vals  = hand.map(c => rv(c.rank)).sort((a, b) => b - a);
  const suits = hand.map(c => c.suit);
  const flush = suits.every(s => s === suits[0]);

  // rank counts
  const cnt: Record<number, number> = {};
  vals.forEach(v => { cnt[v] = (cnt[v] ?? 0) + 1; });
  const counts = Object.values(cnt).sort((a, b) => b - a);

  // straight detection (including A-2-3-4-5 wheel)
  const uniq = [...new Set(vals)];
  let straight = false;
  if (uniq.length >= 5) {
    for (let i = 0; i <= uniq.length - 5; i++) {
      if (uniq[i] - uniq[i + 4] === 4) { straight = true; break; }
    }
    // wheel: A-2-3-4-5
    if (!straight && uniq.includes(14) && uniq.includes(2) && uniq.includes(3) && uniq.includes(4) && uniq.includes(5)) {
      straight = true;
    }
  }

  if (flush && straight) return vals[0] === 14 && vals[1] === 13 ? 10 : 9; // royal / straight-flush
  if (counts[0] === 4) return 8; // quads
  if (counts[0] === 3 && counts[1] === 2) return 7; // full house
  if (flush) return 6;
  if (straight) return 5;
  if (counts[0] === 3) return 4; // trips
  if (counts[0] === 2 && counts[1] === 2) return 3; // two-pair
  if (counts[0] === 2) return 2; // one-pair
  return 1; // high card
}

/** Best 5-card rank from any subset of `cards`. */
function bestRank(cards: Card[]): number {
  if (cards.length < 5) return eval5(cards); // < 5 cards: evaluate as-is
  let best = 0;
  // iterate all C(n,5) combos
  for (let i = 0; i < cards.length - 4; i++)
    for (let j = i+1; j < cards.length - 3; j++)
      for (let k = j+1; k < cards.length - 2; k++)
        for (let l = k+1; l < cards.length - 1; l++)
          for (let m = l+1; m < cards.length; m++) {
            const r = eval5([cards[i], cards[j], cards[k], cards[l], cards[m]]);
            if (r > best) best = r;
          }
  return best;
}

const HAND_NAME: Record<number, string> = {
  1:'High Card', 2:'One Pair', 3:'Two Pair', 4:'Three of a Kind',
  5:'Straight',  6:'Flush',    7:'Full House', 8:'Four of a Kind',
  9:'Straight Flush', 10:'Royal Flush',
};

// ─── pre-flop: Chen formula ───────────────────────────────────────────────────
function chenScore(cards: Card[]): number {
  if (cards.length < 2) return 0;
  const a = rv(cards[0].rank), b = rv(cards[1].rank);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  let s = hi === 14 ? 10 : hi === 13 ? 8 : hi === 12 ? 7 : hi === 11 ? 6 : hi / 2;
  if (a === b) { s *= 2; if (s < 5) s = 5; }
  if (cards[0].suit === cards[1].suit) s += 2;
  const gap = hi - lo - 1;
  if (gap === 0) s += 1;
  else if (gap === 1) s -= 1;
  else if (gap === 2) s -= 2;
  else if (gap === 3) s -= 4;
  else s -= 5;
  if (hi < 12 && gap === 0) s += 1;
  return Math.max(0, Math.min(20, s));
}

// ─── board texture ────────────────────────────────────────────────────────────
function flushDraw(community: Card[]): boolean {
  const c: Record<string,number> = {};
  community.forEach(x => { c[x.suit] = (c[x.suit]??0)+1; });
  return Object.values(c).some(v => v >= 3);
}
function straightDraw(community: Card[]): boolean {
  if (community.length < 3) return false;
  const vs = [...new Set(community.map(c => rv(c.rank)))].sort((a,b)=>a-b);
  for (let i = 0; i <= vs.length - 3; i++) if (vs[i+2]-vs[i] <= 4) return true;
  return false;
}
function boardPaired(community: Card[]): boolean {
  const rs = community.map(c => c.rank);
  return rs.some((r,i) => rs.indexOf(r) !== i);
}

// ─── pot odds ─────────────────────────────────────────────────────────────────
function potOdds(call: number, pot: number): number {
  return call === 0 ? 0 : call / (pot + call);
}

// ─── hint types ───────────────────────────────────────────────────────────────
export type HintLevel = 'info' | 'good' | 'warn' | 'danger';

export interface PokerHint {
  id:         string;
  level:      HintLevel;
  titleKey:   string;        // translation key OR raw English title
  bodyKey:    string;        // translation key OR raw English body
  actionKey?: string;        // translation key OR raw English action label
  // Interpolation values (plain strings/numbers, inserted after translate)
  titleVars?: Record<string,string|number>;
  bodyVars?:  Record<string,string|number>;
  confidence: number;
}

// ─── main analyser ────────────────────────────────────────────────────────────
export function analyseState(game: GameState, hero: Player): PokerHint | null {
  const { communityCards, pot, callAmount, phase, players } = game;
  const community = communityCards.filter(c => c.faceUp);
  const allCards  = [...hero.cards, ...community];
  const pos       = hero.position ?? 0;
  const active    = players.filter(p => p.status !== 'folded').length;
  const isLate    = pos >= Math.floor(active * 0.6);
  const odds      = potOdds(callAmount, pot);

  // ── PRE-FLOP (Chen score) ─────────────────────────────────────────────────
  if ((phase as string) === 'preflop' || community.length === 0) {
    const chen  = chenScore(hero.cards);
    const hiCard = Math.max(...hero.cards.map(c => rv(c.rank)));
    const isPair = hero.cards.length === 2 && hero.cards[0].rank === hero.cards[1].rank;

    // Any pair — always at least a raise
    if (isPair) {
      const isPremiumPair = hiCard >= 10; // TT+
      return {
        id: isPremiumPair ? 'pf-premium' : 'pf-pair',
        level:'good', confidence: isPremiumPair ? 0.95 : 0.82,
        titleKey:'ai_pf_premium_title',
        bodyKey:'ai_pf_premium_body',
        bodyVars:{ score: chen.toFixed(0) },
        actionKey: isPremiumPair ? 'ai_action_raise_3bet' : 'ai_action_raise_call',
      };
    }
    // High card (A, K) or strong unpaired
    if (hiCard >= 13 || chen >= 10) return {
      id:'pf-strong', level:'good', confidence:0.82,
      titleKey:'ai_pf_strong_title',
      bodyKey: isLate ? 'ai_pf_strong_late_body' : 'ai_pf_strong_early_body',
      bodyVars:{ score: chen.toFixed(0) },
      actionKey: callAmount > 0 ? 'ai_action_raise_call' : 'ai_action_bet_raise',
    };
    // Medium hands (Q, J, suited connectors)
    if (hiCard >= 11 || chen >= 6) return {
      id:'pf-speculative', level:'info', confidence:0.68,
      titleKey:'ai_pf_spec_title',
      bodyKey: isLate ? 'ai_pf_spec_late_body' : 'ai_pf_spec_early_body',
      actionKey: callAmount > 0
        ? (isLate ? 'ai_action_call_fold' : 'ai_action_check_fold')
        : 'ai_action_check_bet',
    };
    return {
      id:'pf-weak', level:'warn', confidence:0.85,
      titleKey:'ai_pf_weak_title',
      bodyKey: callAmount > 0 ? 'ai_pf_weak_bet_body' : 'ai_pf_weak_free_body',
      actionKey: callAmount > 0 ? 'ai_action_fold' : 'ai_action_check',
    };
  }

  // ── POST-FLOP: real hand evaluation ──────────────────────────────────────
  const rank     = bestRank(allCards);
  const handName = HAND_NAME[rank] ?? 'Unknown';

  // MONSTER hands (full house+): push hard
  if (rank >= 7) return {
    id:`monster-${rank}`, level:'good', confidence:0.96,
    titleKey:'ai_monster_title',
    bodyKey:'ai_monster_body',
    bodyVars:{ hand: handName },
    actionKey:'ai_action_raise_allin',
  };

  // TWO PAIR — strong but vulnerable
  if (rank === 3) {
    const fDraw = flushDraw(community);
    const sDraw = straightDraw(community);
    if (fDraw || sDraw) return {
      id:'two-pair-draw', level:'good', confidence:0.82,
      titleKey:'ai_strong_draw_title',
      bodyKey:'ai_strong_draw_body',
      bodyVars:{ hand: handName },
      actionKey: callAmount > 0 ? 'ai_action_raise_call' : 'ai_action_bet_raise',
    };
    return {
      id:'two-pair', level:'good', confidence:0.85,
      titleKey:'ai_strong_title',
      bodyKey:'ai_strong_body',
      bodyVars:{ hand: handName },
      actionKey: callAmount > 0 ? 'ai_action_raise_call' : 'ai_action_bet_raise',
    };
  }

  // STRONG hands (flush, straight, trips)
  if (rank >= 4) {
    const fDraw = flushDraw(community);
    const sDraw = straightDraw(community);
    if (fDraw || sDraw) return {
      id:`strong-draw-${rank}`, level:'good', confidence:0.82,
      titleKey:'ai_strong_draw_title',
      bodyKey:'ai_strong_draw_body',
      bodyVars:{ hand: handName },
      actionKey:'ai_action_bet_raise',
    };
    return {
      id:`strong-${rank}`, level:'good', confidence:0.87,
      titleKey:'ai_strong_title',
      bodyKey:'ai_strong_body',
      bodyVars:{ hand: handName },
      actionKey:'ai_action_bet_raise',
    };
  }

  // ONE PAIR
  if (rank === 2) {
    // Pot odds — is the call -EV?
    if (callAmount > 0 && odds > 0.45) return {
      id:'pair-bad-odds', level:'warn', confidence:0.80,
      titleKey:'ai_pair_bad_odds_title',
      bodyKey:'ai_pair_bad_odds_body',
      bodyVars:{ odds: (odds*100).toFixed(0), hand: handName },
      actionKey:'ai_action_fold',
    };
    if (boardPaired(community)) return {
      id:'pair-paired-board', level:'warn', confidence:0.72,
      titleKey:'ai_pair_paired_title',
      bodyKey:'ai_pair_paired_body',
      bodyVars:{ hand: handName },
      actionKey: callAmount > 0 ? 'ai_action_call_cautious' : 'ai_action_check_bet',
    };
    if (flushDraw(community)) return {
      id:'pair-flush-danger', level:'warn', confidence:0.70,
      titleKey:'ai_pair_flush_title',
      bodyKey:'ai_pair_flush_body',
      bodyVars:{ hand: handName },
      actionKey: callAmount > 0 ? 'ai_action_call_cautious' : 'ai_action_check_bet',
    };
    return {
      id:'pair-ok', level:'info', confidence:0.70,
      titleKey:'ai_pair_title',
      bodyKey: isLate ? 'ai_pair_late_body' : 'ai_pair_early_body',
      bodyVars:{ hand: handName },
      actionKey: callAmount > 0 ? 'ai_action_call_fold' : 'ai_action_check_bet',
    };
  }

  // HIGH CARD — always weak post-flop
  if (rank === 1) {
    // Pot odds: call justified?
    if (callAmount > 0 && odds > 0.30) return {
      id:'hc-bad-odds', level:'danger', confidence:0.88,
      titleKey:'ai_hc_bad_odds_title',
      bodyKey:'ai_hc_bad_odds_body',
      bodyVars:{ odds: (odds*100).toFixed(0) },
      actionKey:'ai_action_fold',
    };
    if (phase === 'river') return {
      id:'hc-river', level:'warn', confidence:0.84,
      titleKey:'ai_hc_river_title',
      bodyKey:'ai_hc_river_body',
      actionKey: callAmount > 0 ? 'ai_action_fold' : 'ai_action_check',
    };
    return {
      id:'hc-bluff', level:'info', confidence:0.55,
      titleKey:'ai_hc_title',
      bodyKey: isLate && callAmount === 0 ? 'ai_hc_bluff_body' : 'ai_hc_body',
      actionKey: isLate && callAmount === 0 ? 'ai_action_bluff' : (callAmount > 0 ? 'ai_action_fold' : 'ai_action_check'),
    };
  }

  // Catch-all
  return {
    id:`default-${phase}`, level:'info', confidence:0.50,
    titleKey:'ai_default_title',
    bodyKey: callAmount === 0 ? 'ai_default_check_body' : 'ai_default_call_body',
    actionKey: callAmount === 0 ? 'ai_action_check' : 'ai_action_call_fold',
  };
}

// ─── Hook (kept for backward compat) ─────────────────────────────────────────
export function usePokerAI() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem(AI_ENABLED_KEY) !== 'false'; } catch { return true; }
  });
  const [hint, setHint]       = useState<PokerHint | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(AI_ENABLED_KEY, String(v)); } catch { /* noop */ }
    if (!v) { setVisible(false); setHint(null); }
  }, []);

  const analyse = useCallback((game: GameState, hero: Player) => {
    if (!enabled) return;
    const newHint = analyseState(game, hero);
    if (!newHint) { setVisible(false); return; }
    setHint(prev => prev?.id === newHint.id ? prev : newHint);
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 14000);
  }, [enabled]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  return { enabled, setEnabled, hint, visible, analyse, dismiss };
}
