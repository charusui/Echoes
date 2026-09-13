import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type PixelChipTone =
  | 'neutral' | 'gold' | 'hp' | 'heal' | 'xp' | 'dark'
  | 'string' | 'perc' | 'brass' | 'synth' | 'wood';

const TONES: Record<PixelChipTone, string> = {
  neutral: 'bg-plum-700 text-parchment-100',
  dark: 'bg-plum-950 text-parchment-100',
  gold: 'bg-gold-500 text-ink',
  hp: 'bg-hp text-parchment-100',
  heal: 'bg-heal text-ink',
  xp: 'bg-xp text-ink',
  string: 'bg-el-string text-parchment-100',
  perc: 'bg-el-perc text-ink',
  brass: 'bg-el-brass text-ink',
  synth: 'bg-el-synth text-parchment-100',
  wood: 'bg-el-wood text-ink',
};

export interface PixelChipProps {
  tone?: PixelChipTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PixelChip({ tone = 'neutral', icon, children, className }: PixelChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 border-2 border-ink text-xs font-semibold leading-none uppercase whitespace-nowrap [&_svg]:size-3',
        TONES[tone],
        className,
      )}
    >
      {icon && <span className="flex" aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}
