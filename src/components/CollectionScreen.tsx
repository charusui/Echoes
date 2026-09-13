import { useState, useEffect } from 'react';
import {
  ArrowLeft as PxArrowLeft, BookOpen as PxBookOpen, Check as PxCheck, Flag as PxFlag, Gps as PxGps, InfoBox as PxInfoBox,
  Lock as PxLock, MapPin as PxMapPin, Music as PxMusic, Note as PxNote, Play as PxPlay, Star as PxStar,
} from 'pixelarticons/react';
import { PixelBar, PixelButton, PixelChip, PixelIconButton, PixelModal, PixelPanel, PixelTabs, SectionLabel, type PixelChipTone } from './ui';
import { playUiSound } from '../hooks/useUiSound';
import { cn } from '../lib/cn';
import { useProgress } from '../context/ProgressProvider';
import { IMAGE_BASE, MASTER_INSTRUMENTS, FIELD_MISSION_INSTRUMENTS, KORLONG_INSTRUMENT } from '../constants';

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

const TYPE_TONE: Record<string, PixelChipTone> = {
  string: 'string',
  percussion: 'perc',
  woodwind: 'wood',
  brass: 'brass',
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

  const playSound = playUiSound;

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

  const regionTabs = [
    { id: 'Western Visayas', label: 'Western', stats: westStats },
    { id: 'Central Visayas', label: 'Central', stats: centralStats },
    { id: 'Eastern Visayas', label: 'Eastern', stats: eastStats },
  ] as const;

  return (
    <div className="h-screen w-full bg-plum-950 text-parchment-100 flex flex-col relative overflow-hidden pb-safe z-0">

      {/* HEADER */}
      <header className="relative z-10 px-3 md:px-6 pt-10 pb-3 md:pt-4 flex items-center justify-between gap-3 border-b-[3px] border-ink bg-plum-900 shrink-0">
        <PixelIconButton icon={<PxArrowLeft />} label="Back" sound="click" onClick={onBack} />
        <h1 className="flex items-center gap-2 font-bold text-2xl md:text-3xl leading-none">
          <PxBookOpen className="size-6 text-gold-300" aria-hidden />
          Harmonydex
        </h1>
        <div className="px-frame px-frame-inset px-frame-sm px-3 py-2" aria-label={`${totalUnlocked} of ${totalInstruments} discovered`}>
          <span className="font-label text-base leading-none text-gold-300">{totalUnlocked}/{totalInstruments}</span>
        </div>
      </header>

      {/* SPLIT-PANE LAYOUT */}
      <div className="flex-1 flex overflow-hidden relative z-10">

        {/* LEFT PANE */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PixelTabs
            className="shrink-0 px-3 md:px-6 pt-3 bg-plum-900 border-b-[3px] border-ink"
            value={activeTab}
            onChange={setActiveTab}
            sound="pop"
            tabs={regionTabs.map(t => ({
              id: t.id,
              label: t.label,
              badge: <span className="text-xs leading-none text-parchment-500">{t.stats.unlocked}/{t.stats.total}</span>,
            }))}
          />

          <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5 pb-24 md:pb-6">
            <div key={activeTab} className="flex flex-col gap-8 px-fade-in">

              {/* INSTRUMENT CARDS */}
              <section className="flex flex-col gap-3">
                <SectionLabel>{activeTab}</SectionLabel>
                <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {regionInstruments.map((inst) => {
                    const unlocked = isUnlocked(inst.id, inst.name);
                    const isSelected = activeDetail?.type === 'master' && activeDetail.data.id === inst.id;

                    return (
                      <li key={inst.id}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            playSound('click');
                            setActiveDetail({ type: 'master', data: inst });
                          }}
                          className={cn(
                            'px-frame w-full aspect-[3/4] flex flex-col overflow-hidden text-left focus-visible:outline-[3px] focus-visible:outline-gold-300',
                            isSelected ? 'px-frame-parchment' : 'px-frame-plum hover:brightness-110',
                          )}
                        >
                          <div className="flex-1 min-h-0 relative bg-plum-950 border-b-[3px] border-ink overflow-hidden">
                            <img
                              src={unlocked ? `${IMAGE_BASE}${inst.id}.png?v=2` : `${IMAGE_BASE}locked_${inst.id}.png?v=2`}
                              alt=""
                              className={cn('w-full h-full object-cover', !unlocked && 'opacity-40 grayscale')}
                            />
                          </div>
                          <div className="shrink-0 flex items-center justify-between gap-2 px-2 py-2">
                            <span className={cn('truncate font-semibold text-sm leading-none', isSelected ? 'text-ink' : unlocked ? 'text-parchment-100' : 'text-parchment-500')}>
                              {unlocked ? inst.name : '???'}
                            </span>
                            {unlocked
                              ? <PxCheck className={cn('size-4 shrink-0', isSelected ? 'text-heal-dark' : 'text-heal')} aria-label="Discovered" />
                              : <PxLock className="size-4 shrink-0 text-parchment-500" aria-label="Locked" />}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* FIELD MISSIONS */}
              {regionFieldMissions.length > 0 && (
                <section className="flex flex-col gap-3">
                  <SectionLabel className="flex items-center gap-2"><PxFlag className="size-4" aria-hidden />Field missions</SectionLabel>
                  <p className="-mt-1 text-sm text-parchment-500">Unverified instruments. Scan one in the field to submit it.</p>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {regionFieldMissions.map((inst) => {
                      const unlocked = isUnlocked(inst.id, inst.name);
                      return (
                        <li key={inst.id} className="px-frame px-frame-inset aspect-square relative flex flex-col overflow-hidden">
                          <img
                            src={unlocked ? `${IMAGE_BASE}${inst.id}.png?v=2` : `${IMAGE_BASE}locked_${inst.id}.png?v=2`}
                            alt=""
                            className={cn('absolute inset-0 w-full h-full object-cover', unlocked ? 'opacity-80' : 'opacity-30 grayscale')}
                          />
                          <div className="relative mt-auto flex items-center justify-between gap-2 p-2 bg-plum-950/85 border-t-[3px] border-ink">
                            <span className="truncate text-sm font-semibold leading-none text-parchment-100">{unlocked ? inst.name : '???'}</span>
                            {unlocked ? (
                              <PixelChip tone="heal" icon={<PxCheck />}>Found</PixelChip>
                            ) : (
                              <PixelButton size="sm" sound="scan" onClick={onOpenScanner} className="min-h-8 px-2 text-xs">Submit</PixelButton>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* LEGENDARY */}
              {activeTab === 'Eastern Visayas' && (
                <section className="flex flex-col gap-3">
                  <SectionLabel tone="gold" className="flex items-center gap-2"><PxStar className="size-4" aria-hidden />Legendary · GPS hunt only</SectionLabel>
                  <PixelPanel frame="wood" padding="lg">
                    <div className="flex items-center gap-4">
                      <div className="px-frame px-frame-inset size-16 shrink-0 overflow-hidden">
                        <img
                          src={korlongUnlocked ? `${IMAGE_BASE}${KORLONG_INSTRUMENT.id}.png?v=2` : `${IMAGE_BASE}locked_${KORLONG_INSTRUMENT.id}.png?v=2`}
                          alt=""
                          className={cn('w-full h-full object-cover', !korlongUnlocked && 'opacity-40 grayscale')}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl leading-none text-parchment-100">
                          {korlongUnlocked ? KORLONG_INSTRUMENT.name : 'Unknown signal'}
                        </h3>
                        <p className="mt-2 text-sm leading-snug text-parchment-300">
                          {korlongUnlocked
                            ? KORLONG_INSTRUMENT.hint
                            : 'Critically endangered and impossible to scan. Only GPS proximity reveals this instrument.'}
                        </p>
                      </div>
                    </div>
                    <PixelButton fullWidth className="mt-4" icon={<PxGps />} sound="legendary" onClick={onOpenKorlongHunt}>
                      {korlongUnlocked ? 'Hunt Again' : 'Start Hunt'}
                    </PixelButton>
                  </PixelPanel>
                </section>
              )}

              {/* SOUNDPRINTS */}
              <section className="flex flex-col gap-3">
                <SectionLabel className="flex items-center gap-2"><PxMusic className="size-4" aria-hidden />Soundprints</SectionLabel>
                {hasCustomProfiles ? (
                  <ul className="flex flex-col gap-2">
                    {customProfileKeys.map((key) => {
                      const profile = progress.customProfiles[key];
                      const instName = profile.instrument?.name || key;
                      const synthType = profile.acoustic?.synthesisType || 'Unknown';
                      const category = profile.instrument?.category || 'Percussion';
                      const isSelected = activeDetail?.type === 'custom' && activeDetail.data === profile;

                      return (
                        <li key={key}>
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => { playSound('click'); setActiveDetail({ type: 'custom', data: profile }); }}
                            className={cn(
                              'px-frame w-full flex items-center justify-between gap-3 p-3 text-left focus-visible:outline-[3px] focus-visible:outline-gold-300',
                              isSelected ? 'px-frame-parchment' : 'px-frame-plum hover:brightness-110',
                            )}
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              <span className="shrink-0 size-10 flex items-center justify-center border-[3px] border-ink bg-plum-950 text-parchment-300">
                                <PxMusic className="size-5" aria-hidden />
                              </span>
                              <span className="min-w-0">
                                <span className={cn('block truncate font-semibold text-base leading-none', isSelected ? 'text-ink' : 'text-parchment-100')}>{instName}</span>
                                <span className={cn('block mt-1 text-xs leading-none', isSelected ? 'text-wood-700' : 'text-parchment-500')}>{category}</span>
                              </span>
                            </span>
                            <PixelChip tone="dark">{synthType}</PixelChip>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-frame px-frame-inset flex flex-col items-center gap-2 p-6 text-center">
                    <PxNote className="size-8 text-parchment-500" aria-hidden />
                    <p className="font-semibold text-base text-parchment-100">No soundprints yet</p>
                    <p className="text-sm text-parchment-500">Scan an instrument to create its soundprint.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Details Inspector */}
        <aside
          className={cn(
            'absolute inset-y-0 right-0 z-40 md:relative md:z-auto w-full md:w-[380px] lg:w-[420px] shrink-0',
            'bg-plum-900 border-l-[3px] border-ink flex flex-col transition-transform duration-300 ease-out',
            activeDetail ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
          )}
        >
          <div className="md:hidden flex items-center p-3 border-b-[3px] border-ink shrink-0">
            <PixelButton size="sm" icon={<PxArrowLeft />} sound="back" onClick={() => setActiveDetail(null)}>
              Back
            </PixelButton>
          </div>

          {activeDetail ? (
            <div key={activeDetail.type + (activeDetail.data.id || activeDetail.data.name)} className="flex-1 overflow-y-auto p-3 xl:p-4 px-rise-in">

              {activeDetail.type === 'master' && (() => {
                const inst = activeDetail.data;
                const isUnlocked = unlockedList.includes(inst.id.toLowerCase()) || unlockedList.includes(inst.name.toLowerCase());
                const stats = getHarmonydexStats(inst);
                const hasLocations = (SCANNING_LOCATIONS[inst.name.toLowerCase()] || []).length > 0;

                return (
                  <PixelPanel frame="wood" padding="none" className="flex flex-col min-h-full">
                    <div className="flex items-center justify-between gap-2 px-3 py-3 bg-plum-800 border-b-[3px] border-ink">
                      <h2 className={cn('font-bold text-xl xl:text-2xl leading-none line-clamp-1', isUnlocked ? 'text-parchment-100' : 'text-parchment-500')}>
                        {isUnlocked ? inst.name : 'Undiscovered'}
                      </h2>
                      {hasLocations && (
                        <PixelIconButton
                          className="size-9 shrink-0"
                          icon={<PxMapPin />}
                          label="Where to find it"
                          sound="pop"
                          onClick={() => setSelectedHintInstrument(inst)}
                        />
                      )}
                    </div>

                    <div className="relative h-[170px] xl:h-[190px] bg-plum-950 border-b-[3px] border-ink overflow-hidden">
                      <img
                        src={isUnlocked ? `${IMAGE_BASE}${inst.id}.png?v=2` : `${IMAGE_BASE}locked_${inst.id}.png?v=2`}
                        className={cn('w-full h-full object-cover', !isUnlocked && 'opacity-40 grayscale')}
                        alt={inst.name}
                      />
                      <PixelChip tone={TYPE_TONE[stats.type] ?? 'synth'} className="absolute top-2 left-2">{stats.type}</PixelChip>
                    </div>

                    <div className="p-3 xl:p-4 flex-1 flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <PixelBar kind="hp" height={8} value={stats.dmg} max={60} label="Damage" valueText={stats.dmg} />
                        <PixelBar kind="xp" height={8} value={stats.skillCost} max={4} segments={25} label="Skill cost" valueText={`${stats.skillCost} AP`} />
                      </div>

                      {isUnlocked ? (
                        <PixelPanel frame="parchment" padding="sm" title="Lore">
                          <p className={cn('text-sm leading-snug text-ink', !isInfoExpanded && 'line-clamp-3')}>{inst.hint}</p>
                          {isInfoExpanded && inst.extendedInfo && (
                            <p className="mt-2 pt-2 border-t-2 border-parchment-300 text-sm leading-snug text-wood-700">{inst.extendedInfo}</p>
                          )}
                          {inst.extendedInfo && !isInfoExpanded && (
                            <button
                              type="button"
                              onClick={() => { playSound('pop'); setIsInfoExpanded(true); }}
                              className="mt-2 text-sm font-semibold text-wood-700 underline decoration-2 underline-offset-4 hover:text-ink"
                            >
                              Read more
                            </button>
                          )}
                        </PixelPanel>
                      ) : (
                        <p className="px-frame px-frame-inset px-frame-sm flex gap-2 px-3 py-2 text-sm leading-snug text-parchment-300">
                          <PxInfoBox className="size-4 shrink-0 text-gold-300" aria-hidden />
                          {inst.hint}
                        </p>
                      )}

                      <PixelPanel frame="inset" padding="sm" title="Ultimate" titleAction={<PixelChip tone="xp">{stats.skillCost} AP</PixelChip>}>
                        <p className="font-semibold text-base leading-tight text-parchment-100">{stats.skillName}</p>
                        <p className="mt-1 text-sm leading-snug text-parchment-300">{stats.skillDesc}</p>
                      </PixelPanel>

                      {isUnlocked && (
                        <div className="mt-auto flex flex-col gap-2">
                          <PixelButton variant="primary" fullWidth icon={<PxPlay />} sound="equip" onClick={() => onSelectInstrument(inst.name)}>
                            Equip & Play
                          </PixelButton>
                          <PixelButton fullWidth icon={<PxMusic />} sound="pop" onClick={() => onTryOut?.(inst.name)}>
                            Try Out
                          </PixelButton>
                        </div>
                      )}
                    </div>
                  </PixelPanel>
                );
              })()}

              {activeDetail.type === 'custom' && (() => {
                const profile = activeDetail.data;
                return (
                  <PixelPanel frame="wood" padding="none" className="flex flex-col min-h-full">
                    <div className="px-3 py-3 bg-plum-800 border-b-[3px] border-ink">
                      <h2 className="font-bold text-xl xl:text-2xl leading-none text-parchment-100 line-clamp-1">{profile.instrument?.name}</h2>
                    </div>
                    <div className="h-[170px] bg-plum-950 border-b-[3px] border-ink flex items-center justify-center">
                      <PxMusic className="size-16 text-plum-600" aria-hidden />
                    </div>
                    <div className="p-3 xl:p-4 flex-1 flex flex-col gap-4">
                      <PixelChip tone="synth" className="self-start">Soundprint</PixelChip>
                      <p className="text-sm leading-snug text-parchment-300">
                        Custom acoustic profile synthesized from your scan. Load it to play this instrument.
                      </p>
                      <PixelButton variant="primary" fullWidth className="mt-auto" sound="equip" onClick={() => onSelectCustomProfile(profile)}>
                        Load Soundprint
                      </PixelButton>
                    </div>
                  </PixelPanel>
                );
              })()}
            </div>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="px-frame px-frame-inset size-16 flex items-center justify-center">
                <PxBookOpen className="size-7 text-parchment-500" aria-hidden />
              </div>
              <p className="font-semibold text-lg text-parchment-100">Select an instrument</p>
              <p className="text-sm text-parchment-500">Its stats, lore and ultimate appear here.</p>
            </div>
          )}
        </aside>
      </div>

      {/* WHERE TO FIND IT */}
      {selectedHintInstrument && (
        <PixelModal
          onClose={() => setSelectedHintInstrument(null)}
          title="Where to find it"
          subtitle={selectedHintInstrument.name}
          icon={<PxMapPin />}
          maxWidth="max-w-md"
          closeSound="back"
          footer={<PixelButton variant="primary" sound="back" onClick={() => setSelectedHintInstrument(null)}>Done</PixelButton>}
        >
          <ul className="flex flex-col gap-2">
            {(SCANNING_LOCATIONS[selectedHintInstrument.name.toLowerCase()] || []).map((loc, i) => (
              <li key={i} className="px-frame px-frame-inset px-frame-sm flex items-start gap-2 px-3 py-2 text-sm leading-snug text-parchment-100">
                <PxMapPin className="size-4 shrink-0 mt-0.5 text-gold-300" aria-hidden />
                {loc}
              </li>
            ))}
          </ul>
        </PixelModal>
      )}
    </div>
  );
}
