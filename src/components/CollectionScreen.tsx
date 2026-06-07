import React, { useState } from 'react';
import { ChevronLeft, Compass, Flame, Shield, BookOpen, Music, Tag, FileText, CheckCircle, HelpCircle } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';
import { MASTER_INSTRUMENTS } from '../constants';

interface CollectionScreenProps {
  onBack: () => void;
}

export function CollectionScreen({ onBack }: CollectionScreenProps) {
  const { progress } = useProgress();
  const [activeTab, setActiveTab] = useState<'Western Visayas' | 'Central Visayas' | 'Eastern Visayas'>('Western Visayas');
  const [selectedCustomProfile, setSelectedCustomProfile] = useState<any | null>(null);

  // Filter instruments for the active region
  const regionInstruments = MASTER_INSTRUMENTS.filter(inst => inst.region === activeTab);
  
  // Calculate stats
  const totalInstruments = MASTER_INSTRUMENTS.length;
  const unlockedList = progress.unlockedInstruments.map(u => u.toLowerCase());
  
  const totalUnlocked = MASTER_INSTRUMENTS.filter(inst => 
    unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase())
  ).length;

  const getRegionStats = (regionName: string) => {
    const total = MASTER_INSTRUMENTS.filter(inst => inst.region === regionName).length;
    const unlocked = MASTER_INSTRUMENTS.filter(inst => 
      inst.region === regionName && 
      (unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase()))
    ).length;
    return { unlocked, total };
  };

  const westStats = getRegionStats('Western Visayas');
  const centralStats = getRegionStats('Central Visayas');
  const eastStats = getRegionStats('Eastern Visayas');

  // Custom Profiles list
  const customProfileKeys = Object.keys(progress.customProfiles || {});
  const hasCustomProfiles = customProfileKeys.length > 0;

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative overflow-hidden pb-safe">
      {/* Visual background details */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-crimson/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-6 pt-12 pb-4 flex items-center justify-between border-b border-light-gray/10 bg-obsidian/60 backdrop-blur-md">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-dark-slate active:scale-95 rounded-xl border border-light-gray/10 transition-all text-light-gray"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-orbitron text-lg font-black tracking-widest text-light-gray uppercase">
          INSTRUMENT <span className="text-crimson glow-crimson">ARCHIVE</span>
        </h1>
        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-dark-slate border border-light-gray/10 text-pale-pink font-space-mono text-xs font-bold">
          {totalUnlocked}/{totalInstruments}
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="relative z-10 px-6 py-4 grid grid-cols-3 gap-2 bg-dark-slate/40 border-b border-light-gray/5">
        <button 
          onClick={() => setActiveTab('Western Visayas')}
          className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
            activeTab === 'Western Visayas' 
              ? 'border-crimson bg-crimson/10 shadow-[0_0_15px_rgba(218,45,70,0.15)] text-light-gray' 
              : 'border-light-gray/5 bg-obsidian/40 text-slate-gray'
          }`}
        >
          <span className="font-orbitron text-[9px] font-bold tracking-wider text-center uppercase">WESTERN</span>
          <span className="font-space-mono text-xs font-black text-pale-pink">{westStats.unlocked}/{westStats.total}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Central Visayas')}
          className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
            activeTab === 'Central Visayas' 
              ? 'border-crimson bg-crimson/10 shadow-[0_0_15px_rgba(218,45,70,0.15)] text-light-gray' 
              : 'border-light-gray/5 bg-obsidian/40 text-slate-gray'
          }`}
        >
          <span className="font-orbitron text-[9px] font-bold tracking-wider text-center uppercase">CENTRAL</span>
          <span className="font-space-mono text-xs font-black text-pale-pink">{centralStats.unlocked}/{centralStats.total}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Eastern Visayas')}
          className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
            activeTab === 'Eastern Visayas' 
              ? 'border-crimson bg-crimson/10 shadow-[0_0_15px_rgba(218,45,70,0.15)] text-light-gray' 
              : 'border-light-gray/5 bg-obsidian/40 text-slate-gray'
          }`}
        >
          <span className="font-orbitron text-[9px] font-bold tracking-wider text-center uppercase">EASTERN</span>
          <span className="font-space-mono text-xs font-black text-pale-pink">{eastStats.unlocked}/{eastStats.total}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar relative z-10">
        
        {/* Instruments Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-crimson" />
            <h2 className="font-orbitron text-xs font-bold tracking-widest text-slate-gray uppercase">
              {activeTab.toUpperCase()} INSTRUMENTS
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {regionInstruments.map(inst => {
              const isUnlocked = unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase());
              
              return (
                <div 
                  key={inst.id} 
                  className={`glass-card rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 relative group ${
                    isUnlocked 
                      ? 'border-pale-pink/20 bg-dark-slate/40 hover:border-crimson/50 hover:bg-dark-slate/60 shadow-lg' 
                      : 'border-light-gray/5 bg-obsidian/50 opacity-90'
                  }`}
                >
                  {/* Image Cell */}
                  <div className="aspect-square bg-obsidian flex items-center justify-center relative overflow-hidden p-3 border-b border-light-gray/5">
                    <img 
                      src={isUnlocked ? `/instruments/${inst.id}.png` : `/instruments/locked_${inst.id}.png`} 
                      alt={inst.name}
                      className={`w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 ${
                        isUnlocked ? 'mix-blend-screen' : 'opacity-40 mix-blend-screen'
                      }`}
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2 z-20">
                      {isUnlocked ? (
                        <span className="w-5 h-5 rounded-full bg-crimson border border-obsidian flex items-center justify-center text-obsidian shadow-md">
                          <CheckCircle size={12} className="text-obsidian fill-current" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-dark-slate border border-light-gray/10 flex items-center justify-center text-slate-gray shadow-md">
                          <HelpCircle size={12} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className={`font-orbitron text-sm font-black tracking-wide ${
                        isUnlocked ? 'text-light-gray' : 'text-slate-gray'
                      }`}>
                        {isUnlocked ? inst.name : '??????'}
                      </h3>
                      
                      {isUnlocked ? (
                        <p className="font-space-mono text-[9px] text-pale-pink/80 uppercase mt-0.5">
                          {inst.region}
                        </p>
                      ) : (
                        <p className="font-space-mono text-[9px] text-slate-gray/60 uppercase mt-0.5">
                          Visayan Instrument
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-light-gray/5">
                      {isUnlocked ? (
                        <p className="font-space-mono text-[9px] text-light-gray/80 line-clamp-3 leading-relaxed">
                          {inst.hint}
                        </p>
                      ) : (
                        <div>
                          <span className="block font-orbitron text-[8px] text-crimson font-bold uppercase tracking-wider mb-0.5">Teaser Hint:</span>
                          <p className="font-space-mono text-[9px] text-slate-gray leading-relaxed line-clamp-4 italic">
                            "{inst.hint}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Scanned Soundprints Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Music size={16} className="text-crimson" />
            <h2 className="font-orbitron text-xs font-bold tracking-widest text-slate-gray uppercase">
              MY SCANNED SOUNDPRINTS
            </h2>
          </div>

          {hasCustomProfiles ? (
            <div className="space-y-3">
              {customProfileKeys.map(key => {
                const profile = progress.customProfiles[key];
                const instName = profile.instrument?.name || key;
                const HS = profile.instrument?.hornbostelSachs || 'Unknown';
                const synthType = profile.acoustic?.synthesisType || 'Unknown';
                const category = profile.instrument?.category || 'Percussion';

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCustomProfile(profile)}
                    className="w-full glass-card p-4 rounded-2xl border border-pale-pink/15 bg-dark-slate/30 flex items-center justify-between text-left hover:border-crimson/40 hover:bg-dark-slate/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-obsidian border border-light-gray/10 flex items-center justify-center text-crimson group-hover:scale-105 transition-transform">
                        <Tag size={18} />
                      </div>
                      <div>
                        <h4 className="font-orbitron font-bold text-sm text-light-gray">{instName}</h4>
                        <p className="font-space-mono text-[10px] text-pale-pink uppercase tracking-widest">{category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-obsidian border border-light-gray/5 font-space-mono text-[9px] text-slate-gray uppercase">
                        {synthType}
                      </span>
                      <p className="font-space-mono text-[8px] text-slate-gray/50 mt-1">HS: {HS}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-6 rounded-2xl border border-light-gray/5 bg-dark-slate/10 text-center">
              <span className="inline-block p-3 rounded-full bg-dark-slate/40 text-slate-gray mb-2">
                <FileText size={20} />
              </span>
              <p className="font-space-mono text-xs text-slate-gray">
                No custom instrument scans recorded yet.
              </p>
              <p className="font-space-mono text-[10px] text-slate-gray/50 mt-1">
                Scan real-world instruments to synthesize profiles!
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Custom Profile Details Modal */}
      {selectedCustomProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-obsidian/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-dark-slate border-2 border-slate-gray rounded-3xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-light-gray/10 flex justify-between items-center bg-obsidian/40">
              <div>
                <h3 className="font-orbitron font-black text-xl text-light-gray">
                  {selectedCustomProfile.instrument?.name}
                </h3>
                <span className="font-space-mono text-[10px] text-pale-pink uppercase tracking-widest">
                  Custom Synthesis Specs
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomProfile(null)}
                className="px-3 py-1.5 rounded-lg border border-light-gray/10 bg-obsidian/40 font-space-mono text-xs text-slate-gray hover:text-light-gray transition-colors"
              >
                CLOSE
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Classification */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block font-orbitron text-[9px] text-slate-gray uppercase">LOCAL NAME</span>
                  <span className="font-space-mono text-xs text-light-gray">
                    {selectedCustomProfile.instrument?.localName || 'None'}
                  </span>
                </div>
                <div>
                  <span className="block font-orbitron text-[9px] text-slate-gray uppercase">REGION</span>
                  <span className="font-space-mono text-xs text-light-gray">
                    {selectedCustomProfile.instrument?.region || 'Visayas'}
                  </span>
                </div>
              </div>

              <div>
                <span className="block font-orbitron text-[9px] text-slate-gray uppercase">H.-SACHS CLASSIFICATION</span>
                <span className="font-space-mono text-xs text-pale-pink">
                  {selectedCustomProfile.instrument?.hornbostelSachs}
                </span>
              </div>

              <div>
                <span className="block font-orbitron text-[9px] text-slate-gray uppercase">CULTURAL PURPOSE</span>
                <p className="font-space-mono text-xs text-light-gray/90 leading-relaxed bg-obsidian/40 p-3 rounded-xl border border-light-gray/5">
                  {selectedCustomProfile.instrument?.culturalPurpose}
                </p>
              </div>

              {/* Acoustic Synthesizer Settings */}
              <div>
                <span className="block font-orbitron text-[10px] text-crimson font-black tracking-widest uppercase mb-2">
                  ACOUSTIC ENGINE SPECIFICATIONS
                </span>
                
                <div className="bg-obsidian/60 border border-light-gray/10 rounded-2xl p-4 space-y-3 font-space-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-gray">Synthesis Engine:</span>
                    <span className="text-pale-pink font-bold uppercase">{selectedCustomProfile.acoustic?.synthesisType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-gray">Fundamental Range:</span>
                    <span className="text-light-gray">
                      {selectedCustomProfile.acoustic?.fundamentalFreqMin}Hz - {selectedCustomProfile.acoustic?.fundamentalFreqMax}Hz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-gray">Attack / Decay:</span>
                    <span className="text-light-gray">
                      {selectedCustomProfile.acoustic?.attackTime}s / {selectedCustomProfile.acoustic?.decayTime}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-gray">Acoustic Timbre:</span>
                    <span className="text-light-gray italic">{selectedCustomProfile.acoustic?.timbre}</span>
                  </div>
                </div>
              </div>

              {/* Lane / Mapping */}
              {selectedCustomProfile.inputMapping && (
                <div>
                  <span className="block font-orbitron text-[10px] text-crimson font-black tracking-widest uppercase mb-2">
                    LANE MAPPING matrix ({selectedCustomProfile.inputMapping.laneCount} lanes)
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCustomProfile.inputMapping.lanes?.map((lane: any) => (
                      <div key={lane.id} className="bg-obsidian/40 border border-light-gray/5 rounded-xl p-2.5 flex items-center justify-between text-xs font-space-mono">
                        <span className="text-pale-pink font-bold">{lane.label}</span>
                        <span className="text-slate-gray text-[10px]">Key: <kbd className="px-1.5 py-0.5 bg-dark-slate rounded border border-light-gray/10 text-light-gray text-[9px]">{lane.keyBinding}</kbd></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Styled JSX for Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #da2d46;
          border-radius: 4px;
        }
      `}</style>

    </div>
  );
}
