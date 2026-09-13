import { Skull } from 'pixelarticons/react';
import type { HeroProfile, TurnUnit } from '../../../types/expedition';
import { cn } from '../../../lib/cn';

interface TurnIndicatorProps {
  isHeroTurn: boolean;
  activeHeroName: string;
  turnQueue: TurnUnit[];
  turnIndex: number;
  className?: string;
}

/** Whose turn it is, plus the upcoming turn order. */
export function TurnIndicator({ isHeroTurn, activeHeroName, turnQueue, turnIndex, className }: TurnIndicatorProps) {
  const current = turnQueue.length ? turnIndex % turnQueue.length : -1;

  return (
    <div className={cn('px-frame px-frame-plum px-frame-sm flex items-center gap-2 sm:gap-3 px-2 py-1.5 sm:px-3 sm:py-2 max-w-full', className)}>
      <span className={cn('shrink-0 font-semibold text-sm sm:text-base leading-none', isHeroTurn ? 'text-gold-300' : 'text-hp-light')}>
        {isHeroTurn ? `${activeHeroName}'s turn` : 'Enemy turn'}
      </span>
      <ol className="flex items-center gap-1 overflow-x-auto" aria-label="Turn order">
        {turnQueue.map((unit, idx) => {
          const isCurrent = idx === current;
          return (
            <li
              key={idx}
              className={cn(
                'shrink-0 size-6 sm:size-7 border-2 overflow-hidden flex items-center justify-center',
                isCurrent ? 'border-gold-300' : 'border-ink',
                unit.isHero ? 'bg-plum-700' : 'bg-hp-dark text-parchment-100',
                !isCurrent && 'opacity-70',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {unit.isHero ? (
                <img src={(unit.unit as HeroProfile).avatar} alt={(unit.unit as HeroProfile).name} className="w-full h-full object-cover pixelated" />
              ) : (
                <Skull className="size-4" aria-label="Enemy" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
