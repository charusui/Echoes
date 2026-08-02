import { useState } from 'react';
import { X, Settings, Check } from 'lucide-react';
import { type HeroProfile, type HarmonydexEntry } from '../../types/expedition';

interface EquipmentModalProps {
  party: Record<string, HeroProfile>;
  dex: Record<string, HarmonydexEntry>;
  onEquip: (heroId: string, instrumentId: string) => void;
  onClose: () => void;
}

export function EquipmentModal({
  party,
  dex,
  onEquip,
  onClose,
}: EquipmentModalProps) {
  const heroList = Object.values(party);
  const [selectedHeroId, setSelectedHeroId] = useState<string>(heroList[0]?.id || 'gustave');
  const activeHero = party[selectedHeroId] || heroList[0]!;
  const capturedInstruments = Object.values(dex).filter(i => i.captured && !i.isEnemy);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0c0c]/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[10px_10px_0px_0px_#0f0c0c] max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden -skew-x-1 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-[#0f0c0c] text-white px-5 py-3 border-b-[4px] border-[#0f0c0c] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#4ade80]" />
            <h2 className="font-orbitron font-black text-lg sm:text-xl text-[#4ade80] tracking-wider uppercase">
              HERO EQUIPMENT &amp; ATTUNEMENT LOADOUT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-[#da2d46] text-white border-[2px] border-[#0f0c0c] hover:bg-[#ff3b56] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Selection Tabs */}
        <div className="bg-[#151828] px-5 py-3 border-b-[3px] border-[#0f0c0c] flex flex-wrap items-center gap-3">
          {heroList.map(hero => {
            const isSelected = selectedHeroId === hero.id;
            const inst = dex[hero.equippedId] || dex['cebuano_gitara']!;
            return (
              <button
                key={hero.id}
                onClick={() => setSelectedHeroId(hero.id)}
                className={`flex items-center gap-2 px-4 py-2 border-[3px] border-[#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 transition-all ${
                  isSelected ? 'bg-[#facc15] text-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] scale-105' : 'bg-[#2a2d43] text-white hover:bg-[#383d5a]'
                }`}
              >
                <img src={hero.avatar} alt={hero.name} className="w-6 h-6 object-cover" />
                <span>{hero.name}</span>
                <span className="px-1.5 py-0.5 bg-white text-[#facc15] text-[10px] skew-x-6 flex items-center justify-center overflow-hidden">
                  <img src={`/assets/instruments/${inst.id}.png?v=2`} alt={inst.name} className="w-5 h-5 object-contain scale-110 mix-blend-multiply" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Area: Hero Stats & Weapon Selector */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#1e2238]">
          {/* Left: Hero Stats & Bio */}
          <div className="w-full md:w-5/12 p-6 border-b md:border-b-0 md:border-r-[4px] border-[#0f0c0c] flex flex-col gap-4 bg-[#151828]">
            <div className="flex items-center gap-3">
              <div className="w-24 h-24 bg-[#0f0c0c] p-2 border-[3px] border-[#4ade80] shadow-[3px_3px_0px_0px_#4ade80] shrink-0">
                <img src={activeHero.avatar} alt={activeHero.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-orbitron font-black text-xl text-white tracking-wider">
                  {activeHero.name}
                </h3>
                <span className="text-xs text-[#38bdf8] font-orbitron font-bold uppercase">
                  {activeHero.role}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0f0c0c] p-3 border-[2px] border-[#0f0c0c]">
              {activeHero.bio}
            </p>

            {/* Base Stats */}
            <div className="flex flex-col gap-2">
              <span className="font-orbitron font-bold text-xs text-[#facc15] uppercase">
                ⚡ HERO COMBAT ATTRIBUTES
              </span>
              <div className="bg-[#1e2238] p-3 border-[2px] border-[#0f0c0c] grid grid-cols-2 gap-2 font-orbitron text-xs">
                <div className="flex justify-between border-b border-[#2a2d43] pb-1">
                  <span className="text-slate-400">MAX HP:</span>
                  <span className="text-[#4ade80] font-black">{activeHero.maxHp}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a2d43] pb-1">
                  <span className="text-slate-400">ACTION PTS:</span>
                  <span className="text-[#38bdf8] font-black">{activeHero.maxAp} AP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SHIELDING:</span>
                  <span className="text-white font-black">{activeHero.shield}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">EQUIPPED:</span>
                  <span className="text-[#facc15] font-black truncate max-w-[80px]">
                    {(dex[activeHero.equippedId] || dex['cebuano_gitara']!).name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Selectable Weapons List */}
          <div className="w-full md:w-7/12 p-6 flex flex-col gap-3 overflow-y-auto">
            <span className="font-orbitron font-black text-xs text-white uppercase tracking-wider">
              🎒 SELECT CAPTURED WEAPON TO EQUIP FOR {activeHero.name.toUpperCase()}
            </span>

            <div className="flex flex-col gap-3">
              {capturedInstruments.map(item => {
                const isEquipped = activeHero.equippedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onEquip(activeHero.id, item.id)}
                    className={`cursor-pointer p-3.5 border-[4px] border-[#0f0c0c] transition-all flex items-center justify-between -skew-x-2 ${
                      isEquipped 
                        ? 'bg-[#4ade80] text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c]' 
                        : 'bg-[#151828] text-white hover:bg-[#2a304e]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-white border border-[#0f0c0c] flex items-center justify-center w-14 h-14 overflow-hidden shadow-[inset_0_0_8px_rgba(0,0,0,0.2)] p-1">
                        <img src={`/assets/instruments/${item.id}.png?v=2`} alt={item.name} className="w-full h-full object-contain scale-110 mix-blend-multiply" />
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-orbitron font-black text-sm">{item.name}</span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-orbitron font-black uppercase border border-[#0f0c0c] ${
                            isEquipped ? 'bg-[#0f0c0c] text-white' : 'bg-[#da2d46] text-white'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-2xs opacity-90 font-bold">
                          DMG: {item.baseDmg} | SKILL: {item.skillName} ({item.skillCost} AP)
                        </span>
                      </div>
                    </div>

                    {isEquipped ? (
                      <div className="flex items-center gap-1 bg-[#0f0c0c] text-[#4ade80] px-3 py-1 font-orbitron font-black text-xs uppercase -skew-x-6 border border-[#0f0c0c]">
                        <Check className="w-4 h-4" />
                        <span>EQUIPPED</span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-[#2a2d43] text-[#38bdf8] font-orbitron font-bold text-xs uppercase -skew-x-6 border border-[#0f0c0c] hover:bg-[#38bdf8] hover:text-[#0f0c0c] transition-colors">
                        EQUIP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0f0c0c] px-5 py-3 border-t-[4px] border-[#0f0c0c] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#4ade80] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#ffffff] font-orbitron font-black text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all active:translate-y-0.5 active:shadow-none"
          >
            CONFIRM LOADOUT
          </button>
        </div>
      </div>
    </div>
  );
}
