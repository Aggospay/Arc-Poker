import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Volume2, VolumeX, Maximize2, Wifi, WifiOff,
  MessageSquare, ChevronDown, RefreshCw,
} from 'lucide-react';
import type { GameState, GamePhase, Player, TableInfo } from '../types/poker';
import { buildNewHand, pickWinners, formatUsdc, holeStrength, avatarColor, initials } from '../utils/poker';
import { PlayingCard } from './PlayingCard';
import { ActionBar } from './ActionBar';
import { useArcBalance } from '../hooks/useArcBalance';
import { DepositWithdrawModal } from './DepositWithdrawModal';
import { PokerAIAssistant } from './PokerAIAssistant';
import { usePokerAICtx } from '../context/PokerAIContext';
import { useLocaleCtx } from '../i18n/LocaleContext';
import type { TranslationKey } from '../i18n/LocaleContext';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

// ── 9-seat positions on oval ──────────────────────────────────────────
// Expressed as % from top-left of the oval container
type SeatPos = { top?: string; left?: string; right?: string; bottom?: string; transform?: string };
const SEAT_POSITIONS: SeatPos[] = [
  // 0 — hero (bottom center) — rendered separately in fixed bottom bar
  { bottom: '-2%',  left: '50%',  transform: 'translateX(-50%)' },
  // 1 — bottom-left  (side of hero, left)
  { bottom: '4%',   left: '8%'  },
  // 2 — bottom-right (side of hero, right)
  { bottom: '4%',   right: '8%' },
  // 3 — top-left
  { top:    '4%',   left: '14%' },
  // 4 — top-center
  { top:    '-2%',  left: '50%',  transform: 'translateX(-50%)' },
  // 5 — top-right
  { top:    '4%',   right: '14%' },
  // 6 — mid-left  (hidden when 5 opponents)
  { top:    '38%',  left: '1%',   transform: 'translateY(-50%)' },
  // 7 — mid-right (hidden when 5 opponents)
  { top:    '38%',  right: '1%',  transform: 'translateY(-50%)' },
  // 8 — extra
  { bottom: '18%',  left: '30%'  },
];

const PHASE_LABEL_EN: Record<GamePhase, string> = {
  waiting: 'Waiting', dealing: 'Dealing', preflop: 'Pre-Flop',
  flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown', end: 'End',
};
const PHASE_ORDER: GamePhase[] = ['preflop', 'flop', 'turn', 'river', 'showdown', 'end'];

// ── Bot AI ─────────────────────────────────────────────────────────────
function botDecide(p: Player, g: GameState): { action: 'fold' | 'call' | 'raise' | 'check' | 'allIn'; amount?: number } {
  const str  = holeStrength(p.cards);
  const rand = Math.random();
  if (g.callAmount === 0) {
    if (rand < 0.18) return { action: 'raise', amount: g.bigBlind * (2 + Math.floor(rand * 3)) };
    return { action: 'check' };
  }
  if (str < 0.30 && rand < 0.62) return { action: 'fold' };
  if (str > 0.68 && rand < 0.42) {
    const r = Math.round(g.callAmount * (1.5 + rand * 2));
    return r >= p.balance ? { action: 'allIn' } : { action: 'raise', amount: r };
  }
  if (p.balance <= g.callAmount) return { action: 'allIn' };
  return { action: 'call' };
}

function applyPhase(state: GameState, phase: GamePhase): GameState {
  const cards = [...state.communityCards];
  if (phase === 'flop')     { cards[0] = { ...cards[0], faceUp: true }; cards[1] = { ...cards[1], faceUp: true }; cards[2] = { ...cards[2], faceUp: true }; }
  if (phase === 'turn')     { cards[3] = { ...cards[3], faceUp: true }; }
  if (phase === 'river')    { cards[4] = { ...cards[4], faceUp: true }; }
  if (phase === 'showdown') return { ...state, communityCards: cards.map((c) => ({ ...c, faceUp: true })), phase, callAmount: 0, currentPlayerIndex: -1 };
  return { ...state, communityCards: cards, phase, callAmount: 0, currentPlayerIndex: -1 };
}

interface ChatMsg { id: number; name: string; text: string; type: 'system' | 'player'; self?: boolean; }
let _chatId = 0;

interface Props {
  table: TableInfo;
  heroAddress: string;
  heroName: string;
  heroAvatarUrl?: string | null;
  /** USDC balance of the internal wallet — used for the table stack */
  internalBalance?: number;
  onLeave: () => void;
  /** Called on every financial event so transaction history can record it */
  onTx?: (type: 'bet' | 'blind' | 'win' | 'loss', amount: number, description: string, context?: string) => void;
}

export function PokerTable({ table, heroAddress, heroName, heroAvatarUrl, internalBalance, onLeave, onTx }: Props) {
  const isMobile = useIsMobile();
  const { balance } = useArcBalance();
  // Prefer internal wallet balance; fall back to external balance for demo mode
  const heroBalance = internalBalance ?? parseFloat(balance) ?? 500;

  const [game, setGame]           = useState<GameState>(() => buildNewHand(heroAddress, heroName, heroBalance, undefined, 1, 0, heroAvatarUrl));
  // Keep a ref to latest internalBalance so bet effects always read the current value
  const internalBalRef = useRef(heroBalance);
  internalBalRef.current = heroBalance;
  const heroAvatarRef = useRef(heroAvatarUrl);
  heroAvatarRef.current = heroAvatarUrl;
  const [muted, setMuted]         = useState(false);
  const [isHeroTurn, setIsHeroTurn] = useState(true);
  const [handCount, setHandCount] = useState(1);
  const [showDeposit, setShowDeposit] = useState(false);
  const [chatOpen, setChatOpen]   = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chat, setChat]           = useState<ChatMsg[]>([
    { id: _chatId++, name: 'System', text: 'Welcome to the table! Good luck!', type: 'system' },
  ]);
  const [ping] = useState(() => Math.floor(Math.random() * 40 + 12));
  const [timerPct, setTimerPct]   = useState(100);
  const { hint: aiHint, visible: aiVisible, enabled: aiEnabled, analyse: aiAnalyse, dismiss: aiDismiss } = usePokerAICtx();
  const { t } = useLocaleCtx();
  const tRef = useRef(t);
  tRef.current = t;
  const phaseLabel = useCallback((ph: GamePhase) => {
    const key = (`phase_${ph}`) as TranslationKey;
    const translated = tRef.current(key);
    return translated !== key ? translated : PHASE_LABEL_EN[ph];
  }, []);
  const [floatingLabels, setFloatingLabels] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const chatEnd  = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  let _floatId   = useRef(0);
  // Stable refs so callbacks don't re-create when these change
  const onTxRef       = useRef(onTx);
  const tableNameRef  = useRef(table.name);
  onTxRef.current      = onTx;
  tableNameRef.current = table.name;

  // Trigger AI analysis once when hero's turn starts (not on every game tick)
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    if (!isHeroTurn) return;
    // Small delay so game state is fully settled before analysing
    const t = setTimeout(() => {
      const g = gameRef.current;
      if (g.phase === 'end' || g.phase === 'showdown') return;
      const hero = g.players.find((p) => p.isHero);
      if (hero) aiAnalyse(g, hero);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHeroTurn, handCount]);

  // Timer for hero turn (30s)
  useEffect(() => {
    if (!isHeroTurn || game.phase === 'end' || game.phase === 'showdown') { setTimerPct(100); return; }
    setTimerPct(100);
    let pct = 100;
    timerRef.current = setInterval(() => {
      pct -= 100 / 60; // 30s at ~2x per frame
      setTimerPct(Math.max(0, pct));
      if (pct <= 0) {
        clearInterval(timerRef.current!);
      }
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isHeroTurn, game.phase, handCount]);

  const addChat = useCallback((name: string, text: string, type: 'system' | 'player' = 'system', self = false) => {
    setChat((prev) => [...prev.slice(-40), { id: _chatId++, name, text, type, self }]);
    setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  const spawnFloat = useCallback((text: string, posX = 50, posY = 50, color = 'var(--accent)') => {
    const id = _floatId.current++;
    setFloatingLabels((prev) => [...prev, { id, x: posX, y: posY, text, color }]);
    setTimeout(() => setFloatingLabels((prev) => prev.filter((l) => l.id !== id)), 1700);
  }, []);

  // ── Apply a single bot turn ──────────────────────────────────────────
  const applyBotTurn = useCallback((s: GameState, bot: Player): GameState => {
    const dec = botDecide(bot, s);
    let newPot = s.pot;
    let newCall = s.callAmount;
    const updated = s.players.map((p) => {
      if (p.id !== bot.id) return p;
      if (dec.action === 'fold') {
        addChat('', `${p.name} folds`, 'system');
        return { ...p, status: 'folded' as const, lastAction: 'Fold' };
      }
      if (dec.action === 'check') {
        addChat('', `${p.name} checks`, 'system');
        return { ...p, lastAction: 'Check' };
      }
      if (dec.action === 'call') {
        const ca = Math.min(s.callAmount, p.balance);
        newPot += ca;
        addChat('', `${p.name} calls ${formatUsdc(ca)}`, 'system');
        return { ...p, balance: p.balance - ca, currentBet: p.currentBet + ca, lastAction: `Call ${formatUsdc(ca)}` };
      }
      if (dec.action === 'raise' && dec.amount !== undefined) {
        const ra = Math.min(dec.amount, p.balance);
        newPot += ra; newCall = Math.max(newCall, ra);
        addChat('', `${p.name} raises to ${formatUsdc(ra)}`, 'system');
        return { ...p, balance: p.balance - ra, currentBet: p.currentBet + ra, lastAction: `Raise ${formatUsdc(ra)}` };
      }
      if (dec.action === 'allIn') {
        const ai = p.balance;
        newPot += ai; newCall = Math.max(newCall, ai);
        addChat('', `${p.name} goes ALL-IN! (${formatUsdc(ai)})`, 'system');
        return { ...p, balance: 0, currentBet: p.currentBet + ai, status: 'allIn' as const, lastAction: 'All-In' };
      }
      return p;
    });
    return { ...s, players: updated, pot: newPot, callAmount: newCall };
  }, [addChat]);

  // ── After hero acts → run all bots → advance phase ──────────────────
  const afterHeroAct = useCallback((g: GameState) => {
    setIsHeroTurn(false);

    // All players who can still act (not folded)
    const activePlayers = (s: GameState) => s.players.filter((p) => p.status === 'active' || p.status === 'allIn');
    // Only bots who are still 'active' (can bet)
    const activeBots = g.players.filter((p) => !p.isHero && p.status === 'active');

    // Resolve hand: declare winner, award pot, schedule next hand
    const resolveHand = (s: GameState) => {
      const winners = pickWinners(s.players);
      const share   = s.pot / Math.max(1, winners.length);
      const winnerNames = s.players.filter((p) => winners.includes(p.id)).map((p) => p.name).join(', ');
      addChat('', `${winnerNames} wins ${formatUsdc(s.pot)} USDC 🏆`, 'system');
      spawnFloat(`${winnerNames} wins!`, 50, 40, 'var(--gold)');
      const heroWon = s.players.some((p) => p.isHero && winners.includes(p.id));
      const heroBet = s.players.find((p) => p.isHero)?.currentBet ?? 0;
      if (heroWon) onTxRef.current?.('win', share, `Won pot — ${tableNameRef.current}`, tableNameRef.current);
      else if (heroBet > 0) onTxRef.current?.('loss', -heroBet, `Lost hand — ${tableNameRef.current}`, tableNameRef.current);
      const finalPlayers = s.players.map((p) =>
        winners.includes(p.id) ? { ...p, status: 'winner' as const, balance: p.balance + share } : p
      );
      setGame({ ...s, players: finalPlayers, phase: 'end', winners });
      setTimeout(() => setHandCount((n) => n + 1), 3500);
    };

    // Run remaining streets automatically (all-in run-out) with a delay between each
    const runOut = (s: GameState, delay: number) => {
      const phaseIdx = PHASE_ORDER.indexOf(s.phase);
      const nextPhase = PHASE_ORDER[phaseIdx + 1];
      if (!nextPhase || nextPhase === 'end') {
        setTimeout(() => resolveHand(s), delay);
        return;
      }
      setTimeout(() => {
        const nextState = applyPhase(s, nextPhase);
        const reset = { ...nextState, players: nextState.players.map((p) => ({ ...p, currentBet: 0, lastAction: undefined })) };
        addChat('', `— ${phaseLabel(nextPhase)} —`, 'system');
        setGame(reset);
        if (nextPhase === 'showdown') {
          setTimeout(() => resolveHand(reset), 1200);
        } else {
          runOut(reset, 1200);
        }
      }, delay);
    };

    // After bots act: decide what to do next
    const finish = (s: GameState) => {
      const alive = activePlayers(s);
      // Only one player left standing → instant win
      if (alive.length <= 1) { resolveHand(s); return; }

      // Check if betting is over for this street:
      // everyone remaining is either allIn or has matched callAmount
      const bettingDone = alive.every((p) => p.status === 'allIn' || p.currentBet >= s.callAmount);

      if (bettingDone) {
        // Are we at showdown already?
        if (s.phase === 'showdown') { resolveHand(s); return; }
        // All remaining players are all-in → run out remaining streets automatically
        const allAllIn = alive.every((p) => p.status === 'allIn');
        if (allAllIn) { runOut(s, 900); return; }
      }

      // Normal street advancement
      const phaseIdx  = PHASE_ORDER.indexOf(s.phase);
      const nextPhase = PHASE_ORDER[phaseIdx + 1] ?? 'showdown';
      setTimeout(() => {
        const nextState = applyPhase(s, nextPhase);
        const reset = { ...nextState, players: nextState.players.map((p) => ({ ...p, currentBet: 0, lastAction: undefined })) };
        addChat('', `— ${phaseLabel(nextPhase)} —`, 'system');
        if (nextPhase === 'showdown') {
          setGame(reset);
          setTimeout(() => resolveHand(reset), 1200);
        } else {
          setGame(reset);
          // Only give hero the turn if they're still active (not all-in/folded)
          const heroStatus = reset.players.find((p) => p.isHero)?.status;
          if (heroStatus === 'active') setIsHeroTurn(true);
          else runOut(reset, 1200); // hero is all-in, auto-run remaining streets
        }
      }, 900);
    };

    // Run bot turns sequentially
    const runNext = (idx: number, s: GameState) => {
      if (idx >= activeBots.length) { finish(s); return; }
      setTimeout(() => {
        const bot = activeBots[idx];
        const cur = s.players.find((p) => p.id === bot.id);
        if (!cur || cur.status !== 'active') { runNext(idx + 1, s); return; }
        const next = applyBotTurn(s, cur);
        setGame({ ...next });
        runNext(idx + 1, next);
      }, 700 + idx * 420);
    };
    runNext(0, g);
  }, [applyBotTurn, addChat, spawnFloat, phaseLabel]);

  // ── Hero action handler ──────────────────────────────────────────────
  const handleAction = useCallback((type: 'fold' | 'check' | 'call' | 'raise' | 'allIn', amount?: number) => {
    if (!isHeroTurn) return;
    setGame((prev) => {
      const hero = prev.players.find((p) => p.isHero);
      if (!hero) return prev;
      let pot = prev.pot; let bal = hero.balance; let bet = hero.currentBet;
      let status: Player['status'] = hero.status; let callAmt = prev.callAmount; let label = '';

      let txAmt = 0;
      if (type === 'fold')  { status = 'folded'; label = 'Fold'; }
      if (type === 'check') { label = 'Check'; }
      if (type === 'call')  { const ca = Math.min(prev.callAmount, bal); pot += ca; bal -= ca; bet += ca; label = `Call ${formatUsdc(ca)}`; txAmt = ca; }
      if (type === 'raise' && amount !== undefined) { const ra = Math.min(amount, bal); pot += ra; bal -= ra; bet += ra; callAmt = ra; label = `Raise ${formatUsdc(ra)}`; txAmt = ra; }
      if (type === 'allIn') { const ai = bal; pot += ai; bal = 0; bet += ai; status = 'allIn'; label = `All-In ${formatUsdc(ai)}`; txAmt = ai; }

      // Record bet to history (call/raise/allin commit chips)
      if (txAmt > 0) {
        setTimeout(() => onTxRef.current?.('bet', -txAmt, label, tableNameRef.current), 0);
      }

      addChat(hero.name, label, 'player', true);
      spawnFloat(label, 50, 72, type === 'fold' ? 'var(--danger)' : type === 'allIn' ? 'var(--gold)' : 'var(--accent)');

      const updated = prev.players.map((p) =>
        p.isHero ? { ...p, balance: bal, currentBet: bet, status, lastAction: label } : p
      );
      const newState = { ...prev, pot, callAmount: callAmt, players: updated };
      setTimeout(() => afterHeroAct(newState), 120);
      return newState;
    });
  }, [isHeroTurn, addChat, afterHeroAct, spawnFloat]);

  // ── New hand deal ────────────────────────────────────────────────────
  useEffect(() => {
    if (handCount <= 1) return;
    setGame((prev) => {
      const newDealer = (prev.dealerIndex + 1) % 6;
      const hero = prev.players.find((p) => p.isHero);
      const bots = prev.players.filter((p) => !p.isHero);
      // Use the hero's current in-table balance (chips remaining after bets).
      // If the hero was eliminated this hand (balance=0), use the live gameBalance
      // from the parent so the table resets correctly after a bust.
      const heroCurrent = hero ? Math.max(hero.balance, 0) : 0;
      const hBal = heroCurrent > 0 ? heroCurrent : internalBalRef.current;
      return buildNewHand(heroAddress, heroName, hBal, bots, handCount, newDealer, heroAvatarRef.current);
    });
    setIsHeroTurn(true);
    addChat('', `— Hand #${handCount} —`, 'system');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handCount]);

  const hero    = game.players.find((p) => p.isHero);
  const canCheck = game.callAmount === 0;
  const isEnd   = game.phase === 'end' || game.phase === 'showdown';
  const pingQuality = ping < 30 ? 'good' : ping < 80 ? 'medium' : 'bad';
  const pingLabel   = ping < 30 ? t('conn_excellent') : ping < 80 ? t('conn_good') : t('conn_poor');

  // Send chat message
  const sendChat = () => {
    if (!chatInput.trim()) return;
    addChat(heroName, chatInput.trim(), 'player', true);
    setChatInput('');
  };

  // ── Shared sub-components ──────────────────────────────────────────
  // Bot seat panel — reused in both desktop and mobile layouts
  const renderBotSeat = (player: Player, size: 'sm' | 'md' = 'md') => {
    const isWinner   = player.status === 'winner';
    const isFolded   = player.status === 'folded';
    const isAllIn    = player.status === 'allIn';
    const isThinking = !isHeroTurn && !isEnd && player.status === 'active';
    const R = 16; const CIRC = 2 * Math.PI * R;
    const cardSize = size === 'sm' ? 'sm' as const : 'md' as const;
    return (
      <div key={player.id} className="flex flex-col items-center gap-1" style={{ pointerEvents: 'none' }}>
        {player.currentBet > 0 && (
          <motion.div key={player.currentBet} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="arc-chip gold" style={{ fontSize: 10, padding: '1px 6px', fontWeight: 800 }}>
            +{formatUsdc(player.currentBet)}
          </motion.div>
        )}
        <div className="flex gap-1 relative">
          {player.cards.map((card, ci) => (
            <div key={ci} className="relative">
              <PlayingCard card={isEnd ? { ...card, faceUp: true } : card} size={cardSize} delay={ci * 0.06} winner={isWinner} />
              {isThinking && ci === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, background: 'rgba(0,0,0,0.5)' }}>
                  <svg width={R*2+8} height={R*2+8} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={R+4} cy={R+4} r={R} fill="none" stroke="rgba(56,182,255,0.2)" strokeWidth={3} />
                    <motion.circle cx={R+4} cy={R+4} r={R} fill="none" stroke="rgba(56,182,255,0.9)" strokeWidth={3}
                      strokeLinecap="round" strokeDasharray={CIRC}
                      initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: CIRC }}
                      transition={{ duration: 4, ease: 'linear' }} />
                  </svg>
                  <span style={{ position: 'absolute', fontSize: 9, fontWeight: 800, color: 'rgba(56,182,255,0.95)', fontFamily: 'Space Grotesk' }}>…</span>
                </div>
              )}
              {!isThinking && ci === 1 && player.lastAction && (
                <motion.div key={player.lastAction} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 5, background: isFolded ? 'rgba(239,68,68,0.82)' : isAllIn ? 'rgba(234,179,8,0.88)' : 'rgba(6,182,212,0.82)' }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', fontFamily: 'Space Grotesk', textAlign: 'center', lineHeight: 1.2, padding: '0 2px' }}>{player.lastAction}</span>
                </motion.div>
              )}
              {isFolded && ci === 0 && <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: 'rgba(0,0,0,0.55)' }} />}
            </div>
          ))}
        </div>
        <div className={`seat-panel flex items-center gap-1.5 ${isWinner ? 'is-winner' : ''} ${isFolded ? 'is-folded' : ''} ${isAllIn ? 'is-all-in' : ''} ${isThinking ? 'is-turn' : ''}`}
          style={{ minWidth: size === 'sm' ? 100 : 120, padding: '4px 8px' }}>
          <div className="relative flex-shrink-0">
            <div className="avatar-circle" style={{ width: 28, height: 28, background: player.avatarUrl ? 'transparent' : player.avatarColor, fontSize: 9, overflow: 'hidden' }}>
              {player.avatarUrl ? <img src={player.avatarUrl} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : player.avatar}
            </div>
            {player.isDealer && <div className="dealer-btn absolute -top-1 -right-1" style={{ width: 14, height: 14, fontSize: 6 }}>D</div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ fontSize: 10, color: 'var(--ink-2)' }}>{player.name}</div>
            <div className="arc-chip mt-0.5" style={{ fontSize: 9, padding: '1px 5px' }}>{formatUsdc(player.balance)}</div>
          </div>
          {isFolded && <span className="status-badge folded" style={{ fontSize: 8 }}>F</span>}
          {isAllIn  && <span className="status-badge all-in" style={{ fontSize: 8 }}>AI</span>}
          {isWinner && <span className="status-badge winner" style={{ fontSize: 8 }}>W</span>}
        </div>
      </div>
    );
  };

  // Hero bottom strip — reused in both layouts
  const renderHeroStrip = (compact = false) => (
    <div className={`flex items-center justify-between gap-2 ${compact ? 'px-3 pt-2 pb-1' : 'px-4 pt-2 pb-1'}`}>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <svg width={compact ? 44 : 48} height={compact ? 44 : 48} style={{ position: 'absolute', inset: -4, transform: 'rotate(-90deg)' }}>
            <circle cx={compact ? 22 : 24} cy={compact ? 22 : 24} r={compact ? 18 : 20} stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="none" />
            <circle cx={compact ? 22 : 24} cy={compact ? 22 : 24} r={compact ? 18 : 20}
              stroke={timerPct > 40 ? 'var(--accent)' : timerPct > 15 ? 'var(--warning)' : 'var(--danger)'}
              strokeWidth="3" fill="none"
              strokeDasharray={`${2 * Math.PI * (compact ? 18 : 20)}`}
              strokeDashoffset={`${2 * Math.PI * (compact ? 18 : 20) * (1 - timerPct / 100)}`}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s ease' }} />
          </svg>
          <div className="avatar-circle" style={{
            width: compact ? 36 : 40, height: compact ? 36 : 40,
            background: heroAvatarUrl ? 'transparent' : (hero ? avatarColor(heroAddress) : 'var(--surface-muted)'),
            fontSize: compact ? 10 : 12, fontWeight: 800,
            boxShadow: isHeroTurn && !isEnd ? '0 0 16px rgba(56,182,255,0.55)' : 'none',
            overflow: 'hidden', padding: 0,
          }}>
            {heroAvatarUrl ? <img src={heroAvatarUrl} alt={heroName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (hero ? initials(heroName) || 'ME' : 'ME')}
          </div>
          {hero?.isDealer && <div className="dealer-btn absolute -top-2 -right-2">D</div>}
        </div>
        <div>
          <div className={`font-bold display ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--ink)' }}>{heroName}</div>
          <div className="arc-chip mt-0.5 usdc-val" style={{ fontSize: compact ? 10 : 12 }}>{hero ? formatUsdc(hero.balance) : '0.00'}<span className="usdc-label">USDC</span></div>
        </div>
        {hero && (
          <div className="flex gap-1 ml-1">
            {hero.cards.map((card, ci) => (
              <PlayingCard key={ci} card={{ ...card, faceUp: true }} size={compact ? 'md' : 'lg'} delay={ci * 0.08} winner={hero.status === 'winner'} hero />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {hero?.currentBet && hero.currentBet > 0 ? <div className="arc-chip gold" style={{ fontSize: 10 }}>Bet: {formatUsdc(hero.currentBet)}</div> : null}
        {hero?.isSmallBlind && <div className="status-badge thinking" style={{ fontSize: 9 }}>SB</div>}
        {hero?.isBigBlind && <div className="status-badge all-in" style={{ fontSize: 9 }}>BB</div>}
        {isHeroTurn && !isEnd && hero?.status === 'active' && <div className="status-badge thinking" style={{ fontSize: 9 }}>Your Turn</div>}
      </div>
    </div>
  );

  // Action area — reused in both layouts
  const renderActionArea = (compact = false) => (
    <div className={compact ? 'px-2 pb-2 pt-0.5' : 'px-4 pb-4 pt-1'}>
      {!hero || isEnd ? (
        <div className={`text-center font-semibold ${compact ? 'py-2 text-xs' : 'py-3 text-sm'}`} style={{ color: hero?.status === 'winner' ? 'var(--gold)' : 'var(--muted)' }}>
          {hero?.status === 'winner' ? `You won ${formatUsdc(game.pot)} USDC! Next hand dealing...` : 'Hand complete — next hand dealing...'}
        </div>
      ) : hero.status === 'folded' ? (
        <div className={`text-center ${compact ? 'py-2 text-xs' : 'py-3 text-sm'}`} style={{ color: 'var(--subtle)' }}>{t('status_folded_wait')}</div>
      ) : hero.status === 'allIn' ? (
        <div className={`text-center font-bold animate-pulse ${compact ? 'py-2 text-xs' : 'py-3 text-sm'}`} style={{ color: 'var(--gold)' }}>🏆 {t('status_allin_runout')}</div>
      ) : (
        <ActionBar callAmount={game.callAmount} minRaise={game.minRaise} heroBalance={hero.balance} pot={game.pot}
          onFold={() => handleAction('fold')} onCheck={() => handleAction('check')} onCall={() => handleAction('call')}
          onRaise={(amt) => handleAction('raise', amt)} onAllIn={() => handleAction('allIn')}
          canCheck={canCheck} disabled={!isHeroTurn || isEnd} />
      )}
    </div>
  );

  // Win overlays — used in both layouts
  const renderWinOverlays = () => (
    <>
      <AnimatePresence>
        {isEnd && game.winners && game.winners.length > 0 && !game.players.find(p => p.isHero && game.winners?.includes(p.id)) && (
          <motion.div initial={{ opacity: 0, scale: 0.7, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }}
            className="absolute z-30" style={{ top: '8%', left: '50%', transform: 'translateX(-50%)' }}>
            <div className="px-5 py-2 rounded-2xl font-bold text-sm display"
              style={{ background: 'rgba(30,20,0,0.92)', border: '1.5px solid rgba(245,200,66,0.6)', color: '#f5c842', boxShadow: '0 0 40px rgba(245,200,66,0.45)', backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}>
              🏆 {game.players.find((p) => game.winners?.includes(p.id))?.name ?? 'Winner'} wins {formatUsdc(game.pot)} USDC
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isEnd && game.winners && game.players.find(p => p.isHero && game.winners?.includes(p.id)) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(245,200,66,0.18) 0%, rgba(0,0,0,0.55) 70%)' }}>
            <motion.div initial={{ scale: 0.3, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
              className="flex flex-col items-center gap-4 text-center px-6">
              <motion.div animate={{ rotate: [0, -8, 8, -8, 8, 0], scale: [1, 1.15, 1] }} transition={{ duration: 0.7, delay: 0.3 }} style={{ fontSize: 72, lineHeight: 1 }}>🏆</motion.div>
              <div className="font-black display" style={{ fontSize: 'clamp(2.8rem, 8vw, 6rem)', color: '#f5c842', textShadow: '0 0 40px rgba(245,200,66,0.9), 0 0 80px rgba(245,200,66,0.5), 0 4px 0 rgba(0,0,0,0.6)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{t('you_win_title')}</div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="font-bold tabnum" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.8rem)', color: '#fff', textShadow: '0 0 24px rgba(245,200,66,0.7)' }}>
                + {formatUsdc(game.pot)} USDC
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const sharedModals = (
    <>
      <PokerAIAssistant hint={aiHint} visible={aiVisible} enabled={aiEnabled} onDismiss={aiDismiss} />
      <DepositWithdrawModal open={showDeposit} onClose={() => setShowDeposit(false)}
        onDeposit={(amt) => setGame((prev) => ({ ...prev, players: prev.players.map((p) => p.isHero ? { ...p, balance: p.balance + amt } : p) }))} />
      {pingQuality === 'bad' && (
        <div className="absolute top-16 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(240,96,128,0.15)', border: '1px solid rgba(240,96,128,0.35)', color: 'var(--danger)' }}>
          <WifiOff size={13} /> <span className="text-xs font-bold">Poor connection</span>
          <Wifi size={13} className="hidden" />
        </div>
      )}
    </>
  );

  // ── Common top bar ──────────────────────────────────────────────────
  const topBar = (
    <header className="flex items-center justify-between px-3 py-2 flex-shrink-0 z-20"
      style={{ background: 'rgba(4,8,20,0.92)', borderBottom: '1px solid rgba(56,182,255,0.10)', backdropFilter: 'blur(16px)', minHeight: 48 }}>
      <div className="flex items-center gap-2">
        <button onClick={onLeave} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ background: 'rgba(240,96,128,0.10)', border: '1px solid rgba(240,96,128,0.22)', color: 'var(--danger)' }}>
          <ArrowLeft size={13} /><span className="hidden sm:inline">Leave</span>
        </button>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
          <div className={`net-dot ${pingQuality}`} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-2)' }}>{pingLabel}</span>
          <span className="tabnum text-[10px]" style={{ color: 'var(--subtle)' }}>{ping}ms</span>
        </div>
      </div>
      <div className="text-center absolute left-1/2" style={{ transform: 'translateX(-50%)' }}>
        <div className="display font-bold text-xs leading-tight" style={{ color: 'var(--ink)' }}>{table.name}</div>
        <div className="text-[10px] tabnum" style={{ color: 'var(--muted)' }}>{table.smallBlind}/{table.bigBlind} · Hand #{game.handCount}</div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => setMuted((m) => !m)} className={`icon-btn ${muted ? 'active' : ''}`}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
        <button className="icon-btn hidden md:flex"><Maximize2 size={14} /></button>
        <button className="icon-btn hidden lg:flex"><RefreshCw size={14} /></button>
        <button onClick={() => setChatOpen((v) => !v)} className={`icon-btn ${chatOpen ? 'active' : ''}`}><MessageSquare size={14} /></button>
      </div>
    </header>
  );

  // ════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT — vertical, full-height
  // ════════════════════════════════════════════════════════════════════
  if (isMobile) {
    const bots = game.players.filter((p) => !p.isHero);
    const top2 = bots.slice(0, 2);    // top row
    const mid1 = bots.slice(2, 3);    // middle row (optional 3rd opponent)
    const sides = bots.slice(3);      // any extras
    return (
      <div className="flex flex-col overflow-hidden"
        style={{ height: '100dvh', width: '100%', background: 'radial-gradient(ellipse at 50% 30%, #06122a 0%, #040810 60%, #020508 100%)', position: 'relative' }}>
        {topBar}

        {/* Opponents area — top section */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1 px-2 pt-1 pb-0.5">
          {/* Top row: up to 2 opponents side-by-side */}
          <div className="flex justify-center gap-3 w-full">
            {top2.map((p) => renderBotSeat(p, 'sm'))}
          </div>
          {/* 3rd opponent centered */}
          {mid1.length > 0 && (
            <div className="flex justify-center gap-3 w-full">
              {mid1.map((p) => renderBotSeat(p, 'sm'))}
              {sides.map((p) => renderBotSeat(p, 'sm'))}
            </div>
          )}
        </div>

        {/* Table felt — community cards + pot, centered, takes remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-2" style={{ minHeight: 0 }}>
          {/* Felt background */}
          <div className="relative w-full" style={{ maxWidth: 380 }}>
            <img src="/loop.svg" alt="poker table" draggable={false}
              style={{ width: '100%', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none', borderRadius: 16, opacity: 0.92 }} />

            {/* Phase + community cards + pot — overlaid on felt */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <div className="phase-badge" style={{ fontSize: 10, padding: '2px 10px' }}>{phaseLabel(game.phase)}</div>

              {/* Community cards — 5 across */}
              <div className="flex items-center gap-1">
                {[0,1,2,3,4].map((i) => {
                  const card = game.communityCards[i];
                  if (card?.faceUp) return <PlayingCard key={i} card={card} size="sm" delay={i * 0.09} />;
                  return <div key={i} className="community-slot" style={{ width: 36, height: 50 }} />;
                })}
              </div>

              {/* Pot */}
              <motion.div key={game.pot} initial={{ scale: 1.14 }} animate={{ scale: 1 }} transition={{ duration: 0.22 }}>
                <div className="pot-panel" style={{ padding: '3px 10px', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(245,200,66,0.7)" strokeWidth="1.5" fill="rgba(245,200,66,0.12)" />
                  </svg>
                  <span className="usdc-val tabnum display" style={{ fontSize: 12 }}>{formatUsdc(game.pot)}<span className="usdc-label">USDC</span></span>
                  <span style={{ fontSize: 10, color: 'var(--subtle)' }}>Pot</span>
                </div>
              </motion.div>
            </div>

            {/* Floating action labels */}
            <AnimatePresence>
              {floatingLabels.map((fl) => (
                <motion.div key={fl.id} initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -24 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }}
                  style={{ position: 'absolute', left: `${fl.x}%`, top: `${fl.y}%`, transform: 'translate(-50%,-50%)', zIndex: 20, pointerEvents: 'none' }}>
                  <div className="px-3 py-1 rounded-full font-bold display" style={{ fontSize: 11, background: 'rgba(4,10,28,0.88)', border: `1px solid ${fl.color}`, color: fl.color, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>{fl.text}</div>
                </motion.div>
              ))}
            </AnimatePresence>

            {renderWinOverlays()}
          </div>
        </div>

        {/* Hero bottom section */}
        <div className="flex-shrink-0 z-20" style={{ background: 'rgba(3,7,18,0.97)', borderTop: '1px solid rgba(56,182,255,0.12)', backdropFilter: 'blur(20px)' }}>
          {renderHeroStrip(true)}
          {renderActionArea(true)}
        </div>

        {/* Chat — slides up from bottom on mobile */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.25 }}
              className="absolute inset-x-0 bottom-0 z-50 flex flex-col"
              style={{ height: '55%', background: 'rgba(4,8,20,0.97)', borderTop: '1px solid rgba(56,182,255,0.15)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(56,182,255,0.10)' }}>
                <span className="text-xs font-semibold display" style={{ color: 'var(--accent)' }}>Table Chat</span>
                <button onClick={() => setChatOpen(false)} style={{ color: 'var(--subtle)' }}><ChevronDown size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5" style={{ minHeight: 0 }}>
                {chat.map((m) => (
                  <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'}`}>
                    <div>
                      {m.type === 'player' && !m.self && <div className="text-[9px] mb-0.5 px-1" style={{ color: 'var(--subtle)' }}>{m.name}</div>}
                      <div className={`chat-bubble ${m.type === 'system' ? 'system' : m.self ? 'self' : 'other'}`}>{m.text}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>
              <div className="flex gap-1 px-2 py-1 flex-wrap" style={{ borderTop: '1px solid rgba(56,182,255,0.08)' }}>
                {['👍','😎','🔥','🙈','😤'].map((e) => (
                  <button key={e} onClick={() => addChat(heroName, e, 'player', true)} className="text-base hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
              <div className="flex gap-1 p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(56,182,255,0.08)' }}>
                <input className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--ink)', fontFamily: 'DM Sans' }}
                  placeholder="Say something..." value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} maxLength={80} />
                <button onClick={sendChat} className="btn-primary px-2 rounded-lg text-xs font-bold">↑</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sharedModals}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT — horizontal oval table
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100dvh', width: '100%',
        background: 'radial-gradient(ellipse at 50% 30%, #06122a 0%, #040810 60%, #020508 100%)',
      }}
    >
      {topBar}

      {/* ══ MAIN PLAY AREA ═════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative" style={{ minHeight: 0 }}>

        {/* ── Table canvas ────────────────────────── */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden" style={{ minWidth: 0, padding: '12px 14px 8px' }}>

          {/* Table */}
          <div
            className="relative"
            style={{
              width: '100%',
              maxWidth: 900,
              aspectRatio: '900/520',
              maxHeight: 520,
            }}
          >
            {/* Table image */}
            <img
              src="/loop.svg"
              alt="poker table"
              draggable={false}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />

            {/* ── CENTER: phase + pot + community cards ── */}
            <div
              className="absolute z-10"
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -52%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
              <div className="phase-badge">{phaseLabel(game.phase)}</div>

              {/* Community cards */}
              <div className="flex items-center gap-2">
                {[0,1,2,3,4].map((i) => {
                  const card = game.communityCards[i];
                  if (card?.faceUp) return <PlayingCard key={i} card={card} size="lg" delay={i * 0.09} />;
                  return (
                    <div
                      key={i}
                      className="community-slot"
                      style={{ width: 84, height: 118 }}
                    />
                  );
                })}
              </div>

              {/* Pot */}
              <motion.div key={game.pot} initial={{ scale: 1.14 }} animate={{ scale: 1 }} transition={{ duration: 0.22 }}>
                <div className="pot-panel">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(245,200,66,0.7)" strokeWidth="1.5" fill="rgba(245,200,66,0.12)" />
                    <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="rgba(245,200,66,0.9)" fontFamily="Space Grotesk">◈</text>
                  </svg>
                  <span className="tabnum font-bold text-sm display" style={{ color: '#f5c842', textShadow: '0 0 12px rgba(245,200,66,0.45)' }}>
                    {formatUsdc(game.pot)} USDC
                  </span>
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>Pot</span>
                </div>
              </motion.div>
            </div>

            {/* ── Floating labels (action announcements) ── */}
            <AnimatePresence>
              {floatingLabels.map((fl) => (
                <motion.div
                  key={fl.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -32, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5 }}
                  style={{
                    position: 'absolute', left: `${fl.x}%`, top: `${fl.y}%`,
                    transform: 'translate(-50%, -50%)', zIndex: 20, pointerEvents: 'none',
                  }}
                >
                  <div
                    className="px-4 py-1.5 rounded-full font-bold text-sm display"
                    style={{
                      background: 'rgba(4,10,28,0.88)',
                      border: `1px solid ${fl.color}`,
                      color: fl.color,
                      backdropFilter: 'blur(8px)',
                      boxShadow: `0 0 18px ${fl.color}44`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fl.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {renderWinOverlays()}

            {/* ── Seat panels (bots only, hero is in bottom bar) ── */}
            {game.players.filter((p) => !p.isHero).map((player) => {
              const pos = SEAT_POSITIONS[player.position];
              if (!pos) return null;
              const isWinner   = player.status === 'winner';
              const isFolded   = player.status === 'folded';
              const isAllIn    = player.status === 'allIn';
              const isThinking = !isHeroTurn && !isEnd && player.status === 'active';
              // Timer ring constants (shown on card back when it's this bot's turn)
              const R = 18; const CIRC = 2 * Math.PI * R;

              return (
                <div
                  key={player.id}
                  className="absolute z-10"
                  style={{ ...pos, pointerEvents: 'none' }}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Bet amount above cards */}
                    {player.currentBet > 0 && (
                      <motion.div
                        key={player.currentBet}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="arc-chip gold"
                        style={{ fontSize: 11, padding: '2px 8px', fontWeight: 800 }}
                      >
                        +{formatUsdc(player.currentBet)} USDC
                      </motion.div>
                    )}
                    {/* Hole cards — timer on 1st card, lastAction on 2nd card */}
                    <div className="flex gap-1 relative">
                      {player.cards.map((card, ci) => (
                        <div key={ci} className="relative">
                          <PlayingCard
                            card={isEnd ? { ...card, faceUp: true } : card}
                            size="md"
                            delay={ci * 0.06}
                            winner={isWinner}
                          />
                          {/* Timer ring overlay on first card when thinking */}
                          {isThinking && ci === 0 && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 5, background: 'rgba(0,0,0,0.5)',
                            }}>
                              <svg width={R*2+8} height={R*2+8} style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx={R+4} cy={R+4} r={R} fill="none" stroke="rgba(56,182,255,0.2)" strokeWidth={3} />
                                <motion.circle
                                  cx={R+4} cy={R+4} r={R} fill="none"
                                  stroke="rgba(56,182,255,0.9)" strokeWidth={3}
                                  strokeLinecap="round"
                                  strokeDasharray={CIRC}
                                  initial={{ strokeDashoffset: 0 }}
                                  animate={{ strokeDashoffset: CIRC }}
                                  transition={{ duration: 4, ease: 'linear' }}
                                />
                              </svg>
                              <span style={{
                                position: 'absolute', fontSize: 10, fontWeight: 800,
                                color: 'rgba(56,182,255,0.95)', fontFamily: 'Space Grotesk',
                              }}>…</span>
                            </div>
                          )}
                          {/* Last action overlay on second card */}
                          {!isThinking && ci === 1 && player.lastAction && (
                            <motion.div
                              key={player.lastAction}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                borderRadius: 5,
                                background: isFolded
                                  ? 'rgba(239,68,68,0.82)'
                                  : isAllIn
                                  ? 'rgba(234,179,8,0.88)'
                                  : 'rgba(6,182,212,0.82)',
                              }}
                            >
                              <span style={{
                                fontSize: 9, fontWeight: 900, color: '#fff',
                                fontFamily: 'Space Grotesk', textAlign: 'center',
                                lineHeight: 1.2, padding: '0 2px',
                                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                                letterSpacing: '-0.2px',
                              }}>
                                {player.lastAction}
                              </span>
                            </motion.div>
                          )}
                          {/* Fold overlay — grey out both cards */}
                          {isFolded && ci === 0 && (
                            <div style={{
                              position: 'absolute', inset: 0, borderRadius: 5,
                              background: 'rgba(0,0,0,0.55)',
                            }} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Seat panel */}
                    <div
                      className={`seat-panel flex items-center gap-2
                        ${isWinner ? 'is-winner' : ''} ${isFolded ? 'is-folded' : ''}
                        ${isAllIn ? 'is-all-in' : ''} ${isThinking ? 'is-turn' : ''}`}
                      style={{ minWidth: 130, padding: '6px 10px' }}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="avatar-circle"
                          style={{ width: 34, height: 34, background: player.avatarUrl ? 'transparent' : player.avatarColor, fontSize: 11, overflow: 'hidden' }}
                        >
                          {player.avatarUrl
                            ? <img src={player.avatarUrl} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : player.avatar}
                        </div>
                        {player.isDealer && (
                          <div className="dealer-btn absolute -top-1.5 -right-1.5" style={{ width: 18, height: 18, fontSize: 7 }}>D</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{player.name}</div>
                        <div className="arc-chip mt-0.5" style={{ fontSize: 11, padding: '2px 7px' }}>
                          {formatUsdc(player.balance)}
                        </div>
                      </div>

                      {/* Status badge */}
                      {isFolded && <span className="status-badge folded" style={{ fontSize: 10 }}>Fold</span>}
                      {isAllIn  && <span className="status-badge all-in" style={{ fontSize: 10 }}>All-In</span>}
                      {isWinner && <span className="status-badge winner" style={{ fontSize: 10 }}>Win</span>}
                    </div>


                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Chat panel (right side) ──────────────────────────── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex-shrink-0 overflow-hidden"
              style={{ borderLeft: '1px solid rgba(56,182,255,0.10)' }}
            >
              <div className="chat-panel h-full flex flex-col" style={{ borderRadius: 0, border: 'none', width: 220 }}>
                <div
                  className="flex items-center justify-between px-3 py-2 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(56,182,255,0.10)' }}
                >
                  <span className="text-xs font-semibold display" style={{ color: 'var(--accent)' }}>Table Chat</span>
                  <button onClick={() => setChatOpen(false)} style={{ color: 'var(--subtle)' }}><ChevronDown size={14} /></button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5" style={{ minHeight: 0 }}>
                  {chat.map((m) => (
                    <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'}`}>
                      <div>
                        {m.type === 'player' && !m.self && (
                          <div className="text-[9px] mb-0.5 px-1" style={{ color: 'var(--subtle)' }}>{m.name}</div>
                        )}
                        <div className={`chat-bubble ${m.type === 'system' ? 'system' : m.self ? 'self' : 'other'}`}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>

                {/* Quick reactions */}
                <div className="flex gap-1 px-2 py-1 flex-wrap" style={{ borderTop: '1px solid rgba(56,182,255,0.08)' }}>
                  {['👍','😎','🔥','🙈','😤'].map((e) => (
                    <button
                      key={e}
                      onClick={() => addChat(heroName, e, 'player', true)}
                      className="text-base hover:scale-125 transition-transform"
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-1 p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(56,182,255,0.08)' }}>
                  <input
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      color: 'var(--ink)', fontFamily: 'DM Sans',
                    }}
                    placeholder="Say something..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                    maxLength={80}
                  />
                  <button
                    onClick={sendChat}
                    className="btn-primary px-2 rounded-lg text-xs font-bold"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ HERO BOTTOM STRIP + ACTION BAR ═════════════════════════════ */}
      <div className="flex-shrink-0 z-20"
        style={{ background: 'rgba(3,7,18,0.97)', borderTop: '1px solid rgba(56,182,255,0.12)', backdropFilter: 'blur(20px)' }}>
        {renderHeroStrip(false)}
        {renderActionArea(false)}
      </div>

      {sharedModals}
    </div>
  );
}
