import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type PixelBarKind = 'hp' | 'heal' | 'xp' | 'gold' | 'neutral';

const FILL: Record<PixelBarKind, { fill: string; lo: string }> = {
  hp:      { fill: 'var(--color-hp)',        lo: 'var(--color-hp-dark)' },
  heal:    { fill: 'var(--color-heal)',      lo: 'var(--color-heal-dark)' },
  xp:      { fill: 'var(--color-xp)',        lo: 'var(--color-xp-dark)' },
  gold:    { fill: 'var(--color-gold-500)',  lo: 'var(--color-gold-700)' },
  neutral: { fill: 'var(--color-parchment-300)', lo: 'var(--color-parchment-500)' },
};

export interface PixelBarProps {
  value: number;
  max?: number;
  kind?: PixelBarKind;
  label?: ReactNode;
  valueText?: ReactNode;
  /** Bar body height in px (excluding frame). */
  height?: number;
  /** Draw segment ticks every N% (0 = none). */
  segments?: number;
  className?: string;
  /** CSS transition for the fill width; pass 'none' for instant updates. */
  transition?: string;
}

export function PixelBar({
  value, max = 100, kind = 'neutral', label, valueText, height = 12, segments = 10, className, transition,
}: PixelBarProps) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const colors = FILL[kind];

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label || valueText) && (
        <div className="flex items-end justify-between gap-2 text-xs font-semibold leading-none text-parchment-100">
          <span>{label}</span>
          <span>{valueText}</span>
        </div>
      )}
      <div
        className="px-frame px-frame-inset px-frame-sm overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
      >
        <div className="relative w-full" style={{ height }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${pct}%`,
              background: colors.fill,
              boxShadow: `inset 0 -2px 0 ${colors.lo}, inset 0 2px 0 rgba(255,255,255,0.25)`,
              transition: transition ?? 'width 240ms steps(6)',
            }}
          />
          {segments > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, transparent 0 calc(${segments}% - 2px), rgba(27,20,34,0.55) calc(${segments}% - 2px) ${segments}%)`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
