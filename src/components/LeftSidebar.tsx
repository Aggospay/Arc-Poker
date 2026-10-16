import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid, Coins, Trophy, Clock, BarChart2,
  User, History, Wallet,
  ChevronLeft, ChevronRight, LogIn, LogOut,
} from 'lucide-react';
import { ConnectKitButton } from 'connectkit';
import type { AppView } from '../types/poker';
import { shortenAddress } from '../utils/poker';
import { useLocaleCtx } from '../i18n/LocaleContext';
import type { TranslationKey } from '../i18n/LocaleContext';

interface NavItemDef { view: AppView; key: TranslationKey; icon: React.ReactNode; sectionKey?: TranslationKey; }
const NAV_DEFS: NavItemDef[] = [
  { view: 'lobby',       key: 'nav_lobby',       icon: <LayoutGrid size={16} />, sectionKey: 'nav_section_play' },
  { view: 'cashgames',   key: 'nav_cash',         icon: <Coins size={16} /> },
  { view: 'tournaments', key: 'nav_tournaments',  icon: <Trophy size={16} /> },
  { view: 'sitandgo',    key: 'nav_sitgo',        icon: <Clock size={16} /> },
  { view: 'leaderboard', key: 'nav_leaderboard',  icon: <BarChart2 size={16} />, sectionKey: 'nav_section_social' },
  { view: 'profile',     key: 'nav_profile',      icon: <User size={16} />,     sectionKey: 'nav_section_account' },
  { view: 'history',     key: 'nav_history',      icon: <History size={16} /> },
  { view: 'wallet',      key: 'nav_wallet',       icon: <Wallet size={16} /> },
];

interface Props {
  currentView: AppView;
  onNavigate: (v: AppView) => void;
  onQuickJoin: () => void;
  internalBalance?: string;
  internalAddress?: string;
  hasInternalWallet?: boolean;
  onOpenWallet?: () => void;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  authName?: string;
  authMethod?: string;
}

export function LeftSidebar({ currentView, onNavigate, onQuickJoin: _onQuickJoin, internalBalance, internalAddress, hasInternalWallet, onOpenWallet, isLoggedIn, onOpenAuth, onLogout, authName }: Props) {
  const { t } = useLocaleCtx();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? 60 : 220;

  return (
    <motion.aside
      animate={{ width: sidebarW }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="sidebar-bg flex flex-col flex-shrink-0 relative z-40 overflow-hidden"
      style={{ height: '100dvh', minHeight: '100dvh', position: 'sticky', top: 0 }}
    >
      {/* Logo row */}
      <div
        className="flex items-center gap-3 px-3 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--border)', minHeight: 56 }}
      >
        <img
          src="/icon22.svg"
          alt="ARC"
          className="flex-shrink-0"
          style={{ width: 32, height: 32, objectFit: 'contain' }}
        />
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="whitespace-nowrap"
          >
            <span
              className="display font-bold"
              style={{ fontSize: 16, letterSpacing: '-0.02em', color: 'var(--ink)' }}
            >
              ARC Poker
            </span>
          </motion.div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto p-1.5 rounded-lg transition-colors hover:opacity-70 flex-shrink-0"
          style={{ color: 'var(--subtle)' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Balance / auth strip */}
      {!collapsed && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={isLoggedIn ? onOpenWallet : onOpenAuth}
          className="mx-3 mt-3 px-3 py-2 rounded-xl text-left w-auto transition-opacity hover:opacity-80"
          style={{
            background: isLoggedIn && hasInternalWallet ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isLoggedIn && hasInternalWallet ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {isLoggedIn ? (
            <>
              <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--subtle)' }}>
                {hasInternalWallet ? t('wallet_internal_balance') : t('wallet_no_wallet')}
              </div>
              <div className={hasInternalWallet ? 'usdc-val tabnum text-sm' : 'tabnum font-bold text-sm'} style={hasInternalWallet ? {} : { color: 'var(--subtle)', fontFamily: 'Space Grotesk' }}>
                {hasInternalWallet
                  ? <>{internalBalance ?? '0.00'}<span className="usdc-label">USDC</span></>
                  : t('btn_create') + ' →'}
              </div>
              <div className="mono text-[10px] mt-0.5" style={{ color: 'var(--subtle)' }}>
                {internalAddress ? shortenAddress(internalAddress) : authName ?? '—'}
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--subtle)' }}>{t('auth_not_signed_in')}</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{t('btn_sign_in')} →</div>
            </>
          )}
        </motion.button>
      )}



      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_DEFS.map((item) => {
          const isActive = currentView === item.view;
          return (
            <div key={item.view}>
              {item.sectionKey && !collapsed && (
                <div
                  className="text-[10px] uppercase tracking-widest px-3 pt-3 pb-1"
                  style={{ color: 'var(--subtle)' }}
                >
                  {t(item.sectionKey)}
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate(item.view)}
                className="w-full flex items-center rounded-xl transition-all relative"
                style={{
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? '10px 0' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'rgba(99,102,241,0.13)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="whitespace-nowrap">{t(item.key)}</span>
                )}
              </motion.button>
            </div>
          );
        })}
      </nav>

      {/* Bottom auth section */}
      <div className="px-3 pb-4 pt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
        {/* Always show ConnectKit for wallet users */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <ConnectKitButton.Custom>
              {({ show, isConnected: ck }) => (
                <button onClick={show} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: ck ? 'rgba(61,214,140,0.12)' : 'rgba(99,102,241,0.12)', border: `1px solid ${ck ? 'rgba(61,214,140,0.3)' : 'rgba(99,102,241,0.25)'}`, color: ck ? 'var(--success)' : 'var(--accent)' }}>
                  <Wallet size={14} />
                </button>
              )}
            </ConnectKitButton.Custom>
            {isLoggedIn
              ? <button onClick={onLogout} className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}><LogOut size={14} /></button>
              : <button onClick={onOpenAuth} className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}><LogIn size={14} /></button>
            }
          </div>
        ) : (
          <>
            <ConnectKitButton customTheme={{
              '--ck-font-family': "'DM Sans', sans-serif",
              '--ck-primary-button-background': 'rgba(99,102,241,0.13)',
              '--ck-primary-button-border-radius': '10px',
              '--ck-primary-button-color': '#6366f1',
              '--ck-body-background': '#0a1628',
              '--ck-body-color': '#f0f6ff',
              '--ck-border-radius': '14px',
            }} />
            {/* Email/Google sign-in or logout */}
            {isLoggedIn ? (
              <button onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
                <LogOut size={12} /> {t('btn_sign_out')}
              </button>
            ) : (
              <button onClick={onOpenAuth}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: 'var(--accent)' }}>
                <LogIn size={12} /> {t('btn_sign_in_email')}
              </button>
            )}
          </>
        )}
      </div>
    </motion.aside>
  );
}
