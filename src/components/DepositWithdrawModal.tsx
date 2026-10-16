import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowDownLeft, ArrowUpRight, Loader2, CheckCircle2,
  ExternalLink, Wallet, ShieldCheck, AlertCircle, RefreshCw, Copy,
} from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { erc20Abi } from 'viem';
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts';
import { parseAmount } from '@/onchain-money';
import { useArcBalance } from '../hooks/useArcBalance';
import { useInternalWallet } from '../hooks/useInternalWallet';
import { formatUsdc } from '../utils/poker';
import { toast } from 'sonner';

const CHAIN_ID = 5042002;
const QUICK_AMOUNTS = [50, 100, 200, 500];

interface Props {
  open: boolean;
  onClose: () => void;
  onDeposit?: (amount: number) => void;
  gameBalance?: number;
  /** Called for every completed financial event so history can be recorded */
  onTx?: (type: 'deposit' | 'withdrawal', amount: number, txHash?: string) => void;
}

type Tab = 'deposit' | 'withdraw';
type TxState = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

export function DepositWithdrawModal({ open, onClose, onDeposit, onTx, gameBalance: gameBalanceProp }: Props) {
  const { address: externalAddress, chainId } = useAccount();
  const { balance: externalBalance, refetch: refetchExternal } = useArcBalance();
  const {
    state: walletState,
    cachedAddress,
    internalBalance,
    derive,
    sendFromInternal,
  } = useInternalWallet();

  const { switchChain } = useSwitchChain();
  const [tab, setTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [txState, setTxState] = useState<TxState>('idle');
  const [txError, setTxError] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  // Guard: prevent onTx/onDeposit being called multiple times during re-renders
  const depositFiredRef = useRef(false);

  const usdcFact = getUsdc(CHAIN_ID);
  const isWrongChain = chainId !== CHAIN_ID;
  const internalAddress = walletState.status === 'ready' ? walletState.address : cachedAddress;
  const hasInternalWallet = !!internalAddress;

  // ── ERC-20 transfer: external → internal (deposit) ──────────────────
  const { writeContract, data: depositTxHash, isPending: isDepositPending } = useWriteContract({
    mutation: {
      onSuccess: () => setTxState('confirming'),
      onError: (e) => {
        const msg = (e as Error).message ?? '';
        if (msg.toLowerCase().includes('user rejected')) {
          setTxState('idle');
        } else {
          setTxError('Transaction failed. Please try again.');
          setTxState('error');
        }
      },
    },
  });

  const { isLoading: isConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  // Use effect to fire callbacks exactly once when deposit confirms
  useEffect(() => {
    if (isDepositConfirmed && txState === 'confirming' && !depositFiredRef.current) {
      depositFiredRef.current = true;
      setTxState('success');
      setTxHash(depositTxHash);
      const amt = parseFloat(amount) || 0;
      onDeposit?.(amt);
      onTx?.('deposit', amt, depositTxHash);
      void refetchExternal();
    }
  }, [isDepositConfirmed, txState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived values ──────────────────────────────────────────────────
  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const externalBalanceNum = parseFloat(externalBalance) || 0;
  // Prefer gameBalance (local ledger, updates immediately after wins/losses)
  // Fall back to on-chain balance only if gameBalance not provided
  const internalBalanceNum = gameBalanceProp !== undefined ? gameBalanceProp : (parseFloat(internalBalance) || 0);
  const overBalance =
    tab === 'deposit'
      ? parsedAmount > externalBalanceNum
      : parsedAmount > internalBalanceNum;

  const busy = isDepositPending || isConfirming || txState === 'pending';

  // ── Deposit: external → internal ────────────────────────────────────
  function handleDeposit() {
    if (!externalAddress || !usdcFact || !isValid || overBalance || !internalAddress) return;
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return; }
    setTxState('pending');
    setTxError('');
    try {
      const raw = parseAmount(CHAIN_ID, amount).raw;
      writeContract({
        address: usdcFact.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [internalAddress, raw],
        chainId: CHAIN_ID,
      });
    } catch {
      setTxState('error');
      setTxError('Failed to initiate transaction.');
    }
  }

  // ── Withdraw: internal → external ───────────────────────────────────
  async function handleWithdraw() {
    if (!externalAddress || !isValid || overBalance) return;
    if (walletState.status !== 'ready') {
      toast.error('Re-open internal wallet first (click "Unlock")');
      return;
    }
    setTxState('pending');
    setTxError('');
    try {
      const hash = await sendFromInternal(externalAddress, amount);
      setTxHash(hash);
      setTxState('success');
      const amt = parseFloat(amount) || 0;
      onTx?.('withdrawal', -amt, hash);
    } catch (e) {
      setTxError((e as Error).message ?? 'Withdrawal failed');
      setTxState('error');
    }
  }

  function reset() {
    setAmount('');
    setTxState('idle');
    setTxError('');
    setTxHash(undefined);
    depositFiredRef.current = false;
  }

  const handleSubmit = () => {
    if (tab === 'deposit') handleDeposit();
    else void handleWithdraw();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="glass-strong rounded-3xl w-full max-w-md pointer-events-auto overflow-hidden"
              style={{ boxShadow: 'var(--shadow-panel)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                  Wallet
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--subtle)', background: 'var(--surface)' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Internal wallet card ──────────────────────────────── */}
              <div className="mx-6 mb-5 rounded-2xl p-4" style={{
                background: hasInternalWallet
                  ? 'linear-gradient(135deg,rgba(56,182,255,0.10),rgba(14,165,233,0.06))'
                  : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${hasInternalWallet ? 'rgba(56,182,255,0.28)' : 'var(--border)'}`,
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} style={{ color: hasInternalWallet ? 'var(--accent)' : 'var(--subtle)' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
                      Internal Wallet
                    </span>
                  </div>
                  {hasInternalWallet && walletState.status !== 'ready' && (
                    <button
                      onClick={derive}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: 'rgba(56,182,255,0.12)', color: 'var(--accent)', border: '1px solid rgba(56,182,255,0.25)' }}
                    >
                      <RefreshCw size={10} /> Unlock
                    </button>
                  )}
                </div>

                {!hasInternalWallet ? (
                  /* Not created yet */
                  <div className="text-center py-2">
                    <Wallet size={28} className="mx-auto mb-2 opacity-25" style={{ color: 'var(--accent)' }} />
                    <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                      Create a secure in-app wallet to play poker. One signature required — no gas needed.
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={derive}
                      disabled={walletState.status === 'signing' || !externalAddress}
                      className="btn-primary rounded-xl px-5 py-2.5 text-sm w-full flex items-center justify-center gap-2"
                    >
                      {walletState.status === 'signing' ? (
                        <><Loader2 size={14} className="animate-spin" /> Sign in wallet…</>
                      ) : (
                        <><ShieldCheck size={14} /> Create Internal Wallet</>
                      )}
                    </motion.button>
                    {walletState.status === 'error' && (
                      <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{walletState.message}</p>
                    )}
                  </div>
                ) : (
                  /* Created */
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="mono text-[11px] mb-1" style={{ color: 'var(--muted)' }}>
                        {internalAddress.slice(0, 6)}…{internalAddress.slice(-4)}
                        <button
                          className="ml-2 hover:opacity-70"
                          style={{ color: 'var(--subtle)' }}
                          onClick={() => { void navigator.clipboard.writeText(internalAddress); toast.success('Copied'); }}
                        >
                          <Copy size={9} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{
                          background: walletState.status === 'ready' ? 'var(--success)' : '#888',
                        }} />
                        <span className="text-[11px]" style={{ color: 'var(--subtle)' }}>
                          {walletState.status === 'ready' ? 'Unlocked (active session)' : 'Locked — unlock to withdraw'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="usdc-val tabnum text-lg">
                        {formatUsdc(internalBalanceNum)}
                        <span className="usdc-label">USDC</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Only show deposit/withdraw UI once internal wallet exists */}
              {hasInternalWallet && (
                <>
                  {/* Tab switcher */}
                  <div className="flex mx-6 mb-4 rounded-xl overflow-hidden" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                    {(['deposit', 'withdraw'] as Tab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTab(t); reset(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all rounded-xl"
                        style={{
                          background: tab === t ? 'rgba(56,182,255,0.15)' : 'transparent',
                          color: tab === t ? 'var(--accent)' : 'var(--muted)',
                        }}
                      >
                        {t === 'deposit' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {t === 'deposit' ? 'Deposit' : 'Withdraw'}
                      </button>
                    ))}
                  </div>

                  <div className="px-6 pb-6 space-y-4">
                    {txState === 'success' ? (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                        <CheckCircle2 size={48} className="mx-auto mb-3" style={{ color: 'var(--success)' }} />
                        <div className="text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>
                          {tab === 'deposit' ? 'Deposit successful!' : 'Withdrawal successful!'}
                        </div>
                        <div className="usdc-val tabnum text-2xl mb-4">
                          {formatUsdc(parsedAmount)}<span className="usdc-label text-base">USDC</span>
                        </div>
                        {txHash && (
                          <a
                            href={buildTxExplorerUrl(CHAIN_ID, txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs mb-4 hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--accent)' }}
                          >
                            View on explorer <ExternalLink size={11} />
                          </a>
                        )}
                        <button onClick={() => { reset(); onClose(); }} className="btn-primary rounded-xl px-6 py-2.5 text-sm w-full">
                          Done
                        </button>
                      </motion.div>
                    ) : (
                      <>
                        {/* Flow description */}
                        <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[11px]" style={{
                          background: 'rgba(56,182,255,0.05)', border: '1px solid rgba(56,182,255,0.12)',
                          color: 'var(--muted)',
                        }}>
                          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                          {tab === 'deposit'
                            ? 'Transfers USDC from your external wallet to your internal wallet. You can only play with your internal balance.'
                            : 'Transfers USDC from your internal wallet back to your external wallet.'}
                        </div>

                        {/* From / To balances */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(56,182,255,0.06)', border: '1px solid rgba(56,182,255,0.14)' }}>
                            <div className="text-[10px] mb-1" style={{ color: 'var(--muted)' }}>
                              {tab === 'deposit' ? 'External (from)' : 'Internal (from)'}
                            </div>
                            <div className="usdc-val tabnum text-sm">
                              {tab === 'deposit' ? formatUsdc(externalBalanceNum) : formatUsdc(internalBalanceNum)}
                            </div>
                          </div>
                          <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.14)' }}>
                            <div className="text-[10px] mb-1" style={{ color: 'var(--muted)' }}>
                              {tab === 'deposit' ? 'Internal (to)' : 'External (to)'}
                            </div>
                            <div className="usdc-val tabnum text-sm">
                              {tab === 'deposit' ? formatUsdc(internalBalanceNum) : formatUsdc(externalBalanceNum)}
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--subtle)' }}>
                            Amount (USDC)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="w-full px-4 py-4 rounded-2xl text-2xl font-bold tabnum outline-none transition-all"
                              style={{
                                background: 'var(--surface-muted)',
                                border: `1px solid ${overBalance ? 'var(--danger)' : 'var(--border-strong)'}`,
                                color: 'var(--ink)',
                                fontFamily: 'Space Grotesk',
                              }}
                              disabled={busy}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                              USDC
                            </span>
                          </div>
                          {overBalance && (
                            <p className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>
                              Exceeds {tab === 'deposit' ? 'external' : 'internal'} balance
                            </p>
                          )}
                        </div>

                        {/* Quick amounts */}
                        <div className="grid grid-cols-4 gap-2">
                          {QUICK_AMOUNTS.map((q) => (
                            <button
                              key={q}
                              onClick={() => setAmount(String(q))}
                              disabled={busy}
                              className="py-2 rounded-xl text-xs font-semibold transition-all"
                              style={{
                                background: amount === String(q) ? 'rgba(56,182,255,0.18)' : 'var(--surface)',
                                border: `1px solid ${amount === String(q) ? 'var(--accent)' : 'var(--border)'}`,
                                color: amount === String(q) ? 'var(--accent)' : 'var(--muted)',
                              }}
                            >
                              {q}
                            </button>
                          ))}
                        </div>

                        {/* Error */}
                        {txState === 'error' && (
                          <div className="text-xs text-center" style={{ color: 'var(--danger)' }}>{txError}</div>
                        )}

                        {/* Wrong chain */}
                        {isWrongChain && tab === 'deposit' && (
                          <div className="text-xs text-center px-4 py-2 rounded-xl" style={{ background: 'rgba(245,166,35,0.1)', color: 'var(--warning)', border: '1px solid rgba(245,166,35,0.25)' }}>
                            Switch to Arc Testnet to continue
                          </div>
                        )}

                        {/* Withdraw locked warning */}
                        {tab === 'withdraw' && walletState.status !== 'ready' && (
                          <div className="text-xs text-center px-4 py-2 rounded-xl" style={{ background: 'rgba(245,166,35,0.08)', color: 'var(--warning)', border: '1px solid rgba(245,166,35,0.2)' }}>
                            Unlock your internal wallet above to withdraw
                          </div>
                        )}

                        {/* Submit */}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleSubmit}
                          disabled={
                            !isValid || overBalance || busy || !externalAddress ||
                            (tab === 'withdraw' && walletState.status !== 'ready')
                          }
                          className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 ${tab === 'deposit' ? 'btn-primary' : 'btn-success'}`}
                        >
                          {busy ? (
                            <><Loader2 size={16} className="animate-spin" />
                              {isDepositPending ? 'Confirm in wallet…' : 'Processing…'}</>
                          ) : isWrongChain && tab === 'deposit' ? (
                            'Switch Network'
                          ) : (
                            <>
                              {tab === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              {tab === 'deposit' ? 'Deposit' : 'Withdraw'}{isValid ? ` ${formatUsdc(parsedAmount)} USDC` : ''}
                            </>
                          )}
                        </motion.button>

                        <p className="text-[11px] text-center" style={{ color: 'var(--subtle)' }}>
                          All transfers on ARC Testnet · Gas paid in USDC
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
