import React, { useState } from 'react';
import { ShoppingBag, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react';
import mariasShopBanner from '../../assets/images/market_bg.png';
import mariaSprite from '../../assets/png/maria_sprite.png';
import { audioEngine } from '../../services/audioSynth';
import { type HeroProfile } from '../../types/expedition';

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
    icon: '🧪',
    description: 'Freshly brewed herbal concoction infused with mountain ginger and honey.',
    effectText: 'Heals all Party Members by 150 HP & clears Dissonance fatigue.',
    stock: 'Infinite',
  },
  {
    id: 'acoustic_rosin',
    name: 'Polished Acoustic Rosin',
    category: 'Upgrade',
    price: 65,
    icon: '✨',
    description: 'Premium resin block harvested from centuries-old pine trees in the highlands.',
    effectText: 'Permanently increases all Party Members max AP capacity (+1 AP).',
    stock: 1,
  },
  {
    id: 'tnalak_weave',
    name: "T'nalak Harmonic Weave",
    category: 'Gear',
    price: 50,
    icon: '🧣',
    description: 'Sacred handwoven abaca textile imbued with dream-weaver protective wards.',
    effectText: 'Grants +80 Shield and +50 Max HP to Vanguard Conductor Gustave.',
    stock: 1,
  },
  {
    id: 'cadence_fork',
    name: 'Cadence Tuning Fork',
    category: 'Special',
    price: 45,
    icon: '🎶',
    description: 'Resonates at precisely 432Hz. Calibrates local sonic waves to absolute harmony.',
    effectText: 'Full AP Restoration & grants +25% Stagger buildup on next boss encounter.',
    stock: 'Infinite',
  },
  {
    id: 'solar_spice',
    name: "Maria's Solar Spice Pack",
    category: 'Special',
    price: 40,
    icon: '🌶️',
    description: 'A fiery blend of sun-dried chilis and golden turmeric from Maria’s personal garden.',
    effectText: 'Grants +40 Overdrive to your entire party for explosive starting combos.',
    stock: 'Infinite',
  },
  {
    id: 'heritage_songbook',
    name: 'Visayan Heritage Songbook',
    category: 'Upgrade',
    price: 80,
    icon: '📜',
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
  const [shards, setShards] = useState<number>(250); // Starting Harmonic Shards / Gold
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(INITIAL_SHOP_ITEMS[0] || null);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const [purchasedNotification, setPurchasedNotification] = useState<string | null>(null);

  const handleNextDialogue = () => {
    setDialogueIndex((prev) => (prev + 1) % MARIA_DIALOGUES.length);
  };

  const handleBuy = (item: ShopItem) => {
    if (shards < item.price) {
      setPurchasedNotification("❌ Not enough Harmonic Shards!");
      audioEngine.playHitSFX('miss');
      setTimeout(() => setPurchasedNotification(null), 2500);
      return;
    }

    if (item.stock === 0) {
      setPurchasedNotification("❌ Out of stock!");
      return;
    }

    // Deduct currency
    setShards((prev) => prev - item.price);

    // Reduce stock if finite
    if (typeof item.stock === 'number') {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, stock: (i.stock as number) - 1 } : i))
      );
      if (item.stock - 1 === 0 && selectedItem?.id === item.id) {
        setSelectedItem((prev) => (prev ? { ...prev, stock: 0 } : null));
      }
    }

    // Play happy purchase tone
    audioEngine.playHitSFX('perfect');

    // Apply item effect to party or progress
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

    setPurchasedNotification(`✅ PURCHASED: ${item.name}! (${item.effectText})`);
    setTimeout(() => setPurchasedNotification(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden flex flex-col justify-between select-none animate-in fade-in duration-300 bg-[#0f0c0c]">
      
      {/* ─── EXACT 1920x1080 BACKGROUND IMAGE (FULL SCREEN / ZERO BLACK BARS / ZERO CROPPING) ─── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={mariasShopBanner}
          alt="Maria's Fine Goods Full Screen Market"
          width={1920}
          height={1080}
          className="w-full h-full object-fill pointer-events-none select-none"
        />
        {/* Subtle gradient overlays ensuring UI elements pop while keeping full screen art clearly visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c0c]/95 via-[#0f0c0c]/30 to-[#0f0c0c]/80" />
        <div className="absolute inset-y-0 right-0 w-full lg:w-7/12 bg-gradient-to-l from-[#0f0c0c]/95 via-[#0f0c0c]/60 to-transparent" />
      </div>

      {/* ─── STANDING NPC CHARACTER SPRITE (MASSIVE & PROMINENT) ─── */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[-10px] sm:bottom-[-20px] lg:bottom-[-30px] h-[86vh] sm:h-[96vh] lg:h-[102vh] pointer-events-none z-1 flex items-end justify-center">
        <img
          src={mariaSprite}
          alt="Shopkeeper Maria and Cat"
          className="h-full w-auto object-contain object-bottom filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.95)] animate-in fade-in zoom-in-95 duration-500 scale-110 sm:scale-115 lg:scale-125 origin-bottom"
        />
      </div>

      {/* ─── TOP HUD BAR ─── */}
      <header className="relative z-10 w-full px-4 sm:px-12 md:px-20 lg:px-28 xl:px-40 py-3.5 flex items-center justify-between gap-4 border-b-[4px] border-[#0f0c0c] bg-[#1e2238]/90 backdrop-blur-md shadow-[0px_4px_0px_0px_#0f0c0c]">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-[#facc15] text-[#0f0c0c] border-[3px] border-[#0f0c0c] -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] font-black flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 skew-x-6" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-orbitron font-black text-lg sm:text-2xl text-white uppercase tracking-wider drop-shadow-[2px_2px_0px_#0f0c0c]">
                MARIA'S FINE GOODS
              </h1>
              <span className="text-2xs sm:text-xs px-2 py-0.5 bg-[#da2d46] text-white -skew-x-6 border-[2px] border-[#0f0c0c] font-space-mono font-black shadow-[2px_2px_0px_0px_#0f0c0c]">
                TOWN OF CADENCE MARKET
              </span>
            </div>
            <p className="text-2xs sm:text-xs text-slate-300 font-medium tracking-wide">
              Visayan Artisan Emporium • Tonics, Wards, & Acoustic Tuning Supplies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Wallet Balance */}
          <div className="bg-[#0f0c0c] border-[3px] border-[#facc15] px-3.5 py-1.5 shadow-[3px_3px_0px_0px_#facc15] -skew-x-6 flex items-center gap-2.5">
            <span className="text-lg sm:text-xl skew-x-6 animate-pulse">💎</span>
            <div className="skew-x-6 text-right">
              <span className="font-orbitron font-black text-sm sm:text-base text-[#facc15] block leading-none">
                {shards}
              </span>
              <span className="font-space-mono text-[8px] sm:text-2xs text-slate-300 uppercase font-bold block leading-none mt-0.5">
                HARMONIC SHARDS
              </span>
            </div>
          </div>

          {/* Leave Shop Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-[#da2d46] text-white border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] hover:bg-[#ff3b56] transition-all -skew-x-6 font-orbitron font-black text-xs sm:text-sm uppercase active:translate-y-0.5 active:shadow-none"
            title="Return to Overworld Map"
          >
            <ArrowLeft className="w-4 h-4 skew-x-6" />
            <span className="skew-x-6">LEAVE SHOP</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT: ITEM CATALOG (LEFT) + NPC DIALOGUE (RIGHT) ─── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between px-4 sm:px-12 md:px-20 lg:px-28 xl:px-40 py-6 gap-6 overflow-hidden max-w-[1780px] mx-auto w-full">
        
        {/* Left Side: Floating Transparent Shelf with Compact Items */}
        <div className="w-full lg:w-[410px] xl:w-[440px] bg-[#0f0c0c]/45 backdrop-blur-md border-[2px] border-white/20 shadow-[0px_8px_32px_rgba(0,0,0,0.75)] p-3 sm:p-4 flex flex-col max-h-[66vh] sm:max-h-[72vh] shrink-0">
          
          <div className="flex items-center justify-between border-b-[2px] border-white/15 pb-2 mb-2.5 shrink-0">
            <h3 className="font-orbitron font-black text-xs uppercase tracking-wider text-[#facc15] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#facc15]" />
              AVAILABLE GOODS & SUPPLIES
            </h3>
            <span className="font-space-mono text-[10px] text-slate-300 font-bold uppercase bg-[#0f0c0c]/80 px-2 py-0.5 border border-white/20">
              {items.length} ITEMS
            </span>
          </div>

          {/* Scrollable Compact Item Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1 custom-scrollbar">
            {items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isOutOfStock = item.stock === 0;
              const canAfford = shards >= item.price;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`border-[1.5px] p-2.5 transition-all cursor-pointer relative flex flex-col justify-between rounded-sm ${
                    isSelected
                      ? 'bg-[#facc15]/20 border-[#facc15] shadow-[2px_2px_0px_0px_#facc15] -translate-y-0.5'
                      : 'bg-[#0f0c0c]/45 border-white/15 hover:border-white/40 hover:bg-[#0f0c0c]/65'
                  } ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
                >
                  <div>
                    {/* Top item bar */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 bg-[#0f0c0c]/80 border border-white/20 flex items-center justify-center text-lg shrink-0 shadow-sm">
                          {item.icon}
                        </span>
                        <div>
                          <span className={`text-[8px] font-orbitron font-bold px-1.5 py-0.5 uppercase border border-white/20 block w-max ${
                            item.category === 'Tonic' ? 'bg-[#4ade80] text-[#0f0c0c]' :
                            item.category === 'Upgrade' ? 'bg-[#a855f7] text-white' :
                            item.category === 'Gear' ? 'bg-[#38bdf8] text-[#0f0c0c]' :
                            'bg-[#f97316] text-white'
                          }`}>
                            {item.category}
                          </span>
                          <h4 className="font-orbitron font-black text-2xs sm:text-xs text-white leading-tight mt-1">
                            {item.name}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-200 leading-snug mb-2 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Bottom Price & Action Row */}
                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1 font-orbitron font-black text-xs text-[#facc15]">
                      <span>💎 {item.price}</span>
                      {typeof item.stock === 'number' && (
                        <span className="text-[9px] font-space-mono text-slate-300 ml-0.5">
                          ({item.stock} left)
                        </span>
                      )}
                    </div>

                    <button
                      disabled={isOutOfStock || !canAfford}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        handleBuy(item);
                      }}
                      className={`px-2.5 py-1 font-orbitron font-black text-[9px] uppercase border border-white/20 transition-all shadow-sm active:translate-y-0.5 ${
                        isOutOfStock
                          ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed'
                          : !canAfford
                          ? 'bg-[#da2d46]/40 text-red-200 cursor-not-allowed border-red-400/50'
                          : 'bg-[#facc15] text-[#0f0c0c] hover:bg-[#ffdf3d]'
                      }`}
                    >
                      {isOutOfStock ? 'SOLD OUT' : !canAfford ? 'NEED SHARDS' : 'BUY NOW'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Item Detail Banner */}
          {selectedItem && (
            <div className="bg-[#0f0c0c]/60 backdrop-blur-md border-[1.5px] border-[#4ade80]/60 p-2.5 mt-2.5 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#0f0c0c] border border-[#4ade80] flex items-center justify-center text-xl shrink-0 shadow-sm">
                  {selectedItem.icon}
                </div>
                <div>
                  <span className="font-orbitron font-bold text-[9px] text-[#4ade80] uppercase tracking-wider block">
                    ⚡ BENEFIT / EFFECT
                  </span>
                  <p className="text-2xs sm:text-xs text-white font-bold leading-snug">
                    {selectedItem.effectText}
                  </p>
                </div>
              </div>

              <button
                disabled={selectedItem.stock === 0 || shards < selectedItem.price}
                onClick={() => handleBuy(selectedItem)}
                className={`w-full sm:w-auto px-4 py-1.5 font-orbitron font-black text-2xs uppercase border-[1.5px] border-white/20 transition-all shrink-0 active:translate-y-0.5 ${
                  selectedItem.stock === 0
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : shards < selectedItem.price
                    ? 'bg-[#da2d46]/80 text-white cursor-not-allowed'
                    : 'bg-[#4ade80] text-[#0f0c0c] hover:bg-[#6bee9c]'
                }`}
              >
                {selectedItem.stock === 0 ? 'OUT OF STOCK' : shards < selectedItem.price ? 'NOT ENOUGH SHARDS' : `BUY FOR 💎 ${selectedItem.price}`}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Visual Novel / RPG Shopkeeper Dialogue & Notification right next to Maria */}
        <div className="w-full lg:w-[400px] xl:w-[430px] flex flex-col gap-2.5 shrink-0">
          
          {/* Notification Toast if active */}
          {purchasedNotification && (
            <div className="bg-[#4ade80] text-[#0f0c0c] border-[2px] border-white/20 shadow-md p-3 font-orbitron font-black text-xs animate-in zoom-in-95 duration-150 flex items-center gap-2">
              <Sparkles className="w-5 h-5 shrink-0 animate-spin" />
              <span>{purchasedNotification}</span>
            </div>
          )}

          {/* Transparent Glassmorphism Maria NPC Speech Box */}
          <div 
            onClick={handleNextDialogue}
            className="bg-[#0f0c0c]/55 backdrop-blur-md border-[2px] border-white/20 shadow-[0px_8px_32px_rgba(0,0,0,0.8)] p-3.5 sm:p-4 flex gap-3 items-start cursor-pointer hover:bg-[#0f0c0c]/70 transition-all group"
            title="Click to talk with Maria"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#0f0c0c] border-[2px] border-[#facc15] shadow-sm shrink-0 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src={mariaSprite} alt="Maria Portrait" className="w-full h-full object-cover object-top scale-150 translate-y-2" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-1 mb-1.5">
                <div>
                  <span className="font-orbitron font-black text-xs sm:text-sm text-[#facc15] tracking-wider block">
                    SHOPKEEPER MARIA
                  </span>
                  <span className="text-[8px] font-space-mono text-slate-300 font-bold uppercase block">
                    CADENCE TOWN ARTISAN MERCHANT
                  </span>
                </div>
                <span className="text-[9px] font-space-mono bg-[#38bdf8] text-[#0f0c0c] px-1.5 py-0.5 border border-white/20 font-black uppercase flex items-center gap-1">
                  <MessageCircle size={10} />
                  <span>TALK</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-white font-semibold leading-relaxed italic">
                "{MARIA_DIALOGUES[dialogueIndex]}"
              </p>

              <div className="mt-2 flex items-center justify-between text-[9px] font-orbitron font-bold text-[#facc15] uppercase tracking-wider">
                <span>▶ CLICK FOR NEXT TIP ({dialogueIndex + 1}/{MARIA_DIALOGUES.length})</span>
                <span className="text-slate-300">VISAYAS ARC</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e2238; border: 1px solid #0f0c0c; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #facc15; border: 1px solid #0f0c0c; }
      `}</style>
    </div>
  );
}
