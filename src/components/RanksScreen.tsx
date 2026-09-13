import { useState } from 'react';
import { ArrowLeft, Fire as Flame, Trophy, Shield, MapPin, Search, TrendingUp } from 'pixelarticons/react';
import { PixelButton, PixelChip, PixelIconButton, PixelPanel, PixelTabs } from './ui';
import { cn } from '../lib/cn';
import { useProgress } from '../context/ProgressProvider';

interface RanksScreenProps {
  onBack: () => void;
  onOpenBadges?: () => void;
}

export function RanksScreen({ onBack, onOpenBadges }: RanksScreenProps) {
  const { progress, getClassroomLeaderboard } = useProgress();
  const [selectedTab, setSelectedTab] = useState<string>('All Ranks');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const leaderboard = getClassroomLeaderboard();

  const tabs = ['All Ranks', 'Visayan Legends', 'Classroom Squad', 'Top Musicians'];

  const filteredLeaderboard = leaderboard.filter(entry => {
    if (searchQuery && !entry.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedTab === 'Visayan Legends') return entry.xp >= 1500;
    if (selectedTab === 'Classroom Squad') return entry.isPlayer || entry.xp < 1500;
    if (selectedTab === 'Top Musicians') return entry.title.toLowerCase().includes('rhythm') || entry.title.toLowerCase().includes('master') || entry.title.toLowerCase().includes('prodigy');
    return true;
  });

  const topThree = leaderboard.slice(0, 3);
  const playerRankIndex = leaderboard.findIndex(e => e.isPlayer);
  const playerRankNumber = playerRankIndex !== -1 ? playerRankIndex + 1 : leaderboard.length;

  const getBadgeImage = (badgeId?: number) => {
    const id = badgeId || 1;
    return `/assets/badges/${id}.png?v=2`;
  };

  const PODIUM = [
    { entry: topThree[1], place: 2, label: 'Silver', chip: 'bg-parchment-300 text-ink', frame: 'px-frame-plum', lift: '' },
    { entry: topThree[0], place: 1, label: 'Champion', chip: 'bg-gold-500 text-ink', frame: 'px-frame-wood', lift: 'md:-translate-y-3' },
    { entry: topThree[2], place: 3, label: 'Bronze', chip: 'bg-orange-500 text-ink', frame: 'px-frame-plum', lift: '' },
  ];

  return (
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col">
      {/* Header */}
      <header className="bg-plum-900 border-b-[3px] border-ink">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PixelIconButton icon={<ArrowLeft />} label="Back to map" sound="ui_back" onClick={onBack} />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 font-bold text-2xl sm:text-3xl leading-none">
                <Trophy className="size-6 shrink-0 text-gold-300" aria-hidden />
                Leaderboard
              </h1>
              <p className="hidden sm:block mt-1 text-sm text-parchment-300">
                The top instrument scouts and rhythm weavers of the Visayas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-frame px-frame-inset px-frame-sm flex items-center gap-3 px-3 py-1.5">
              <span className="text-xs text-parchment-500">You</span>
              <span className="font-label text-base leading-none text-gold-300">#{playerRankNumber}</span>
              <span className="font-label text-base leading-none text-xp">{progress.xp} XP</span>
            </div>
            {onOpenBadges && (
              <PixelButton size="sm" icon={<Shield />} onClick={onOpenBadges}>Badges</PixelButton>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:items-end justify-between gap-2">
          <PixelTabs value={selectedTab} onChange={setSelectedTab} tabs={tabs.map(t => ({ id: t, label: t }))} />
          <label className="relative sm:w-64 sm:mb-2">
            <span className="sr-only">Search musicians</span>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-parchment-500" aria-hidden />
            <input
              type="text"
              placeholder="Search musicians"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-8 pr-3 bg-plum-950 border-[3px] border-ink text-sm text-parchment-100 placeholder:text-parchment-500 focus:border-gold-300 focus:outline-none"
            />
          </label>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-6">
        {/* Podium */}
        {selectedTab === 'All Ranks' && !searchQuery && topThree.length >= 3 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {PODIUM.map(({ entry, place, label, chip, frame, lift }) => (
              <div
                key={entry.id}
                className={cn('px-frame relative flex flex-col items-center gap-2 p-4 text-center', frame, lift, place === 1 ? 'order-1 md:order-2' : place === 2 ? 'order-2 md:order-1' : 'order-3')}
              >
                <span className={cn('absolute top-2 left-2 px-2 py-1 border-2 border-ink text-xs font-semibold leading-none', chip)}>
                  #{place} {label}
                </span>
                <img src={getBadgeImage(entry.badgeId)} alt="" className={cn('object-contain mt-4', place === 1 ? 'size-24' : 'size-20')} />
                <h3 className={cn('w-full truncate font-bold leading-none', place === 1 ? 'text-xl text-gold-300' : 'text-lg text-parchment-100')}>{entry.name}</h3>
                <p className="text-sm text-parchment-300">{entry.title}</p>
                <div className="w-full px-frame px-frame-inset px-frame-sm flex items-center justify-between px-3 py-2 text-sm">
                  <span className="flex items-center gap-1 text-orange-300"><Flame className="size-4" aria-hidden />{entry.streak} days</span>
                  <span className="font-label text-base text-parchment-100">{entry.xp.toLocaleString()} XP</span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Table */}
        <PixelPanel padding="none" className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-plum-900 border-b-[3px] border-ink text-xs text-parchment-500">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-4">Musician</div>
              <div className="col-span-3">Region</div>
              <div className="col-span-2 text-center">Streak</div>
              <div className="col-span-2 text-right">XP</div>
            </div>

            <ol className="lg:max-h-[50vh] lg:overflow-y-auto">
              {filteredLeaderboard.map(entry => {
                const actualRank = leaderboard.findIndex(e => e.id === entry.id) + 1;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      'grid grid-cols-12 gap-3 px-4 py-3 items-center border-b-2 border-plum-900',
                      entry.isPlayer ? 'bg-gold-500/15' : 'hover:bg-plum-700/40',
                    )}
                  >
                    <div className="col-span-1 flex justify-center">
                      <span className={cn('size-8 flex items-center justify-center border-2 border-ink font-label text-base leading-none', RANK_CHIP[actualRank] ?? 'bg-plum-700 text-parchment-100')}>
                        {actualRank}
                      </span>
                    </div>
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <span className="shrink-0 size-10 flex items-center justify-center border-2 border-ink bg-plum-900">
                        <img src={getBadgeImage(entry.badgeId)} alt="" className="size-8 object-contain" />
                      </span>
                      <span className="min-w-0">
                        <span className={cn('flex items-center gap-2 truncate font-semibold text-sm', entry.isPlayer ? 'text-gold-300' : 'text-parchment-100')}>
                          <span className="truncate">{entry.name}</span>
                          {entry.isPlayer && <PixelChip tone="gold">You</PixelChip>}
                        </span>
                        <span className="block truncate text-xs text-parchment-500">{entry.title}</span>
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5 text-sm text-parchment-300 min-w-0">
                      <MapPin className="size-4 shrink-0 text-parchment-500" aria-hidden />
                      <span className="truncate">{entry.region}</span>
                    </div>
                    <div className="col-span-2 flex justify-center items-center gap-1 text-sm text-orange-300">
                      <Flame className="size-4" aria-hidden />{entry.streak}d
                    </div>
                    <div className="col-span-2 text-right font-label text-base text-parchment-100">
                      {entry.xp.toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ol>

            {filteredLeaderboard.length === 0 && (
              <p className="py-8 text-center text-sm text-parchment-500">No musicians match this filter.</p>
            )}
          </div>
        </PixelPanel>
      </main>

      <footer className="border-t-[3px] border-ink bg-plum-900">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-parchment-500">
            <TrendingUp className="size-4 text-heal" aria-hidden />
            Ranks update as you scan instruments and finish rhythm tracks.
          </p>
          <PixelButton variant="primary" sound="ui_back" onClick={onBack}>Back to Map</PixelButton>
        </div>
      </footer>
    </div>
  );
}

const RANK_CHIP: Record<number, string> = {
  1: 'bg-gold-500 text-ink',
  2: 'bg-parchment-300 text-ink',
  3: 'bg-orange-500 text-ink',
};
