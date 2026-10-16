import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownLeft, Trophy, Coins,
  History, ExternalLink, ChevronDown, Trash2,
  Layers, ShieldCheck,
} from 'lucide-react';
import { useArcBalance } from '../hooks/useArcBalance';
import { useInternalWallet } from '../hooks/useInternalWallet';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { buildTxExplorerUrl } from '@/onchain-facts';
import type { TxType } from '../hooks/useTransactionHistory';
import { useLocaleCtx } from '../i18n/LocaleContext';

const CHAIN_ID = 5042002;

const TX_COLOR: Record<TxType, { icon: React.ReactNode; color: string }> = {
  deposit:    { icon: <ArrowDownLeft size={14} />, color: '#3dd68c'  },
  withdrawal: { icon: <ArrowUpRight  size={14} />, color: '#f76c6c'  },
  win:        { icon: <Trophy        size={14} />, color: '#f5c842'  },

  loss:       { icon: <Coins         size={14} />, color: '#8899bb'  },
  bet:        { icon: <Layers        size={14} />, color: '#38b6ff'  },
  blind:      { icon: <ShieldCheck   size={14} />, color: '#a78bfa'  },
};

type Filter = 'all' | TxType;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--subtle)' }}>{label}</div>
      <div className="usdc-val tabnum text-base">{value}<span className="usdc-label">USDC</span></div>
    </div>
  );
}

export function TransactionHistory() {
  const { isConnected } = useArcBalance();
  const { t } = useLocaleCtx();
  const { state: walletState, cachedAddress } = useInternalWallet();
  const internalAddress = walletState.status === 'ready' ? walletState.address : cachedAddress ?? undefined;
  const { records, clearHistory } = useTransactionHistory(internalAddress);

  const [filter, setFilter]             = useState<Filter>('all');
  const [showClearConfirm, setShowClear] = useState(false);
  const [page, setPage]                  = useState(1);
  const PAGE_SIZE = 20;

  // label map — computed after t() is available
  const TX_META: Record<TxType, { label: string; sign: string }> = {
    deposit:    { label: t('hist_deposits'),    sign: '+' },
    withdrawal: { label: t('hist_withdrawals'), sign: '-' },
    win:        { label: t('hist_wins'),        sign: '+' },

    loss:       { label: t('hist_losses'),      sign: '-' },
    bet:        { label: t('hist_bets'),        sign: '-' },
    blind:      { label: 'Blind',               sign: '-' },
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',        label: t('hist_all')         },
    { key: 'deposit',    label: t('hist_deposits')    },
    { key: 'withdrawal', label: t('hist_withdrawals') },
    { key: 'win',        label: t('hist_wins')        },

    { key: 'bet',        label: t('hist_bets')        },
  ];

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <History size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--accent)' }} />
          <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{t('connect_wallet')}</div>
        </div>
      </div>
    );
  }

  if (!internalAddress) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--accent)' }} />
          <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{t('wal_no_wallet')}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t('wal_create_first')}</div>
        </div>
      </div>
    );
  }

  // Never show 'loss' entries — losses are implicit (wins are the positive side)
  const visible    = records.filter((r) => r.type !== 'loss');
  const filtered   = filter === 'all' ? visible : visible.filter((r) => r.type === filter);
  const paginated  = filtered.slice(0, page * PAGE_SIZE);
  const hasMore    = paginated.length < filtered.length;

  const totalDeposited = records.filter((r) => r.type === 'deposit').reduce((s, r) => s + Math.abs(r.amount), 0);
  const totalWithdrawn = records.filter((r) => r.type === 'withdrawal').reduce((s, r) => s + Math.abs(r.amount), 0);
  const totalWon       = records.filter((r) => r.type === 'win').reduce((s, r) => s + Math.abs(r.amount), 0);

  const netPoker       = totalWon;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            {t('hist_title')}
          </h2>
          {records.length > 0 && (
            <button
              onClick={() => setShowClear(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
              style={{ color: 'var(--danger)', background: 'rgba(247,108,108,0.08)', border: '1px solid rgba(247,108,108,0.2)' }}
            >
              <Trash2 size={11} /> {t('hist_clear')}
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
          <SummaryCard label={t('hist_deposited')} value={`+${totalDeposited.toFixed(0)}`} color="var(--success)" />
          <SummaryCard label={t('hist_withdrawn')} value={`-${totalWithdrawn.toFixed(0)}`} color="var(--danger)"  />
          <SummaryCard label={t('hist_wins')}      value={`+${totalWon.toFixed(0)}`}        color="#f5c842"       />

          <div className="col-span-2 sm:col-span-1">
            <SummaryCard
              label={t('hist_net_poker')}
              value={`${netPoker >= 0 ? '+' : ''}${netPoker.toFixed(0)}`}
              color={netPoker >= 0 ? 'var(--success)' : 'var(--danger)'}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count  = f.key === 'all' ? visible.length : visible.filter((r) => r.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: active ? 'rgba(56,182,255,0.15)' : 'var(--surface)',
                  border:     `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  color:      active ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {f.label}
                <span className="tabnum text-[10px] px-1 rounded-md"
                  style={{ background: active ? 'rgba(56,182,255,0.2)' : 'rgba(255,255,255,0.06)', color: active ? 'var(--accent)' : 'var(--subtle)' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl py-12 text-center" style={{ color: 'var(--subtle)' }}>
            <History size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm">{t('hist_no_records')}</div>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden mb-4">
            <AnimatePresence initial={false}>
              {paginated.map((tx, i) => {
                const meta       = TX_META[tx.type];
                const color      = TX_COLOR[tx.type].color;
                const icon       = TX_COLOR[tx.type].icon;
                const explorerUrl = tx.txHash ? buildTxExplorerUrl(CHAIN_ID, tx.txHash) : null;
                const isPositive  = tx.amount > 0;
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-white/[0.03] transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18`, color }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                          style={{ background: `${color}18`, color }}>
                          {meta.label}
                        </span>
                        {tx.context && (
                          <span className="text-[10px] truncate" style={{ color: 'var(--subtle)' }}>{tx.context}</span>
                        )}
                      </div>
                      <div className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--ink-2)' }}>
                        {tx.description}
                      </div>
                      <div className="text-[10px] flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--subtle)' }}>
                        {fmtDate(tx.timestamp)}
                        {explorerUrl && (
                          <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--accent)' }}>
                            <ExternalLink size={9} /> {t('hist_view_tx')}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="usdc-val tabnum text-sm flex-shrink-0 text-right">
                      {isPositive ? '+' : ''}{tx.amount.toFixed(2)}
                      <div className="usdc-label" style={{ display: 'block' }}>USDC</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {hasMore && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setPage((p) => p + 1)}
            className="w-full py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
            style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <ChevronDown size={14} />
            {t('hist_load_more')} ({filtered.length - paginated.length})
          </motion.button>
        )}

        {/* Clear confirm */}
        <AnimatePresence>
          {showClearConfirm && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                onClick={() => setShowClear(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              >
                <div className="glass-strong rounded-3xl p-6 max-w-xs w-full pointer-events-auto text-center"
                  style={{ boxShadow: 'var(--shadow-panel)' }}>
                  <Trash2 size={32} className="mx-auto mb-3" style={{ color: 'var(--danger)' }} />
                  <div className="font-bold text-base mb-1" style={{ color: 'var(--ink)' }}>{t('hist_confirm_clear')}</div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowClear(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                      {t('cancel')}
                    </button>
                    <button onClick={() => { clearHistory(); setShowClear(false); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(247,108,108,0.15)', color: 'var(--danger)', border: '1px solid rgba(247,108,108,0.3)' }}>
                      {t('hist_clear')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
