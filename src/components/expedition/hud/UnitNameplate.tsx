import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

interface UnitNameplateProps {
  children: ReactNode;
  side: 'hero' | 'enemy';
  size?: 'sm' | 'md';
  className?: string;
}

/** Small name tag under a battle sprite. */
export function UnitNameplate({ children, side, size = 'sm', className }: UnitNameplateProps) {
  return (
    <span
      className={cn(
        'relative z-30 inline-block truncate text-center border-2 border-ink bg-plum-900 font-semibold leading-none',
        size === 'sm' ? 'px-2 py-1 text-xs sm:text-sm max-w-[150px]' : 'px-3 py-1.5 text-base',
        side === 'hero' ? 'text-gold-300' : 'text-parchment-100',
        className,
      )}
    >
      {children}
    </span>
  );
}
