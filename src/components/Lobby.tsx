import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Zap, Trophy, Clock, TrendingUp, Star,
  ChevronRight, Wallet, Users, Shield, Calendar,
  Plus, Hash, Lock, Play,
} from 'lucide-react';
import type { TableInfo, TableVariant } from '../types/poker';
import { formatUsdc } from '../utils/poker';
import { useArcBalance } from '../hooks/useArcBalance';
import type { PrivateRoom } from '../hooks/usePrivateLobby';
import type { Tournament }  from '../hooks/useTournament';
import { useLocaleCtx } from '../i18n/LocaleContext';

interface Props {
  onJoinTable:          (table: TableInfo) => void;
  variant?:             TableVariant | 'all';

  privateRooms?:        PrivateRoom[];
  onCreatePrivate?:     () => void;
  onJoinPrivateRoom?:   (room: PrivateRoom) => void;
  onJoinByCode?:        () => void;
  tournaments?:         Tournament[];
  onCreateTournament?:  () => void;
  onOpenTournament?:    (t: Tournament) => void;
}

const ALL_TABLES: TableInfo[] = [
  { id: 't1',  name: 'ARC Beginners',      variant: 'cash',        smallBlind: 1,   bigBlind: 2,   minBuyIn: 40,    maxBuyIn: 200,    players: 4, maxPlayers: 6, avgPot: 18,    featured: false, speed: 'normal'  },
  { id: 't2',  name: 'Electric Neon',       variant: 'cash',        smallBlind: 5,   bigBlind: 10,  minBuyIn: 200,   maxBuyIn: 1000,   players: 5, maxPlayers: 6, avgPot: 95,    featured: true,  speed: 'normal'  },
  { id: 't3',  name: 'Cyber Circuit',       variant: 'cash',        smallBlind: 25,  bigBlind: 50,  minBuyIn: 1000,  maxBuyIn: 5000,   players: 3, maxPlayers: 6, avgPot: 480,   featured: false, speed: 'fast'    },
  { id: 't4',  name: 'Arc Hyper',           variant: 'cash',        smallBlind: 100, bigBlind: 200, minBuyIn: 4000,  maxBuyIn: 20000,  players: 2, maxPlayers: 6, avgPot: 2100,  featured: false, speed: 'turbo'   },
  { id: 't5',  name: 'ARC Fast 50',         variant: 'sng',         smallBlind: 10,  bigBlind: 20,  minBuyIn: 500,   maxBuyIn: 500,    players: 7, maxPlayers: 9, avgPot: 220,   featured: true,  speed: 'fast'    },
  { id: 't6',  name: 'Daily Grind SNG',     variant: 'sng',         smallBlind: 5,   bigBlind: 10,  minBuyIn: 100,   maxBuyIn: 100,    players: 4, maxPlayers: 9, avgPot: 60,    featured: false, speed: 'normal'  },
  { id: 't7',  name: 'Turbo 9-Max',         variant: 'sng',         smallBlind: 20,  bigBlind: 40,  minBuyIn: 1000,  maxBuyIn: 1000,   players: 9, maxPlayers: 9, avgPot: 350,   featured: false, speed: 'turbo'   },
  { id: 't8',  name: 'ARC Championship',    variant: 'tournament',  smallBlind: 50,  bigBlind: 100, minBuyIn: 2500,  maxBuyIn: 2500,   players: 234, maxPlayers: 500, avgPot: 1200, featured: true, speed: 'normal' },
  { id: 't9',  name: 'Sunday Special',      variant: 'tournament',  smallBlind: 25,  bigBlind: 50,  minBuyIn: 500,   maxBuyIn: 500,    players: 78, maxPlayers: 200, avgPot: 420,  featured: false, speed: 'normal' },
  { id: 't10', name: 'High Voltage',        variant: 'highstakes',  smallBlind: 100, bigBlind: 200, minBuyIn: 5000,  maxBuyIn: 50000,  players: 2, maxPlayers: 6, avgPot: 3400,  featured: false, speed: 'normal'  },
  { id: 't11', name: 'Whale Wars',          variant: 'highstakes',  smallBlind: 500, bigBlind: 1000,minBuyIn: 25000, maxBuyIn: 500000, players: 3, maxPlayers: 4, avgPot: 18000, featured: false, speed: 'normal'  },
];

const VARIANT_COLOR: Record<TableVariant, { color: string; bg: string }> = {
  cash:       { color: '#3dd68c', bg: 'rgba(61,214,140,0.11)'  },
  sng:        { color: '#38b6ff', bg: 'rgba(56,182,255,0.11)'  },
  tournament: { color: '#f5c842', bg: 'rgba(245,200,66,0.11)'  },
  highstakes: { color: '#f06080', bg: 'rgba(240,96,128,0.11)'  },
};

const SPEED_COLOR: Record<string, string> = {
  normal: 'var(--muted)',
  fast:   '#f5a623',
  turbo:  '#f06080',
};

function TableRow({ table, onJoin }: { table: TableInfo; onJoin: () => void }) {
  const { t } = useLocaleCtx();
  const vc    = VARIANT_COLOR[table.variant];
  const pct   = (table.players / table.maxPlayers) * 100;
  const barClr= pct > 83 ? '#f06080' : pct > 55 ? '#f5c842' : '#3dd68c';
  // Translate variant label
  const variantLabel = t(
    table.variant === 'cash' ? 'lobby_cash' :
    table.variant === 'sng'  ? 'lobby_sng'  :
    table.variant === 'tournament' ? 'lobby_tournament' : 'lobby_highstakes'
  );
  const speedLabel = table.speed === 'fast' ? t('phase_dealing') :
    table.speed === 'turbo' ? 'Turbo' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: 'rgba(56,182,255,0.04)' }}
      onClick={onJoin}
      className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-colors group"
      style={{ borderColor: 'var(--border)' }}
    >
      {table.featured && <Star size={11} fill="#f5c842" color="#f5c842" className="flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk' }}>
            {table.name}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: vc.bg, color: vc.color }}>
            {variantLabel}
          </span>
          {speedLabel && (
            <span className="text-[10px] font-medium" style={{ color: SPEED_COLOR[table.speed ?? 'normal'] }}>
              {speedLabel}
            </span>
          )}
        </div>
        <div className="text-xs tabnum mt-0.5" style={{ color: 'var(--muted)' }}>
          {formatUsdc(table.smallBlind)}/{formatUsdc(table.bigBlind)} — {t('lobby_buyin')} {formatUsdc(table.minBuyIn)} USDC
        </div>
      </div>

      <div className="w-20 flex-shrink-0">
        <div className="flex justify-between text-[10px] mb-1 tabnum" style={{ color: 'var(--muted)' }}>
          <span>{table.players}/{table.maxPlayers}</span>
          <span style={{ color: 'var(--subtle)' }}>{t('lobby_seats')}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-strong)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barClr }} />
        </div>
      </div>

      <div className="w-20 text-right flex-shrink-0">
        <div className="tabnum text-sm font-bold" style={{ color: 'var(--accent)' }}>{formatUsdc(table.avgPot)}</div>
        <div className="text-[10px]" style={{ color: 'var(--subtle)' }}>{t('lobby_avg')} {t('pot')}</div>
      </div>

      <ChevronRight size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }} />
    </motion.div>
  );
}

export function Lobby({ onJoinTable, variant = 'all', privateRooms = [], onCreatePrivate, onJoinPrivateRoom, onJoinByCode, tournaments = [], onCreateTournament, onOpenTournament }: Props) {
  const { balance, isConnected } = useArcBalance();
  const { t } = useLocaleCtx();
  const [search, setSearch]     = useState('');
  // localTab holds an explicit user click; if null, the sidebar-driven variant wins
  const [localTab, setLocalTab] = useState<TableVariant | 'all' | null>(null);
  const [lastVariant, setLastVariant] = useState(variant);

  // When sidebar nav changes variant, clear the local override so the new variant takes effect
  if (variant !== lastVariant) {
    setLastVariant(variant);
    setLocalTab(null);
  }

  const activeTab = localTab ?? (variant === 'all' ? 'all' : variant);
  const setActiveTab = (v: TableVariant | 'all') => { setLocalTab(v); };

  const featured = useMemo(() => ALL_TABLES.filter((tb) => tb.featured), []);

  const filtered = useMemo(() => {
    let tb = ALL_TABLES;
    if (activeTab !== 'all') tb = tb.filter((x) => x.variant === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      tb = tb.filter((x) => x.name.toLowerCase().includes(q) || x.variant.includes(q));
    }
    return tb;
  }, [activeTab, search]);

  const quickJoin = () => {
    const avail = ALL_TABLES.filter((tb) => tb.variant === 'cash' && tb.players < tb.maxPlayers);
    if (avail.length > 0) onJoinTable(avail[Math.floor(Math.random() * avail.length)]);
  };

  const TABS: { key: TableVariant | 'all'; labelKey: Parameters<typeof t>[0]; icon: React.ReactNode }[] = [
    { key: 'all',        labelKey: 'lobby_all',        icon: <Zap size={12} />        },
    { key: 'cash',       labelKey: 'lobby_cash',       icon: <Wallet size={12} />     },
    { key: 'sng',        labelKey: 'lobby_sng',        icon: <Clock size={12} />      },
    { key: 'tournament', labelKey: 'lobby_tournament', icon: <Trophy size={12} />     },
    { key: 'highstakes', labelKey: 'lobby_highstakes', icon: <TrendingUp size={12} /> },
  ];

  const STATS = [
    { labelKey: 'lobby_active_players' as const, value: '1,284', icon: <Users size={13} /> },
    { labelKey: 'lobby_live_tables'    as const, value: '47',    icon: <Zap size={13} /> },
    { labelKey: 'lobby_in_play'        as const, value: '128k',  icon: <TrendingUp size={13} /> },
    { labelKey: 'lobby_next_tourney'   as const, value: '14:32', icon: <Calendar size={13} /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Hero bar ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 py-5 border-b"
        style={{ borderColor: 'var(--border)', background: 'rgba(56,182,255,0.025)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="display text-2xl font-bold glow-text" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
              {t('lobby_title')}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {ALL_TABLES.length} {t('lobby_tables')} · {ALL_TABLES.reduce((s, tb) => s + tb.players, 0)} {t('lobby_players_active')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isConnected && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(56,182,255,0.08)', border: '1px solid rgba(56,182,255,0.18)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="tabnum text-sm font-bold" style={{ color: 'var(--accent)', fontFamily: 'Space Grotesk' }}>
                  {balance} USDC
                </span>
              </div>
            )}
            {onJoinByCode && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onJoinByCode}
                className="btn-ghost rounded-xl px-4 py-2 text-sm flex items-center gap-1.5"
              >
                <Hash size={13} /> {t('lobby_join_code')}
              </motion.button>
            )}
            {onCreatePrivate && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onCreatePrivate}
                className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-1.5"
              >
                <Plus size={13} /> {t('lobby_create_table')}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={quickJoin}
              className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-1.5"
            >
              <Zap size={13} /> {t('btn_quick_join')}
            </motion.button>
          </div>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-5">
          {STATS.map((s) => (
            <div key={s.labelKey} className="glass rounded-xl px-3 py-2.5 hidden sm:block">
              <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--accent)' }}>{s.icon}</div>
              <div className="tabnum font-bold text-base display" style={{ color: 'var(--ink)' }}>{s.value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--subtle)' }}>{t(s.labelKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured ─────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Star size={12} fill="#f5c842" color="#f5c842" />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('lobby_featured')}
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {featured.map((tb) => {
            const vc = VARIANT_COLOR[tb.variant];
            const variantLbl = t(
              tb.variant === 'cash' ? 'lobby_cash' :
              tb.variant === 'sng'  ? 'lobby_sng'  :
              tb.variant === 'tournament' ? 'lobby_tournament' : 'lobby_highstakes'
            );
            return (
              <motion.button
                key={tb.id}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onJoinTable(tb)}
                className="glass rounded-2xl p-4 flex-shrink-0 text-left cursor-pointer"
                style={{ minWidth: 180, border: '1px solid rgba(56,182,255,0.28)', background: 'rgba(56,182,255,0.05)' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Star size={10} fill="#f5c842" color="#f5c842" />
                  <span className="font-semibold text-xs" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk' }}>
                    {tb.name}
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: vc.bg, color: vc.color }}>
                  {variantLbl}
                </span>
                <div className="tabnum text-xs mt-2 font-bold" style={{ color: 'var(--accent)' }}>
                  <span className="usdc-val">{t('lobby_avg')} {formatUsdc(tb.avgPot)}<span className="usdc-label">USDC</span></span>
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {tb.players}/{tb.maxPlayers} {t('lobby_players_col')}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Private Rooms ─────────────────────────────── */}
      {privateRooms.length > 0 && (
        <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={12} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                {t('lobby_private_tables')}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full tabnum font-bold" style={{ background: 'rgba(56,182,255,0.14)', color: 'var(--accent)' }}>
                {privateRooms.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {privateRooms.map((room) => {
              const pct = (room.players.length / room.maxPlayers) * 100;
              return (
                <motion.button
                  key={room.id}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onJoinPrivateRoom?.(room)}
                  className="text-left rounded-2xl px-4 py-3 transition-all"
                  style={{ background: 'rgba(56,182,255,0.04)', border: '1px solid rgba(56,182,255,0.18)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk' }}>{room.name}</span>
                      {room.password && <Lock size={10} color="#f5c842" />}
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          background: room.status === 'playing' ? 'rgba(61,214,140,0.12)' : 'rgba(56,182,255,0.10)',
                          color: room.status === 'playing' ? '#3dd68c' : 'var(--accent)',
                        }}
                      >
                        {room.status === 'playing' ? t('lobby_live') : t('lobby_waiting')}
                      </span>
                    </div>
                    <span className="text-[10px] tabnum font-bold" style={{ color: 'var(--accent)' }}>{room.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs tabnum" style={{ color: 'var(--muted)' }}>
                      {room.smallBlind}/{room.bigBlind} · {t('lobby_host')}: {room.hostName}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-strong)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                      </div>
                      <span className="text-[10px] tabnum" style={{ color: 'var(--muted)' }}>
                        {room.players.length}/{room.maxPlayers}
                      </span>
                      {room.status === 'playing' ? <Play size={11} color="#3dd68c" /> : <Users size={11} style={{ color: 'var(--accent)' }} />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tournaments ──────────────────────────────── */}
      {(tournaments.length > 0 || onCreateTournament) && (
        <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={12} style={{ color: '#fbbf24' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Tournaments
              </span>
              {tournaments.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full tabnum font-bold" style={{ background: 'rgba(251,191,36,0.14)', color: '#fbbf24' }}>
                  {tournaments.length}
                </span>
              )}
            </div>
            {onCreateTournament && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onCreateTournament}
                className="btn-primary flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ color: '#fbbf24' }}
              >
                <Plus size={11} /> {t('create_tournament_title')}
              </motion.button>
            )}
          </div>

          {tournaments.length === 0 ? (
            <div className="text-xs text-center py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--subtle)' }}>
              No active tournaments — be the first to create one!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tournaments.map((t) => {
                const active  = t.players.filter((p) => p.chips > 0).length;
                const total   = t.players.length;
                const pct     = (total / t.maxPlayers) * 100;
                return (
                  <motion.button key={t.id} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    onClick={() => onOpenTournament?.(t)}
                    className="text-left rounded-2xl px-4 py-3 transition-all"
                    style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.18)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Trophy size={12} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        <span className="font-semibold text-sm truncate" style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk' }}>{t.name}</span>
                        {t.password && <Lock size={10} color="#f5c842" style={{ flexShrink: 0 }} />}
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                        style={{
                          background: t.status === 'running' ? 'rgba(61,214,140,0.12)' : 'rgba(251,191,36,0.1)',
                          color: t.status === 'running' ? '#3dd68c' : '#fbbf24',
                        }}>
                        {t.status === 'running' ? '🟢 Running' : t.status === 'registering' ? '⏳ Open' : '✅ Done'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs tabnum" style={{ color: 'var(--muted)' }}>
                        ${t.buyIn} buy-in · {t.status === 'running' ? `${active} left` : `${total}/${t.maxPlayers}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-strong)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#fbbf24' }} />
                        </div>
                        <span className="text-[10px] tabnum font-bold" style={{ color: '#3dd68c' }}>
                          ${t.prizePool.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab filter + search ───────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-3 flex-shrink-0 border-b flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? 'rgba(56,182,255,0.14)' : 'transparent',
                border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {tab.icon}{t(tab.labelKey)}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('lobby_search')}
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none w-40 transition-all focus:w-52"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
        </div>
      </div>

      {/* ── Table list ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid px-4 py-2 text-[10px] uppercase tracking-widest sticky top-0"
          style={{ gridTemplateColumns: '1fr 90px 90px 32px', color: 'var(--subtle)', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)', zIndex: 2 }}
        >
          <span>{t('lobby_table_col')}</span>
          <span>{t('lobby_players_col')}</span>
          <span>{t('lobby_avgpot_col')}</span>
          <span />
        </div>

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Shield size={36} className="mx-auto opacity-20 mb-3" style={{ color: 'var(--accent)' }} />
              <div className="text-sm" style={{ color: 'var(--muted)' }}>{t('lobby_no_tables')} "{search}"</div>
            </motion.div>
          ) : (
            <div>
              {filtered.map((tb, i) => (
                <motion.div key={tb.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <TableRow table={tb} onJoin={() => onJoinTable(tb)} />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
