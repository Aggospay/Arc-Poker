/**
 * useTransactionHistory
 * Persists financial events to localStorage keyed by internal wallet address.
 *
 * Pattern: keep a Map<address, records[]> in state. `records` is derived
 * synchronously — no setState-in-render, no setState-in-effect.
 * addTx has a 2-second duplicate guard so multiple React renders from a
 * single blockchain confirmation never produce duplicate entries.
 */
import { useState, useCallback, useMemo } from 'react';

export type TxType = 'deposit' | 'withdrawal' | 'win' | 'loss' | 'bet' | 'blind';

export interface TxRecord {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  timestamp: string;
  txHash?: string;
  context?: string;
}

const STORAGE_KEY = (addr: string) => `arc_poker_txhistory_${addr.toLowerCase()}`;
const MAX_RECORDS = 500;

function load(addr: string): TxRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(addr));
    return raw ? (JSON.parse(raw) as TxRecord[]) : [];
  } catch { return []; }
}

function save(addr: string, recs: TxRecord[]) {
  try { localStorage.setItem(STORAGE_KEY(addr), JSON.stringify(recs)); } catch { /* noop */ }
}

function makeId() { return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

export function useTransactionHistory(internalAddress: string | undefined) {
  // Map<addr → TxRecord[]> — lazily populated from localStorage on first read
  const [cache, setCache] = useState<Map<string, TxRecord[]>>(() => new Map());

  // Derive current records synchronously — no effect, no setState-in-render
  const records: TxRecord[] = useMemo(() => {
    if (!internalAddress) return [];
    const key = internalAddress.toLowerCase();
    if (cache.has(key)) return cache.get(key)!;
    return load(key);           // first access — read from storage, don't mutate state
  }, [internalAddress, cache]);

  const addTx = useCallback((
    type: TxType,
    amount: number,
    description: string,
    opts?: { txHash?: string; context?: string },
  ) => {
    if (!internalAddress) return;
    const addr = internalAddress.toLowerCase();
    const record: TxRecord = {
      id: makeId(),
      type,
      amount,
      description,
      timestamp: new Date().toISOString(),
      txHash:  opts?.txHash,
      context: opts?.context,
    };
    setCache(prev => {
      // Load existing records (from cache or storage)
      const existing = prev.has(addr) ? prev.get(addr)! : load(addr);
      // Duplicate guard: ignore if last record has same type+amount within 3s
      const last = existing[0];
      if (last && last.type === type && Math.abs(last.amount - amount) < 0.001) {
        const diff = Date.now() - new Date(last.timestamp).getTime();
        if (diff < 3000) return prev; // duplicate — skip
      }
      const next = [record, ...existing].slice(0, MAX_RECORDS);
      save(addr, next);
      const m = new Map(prev);
      m.set(addr, next);
      return m;
    });
  }, [internalAddress]);

  const clearHistory = useCallback(() => {
    if (!internalAddress) return;
    const addr = internalAddress.toLowerCase();
    setCache(prev => {
      const m = new Map(prev);
      m.set(addr, []);
      return m;
    });
    try { localStorage.removeItem(STORAGE_KEY(addr)); } catch { /* noop */ }
  }, [internalAddress]);

  return { records, addTx, clearHistory };
}
