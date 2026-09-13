import { Shield } from 'pixelarticons/react';
import type { HarmonydexEntry, HeroProfile } from '../../../types/expedition';
import { cn } from '../../../lib/cn';

interface PartyMemberCardProps {
  hero: HeroProfile;
  instrument?: HarmonydexEntry;
  isTurn: boolean;
  size?: 'sm' | 'md';
  onSelect?: () => void;
}

const pct = (v: number, max: number) => Math.max(0, Math.min(100, (v / (max || 1)) * 100));

/** Party status row: portrait, HP bar, AP pips. The acting hero is lifted onto parchment. */
export function PartyMemberCard({ hero, instrument, isTurn, size = 'sm', onSelect }: PartyMemberCardProps) {
  const md = size === 'md';
  const knockedOut = hero.hp <= 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isTurn ? 'true' : undefined}
      className={cn(
        'px-frame px-frame-sm w-full flex items-center text-left',
        md ? 'gap-3 p-2.5' : 'gap-2 p-1.5',
        isTurn ? 'px-frame-parchment' : 'px-frame-plum hover:brightness-110',
        knockedOut && 'opacity-50 grayscale',
        'focus-visible:outline-[3px] focus-visible:outline-gold-300',
      )}
    >
      <img src={hero.avatar} alt="" className={cn('shrink-0 object-cover border-2 border-ink pixelated', md ? 'size-12' : 'size-8')} />

      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center gap-1.5">
          <span className={cn('truncate font-semibold leading-none', md ? 'text-base' : 'text-sm', isTurn ? 'text-ink' : 'text-parchment-100')}>
            {hero.name}
          </span>
          {instrument && (
            <span className={cn('shrink-0 bg-parchment-100 border-2 border-ink overflow-hidden', md ? 'size-5' : 'size-4')}>
              <img src={`/assets/instruments/${instrument.id}.png`} alt={instrument.name} className="w-full h-full object-contain mix-blend-multiply" />
            </span>
          )}
          {hero.shield > 0 && (
            <span className={cn('ml-auto shrink-0 flex items-center gap-0.5 text-xs leading-none', isTurn ? 'text-xp-dark' : 'text-xp')}>
              <Shield className="size-3" aria-hidden />{hero.shield}
            </span>
          )}
        </span>

        <span className="flex items-center gap-1.5" title={`HP ${hero.hp}/${hero.maxHp}`}>
          <span className={cn('flex-1 bg-plum-950 border-2 border-ink overflow-hidden', md ? 'h-2.5' : 'h-2')}>
            <span className="block h-full bg-heal transition-[width] duration-300" style={{ width: `${pct(hero.hp, hero.maxHp)}%` }} />
          </span>
          <span className={cn('shrink-0 text-xs leading-none tabular-nums', isTurn ? 'text-wood-700' : 'text-parchment-300')}>
            {hero.hp}
          </span>
        </span>

        <span className="flex items-center gap-0.5" aria-label={`${hero.ap} of ${hero.maxAp} AP`}>
          {Array.from({ length: hero.maxAp }).map((_, i) => (
            <span
              key={i}
              className={cn('border-2 border-ink', md ? 'size-2.5' : 'size-2', i < hero.ap ? 'bg-xp' : 'bg-plum-700')}
            />
          ))}
        </span>
      </span>
    </button>
  );
}
