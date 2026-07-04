import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Play, Star, Trophy, ArrowLeft, Music, Activity, Shuffle, Settings, Lock } from 'lucide-react';
import type { ActiveInstrumentProfile, Difficulty } from '../types';

interface RhythmDifficultySelectProps {
  profile: ActiveInstrumentProfile;
  onSelectDifficulty: (diff: Difficulty, version: 'v1' | 'v2') => void;
  onBack: () => void;
}

interface BeatmapOption {
  id: string;
  diff: Difficulty;
  version: 'v1' | 'v2';
  title: string;
  subtitle: string;
  artist: string;
  mapper: string;
  stars: number;
  speed: string;
  bpm: string;
  length: string;
  objects: number;
  color: string;
  borderColor: string;
  accentHex: string;
  locked?: boolean;
}

interface LeaderboardScore {
  rank: number;
  name: string;
  score: number;
  accuracy: number;
  combo: number;
  grade: 'SS' | 'S' | 'A' | 'B';
  mods: string[];
  isPlayer?: boolean;
  avatarBg?: string;
}

export function RhythmDifficultySelect({ profile, onSelectDifficulty, onBack }: RhythmDifficultySelectProps) {
  const category = profile.instrument.category;
  const isMasteryUnlocked = localStorage.getItem(`mastery_unlocked_${category}`) === 'true';

  // Build the list of beatmaps available for this instrument category
  const beatmaps: BeatmapOption[] = useMemo(() => {
    const list: BeatmapOption[] = [
      {
        id: 'apprentice-v1',
        diff: 'apprentice',
        version: 'v1',
        title: 'APPRENTICE (V1)',
        subtitle: 'Visayan Heritage Ensemble',
        artist: 'Kulintang & Bamboo Winds',
        mapper: 'Mapped by Lakan',
        stars: 1.5,
        speed: 'Slow',
        bpm: '90 BPM',
        length: '01:00',
        objects: 60,
        color: 'bg-[#10b981] text-[#0f0c0c]',
        borderColor: 'border-[#0f0c0c]',
        accentHex: '#10b981'
      },
      {
        id: 'apprentice-v2',
        diff: 'apprentice',
        version: 'v2',
        title: 'APPRENTICE (V2)',
        subtitle: 'Visayan Heritage Ensemble',
        artist: 'Kulintang & Bamboo Winds',
        mapper: 'Mapped by Bituin',
        stars: 1.8,
        speed: 'Slow',
        bpm: '95 BPM',
        length: '01:05',
        objects: 72,
        color: 'bg-[#06b6d4] text-[#0f0c0c]',
        borderColor: 'border-[#0f0c0c]',
        accentHex: '#06b6d4'
      },
      {
        id: 'musician-v1',
        diff: 'musician',
        version: 'v1',
        title: 'MUSICIAN (V1)',
        subtitle: 'Tultugan Rhythm Masters',
        artist: 'Percussion & String Weavers',
        mapper: 'Mapped by Ani',
        stars: 2.8,
        speed: 'Medium',
        bpm: '120 BPM',
        length: '01:15',
        objects: 140,
        color: 'bg-[#f59e0b] text-[#0f0c0c]',
        borderColor: 'border-[#0f0c0c]',
        accentHex: '#f59e0b'
      }
    ];

    if (category === 'percussion' || category === 'string') {
      list.push({
        id: 'musician-v2',
        diff: 'musician',
        version: 'v2',
        title: 'MUSICIAN (V2)',
        subtitle: 'Tultugan Rhythm Masters',
        artist: 'Percussion & String Weavers',
        mapper: 'Mapped by Yumi',
        stars: 3.2,
        speed: 'Medium',
        bpm: '130 BPM',
        length: '01:20',
        objects: 165,
        color: 'bg-[#f97316] text-[#0f0c0c]',
        borderColor: 'border-[#0f0c0c]',
        accentHex: '#f97316'
      });
    }

    list.push({
      id: 'virtuoso-v1',
      diff: 'virtuoso',
      version: 'v1',
      title: 'VIRTUOSO (V1)',
      subtitle: 'Kulintang & Lantoy Virtuosos',
      artist: 'Grand Visayan Orchestra',
      mapper: 'Mapped by Diwa',
      stars: 4.2,
      speed: 'Fast',
      bpm: '160 BPM',
      length: '01:30',
      objects: 240,
      color: 'bg-[#d946ef] text-[#0f0c0c]',
      borderColor: 'border-[#0f0c0c]',
      accentHex: '#d946ef'
    });

    if (category === 'wind') {
      list.push({
        id: 'virtuoso-v2',
        diff: 'virtuoso',
        version: 'v2',
        title: 'VIRTUOSO (V2)',
        subtitle: 'Kulintang & Lantoy Virtuosos',
        artist: 'Grand Visayan Orchestra',
        mapper: 'Mapped by Bayani',
        stars: 4.8,
        speed: 'Fast',
        bpm: '175 BPM',
        length: '01:35',
        objects: 280,
        color: 'bg-[#f43f5e] text-[#0f0c0c]',
        borderColor: 'border-[#0f0c0c]',
        accentHex: '#f43f5e'
      });
    }

    list.push({
      id: 'mastery',
      diff: 'mastery',
      version: 'v1',
      title: 'MASTERY (ENDLESS)',
      subtitle: 'Ancient Visayan Legends',
      artist: 'Mythic Bathala Ensemble',
      mapper: 'Mapped by Bathala',
      stars: 6.5,
      speed: 'Extreme',
      bpm: '200+ BPM',
      length: 'Endless',
      objects: 999,
      color: 'bg-[#8b5cf6] text-white',
      borderColor: 'border-[#0f0c0c]',
      accentHex: '#8b5cf6',
      locked: !isMasteryUnlocked
    });

    return list;
  }, [category, isMasteryUnlocked]);

  const [selectedId, setSelectedId] = useState<string>(beatmaps[0].id);
  const [rankingTab, setRankingTab] = useState<'global' | 'local' | 'country'>('global');
  const [mobileTab, setMobileTab] = useState<'levels' | 'leaderboard'>('levels');

  const activeBeatmap = useMemo(() => {
    return beatmaps.find(b => b.id === selectedId) || beatmaps[0];
  }, [beatmaps, selectedId]);

  // Dynamically generate top rhythm scores for the selected beatmap
  const mockScores: LeaderboardScore[] = useMemo(() => {
    const baseScore = activeBeatmap.stars * 250000;
    return [
      {
        rank: 1,
        name: 'Lakandula "Lakan" Mendoza',
        score: Math.floor(baseScore * 1.45),
        accuracy: 99.8,
        combo: activeBeatmap.objects,
        grade: 'SS',
        mods: ['HD', 'HR'],
        avatarBg: '#3b82f6'
      },
      {
        rank: 2,
        name: 'Diwa "Bituin" Macaraeg',
        score: Math.floor(baseScore * 1.35),
        accuracy: 98.9,
        combo: Math.floor(activeBeatmap.objects * 0.95),
        grade: 'S',
        mods: ['HD', 'DT'],
        avatarBg: '#a855f7'
      },
      {
        rank: 3,
        name: 'Bayani "Ani" Reyes',
        score: Math.floor(baseScore * 1.25),
        accuracy: 98.2,
        combo: Math.floor(activeBeatmap.objects * 0.92),
        grade: 'S',
        mods: ['HR'],
        avatarBg: '#10b981'
      },
      {
        rank: 4,
        name: 'Mayumi "Yumi" Santos',
        score: Math.floor(baseScore * 1.15),
        accuracy: 97.5,
        combo: Math.floor(activeBeatmap.objects * 0.88),
        grade: 'S',
        mods: [],
        avatarBg: '#ec4899'
      },
      {
        rank: 5,
        name: 'Tala "Likha" Bautista',
        score: Math.floor(baseScore * 1.08),
        accuracy: 96.4,
        combo: Math.floor(activeBeatmap.objects * 0.82),
        grade: 'A',
        mods: ['HD'],
        avatarBg: '#f59e0b'
      },
      {
        rank: 6,
        name: 'Dakila "Kiko" Magbanua',
        score: Math.floor(baseScore * 0.98),
        accuracy: 95.1,
        combo: Math.floor(activeBeatmap.objects * 0.75),
        grade: 'A',
        mods: [],
        avatarBg: '#6366f1'
      },
      {
        rank: 7,
        name: 'You (Personal Best)',
        score: Math.floor(baseScore * 0.88),
        accuracy: 94.2,
        combo: Math.floor(activeBeatmap.objects * 0.68),
        grade: 'A',
        mods: ['SD'],
        isPlayer: true,
        avatarBg: '#da2d46'
      },
      {
        rank: 8,
        name: 'Marikit "Kit" Dimaculangan',
        score: Math.floor(baseScore * 0.82),
        accuracy: 92.5,
        combo: Math.floor(activeBeatmap.objects * 0.60),
        grade: 'B',
        mods: [],
        avatarBg: '#14b8a6'
      }
    ];
  }, [activeBeatmap]);

  const handleStartGame = () => {
    if (activeBeatmap.locked) return;
    onSelectDifficulty(activeBeatmap.diff, activeBeatmap.version);
  };

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleRandomBeatmap = useCallback(() => {
    const available = beatmaps.filter(b => b.id !== selectedId);
    const targetList = available.length > 0 ? available : beatmaps;
    const randomIndex = Math.floor(Math.random() * targetList.length);
    const randomBeatmap = targetList[randomIndex];
    
    setSelectedId(randomBeatmap.id);
    itemRefs.current[randomBeatmap.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [beatmaps, selectedId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'd') {
      e.preventDefault();
      setSelectedId((prev) => {
        const currentIndex = beatmaps.findIndex(b => b.id === prev);
        const nextIndex = (currentIndex + 1) % beatmaps.length;
        const nextId = beatmaps[nextIndex].id;
        itemRefs.current[nextId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return nextId;
      });
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelectedId((prev) => {
        const currentIndex = beatmaps.findIndex(b => b.id === prev);
        const prevIndex = (currentIndex - 1 + beatmaps.length) % beatmaps.length;
        const prevId = beatmaps[prevIndex].id;
        itemRefs.current[prevId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return prevId;
      });
    } else if (e.key === 'F2' || e.key.toLowerCase() === 'r') {
      e.preventDefault();
      handleRandomBeatmap();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!activeBeatmap.locked) {
        onSelectDifficulty(activeBeatmap.diff, activeBeatmap.version);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onBack();
    }
  }, [beatmaps, activeBeatmap, onSelectDifficulty, onBack, handleRandomBeatmap]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 bg-[#2a2d43] text-white z-[100] flex flex-col font-sans overflow-hidden select-none">
      {/* Halftone Background Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />
      {/* Decorative Speed Slashes */}
      <div className="absolute top-0 right-0 w-[40%] h-full bg-[#0f0c0c] -skew-x-12 translate-x-32 z-0 opacity-40 pointer-events-none" />
      
      {/* Top Navbar */}
      <div className="relative z-10 bg-[#da2d46] border-b-[4px] sm:border-b-[6px] border-[#0f0c0c] px-3 sm:px-10 py-2 sm:py-4 flex items-center justify-between shadow-[0px_4px_0px_0px_#0f0c0c] sm:shadow-[0px_8px_0px_0px_#0f0c0c] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 sm:p-2.5 bg-[#e0e5ed] text-[#0f0c0c] border-[3px] sm:border-4 border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_#0f0c0c] transition-all flex items-center gap-1 sm:gap-2 -skew-x-6 group flex-shrink-0"
          >
            <ArrowLeft size={16} className="skew-x-6 stroke-[3px] group-hover:-translate-x-1 transition-transform sm:w-5 sm:h-5" />
            <span className="font-orbitron font-black text-[10px] sm:text-sm uppercase tracking-wider skew-x-6">BACK<span className="hidden md:inline"> TO COLLECTION</span></span>
          </button>

          <div className="h-6 sm:h-8 w-[3px] sm:w-[4px] bg-[#0f0c0c] hidden sm:block -skew-x-6 flex-shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <div className="bg-[#0f0c0c] text-[#e0e5ed] px-1.5 sm:px-2 py-0.5 -skew-x-6 font-black text-[8px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest border border-black flex items-center flex-shrink-0">
                <Music size={10} className="text-[#da2d46] skew-x-6 mr-1 sm:w-3 sm:h-3" />
                <span className="skew-x-6 inline-block">ETHNO-BEATMAPS</span>
              </div>
              <span 
                className="font-orbitron font-black text-xs sm:text-lg tracking-wider sm:tracking-widest uppercase text-[#e0e5ed] truncate"
                style={{ textShadow: '2px 2px 0px #0f0c0c, -1px 0px 0px #f0dde0' }}
              >
                Visayan Rhythm Archive
              </span>
            </div>
            <div className="text-[8px] sm:text-xs text-[#0f0c0c] font-black uppercase tracking-wider mt-0.5 truncate">
              Instrument: <span className="bg-[#0f0c0c] text-white px-1 sm:px-1.5 py-0.2 sm:py-0.5 -skew-x-6 inline-block ml-1"><span className="skew-x-6 inline-block">{profile.instrument.name}</span></span> <span className="hidden sm:inline">({profile.instrument.category})</span>
            </div>
          </div>
        </div>

        {/* Grouping / Sorting Pills */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <div className="bg-[#1e293b] border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6 px-3 py-1.5 flex items-center gap-2 text-xs font-black text-white">
            <span className="skew-x-6">Group by:</span>
            <span className="text-[#facc15] font-black skew-x-6">No Grouping</span>
          </div>
          <div className="bg-[#1e293b] border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] -skew-x-6 px-3 py-1.5 flex items-center gap-2 text-xs font-black text-white">
            <span className="skew-x-6">Sort by:</span>
            <span className="text-[#38bdf8] font-black skew-x-6">Difficulty</span>
          </div>
        </div>
      </div>

      {/* Main Rhythm Menu Layout: Left Rectangles (Beatmaps) & Right Leaderboard */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-2 sm:gap-6 lg:gap-10 p-2 sm:p-6 lg:p-10 min-h-0 overflow-hidden">
        
        {/* Mobile Toggle Bar: Only shown on mobile (< lg screens) */}
        <div className="col-span-12 lg:hidden flex items-center justify-between gap-1 bg-[#0f0c0c] p-1 border-[3px] border-[#0f0c0c] -skew-x-2 flex-shrink-0 mb-1">
          <button
            onClick={() => setMobileTab('levels')}
            className={`flex-1 py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-orbitron font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              mobileTab === 'levels'
                ? 'bg-[#da2d46] text-white shadow-[2px_2px_0px_0px_white]'
                : 'bg-[#1e293b] text-slate-300 hover:text-white'
            }`}
          >
            <Music size={14} />
            <span>Levels ({beatmaps.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('leaderboard')}
            className={`flex-1 py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-orbitron font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              mobileTab === 'leaderboard'
                ? 'bg-[#facc15] text-[#0f0c0c] shadow-[2px_2px_0px_0px_white]'
                : 'bg-[#1e293b] text-slate-300 hover:text-white'
            }`}
          >
            <Trophy size={14} className={mobileTab === 'leaderboard' ? 'text-[#0f0c0c]' : 'text-[#facc15]'} />
            <span>Leaderboard</span>
          </button>
        </div>

        {/* LEFT COLUMN: Infinite Vertical Scroll of Difficulty Rectangles */}
        <div className={`col-span-12 lg:col-span-7 flex-col h-full min-h-0 overflow-hidden ${mobileTab === 'levels' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="text-[10px] sm:text-xs font-orbitron font-black uppercase tracking-wider text-[#38bdf8] mb-2 sm:mb-3 flex items-center justify-between flex-shrink-0 pr-1 sm:pr-4">
            <span className="bg-[#1e293b] border sm:border-2 border-[#0f0c0c] px-2 sm:px-3 py-0.5 sm:py-1 shadow-[2px_2px_0px_0px_#0f0c0c] text-white truncate">Select Difficulty ({beatmaps.length})</span>
            <span className="text-[#facc15] animate-pulse bg-[#0f0c0c] px-2 py-1 -skew-x-6 font-black hidden sm:inline-block"><span className="skew-x-6 inline-block">Use arrow keys or click</span></span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 sm:pr-10 md:pr-16 custom-scrollbar space-y-2 sm:space-y-4 lg:space-y-5 pb-16">
            {beatmaps.map((beatmap) => {
              const isSelected = beatmap.id === selectedId;
              
              return (
                <div
                  key={beatmap.id}
                  ref={(el) => {
                    itemRefs.current[beatmap.id] = el;
                  }}
                  onClick={() => {
                    setSelectedId(beatmap.id);
                  }}
                  onDoubleClick={() => {
                    if (!beatmap.locked) {
                      onSelectDifficulty(beatmap.diff, beatmap.version);
                    }
                  }}
                  className={`group relative w-full border-[3px] sm:border-[4px] border-[#0f0c0c] transition-all duration-200 cursor-pointer p-2 sm:p-5 lg:p-6 flex items-center justify-between overflow-hidden ${
                    beatmap.locked 
                      ? 'bg-[#1e293b]/60 border-[#475569] opacity-50 cursor-not-allowed shadow-none'
                      : isSelected
                        ? `${beatmap.color} translate-x-1 sm:translate-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] -skew-x-1 sm:-skew-x-2 font-black`
                        : `bg-[#1e293b] text-white shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_#0f0c0c] sm:hover:shadow-[6px_6px_0px_0px_#0f0c0c]`
                  }`}
                >
                  {/* Left info: Title, Artist, Stars */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1 pr-1 sm:pr-4">
                    <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
                      <span className={`font-orbitron font-black text-[11px] sm:text-lg md:text-2xl uppercase tracking-normal sm:tracking-wider truncate ${isSelected ? 'text-[#0f0c0c] drop-shadow-[1px_1px_0px_white]' : 'text-white'}`}>
                        {beatmap.title}
                      </span>
                      <span className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 -skew-x-6 text-[8px] sm:text-xs font-black uppercase tracking-wider bg-[#0f0c0c] text-white border sm:border-2 border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]">
                        <span className="skew-x-6 inline-block">{beatmap.speed}</span>
                      </span>
                      {beatmap.locked && (
                        <span className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 -skew-x-6 text-[8px] sm:text-xs font-black uppercase tracking-wider bg-red-600 text-white border sm:border-2 border-[#0f0c0c] flex items-center gap-0.5 shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]">
                          <Lock size={10} className="sm:w-3 sm:h-3" /> <span className="skew-x-6 inline-block">Locked</span>
                        </span>
                      )}
                    </div>

                    <div className={`text-[9px] sm:text-sm font-bold truncate ${isSelected ? 'text-[#0f0c0c]' : 'text-slate-300'}`}>
                      {beatmap.subtitle} <span className="hidden sm:inline">//</span> <span className={`${isSelected ? 'text-[#0f0c0c] underline' : 'text-[#facc15]'} hidden sm:inline`}>{beatmap.artist}</span>
                    </div>

                    <div className={`flex items-center gap-1.5 sm:gap-4 mt-0.5 sm:mt-1 text-[8px] sm:text-xs font-black flex-wrap ${isSelected ? 'text-[#0f0c0c]' : 'text-slate-300'}`}>
                      <div className="flex items-center gap-0.5 sm:gap-1 bg-[#0f0c0c] text-[#facc15] px-1.5 sm:px-2 py-0.2 sm:py-0.5 -skew-x-6 border border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]">
                        <Star size={10} className="fill-[#facc15] text-[#facc15] skew-x-6 sm:w-3 sm:h-3" />
                        <span className="font-orbitron font-black text-white skew-x-6">{beatmap.stars.toFixed(2)}★</span>
                      </div>
                      <span>{beatmap.bpm}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">Length: {beatmap.length}</span>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline">{beatmap.objects} Notes</span>
                    </div>
                  </div>

                  {/* Right Mapper badge / Play arrow */}
                  <div className="flex flex-col items-end justify-center flex-shrink-0 pl-1 sm:pl-2 gap-1 sm:gap-2">
                    <div className="text-[7px] sm:text-[10px] uppercase font-black text-[#facc15] bg-[#0f0c0c] px-1.5 sm:px-2.5 py-0.5 sm:py-1 -skew-x-6 border sm:border-2 border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]">
                      <span className="skew-x-6 inline-block">{beatmap.mapper}</span>
                    </div>
                    {isSelected && !beatmap.locked && (
                      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-[#0f0c0c] text-white flex items-center justify-center border-2 sm:border-[3px] border-white shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] animate-bounce -skew-x-6">
                        <Play size={14} className="fill-white skew-x-6 ml-0.5 sm:w-[18px] sm:h-[18px]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Rhythm Leaderboard Panel */}
        <div className={`col-span-12 lg:col-span-5 flex-col h-full min-h-0 overflow-hidden bg-[#1e293b] border-[3px] sm:border-[5px] border-[#0f0c0c] p-2 sm:p-5 lg:p-7 shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] ${mobileTab === 'leaderboard' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Leaderboard Header & Tabs */}
          <div className="border-b-[3px] sm:border-b-[4px] border-[#0f0c0c] pb-2 sm:pb-3 mb-2 sm:mb-3 flex-shrink-0">
            <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between mb-2 gap-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0f0c0c] text-[#facc15] px-2 sm:px-3 py-0.5 sm:py-1 -skew-x-6 border sm:border-2 border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[3px_3px_0px_0px_#0f0c0c]">
                <Trophy className="text-[#facc15] skew-x-6 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
                <span className="font-orbitron font-black text-[10px] sm:text-sm uppercase tracking-wider text-[#facc15] skew-x-6">
                  Ranking Panel
                </span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 bg-[#0f0c0c] p-0.5 sm:p-1 border sm:border-2 border-[#0f0c0c] -skew-x-6 self-end 2xl:self-auto">
                <button
                  onClick={() => setRankingTab('global')}
                  className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-black uppercase transition-all skew-x-6 ${
                    rankingTab === 'global' ? 'bg-[#da2d46] text-white shadow-[1px_1px_0px_0px_white] sm:shadow-[2px_2px_0px_0px_white]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Global
                </button>
                <button
                  onClick={() => setRankingTab('local')}
                  className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-black uppercase transition-all skew-x-6 ${
                    rankingTab === 'local' ? 'bg-[#da2d46] text-white shadow-[1px_1px_0px_0px_white] sm:shadow-[2px_2px_0px_0px_white]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Local
                </button>
              </div>
            </div>

            <div className="text-[9px] sm:text-xs text-slate-200 font-black bg-[#0f0c0c] p-1.5 sm:p-2 border sm:border-2 border-[#0f0c0c] flex items-center justify-between shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]">
              <span className="text-[#38bdf8] font-orbitron font-black truncate mr-1 sm:mr-2">{activeBeatmap.title}</span>
              <span className="text-[#facc15] flex-shrink-0 text-[8px] sm:text-xs">{activeBeatmap.stars.toFixed(2)}★ <span className="hidden sm:inline">// {activeBeatmap.bpm}</span></span>
            </div>
          </div>

          {/* Scores List */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1.5 sm:space-y-2.5 pb-4 min-h-0">
            {mockScores.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center justify-between p-1.5 sm:p-3 border-2 sm:border-[3px] border-[#0f0c0c] transition-all gap-1 sm:gap-2 ${
                  entry.isPlayer
                    ? 'bg-[#f59e0b] text-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-1 font-black'
                    : 'bg-[#334155] text-white shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[3px_3px_0px_0px_#0f0c0c] hover:translate-x-1'
                }`}
              >
                {/* Left: Rank & Avatar & Name */}
                <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1">
                  <span className={`w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center font-orbitron font-black text-[9px] sm:text-sm flex-shrink-0 border sm:border-2 border-[#0f0c0c] ${
                    entry.rank === 1 ? 'bg-[#facc15] text-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]' :
                    entry.rank === 2 ? 'bg-slate-200 text-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]' :
                    entry.rank === 3 ? 'bg-amber-600 text-white shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c]' :
                    'bg-[#0f0c0c] text-white'
                  }`}>
                    {entry.rank}
                  </span>

                  <div 
                    className="hidden lg:flex w-8 h-8 items-center justify-center font-black text-white text-xs flex-shrink-0 border-2 border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]"
                    style={{ backgroundColor: entry.avatarBg || '#475569' }}
                  >
                    {entry.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`font-orbitron font-black text-[10px] sm:text-sm truncate flex items-center gap-1 sm:gap-1.5 ${entry.isPlayer ? 'text-[#0f0c0c]' : 'text-white'}`}>
                      <span className="truncate">{entry.name}</span>
                      {entry.isPlayer && (
                        <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 bg-[#0f0c0c] text-[#facc15] text-[7px] sm:text-[8px] border border-[#0f0c0c] -skew-x-6 uppercase font-black">
                          <span className="skew-x-6 inline-block">YOU</span>
                        </span>
                      )}
                    </div>
                    <div className={`text-[8px] sm:text-[10px] font-bold flex items-center gap-1 sm:gap-2 mt-0.5 ${entry.isPlayer ? 'text-[#0f0c0c]' : 'text-slate-300'}`}>
                      <span>Acc: <span className="font-black">{entry.accuracy.toFixed(0)}%</span></span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">Combo: <span className={`font-black ${entry.isPlayer ? 'text-[#0f0c0c]' : 'text-[#facc15]'}`}>{entry.combo}x</span></span>
                    </div>
                  </div>
                </div>

                {/* Right: Grade & Score & Mods */}
                <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 text-right">
                  {entry.mods.length > 0 && (
                    <div className="hidden xl:flex gap-1">
                      {entry.mods.map(mod => (
                        <span key={mod} className="px-1.5 py-0.5 bg-[#0f0c0c] border border-[#0f0c0c] text-[9px] font-black text-[#38bdf8] -skew-x-6">
                          <span className="skew-x-6 inline-block">{mod}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className={`font-orbitron font-black text-[9px] sm:text-sm tracking-wider ${entry.isPlayer ? 'text-[#0f0c0c]' : 'text-white'}`}>
                      {entry.score.toLocaleString()}
                    </div>
                  </div>

                  <div className={`w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center font-orbitron font-black text-[9px] sm:text-base border sm:border-2 border-[#0f0c0c] shadow-[1px_1px_0px_0px_#0f0c0c] sm:shadow-[2px_2px_0px_0px_#0f0c0c] shrink-0 ${
                    entry.grade === 'SS' ? 'text-[#facc15] bg-[#0f0c0c]' :
                    entry.grade === 'S' ? 'text-[#38bdf8] bg-[#0f0c0c]' :
                    entry.grade === 'A' ? 'text-[#4ade80] bg-[#0f0c0c]' :
                    'text-white bg-[#0f0c0c]'
                  }`}>
                    {entry.grade}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Leaderboard Footer */}
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t-2 sm:border-t-[3px] border-[#0f0c0c] flex items-center justify-between text-[9px] sm:text-[11px] font-black text-slate-300 flex-shrink-0">
            <span className="truncate mr-1">Top 8 scores</span>
            <span className="text-[#facc15] bg-[#0f0c0c] px-1.5 py-0.5 -skew-x-6 shrink-0"><span className="skew-x-6 inline-block">Updated</span></span>
          </div>
        </div>
      </div>

      {/* Bottom Rhythm Navigation & Big Play Button */}
      <div className="relative z-20 bg-[#da2d46] border-t-[4px] sm:border-t-[6px] border-[#0f0c0c] px-3 sm:px-10 py-2 sm:py-5 flex items-center justify-between shadow-[0px_-4px_0px_0px_#0f0c0c] sm:shadow-[0px_-8px_0px_0px_#0f0c0c] flex-shrink-0">
        {/* Left: Mods & Options Badges */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
          <button className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-[#1e293b] text-white border-2 sm:border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 -skew-x-6 text-[10px] sm:text-xs font-black uppercase transition-all flex items-center gap-1 sm:gap-2">
            <Activity size={14} className="text-[#38bdf8] skew-x-6 sm:w-[15px] sm:h-[15px]" />
            <span className="skew-x-6">Mods: None</span>
          </button>
          <button 
            onClick={handleRandomBeatmap}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-[#1e293b] text-white border-2 sm:border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 -skew-x-6 text-[10px] sm:text-xs font-black uppercase transition-all flex items-center gap-1 sm:gap-2 hover:bg-[#334155] hover:text-[#facc15] group"
          >
            <Shuffle size={14} className="text-[#facc15] skew-x-6 sm:w-[15px] sm:h-[15px] transition-transform duration-300 group-hover:rotate-180" />
            <span className="skew-x-6">Random</span>
          </button>
          <button className="hidden md:flex px-4 py-2 bg-[#1e293b] text-white border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 -skew-x-6 text-xs font-black uppercase transition-all items-center gap-2">
            <Settings size={15} className="text-[#c084fc] skew-x-6" />
            <span className="skew-x-6">Options</span>
          </button>
        </div>

        {/* Right: Huge Neo-Brutalist Play Button */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden sm:block bg-[#0f0c0c] p-2 border-2 border-[#0f0c0c] shadow-[2px_2px_0px_0px_white] -skew-x-6">
            <div className="text-[10px] text-slate-300 font-black uppercase skew-x-6">Selected Beatmap</div>
            <div className="font-orbitron font-black text-sm text-[#facc15] skew-x-6 truncate max-w-[180px]">{activeBeatmap.title}</div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={activeBeatmap.locked}
            className={`w-14 h-14 sm:w-24 sm:h-24 font-orbitron font-black text-xs sm:text-lg uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center border-[3px] sm:border-[5px] border-[#0f0c0c] relative group -skew-x-6 flex-shrink-0 ${
              activeBeatmap.locked
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                : 'bg-[#facc15] text-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_#0f0c0c] cursor-pointer'
            }`}
          >
            <Play size={20} className={`fill-[#0f0c0c] text-[#0f0c0c] skew-x-6 transition-transform sm:w-7 sm:h-7 ${activeBeatmap.locked ? '' : 'group-hover:scale-125 group-hover:translate-x-0.5'}`} />
            <span className="text-[7px] sm:text-xs font-black mt-0.5 sm:mt-1 tracking-widest skew-x-6">
              {activeBeatmap.locked ? 'LOCKED' : 'TUGTOG'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
