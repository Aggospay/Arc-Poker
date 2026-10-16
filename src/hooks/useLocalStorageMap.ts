/**
 * useLocalStorageMap<V>
 *
 * Stores a Map<string, V> in React state.  Each key is also backed by a
 * direct localStorage entry so values survive page reload.
 *
 * On mount, reads every matching localStorage key into the map so state is
 * immediately populated with previously-saved values.
 *
 * `get(key)` is referentially stable — safe to use in a `useMemo` dep array
 * without triggering infinite loops.
 */
import { useState, useCallback } from 'react';

function loadAll<V>(_prefix: string): Map<string, V> {
  const map = new Map<string, V>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Match keys written by the legacy per-key pattern AND any key that
      // happens to start with the namespace prefix.
      const raw = localStorage.getItem(k);
      if (raw !== null) {
        // legacy pattern: arc_poker_profile_name_<addr>
        // new pattern: arc_poker_names_<addr>
        const suffix = k.replace(/^arc_poker_(profile_name|profile_avatar|names|avatars)_/, '');
        if (suffix !== k) {
          try {
            map.set(suffix, JSON.parse(raw) as V);
          } catch {
            map.set(suffix, raw as unknown as V);
          }
        }
      }
    }
  } catch { /* localStorage not available */ }
  return map;
}

export function useLocalStorageMap<V>(namespace: string) {
  const [map, setMap] = useState<Map<string, V>>(() => loadAll<V>(namespace));

  const get = useCallback((key: string): V | undefined => {
    // First check in-memory map
    if (map.has(key)) return map.get(key);
    // Fall back to direct localStorage read (handles late-arriving address)
    try {
      // Try legacy name key pattern
      const legacyName   = localStorage.getItem(`arc_poker_profile_name_${key}`);
      const legacyAvatar = localStorage.getItem(`arc_poker_profile_avatar_${key}`);
      const direct       = localStorage.getItem(`${namespace}_${key}`);
      const raw = direct ?? legacyName ?? legacyAvatar;
      if (raw !== null) {
        try { return JSON.parse(raw) as V; } catch { return raw as unknown as V; }
      }
    } catch { /* noop */ }
    return undefined;
  }, [map, namespace]);

  const set = useCallback((key: string, value: V) => {
    setMap(prev => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(`${namespace}_${key}`);
      } else {
        localStorage.setItem(`${namespace}_${key}`, JSON.stringify(value));
      }
    } catch { /* noop */ }
  }, [namespace]);

  const remove = useCallback((key: string) => {
    setMap(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    try { localStorage.removeItem(`${namespace}_${key}`); } catch { /* noop */ }
  }, [namespace]);

  return { get, set, remove, map };
}
