import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Play, Star, Trophy, ArrowLeft, Music, ChartLine as Activity, Shuffle, SettingsCog as Settings, Lock } from 'pixelarticons/react';
import type { ActiveInstrumentProfile, Difficulty } from '../types';
import { Kbd, PixelButton, PixelChip, PixelPanel, PixelTabs } from './ui';
import { playUiSound } from '../hooks/useUiSound';
import { cn } from '../lib/cn';

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
        title: 'Apprentice I',
        subtitle: 'Visayan Heritage Ensemble',
        artist: 'Kulintang & Bamboo Winds',
        mapper: 'Mapped by Lakan',
        stars: 1.5,
        speed: 'Slow',
        bpm: '90 BPM',
        length: '01:00',
        objects: 60,
        color: 'bg-heal text-ink',
        borderColor: 'border-ink',
        accentHex: '#10b981'
      },
      {
        id: 'apprentice-v2',
        diff: 'apprentice',
        version: 'v2',
        title: 'Apprentice II',
        subtitle: 'Visayan Heritage Ensemble',
        artist: 'Kulintang & Bamboo Winds',
        mapper: 'Mapped by Bituin',
        stars: 1.8,
        speed: 'Slow',
        bpm: '95 BPM',
        length: '01:05',
        objects: 72,
        color: 'bg-xp text-ink',
        borderColor: 'border-ink',
        accentHex: '#06b6d4'
      },
      {
        id: 'musician-v1',
        diff: 'musician',
        version: 'v1',
        title: 'Musician I',
        subtitle: 'Tultugan Rhythm Masters',
        artist: 'Percussion & String Weavers',
        mapper: 'Mapped by Ani',
        stars: 2.8,
        speed: 'Medium',
        bpm: '120 BPM',
        length: '01:15',
        objects: 140,
        color: 'bg-orange-500 text-ink',
        borderColor: 'border-ink',
        accentHex: '#f59e0b'
      }
    ];

    if (category === 'percussion' || category === 'string') {
      list.push({
        id: 'musician-v2',
        diff: 'musician',
        version: 'v2',
        title: 'Musician II',
        subtitle: 'Tultugan Rhythm Masters',
        artist: 'Percussion & String Weavers',
        mapper: 'Mapped by Yumi',
        stars: 3.2,
        speed: 'Medium',
        bpm: '130 BPM',
        length: '01:20',
        objects: 165,
        color: 'bg-pink-500 text-ink',
        borderColor: 'border-ink',
        accentHex: '#f97316'
      });
    }

    list.push({
      id: 'virtuoso-v1',
      diff: 'virtuoso',
      version: 'v1',
      title: 'Virtuoso I',
      subtitle: 'Kulintang & Lantoy Virtuosos',
      artist: 'Grand Visayan Orchestra',
      mapper: 'Mapped by Diwa',
      stars: 4.2,
      speed: 'Fast',
      bpm: '160 BPM',
      length: '01:30',
      objects: 240,
      color: 'bg-purple-500 text-parchment-100',
      borderColor: 'border-ink',
      accentHex: '#d946ef'
    });

    if (category === 'wind') {
      list.push({
        id: 'virtuoso-v2',
        diff: 'virtuoso',
        version: 'v2',
        title: 'Virtuoso II',
        subtitle: 'Kulintang & Lantoy Virtuosos',
        artist: 'Grand Visayan Orchestra',
        mapper: 'Mapped by Bayani',
        stars: 4.8,
        speed: 'Fast',
        bpm: '175 BPM',
        length: '01:35',
        objects: 280,
        color: 'bg-hp text-ink',
        borderColor: 'border-ink',
        accentHex: '#f43f5e'
      });
    }

    list.push({
      id: 'mastery',
      diff: 'mastery',
      version: 'v1',
      title: 'Mastery (Endless)',
      subtitle: 'Ancient Visayan Legends',
      artist: 'Mythic Bathala Ensemble',
      mapper: 'Mapped by Bathala',
      stars: 6.5,
      speed: 'Extreme',
      bpm: '200+ BPM',
      length: 'Endless',
      objects: 999,
      color: 'bg-purple-500 text-parchment-100',
      borderColor: 'border-ink',
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
    <div className="fixed inset-0 bg-plum-950 text-parchment-100 z-[100] flex flex-col overflow-hidden select-none">

      {/* Top bar */}
      <header className="shrink-0 bg-plum-900 border-b-[3px] border-ink px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PixelButton size="sm" icon={<ArrowLeft />} sound="ui_back" onClick={onBack}>
            <span className="hidden sm:inline">Back</span>
          </PixelButton>
          <div className="min-w-0">
            <h1 className="font-bold text-xl sm:text-2xl leading-none truncate">Choose a Song</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-parchment-300 truncate">
              <Music className="size-4 shrink-0 text-gold-300" aria-hidden />
              {profile.instrument.name}
              <span className="hidden sm:inline text-parchment-500">· {profile.instrument.category}</span>
            </p>
          </div>
        </div>
        <p className="hidden md:flex items-center gap-2 text-sm text-parchment-500">
          Use <Kbd>↑</Kbd> <Kbd>↓</Kbd> to pick, <Kbd>Enter</Kbd> to play
        </p>
      </header>

      {/* Mobile tabs */}
      <PixelTabs
        className="lg:hidden shrink-0 px-3 pt-2 bg-plum-900 border-b-[3px] border-ink"
        value={mobileTab}
        onChange={setMobileTab}
        tabs={[
          { id: 'levels', label: `Songs (${beatmaps.length})`, icon: <Music /> },
          { id: 'leaderboard', label: 'Top Scores', icon: <Trophy /> },
        ]}
      />

      <main className="flex-1 min-h-0 grid grid-cols-12 gap-4 lg:gap-8 p-3 sm:p-6 overflow-hidden">

        {/* Song list */}
        <section className={cn('col-span-12 lg:col-span-7 flex-col min-h-0', mobileTab === 'levels' ? 'flex' : 'hidden lg:flex')}>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-1 pb-8">
            {beatmaps.map((beatmap) => {
              const isSelected = beatmap.id === selectedId;
              return (
                <div
                  key={beatmap.id}
                  ref={(el) => { itemRefs.current[beatmap.id] = el; }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-disabled={beatmap.locked}
                  onClick={() => { playUiSound('ui_click'); setSelectedId(beatmap.id); }}
                  onDoubleClick={() => { if (!beatmap.locked) onSelectDifficulty(beatmap.diff, beatmap.version); }}
                  className={cn(
                    'px-frame flex items-center gap-3 sm:gap-4 p-2.5 sm:p-4 cursor-pointer transition-transform duration-100 focus-visible:outline-[3px] focus-visible:outline-gold-300',
                    beatmap.locked ? 'px-frame-inset opacity-50 cursor-not-allowed' : isSelected ? 'px-frame-parchment sm:translate-x-3' : 'px-frame-plum hover:brightness-110',
                  )}
                >
                  <span className={cn('shrink-0 size-12 sm:size-16 flex flex-col items-center justify-center border-[3px] border-ink', beatmap.locked ? 'bg-plum-700 text-parchment-500' : beatmap.color)}>
                    {beatmap.locked ? <Lock className="size-6" aria-label="Locked" /> : (
                      <>
                        <Star className="size-4" aria-hidden />
                        <span className="font-label text-[8px] sm:text-base leading-none">{beatmap.stars.toFixed(1)}</span>
                      </>
                    )}
                  </span>

                  <span className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className={cn('font-bold text-lg sm:text-2xl leading-none truncate', isSelected ? 'text-ink' : 'text-parchment-100')}>
                        {beatmap.title}
                      </span>
                      <PixelChip tone={isSelected ? 'dark' : 'neutral'}>{beatmap.speed}</PixelChip>
                    </span>
                    <span className={cn('text-sm truncate', isSelected ? 'text-wood-700' : 'text-parchment-300')}>
                      {beatmap.subtitle}<span className="hidden sm:inline"> · {beatmap.artist}</span>
                    </span>
                    <span className={cn('flex items-center gap-3 text-xs', isSelected ? 'text-wood-700' : 'text-parchment-500')}>
                      <span>{beatmap.bpm}</span>
                      <span className="hidden sm:inline">{beatmap.length}</span>
                      <span className="hidden md:inline">{beatmap.objects} notes</span>
                      <span className="hidden md:inline">{beatmap.mapper}</span>
                    </span>
                  </span>

                  {isSelected && !beatmap.locked && (
                    <Play className="shrink-0 size-8 text-wood-700" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard */}
        <PixelPanel
          frame="wood"
          padding="none"
          className={cn('col-span-12 lg:col-span-5 flex-col min-h-0 overflow-hidden', mobileTab === 'leaderboard' ? 'flex' : 'hidden lg:flex')}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-3 bg-plum-800 border-b-[3px] border-ink">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 font-bold text-lg leading-none"><Trophy className="size-5 text-gold-300" aria-hidden />Top Scores</h2>
              <p className="mt-1 text-xs text-parchment-500 truncate">{activeBeatmap.title} · {activeBeatmap.bpm}</p>
            </div>
            <div className="flex gap-1" role="tablist" aria-label="Leaderboard scope">
              {(['global', 'local'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={rankingTab === tab}
                  onClick={() => setRankingTab(tab)}
                  className={cn('px-2.5 py-1.5 border-2 border-ink text-xs font-semibold capitalize', rankingTab === tab ? 'bg-gold-500 text-ink' : 'bg-plum-950 text-parchment-300 hover:text-parchment-100')}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <ol className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-3">
            {mockScores.map((entry) => (
              <li
                key={entry.rank}
                className={cn('px-frame px-frame-sm flex items-center gap-2 sm:gap-3 p-2', entry.isPlayer ? 'px-frame-parchment' : 'px-frame-plum')}
              >
                <span className={cn('shrink-0 size-7 flex items-center justify-center border-2 border-ink font-label text-[8px] sm:text-base leading-none', RANK_TILE[entry.rank] ?? 'bg-plum-950 text-parchment-100')}>
                  {entry.rank}
                </span>
                <span className="hidden sm:flex shrink-0 size-8 items-center justify-center border-2 border-ink font-bold text-sm text-parchment-100" style={{ backgroundColor: entry.avatarBg || 'var(--color-plum-600)' }}>
                  {entry.name.charAt(0)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={cn('flex items-center gap-1.5 font-semibold text-sm truncate', entry.isPlayer ? 'text-ink' : 'text-parchment-100')}>
                    <span className="truncate">{entry.name}</span>
                    {entry.isPlayer && <PixelChip tone="gold">You</PixelChip>}
                  </span>
                  <span className={cn('block text-xs', entry.isPlayer ? 'text-wood-700' : 'text-parchment-500')}>
                    {entry.accuracy.toFixed(0)}% · {entry.combo}× combo
                  </span>
                </span>
                <span className={cn('font-label text-[8px] sm:text-base leading-none', entry.isPlayer ? 'text-ink' : 'text-parchment-100')}>
                  {entry.score.toLocaleString()}
                </span>
                <span className={cn('shrink-0 size-8 flex items-center justify-center border-2 border-ink font-label text-base leading-none', GRADE_TILE[entry.grade])}>
                  {entry.grade}
                </span>
              </li>
            ))}
          </ol>
        </PixelPanel>
      </main>

      {/* Bottom bar */}
      <footer className="shrink-0 bg-plum-900 border-t-[3px] border-ink px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PixelButton size="sm" icon={<Shuffle />} onClick={handleRandomBeatmap}>Random</PixelButton>
          <PixelButton size="sm" variant="ghost" icon={<Activity />} className="hidden sm:inline-flex">Mods: none</PixelButton>
          <PixelButton size="sm" variant="ghost" icon={<Settings />} className="hidden md:inline-flex">Options</PixelButton>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:block text-right min-w-0">
            <p className="text-xs text-parchment-500">Selected</p>
            <p className="font-semibold text-base text-gold-300 truncate max-w-[200px]">{activeBeatmap.title}</p>
          </div>
          <PixelButton variant="primary" size="lg" icon={activeBeatmap.locked ? <Lock /> : <Play />} disabled={activeBeatmap.locked} onClick={handleStartGame} className="min-w-36">
            {activeBeatmap.locked ? 'Locked' : 'Play!'}
          </PixelButton>
        </div>
      </footer>
    </div>
  );
}

const RANK_TILE: Record<number, string> = {
  1: 'bg-gold-500 text-ink',
  2: 'bg-parchment-300 text-ink',
  3: 'bg-orange-500 text-ink',
};

const GRADE_TILE: Record<string, string> = {
  SS: 'bg-gold-500 text-ink',
  S: 'bg-xp text-ink',
  A: 'bg-heal text-ink',
  B: 'bg-plum-700 text-parchment-100',
};
