import React, { useState } from 'react';
import { ShoppingBag, Sparkles, MessageCircle, ArrowLeft, Zap, Package, Shield, Beaker, X } from 'lucide-react';
import mariasShopBanner from '../../assets/images/market_bg.png';
import mariaSprite from '../../assets/png/maria_sprite.png';
import { audioEngine } from '../../services/audioSynth';
import { type HeroProfile } from '../../types/expedition';

//shop
import fork from '../../assets/shop/fork.png';
import rosin from '../../assets/shop/rosin.png';
import weave from '../../assets/shop/weave.png';
import tonic from '../../assets/shop/tonic.png';
import spice from '../../assets/shop/spice.png';
import songbook from '../../assets/shop/songbook.png';

interface MariaShopModalProps {
  party: Record<string, HeroProfile>;
  onUpdateParty?: React.Dispatch<React.SetStateAction<Record<string, HeroProfile>>>;
  onClose: () => void;
  onAddXP?: (amount: number) => void;
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
  "Welcome to Maria's Fine Goods! Take a look around our bustling market square in the Town of Cadence!",
  "All our tonics are brewed fresh using sacred herbs and spices harvested right from the Silent Valley.",
  "That T'nalak weave over there? Handcrafted by traditional master weavers—it can deflect even Lord Cacophony's shockwaves!",
  "Need to tune up your party before facing the anomalies? Try the Cadence Tuning Fork or our Polished Acoustic Rosin!",
];

export function MariaShopModal({ party: _party, onUpdateParty, onClose, onAddXP }: MariaShopModalProps) {
  const [items, setItems] = useState<ShopItem[]>(INITIAL_SHOP_ITEMS);
  const [shards, setShards] = useState<number>(250);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const [purchasedNotification, setPurchasedNotification] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<'All' | 'Tonic' | 'Upgrade' | 'Gear' | 'Special'>('All');
  
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

  const handleNextDialogue = () => {
    setDialogueIndex((prev) => (prev + 1) % MARIA_DIALOGUES.length);
  };

  const handleBuy = (item: ShopItem) => {
    if (shards < item.price) {
      setPurchasedNotification("❌ NOT ENOUGH HARMONIC SHARDS!");
      audioEngine.playHitSFX('miss');
      setTimeout(() => setPurchasedNotification(null), 2500);
      return;
    }

    if (item.stock === 0) {
      setPurchasedNotification("❌ OUT OF STOCK!");
      return;
    }

    setShards((prev) => prev - item.price);

    if (typeof item.stock === 'number') {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stock: (i.stock as number) - 1 } : i))
      );
    }

    audioEngine.playHitSFX('perfect');

    if (onUpdateParty) {
      if (item.id === 'turmeric_tonic') {
        onUpdateParty((prevParty) => {
          const updated: Record<string, HeroProfile> = {};
          for (const key of Object.keys(prevParty)) {
            const h = prevParty[key]!;
            updated[key] = { ...h, hp: Math.min(h.maxHp, h.hp + 150) };
          }
          return updated;
        });
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
        onUpdateParty((prevParty) => {
          const updated: Record<string, HeroProfile> = {};
          for (const key of Object.keys(prevParty)) {
            const h = prevParty[key]!;
            updated[key] = { ...h, ap: h.maxAp };
          }
          return updated;
        });
      }
    }

    if (item.id === 'heritage_songbook' && onAddXP) {
      onAddXP(300);
    }

    setPurchasedNotification(`✅ ACQUIRED: ${item.name}!`);
    setTimeout(() => setPurchasedNotification(null), 3500);
  };

  const filteredItems = items.filter(item => activeCategory === 'All' || item.category === activeCategory);
  const activePreviewItem = items.find(i => i.id === previewItemId);

  const categories = [
    { id: 'All', icon: <Package size={16} /> },
    { id: 'Tonic', icon: <Beaker size={16} /> },
    { id: 'Upgrade', icon: <Sparkles size={16} /> },
    { id: 'Gear', icon: <Shield size={16} /> },
    { id: 'Special', icon: <Zap size={16} /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden flex text-white animate-in fade-in duration-300">
      
      {/* ─── LEFT SIDEBAR NAVIGATION ─── */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-[#151828] border-r-[3px] border-[#0f0c0c] z-20 relative">
        <div className="p-6 border-b-[3px] border-[#0f0c0c] bg-[#1e2238]">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#da2d46] text-white border-[2px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6">
              <ShoppingBag className="w-5 h-5 skew-x-6" />
            </span>
            <div>
              <h1 className="font-orbitron font-black text-xl leading-tight uppercase drop-shadow-[2px_2px_0px_#0f0c0c]">
                MARIA'S
              </h1>
              <span className="font-space-mono font-bold text-[10px] text-[#facc15] tracking-widest uppercase">
                Fine Goods
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-2 bg-[#151828]">
          <span className="font-orbitron font-bold text-xs text-slate-500 uppercase tracking-widest mb-2 px-2">
            Categories
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex items-center gap-3 px-4 py-3 font-orbitron font-black text-sm uppercase transition-all -skew-x-3 border-[2px] ${
                activeCategory === cat.id
                  ? 'bg-[#facc15] text-[#0f0c0c] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] translate-x-2'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-[#1e2238] hover:text-white'
              }`}
            >
              <span className="skew-x-3">{cat.icon}</span>
              <span className="skew-x-3">{cat.id}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t-[3px] border-[#0f0c0c] bg-[#151828]">
          <div className="bg-[#1e2238] p-3 border-[2px] border-[#0f0c0c] -skew-x-3">
            <span className="block font-space-mono font-bold text-[10px] text-slate-400 skew-x-3 uppercase mb-1">
              Town of Cadence
            </span>
            <span className="block font-orbitron font-black text-xs text-[#38bdf8] skew-x-3 uppercase">
              Visayas Arc
            </span>
          </div>
        </div>
      </aside>

      {/* ─── MAIN DASHBOARD CONTENT ─── */}
      <div className="flex-1 flex flex-col relative overflow-hidden z-10 bg-[#0f0c0c]">
        
        {/* ─── UNIFIED DARK BACKGROUND WITH DOTS ─── */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#151828]">
          <div 
            className="absolute inset-0 opacity-20" 
            style={{ 
              backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', 
              backgroundSize: '24px 24px' 
            }} 
          />
        </div>

        {/* Top Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 relative z-20 border-b-[3px] border-[#0f0c0c] bg-[#1e2238]/90 backdrop-blur-md">
          
          <div className="lg:hidden flex items-center gap-3">
            <span className="p-2 bg-[#da2d46] text-white border-[2px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6">
              <ShoppingBag className="w-5 h-5 skew-x-6" />
            </span>
            <h1 className="font-orbitron font-black text-xl uppercase drop-shadow-[2px_2px_0px_#0f0c0c]">MARIA'S</h1>
          </div>
          
          <div className="hidden lg:block flex-1" />

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3 bg-[#0f0c0c] border-[2px] border-slate-700 px-4 py-1.5 -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]">
              <span className="text-xl skew-x-6 animate-pulse drop-shadow-[0_0_8px_#facc15]">💎</span>
              <div className="skew-x-6 flex flex-col text-right">
                <span className="font-orbitron font-black text-sm text-[#facc15] leading-none">
                  {shards}
                </span>
                <span className="font-space-mono text-[9px] text-slate-400 font-bold uppercase mt-0.5 leading-none tracking-widest">
                  SHARDS
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 bg-[#da2d46] text-white border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] hover:bg-[#ff3b56] transition-all -skew-x-6 font-orbitron font-black text-xs uppercase active:translate-y-0.5 active:shadow-none"
            >
              <ArrowLeft className="w-4 h-4 skew-x-6" />
              <span className="skew-x-6 hidden sm:block">LEAVE SHOP</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 relative z-20">
          
          {purchasedNotification && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#4ade80] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] px-6 py-3 font-orbitron font-black text-sm flex items-center w-[90%] max-w-md justify-center gap-3 animate-in fade-in slide-in-from-top-4">
              <Sparkles className="w-5 h-5 animate-spin shrink-0" />
              <span className="text-center">{purchasedNotification}</span>
            </div>
          )}

          <div className="max-w-[1400px] mx-auto flex flex-col gap-6 sm:gap-8">
            
            {/* ─── DASHBOARD HERO BANNER ─── */}
            <div 
              onClick={handleNextDialogue}
              className="relative w-full h-[180px] sm:h-[240px] lg:h-[260px] cursor-pointer group mt-2 mb-2" 
            >
              <div className="absolute inset-0 bg-[#1e2238] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.4)] overflow-hidden">
                <img 
                  src={mariasShopBanner} 
                  alt="Shop Background" 
                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35] contrast-125 saturate-50 group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0f0c0c]/95 via-[#0f0c0c]/70 to-transparent" />
              </div>
              
              <div className="absolute inset-y-0 left-0 p-4 sm:p-8 flex flex-col justify-center w-[60%] sm:w-[65%] lg:w-2/3 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <span className="font-space-mono text-[9px] sm:text-[10px] bg-[#facc15] text-[#0f0c0c] px-2 py-0.5 font-black uppercase tracking-widest -skew-x-6">
                    SHOPKEEPER
                  </span>
                  <span className="font-orbitron font-black text-base sm:text-2xl text-white tracking-widest drop-shadow-[2px_2px_0px_#0f0c0c]">
                    MARIA
                  </span>
                </div>
                
                <p className="font-space-mono font-bold text-[10px] xs:text-xs sm:text-base text-slate-200 leading-tight sm:leading-relaxed italic drop-shadow-[2px_2px_0px_#000]">
                  "{MARIA_DIALOGUES[dialogueIndex]}"
                </p>

                <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-orbitron font-black text-[#38bdf8] uppercase tracking-widest">
                  <MessageCircle size={14} className="animate-pulse shrink-0" />
                  <span>CLICK TO TALK ({dialogueIndex + 1}/{MARIA_DIALOGUES.length})</span>
                </div>
              </div>

              <div className="absolute right-[-10px] sm:right-[5%] bottom-0 w-[140px] sm:w-[220px] lg:w-[260px] h-[115%] sm:h-[125%] z-20 pointer-events-none drop-shadow-[0px_4px_15px_rgba(0,0,0,0.8)] flex items-end">
                <img 
                  src={mariaSprite} 
                  alt="Maria Sprite" 
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:-translate-y-1 sm:group-hover:-translate-y-2" 
                />
              </div>
            </div>

            {/* ─── MOBILE CATEGORY FILTERS ─── */}
            <div className="lg:hidden bg-[#151828] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] p-2">
              <div className="flex overflow-x-auto gap-2 pb-0 hide-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 font-orbitron font-black text-[10px] sm:text-xs uppercase whitespace-nowrap border-[2px] transition-all shrink-0 ${
                      activeCategory === cat.id
                        ? 'bg-[#facc15] text-[#0f0c0c] border-[#0f0c0c]'
                        : 'bg-[#1e2238] text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {cat.icon}
                    {cat.id}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── ITEM GRID (FULL IMAGE COVER) ─── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-orbitron font-black text-base sm:text-lg text-white uppercase tracking-widest flex items-center gap-2 drop-shadow-[2px_2px_0px_#000]">
                  <Sparkles className="text-[#facc15]" />
                  {activeCategory === 'All' ? 'Hot Items' : `${activeCategory} Goods`}
                </h2>
                <span className="font-space-mono text-[10px] sm:text-xs text-slate-300 font-bold uppercase drop-shadow-[1px_1px_0px_#000]">
                  Showing {filteredItems.length} Items
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-7 pb-12">
                {filteredItems.map((item) => {
                  const isOutOfStock = item.stock === 0;
                  const canAfford = shards >= item.price;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setPreviewItemId(item.id)}
                      className={`flex flex-col bg-[#f8fafc] border-[3px] sm:border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] group transition-all duration-200 relative overflow-hidden cursor-pointer ${
                        isOutOfStock ? 'opacity-60 grayscale' : 'hover:-translate-y-1.5'
                      }`}
                    >
                      {/* Full-bleed Header Image */}
                      <div className="h-32 relative flex items-center justify-center border-b-[3px] sm:border-[4px] border-[#0f0c0c] bg-[#151828] overflow-hidden">
                        
                        <img 
                          src={item.icon} 
                          alt={item.name} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                        
                        <div className="absolute top-2 left-[-4px] flex gap-2 z-20">
                          <span className={`text-[10px] font-orbitron font-black px-3 py-1 uppercase tracking-widest border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] ${
                            item.category === 'Tonic' ? 'bg-[#4ade80] text-[#0f0c0c]' :
                            item.category === 'Upgrade' ? 'bg-[#a855f7] text-white' :
                            item.category === 'Gear' ? 'bg-[#38bdf8] text-[#0f0c0c]' :
                            'bg-[#facc15] text-[#0f0c0c]'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col bg-[#f8fafc]">
                        <h4 className="font-orbitron font-black text-sm sm:text-base text-[#0f0c0c] leading-tight mb-2 uppercase drop-shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">
                          {item.name}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-700 font-bold leading-relaxed mb-4 line-clamp-2">
                          {item.description}
                        </p>
                        
                        <div className="mt-auto bg-white p-3 border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] mb-4 relative -skew-x-2">
                          <div className="absolute -top-3 left-2 bg-[#facc15] px-1.5 border-[2px] border-[#0f0c0c]">
                            <span className="block font-orbitron font-black text-[9px] text-[#0f0c0c] uppercase">Effect</span>
                          </div>
                          <span className="block font-space-mono text-[10px] sm:text-xs text-[#0f0c0c] font-bold leading-tight line-clamp-2 pt-1 skew-x-2">
                            {item.effectText}
                          </span>
                        </div>

                        <div className="pt-3 flex items-center justify-between gap-3">
                          <div className="flex flex-col">
                            <span className="font-orbitron font-black text-lg sm:text-xl text-[#da2d46] drop-shadow-[1px_1px_0px_#0f0c0c]">
                              💎 {item.price}
                            </span>
                            {typeof item.stock === 'number' && (
                              <span className="text-[9px] font-space-mono text-slate-500 uppercase font-black tracking-widest mt-[-2px]">
                                Stock: {item.stock}
                              </span>
                            )}
                          </div>

                          <button
                            disabled={isOutOfStock || !canAfford}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuy(item);
                            }}
                            className={`px-4 py-2 font-orbitron font-black text-xs uppercase border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] transition-all -skew-x-6 active:translate-y-1 active:shadow-none ${
                              isOutOfStock
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : !canAfford
                                ? 'bg-[#da2d46] text-white cursor-not-allowed'
                                : 'bg-[#4ade80] text-[#0f0c0c] hover:bg-[#6bee9c]'
                            }`}
                          >
                            <span className="skew-x-6">{isOutOfStock ? 'SOLD OUT' : 'BUY NOW'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ─── FULL ITEM PREVIEW MODAL ─── */}
      {activePreviewItem && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f0c0c]/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewItemId(null)}
        >
          <div 
            className="w-full max-w-3xl bg-[#f8fafc] border-[4px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#0f0c0c] flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200 -skew-x-1"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewItemId(null)} 
              className="absolute -top-3 -right-3 z-30 w-10 h-10 flex items-center justify-center bg-[#da2d46] border-[3px] border-[#0f0c0c] text-white hover:bg-[#ff3b56] hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_#0f0c0c]"
            >
              <X size={20} className="font-black" />
            </button>

            {/* Modal Left Side: Full Image Cover */}
            <div className="w-full md:w-[40%] h-48 md:h-auto border-b-[4px] md:border-b-0 md:border-r-[4px] border-[#0f0c0c] relative flex items-center justify-center shrink-0 skew-x-1 overflow-hidden">
              <img 
                src={activePreviewItem.icon} 
                alt={activePreviewItem.name} 
                className="absolute inset-0 w-full h-full object-cover" 
              />
              
              <span className={`absolute bottom-4 left-4 text-xs font-orbitron font-black px-4 py-1.5 uppercase tracking-widest border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] z-20 ${
                activePreviewItem.category === 'Tonic' ? 'bg-[#4ade80] text-[#0f0c0c]' :
                activePreviewItem.category === 'Upgrade' ? 'bg-[#a855f7] text-white' :
                activePreviewItem.category === 'Gear' ? 'bg-[#38bdf8] text-[#0f0c0c]' :
                'bg-[#facc15] text-[#0f0c0c]'
              }`}>
                {activePreviewItem.category}
              </span>
            </div>

            <div className="w-full md:w-[60%] p-6 md:p-8 flex flex-col bg-[#f8fafc] skew-x-1">
              <h3 className="font-orbitron font-black text-xl sm:text-2xl md:text-3xl text-[#0f0c0c] uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)] mb-4 leading-tight">
                {activePreviewItem.name}
              </h3>
              
              <p className="font-space-mono text-sm sm:text-base text-slate-700 font-bold leading-relaxed mb-6">
                {activePreviewItem.description}
              </p>

              <div className="bg-white p-4 md:p-5 border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] mb-8 relative -skew-x-2">
                <div className="absolute -top-3 left-4 bg-[#facc15] px-2.5 border-[2px] border-[#0f0c0c]">
                  <span className="block font-orbitron font-black text-[10px] sm:text-xs text-[#0f0c0c] uppercase tracking-widest">Effect / Benefit</span>
                </div>
                <span className="block font-space-mono text-sm sm:text-base text-[#0f0c0c] font-black leading-snug pt-2 skew-x-2">
                  {activePreviewItem.effectText}
                </span>
              </div>

              <div className="mt-auto flex items-end justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-orbitron font-black text-3xl sm:text-4xl text-[#da2d46] drop-shadow-[2px_2px_0px_#0f0c0c] leading-none">
                    💎 {activePreviewItem.price}
                  </span>
                  {typeof activePreviewItem.stock === 'number' && (
                    <span className="text-xs sm:text-sm font-space-mono text-slate-500 uppercase font-black tracking-widest mt-2">
                      In Stock: {activePreviewItem.stock}
                    </span>
                  )}
                </div>

                <button
                  disabled={activePreviewItem.stock === 0 || shards < activePreviewItem.price}
                  onClick={() => handleBuy(activePreviewItem)}
                  className={`px-6 sm:px-8 py-3 sm:py-4 font-orbitron font-black text-sm sm:text-base uppercase border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] transition-all -skew-x-6 active:translate-y-1 active:shadow-none ${
                    activePreviewItem.stock === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : shards < activePreviewItem.price
                      ? 'bg-[#da2d46] text-white cursor-not-allowed'
                      : 'bg-[#4ade80] text-[#0f0c0c] hover:bg-[#6bee9c]'
                  }`}
                >
                  <span className="skew-x-6">
                    {activePreviewItem.stock === 0 ? 'SOLD OUT' : 'BUY NOW'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}