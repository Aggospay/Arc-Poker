/**
 * useAuth — unified authentication session
 *
 * Supports three login methods:
 *   1. Wallet (MetaMask / injected) — uses wagmi's useAccount
 *   2. Email OTP  — 6-digit code sent (simulated here; wire a real email API)
 *   3. Google OAuth — popup flow via accounts.google.com
 *
 * All three produce the same AuthSession shape stored in localStorage.
 * Components import useAuth instead of useAccount.
 */
import { useState, useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

export type AuthMethod = 'wallet' | 'email' | 'google' | 'discord';

export interface AuthSession {
  method:    AuthMethod;
  /** For wallet logins this is the wallet address; for email/google it is a deterministic pseudo-address */
  userId:    string;
  email?:    string;
  name?:     string;
  avatarUrl?: string;
  createdAt: number;
}

const STORAGE_KEY = 'arc_poker_auth_session';

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch { return null; }
}

function saveSession(s: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Deterministic hex-like user ID from a string (email / google sub) */
async function deriveUserId(seed: string): Promise<string> {
  const data   = new TextEncoder().encode('arc_poker_uid:' + seed);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex    = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return ('0x' + hex.slice(0, 40));
}

/** Simulate sending a 6-digit OTP email (replace with real API call) */
export async function sendEmailOtp(email: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  // Store hashed OTP for verification
  const data   = new TextEncoder().encode('arc_otp:' + email + ':' + code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hash   = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem('arc_poker_otp_hash', hash);
  sessionStorage.setItem('arc_poker_otp_email', email);
  // In production: POST /api/send-otp { email, code }
  console.info('[ARC Poker] OTP for', email, '→', code, '(dev mode: shown in console only)');
  return code; // only returned in dev; in prod the function returns void
}

export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  const storedHash  = sessionStorage.getItem('arc_poker_otp_hash');
  const storedEmail = sessionStorage.getItem('arc_poker_otp_email');
  if (!storedHash || storedEmail !== email) return false;
  const data   = new TextEncoder().encode('arc_otp:' + email + ':' + code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hash   = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== storedHash) return false;
  sessionStorage.removeItem('arc_poker_otp_hash');
  sessionStorage.removeItem('arc_poker_otp_email');
  return true;
}

export function useAuth() {
  const { address: walletAddress, isConnected: walletConnected } = useAccount();
  const { disconnect } = useDisconnect();
  // Stable creation time for wallet sessions (avoids Date.now() in render)
  const [walletSessionCreatedAt] = useState(() => Date.now());

  const [sessionOverride, setSessionOverride] = useState<AuthSession | null>(() => {
    // Only restore non-wallet sessions from storage on init;
    // wallet sessions are derived from wagmi live state.
    const s = loadSession();
    return s?.method !== 'wallet' ? s : null;
  });

  // Derive the active session: wallet connection takes priority over stored session
  let session: AuthSession | null;
  if (walletConnected && walletAddress) {
    const existing = loadSession();
    session = {
      method:    'wallet',
      userId:    walletAddress,
      createdAt: existing?.createdAt ?? walletSessionCreatedAt,
    };
    // Persist so other hooks/tabs can read it
    saveSession(session);
  } else {
    session = sessionOverride;
    // Clear stale wallet session from storage when disconnected
    if (!walletConnected) {
      const stored = loadSession();
      if (stored?.method === 'wallet') clearSession();
    }
  }

  /** Sign in with email after OTP verified */
  const loginEmail = useCallback(async (email: string): Promise<void> => {
    const userId = await deriveUserId(email);
    const s: AuthSession = {
      method:    'email',
      userId,
      email,
      name:      email.split('@')[0],
      createdAt: Date.now(),
    };
    saveSession(s);
    setSessionOverride(s);
  }, []);

  /** Sign in with Google via OAuth popup */
  const loginGoogle = useCallback(async (): Promise<void> => {
    // In production, replace with your real Google OAuth client_id and redirect_uri.
    // For demo purposes, we create a simulated session so the UI flow is fully visible.
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

    if (GOOGLE_CLIENT_ID) {
      return new Promise<void>((resolve, reject) => {
        const redirectUri = encodeURIComponent(window.location.origin + '/auth/google/callback');
        const scope       = encodeURIComponent('openid email profile');
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
        const popup = window.open(url, 'google_auth', 'width=480,height=600,left=200,top=100');
        if (!popup) { reject(new Error('Popup blocked')); return; }

        const timer = setInterval(() => { if (popup.closed) { clearInterval(timer); reject(new Error('Popup closed')); } }, 500);

        const onMessage = (e: MessageEvent) => {
          if (e.origin !== window.location.origin) return;
          const { type, email: gEmail, name: gName, sub } = e.data as { type?: string; email?: string; name?: string; sub?: string };
          if (type !== 'google_auth_success' || !gEmail) return;
          clearInterval(timer);
          window.removeEventListener('message', onMessage);
          popup.close();
          void deriveUserId(sub ?? gEmail).then((uid) => {
            const s: AuthSession = { method: 'google', userId: uid, email: gEmail, name: gName, createdAt: Date.now() };
            saveSession(s); setSessionOverride(s); resolve();
          });
        };
        window.addEventListener('message', onMessage);
      });
    }

    // ── Demo fallback (no VITE_GOOGLE_CLIENT_ID set) ──────────────────────
    // Simulates a Google login by asking for a display name inline.
    // Replace with real OAuth in production.
    const fakeName  = prompt('Google Sign-In (demo)\n\nEnter your name:') ?? 'Google User';
    const fakeEmail = prompt('Enter your email:') ?? 'user@gmail.com';
    const userId    = await deriveUserId(fakeEmail);
    const s: AuthSession = {
      method:    'google',
      userId,
      email:     fakeEmail,
      name:      fakeName,
      createdAt: Date.now(),
    };
    saveSession(s);
    setSessionOverride(s);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionOverride(null);
    if (walletConnected) disconnect();
  }, [walletConnected, disconnect]);

  const isLoggedIn = !!session;

  return {
    session,
    isLoggedIn,
    /** Wallet address when method=wallet, deterministic pseudo-address otherwise */
    userId:    session?.userId ?? null,
    email:     session?.email  ?? null,
    name:      session?.name   ?? null,
    method:    session?.method ?? null,
    loginEmail,
    loginGoogle,
    logout,
  };
}
