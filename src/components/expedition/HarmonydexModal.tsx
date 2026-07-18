import { useState } from 'react';
import { X, BookOpen, Volume2 } from 'lucide-react';
import { type HarmonydexEntry } from '../../types/expedition';
import { audioEngine } from '../../services/audioSynth';

interface HarmonydexModalProps {
  dex: Record<string, HarmonydexEntry>;
  onClose: () => void;
}

export function HarmonydexModal({ dex, onClose }: HarmonydexModalProps) {
  const entries = Object.values(dex);
  const [selectedId, setSelectedId] = useState<string>(entries[0]?.id || 'solaris_strat');
  const [filterType, setFilterType] = useState<string>('all');

  const selected = dex[selectedId] || entries[0]!;

  const filteredEntries = entries.filter(e => {
    if (filterType === 'all') return true;
    if (filterType === 'captured') return e.captured;
    return e.type === filterType;
  });

  const handlePreviewAudio = (_preset: string) => {
    // Play preview tone
    audioEngine.playHitSFX('sick');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0c0c]/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[10px_10px_0px_0px_#0f0c0c] max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden -skew-x-1 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-[#0f0c0c] text-white px-5 py-3 border-b-[4px] border-[#0f0c0c] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#facc15]" />
            <h2 className="font-orbitron font-black text-lg sm:text-xl text-[#facc15] tracking-wider uppercase">
              🎼 HARMONYDEX ENCYCLOPEDIA
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#38bdf8] text-[#0f0c0c] font-orbitron font-bold text-xs -skew-x-6">
              CAPTURED: {entries.filter(e => e.captured).length}/{entries.length}
            </span>
            <button
              onClick={onClose}
              className="p-1 bg-[#da2d46] text-white border-[2px] border-[#0f0c0c] hover:bg-[#ff3b56] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="bg-[#151828] px-5 py-2.5 border-b-[3px] border-[#0f0c0c] flex flex-wrap items-center gap-2">
          {['all', 'captured', 'string', 'percussion', 'brass', 'synth', 'woodwind'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1 border-[2px] border-[#0f0c0c] font-orbitron font-bold text-2xs sm:text-xs uppercase -skew-x-6 transition-all ${
                filterType === tab ? 'bg-[#facc15] text-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]' : 'bg-[#2a2d43] text-white hover:bg-[#383d5a]'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Main Content Grid: Left List, Right Detail */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Instrument Grid */}
          <div className="w-full md:w-1/2 p-4 overflow-y-auto border-b md:border-b-0 md:border-r-[4px] border-[#0f0c0c] grid grid-cols-2 gap-3 bg-[#151828]">
            {filteredEntries.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`cursor-pointer p-3 border-[3px] border-[#0f0c0c] transition-all flex flex-col gap-1.5 -skew-x-2 ${
                  selectedId === item.id 
                    ? 'bg-[#facc15] text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] scale-102' 
                    : item.captured ? 'bg-[#1e2238] text-white hover:bg-[#2a304e]' : 'bg-[#0f0c0c] text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{item.captured ? item.icon : '❓'}</span>
                  <span className={`px-1.5 py-0.5 text-[9px] font-orbitron font-black uppercase border border-[#0f0c0c] ${
                    selectedId === item.id ? 'bg-[#0f0c0c] text-white' : 'bg-[#da2d46] text-white'
                  }`}>
                    {item.type}
                  </span>
                </div>
                <span className="font-orbitron font-black text-xs truncate">
                  {item.captured ? item.name : 'Unknown Anomaly'}
                </span>
              </div>
            ))}
          </div>

          {/* Right: Selected Instrument Details Panel */}
          <div className="w-full md:w-1/2 p-6 flex flex-col gap-4 overflow-y-auto bg-[#1e2238]">
            {selected ? (
              <>
                <div className="flex items-center justify-between border-b-[3px] border-[#0f0c0c] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl bg-[#0f0c0c] p-3 border-[3px] border-[#facc15] shadow-[3px_3px_0px_0px_#facc15]">
                      {selected.captured ? selected.icon : '❓'}
                    </div>
                    <div>
                      <h3 className="font-orbitron font-black text-xl text-white tracking-wider">
                        {selected.captured ? selected.name : 'UNSEALED ANOMALY'}
                      </h3>
                      <span className="px-2 py-0.5 bg-[#da2d46] text-white font-orbitron font-bold text-2xs uppercase border border-[#0f0c0c]">
                        TYPE: {selected.type.toUpperCase()} | DMG: {selected.baseDmg}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-orbitron font-bold text-xs text-[#facc15] uppercase tracking-wider">
                    📜 ARCHIVAL &amp; HARMONIC LORE
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed bg-[#0f0c0c] p-3 border-[2px] border-[#0f0c0c]">
                    {selected.captured ? selected.lore : 'Defeat and lower this anomaly below 35% HP in Turn-Based Combat, then perform Harmonic Attunement to seal and unlock its archival lore!'}
                  </p>
                </div>

                {selected.captured && (
                  <>
                    <div className="flex flex-col gap-2">
                      <span className="font-orbitron font-bold text-xs text-[#38bdf8] uppercase tracking-wider">
                        ⚡ EQUIPPED SKILL ({selected.skillName})
                      </span>
                      <div className="bg-[#151828] p-3 border-[2px] border-[#0f0c0c] flex flex-col gap-1">
                        <span className="text-xs text-white font-bold">{selected.skillDesc}</span>
                        <span className="text-2xs text-[#facc15] font-orbitron">ACTION COST: {selected.skillCost} AP</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePreviewAudio(selected.audioPreset)}
                      className="w-full py-2.5 bg-[#4ade80] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>PREVIEW ACOUSTIC RESONANCE</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="text-center text-slate-400 font-orbitron font-bold my-auto">
                SELECT AN INSTRUMENT FROM THE LEFT ARCHIVE TO VIEW DETAILS
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0f0c0c] px-5 py-3 border-t-[4px] border-[#0f0c0c] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#facc15] text-[#0f0c0c] border-[3px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#ffffff] font-orbitron font-black text-sm uppercase -skew-x-6 hover:bg-[#ffdf3d] transition-all active:translate-y-0.5 active:shadow-none"
          >
            CLOSE ENCYCLOPEDIA
          </button>
        </div>
      </div>
    </div>
  );
}
