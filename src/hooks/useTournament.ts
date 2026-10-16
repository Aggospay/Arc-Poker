/**
 * useTournament — knockout tournament engine stored in localStorage.
 *
 * Flow:
 *   Host creates tournament → players join → host starts →
 *   players play at their table → when chips = 0 → system records elimination
 *   with their finishing position → shows TournamentEliminated screen.
 *
 * Supports 4–500 players.
 * Syncs across tabs via storage event.
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY  = 'arc_poker_tournaments_v1';
const MAX_TOURNEYS = 30;

// ── Types ──────────────────────────────────────────────────────────────────

export type TournamentStatus = 'registering' | 'running' | 'finished';

export interface TournamentPlayer {
  userId:    string;
  name:      string;
  chips:     number;        // current chip stack (0 = eliminated)
  rank:      number | null; // null = still in, 1 = winner
  joinedAt:  number;
  eliminatedAt?: number;
}

export interface Tournament {
  id:          string;
  name:        string;
  hostId:      string;
  hostName:    string;
  password:    string;         // '' = public
  maxPlayers:  number;         // 4–500
  minPlayers:  number;         // 4
  startingChips: number;
  smallBlind:  number;
  bigBlind:    number;
  blindLevels: BlindLevel[];   // escalating blind structure
  currentLevel: number;
  status:      TournamentStatus;
  players:     TournamentPlayer[];
  prizePool:   number;         // total USDC collected (buy-in × players)
  buyIn:       number;
  createdAt:   number;
  startedAt?:  number;
  finishedAt?: number;
}

export interface BlindLevel {
  level:      number;
  smallBlind: number;
  bigBlind:   number;
  duration:   number;          // minutes
}

// Standard blind structure — scales with starting chips
function buildBlindStructure(startingChips: number): BlindLevel[] {
  const base = Math.max(10, Math.round(startingChips / 200));
  return [
    { level: 1, smallBlind: base,      bigBlind: base * 2,   duration: 15 },
    { level: 2, smallBlind: base * 2,  bigBlind: base * 4,   duration: 15 },
    { level: 3, smallBlind: base * 4,  bigBlind: base * 8,   duration: 12 },
    { level: 4, smallBlind: base * 8,  bigBlind: base * 16,  duration: 12 },
    { level: 5, smallBlind: base * 15, bigBlind: base * 30,  duration: 10 },
    { level: 6, smallBlind: base * 25, bigBlind: base * 50,  duration: 10 },
    { level: 7, smallBlind: base * 40, bigBlind: base * 80,  duration: 8  },
    { level: 8, smallBlind: base * 75, bigBlind: base * 150, duration: 8  },
  ];
}

// ── Storage helpers ────────────────────────────────────────────────────────

function load(): Tournament[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Tournament[];
  } catch { return []; }
}

function save(data: Tournament[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, MAX_TOURNEYS)));
  } catch { /* ignore */ }
}

function genId(): string {
  return `T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// ── Prize breakdown (top 15% of field paid) ───────────────────────────────

export function calcPrizes(prizePool: number, totalPlayers: number): { place: number; amount: number; label: string }[] {
  if (totalPlayers <= 1) return [{ place: 1, amount: prizePool, label: '1st' }];
  const paid = Math.max(1, Math.round(totalPlayers * 0.15));
  const structure: { place: number; share: number; label: string }[] = [];
  if (paid >= 1) structure.push({ place: 1, share: 0.50, label: '1st 🏆' });
  if (paid >= 2) structure.push({ place: 2, share: 0.30, label: '2nd 🥈' });
  if (paid >= 3) structure.push({ place: 3, share: 0.15, label: '3rd 🥉' });
  let remaining = 1 - structure.reduce((s, x) => s + x.share, 0);
  for (let p = 4; p <= paid; p++) {
    const share = remaining / (paid - 3);
    structure.push({ place: p, share, label: `${p}th` });
  }
  return structure.map((s) => ({
    place:  s.place,
    label:  s.label,
    amount: parseFloat((prizePool * s.share).toFixed(2)),
  }));
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useTournament(currentUserId: string | undefined, currentUserName: string) {
  const [tournaments, setTournaments] = useState<Tournament[]>(load);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTournaments(load());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const persist = useCallback((next: Tournament[]) => {
    setTournaments(next);
    save(next);
  }, []);

  // Auto-cleanup finished > 1h or stale > 24h
  useEffect(() => {
    const now = Date.now();
    const fresh = tournaments.filter((t) => {
      if (t.status === 'finished') return now - (t.finishedAt ?? t.createdAt) < 3600_000;
      return now - t.createdAt < 86400_000;
    });
    if (fresh.length !== tournaments.length) persist(fresh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create ──────────────────────────────────────────────────────────────

  const createTournament = useCallback((opts: {
    name:          string;
    password:      string;
    maxPlayers:    number;   // 4–500
    buyIn:         number;   // USDC entry fee
    startingChips: number;
  }): Tournament => {
    const blindStructure = buildBlindStructure(opts.startingChips);
    const t: Tournament = {
      id:            genId(),
      name:          opts.name.trim() || `Tournament ${genId()}`,
      hostId:        currentUserId ?? 'anon',
      hostName:      currentUserName,
      password:      opts.password,
      maxPlayers:    Math.min(500, Math.max(4, opts.maxPlayers)),
      minPlayers:    4,
      startingChips: opts.startingChips,
      smallBlind:    blindStructure[0].smallBlind,
      bigBlind:      blindStructure[0].bigBlind,
      blindLevels:   blindStructure,
      currentLevel:  0,
      status:        'registering',
      players: [{
        userId:   currentUserId ?? 'anon',
        name:     currentUserName,
        chips:    opts.startingChips,
        rank:     null,
        joinedAt: Date.now(),
      }],
      prizePool: opts.buyIn,   // grows as more join
      buyIn:     opts.buyIn,
      createdAt: Date.now(),
    };
    persist([t, ...tournaments]);
    return t;
  }, [tournaments, persist, currentUserId, currentUserName]);

  // ── Join ─────────────────────────────────────────────────────────────────

  const joinTournament = useCallback((
    tournamentId: string,
    password:     string,
  ): 'ok' | 'wrong_password' | 'full' | 'not_found' | 'already_in' | 'started' => {
    const t = tournaments.find((x) => x.id === tournamentId);
    if (!t) return 'not_found';
    if (t.status !== 'registering') return 'started';
    if (t.password && t.password !== password) return 'wrong_password';
    if (t.players.length >= t.maxPlayers) return 'full';
    const uid = currentUserId ?? 'anon';
    if (t.players.some((p) => p.userId === uid)) return 'already_in';

    const updated = tournaments.map((x) =>
      x.id !== tournamentId ? x : {
        ...x,
        players:   [...x.players, { userId: uid, name: currentUserName, chips: x.startingChips, rank: null, joinedAt: Date.now() }],
        prizePool: x.prizePool + x.buyIn,
      }
    );
    persist(updated);
    return 'ok';
  }, [tournaments, persist, currentUserId, currentUserName]);

  // ── Start ────────────────────────────────────────────────────────────────

  const startTournament = useCallback((tournamentId: string) => {
    const updated = tournaments.map((t) =>
      t.id !== tournamentId ? t : { ...t, status: 'running' as const, startedAt: Date.now() }
    );
    persist(updated);
  }, [tournaments, persist]);

  // ── Eliminate a player ───────────────────────────────────────────────────
  // Called by the game engine when a player's chips reach 0.

  const eliminatePlayer = useCallback((tournamentId: string, userId: string) => {
    const t = tournaments.find((x) => x.id === tournamentId);
    if (!t) return;

    const activeBefore = t.players.filter((p) => p.rank === null).length;
    const rank         = activeBefore;              // busts in place e.g. 5th if 5 remain
    const now          = Date.now();

    const updatedPlayers = t.players.map((p) =>
      p.userId !== userId ? p : { ...p, chips: 0, rank, eliminatedAt: now }
    );

    const stillActive = updatedPlayers.filter((p) => p.rank === null);
    let status: TournamentStatus = t.status;
    let finishedAt               = t.finishedAt;

    if (stillActive.length === 1) {
      // Last player standing — mark as winner (rank 1)
      const winnerId = stillActive[0].userId;
      updatedPlayers.forEach((p) => {
        if (p.userId === winnerId) { p.rank = 1; p.eliminatedAt = now; }
      });
      status     = 'finished';
      finishedAt = now;
    }

    const updated = tournaments.map((x) =>
      x.id !== tournamentId ? x : { ...x, players: updatedPlayers, status, finishedAt }
    );
    persist(updated);
  }, [tournaments, persist]);

  // ── Update chip count mid-game ────────────────────────────────────────────

  const updateChips = useCallback((tournamentId: string, userId: string, chips: number) => {
    const updated = tournaments.map((t) =>
      t.id !== tournamentId ? t : {
        ...t,
        players: t.players.map((p) =>
          p.userId !== userId ? p : { ...p, chips: Math.max(0, chips) }
        ),
      }
    );
    persist(updated);
  }, [tournaments, persist]);

  // ── Advance blind level ───────────────────────────────────────────────────

  const advanceBlindLevel = useCallback((tournamentId: string) => {
    const updated = tournaments.map((t) => {
      if (t.id !== tournamentId) return t;
      const next  = Math.min(t.currentLevel + 1, t.blindLevels.length - 1);
      const level = t.blindLevels[next];
      return { ...t, currentLevel: next, smallBlind: level.smallBlind, bigBlind: level.bigBlind };
    });
    persist(updated);
  }, [tournaments, persist]);

  // ── Leave / cancel ────────────────────────────────────────────────────────

  const leaveTournament = useCallback((tournamentId: string) => {
    const uid = currentUserId ?? 'anon';
    const updated = tournaments.map((t) => {
      if (t.id !== tournamentId) return t;
      if (t.hostId === uid || t.status !== 'registering') {
        return { ...t, status: 'finished' as const, finishedAt: Date.now() };
      }
      return {
        ...t,
        players:   t.players.filter((p) => p.userId !== uid),
        prizePool: Math.max(0, t.prizePool - t.buyIn),
      };
    });
    persist(updated);
  }, [tournaments, persist, currentUserId]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const myTournaments = tournaments.filter((t) =>
    t.players.some((p) => p.userId === (currentUserId ?? 'anon'))
  );

  const activeTournaments = tournaments.filter((t) =>
    t.status === 'registering' || t.status === 'running'
  );

  const getMyEntry = useCallback((tournamentId: string): TournamentPlayer | undefined => {
    const t = tournaments.find((x) => x.id === tournamentId);
    return t?.players.find((p) => p.userId === (currentUserId ?? 'anon'));
  }, [tournaments, currentUserId]);

  return {
    tournaments,
    myTournaments,
    activeTournaments,
    calcPrizes,
    createTournament,
    joinTournament,
    startTournament,
    eliminatePlayer,
    updateChips,
    advanceBlindLevel,
    leaveTournament,
    getMyEntry,
  };
}
