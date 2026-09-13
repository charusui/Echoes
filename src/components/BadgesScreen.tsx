import { useState } from 'react';
import { ArrowLeft, Shield, Lock, Sparkles, Check as CheckCircle2, Eye, EyeOff, Star } from 'pixelarticons/react';
import { PixelButton, PixelChip, PixelIconButton, PixelPanel, PixelTabs } from './ui';
import { playUiSound } from '../hooks/useUiSound';
import { cn } from '../lib/cn';
import { useProgress } from '../context/ProgressProvider';
import { BADGES_LIST } from '../constants/badges';
import type { BadgeMetadata } from '../types';

interface BadgesScreenProps {
  onBack: () => void;
}

export function BadgesScreen({ onBack }: BadgesScreenProps) {
  const { progress, awardBadge } = useProgress();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBadge, setSelectedBadge] = useState<BadgeMetadata | null>(BADGES_LIST[0]);
  const [demoUnlockAll, setDemoUnlockAll] = useState<boolean>(true); // Default true so user sees all glowing badges!

  const categories = ['All', 'Exploration', 'Rhythm', 'Lore', 'Mastery'];

  const isUnlocked = (badge: BadgeMetadata) => {
    if (demoUnlockAll) return true;
    return progress.badges.includes(badge.name) || progress.badges.includes(badge.title) || badge.id <= 3; // First 3 unlocked as starters if empty
  };

  const filteredBadges = BADGES_LIST.filter(b => {
    if (selectedCategory === 'All') return true;
    return b.category === selectedCategory;
  });

  const unlockedCount = BADGES_LIST.filter(b => isUnlocked(b)).length;
  const totalXpRewards = BADGES_LIST.filter(b => isUnlocked(b)).reduce((acc, curr) => acc + curr.xpReward, 0);

  const handleUnlockBadge = (badge: BadgeMetadata) => {
    awardBadge(badge.name);
  };

  return (
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col">
      {/* Header */}
      <header className="bg-plum-900 border-b-[3px] border-ink">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PixelIconButton icon={<ArrowLeft />} label="Back to map" sound="ui_back" onClick={onBack} />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 font-bold text-2xl sm:text-3xl leading-none">
                <Shield className="size-6 shrink-0 text-gold-300" aria-hidden />
                Cultural Badges
              </h1>
              <p className="hidden sm:block mt-1 text-sm text-parchment-300">
                Earn medals by exploring Visayan musical heritage and mastering rhythms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PixelChip tone="gold">{unlockedCount} / {BADGES_LIST.length}</PixelChip>
            <PixelChip tone="xp">+{totalXpRewards} XP</PixelChip>
            <PixelButton
              size="sm"
              variant="ghost"
              icon={demoUnlockAll ? <Eye /> : <EyeOff />}
              title="Preview every badge in its unlocked state"
              onClick={() => setDemoUnlockAll(!demoUnlockAll)}
            >
              {demoUnlockAll ? 'Demo: all unlocked' : 'Real progress'}
            </PixelButton>
          </div>
        </div>

        <PixelTabs
          className="max-w-6xl mx-auto px-3 sm:px-6"
          value={selectedCategory}
          onChange={setSelectedCategory}
          tabs={categories.map(cat => ({ id: cat, label: cat }))}
        />
      </header>

      {/* Grid + inspector */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <ul className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 lg:max-h-[72vh] lg:overflow-y-auto p-1">
          {filteredBadges.map(badge => {
            const unlocked = isUnlocked(badge);
            const isSelected = selectedBadge?.id === badge.id;

            return (
              <li key={badge.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => { playUiSound('ui_click'); setSelectedBadge(badge); }}
                  className={cn(
                    'px-frame w-full flex flex-col items-center gap-2 p-3 text-center focus-visible:outline-[3px] focus-visible:outline-gold-300',
                    isSelected ? 'px-frame-parchment' : unlocked ? 'px-frame-plum hover:brightness-110' : 'px-frame-inset opacity-70',
                  )}
                >
                  <span className="relative size-20 sm:size-24">
                    <img
                      src={`/assets/badges/${badge.id}.png?v=2`}
                      alt=""
                      className={cn('w-full h-full object-contain', !unlocked && 'grayscale brightness-50')}
                    />
                    {!unlocked && <Lock className="absolute inset-0 m-auto size-6 text-parchment-300" aria-label="Locked" />}
                  </span>
                  <span className={cn('w-full truncate font-semibold text-sm leading-none', isSelected ? 'text-ink' : unlocked ? 'text-parchment-100' : 'text-parchment-500')}>
                    {badge.name}
                  </span>
                  <span className={cn('text-xs leading-none', isSelected ? 'text-wood-700' : 'text-gold-300')}>
                    {unlocked ? `+${badge.xpReward} XP` : 'Locked'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <PixelPanel frame="wood" padding="lg" className="lg:sticky lg:top-6">
          {selectedBadge ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <PixelChip tone="dark">{selectedBadge.category} · #{selectedBadge.id}</PixelChip>
              <img
                src={`/assets/badges/${selectedBadge.id}.png?v=2`}
                alt={selectedBadge.name}
                className={cn('size-36 object-contain', !isUnlocked(selectedBadge) && 'grayscale brightness-50')}
              />
              <div>
                <h2 className="font-bold text-2xl leading-none text-parchment-100">{selectedBadge.name}</h2>
                <p className="mt-1 text-base text-gold-300">{selectedBadge.title}</p>
              </div>
              {isUnlocked(selectedBadge)
                ? <PixelChip tone="heal" icon={<CheckCircle2 />}>Unlocked</PixelChip>
                : <PixelChip tone="dark" icon={<Lock />}>Locked</PixelChip>}

              <PixelPanel frame="parchment" padding="sm" title="How to earn it" className="w-full text-left">
                <p className="text-sm leading-snug text-ink">{selectedBadge.description}</p>
              </PixelPanel>

              <div className="w-full px-frame px-frame-inset px-frame-sm flex items-center justify-between px-3 py-2">
                <span className="text-sm text-parchment-300">Reward</span>
                <span className="flex items-center gap-1 font-label text-base text-xp"><Sparkles className="size-4" aria-hidden />+{selectedBadge.xpReward} XP</span>
              </div>

              {!isUnlocked(selectedBadge) && !demoUnlockAll && (
                <PixelButton fullWidth size="sm" onClick={() => handleUnlockBadge(selectedBadge)}>
                  Unlock now (test mode)
                </PixelButton>
              )}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-parchment-500">Select a badge to inspect it.</p>
          )}
        </PixelPanel>
      </main>

      <footer className="border-t-[3px] border-ink bg-plum-900">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-parchment-500">
            <Star className="size-4 text-gold-300" aria-hidden />
            Badges are saved to your expedition archive forever.
          </p>
          <PixelButton variant="primary" sound="ui_back" onClick={onBack}>Back to Map</PixelButton>
        </div>
      </footer>
    </div>
  );
}
