import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AppView, TableInfo } from './types/poker';
import { LeftSidebar }          from './components/LeftSidebar';
import { Lobby }                from './components/Lobby';
import { PokerTable }           from './components/PokerTable';
import { Profile }              from './components/Profile';
import { Leaderboard }          from './components/Leaderboard';
import { TransactionHistory }   from './components/TransactionHistory';
import { Inventory }            from './components/Inventory';
import { Rewards }              from './components/Rewards';
import { WalletPanel }          from './components/WalletPanel';
import { DepositWithdrawModal } from './components/DepositWithdrawModal';
import { AuthModal }            from './components/AuthModal';
import { CreateLobbyModal }        from './components/CreateLobbyModal';
import { PrivateLobbyWaiting, PasswordPrompt, JoinByCodeModal } from './components/PrivateLobbyRoom';
import { CreateTournamentModal }   from './components/CreateTournamentModal';
import { TournamentLobby }         from './components/TournamentLobby';
import { TournamentEliminated }    from './components/TournamentEliminated';
import { useAuth }                 from './hooks/useAuth';
import { useInternalWallet }       from './hooks/useInternalWallet';
import { useTransactionHistory }   from './hooks/useTransactionHistory';
import { useProfileStorage }       from './hooks/useProfileStorage';
import { usePrivateLobby }         from './hooks/usePrivateLobby';
import { useTournament }           from './hooks/useTournament';
import { useGameBalance }          from './hooks/useGameBalance';
import type { PrivateRoom }        from './hooks/usePrivateLobby';
import type { Tournament }         from './hooks/useTournament';
import { ShieldCheck, Wallet, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const PAGE = {
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -6 },
  transition: { duration: 0.18 },
};

export default function App() {
  const [view, setView]                 = useState<AppView>('lobby');
  const [activeTable, setActiveTable]   = useState<TableInfo | null>(null);
  const [depositOpen, setDepositOpen]   = useState(false);
  const [authOpen, setAuthOpen]         = useState(false);

  // ── Private lobby ────────────────────────────────────────────────────
  const [createLobbyOpen,  setCreateLobbyOpen]  = useState(false);
  const [joinByCodeOpen,   setJoinByCodeOpen]   = useState(false);
  const [waitingRoom,      setWaitingRoom]       = useState<PrivateRoom | null>(null);
  const [passwordRoom,     setPasswordRoom]      = useState<PrivateRoom | null>(null);

  // ── Tournament ───────────────────────────────────────────────────────
  const [createTourneyOpen,   setCreateTourneyOpen]  = useState(false);
  const [tourneyLobby,        setTourneyLobby]       = useState<Tournament | null>(null);
  const [tourneyEliminated,   setTourneyEliminated]  = useState<{ tournament: Tournament } | null>(null);

  // ── Auth ────────────────────────────────────────────────────────────
  const { isLoggedIn, userId, name: authName, method, loginEmail, loginGoogle, logout } = useAuth();

  // ── Profile (persisted name/avatar) ────────────────────────────────
  // Use userId as key so each account keeps its own profile
  const { displayName, avatarUrl: heroAvatarUrl } = useProfileStorage(userId ?? undefined);

  // Derive hero name priority: saved profile name > auth name > userId short > Guest
  const fallbackName = userId ? `Player_${userId.slice(-6)}` : 'Guest';
  const heroName = (displayName && displayName !== fallbackName && displayName !== 'Guest')
    ? displayName
    : (authName ?? fallbackName);

  // ── Internal wallet ─────────────────────────────────────────────────
  const sessionMethod = (method === 'wallet') ? 'wallet' : 'offline';
  const {
    state: walletState,
    cachedAddress,
    internalBalance,
    derive,
    refetchBalance,
  } = useInternalWallet({
    sessionUserId: userId ?? undefined,
    sessionMethod,
  });

  const internalAddr  = walletState.status === 'ready' ? walletState.address : cachedAddress;
  const hasInternal   = !!internalAddr;
  const onChainBal    = parseFloat(internalBalance) || 0;

  // ── Game balance (local ledger, persisted in localStorage) ──────────
  const { gameBalance, deduct, credit, syncToChain } = useGameBalance(internalAddr ?? undefined);

  // When on-chain balance grows since last read, sync the game balance cap upward.
  // This handles the case where a deposit landed but the game balance was already
  // credited optimistically — syncToChain only raises the ceiling, never lowers it.
  const prevOnChainRef = useRef(0);
  useEffect(() => {
    if (onChainBal > 0) {
      if (onChainBal > prevOnChainRef.current) {
        syncToChain(onChainBal);
      }
      prevOnChainRef.current = onChainBal;
    }
  }, [onChainBal, syncToChain]);

  const { addTx } = useTransactionHistory(internalAddr ?? undefined);

  // ── Private lobby ────────────────────────────────────────────────────
  const { activeRooms, createRoom, joinRoom, leaveRoom, startRoom } = usePrivateLobby(userId ?? undefined);
  const {
    activeTournaments,
    createTournament,
    joinTournament: _joinTournament,
    startTournament,
    leaveTournament,
    eliminatePlayer,
  } = useTournament(userId ?? undefined, heroName);

  const handleCreateRoom = (opts: { name: string; password: string; maxPlayers: number; smallBlind: number; bigBlind: number; minBuyIn: number }) => {
    if (!isLoggedIn) { setAuthOpen(true); return; }
    const room = createRoom({ ...opts, hostName: heroName });
    setWaitingRoom(room);
  };

  const handleJoinPrivateRoom = (room: PrivateRoom) => {
    if (!isLoggedIn) { setAuthOpen(true); return; }
    if (room.status === 'playing') {
      // Convert private room to a TableInfo and join
      const t: TableInfo = {
        id: room.id, name: room.name, variant: 'cash',
        smallBlind: room.smallBlind, bigBlind: room.bigBlind,
        minBuyIn: room.minBuyIn, maxBuyIn: room.minBuyIn * 10,
        players: room.players.length, maxPlayers: room.maxPlayers,
        avgPot: room.bigBlind * 8, featured: false, speed: 'normal',
      };
      tryJoinTable(t);
      return;
    }
    if (room.password) {
      setPasswordRoom(room);
    } else {
      const result = joinRoom(room.id, '');
      if (result === 'ok') setWaitingRoom(room);
      else toast.error(result === 'full' ? 'Table is full' : 'Could not join');
    }
  };

  const handlePasswordSubmit = (pwd: string) => {
    if (!passwordRoom) return;
    const result = joinRoom(passwordRoom.id, pwd);
    if (result === 'ok') { setWaitingRoom(passwordRoom); setPasswordRoom(null); }
    else if (result === 'wrong_password') toast.error('Wrong password');
    else toast.error(result === 'full' ? 'Table is full' : 'Could not join');
  };

  const handleJoinByCode = (code: string) => {
    const room = activeRooms.find((r) => r.id === code.toUpperCase());
    if (!room) { toast.error(`Room "${code}" not found`); return; }
    setJoinByCodeOpen(false);
    handleJoinPrivateRoom(room);
  };

  const handleStartRoom = (room: PrivateRoom) => {
    startRoom(room.id);
    setWaitingRoom(null);
    const t: TableInfo = {
      id: room.id, name: room.name, variant: 'cash',
      smallBlind: room.smallBlind, bigBlind: room.bigBlind,
      minBuyIn: room.minBuyIn, maxBuyIn: room.minBuyIn * 10,
      players: room.players.length, maxPlayers: room.maxPlayers,
      avgPot: room.bigBlind * 8, featured: false, speed: 'normal',
    };
    tryJoinTable(t);
  };

  // ── Table join guard ────────────────────────────────────────────────
  const tryJoinTable = (t: TableInfo) => {
    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }
    if (!hasInternal) {
      toast.error('Create your internal wallet to play', { description: 'A wallet is being set up for you…' });
      derive();
      return;
    }
    if (gameBalance < t.bigBlind * 10) {
      toast.error('Insufficient balance', {
        description: `Need at least ${t.bigBlind * 10} USDC to join. Deposit first.`,
      });
      setDepositOpen(true);
      return;
    }
    setActiveTable(t);
    setView('table');
  };

  // ── Tournament handlers ─────────────────────────────────────────────
  const handleCreateTourney = (opts: { name: string; password: string; maxPlayers: number; buyIn: number; startingChips: number }) => {
    if (!isLoggedIn) { setAuthOpen(true); return; }
    const t = createTournament(opts);
    setTourneyLobby(t);
    setCreateTourneyOpen(false);
  };

  const handleOpenTourney = (t: Tournament) => {
    if (!isLoggedIn) { setAuthOpen(true); return; }
    setTourneyLobby(t);
  };

  const handleStartTourney = (tournamentId: string) => {
    startTournament(tournamentId);
    // Update local ref
    if (tourneyLobby?.id === tournamentId) {
      setTourneyLobby((prev) => prev ? { ...prev, status: 'running' } : prev);
    }
  };

  const handleLeaveTourney = (tournamentId: string) => {
    leaveTournament(tournamentId);
    setTourneyLobby(null);
  };

  // Called when player runs out of chips in a tournament game (wire to PokerTable in future)
  const _handleTourneyElimination = (tournamentId: string, uid: string) => {
    eliminatePlayer(tournamentId, uid);
    const t = activeTournaments.find((x) => x.id === tournamentId);
    if (t) setTourneyEliminated({ tournament: t });
  };
  void _handleTourneyElimination; // reserved for tournament game integration

  // ── Full-screen table ───────────────────────────────────────────────
  if (view === 'table' && activeTable) {
    return (
      <PokerTable
        table={activeTable}
        heroAddress={userId ?? '0x0000000000000000000000000000000000000001'}
        heroName={heroName}
        heroAvatarUrl={heroAvatarUrl}
        internalBalance={gameBalance}
        onLeave={() => { setActiveTable(null); setView('lobby'); }}
        onTx={(type, amount, description, context) => {
          // Update local game balance immediately
          const abs = Math.abs(amount);
          if (type === 'bet' || type === 'blind') deduct(abs);
          else if (type === 'win') credit(abs);
          // Only record wins in history (bets/losses create too much noise)
          if (type === 'win') addTx(type, amount, description, { context });
        }}
      />
    );
  }

  return (
    <div className="flex" style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* ── Left sidebar ──────────────────────────── */}
      <div className="hidden md:block">
        <LeftSidebar
          currentView={view}
          onNavigate={setView}
          onQuickJoin={() => setView('lobby')}
          internalBalance={gameBalance.toFixed(2)}
          internalAddress={internalAddr ?? undefined}
          hasInternalWallet={hasInternal}
          onOpenWallet={() => isLoggedIn ? setDepositOpen(true) : setAuthOpen(true)}
          isLoggedIn={isLoggedIn}
          onOpenAuth={() => setAuthOpen(true)}
          onLogout={logout}
          authName={heroName}
          authMethod={method ?? undefined}
        />
      </div>

      {/* ── Main content ───────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: '100dvh', minWidth: 0 }}>
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ background: 'rgba(4,8,15,0.95)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
        >
          <button onClick={() => setView('lobby')} className="flex items-center gap-2">
            <img src="/icon512.svg" alt="ARC" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span className="display font-bold text-sm glow-text" style={{ color: 'var(--ink)' }}>ARC Poker</span>
          </button>
          {isLoggedIn
            ? <button onClick={() => setDepositOpen(true)} className="btn-primary rounded-xl px-3 py-1.5 text-xs">+ Deposit</button>
            : <button onClick={() => setAuthOpen(true)} className="btn-primary rounded-xl px-3 py-1.5 text-xs flex items-center gap-1">
                <LogIn size={11} /> Sign In
              </button>
          }
        </header>

        {/* Not logged in banner */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 px-4 py-3 rounded-2xl flex items-center gap-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,rgba(56,182,255,0.10),rgba(14,165,233,0.06))', border: '1px solid rgba(56,182,255,0.24)' }}
          >
            <LogIn size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Sign in to play ARC Poker</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Use your wallet, email, or Google account</div>
            </div>
            <button onClick={() => setAuthOpen(true)} className="btn-primary rounded-xl px-3 py-1.5 text-xs flex-shrink-0">
              Sign In
            </button>
          </motion.div>
        )}

        {/* Internal wallet banner — when logged in but no internal wallet yet */}
        {isLoggedIn && !hasInternal && method === 'wallet' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4 px-4 py-3 rounded-2xl flex items-center gap-3 flex-shrink-0"
            style={{ background: 'rgba(56,182,255,0.07)', border: '1px solid rgba(56,182,255,0.22)' }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Create your internal wallet</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>One signature. Funds stay in your control.</div>
            </div>
            <button
              onClick={derive}
              disabled={walletState.status === 'signing'}
              className="btn-primary rounded-xl px-3 py-1.5 text-xs flex-shrink-0 flex items-center gap-1"
            >
              <Wallet size={11} />
              {walletState.status === 'signing' ? 'Signing…' : 'Create'}
            </button>
          </motion.div>
        )}

        {/* Page content */}
        <AnimatePresence mode="wait">
          {(view === 'lobby' || view === 'cashgames' || view === 'tournaments' || view === 'sitandgo') && (
            <motion.div key="lobby" {...PAGE} className="flex-1 flex flex-col overflow-hidden">
              <Lobby
                onJoinTable={tryJoinTable}
                variant={view === 'cashgames' ? 'cash' : view === 'tournaments' ? 'tournament' : view === 'sitandgo' ? 'sng' : 'all'}

                privateRooms={activeRooms}
                onCreatePrivate={() => isLoggedIn ? setCreateLobbyOpen(true) : setAuthOpen(true)}
                onJoinPrivateRoom={handleJoinPrivateRoom}
                onJoinByCode={() => setJoinByCodeOpen(true)}
                tournaments={activeTournaments}
                onCreateTournament={() => isLoggedIn ? setCreateTourneyOpen(true) : setAuthOpen(true)}
                onOpenTournament={handleOpenTourney}
              />
            </motion.div>
          )}
          {view === 'profile' && (
            <motion.div key="profile" {...PAGE} className="flex-1 overflow-y-auto">
              <Profile gameBalance={gameBalance} />
            </motion.div>
          )}
          {view === 'leaderboard' && (
            <motion.div key="leaderboard" {...PAGE} className="flex-1 overflow-y-auto">
              <Leaderboard />
            </motion.div>
          )}
          {view === 'history' && (
            <motion.div key="history" {...PAGE} className="flex-1 overflow-y-auto">
              <TransactionHistory />
            </motion.div>
          )}
          {view === 'inventory' && (
            <motion.div key="inventory" {...PAGE} className="flex-1 flex flex-col overflow-hidden">
              <Inventory />
            </motion.div>
          )}
          {view === 'rewards' && (
            <motion.div key="rewards" {...PAGE} className="flex-1 flex flex-col overflow-hidden">
              <Rewards />
            </motion.div>
          )}
          {view === 'wallet' && (
            <motion.div key="wallet" {...PAGE} className="flex-1 flex flex-col overflow-hidden">
              <WalletPanel gameBalance={gameBalance} onOpenDeposit={() => setDepositOpen(true)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden flex-shrink-0 flex border-t"
          style={{ background: 'rgba(4,8,15,0.97)', borderColor: 'var(--border)', backdropFilter: 'blur(16px)' }}
        >
          {([
            ['lobby',     'Lobby',   '⊞'],
            ['inventory', 'Items',   '◈'],
            ['rewards',   'Rewards', '◆'],
            ['profile',   'Profile', '◉'],
            ['wallet',    'Wallet',  '◑'],
          ] as [AppView, string, string][]).map(([v, label, icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-medium transition-all"
              style={{ color: view === v ? 'var(--accent)' : 'var(--subtle)' }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </main>

      {/* Auth modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onEmailLogin={loginEmail}
        onGoogleLogin={loginGoogle}
      />

      {/* Create private lobby */}
      <CreateLobbyModal
        open={createLobbyOpen}
        onClose={() => setCreateLobbyOpen(false)}
        onCreate={handleCreateRoom}
        hostName={heroName}
      />

      {/* Join by code */}
      {joinByCodeOpen && (
        <JoinByCodeModal
          onJoin={handleJoinByCode}
          onCancel={() => setJoinByCodeOpen(false)}
        />
      )}

      {/* Password prompt */}
      {passwordRoom && (
        <PasswordPrompt
          room={passwordRoom}
          onSubmit={handlePasswordSubmit}
          onCancel={() => setPasswordRoom(null)}
        />
      )}

      {/* Waiting room */}
      {waitingRoom && (
        <PrivateLobbyWaiting
          room={waitingRoom}
          currentUserId={userId ?? 'anon'}
          currentName={heroName}
          onStart={() => handleStartRoom(waitingRoom)}
          onLeave={() => { leaveRoom(waitingRoom.id); setWaitingRoom(null); }}
        />
      )}

      {/* Create tournament modal */}
      <CreateTournamentModal
        open={createTourneyOpen}
        onClose={() => setCreateTourneyOpen(false)}
        onCreate={handleCreateTourney}
        hostName={heroName}
      />

      {/* Tournament lobby / waiting room */}
      <AnimatePresence>
        {tourneyLobby && (
          <TournamentLobby
            tournament={tourneyLobby}
            currentUserId={userId ?? undefined}
            onStart={() => handleStartTourney(tourneyLobby.id)}
            onLeave={() => handleLeaveTourney(tourneyLobby.id)}
            onClose={() => setTourneyLobby(null)}
          />
        )}
      </AnimatePresence>

      {/* Tournament eliminated / results screen */}
      <AnimatePresence>
        {tourneyEliminated && userId && (
          <TournamentEliminated
            tournament={tourneyEliminated.tournament}
            userId={userId}
            onClose={() => setTourneyEliminated(null)}
            onLobby={() => { setTourneyEliminated(null); setView('tournaments'); }}
          />
        )}
      </AnimatePresence>

      {/* Deposit/withdraw modal */}
      <DepositWithdrawModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        gameBalance={gameBalance}
        onDeposit={(amt) => {
          // Immediately credit game balance so wallet shows updated amount
          credit(amt);
          toast.success(`Deposited ${amt} USDC to internal wallet`);
          // Then force a chain balance refresh (no waiting 8s)
          setTimeout(() => { refetchBalance(); }, 1500);
          setTimeout(() => { refetchBalance(); }, 5000);
        }}
        onTx={(type, amount, txHash) => {
          const label = type === 'deposit' ? 'Deposit to internal wallet' : 'Withdrawal to external wallet';
          if (type === 'withdrawal') deduct(Math.abs(amount));
          // Force-update the ref then add — guarantees address is current
          if (internalAddr) {
            addTx(type, amount, label, { txHash });
          }
        }}
      />
    </div>
  );
}
