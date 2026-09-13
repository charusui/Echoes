import { useEffect, type ReactNode } from 'react';
import { ChevronRight, Clock, Skull, Sparkles, Trophy, Zap } from 'pixelarticons/react';
import { type HarmonydexEntry } from '../../types/expedition';
import { PixelButton, PixelChip, PixelPanel, SectionLabel } from '../ui';
import { cn } from '../../lib/cn';

interface CombatResultModalProps {
  result: {
    victory: boolean;
    xpGained: number;
    capturedEntry?: HarmonydexEntry;
    stats?: {
      totalDamage: number;
      maxCombo: number;
      turnsTaken: number;
      rank: 'S' | 'A' | 'B' | 'C' | 'F';
    };
  };
  onContinue: () => void;
}

const RANK_COLOR: Record<string, string> = {
  S: 'text-gold-300',
  A: 'text-heal',
  B: 'text-xp',
  C: 'text-xp',
  F: 'text-hp-light',
};

export function CombatResultModal({ result, onContinue }: CombatResultModalProps) {
  const { victory, xpGained, capturedEntry } = result;

  const stats = result.stats || {
    totalDamage: victory ? 1450 : 320,
    maxCombo: victory ? 24 : 5,
    turnsTaken: 6,
    rank: victory ? 'S' : 'F',
  };

  // ─── BACKGROUND MUSIC ENGINE ───
  useEffect(() => {
    const audioTrack = victory
      ? '/assets/expedition/victory_theme.mp3'
      : '/assets/expedition/defeat_theme.mp3';

    const bgm = new Audio(audioTrack);
    bgm.loop = true;
    bgm.volume = 0.5;

    bgm.play().catch((err) => {
      console.warn("Browser autoplay policy prevented result BGM from playing:", err);
    });

    return () => {
      bgm.pause();
      bgm.currentTime = 0;
    };
  }, [victory]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-plum-950/90 px-fade-in" />

      <div className="relative w-full max-w-3xl flex flex-col gap-4 px-rise-in" role="dialog" aria-modal="true" aria-labelledby="combat-result-title">
        {/* Outcome banner */}
        <PixelPanel frame="wood" padding="lg" className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div
            className={cn(
              'shrink-0 size-16 sm:size-20 flex items-center justify-center border-[3px] border-ink [&_svg]:size-10',
              victory ? 'bg-gold-500 text-ink' : 'bg-hp text-parchment-100',
            )}
            aria-hidden
          >
            {victory ? <Trophy /> : <Skull />}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 id="combat-result-title" className={cn('font-bold text-3xl sm:text-5xl leading-none', victory ? 'text-gold-300' : 'text-hp-light')}>
              {victory ? 'Victory' : 'Defeat'}
            </h2>
            <p className="mt-2 text-base text-parchment-300">
              {victory ? 'The dissonance has been cleared.' : 'Your party was overwhelmed. Regroup and try again.'}
            </p>
          </div>
          <div className="px-frame px-frame-inset flex flex-col items-center px-5 py-2">
            <SectionLabel>Rank</SectionLabel>
            <span className={cn('mt-1 font-label text-5xl leading-none', RANK_COLOR[stats.rank])}>{stats.rank}</span>
          </div>
        </PixelPanel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PixelPanel title="Performance">
            <dl className="flex flex-col gap-2">
              <StatRow icon={<Zap />} label="Total damage" value={stats.totalDamage.toString()} />
              <StatRow icon={<Sparkles />} label="Best rhythm combo" value={`${stats.maxCombo}×`} />
              <StatRow icon={<Clock />} label="Turns taken" value={stats.turnsTaken.toString()} />
            </dl>
          </PixelPanel>

          <PixelPanel title="Rewards">
            <div className="flex flex-col gap-3">
              <div className="px-frame px-frame-inset px-frame-sm flex items-center justify-between px-3 py-2">
                <span className="text-sm text-parchment-300">Expedition XP</span>
                <span className={cn('font-label text-base', victory ? 'text-xp' : 'text-parchment-500')}>+{xpGained}</span>
              </div>

              {capturedEntry ? (
                <div className="px-frame px-frame-parchment flex items-center gap-3 p-3">
                  <div className="shrink-0 size-16 bg-parchment-100 border-[3px] border-ink p-1 overflow-hidden">
                    <img src={`/assets/instruments/${capturedEntry.id}.png?v=2`} alt={capturedEntry.name} className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <PixelChip tone="gold" className="self-start">Instrument captured</PixelChip>
                    <span className="font-bold text-lg leading-tight text-ink">{capturedEntry.name}</span>
                    <span className="text-xs text-wood-700">{capturedEntry.type} · {capturedEntry.skillName}</span>
                  </div>
                </div>
              ) : (
                <p className="px-frame px-frame-inset px-frame-sm px-3 py-4 text-center text-sm text-parchment-500">
                  No instruments captured
                </p>
              )}
            </div>
          </PixelPanel>
        </div>

        <PixelButton variant="primary" size="lg" fullWidth icon={<ChevronRight />} onClick={onContinue}>
          {victory ? 'Continue' : 'Return to Map'}
        </PixelButton>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="px-frame px-frame-inset px-frame-sm flex items-center justify-between gap-3 px-3 py-2">
      <dt className="flex items-center gap-2 text-sm text-parchment-300 [&_svg]:size-4 [&_svg]:text-parchment-500">
        {icon}
        {label}
      </dt>
      <dd className="font-label text-base text-parchment-100">{value}</dd>
    </div>
  );
}
