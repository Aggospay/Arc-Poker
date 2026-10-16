import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Check } from 'lucide-react';
import type { InventoryItem, ItemCategory, Rarity } from '../types/poker';
import { toast } from 'sonner';

const RARITY_META: Record<Rarity, { label: string; color: string; bg: string }> = {
  common:    { label: 'Common',    color: 'var(--rarity-common)',    bg: 'rgba(138,164,194,0.10)' },
  rare:      { label: 'Rare',      color: 'var(--rarity-rare)',      bg: 'rgba(56,182,255,0.10)'  },
  epic:      { label: 'Epic',      color: 'var(--rarity-epic)',      bg: 'rgba(168,85,247,0.10)'  },
  legendary: { label: 'Legendary', color: 'var(--rarity-legendary)', bg: 'rgba(245,200,66,0.10)'  },
};

const CAT_TABS: { key: ItemCategory | 'all'; label: string }[] = [
  { key: 'all',         label: 'All'        },
  { key: 'cardSkin',    label: 'Card Skins' },
  { key: 'tableTheme',  label: 'Tables'     },
  { key: 'avatar',      label: 'Avatars'    },
  { key: 'badge',       label: 'Badges'     },
  { key: 'trophy',      label: 'Trophies'   },
];

const ITEMS: InventoryItem[] = [
  { id: 'i1',  name: 'ARC Blueprint',    description: 'Default ARC-branded card back with circuit patterns.',      category: 'cardSkin',   rarity: 'common',    owned: true,  equipped: true,  previewGradient: 'linear-gradient(135deg,#0c1e38,#091628)', accentColor: '#38b6ff', price: 0    },
  { id: 'i2',  name: 'Neon Pulse',       description: 'Electric cyan glow card skin for high energy tables.',      category: 'cardSkin',   rarity: 'rare',      owned: true,  equipped: false, previewGradient: 'linear-gradient(135deg,#0a2040,#004466)', accentColor: '#00e5ff', price: 50   },
  { id: 'i3',  name: 'Void Dark',        description: 'Deep space aesthetic with subtle star field pattern.',      category: 'cardSkin',   rarity: 'epic',      owned: false, equipped: false, previewGradient: 'linear-gradient(135deg,#0d0820,#180a30)', accentColor: '#a855f7', price: 150  },
  { id: 'i4',  name: 'Golden Circuit',   description: 'Legendary gold-plated card back. Exclusive tournament reward.', category: 'cardSkin', rarity: 'legendary', owned: false, equipped: false, previewGradient: 'linear-gradient(135deg,#2a1a00,#3d2800)', accentColor: '#f5c842', price: 500  },
  { id: 'i5',  name: 'Arc Green Felt',   description: 'Classic ARC green poker table felt.',                        category: 'tableTheme', rarity: 'common',    owned: true,  equipped: true,  previewGradient: 'radial-gradient(ellipse,#0e3522,#071811)',  accentColor: '#3dd68c', price: 0    },
  { id: 'i6',  name: 'Midnight Blue',    description: 'Deep ocean blue velvet table surface.',                      category: 'tableTheme', rarity: 'rare',      owned: true,  equipped: false, previewGradient: 'radial-gradient(ellipse,#0a2040,#040e20)',  accentColor: '#38b6ff', price: 75   },
  { id: 'i7',  name: 'Crimson Velvet',   description: 'High stakes red velvet table — signals serious players.',    category: 'tableTheme', rarity: 'epic',      owned: false, equipped: false, previewGradient: 'radial-gradient(ellipse,#3a0a18,#1a0008)',  accentColor: '#f06080', price: 200  },
  { id: 'i8',  name: 'Cosmic Arc',       description: 'Animated star-field legendary table experience.',            category: 'tableTheme', rarity: 'legendary', owned: false, equipped: false, previewGradient: 'radial-gradient(ellipse,#0d0820,#180a30)',  accentColor: '#a855f7', price: 600  },
  { id: 'i9',  name: 'ARC Pioneer',      description: 'Default avatar for early ARC Poker members.',                category: 'avatar',     rarity: 'common',    owned: true,  equipped: true,  previewGradient: 'linear-gradient(135deg,#1a7fd4,#0ea5e9)',   accentColor: '#38b6ff', price: 0    },
  { id: 'i10', name: 'Cyber Samurai',    description: 'Futuristic samurai helmet avatar.',                          category: 'avatar',     rarity: 'rare',      owned: false, equipped: false, previewGradient: 'linear-gradient(135deg,#001a33,#003366)',   accentColor: '#00e5ff', price: 100  },
  { id: 'i11', name: 'Whale Badge',      description: 'Awarded to players who deposit over 10,000 USDC.',           category: 'badge',      rarity: 'epic',      owned: false, equipped: false, previewGradient: 'linear-gradient(135deg,#002244,#001122)',   accentColor: '#38b6ff', price: 0    },
  { id: 'i12', name: 'ARC Champion Cup', description: 'Trophy for winning an ARC Championship tournament.',          category: 'trophy',     rarity: 'legendary', owned: false, equipped: false, previewGradient: 'linear-gradient(135deg,#3d2800,#1a1000)',   accentColor: '#f5c842', price: 0    },
];

function ItemCard({ item, onPreview }: { item: InventoryItem; onPreview: (i: InventoryItem) => void }) {
  const r = RARITY_META[item.rarity];
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPreview(item)}
      className={`glass rounded-2xl p-3 cursor-pointer relative overflow-hidden rarity-${item.rarity}`}
      style={{
        opacity: item.owned ? 1 : 0.62,
        border: `1px solid ${item.owned ? r.color + '44' : 'var(--border)'}`,
      }}
    >
      {/* Preview swatch */}
      <div
        className="w-full rounded-xl mb-3 flex items-center justify-center relative overflow-hidden"
        style={{ height: 80, background: item.previewGradient }}
      >
        {item.rarity === 'legendary' && item.owned && (
          <div className="absolute inset-0 shimmer-legendary pointer-events-none" />
        )}
        {/* Category icon watermark */}
        <div style={{ color: item.accentColor, opacity: 0.7, fontSize: 28 }}>
          {item.category === 'cardSkin' && '♠'}
          {item.category === 'tableTheme' && '◉'}
          {item.category === 'avatar' && '◆'}
          {item.category === 'badge' && '★'}
          {item.category === 'trophy' && '♛'}
        </div>
      </div>

      {/* Rarity badge */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
          style={{ background: r.bg, color: r.color }}
        >
          {r.label}
        </span>
        {item.equipped && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
            style={{ background: 'rgba(61,214,140,0.12)', color: 'var(--success)' }}>
            <Check size={9} /> On
          </span>
        )}
      </div>

      <div className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>
        {item.name}
      </div>
      {!item.owned && item.price !== undefined && (
        <div className="tabnum text-[10px] mt-0.5" style={{ color: 'var(--accent)' }}>
          {item.price} USDC
        </div>
      )}
    </motion.div>
  );
}

function PreviewModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const r = RARITY_META[item.rarity];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 16 }}
          className="glass-strong rounded-3xl max-w-xs w-full p-6 pointer-events-auto"
          style={{ boxShadow: `0 0 60px ${item.accentColor}33` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Large preview */}
          <div
            className="w-full rounded-2xl mb-5 flex items-center justify-center relative overflow-hidden"
            style={{ height: 160, background: item.previewGradient }}
          >
            {item.rarity === 'legendary' && (
              <div className="absolute inset-0 shimmer-legendary pointer-events-none" />
            )}
            <span style={{ color: item.accentColor, fontSize: 56, filter: `drop-shadow(0 0 16px ${item.accentColor})` }}>
              {item.category === 'cardSkin' && '♠'}
              {item.category === 'tableTheme' && '◉'}
              {item.category === 'avatar' && '◆'}
              {item.category === 'badge' && '★'}
              {item.category === 'trophy' && '♛'}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: r.bg, color: r.color }}>
              {r.label}
            </span>
          </div>
          <h3 className="display text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>{item.name}</h3>
          <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>{item.description}</p>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 rounded-xl py-2.5 text-sm">Close</button>
            {item.owned ? (
              <button
                onClick={() => { toast.success(`${item.name} equipped!`); onClose(); }}
                className="btn-primary flex-1 rounded-xl py-2.5 text-sm"
              >
                {item.equipped ? 'Equipped' : 'Equip'}
              </button>
            ) : (
              <button
                onClick={() => { toast.success(`Purchase coming soon!`); }}
                className="btn-primary flex-1 rounded-xl py-2.5 text-sm"
              >
                Buy — {item.price} USDC
              </button>
            )}
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--subtle)' }}>
            <X size={14} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function Inventory() {
  const [catFilter, setCatFilter] = useState<ItemCategory | 'all'>('all');
  const [preview, setPreview] = useState<InventoryItem | null>(null);

  const filtered = catFilter === 'all' ? ITEMS : ITEMS.filter((i) => i.category === catFilter);
  const ownedCount = ITEMS.filter((i) => i.owned).length;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              Inventory
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {ownedCount} of {ITEMS.length} items owned
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(56,182,255,0.1)', border: '1px solid rgba(56,182,255,0.22)' }}>
            <Package size={18} style={{ color: 'var(--accent)' }} />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {CAT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setCatFilter(t.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: catFilter === t.key ? 'rgba(56,182,255,0.15)' : 'var(--surface)',
                border: `1px solid ${catFilter === t.key ? 'var(--accent)' : 'var(--border)'}`,
                color: catFilter === t.key ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        >
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onPreview={setPreview} />
          ))}
        </motion.div>
      </motion.div>

      {/* Preview modal */}
      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
