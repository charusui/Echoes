import React from 'react';
import { X, Package, Heart, Zap, Sparkles } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';

interface ItemMenuOverlayProps {
  inventory: Record<string, number>;
  onClose: () => void;
  onUseItem: (itemId: string) => void;
}

const ITEMS_DB: Record<string, { name: string, desc: string, icon: React.ReactNode, type: 'heal' | 'ap' | 'buff' }> = {
  'turmeric_tonic': { name: 'Visayan Turmeric Tonic', desc: 'Heals all Party Members by 150 HP.', icon: <Heart size={16} className="text-red-400" />, type: 'heal' },
  'cadence_fork': { name: 'Cadence Tuning Fork', desc: 'Full AP Restoration.', icon: <Zap size={16} className="text-yellow-400" />, type: 'ap' },
  'solar_spice': { name: "Maria's Solar Spice Pack", desc: 'Grants Overdrive to your party.', icon: <Sparkles size={16} className="text-orange-400" />, type: 'buff' },
  'reverse_potion': { name: 'Reverse Potion', desc: 'Fully restores HP and AP.', icon: <Heart size={16} className="text-pink-400" />, type: 'heal' },
};

export function ItemMenuOverlay({ inventory, onClose, onUseItem }: ItemMenuOverlayProps) {
  const availableItems = Object.entries(inventory).filter(([id, count]) => count > 0 && ITEMS_DB[id]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-8 animate-fadeIn" style={{ backgroundColor: 'rgba(15, 12, 12, 0.85)' }}>
      <div className="bg-[#1f2335] border-[4px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] w-full max-w-2xl flex flex-col max-h-full">
        
        {/* Header */}
        <div className="bg-[#0f0c0c] p-3 sm:p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Package size={20} className="text-[#38bdf8] sm:w-6 sm:h-6" />
            <h2 className="text-white font-orbitron font-black text-sm sm:text-xl uppercase tracking-wider">
              INVENTORY
            </h2>
          </div>
          <button 
            onClick={() => {
              audioEngine.playHitSFX('miss');
              onClose();
            }}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Item List */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {availableItems.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-white/50 space-y-2">
              <Package size={32} className="opacity-50" />
              <p className="font-orbitron font-bold text-sm">Your inventory is empty.</p>
              <p className="text-xs">Visit Maria's Shop to stock up.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {availableItems.map(([id, count]) => {
                const item = ITEMS_DB[id];
                return (
                  <div key={id} className="bg-[#2a2d43] border-[2px] border-[#0f0c0c] p-3 flex flex-col justify-between hover:bg-[#383d5a] transition-colors group">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <h3 className="text-white font-bold text-xs sm:text-sm font-orbitron truncate">{item.name}</h3>
                        </div>
                        <span className="text-[#38bdf8] font-black text-xs">x{count}</span>
                      </div>
                      <p className="text-white/70 text-2xs sm:text-xs leading-relaxed mb-4">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        audioEngine.playHitSFX('perfect');
                        onUseItem(id);
                        onClose();
                      }}
                      className="w-full py-2 bg-[#38bdf8] text-[#0f0c0c] border-[2px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] font-orbitron font-black text-xs uppercase -skew-x-6 hover:bg-white active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      Use Item
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
