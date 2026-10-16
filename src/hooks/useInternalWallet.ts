/**
 * useInternalWallet
 *
 * Creates a deterministic in-app wallet.
 *
 * For wallet sessions: signs a fixed message → keccak256(sig) = privateKey
 * For email/Google sessions: SHA-256(userId + secret seed) = privateKey
 *   (no wallet signature required — key is derived deterministically from session)
 *
 * Flow:
 *   1. derive() called once → privateKey in React state, address in localStorage
 *   2. Deposit:  external → internal  (wagmi ERC-20 transfer)
 *   3. Withdraw: internal → external  (viem walletClient with private key)
 *   4. Table stack = internalBalance
 */

import { useState, useCallback } from 'react';
import { useAccount, useSignMessage, useReadContract } from 'wagmi';
import {
  createWalletClient, http, createPublicClient,
  erc20Abi, parseUnits, formatUnits, keccak256, toBytes,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getUsdc, requireChain } from '@/onchain-facts';

const CHAIN_ID = 5042002; // Arc Testnet

const DERIVE_MESSAGE =
  `ARC Poker – Create internal wallet\nChain: ${CHAIN_ID}\nVersion: 1\n\n` +
  `This signature generates a deterministic in-app wallet.\nIt does NOT authorise any transaction.`;

// Seed mixed with userId so different users on same device get different keys
const OFFLINE_SEED = 'arc_poker_internal_wallet_v1';

const STORAGE_KEY = (uid: string) => `arc_poker_internal_addr_${uid.toLowerCase()}`;

export type InternalWalletState =
  | { status: 'idle' }
  | { status: 'signing' }
  | { status: 'ready'; address: `0x${string}`; privateKey: `0x${string}` }
  | { status: 'error'; message: string };

export interface UseInternalWalletReturn {
  state:              InternalWalletState;
  cachedAddress:      `0x${string}` | null;
  internalBalance:    string;
  rawInternalBalance: bigint;
  isLoadingBalance:   boolean;
  derive:             () => void;
  sendFromInternal:   (to: `0x${string}`, amountUsdc: string) => Promise<`0x${string}`>;
  refetchBalance:     () => void;
}

function buildViemChain(chainId: number): Chain {
  const fact = requireChain(chainId);
  return {
    id: chainId,
    name: fact.name,
    nativeCurrency: { name: fact.nativeCurrency.symbol, symbol: fact.nativeCurrency.symbol, decimals: fact.nativeCurrency.decimals },
    rpcUrls:        { default: { http: fact.rpcUrls } },
    blockExplorers: { default: { name: 'Explorer', url: fact.explorerBase } },
    testnet:        fact.isTestnet,
  };
}

/** Derive a private key from a string seed (for email/Google sessions) */
async function deriveKeyFromSeed(userId: string): Promise<`0x${string}`> {
  const data   = new TextEncoder().encode(OFFLINE_SEED + ':' + userId);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex    = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return ('0x' + hex) as `0x${string}`;
}

interface Props {
  /** userId from useAuth — wallet address for wallet sessions, pseudo-address for email/google */
  sessionUserId?: string;
  /** 'wallet' = require wallet signature; 'offline' = derive from userId seed (no signature) */
  sessionMethod?: 'wallet' | 'offline';
}

export function useInternalWallet({ sessionUserId, sessionMethod }: Props = {}): UseInternalWalletReturn {
  // Wallet-mode specific hooks
  const { address: walletAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // The canonical user identifier — wallet address for wallet sessions, sessionUserId for others
  const effectiveUid = sessionUserId ?? walletAddress;

  // Per-uid state map so switching accounts doesn't share state
  const [stateMap, setStateMap] = useState<Map<string, InternalWalletState>>(new Map());

  const walletState: InternalWalletState =
    (effectiveUid ? stateMap.get(effectiveUid) : undefined) ?? { status: 'idle' };

  const setWalletState = useCallback((s: InternalWalletState) => {
    if (!effectiveUid) return;
    setStateMap((prev) => new Map(prev).set(effectiveUid, s));
  }, [effectiveUid]);

  // Cached address from localStorage
  const cachedAddress: `0x${string}` | null =
    effectiveUid
      ? (localStorage.getItem(STORAGE_KEY(effectiveUid)) as `0x${string}` | null)
      : null;

  const usdcFact = getUsdc(CHAIN_ID);

  const internalAddr =
    walletState.status === 'ready' ? walletState.address : cachedAddress ?? undefined;

  const { data: rawBalance, isLoading: isLoadingBalance, refetch: refetchBalance } =
    useReadContract({
      address: usdcFact?.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: internalAddr ? [internalAddr] : undefined,
      chainId: CHAIN_ID,
      query: { enabled: !!internalAddr && !!usdcFact, refetchInterval: 8000 },
    });

  const rawInternalBalance = rawBalance ?? 0n;
  const internalBalance = usdcFact
    ? Number(formatUnits(rawInternalBalance, usdcFact.decimals)).toFixed(2)
    : '0.00';

  // ── Derive ──────────────────────────────────────────────────────────
  const derive = useCallback(async () => {
    if (!effectiveUid) return;
    setWalletState({ status: 'signing' });
    try {
      let privateKey: `0x${string}`;

      if (sessionMethod === 'offline') {
        // Email / Google: deterministic key from userId (no wallet needed)
        privateKey = await deriveKeyFromSeed(effectiveUid);
      } else {
        // Wallet: sign a message → keccak256(sig)
        const sig  = await signMessageAsync({ message: DERIVE_MESSAGE });
        privateKey = keccak256(toBytes(sig));
      }

      const account = privateKeyToAccount(privateKey);
      localStorage.setItem(STORAGE_KEY(effectiveUid), account.address);
      setWalletState({ status: 'ready', address: account.address, privateKey });
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied')) {
        setWalletState({ status: 'idle' });
      } else {
        setWalletState({ status: 'error', message: 'Failed to create internal wallet' });
      }
    }
  }, [effectiveUid, sessionMethod, signMessageAsync, setWalletState]);

  // ── For offline sessions: auto-derive on mount if cached address missing ──
  // (No signature needed so we can derive silently in the background)
  const shouldAutoderive =
    sessionMethod === 'offline' && !!effectiveUid && !cachedAddress && walletState.status === 'idle';

  if (shouldAutoderive) {
    // Kick off in a microtask so we don't call setState during render
    void Promise.resolve().then(() => derive());
  }

  // ── Send from internal ─────────────────────────────────────────────
  const sendFromInternal = useCallback(async (
    to: `0x${string}`,
    amountUsdc: string,
  ): Promise<`0x${string}`> => {
    const currentState = (effectiveUid ? stateMap.get(effectiveUid) : undefined) ?? { status: 'idle' as const };
    if (currentState.status !== 'ready') throw new Error('Internal wallet not ready');
    if (!usdcFact) throw new Error('USDC not found for chain');

    const account    = privateKeyToAccount(currentState.privateKey);
    const viemChain  = buildViemChain(CHAIN_ID);
    const transport  = http(viemChain.rpcUrls.default.http[0]);

    const walletClient = createWalletClient({ account, chain: viemChain, transport });
    const publicClient = createPublicClient({ chain: viemChain, transport });

    const rawAmount = parseUnits(amountUsdc, usdcFact.decimals);
    const bal = await publicClient.readContract({
      address: usdcFact.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    });
    if (bal < rawAmount) throw new Error('Insufficient internal balance');

    const hash = await walletClient.writeContract({
      address:      usdcFact.address as `0x${string}`,
      abi:          erc20Abi,
      functionName: 'transfer',
      args:         [to, rawAmount],
      chain:        viemChain,
    });

    setTimeout(() => { void refetchBalance(); }, 4000);
    return hash;
  }, [effectiveUid, stateMap, usdcFact, refetchBalance]);

  return {
    state:              walletState,
    cachedAddress,
    internalBalance,
    rawInternalBalance,
    isLoadingBalance,
    derive:             () => { void derive(); },
    sendFromInternal,
    refetchBalance:     () => { void refetchBalance(); },
  };
}
