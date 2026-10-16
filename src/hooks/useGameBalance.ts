/**
 * useGameBalance — local USDC ledger for the poker game.
 *
 * Persists in localStorage per internal-wallet address.
 * No blockchain writes — purely a local "chips at the table" tracker.
 *
 * Rules:
 *   deduct(n)      → subtract n from balance (bet/blind placed)
 *   credit(n)      → add n to balance (pot won)
 *   syncToChain(n) → if on-chain balance grew, update balance to match
 */

import { useState, useCallback } from 'react';

const KEY = (addr: string) => `arc_poker_game_balance_${addr.toLowerCase()}`;

function readStored(addr: string): number {
  try {
    const v = localStorage.getItem(KEY(addr));
    return v ? parseFloat(v) : 0;
  } catch {
    return 0;
  }
}

function writeStored(addr: string, val: number) {
  try { localStorage.setItem(KEY(addr), val.toFixed(6)); } catch { /* ignore */ }
}

export interface UseGameBalanceReturn {
  gameBalance: number;
  deduct:      (amount: number) => void;
  credit:      (amount: number) => void;
  syncToChain: (onChainBalance: number) => void;
}

export function useGameBalance(internalAddress: string | undefined): UseGameBalanceReturn {
  // State map keyed by address — switching address reads fresh value, no effect needed
  const [balMap, setBalMap] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    if (internalAddress) m.set(internalAddress, readStored(internalAddress));
    return m;
  });

  // Derive current balance from map (updates whenever map changes)
  const gameBalance: number = internalAddress
    ? (balMap.get(internalAddress) ?? readStored(internalAddress))
    : 0;

  const setBal = useCallback((addr: string, val: number) => {
    const clamped = Math.max(0, parseFloat(val.toFixed(6)));
    writeStored(addr, clamped);
    setBalMap((prev) => new Map(prev).set(addr, clamped));
  }, []);

  const deduct = useCallback((amount: number) => {
    if (!internalAddress || amount <= 0) return;
    const current = readStored(internalAddress);
    setBal(internalAddress, current - amount);
  }, [internalAddress, setBal]);

  const credit = useCallback((amount: number) => {
    if (!internalAddress || amount <= 0) return;
    const current = readStored(internalAddress);
    setBal(internalAddress, current + amount);
  }, [internalAddress, setBal]);

  const syncToChain = useCallback((onChainBalance: number) => {
    if (!internalAddress) return;
    const current = readStored(internalAddress);
    // Only sync UP (new deposit arrived). Never override downward —
    // that would erase bets already deducted from the local ledger.
    if (onChainBalance > current + 0.001) {
      setBal(internalAddress, onChainBalance);
    }
  }, [internalAddress, setBal]);

  return { gameBalance, deduct, credit, syncToChain };
}
