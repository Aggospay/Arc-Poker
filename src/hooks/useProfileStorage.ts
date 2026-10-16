/**
 * useProfileStorage — persists display name and avatar in localStorage,
 * keyed by address. Correctly re-reads when address changes.
 */
import { useState, useEffect, useCallback } from 'react';

const nameKey   = (addr: string) => `arc_poker_name_${addr.toLowerCase()}`;
const avatarKey = (addr: string) => `arc_poker_avatar_${addr.toLowerCase()}`;

function readName(addr: string | undefined, fallback: string): string {
  if (!addr) return fallback;
  try {
    const v = localStorage.getItem(nameKey(addr));
    if (!v || v.startsWith('data:') || v.length > 120) return fallback;
    return v;
  } catch { return fallback; }
}

function readAvatar(addr: string | undefined): string | null {
  if (!addr) return null;
  try { return localStorage.getItem(avatarKey(addr)); } catch { return null; }
}

export function useProfileStorage(address: string | undefined) {
  const fallback = address ? `Player_${address.slice(-6)}` : 'Guest';

  const [displayName, setDisplayNameState] = useState<string>(() => readName(address, fallback));
  const [avatarUrl,   setAvatarUrlState]   = useState<string | null>(() => readAvatar(address));

  // Re-read from localStorage whenever address changes (e.g. after login)
  useEffect(() => {
    setDisplayNameState(readName(address, fallback));
    setAvatarUrlState(readAvatar(address));
  // fallback changes when address changes, so only depend on address
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const setDisplayName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 120) return;
    setDisplayNameState(trimmed);
    if (address) {
      try { localStorage.setItem(nameKey(address), trimmed); } catch { /* noop */ }
    }
  }, [address]);

  const setAvatarUrl = useCallback((url: string | null) => {
    setAvatarUrlState(url);
    if (!address) return;
    try {
      if (url) {
        // Clear old avatar first to free space before writing new one
        localStorage.removeItem(avatarKey(address));
        localStorage.setItem(avatarKey(address), url);
      } else {
        localStorage.removeItem(avatarKey(address));
      }
    } catch {
      // QuotaExceededError — avatar shows in session but won't persist
      console.warn('Avatar too large for localStorage even after compression');
    }
  }, [address]);

  return { displayName, setDisplayName, avatarUrl, setAvatarUrl };
}
