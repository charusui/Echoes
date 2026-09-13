import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, ChevronRight, Close, Package, Potion, Shield, Sparkle, Sparkles, Store, Zap } from 'pixelarticons/react';
import { PixelButton, PixelChip, PixelModal, PixelPanel, PixelTabs, PixelToast, SectionLabel, type PixelChipTone } from '../ui';
import { cn } from '../../lib/cn';
import mariasShopBanner from '../../assets/images/market_bg.png';
import mariaSprite from '../../assets/png/maria_sprite.png';
import { audioEngine } from '../../services/audioSynth';
import { type HeroProfile, type MapNode } from '../../types/expedition';

//shop
import fork from '../../assets/shop/fork.png';
import rosin from '../../assets/shop/rosin.png';
import weave from '../../assets/shop/weave.png';
import tonic from '../../assets/shop/tonic.png';
import spice from '../../assets/shop/spice.png';
import songbook from '../../assets/shop/songbook.png';
import potion from '../../assets/shop/potion.png';
import rustedkey from '../../assets/shop/rustedkey.png';

interface MariaShopModalProps {
  party: Record<string, HeroProfile>;
  nodes?: Record<string, MapNode>;
  onUpdateParty?: React.Dispatch<React.SetStateAction<Record<string, HeroProfile>>>;
  onClose: () => void;
  onAddXP?: (amount: number) => void;
  onUpdateInventory?: (itemId: string, countChange: number) => void;
  shards?: number;
  onUpdateShards?: (amount: number) => void;
}

interface ShopItem {
  id: string;
  name: string;
  category: 'Tonic' | 'Upgrade' | 'Gear' | 'Special';
  price: number;
  icon: string;
  description: string;
  effectText: string;
  stock: number | 'Infinite';
}

const INITIAL_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'turmeric_tonic',
    name: 'Visayan Turmeric Tonic',
    category: 'Tonic',
    price: 30,
    icon: tonic,
    description: 'Freshly brewed herbal concoction infused with mountain ginger and honey.',
    effectText: 'Heals all Party Members by 150 HP & clears Dissonance fatigue.',
    stock: 'Infinite',
  },
  {
    id: 'acoustic_rosin',
    name: 'Polished Acoustic Rosin',
    category: 'Upgrade',
    price: 65,
    icon: rosin,
    description: 'Premium resin block harvested from centuries-old pine trees in the highlands.',
    effectText: 'Permanently increases all Party Members max AP capacity (+1 AP).',
    stock: 1,
  },
  {
    id: 'tnalak_weave',
    name: "T'nalak Harmonic Weave",
    category: 'Gear',
    price: 50,
    icon: weave,
    description: 'Sacred handwoven abaca textile imbued with dream-weaver protective wards.',
    effectText: 'Grants +80 Shield and +50 Max HP to Vanguard Conductor Gustave.',
    stock: 1,
  },
  {
    id: 'cadence_fork',
    name: 'Cadence Tuning Fork',
    category: 'Special',
    price: 45,
    icon: fork,
    description: 'Resonates at precisely 432Hz. Calibrates local sonic waves to absolute harmony.',
    effectText: 'Full AP Restoration & grants +25% Stagger buildup on next boss encounter.',
    stock: 'Infinite',
  },
  {
    id: 'solar_spice',
    name: "Maria's Solar Spice Pack",
    category: 'Special',
    price: 40,
    icon: spice,
    description: 'A fiery blend of sun-dried chilis and golden turmeric from Maria’s personal garden.',
    effectText: 'Grants +40 Overdrive to your entire party for explosive starting combos.',
    stock: 'Infinite',
  },
  {
    id: 'heritage_songbook',
    name: 'Visayan Heritage Songbook',
    category: 'Upgrade',
    price: 80,
    icon: songbook,
    description: 'Ancient sheet music containing forgotten folk melodies and rhythmic notations.',
    effectText: 'Instantly grants +300 Expedition XP toward your next region unlock.',
    stock: 1,
  },
];

const MARIA_DIALOGUES = [
  "Magandang araw! Welcome to Maria's Fine Goods — the only real shop between the Crossroads and Echo Village!",
  "Win battles to earn Harmonic Shards. The stronger the enemy, the more shards you'll collect — bosses drop 250!",
  "The Turmeric Tonic is my best seller! Stock up before you fight the Wakwak over in Echo Village — trust me.",
  "Psst! If you've already visited the Crossroads and helped that poor traveler, come back — I've restocked something special just for you.",
];

export function MariaShopModal({ party: _party, nodes, onUpdateParty, onClose, onAddXP, onUpdateInventory, shards = 250, onUpdateShards }: MariaShopModalProps) {
  useEffect(() => {
    const shopBgm = new Audio('/assets/audio/bgm/shop_bgm.mp3');
    shopBgm.loop = true;
    shopBgm.volume = 0.3;
    shopBgm.muted = audioEngine.muted;
    shopBgm.play().catch((err) => {
      console.warn("Autoplay blocked shop BGM:", err);
    });

    return () => {
      shopBgm.pause();
      shopBgm.currentTime = 0;
    };
  }, []);
  const [items, setItems] = useState<ShopItem[]>(() => {
    const baseItems = [...INITIAL_SHOP_ITEMS];
    if (nodes && nodes['crossroads']?.completed) {
      baseItems.push({
        id: 'mystery_key',
        name: 'Mystery Key',
        category: 'Special',
        price: 0,
        icon: rustedkey,
        description: 'A strange rusted key given by the merchant at the crossroads.',
        effectText: 'Grants access to Echo Village.',
        stock: 1,
      });
      baseItems.push({
        id: 'reverse_potion',
        name: 'Reverse Potion',
        category: 'Tonic',
        price: 50,
        icon: potion,
        description: 'A mysterious potion that seems to invert your exhaustion.',
        effectText: 'Fully restores HP and grants temporary max AP.',
        stock: 'Infinite',
      });
    }
    return baseItems;
  });
  
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const [purchasedNotification, setPurchasedNotification] = useState<{ text: string; tone: 'success' | 'danger' } | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<'All' | 'Tonic' | 'Upgrade' | 'Gear' | 'Special'>('All');
  
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

  const handleNextDialogue = () => {
    setDialogueIndex((prev) => (prev + 1) % MARIA_DIALOGUES.length);
  };

  const handleBuy = (item: ShopItem) => {
    if (shards < item.price) {
      setPurchasedNotification({ text: 'Not enough Harmonic Shards', tone: 'danger' });
      audioEngine.playHitSFX('miss');
      setTimeout(() => setPurchasedNotification(null), 2500);
      return;
    }

    if (item.stock === 0) {
      setPurchasedNotification({ text: 'Out of stock', tone: 'danger' });
      return;
    }

    if (onUpdateShards) {
      onUpdateShards(-item.price);
    }

    if (typeof item.stock === 'number') {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stock: (i.stock as number) - 1 } : i))
      );
    }

    audioEngine.playHitSFX('perfect');
    new Audio('/assets/audio/sfx/bought.mp3').play().catch(() => {});

    if (onUpdateParty) {
      if (item.id === 'turmeric_tonic') {
        if (onUpdateInventory) {
          onUpdateInventory(item.id, 1);
        }
      } else if (item.id === 'acoustic_rosin') {
        onUpdateParty((prevParty) => {
          const updated: Record<string, HeroProfile> = {};
          for (const key of Object.keys(prevParty)) {
            const h = prevParty[key]!;
            updated[key] = { ...h, maxAp: h.maxAp + 1, ap: h.maxAp + 1 };
          }
          return updated;
        });
      } else if (item.id === 'tnalak_weave') {
        onUpdateParty((prevParty) => {
          const gustave = prevParty['gustave'];
          if (!gustave) return prevParty;
          return {
            ...prevParty,
            gustave: {
              ...gustave,
              maxHp: gustave.maxHp + 50,
              hp: gustave.hp + 50,
              shield: (gustave.shield || 0) + 80,
            },
          };
        });
      } else if (item.id === 'cadence_fork') {
        if (onUpdateInventory) {
          onUpdateInventory(item.id, 1);
        }
      } else if (item.id === 'solar_spice') {
        if (onUpdateInventory) {
          onUpdateInventory(item.id, 1);
        }
      } else if (item.id === 'reverse_potion') {
        if (onUpdateInventory) {
          onUpdateInventory(item.id, 1);
        }
      }
    }

    if (item.id === 'heritage_songbook' && onAddXP) {
      onAddXP(300);
    }

    setPurchasedNotification({ text: `Bought ${item.name}`, tone: 'success' });
    setTimeout(() => setPurchasedNotification(null), 3500);
  };

  const filteredItems = items.filter(item => activeCategory === 'All' || item.category === activeCategory);
  const activePreviewItem = items.find(i => i.id === previewItemId);

  const categories = [
    { id: 'All', label: 'All', icon: <Package /> },
    { id: 'Tonic', label: 'Tonics', icon: <Potion /> },
    { id: 'Upgrade', label: 'Upgrades', icon: <Sparkles /> },
    { id: 'Gear', label: 'Gear', icon: <Shield /> },
    { id: 'Special', label: 'Special', icon: <Zap /> },
  ] as const;

  const CATEGORY_TONE: Record<ShopItem['category'], PixelChipTone> = {
    Tonic: 'heal',
    Upgrade: 'synth',
    Gear: 'xp',
    Special: 'gold',
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden flex flex-col bg-plum-950 text-parchment-100 px-fade-in">

      {/* ─── HEADER ─── */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-3 sm:px-6 py-2 sm:py-3 bg-plum-900 border-b-[3px] border-ink">
        <div className="flex items-center gap-3 min-w-0">
          <PixelButton size="sm" icon={<ArrowLeft />} sound="ui_back" onClick={onClose}>
            <span className="hidden sm:inline">Leave Shop</span>
          </PixelButton>
          <div className="min-w-0 flex items-center gap-2">
            <Store className="size-6 shrink-0 text-gold-300" aria-hidden />
            <h1 className="font-bold text-xl sm:text-2xl leading-none truncate">Maria's Fine Goods</h1>
          </div>
        </div>
        <div className="px-frame px-frame-inset px-frame-sm flex items-center gap-2 px-3 py-1.5" aria-label={`${shards} Harmonic Shards`}>
          <Sparkle className="size-5 text-gold-300" aria-hidden />
          <span className="font-label text-base leading-none text-gold-300">{shards}</span>
          <span className="hidden sm:inline text-xs text-parchment-500">Shards</span>
        </div>
      </header>

      {purchasedNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60]">
          <PixelToast tone={purchasedNotification.tone} icon={purchasedNotification.tone === 'success' ? <Check /> : <Close />}>
            {purchasedNotification.text}
          </PixelToast>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-3 sm:p-6 flex flex-col gap-5 sm:gap-6">

          {/* ─── SHOPKEEPER ─── */}
          <PixelPanel frame="wood" padding="none" className="relative h-[170px] sm:h-[220px] overflow-hidden">
            <img
              src={mariasShopBanner}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover brightness-[0.35] saturate-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-plum-950 via-plum-950/80 to-transparent" />

            <div className="relative z-10 h-full w-[62%] sm:w-2/3 p-4 sm:p-6 flex flex-col justify-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-2xl leading-none text-gold-300">Maria</span>
                <PixelChip tone="dark">Shopkeeper</PixelChip>
              </div>
              <p className="text-sm sm:text-lg leading-snug text-parchment-100">
                {MARIA_DIALOGUES[dialogueIndex]}
              </p>
              <PixelButton
                variant="ghost"
                size="sm"
                icon={<ChevronRight />}
                sound="dialogue_next"
                onClick={handleNextDialogue}
                className="self-start px-0"
              >
                Next ({dialogueIndex + 1}/{MARIA_DIALOGUES.length})
              </PixelButton>
            </div>

            <img
              src={mariaSprite}
              alt="Maria"
              className="absolute right-0 sm:right-[5%] bottom-0 z-10 h-[115%] w-[140px] sm:w-[220px] object-cover object-top pointer-events-none"
            />
          </PixelPanel>

          {/* ─── CATEGORIES + GRID ─── */}
          <section className="flex flex-col">
            <div className="flex items-end justify-between gap-3 border-b-[3px] border-ink">
              <PixelTabs
                value={activeCategory}
                onChange={setActiveCategory}
                tabs={categories.map(c => ({ id: c.id, label: c.label, icon: c.icon }))}
              />
              <span className="hidden sm:block pb-2 text-sm text-parchment-500">{filteredItems.length} items</span>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pt-4 pb-10">
              {filteredItems.map(item => {
                const isOutOfStock = item.stock === 0;
                const canAfford = shards >= item.price;

                return (
                  <li key={`${activeCategory}-${item.id}`} className={cn('px-frame px-frame-plum flex flex-col', isOutOfStock && 'opacity-60')}>
                    <button
                      type="button"
                      onClick={() => setPreviewItemId(item.id)}
                      className="group text-left flex flex-col flex-1 focus-visible:outline-[3px] focus-visible:outline-gold-300 focus-visible:-outline-offset-[3px]"
                      aria-label={`View ${item.name}`}
                    >
                      <div className="relative h-32 border-b-[3px] border-ink bg-plum-950 overflow-hidden">
                        <img src={item.icon} alt="" className="absolute inset-0 w-full h-full object-cover pixelated" />
                        <PixelChip tone={CATEGORY_TONE[item.category]} className="absolute top-2 left-2">{item.category}</PixelChip>
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1">
                        <h4 className="font-bold text-lg leading-tight text-parchment-100 group-hover:text-gold-300">{item.name}</h4>
                        <p className="text-sm leading-snug text-parchment-300 line-clamp-2">{item.effectText}</p>
                      </div>
                    </button>

                    <div className="flex items-center justify-between gap-3 px-3 pb-3">
                      <div className="flex flex-col gap-1">
                        <span className={cn('flex items-center gap-1.5 font-label text-base leading-none', canAfford ? 'text-gold-300' : 'text-hp-light')}>
                          <Sparkle className="size-4" aria-hidden />
                          {item.price}
                        </span>
                        {typeof item.stock === 'number' && (
                          <span className="text-xs text-parchment-500">{item.stock} left</span>
                        )}
                      </div>
                      <PixelButton
                        size="sm"
                        sound={null}
                        disabled={isOutOfStock || !canAfford}
                        onClick={() => handleBuy(item)}
                      >
                        {isOutOfStock ? 'Sold out' : 'Buy'}
                      </PixelButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>

      {/* ─── ITEM DETAIL ─── */}
      {activePreviewItem && (
        <PixelModal
          onClose={() => setPreviewItemId(null)}
          title={activePreviewItem.name}
          subtitle={activePreviewItem.category}
          maxWidth="max-w-2xl"
          bodyClassName="p-0 sm:p-0"
          footer={
            <>
              <span className={cn('mr-auto flex items-center gap-2 font-label text-2xl leading-none', shards >= activePreviewItem.price ? 'text-gold-300' : 'text-hp-light')}>
                <Sparkle className="size-6" aria-hidden />
                {activePreviewItem.price}
              </span>
              <PixelButton variant="ghost" sound="ui_back" onClick={() => setPreviewItemId(null)}>Cancel</PixelButton>
              <PixelButton
                variant="primary"
                sound={null}
                disabled={activePreviewItem.stock === 0 || shards < activePreviewItem.price}
                onClick={() => handleBuy(activePreviewItem)}
              >
                {activePreviewItem.stock === 0 ? 'Sold out' : shards < activePreviewItem.price ? 'Not enough shards' : 'Buy'}
              </PixelButton>
            </>
          }
        >
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-2/5 h-48 sm:h-auto border-b-[3px] sm:border-b-0 sm:border-r-[3px] border-ink bg-plum-950 overflow-hidden">
              <img src={activePreviewItem.icon} alt="" className="w-full h-full object-cover pixelated" />
            </div>
            <div className="sm:w-3/5 p-4 flex flex-col gap-4">
              <p className="text-base leading-snug text-parchment-300">{activePreviewItem.description}</p>
              <PixelPanel frame="parchment" padding="sm" title="Effect">
                <p className="text-base leading-snug text-ink">{activePreviewItem.effectText}</p>
              </PixelPanel>
              {typeof activePreviewItem.stock === 'number' && (
                <SectionLabel>{activePreviewItem.stock} in stock</SectionLabel>
              )}
            </div>
          </div>
        </PixelModal>
      )}
    </div>
  );
}
