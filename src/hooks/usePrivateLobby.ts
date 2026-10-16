/**
 * usePrivateLobby — private room management stored in localStorage.
 * Rooms sync across browser tabs via the storage event.
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'arc_poker_private_rooms';
const MAX_ROOMS   = 50;

export interface PrivateRoom {
  id:         string;   // nanoid-style
  name:       string;
  hostName:   string;
  hostId:     string;
  maxPlayers: number;   // 2-6
  password:   string;   // '' = public
  smallBlind: number;
  bigBlind:   number;
  minBuyIn:   number;
  players:    string[]; // list of userIds who joined
  createdAt:  number;
  status:     'waiting' | 'playing' | 'finished';
}

function load(): PrivateRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PrivateRoom[];
  } catch { return []; }
}

function save(rooms: PrivateRoom[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms.slice(0, MAX_ROOMS)));
  } catch { /* noop */ }
}

function genId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function usePrivateLobby(currentUserId: string | undefined) {
  const [rooms, setRooms] = useState<PrivateRoom[]>(load);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRooms(load());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const persist = useCallback((next: PrivateRoom[]) => {
    setRooms(next);
    save(next);
  }, []);

  // Remove stale rooms (> 2 hours old or finished > 30 min ago)
  useEffect(() => {
    const now = Date.now();
    const fresh = rooms.filter((r) => {
      if (r.status === 'finished') return now - r.createdAt < 30 * 60 * 1000;
      return now - r.createdAt < 2 * 60 * 60 * 1000;
    });
    if (fresh.length !== rooms.length) persist(fresh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback((opts: {
    name: string;
    password: string;
    maxPlayers: number;
    smallBlind: number;
    bigBlind: number;
    minBuyIn: number;
    hostName: string;
  }): PrivateRoom => {
    const room: PrivateRoom = {
      id:         genId(),
      name:       opts.name.trim() || `Room ${genId()}`,
      hostName:   opts.hostName,
      hostId:     currentUserId ?? 'anon',
      maxPlayers: opts.maxPlayers,
      password:   opts.password,
      smallBlind: opts.smallBlind,
      bigBlind:   opts.bigBlind,
      minBuyIn:   opts.minBuyIn,
      players:    [currentUserId ?? 'anon'],
      createdAt:  Date.now(),
      status:     'waiting',
    };
    persist([room, ...rooms]);
    return room;
  }, [rooms, persist, currentUserId]);

  const joinRoom = useCallback((roomId: string, password: string): 'ok' | 'wrong_password' | 'full' | 'not_found' => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return 'not_found';
    if (room.password && room.password !== password) return 'wrong_password';
    if (room.players.length >= room.maxPlayers) return 'full';
    const uid = currentUserId ?? 'anon';
    if (room.players.includes(uid)) return 'ok'; // already in
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, players: [...r.players, uid] } : r
    );
    persist(updated);
    return 'ok';
  }, [rooms, persist, currentUserId]);

  const leaveRoom = useCallback((roomId: string) => {
    const uid = currentUserId ?? 'anon';
    const updated = rooms.map((r) => {
      if (r.id !== roomId) return r;
      const players = r.players.filter((p) => p !== uid);
      // If host leaves, mark finished
      if (r.hostId === uid || players.length === 0) return { ...r, players, status: 'finished' as const };
      return { ...r, players };
    });
    persist(updated);
  }, [rooms, persist, currentUserId]);

  const startRoom = useCallback((roomId: string) => {
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, status: 'playing' as const } : r
    );
    persist(updated);
  }, [rooms, persist]);

  const deleteRoom = useCallback((roomId: string) => {
    persist(rooms.filter((r) => r.id !== roomId));
  }, [rooms, persist]);

  const activeRooms = rooms.filter((r) => r.status === 'waiting' || r.status === 'playing');

  return { rooms, activeRooms, createRoom, joinRoom, leaveRoom, startRoom, deleteRoom };
}
