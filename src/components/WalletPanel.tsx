import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Copy, ShieldCheck } from 'lucide-react';
import { useArcBalance } from '../hooks/useArcBalance';
import { useAuth } from '../hooks/useAuth';
import { useInternalWallet } from '../hooks/useInternalWallet';
import { buildAddressExplorerUrl } from '@/onchain-facts';
import { shortenAddress, formatUsdc } from '../utils/poker';


import { toast } from 'sonner';
import { useLocaleCtx } from '../i18n/LocaleContext';

interface WalletPanelProps {
  gameBalance?: number;
  onOpenDeposit?: () => void;
}

export function WalletPanel({ gameBalance: gameBalanceProp, onOpenDeposit }: WalletPanelProps = {}) {
  const { isConnected } = useArcBalance();
  const { isLoggedIn, userId, method } = useAuth();
  const { t } = useLocaleCtx();
  const sessionMethod = method === 'wallet' ? 'wallet' : 'offline';
  const { state: walletState, cachedAddress, internalBalance } = useInternalWallet({
    sessionUserId: userId ?? undefined,
    sessionMethod,
  });


  const internalAddress = walletState.status === 'ready' ? walletState.address : cachedAddress;
  const explorerUrl     = internalAddress ? buildAddressExplorerUrl(5042002, internalAddress) : '#';
  const onChainNum      = parseFloat(internalBalance) || 0;
  const balanceNum      = gameBalanceProp !== undefined ? gameBalanceProp : onChainNum;

  if (!isLoggedIn && !isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>{t('connect_wallet')}</div>
          <div className="text-sm" style={{ color: 'var(--muted)' }}>{t('wal_create_first')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto max-w-lg">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="display text-2xl font-bold mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          {t('wal_title')}
        </h2>

        {/* Balance card */}
        <div
          className="glass-strong rounded-3xl p-6 mb-6 text-center"
          style={{ border: '1px solid rgba(56,182,255,0.22)', background: 'rgba(56,182,255,0.06)' }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <ShieldCheck size={13} style={{ color: 'var(--accent)' }} />
            <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {t('wal_internal')}
            </div>
          </div>
          <div className="usdc-val tabnum text-4xl display mb-1" style={{ letterSpacing: '-0.04em' }}>
            {internalAddress ? formatUsdc(balanceNum) : '—'}
            <span className="usdc-label text-base">USDC</span>
          </div>
          <div className="text-xs font-semibold mb-4" style={{ color: 'var(--muted)' }}>on Arc Testnet</div>

          {internalAddress ? (
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>{shortenAddress(internalAddress)}</span>
              <button
                onClick={() => { void navigator.clipboard.writeText(internalAddress); toast.success(t('copied')); }}
                className="hover:opacity-70 transition-opacity"
                style={{ color: 'var(--subtle)' }}
              ><Copy size={11} /></button>
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70" style={{ color: 'var(--accent)' }}>
                <ExternalLink size={11} />
              </a>
            </div>
          ) : (
            <div className="text-xs mb-4" style={{ color: 'var(--subtle)' }}>{t('wal_create_first')}</div>
          )}

          <div className="flex gap-3 justify-center">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenDeposit?.()}
              className="btn-primary flex-1 max-w-[140px] rounded-xl py-3 text-sm flex items-center justify-center gap-1.5"
            >
              <ArrowDownLeft size={14} /> {t('deposit')}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenDeposit?.()}
              className="btn-ghost flex-1 max-w-[140px] rounded-xl py-3 text-sm flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight size={14} /> {t('withdraw')}
            </motion.button>
          </div>
        </div>

        {/* Network info */}
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--subtle)' }}>
            Network
          </div>
          {[
            { label: 'Chain',    value: 'Arc Testnet', isLink: false },
            { label: 'Chain ID', value: '5042002',     isLink: false, mono: true },
            { label: 'Gas Token',value: 'USDC',        isLink: false, usdc: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{row.label}</span>
              <span
                className={`text-sm font-semibold ${row.mono ? 'mono' : ''} ${'usdc' in row && row.usdc ? 'usdc-val' : ''}`}
                style={{ color: !('usdc' in row && row.usdc) ? 'var(--ink)' : undefined }}
              >{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Explorer</span>
            <a
              href="https://explorer.testnet.arc.io"
              target="_blank" rel="noopener noreferrer"
              className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              {t('wal_explorer')} <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
