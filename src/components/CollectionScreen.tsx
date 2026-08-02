import { useState, useEffect } from 'react';
import { ChevronLeft, BookOpen, Music, Tag, FileText, CheckCircle, HelpCircle, Flag, Star, Volume2, ShieldAlert } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';
import { IMAGE_BASE, MASTER_INSTRUMENTS, FIELD_MISSION_INSTRUMENTS, KORLONG_INSTRUMENT } from '../constants';
import { audioEngine } from '../services/audioSynth';

const HARMONYDEX_STATS: Record<string, { type: string; dmg: number; skillName: string; skillCost: number; skillDesc: string; audioPreset: string }> = {
  // Western Visayas
  'tultugan':       { type: 'percussion', dmg: 45, skillName: 'Bamboo Resonance', skillCost: 2, skillDesc: 'Deals heavy Percussion damage and echoes rhythmic beats across the party.', audioPreset: 'sub-percussion' },
  'tulali':         { type: 'woodwind',   dmg: 35, skillName: 'Courtship Breeze', skillCost: 2, skillDesc: 'Soothing woodwind melody that restores 100 HP and cleanses debuffs.', audioPreset: 'sine-breath' },
  'litgit':         { type: 'string',     dmg: 38, skillName: 'Friction Scratch', skillCost: 2, skillDesc: 'Piercing two-stringed attack dealing continuous String damage.', audioPreset: 'saw-string' },
  'buktot':         { type: 'string',     dmg: 36, skillName: 'Husk Resonator',   skillCost: 2, skillDesc: 'Hollow coconut-bodied lute strike dealing warm String damage.', audioPreset: 'pluck-distortion' },
  'pasiyak':        { type: 'woodwind',   dmg: 32, skillName: 'Warbling Bird Chirp', skillCost: 1, skillDesc: 'Quick water-whistle chirp that distracts enemies and regenerates 1 AP.', audioPreset: 'sine-breath' },
  'tugo':           { type: 'percussion', dmg: 42, skillName: 'Hollow Wooden Beat', skillCost: 2, skillDesc: 'Deep hand-struck beats dealing solid Percussion damage.', audioPreset: 'sub-percussion' },

  // Central Visayas
  'cebuano_gitara': { type: 'string',     dmg: 42, skillName: 'Mactan Acoustic Solo', skillCost: 2, skillDesc: 'High-clarity 6-string chord strike dealing heavy String damage.', audioPreset: 'pluck-distortion' },
  'bandurria':      { type: 'string',     dmg: 44, skillName: 'Rondalla Tremolo', skillCost: 2, skillDesc: 'Rapid 14-string picking rush that pierces physical barriers.', audioPreset: 'pluck-distortion' },
  'laud':           { type: 'string',     dmg: 40, skillName: 'Counter-Melody Strike', skillCost: 2, skillDesc: 'Deep teardrop chord resonance dealing supportive String damage.', audioPreset: 'saw-string' },
  'octavina':       { type: 'string',     dmg: 38, skillName: 'Tenor Harmonic Wave', skillCost: 2, skillDesc: 'Mid-range acoustic wave boosting party accuracy by 25%.', audioPreset: 'pluck-distortion' },
  'bajo_de_unas':   { type: 'string',     dmg: 50, skillName: 'Sub-Acoustic Slap', skillCost: 3, skillDesc: 'Massive four-string plectrum strike dealing tremendous heavy damage.', audioPreset: 'saw-string' },

  // Eastern Visayas
  'lantoy':         { type: 'woodwind',   dmg: 34, skillName: 'Ethereal Breath', skillCost: 2, skillDesc: 'Gentle nose-flute tone that soothes enemy rage and lowers attack.', audioPreset: 'sine-breath' },
  'subing':         { type: 'percussion', dmg: 36, skillName: 'Twangy Vibration', skillCost: 1, skillDesc: 'Vibrating bamboo jaw harp hum dealing piercing acoustic resonance.', audioPreset: 'sub-percussion' },
  'korlong':        { type: 'string',     dmg: 55, skillName: 'Epic Chanteuse', skillCost: 3, skillDesc: 'Legendary two-stringed chant resonance dealing devastating true damage.', audioPreset: 'saw-string' },
};

const getHarmonydexStats = (inst: { id: string; name: string }) => {
  const stats = HARMONYDEX_STATS[inst.id.toLowerCase()] || HARMONYDEX_STATS[inst.name.toLowerCase()];
  if (stats) return stats;
  return {
    type: 'string',
    dmg: 40,
    skillName: 'Harmonic Resonance',
    skillCost: 2,
    skillDesc: 'Resonant acoustic attack that deals solid damage and harmonizes frequencies.',
    audioPreset: 'pluck-distortion'
  };
};

const getTypeColor = (type: string) => {
  switch(type.toLowerCase()) {
    case 'string': return 'bg-[#ef4444] text-white'; 
    case 'percussion': return 'bg-[#facc15] text-black'; 
    case 'woodwind': return 'bg-[#4ade80] text-black'; 
    case 'brass': return 'bg-[#f97316] text-black'; 
    default: return 'bg-[#a855f7] text-white'; 
  }
};

const SCANNING_LOCATIONS: Record<string, string[]> = {
  'tultugan':      ['Tultugan Festival, Maasin, Iloilo'],
  'tulali':        ['UPV Museum of Art & Cultural Heritage (UPV MACH), Iloilo City'],
  'litgit':        ['UPV Museum of Art & Cultural Heritage (UPV MACH), Iloilo City'],
  'cebuano gitara':['Alegre Guitar Factory, Lapu-Lapu City', 'National Museum of the Philippines – Cebu'],
  'bandurria':     ['Alegre Guitar Factory Showroom, Abuno, Lapu-Lapu City'],
  'laud':          ['Ferangeli Guitar Handcrafter Showroom, Cebu'],
  'octavina':      ['Ferangeli Guitar Handcrafter Showroom, Cebu'],
  'bajo de uñas':  ['Alegre Guitar Factory Showroom, Abuno, Lapu-Lapu City'],
};

interface CollectionScreenProps {
  onBack: () => void;
  onSelectInstrument: (name: string) => void;
  onSelectCustomProfile: (profile: any) => void;
  onOpenKorlongHunt: () => void;
  onOpenScanner: () => void;
  onTryOut?: (name: string) => void;
}

export function CollectionScreen({ onBack, onSelectInstrument, onSelectCustomProfile, onOpenKorlongHunt, onOpenScanner, onTryOut }: CollectionScreenProps) {
  const { progress } = useProgress();
  const [activeTab, setActiveTab] = useState<'Western Visayas' | 'Central Visayas' | 'Eastern Visayas'>('Western Visayas');
  const [selectedHintInstrument, setSelectedHintInstrument] = useState<any | null>(null);
  const [activeDetail, setActiveDetail] = useState<{ type: 'master' | 'custom', data: any } | null>(null);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // SFX Helper Function
  const playSound = (soundType: string) => {
    try {
      if (audioEngine && typeof audioEngine.playHitSFX === 'function') {
        audioEngine.playHitSFX(soundType);
      }
    } catch (e) {
      console.warn("SFX Error:", e);
    }
  };

  useEffect(() => {
    setIsInfoExpanded(false);
  }, [activeDetail]);

  // Reset detail when tab changes to trigger animations cleanly
  useEffect(() => {
    setActiveDetail(null);
  }, [activeTab]);

  const regionInstruments = MASTER_INSTRUMENTS.filter(inst => inst.region === activeTab);
  const regionFieldMissions = FIELD_MISSION_INSTRUMENTS.filter(inst => inst.region === activeTab);
  
  const totalInstruments = MASTER_INSTRUMENTS.length + FIELD_MISSION_INSTRUMENTS.length + 1;
  const unlockedList = progress.unlockedInstruments.map(u => u.toLowerCase());
  
  const isUnlocked = (id: string, name: string) =>
    unlockedList.includes(id.toLowerCase()) || unlockedList.includes(name.toLowerCase());

  const totalUnlocked = [
    ...MASTER_INSTRUMENTS,
    ...FIELD_MISSION_INSTRUMENTS,
    KORLONG_INSTRUMENT,
  ].filter(inst => isUnlocked(inst.id, inst.name)).length;

  const getRegionStats = (regionName: string) => {
    const masterCount = MASTER_INSTRUMENTS.filter(i => i.region === regionName).length;
    const fieldCount = FIELD_MISSION_INSTRUMENTS.filter(i => i.region === regionName).length;
    const korlongCount = KORLONG_INSTRUMENT.region === regionName ? 1 : 0;
    const total = masterCount + fieldCount + korlongCount;
    const unlocked = [
      ...MASTER_INSTRUMENTS.filter(i => i.region === regionName),
      ...FIELD_MISSION_INSTRUMENTS.filter(i => i.region === regionName),
      ...(KORLONG_INSTRUMENT.region === regionName ? [KORLONG_INSTRUMENT] : []),
    ].filter(i => isUnlocked(i.id, i.name)).length;
    return { unlocked, total };
  };

  const westStats = getRegionStats('Western Visayas');
  const centralStats = getRegionStats('Central Visayas');
  const eastStats = getRegionStats('Eastern Visayas');

  const customProfileKeys = Object.keys(progress.customProfiles || {});
  const hasCustomProfiles = customProfileKeys.length > 0;
  const korlongUnlocked = isUnlocked(KORLONG_INSTRUMENT.id, KORLONG_INSTRUMENT.name);

  return (
    <div className="h-screen w-full bg-[#11131a] flex flex-col relative overflow-hidden pb-safe z-0">
      
      {/* Clean Dotted Background */}
      <div 
        className="absolute inset-0 z-[-2] pointer-events-none opacity-40" 
        style={{ backgroundImage: 'radial-gradient(circle, #2a2d3d 2px, transparent 2px)', backgroundSize: '24px 24px' }}
      />
      
      {/* Decorative Speed Slashes */}
      <div className="absolute top-0 right-0 w-[40%] h-full bg-black -skew-x-12 translate-x-32 z-[-1] opacity-30" />

      {/* HEADER */}
      <div 
        className="relative z-10 px-4 md:px-6 pt-12 pb-4 flex items-center justify-between border-b-[4px] border-black bg-[#161923] shrink-0 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.5)] opacity-0"
        style={{ animation: 'slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
      >
        <button 
          onClick={() => { playSound('click'); onBack(); }}
          className="w-10 h-10 bg-[#38bdf8] border-[4px] border-black flex items-center justify-center text-black shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all duration-300 ease-out -skew-x-6 hover:bg-[#7dd3fc]"
        >
          <ChevronLeft size={24} className="skew-x-6 stroke-[4px]" />
        </button>

        <h1 
          className="font-orbitron text-xl md:text-2xl font-black tracking-widest text-white uppercase"
          style={{ textShadow: '3px 3px 0px #000, -2px 0px 0px #2a2d3d' }}
        >
          HARMONYDEX
        </h1>

        <div className="px-3 h-10 flex items-center justify-center bg-black border-[4px] border-[#facc15] text-[#facc15] font-space-mono text-sm font-black shrink-0 -skew-x-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
          <span className="skew-x-6">{totalUnlocked}/{totalInstruments}</span>
        </div>
      </div>

      {/* SPLIT-PANE LAYOUT */}
      <div className="flex-1 flex overflow-hidden relative z-10 mt-1">
        
        {/* LEFT PANE */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          
          <div 
            className="px-2 md:px-6 py-4 grid grid-cols-3 gap-2 shrink-0 border-b-[4px] border-black bg-[#1e2230] opacity-0"
            style={{ animation: 'slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.1s' }}
          >
            {[
              { name: 'Western Visayas', label: 'WESTERN', stats: westStats },
              { name: 'Central Visayas', label: 'CENTRAL', stats: centralStats },
              { name: 'Eastern Visayas', label: 'EASTERN', stats: eastStats }
            ].map((tab) => (
              <button 
                key={tab.name}
                onClick={() => { 
                  if(activeTab !== tab.name) {
                    playSound('pop'); 
                    setActiveTab(tab.name as any);
                  }
                }}
                className={`p-2 border-[4px] border-black -skew-x-6 flex flex-col items-center justify-center gap-1 transition-all duration-300 ease-out ${
                  activeTab === tab.name 
                    ? 'bg-[#facc15] shadow-[4px_4px_0px_0px_#000] translate-y-[-2px]' 
                    : 'bg-[#11131a] hover:bg-[#2a2d3d] active:translate-y-1'
                }`}
              >
                <span className={`font-orbitron text-[9px] font-black tracking-wider skew-x-6 transition-colors duration-300 ${activeTab === tab.name ? 'text-black' : 'text-white'}`}>
                  {tab.label}
                </span>
                <span className={`font-space-mono text-xs font-black skew-x-6 transition-colors duration-300 ${activeTab === tab.name ? 'text-black' : 'text-gray-500'}`}>
                  {tab.stats.unlocked}/{tab.stats.total}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 custom-scrollbar pb-24 md:pb-6 relative">
            <div key={activeTab} className="space-y-8">
              
              {/* TRADING CARDS GRID */}
              <div>
                <div 
                  className="inline-block bg-black border-[3px] border-[#38bdf8] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#38bdf8] mb-6 opacity-0"
                  style={{ animation: 'slideRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.2s' }}
                >
                  <h2 className="font-orbitron text-sm font-black tracking-widest text-white skew-x-6 uppercase flex items-center gap-2">
                    <BookOpen size={16} className="text-[#38bdf8]" />
                    {activeTab.toUpperCase()} CARDS
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {regionInstruments.map((inst, index) => {
                    const unlocked = isUnlocked(inst.id, inst.name);
                    const isSelected = activeDetail?.type === 'master' && activeDetail.data.id === inst.id;
                    
                    return (
                      <button 
                        key={inst.id}
                        onClick={() => {
                          playSound('click');
                          setActiveDetail({ type: 'master', data: inst });
                        }}
                        className={`flex flex-col aspect-[3/4] border-[4px] border-black transition-all duration-300 ease-out relative group overflow-hidden opacity-0 ${
                          isSelected 
                            ? 'bg-[#38bdf8] shadow-[6px_6px_0px_0px_#000] translate-y-1 translate-x-1' 
                            : unlocked 
                              ? 'bg-white shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#000]' 
                              : 'bg-[#11131a] shadow-[4px_4px_0px_0px_#000] opacity-80 hover:opacity-100'
                        }`}
                        style={{ animation: `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both ${0.2 + index * 0.05}s` }}
                      >
                        <div className={`w-full border-b-[4px] border-black px-2 py-1.5 flex items-center justify-between shrink-0 ${unlocked ? 'bg-black text-white' : 'bg-[#1e2230] text-gray-500'}`}>
                           <Tag size={12} className={unlocked ? 'text-[#38bdf8]' : 'text-gray-600'} />
                           <span className="font-orbitron font-black text-[9px] truncate ml-2 uppercase tracking-widest">{unlocked ? inst.name : 'UNKNOWN'}</span>
                        </div>

                        <div className="flex-1 w-full relative bg-[#1e2230] flex items-center justify-center overflow-hidden">
                          {unlocked && <div className="absolute inset-0 opacity-20 z-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 12px)' }} />}
                          <img 
                            src={unlocked ? `${IMAGE_BASE}${inst.id}.png?v=2` : `${IMAGE_BASE}locked_${inst.id}.png?v=2`} 
                            alt={inst.name}
                            className={`w-full h-full object-cover relative z-10 transition-transform duration-300 ease-out ${
                              unlocked ? 'group-hover:scale-110' : 'opacity-40 grayscale'
                            }`}
                          />
                        </div>

                        <div className={`w-full border-t-[4px] border-black px-2 py-1 flex items-center justify-between shrink-0 ${unlocked ? 'bg-[#facc15]' : 'bg-[#1e2230]'}`}>
                           <span className={`font-space-mono font-black text-[8px] uppercase ${unlocked ? 'text-black' : 'text-gray-500'}`}>{unlocked ? 'DATA SYNCED' : 'LOCKED'}</span>
                           <span className={`text-[10px] tracking-tighter ${unlocked ? 'text-black' : 'text-gray-600'}`}>★★★★★</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Field Mission Ghost Cards ── */}
              {regionFieldMissions.length > 0 && (
                <div className="mt-8">
                  <div 
                    className="inline-block bg-black border-[3px] border-[#f97316] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#f97316] mb-4 opacity-0"
                    style={{ animation: 'slideRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.4s' }}
                  >
                    <h3 className="font-orbitron text-xs font-black tracking-widest text-[#f97316] skew-x-6 uppercase flex items-center gap-2">
                      <Flag size={13} className="text-[#f97316]" />
                      FIELD MISSIONS — UNVERIFIED
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {regionFieldMissions.map((inst, index) => {
                      const unlocked = isUnlocked(inst.id, inst.name);
                      return (
                        <div 
                          key={inst.id} 
                          className="aspect-square border-[4px] border-dashed border-gray-600 bg-[#11131a] relative flex flex-col items-center justify-center overflow-hidden opacity-0 group"
                          style={{ animation: `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both ${0.4 + index * 0.05}s` }}
                        >
                          <div className={`w-full h-full relative z-10 transition-transform duration-500 group-hover:scale-105 ${unlocked ? 'opacity-80' : 'opacity-30 grayscale'}`}>
                            {unlocked && <div className="absolute inset-0 opacity-20 z-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 12px)' }} />}
                            <img
                              src={unlocked ? `${IMAGE_BASE}${inst.id}.png?v=2` : `${IMAGE_BASE}locked_${inst.id}.png?v=2`}
                              alt={inst.name}
                              className="absolute inset-0 w-full h-full object-cover z-0"
                            />
                          </div>
                          <div className="relative z-10 text-center bg-black/80 px-3 py-1.5 border-[2px] border-gray-600 mt-4 shadow-[2px_2px_0px_0px_#000]">
                            <p className="font-orbitron font-black text-[9px] text-gray-300 tracking-widest uppercase leading-tight">
                              {unlocked ? inst.name : '???'}
                            </p>
                          </div>
                          <div className="absolute top-1 left-1 bg-gray-700 border-[3px] border-black px-1 py-0 -skew-x-6 z-10">
                            <span className="font-space-mono text-[7px] font-black text-white skew-x-6 block">⚑ FIELD</span>
                          </div>
                          {!unlocked && (
                            <button
                              onClick={() => { playSound('scan'); onOpenScanner(); }}
                              className="absolute bottom-2 right-2 bg-[#1e2230] border-[3px] border-black px-3 py-1 font-orbitron text-[9px] font-black text-white hover:bg-[#f97316] hover:text-black shadow-[3px_3px_0px_0px_#000] transition-colors duration-300 z-10"
                            >
                              SUBMIT
                            </button>
                          )}
                          {unlocked && (
                            <div className="absolute bottom-2 right-2 bg-[#4ade80] border-[3px] border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_#000] z-10">
                              <span className="font-orbitron text-[8px] font-black text-black">✓ FOUND</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Korlong Legendary Card ── */}
              {activeTab === 'Eastern Visayas' && (
                <div className="mt-8">
                  <div 
                    className="inline-block bg-black border-[3px] border-[#ef4444] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#ef4444] mb-4 opacity-0"
                    style={{ animation: 'slideRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.4s' }}
                  >
                    <h3 className="font-orbitron text-xs font-black tracking-widest text-[#ef4444] skew-x-6 uppercase flex items-center gap-2">
                      <Star size={13} className="text-[#ef4444]" />
                      LEGENDARY — GPS HUNT ONLY
                    </h3>
                  </div>
                  <div 
                    className="border-[4px] border-black bg-[#161923] p-5 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden opacity-0"
                    style={{ animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.5s' }}
                  >
                    <div className="absolute inset-0 border-[3px] border-[#ef4444] opacity-20 animate-pulse" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-16 h-16 border-[4px] border-black flex items-center justify-center shrink-0 bg-[#11131a] shadow-[4px_4px_0px_0px_#ef4444] overflow-hidden">
                        <img
                          src={korlongUnlocked ? `${IMAGE_BASE}${KORLONG_INSTRUMENT.id}.png?v=2` : `${IMAGE_BASE}locked_${KORLONG_INSTRUMENT.id}.png?v=2`}
                          alt={KORLONG_INSTRUMENT.name}
                          className={`w-full h-full object-cover transition-all duration-500 hover:scale-110 ${korlongUnlocked ? 'opacity-100' : 'opacity-40 grayscale'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-orbitron font-black text-lg text-white tracking-widest uppercase drop-shadow-[2px_2px_0px_#000]">
                            {korlongUnlocked ? KORLONG_INSTRUMENT.name : 'ANOMALY DETECTED'}
                          </h3>
                          <span className="inline-block bg-[#ef4444] border-[3px] border-black px-2 py-0 font-orbitron text-[9px] font-black text-white -skew-x-6">
                            <span className="skew-x-6 block">★ LEGENDARY</span>
                          </span>
                        </div>
                        <p className="font-space-mono text-xs text-gray-400 mt-2 leading-relaxed font-bold">
                          {korlongUnlocked
                            ? KORLONG_INSTRUMENT.hint
                            : 'Critically endangered. Cannot be scanned. Only GPS proximity reveals this instrument.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => { playSound('legendary'); onOpenKorlongHunt(); }}
                      className={`w-full mt-5 py-3 border-[4px] border-black font-orbitron font-black text-sm tracking-widest uppercase -skew-x-6 shadow-[4px_4px_0px_0px_#000] transition-all duration-300 ease-out flex items-center justify-center gap-2 relative z-10 ${
                        korlongUnlocked
                          ? 'bg-white text-black hover:bg-gray-200'
                          : 'bg-[#ef4444] text-white hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-1 active:shadow-none'
                      }`}
                    >
                      <Star size={16} className="skew-x-6" />
                      <span className="skew-x-6">{korlongUnlocked ? 'HUNT AGAIN' : 'START HUNT'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Profiles Area */}
              <div>
                <div 
                  className="inline-block bg-black border-[3px] border-[#a855f7] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#a855f7] mb-6 mt-4 opacity-0"
                  style={{ animation: 'slideRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.6s' }}
                >
                  <h2 className="font-orbitron text-sm font-black tracking-widest text-white skew-x-6 uppercase flex items-center gap-2">
                    <Music size={16} className="text-[#a855f7]" />
                    SOUNDPRINTS
                  </h2>
                </div>

                {hasCustomProfiles ? (
                  <div className="space-y-4">
                    {customProfileKeys.map((key, index) => {
                      const profile = progress.customProfiles[key];
                      const instName = profile.instrument?.name || key;
                      const synthType = profile.acoustic?.synthesisType || 'Unknown';
                      const category = profile.instrument?.category || 'Percussion';
                      const isSelected = activeDetail?.type === 'custom' && activeDetail.data === profile;

                      return (
                        <button
                          key={key}
                          onClick={() => { playSound('click'); setActiveDetail({ type: 'custom', data: profile }); }}
                          className={`w-full p-4 border-[4px] border-black flex items-center justify-between text-left transition-all duration-300 ease-out opacity-0 ${
                            isSelected 
                              ? 'bg-[#a855f7] shadow-[0px_0px_0px_0px_#000] translate-y-1 translate-x-1' 
                              : 'bg-[#1e2230] shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#000]'
                          }`}
                          style={{ animation: `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both ${0.6 + index * 0.05}s` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 border-[3px] border-black flex items-center justify-center -skew-x-6 bg-black text-white transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
                              <Tag size={20} className="skew-x-6" />
                            </div>
                            <div>
                              <h4 className={`font-orbitron font-black text-lg text-white`}>{instName}</h4>
                              <p className="font-space-mono text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">{category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-black border-[2px] border-gray-600 font-space-mono text-[10px] font-bold text-gray-300 uppercase -skew-x-6 shadow-[2px_2px_0px_0px_#000]">
                              <span className="skew-x-6 block">{synthType}</span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div 
                    className="bg-[#11131a] border-[4px] border-black p-6 text-center shadow-[6px_6px_0px_0px_#000] opacity-0"
                    style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.7s' }}
                  >
                    <FileText size={32} className="text-gray-600 mx-auto mb-3" />
                    <p className="font-space-mono font-bold text-gray-400 uppercase">No Soundprints Found.</p>
                    <p className="font-space-mono text-xs text-gray-600 mt-1">Scan instruments to synthesize profiles.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Details Inspector */}
        <div 
          className={`
            absolute inset-y-0 right-0 z-40 md:relative md:z-auto
            w-full md:w-[380px] lg:w-[420px] shrink-0
            bg-[#1e2230] border-l-[6px] border-black
            flex flex-col shadow-[-10px_0px_30px_0px_rgba(0,0,0,0.8)]
            transition-transform duration-300 ease-out
            ${activeDetail ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}
        >
          <div className="md:hidden flex items-center p-4 border-b-[4px] border-black bg-[#11131a] shrink-0">
            <button 
              onClick={() => { playSound('back'); setActiveDetail(null); }}
              className="flex items-center gap-2 text-white font-orbitron text-sm font-black tracking-widest bg-[#ef4444] border-[3px] border-black px-4 py-2 -skew-x-6 shadow-[3px_3px_0px_0px_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all duration-300"
            >
              <ChevronLeft size={16} className="skew-x-6" /> <span className="skew-x-6">BACK</span>
            </button>
          </div>

          {activeDetail ? (
            <div 
              key={activeDetail.type + (activeDetail.data.id || activeDetail.data.name)} 
              className="flex-1 p-3 xl:p-4 overflow-y-auto custom-scrollbar bg-[#161923] opacity-0"
              style={{ animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}
            >
              
              {/* === COMIC TRADING CARD WRAPPER === */}
              <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col min-h-full rounded-sm">
                
                {activeDetail.type === 'master' && (() => {
                  const inst = activeDetail.data;
                  const isUnlocked = unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase());
                  const stats = getHarmonydexStats(inst);
                  const typeBg = getTypeColor(stats.type);

                  return (
                    <>
                      {/* CARD HEADER (Button moved here) */}
                      <div className="bg-black border-b-[4px] border-black p-2 xl:p-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 xl:w-10 xl:h-10 bg-[#38bdf8] border-[3px] border-white flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#fff]">
                            <Music size={16} className="font-black" />
                          </div>
                          <h2 className={`font-orbitron font-black text-sm xl:text-lg uppercase tracking-widest line-clamp-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                            {isUnlocked ? inst.name : 'UNKNOWN'}
                          </h2>
                        </div>
                        {/* ✅ FIX: Button safely integrated in the header! */}
                        <button 
                          onClick={() => { playSound('pop'); setSelectedHintInstrument(inst); }}
                          className={`w-8 h-8 xl:w-10 xl:h-10 border-[3px] border-white flex items-center justify-center shadow-[2px_2px_0px_0px_#fff] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-transform duration-300 ease-out hover:scale-110 shrink-0 ${isUnlocked ? 'bg-[#4ade80] text-black' : 'bg-[#facc15] text-black'}`}
                        >
                          {isUnlocked ? <CheckCircle size={18} className="stroke-[3px]" /> : <HelpCircle size={18} className="stroke-[3px]" />}
                        </button>
                      </div>

                      {/* CARD IMAGE - Compact Height */}
                      <div className="relative h-[160px] xl:h-[180px] bg-[#1e2230] border-b-[4px] border-black flex items-center justify-center shrink-0 z-10 overflow-hidden">
                        {isUnlocked && <div className="absolute inset-0 opacity-20 z-0" style={{ backgroundImage: 'linear-gradient(#000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px)', backgroundSize: '16px 16px' }} />}
                        <img 
                          src={isUnlocked ? `${IMAGE_BASE}${inst.id}.png?v=2` : `${IMAGE_BASE}locked_${inst.id}.png?v=2`} 
                          className={`w-full h-full object-cover relative z-10 transition-transform duration-700 ease-out ${isUnlocked ? '' : 'opacity-40 grayscale'}`} 
                          alt={inst.name}
                        />
                      </div>

                      {/* CARD DIVIDER / STARS ROW */}
                      <div className="bg-[#facc15] border-b-[4px] border-black px-3 py-1.5 flex items-center justify-between shrink-0">
                        <span className="font-orbitron font-black text-[9px] xl:text-[10px] uppercase text-black">Acoustic Entity</span>
                      </div>

                      {/* CARD BODY: Compact Spacing */}
                      <div className="p-3 xl:p-4 flex-1 flex flex-col bg-white text-black relative z-0">
                        
                        {/* STAT BARS (Tightened gaps) */}
                        <div className="flex flex-col gap-2 mb-3">
                          {/* Type */}
                          <div className="flex items-center gap-2 font-orbitron font-black text-[9px] xl:text-[10px] uppercase">
                            <span className="w-8 text-black">CLS</span>
                            <div className="flex-1 bg-gray-200 border-[3px] border-black h-4 xl:h-5 relative flex items-center">
                               <div className={`absolute left-0 top-0 bottom-0 ${typeBg.split(' ')[0]} border-r-[3px] border-black w-full flex items-center px-2 text-[8px] xl:text-[9px] text-white`}>{stats.type}</div>
                            </div>
                          </div>
                          
                          {/* Damage Bar */}
                          <div className="flex items-center gap-2 font-orbitron font-black text-[9px] xl:text-[10px] uppercase">
                            <span className="w-8 text-black">DMG</span>
                            <div className="flex-1 bg-gray-200 border-[3px] border-black h-3 xl:h-4 relative">
                               <div className="absolute left-0 top-0 bottom-0 bg-[#ef4444] border-r-[3px] border-black transition-all duration-1000 ease-out" style={{ width: `${Math.min((stats.dmg / 60) * 100, 100)}%` }}></div>
                            </div>
                            <span className="w-8 text-right text-black">{stats.dmg}</span>
                          </div>

                          {/* Cost Bar */}
                          <div className="flex items-center gap-2 font-orbitron font-black text-[9px] xl:text-[10px] uppercase">
                            <span className="w-8 text-black">CST</span>
                            <div className="flex-1 bg-gray-200 border-[3px] border-black h-3 xl:h-4 relative">
                               <div className="absolute left-0 top-0 bottom-0 bg-[#38bdf8] border-r-[3px] border-black transition-all duration-1000 ease-out delay-100" style={{ width: `${Math.min((stats.skillCost / 4) * 100, 100)}%` }}></div>
                            </div>
                            <span className="w-8 text-right text-black">{stats.skillCost} AP</span>
                          </div>
                        </div>

                        {/* Lore Box (Tightened padding) */}
                        <div className="border-t-[3px] border-black pt-3 mb-3">
                          {isUnlocked ? (
                            <>
                              <p className="font-space-mono text-[10px] xl:text-[11px] leading-relaxed font-bold text-black line-clamp-3">
                                {inst.hint}
                              </p>
                              {inst.extendedInfo && !isInfoExpanded && (
                                <button 
                                  onClick={() => { playSound('pop'); setIsInfoExpanded(true); }}
                                  className="mt-1.5 inline-block font-orbitron text-[9px] font-black tracking-widest text-[#38bdf8] uppercase hover:underline decoration-[2px] underline-offset-4 transition-colors duration-300 hover:text-[#0284c7]"
                                >
                                  [ EXPAND ]
                                </button>
                              )}
                              {isInfoExpanded && inst.extendedInfo && (
                                <div className="mt-2 border-t-[2px] border-black/10 pt-2 opacity-0" style={{ animation: 'slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}>
                                  <p className="font-space-mono text-[10px] xl:text-[11px] text-gray-700 font-bold leading-relaxed">
                                    {inst.extendedInfo}
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="font-space-mono text-[10px] xl:text-[11px] leading-relaxed font-bold text-gray-500 italic flex gap-2">
                              <ShieldAlert size={14} className="text-[#facc15] shrink-0" />
                              "{inst.hint}"
                            </p>
                          )}
                        </div>

                        {/* Ultimate Ability Box (Compact Version) */}
                        <div className="relative border-[3px] border-black p-2.5 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-colors duration-300 hover:bg-gray-50 mb-3">
                          <div className="absolute -top-3 left-2 bg-[#facc15] border-[2px] border-black px-1 py-0.5 font-orbitron font-black text-[8px] text-black uppercase tracking-widest">
                            ULTIMATE
                          </div>
                          <div className="flex justify-between items-center mb-1 mt-1">
                            <span className="font-orbitron font-black text-[10px] xl:text-[11px] uppercase text-black">{stats.skillName}</span>
                            <span className="text-white font-orbitron text-[8px] font-black bg-black border-[2px] border-black px-1.5 py-0.5 shadow-[2px_2px_0px_0px_#facc15]">{stats.skillCost} AP</span>
                          </div>
                          <span className="text-[10px] xl:text-[11px] font-space-mono font-bold leading-tight text-gray-800 block">{stats.skillDesc}</span>
                        </div>

                        {/* Bottom Buttons (Tight gap) */}
                        <div className="mt-auto flex flex-col gap-2">
                          {isUnlocked && (
                            <button
                              onClick={() => { playSound('pop'); onTryOut?.(inst.name); }}
                              className="w-full py-2 bg-white text-black border-[3px] border-black shadow-[3px_3px_0px_0px_#000] font-orbitron font-black text-[10px] xl:text-[11px] tracking-widest uppercase hover:bg-gray-100 transition-all duration-300 ease-out flex items-center justify-center gap-1.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                            >
                              <Music size={14} className="stroke-[3px]" /> TRY OUT
                            </button>
                          )}

                          {isUnlocked && (
                            <button 
                              onClick={() => { playSound('equip'); onSelectInstrument(inst.name); }}
                              className="w-full py-2.5 bg-[#4ade80] border-[3px] border-black text-black text-xs xl:text-sm font-black font-orbitron shadow-[3px_3px_0px_0px_#000] hover:bg-[#86efac] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all duration-300 ease-out tracking-widest"
                            >
                              EQUIP & PLAY
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {activeDetail.type === 'custom' && (() => {
                  const profile = activeDetail.data;
                  return (
                    <>
                      <div className="bg-black border-b-[4px] border-black p-2 xl:p-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 xl:w-10 xl:h-10 bg-[#a855f7] border-[3px] border-white flex items-center justify-center text-white shadow-[2px_2px_0px_0px_#fff]">
                            <Tag size={16} className="font-black" />
                          </div>
                          <h2 className={`font-orbitron font-black text-base xl:text-lg uppercase tracking-widest line-clamp-1 text-white`}>
                            {profile.instrument?.name}
                          </h2>
                        </div>
                      </div>

                      <div className="relative h-[160px] xl:h-[180px] bg-[#1e2230] border-b-[4px] border-black flex items-center justify-center shrink-0 z-10 overflow-hidden">
                        <Music size={60} className="text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)] opacity-50 transition-transform duration-700 hover:scale-110 hover:rotate-3 relative z-10" />
                      </div>
                      
                      <div className="bg-[#facc15] border-b-[4px] border-black px-3 py-1.5 flex items-center justify-between shrink-0">
                        <span className="font-orbitron font-black text-[9px] xl:text-[10px] uppercase text-black">SYNTH PROFILE</span>
                        <span className="text-black text-xs tracking-widest">★★★★★</span>
                      </div>

                      <div className="p-3 xl:p-4 flex-1 flex flex-col bg-white text-black relative z-0">
                        <div className="border-[3px] border-black p-3 mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] transition-colors duration-300 hover:bg-gray-50">
                          <p className="font-space-mono text-[10px] xl:text-[11px] font-bold text-gray-800 leading-relaxed">
                            Custom acoustic resonance profile loaded and synthesized. Ready for deployment.
                          </p>
                        </div>
                        
                        <div className="mt-auto flex flex-col gap-2">
                          <button
                            onClick={() => { playSound('equip'); onSelectCustomProfile(profile); }}
                            className="w-full py-2.5 bg-[#f97316] border-[3px] border-black text-black text-xs xl:text-sm font-black font-orbitron shadow-[3px_3px_0px_0px_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all duration-300 ease-out tracking-widest hover:bg-[#fb923c]"
                          >
                            LOAD PROFILE
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div> 
            </div>
          ) : (
            <div 
              className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#11131a] opacity-0"
              style={{ animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both 0.3s' }}
            >
              <div className="w-16 h-16 border-[4px] border-black bg-[#1e2230] flex items-center justify-center mb-6 shadow-[6px_6px_0px_0px_#000] -skew-x-6 transition-transform duration-500 hover:scale-110">
                <BookOpen size={24} className="text-gray-400 skew-x-6" />
              </div>
              <p className="font-orbitron font-black text-lg text-white uppercase tracking-widest border-b-[4px] border-black pb-2 drop-shadow-[2px_2px_0px_#000]">Awaiting Selection</p>
              <p className="font-space-mono font-bold text-gray-400 mt-4 text-xs">Select an item from the archive to inspect.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL - Comic Panel Style */}
      {selectedHintInstrument && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
        >
          <div 
            className="w-full max-w-sm bg-white border-[6px] border-black shadow-[12px_12px_0px_0px_#38bdf8] flex flex-col p-6 -skew-x-2 opacity-0"
            style={{ animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}
          >
            
            <h3 className="font-orbitron font-black text-2xl text-black uppercase tracking-wider border-b-[4px] border-black pb-2 skew-x-2">
              LOCATION DATA
            </h3>
            
            <p className="font-space-mono text-sm text-[#38bdf8] font-black my-4 skew-x-2 uppercase">
              Target acquired at:
            </p>
            
            <ul className="space-y-3 font-space-mono text-sm text-black font-bold bg-gray-100 border-[4px] border-black p-4 max-h-[40vh] overflow-y-auto custom-scrollbar skew-x-2 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              {(SCANNING_LOCATIONS[selectedHintInstrument.name.toLowerCase()] || []).map((loc, i) => (
                <li key={i} className="flex items-start gap-2 border-b-[3px] border-black/10 pb-2 last:border-0 last:pb-0">
                  <span className="text-[#38bdf8]">►</span> {loc}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => { playSound('back'); setSelectedHintInstrument(null); }}
              className="w-full mt-6 py-4 bg-black border-[4px] border-black text-white font-black font-orbitron shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all duration-300 ease-out uppercase tracking-widest skew-x-2 hover:bg-gray-800"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Smooth Keyframe Animations & Comic Scrollbar CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #11131a;
          border-left: 3px solid #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #facc15;
          border: 2px solid #000;
        }

        @keyframes slideDown {
          0% { transform: translateY(-30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideRight {
          0% { transform: translateX(-30px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes slideInRight {
          0% { transform: translateX(60px) skewX(2deg); opacity: 0; }
          60% { transform: translateX(-5px) skewX(0); opacity: 1; }
          100% { transform: translateX(0) skewX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}