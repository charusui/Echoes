import { useState } from 'react';
import { ChevronLeft, BookOpen, Music, Tag, FileText, CheckCircle, HelpCircle } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';
import { IMAGE_BASE, MASTER_INSTRUMENTS } from '../constants';

const SCANNING_LOCATIONS: Record<string, string[]> = {
  'tultugan': [
    'National Museum of Western Visayas (Iloilo City)',
    'Museo Iloilo (Iloilo City)',
    'Maasin Municipal Hall Heritage Display (Maasin, Iloilo)'
  ],
  'buktot': [
    'Jose R. Gullas Halad Museum (Cebu City)',
    'National Museum of Western Visayas (Iloilo City)',
    'University of San Carlos (USC) Museum Ethnographic Gallery (Cebu City)'
  ],
  'pasiyak': [
    'Jose R. Gullas Halad Museum (Cebu City)',
    'Museo Sugbo / Cebu Provincial Museum (Cebu City)',
    'UP Visayas Museum of Art and Cultural Heritage (UPV MACH, Iloilo City)'
  ],
  'tulali': [
    'National Museum of Western Visayas (Iloilo City)',
    'UP Visayas Museum of Art and Cultural Heritage (UPV MACH, Iloilo City)',
    'School of Living Traditions (SLT) Cultural Gallery (Calinog, Iloilo)'
  ],
  'tugo': [
    'Museo Iloilo (Iloilo City)',
    'National Museum of Western Visayas (Iloilo City)',
    'UP Visayas Museum of Art and Cultural Heritage (UPV MACH, Iloilo City)'
  ],
  'litguit': [
    'National Museum of Western Visayas (Iloilo City)',
    'UP Visayas Museum of Art and Cultural Heritage (UPV MACH, Iloilo City)',
    'Jose R. Gullas Halad Museum (Cebu City)'
  ],
  'cebuano gitara': [
    'Alegre Guitar Factory Showroom (Lapu-Lapu City, Cebu)',
    'Jose R. Gullas Halad Museum (Cebu City)',
    'University of San Carlos (USC) Museum (Cebu City)'
  ],
  'bandurria': [
    'Alegre Guitar Factory Showroom (Lapu-Lapu City, Cebu)',
    'Jose R. Gullas Halad Museum (Cebu City)',
    'University of San Carlos (USC) Museum (Cebu City)'
  ],
  'laud': [
    'Jose R. Gullas Halad Museum (Cebu City)',
    'University of San Carlos (USC) Museum (Cebu City)',
    'Alegre Guitar Factory Showroom (Lapu-Lapu City, Cebu)'
  ],
  'octavina': [
    'Jose R. Gullas Halad Museum (Cebu City)',
    'University of San Carlos (USC) Museum (Cebu City)',
    'Alegre Guitar Factory Showroom (Lapu-Lapu City, Cebu)'
  ],
  'bajo de uñas': [
    'Jose R. Gullas Halad Museum (Cebu City)',
    'University of San Carlos (USC) Museum (Cebu City)',
    'Alegre Guitar Factory Showroom (Lapu-Lapu City, Cebu)'
  ],
  'lantoy': [
    'Samar Archaeological Museum and Research Center (Calbayog City, Samar)',
    'People\'s Center and Library Heritage Displays (Tacloban City, Leyte)',
    'University of San Carlos (USC) Museum Ethnographic Gallery (Cebu City)'
  ],
  'subing': [
    'Samar Archaeological Museum and Research Center (Calbayog City, Samar)',
    'National Museum of Western Visayas (Iloilo City)',
    'Leyte Provincial Capitol Museum Displays (Tacloban City, Leyte)'
  ],
  'korlong': [
    'Samar Archaeological Museum and Research Center (Calbayog City, Samar)',
    'University of San Carlos (USC) Museum Ethnographic Gallery (Cebu City)',
    'National Museum of the Philippines Regional Exhibitions (when on rotation)'
  ]
};

interface CollectionScreenProps {
  onBack: () => void;
  onSelectInstrument: (name: string) => void;
  onSelectCustomProfile: (profile: any) => void;
}

export function CollectionScreen({ onBack, onSelectInstrument, onSelectCustomProfile }: CollectionScreenProps) {
  const { progress } = useProgress();
  const [activeTab, setActiveTab] = useState<'Western Visayas' | 'Central Visayas' | 'Eastern Visayas'>('Western Visayas');
  const [selectedHintInstrument, setSelectedHintInstrument] = useState<any | null>(null);
  const [activeDetail, setActiveDetail] = useState<{ type: 'master' | 'custom', data: any } | null>(null);

  const regionInstruments = MASTER_INSTRUMENTS.filter(inst => inst.region === activeTab);
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

  const customProfileKeys = Object.keys(progress.customProfiles || {});
  const hasCustomProfiles = customProfileKeys.length > 0;

  return (
    <div className="h-screen w-full bg-obsidian flex flex-col relative overflow-hidden pb-safe">
      {/* Visual background details */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-crimson/10 to-transparent pointer-events-none" />

      {/* Header - Added shrink-0 */}
      <div className="relative z-10 px-4 md:px-6 pt-12 pb-4 flex items-center justify-between border-b border-light-gray/10 bg-obsidian/60 backdrop-blur-md shrink-0">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-dark-slate active:scale-95 rounded-xl border border-light-gray/10 transition-all text-light-gray"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-orbitron text-base md:text-lg font-black tracking-widest text-light-gray uppercase">
          INSTRUMENT <span className="text-crimson glow-crimson">ARCHIVE</span>
        </h1>
        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-dark-slate border border-light-gray/10 text-pale-pink font-space-mono text-xs font-bold shrink-0">
          {totalUnlocked}/{totalInstruments}
        </div>
      </div>

      {/* Almanac Split-Pane Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Pane: Selection Grid & Lists */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Stats / Region Tabs - Added shrink-0 */}
          <div className="px-2 md:px-6 py-4 grid grid-cols-3 gap-2 bg-dark-slate/20 border-b border-light-gray/5 shrink-0">
            <button 
              onClick={() => setActiveTab('Western Visayas')}
              className={`p-2 md:p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                activeTab === 'Western Visayas' 
                  ? 'border-crimson bg-crimson/10 shadow-[0_0_15px_rgba(218,45,70,0.15)] text-light-gray' 
                  : 'border-light-gray/5 bg-obsidian/40 text-slate-gray'
              }`}
            >
              <span className="font-orbitron text-[8px] md:text-[9px] font-bold tracking-wider text-center uppercase">WESTERN</span>
              <span className="font-space-mono text-xs font-black text-pale-pink">{westStats.unlocked}/{westStats.total}</span>
            </button>
            <button 
              onClick={() => setActiveTab('Central Visayas')}
              className={`p-2 md:p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                activeTab === 'Central Visayas' 
                  ? 'border-crimson bg-crimson/10 shadow-[0_0_15px_rgba(218,45,70,0.15)] text-light-gray' 
                  : 'border-light-gray/5 bg-obsidian/40 text-slate-gray'
              }`}
            >
              <span className="font-orbitron text-[8px] md:text-[9px] font-bold tracking-wider text-center uppercase">CENTRAL</span>
              <span className="font-space-mono text-xs font-black text-pale-pink">{centralStats.unlocked}/{centralStats.total}</span>
            </button>
            <button 
              onClick={() => setActiveTab('Eastern Visayas')}
              className={`p-2 md:p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                activeTab === 'Eastern Visayas' 
                  ? 'border-crimson bg-crimson/10 shadow-[0_0_15px_rgba(218,45,70,0.15)] text-light-gray' 
                  : 'border-light-gray/5 bg-obsidian/40 text-slate-gray'
              }`}
            >
              <span className="font-orbitron text-[8px] md:text-[9px] font-bold tracking-wider text-center uppercase">EASTERN</span>
              <span className="font-space-mono text-xs font-black text-pale-pink">{eastStats.unlocked}/{eastStats.total}</span>
            </button>
          </div>

          {/* Left Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-8 custom-scrollbar pb-24 md:pb-6">
            
            {/* Grid Area */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-crimson" />
                <h2 className="font-orbitron text-xs font-bold tracking-widest text-slate-gray uppercase">
                  {activeTab.toUpperCase()} INSTRUMENTS
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {regionInstruments.map(inst => {
                  const isUnlocked = unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase());
                  const isSelected = activeDetail?.type === 'master' && activeDetail.data.id === inst.id;
                  
                  return (
                    <button 
                      key={inst.id}
                      onClick={() => setActiveDetail({ type: 'master', data: inst })}
                      className={`aspect-square rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                        isSelected 
                          ? 'border-crimson bg-dark-slate shadow-[0_0_15px_rgba(218,45,70,0.2)] md:scale-95' 
                          : isUnlocked 
                            ? 'border-pale-pink/20 bg-dark-slate/40 hover:border-crimson/50 hover:bg-dark-slate/60' 
                            : 'border-light-gray/5 bg-obsidian/50 opacity-90'
                      }`}
                    >
                      <img 
                        src={isUnlocked ? `${IMAGE_BASE}${inst.id}.png` : `${IMAGE_BASE}locked_${inst.id}.png`} 
                        alt={inst.name}
                        className={`w-full h-full object-contain p-2 md:p-4 transition-transform duration-300 ${
                          isUnlocked ? 'mix-blend-screen group-hover:scale-110' : 'opacity-40 mix-blend-screen'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Profiles Area */}
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
                    const synthType = profile.acoustic?.synthesisType || 'Unknown';
                    const category = profile.instrument?.category || 'Percussion';
                    const isSelected = activeDetail?.type === 'custom' && activeDetail.data === profile;

                    return (
                      <button
                        key={key}
                        onClick={() => setActiveDetail({ type: 'custom', data: profile })}
                        className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all group ${
                          isSelected 
                            ? 'border-crimson bg-dark-slate shadow-[0_0_15px_rgba(218,45,70,0.15)]' 
                            : 'border-pale-pink/15 bg-dark-slate/30 hover:border-crimson/40 hover:bg-dark-slate/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${isSelected ? 'bg-crimson/20 text-crimson border border-crimson/30' : 'bg-obsidian border border-light-gray/10 text-crimson'}`}>
                            <Tag size={18} />
                          </div>
                          <div>
                            <h4 className={`font-orbitron font-bold text-sm ${isSelected ? 'text-white' : 'text-light-gray'}`}>{instName}</h4>
                            <p className="font-space-mono text-[10px] text-pale-pink uppercase tracking-widest">{category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2.5 py-1 rounded-full bg-obsidian border border-light-gray/5 font-space-mono text-[9px] text-slate-gray uppercase">
                            {synthType}
                          </span>
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
        </div>

        {/* Right Pane: Almanac Details Inspector */}
        <div 
          className={`
            absolute inset-y-0 right-0 z-40 md:relative md:z-auto
            w-full md:w-80 lg:w-[400px] shrink-0
            bg-obsidian/95 md:bg-dark-slate/40 backdrop-blur-xl md:backdrop-blur-none
            border-l border-light-gray/10 
            flex flex-col
            transition-transform duration-300 ease-in-out
            ${activeDetail ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}
        >
          {/* Mobile "Back" Header */}
          <div className="md:hidden flex items-center p-4 border-b border-light-gray/10 bg-obsidian shrink-0">
            <button 
              onClick={() => setActiveDetail(null)}
              className="flex items-center gap-2 text-slate-gray hover:text-light-gray font-orbitron text-xs font-bold tracking-widest p-2"
            >
              <ChevronLeft size={16} /> BACK TO GRID
            </button>
          </div>

          {activeDetail ? (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
              
              {/* === MASTER INSTRUMENT RENDER === */}
              {activeDetail.type === 'master' && (() => {
                const inst = activeDetail.data;
                const isUnlocked = unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase());

                return (
                  <>
                    <div className="aspect-square bg-obsidian rounded-2xl border border-light-gray/10 flex items-center justify-center p-6 relative mb-6 shadow-inner shrink-0">
                      <img 
                        src={isUnlocked ? `${IMAGE_BASE}${inst.id}.png` : `${IMAGE_BASE}locked_${inst.id}.png`} 
                        className={`w-full h-full object-contain ${isUnlocked ? 'mix-blend-screen' : 'opacity-40 mix-blend-screen'}`} 
                        alt={inst.name}
                      />
                      <div className="absolute top-3 right-3 z-20">
                        {isUnlocked ? (
                          <button 
                            onClick={() => setSelectedHintInstrument(inst)}
                            className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-crimson border border-obsidian flex items-center justify-center text-obsidian shadow-md hover:scale-110 active:scale-95 transition-all"
                            title="Show location hints"
                          >
                            <CheckCircle size={18} className="md:w-4 md:h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => setSelectedHintInstrument(inst)}
                            className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-dark-slate border border-light-gray/10 flex items-center justify-center text-slate-gray shadow-md hover:bg-dark-slate/80 hover:scale-110 active:scale-95 transition-all"
                            title="Show location hints"
                          >
                            <HelpCircle size={18} className="md:w-4 md:h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                      <h2 className={`font-orbitron font-black text-2xl tracking-wide shrink-0 ${isUnlocked ? 'text-light-gray' : 'text-slate-gray'}`}>
                        {isUnlocked ? inst.name : '??????'}
                      </h2>
                      <p className="font-space-mono text-xs text-pale-pink/80 uppercase mt-1 mb-4 shrink-0">
                        {isUnlocked ? inst.region : 'Visayan Instrument'}
                      </p>

                      {/* This container will now correctly stretch to fill the remaining space */}
                      <div className="flex-1 bg-obsidian/60 border border-light-gray/5 rounded-2xl p-4 mb-6">
                        {isUnlocked ? (
                          <p className="font-space-mono text-sm text-light-gray/90 leading-relaxed">
                            {inst.hint}
                          </p>
                        ) : (
                          <div>
                            <span className="block font-orbitron text-[10px] text-crimson font-bold uppercase tracking-wider mb-2">Teaser Hint:</span>
                            <p className="font-space-mono text-sm text-slate-gray leading-relaxed italic">
                              "{inst.hint}"
                            </p>
                          </div>
                        )}
                      </div>

                      {isUnlocked && (
                        <button 
                          onClick={() => onSelectInstrument(inst.name)}
                          className="w-full py-4 bg-crimson text-obsidian text-sm font-black font-orbitron rounded-xl hover:shadow-lg hover:shadow-crimson/20 transition-all active:scale-95 shrink-0 tracking-widest uppercase mt-auto"
                        >
                          PLAY NOW
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* === CUSTOM PROFILE RENDER === */}
              {activeDetail.type === 'custom' && (() => {
                const profile = activeDetail.data;
                return (
                  <div className="flex-1 flex flex-col space-y-6">
                    <div className="border-b border-light-gray/10 pb-4 shrink-0">
                      <h3 className="font-orbitron font-black text-xl text-light-gray">
                        {profile.instrument?.name}
                      </h3>
                      <span className="font-space-mono text-[10px] text-pale-pink uppercase tracking-widest">
                        Custom Synthesis Specs
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 shrink-0">
                      <div>
                        <span className="block font-orbitron text-[9px] text-slate-gray uppercase">LOCAL NAME</span>
                        <span className="font-space-mono text-xs text-light-gray">{profile.instrument?.localName || 'None'}</span>
                      </div>
                      <div>
                        <span className="block font-orbitron text-[9px] text-slate-gray uppercase">REGION</span>
                        <span className="font-space-mono text-xs text-light-gray">{profile.instrument?.region || 'Visayas'}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="block font-orbitron text-[9px] text-slate-gray uppercase">H.-SACHS CLASSIFICATION</span>
                      <span className="font-space-mono text-xs text-pale-pink">{profile.instrument?.hornbostelSachs}</span>
                    </div>

                    <div className="shrink-0">
                      <span className="block font-orbitron text-[9px] text-slate-gray uppercase">CULTURAL PURPOSE</span>
                      <p className="font-space-mono text-xs text-light-gray/90 leading-relaxed bg-obsidian/40 p-3 rounded-xl border border-light-gray/5">
                        {profile.instrument?.culturalPurpose}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <span className="block font-orbitron text-[10px] text-crimson font-black tracking-widest uppercase mb-2">
                        ACOUSTIC ENGINE SPECIFICATIONS
                      </span>
                      <div className="bg-obsidian/60 border border-light-gray/10 rounded-2xl p-4 space-y-3 font-space-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-gray">Synthesis Engine:</span>
                          <span className="text-pale-pink font-bold uppercase">{profile.acoustic?.synthesisType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-gray">Fundamental Range:</span>
                          <span className="text-light-gray">{profile.acoustic?.fundamentalFreqMin}Hz - {profile.acoustic?.fundamentalFreqMax}Hz</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-gray">Attack / Decay:</span>
                          <span className="text-light-gray">{profile.acoustic?.attackTime}s / {profile.acoustic?.decayTime}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-gray">Acoustic Timbre:</span>
                          <span className="text-light-gray italic">{profile.acoustic?.timbre}</span>
                        </div>
                      </div>
                    </div>

                    {profile.inputMapping && (
                      <div className="flex-1">
                        <span className="block font-orbitron text-[10px] text-crimson font-black tracking-widest uppercase mb-2">
                          LANE MAPPING ({profile.inputMapping.laneCount} lanes)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {profile.inputMapping.lanes?.map((lane: any) => (
                            <div key={lane.id} className="bg-obsidian/40 border border-light-gray/5 rounded-xl p-2.5 flex items-center justify-between text-xs font-space-mono">
                              <span className="text-pale-pink font-bold">{lane.label}</span>
                              <span className="text-slate-gray text-[10px]">Key: <kbd className="px-1.5 py-0.5 bg-dark-slate rounded border border-light-gray/10 text-light-gray text-[9px]">{lane.keyBinding}</kbd></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-6 shrink-0">
                      <button
                        onClick={() => onSelectCustomProfile(profile)}
                        className="w-full py-4 bg-crimson text-obsidian text-sm font-black font-orbitron rounded-xl hover:shadow-lg hover:shadow-crimson/20 transition-all active:scale-[0.98] text-center uppercase tracking-widest"
                      >
                        PLAY THIS SOUNDPRINT
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>
          ) : (
            // Desktop empty state
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center opacity-50">
              <BookOpen size={48} className="text-slate-gray mb-4" />
              <p className="font-orbitron font-bold text-lg text-light-gray uppercase tracking-widest">Awaiting Selection</p>
              <p className="font-space-mono text-sm text-slate-gray mt-2">Select an instrument or soundprint from the archive to view its details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Location Hint Modal */}
      {selectedHintInstrument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-obsidian/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-dark-slate border-2 border-crimson/50 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative p-6 space-y-4">
            <div>
              <h3 className="font-orbitron font-black text-lg text-light-gray uppercase tracking-wider">
                {selectedHintInstrument.name} Hints
              </h3>
              <span className="font-space-mono text-[10px] text-pale-pink uppercase tracking-widest">
                Location Guide
              </span>
            </div>
            
            <p className="font-space-mono text-xs text-pale-pink font-bold">
              this instrument may be found in these locations:
            </p>
            
            <ul className="space-y-2.5 font-space-mono text-xs text-light-gray/90 bg-obsidian/40 p-4 rounded-2xl border border-light-gray/5 max-h-[40vh] overflow-y-auto custom-scrollbar">
              {(SCANNING_LOCATIONS[selectedHintInstrument.name.toLowerCase()] || []).map((loc, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-crimson font-bold flex-shrink-0">•</span>
                  <span>{loc}</span>
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => setSelectedHintInstrument(null)}
              className="w-full py-3 bg-crimson text-obsidian text-xs font-black font-orbitron rounded-xl hover:shadow-lg hover:shadow-crimson/20 transition-all active:scale-[0.98] text-center uppercase tracking-widest"
            >
              CLOSE
            </button>
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