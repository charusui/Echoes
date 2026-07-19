import { useState, useEffect } from 'react';
import { ChevronLeft, BookOpen, Music, Tag, FileText, CheckCircle, HelpCircle, Flag, Star, Volume2 } from 'lucide-react';
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

// Updated verified scanning locations matching the new confirmed dataset
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
}

export function CollectionScreen({ onBack, onSelectInstrument, onSelectCustomProfile, onOpenKorlongHunt, onOpenScanner }: CollectionScreenProps) {
  const { progress } = useProgress();
  const [activeTab, setActiveTab] = useState<'Western Visayas' | 'Central Visayas' | 'Eastern Visayas'>('Western Visayas');
  const [selectedHintInstrument, setSelectedHintInstrument] = useState<any | null>(null);
  const [activeDetail, setActiveDetail] = useState<{ type: 'master' | 'custom', data: any } | null>(null);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  useEffect(() => {
    setIsInfoExpanded(false);
  }, [activeDetail]);

  const regionInstruments = MASTER_INSTRUMENTS.filter(inst => inst.region === activeTab);
  const regionFieldMissions = FIELD_MISSION_INSTRUMENTS.filter(inst => inst.region === activeTab);
  
  // Total includes verified + field missions + Korlong
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
    // Base Container - Dark Slate
    <div className="h-screen w-full bg-[#2a2d43] flex flex-col relative overflow-hidden pb-safe z-0">
      
      {/* Halftone Background Overlay */}
      <div 
        className="absolute inset-0 z-[-2] opacity-20 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />
      
      {/* Decorative Speed Slashes */}
      <div className="absolute top-0 right-0 w-[40%] h-full bg-[#0f0c0c] -skew-x-12 translate-x-32 z-[-1] opacity-50" />

      {/* HEADER */}
      <div className="relative z-10 px-4 md:px-6 pt-12 pb-4 flex items-center justify-between border-b-[6px] border-[#0f0c0c] bg-[#da2d46] shrink-0 shadow-[0px_8px_0px_0px_#0f0c0c]">
        
        {/* Tactile Back Button */}
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-[#e0e5ed] border-4 border-[#0f0c0c] flex items-center justify-center text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_#0f0c0c] transition-all -skew-x-6"
        >
          <ChevronLeft size={24} className="skew-x-6 stroke-[3px]" />
        </button>

        {/* Chromatic Title */}
        <h1 
          className="font-orbitron text-xl md:text-2xl font-black tracking-widest text-[#e0e5ed] uppercase"
          style={{ textShadow: '3px 3px 0px #0f0c0c, -2px 0px 0px #f0dde0' }}
        >
          HARMONYDEX
        </h1>

        {/* Counter Badge */}
        <div className="px-3 h-10 flex items-center justify-center bg-[#0f0c0c] border-4 border-[#e0e5ed] text-[#f0dde0] font-space-mono text-sm font-bold shrink-0 -skew-x-6 shadow-[4px_4px_0px_0px_rgba(15,12,12,0.5)]">
          <span className="skew-x-6">{totalUnlocked}/{totalInstruments}</span>
        </div>
      </div>

      {/* SPLIT-PANE LAYOUT */}
      <div className="flex-1 flex overflow-hidden relative z-10 mt-2">
        
        {/* LEFT PANE: Grid & Lists */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#2a2d43]">
          
          {/* Region Tabs - Skewed Comic Style */}
          <div className="px-2 md:px-6 py-4 grid grid-cols-3 gap-2 shrink-0 border-b-[4px] border-[#0f0c0c] bg-[#e0e5ed]">
            {[
              { name: 'Western Visayas', label: 'WESTERN', stats: westStats },
              { name: 'Central Visayas', label: 'CENTRAL', stats: centralStats },
              { name: 'Eastern Visayas', label: 'EASTERN', stats: eastStats }
            ].map((tab) => (
              <button 
                key={tab.name}
                onClick={() => setActiveTab(tab.name as any)}
                className={`p-2 border-[4px] border-[#0f0c0c] -skew-x-6 flex flex-col items-center justify-center gap-1 transition-all ${
                  activeTab === tab.name 
                    ? 'bg-[#da2d46] shadow-[4px_4px_0px_0px_#0f0c0c] translate-y-[-2px]' 
                    : 'bg-[#2a2d43] hover:bg-[#0f0c0c] active:translate-y-1'
                }`}
              >
                <span className={`font-orbitron text-[9px] font-black tracking-wider skew-x-6 ${activeTab === tab.name ? 'text-[#0f0c0c]' : 'text-[#e0e5ed]'}`}>
                  {tab.label}
                </span>
                <span className={`font-space-mono text-xs font-black skew-x-6 ${activeTab === tab.name ? 'text-[#e0e5ed]' : 'text-[#888ea1]'}`}>
                  {tab.stats.unlocked}/{tab.stats.total}
                </span>
              </button>
            ))}
          </div>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-8 custom-scrollbar pb-24 md:pb-6 relative">
            
            {/* Instruments Grid Area */}
            <div>
              <div className="inline-block bg-[#0f0c0c] border-[3px] border-[#da2d46] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#da2d46] mb-6">
                <h2 className="font-orbitron text-sm font-black tracking-widest text-[#f0dde0] skew-x-6 uppercase flex items-center gap-2">
                  <BookOpen size={16} className="text-[#da2d46]" />
                  {activeTab.toUpperCase()}
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {regionInstruments.map(inst => {
                  const unlocked = isUnlocked(inst.id, inst.name);
                  const isSelected = activeDetail?.type === 'master' && activeDetail.data.id === inst.id;
                  
                  return (
                    <button 
                      key={inst.id}
                      onClick={() => setActiveDetail({ type: 'master', data: inst })}
                      className={`aspect-square border-[4px] transition-all duration-200 relative group overflow-hidden ${
                        isSelected 
                          ? 'border-[#f0dde0] bg-[#da2d46] shadow-[6px_6px_0px_0px_#0f0c0c] translate-y-1 translate-x-1' 
                          : unlocked 
                            ? 'border-[#0f0c0c] bg-[#e0e5ed] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c]' 
                            : 'border-[#0f0c0c] bg-[#2a2d43] shadow-[4px_4px_0px_0px_#0f0c0c] opacity-80 hover:bg-[#0f0c0c]'
                      }`}
                    >
                      {unlocked && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #0f0c0c 10px, #0f0c0c 12px)' }} />}
                      
                      <img 
                        src={unlocked ? `${IMAGE_BASE}${inst.id}.png` : `${IMAGE_BASE}locked_${inst.id}.png`} 
                        alt={inst.name}
                        className={`w-full h-full object-contain p-4 relative z-10 transition-transform duration-300 ${
                          unlocked ? 'drop-shadow-[4px_4px_0px_#0f0c0c] group-hover:scale-110' : 'opacity-40 grayscale'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* ── Field Mission Ghost Cards ── */}
              {regionFieldMissions.length > 0 && (
                <div className="mt-6">
                  <div className="inline-block bg-[#0f0c0c] border-[3px] border-[#888ea1] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#888ea1] mb-4">
                    <h3 className="font-orbitron text-xs font-black tracking-widest text-[#888ea1] skew-x-6 uppercase flex items-center gap-2">
                      <Flag size={13} className="text-[#888ea1]" />
                      FIELD MISSIONS — UNVERIFIED
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {regionFieldMissions.map(inst => {
                      const unlocked = isUnlocked(inst.id, inst.name);
                      return (
                        <div key={inst.id} className="aspect-square border-[4px] border-dashed border-[#888ea1] bg-[#0f0c0c] relative flex flex-col items-center justify-center p-3 gap-2">
                          {/* Silhouette */}
                          <img
                            src={`${IMAGE_BASE}locked_${inst.id}.png`}
                            alt={inst.name}
                            className="w-14 h-14 object-contain opacity-20 grayscale"
                          />
                          <div className="text-center">
                            <p className="font-orbitron font-black text-[9px] text-[#888ea1] tracking-widest uppercase leading-tight">
                              {unlocked ? inst.name : '???'}
                            </p>
                          </div>
                          {/* Field Mission badge */}
                          <div className="absolute top-1 left-1 bg-[#888ea1] border-[2px] border-[#0f0c0c] px-1 py-0 -skew-x-6">
                            <span className="font-space-mono text-[7px] font-black text-[#0f0c0c] skew-x-6 block">⚑ FIELD</span>
                          </div>
                          {!unlocked && (
                            <button
                              onClick={onOpenScanner}
                              className="absolute bottom-1 right-1 bg-[#2a2d43] border-[2px] border-[#888ea1] px-1 py-0 font-space-mono text-[7px] font-black text-[#888ea1] hover:border-[#da2d46] hover:text-[#da2d46] transition-colors"
                            >
                              SUBMIT
                            </button>
                          )}
                          {unlocked && (
                            <div className="absolute bottom-1 right-1 bg-[#da2d46] border-[2px] border-[#0f0c0c] px-1 py-0">
                              <span className="font-space-mono text-[7px] font-black text-[#0f0c0c]">✓ FOUND</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Cryptic hint for first field mission in region */}
                  {regionFieldMissions[0] && !isUnlocked(regionFieldMissions[0].id, regionFieldMissions[0].name) && (
                    <div className="mt-3 bg-[#0f0c0c] border-[3px] border-dashed border-[#888ea1] p-3">
                      <p className="font-space-mono text-[10px] text-[#888ea1] italic leading-relaxed">
                        {regionFieldMissions[0].crypticHint}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Korlong Legendary Card (Eastern Visayas only) ── */}
              {activeTab === 'Eastern Visayas' && (
                <div className="mt-6">
                  <div className="inline-block bg-[#0f0c0c] border-[3px] border-[#da2d46] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#da2d46] mb-4">
                    <h3 className="font-orbitron text-xs font-black tracking-widest text-[#da2d46] skew-x-6 uppercase flex items-center gap-2">
                      <Star size={13} className="text-[#da2d46]" />
                      LEGENDARY — GPS HUNT ONLY
                    </h3>
                  </div>
                  <div
                    className="border-[4px] border-[#da2d46] bg-[#0f0c0c] p-4 shadow-[6px_6px_0px_0px_#da2d46] relative overflow-hidden"
                    style={{ backgroundImage: 'radial-gradient(rgba(218,45,70,0.08) 1px, transparent 1px)', backgroundSize: '10px 10px' }}
                  >
                    {/* Animated pulse border */}
                    <div className="absolute inset-0 border-[3px] border-[#da2d46] opacity-30 animate-pulse" />

                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border-[3px] border-[#da2d46] flex items-center justify-center shrink-0 bg-[#2a2d43]">
                        <img
                          src={`${IMAGE_BASE}locked_${KORLONG_INSTRUMENT.id}.png`}
                          alt={KORLONG_INSTRUMENT.name}
                          className={`w-12 h-12 object-contain ${korlongUnlocked ? 'opacity-100' : 'opacity-30 grayscale'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-orbitron font-black text-lg text-[#da2d46] tracking-widest uppercase">
                            {korlongUnlocked ? KORLONG_INSTRUMENT.name : '???'}
                          </h3>
                          <span className="inline-block bg-[#da2d46] border-[2px] border-[#0f0c0c] px-2 py-0 font-space-mono text-[8px] font-black text-[#0f0c0c] -skew-x-6">
                            <span className="skew-x-6 block">★ LEGENDARY</span>
                          </span>
                        </div>
                        <p className="font-space-mono text-[10px] text-[#888ea1] mt-1 leading-relaxed">
                          {korlongUnlocked
                            ? KORLONG_INSTRUMENT.hint
                            : 'Critically endangered. Cannot be scanned. Only GPS proximity reveals this instrument.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={onOpenKorlongHunt}
                      className={`w-full mt-4 py-3 border-[4px] border-[#0f0c0c] font-orbitron font-black text-sm tracking-widest uppercase -skew-x-6 shadow-[4px_4px_0px_0px_#0f0c0c] transition-all flex items-center justify-center gap-2 ${
                        korlongUnlocked
                          ? 'bg-[#e0e5ed] text-[#0f0c0c] hover:bg-[#da2d46]'
                          : 'bg-[#da2d46] text-[#0f0c0c] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-1 active:shadow-none'
                      }`}
                    >
                      <Star size={16} className="skew-x-6" />
                      <span className="skew-x-6">{korlongUnlocked ? 'HUNT AGAIN' : 'START HUNT'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Profiles Area */}
            <div>
              <div className="inline-block bg-[#0f0c0c] border-[3px] border-[#e0e5ed] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#e0e5ed] mb-6">
                <h2 className="font-orbitron text-sm font-black tracking-widest text-[#e0e5ed] skew-x-6 uppercase flex items-center gap-2">
                  <Music size={16} className="text-[#da2d46]" />
                  SOUNDPRINTS
                </h2>
              </div>

              {hasCustomProfiles ? (
                <div className="space-y-4">
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
                        className={`w-full p-4 border-[4px] border-[#0f0c0c] flex items-center justify-between text-left transition-all ${
                          isSelected 
                            ? 'bg-[#da2d46] shadow-[0px_0px_0px_0px_#0f0c0c] translate-y-1 translate-x-1' 
                            : 'bg-[#f0dde0] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 border-[3px] border-[#0f0c0c] flex items-center justify-center -skew-x-6 bg-[#0f0c0c] text-[#f0dde0]`}>
                            <Tag size={20} className="skew-x-6" />
                          </div>
                          <div>
                            <h4 className={`font-orbitron font-black text-lg ${isSelected ? 'text-[#0f0c0c]' : 'text-[#0f0c0c]'}`}>{instName}</h4>
                            <p className="font-space-mono text-[10px] text-[#2a2d43] uppercase font-bold tracking-widest">{category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-3 py-1 bg-[#0f0c0c] border-2 border-[#e0e5ed] font-space-mono text-[10px] font-bold text-[#e0e5ed] uppercase -skew-x-6 shadow-[2px_2px_0px_0px_#e0e5ed]">
                            <span className="skew-x-6 block">{synthType}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#2a2d43] border-[4px] border-[#0f0c0c] p-6 text-center shadow-[6px_6px_0px_0px_#0f0c0c]">
                  <FileText size={32} className="text-[#888ea1] mx-auto mb-3" />
                  <p className="font-space-mono font-bold text-[#e0e5ed] uppercase">No Soundprints Found.</p>
                  <p className="font-space-mono text-xs text-[#888ea1] mt-1">Scan instruments to synthesize profiles.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Details Inspector */}
        <div 
          className={`
            absolute inset-y-0 right-0 z-40 md:relative md:z-auto
            w-full md:w-80 lg:w-[450px] shrink-0
            bg-[#e0e5ed] border-l-[6px] border-[#0f0c0c]
            flex flex-col shadow-[-10px_0px_0px_0px_rgba(15,12,12,0.1)]
            transition-transform duration-300 ease-in-out
            ${activeDetail ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}
        >
          {/* Mobile Back Header */}
          <div className="md:hidden flex items-center p-4 border-b-[4px] border-[#0f0c0c] bg-[#da2d46] shrink-0">
            <button 
              onClick={() => setActiveDetail(null)}
              className="flex items-center gap-2 text-[#0f0c0c] font-orbitron text-sm font-black tracking-widest bg-[#e0e5ed] border-[3px] border-[#0f0c0c] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c]"
            >
              <ChevronLeft size={16} className="skew-x-6" /> <span className="skew-x-6">BACK</span>
            </button>
          </div>

          {activeDetail ? (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
              
              {/* MASTER INSTRUMENT VIEW */}
              {activeDetail.type === 'master' && (() => {
                const inst = activeDetail.data;
                const isUnlocked = unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase());
                const stats = getHarmonydexStats(inst);

                return (
                  <>
                    {/* Hero Image Panel */}
                    <div className="bg-[#2a2d43] border-[6px] border-[#0f0c0c] flex items-center justify-center p-6 relative mb-6 shadow-[8px_8px_0px_0px_#0f0c0c] min-h-[250px]">
                      {isUnlocked && <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#f0dde0 2px, transparent 2px)', backgroundSize: '16px 16px' }} />}
                      
                      <img 
                        src={isUnlocked ? `${IMAGE_BASE}${inst.id}.png` : `${IMAGE_BASE}locked_${inst.id}.png`} 
                        className={`w-full h-full max-h-[200px] object-contain relative z-10 ${isUnlocked ? 'drop-shadow-[6px_6px_0px_#0f0c0c]' : 'opacity-40 grayscale'}`} 
                        alt={inst.name}
                      />
                      
                      {/* Hint Toggle Button */}
                      <div className="absolute -top-4 -right-4 z-20">
                        <button 
                          onClick={() => setSelectedHintInstrument(inst)}
                          className={`w-12 h-12 rounded-full border-[4px] border-[#0f0c0c] flex items-center justify-center shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all ${isUnlocked ? 'bg-[#da2d46] text-[#0f0c0c]' : 'bg-[#e0e5ed] text-[#888ea1]'}`}
                        >
                          {isUnlocked ? <CheckCircle size={24} className="stroke-[3px]" /> : <HelpCircle size={24} className="stroke-[3px]" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="bg-[#0f0c0c] border-[4px] border-[#da2d46] p-3 -skew-x-6 shadow-[4px_4px_0px_0px_#da2d46] mb-4 inline-block w-fit">
                        <h2 className={`font-orbitron font-black text-2xl tracking-wide skew-x-6 uppercase ${isUnlocked ? 'text-[#e0e5ed]' : 'text-[#888ea1]'}`}>
                          {isUnlocked ? inst.name : 'UNKNOWN'}
                        </h2>
                      </div>
                      
                      {/* Harmonydex Type & Damage Badge */}
                      <div className="mb-4">
                        <span className="px-3 py-1 bg-[#da2d46] text-white font-orbitron font-bold text-xs sm:text-sm uppercase border-[2px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] inline-block -skew-x-6">
                          <span className="skew-x-6 block">TYPE: {stats.type.toUpperCase()} | DMG: {stats.dmg}</span>
                        </span>
                      </div>

                      <span className="font-orbitron font-bold text-xs text-[#0f0c0c] uppercase tracking-wider block mb-2">
                        📜 ARCHIVAL & HARMONIC LORE
                      </span>

                      {/* Rigid Caption Box for Text */}
                      <div className="flex-1 bg-[#f0dde0] border-[4px] border-[#0f0c0c] p-4 mb-6 shadow-[6px_6px_0px_0px_#0f0c0c]">
                        {isUnlocked ? (
                          <div className="flex flex-col h-full">
                            <p className="font-space-mono text-sm text-[#0f0c0c] font-bold leading-relaxed flex-1">
                              {inst.hint}
                            </p>
                            {inst.extendedInfo && !isInfoExpanded && (
                              <div className="mt-4 text-center">
                                <button 
                                  onClick={() => setIsInfoExpanded(true)}
                                  className="inline-block font-orbitron text-xs font-black tracking-widest text-[#da2d46] uppercase hover:underline decoration-2 underline-offset-4"
                                >
                                  [ READ MORE ]
                                </button>
                              </div>
                            )}
                            {isInfoExpanded && inst.extendedInfo && (
                              <div className="mt-4 border-t-[3px] border-[#0f0c0c]/10 pt-4">
                                <p className="font-space-mono text-sm text-[#0f0c0c] font-bold leading-relaxed">
                                  {inst.extendedInfo}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="block font-orbitron text-xs text-[#da2d46] font-black uppercase tracking-wider mb-2">Location Teaser:</span>
                            <p className="font-space-mono text-sm text-[#2a2d43] leading-relaxed italic font-bold">
                              "{inst.hint}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Equipped Skill Section */}
                      <div className="mb-6">
                        <span className="font-orbitron font-bold text-xs text-[#0f0c0c] uppercase tracking-wider block mb-2">
                          ⚡ ULTIMATE ABILITY ({stats.skillName.toUpperCase()})
                        </span>
                        <div className="bg-[#151828] p-4 border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] flex flex-col gap-1.5 -skew-x-1">
                          <span className="text-xs sm:text-sm text-white font-bold leading-relaxed">{stats.skillDesc}</span>
                          <span className="text-xs text-[#facc15] font-orbitron font-black uppercase mt-1">ACTION COST: {stats.skillCost} AP</span>
                        </div>
                      </div>

                      {/* Preview Acoustic Resonance Button */}
                      <button
                        onClick={() => audioEngine.playHitSFX('sick')}
                        className="w-full py-3.5 mb-4 bg-[#4ade80] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] font-orbitron font-black text-xs sm:text-sm uppercase -skew-x-6 hover:bg-[#6bee9c] transition-all flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none"
                      >
                        <Volume2 className="w-5 h-5 skew-x-6" />
                        <span className="skew-x-6">PREVIEW ACOUSTIC RESONANCE</span>
                      </button>

                      {isUnlocked && (
                        <button 
                          onClick={() => onSelectInstrument(inst.name)}
                          className="w-full py-4 bg-[#da2d46] border-[4px] border-[#0f0c0c] text-[#0f0c0c] text-lg font-black font-orbitron shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_#0f0c0c] transition-all -skew-x-6 mt-auto"
                        >
                          <span className="skew-x-6 block tracking-widest">PLAY NOW</span>
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* CUSTOM PROFILE VIEW (Kept minimal but restyled) */}
              {activeDetail.type === 'custom' && (() => {
                const profile = activeDetail.data;
                return (
                  <div className="flex-1 flex flex-col space-y-6">
                    <h3 className="font-orbitron font-black text-2xl text-[#0f0c0c] uppercase border-b-[4px] border-[#0f0c0c] pb-2">
                      {profile.instrument?.name}
                    </h3>
                    <button
                      onClick={() => onSelectCustomProfile(profile)}
                      className="w-full py-4 mt-auto bg-[#da2d46] border-[4px] border-[#0f0c0c] text-[#0f0c0c] font-black font-orbitron shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all -skew-x-6 tracking-widest"
                    >
                      <span className="skew-x-6 block">PLAY SOUNDPRINT</span>
                    </button>
                  </div>
                );
              })()}

            </div>
          ) : (
            // Desktop Empty State
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#e0e5ed] opacity-80">
              <BookOpen size={64} className="text-[#888ea1] mb-6" />
              <p className="font-orbitron font-black text-xl text-[#0f0c0c] uppercase tracking-widest border-b-[4px] border-[#0f0c0c] pb-2">Awaiting Selection</p>
              <p className="font-space-mono font-bold text-[#2a2d43] mt-4">Select an item from the archive to inspect.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL - Comic Panel Style */}
      {selectedHintInstrument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0f0c0c]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#f0dde0] border-[6px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#da2d46] flex flex-col p-6 -skew-x-2">
            
            <h3 className="font-orbitron font-black text-2xl text-[#0f0c0c] uppercase tracking-wider border-b-[4px] border-[#0f0c0c] pb-2 skew-x-2">
              LOCATION DATA
            </h3>
            
            <p className="font-space-mono text-sm text-[#da2d46] font-black my-4 skew-x-2 uppercase">
              Target acquired at:
            </p>
            
            <ul className="space-y-3 font-space-mono text-sm text-[#e0e5ed] font-bold bg-[#2a2d43] border-[4px] border-[#0f0c0c] p-4 max-h-[40vh] overflow-y-auto custom-scrollbar skew-x-2 shadow-inner">
              {(SCANNING_LOCATIONS[selectedHintInstrument.name.toLowerCase()] || []).map((loc, i) => (
                <li key={i} className="flex items-start gap-2 border-b border-[#888ea1]/30 pb-2 last:border-0 last:pb-0">
                  <span className="text-[#da2d46]">►</span> {loc}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => setSelectedHintInstrument(null)}
              className="w-full mt-6 py-3 bg-[#0f0c0c] border-[4px] border-[#0f0c0c] text-[#e0e5ed] font-black font-orbitron shadow-[6px_6px_0px_0px_rgba(15,12,12,0.3)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all uppercase tracking-widest skew-x-2"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Sharp Comic Scrollbar CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #2a2d43;
          border-left: 2px solid #0f0c0c;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #da2d46;
          border: 2px solid #0f0c0c;
        }
      `}</style>
    </div>
  );
}