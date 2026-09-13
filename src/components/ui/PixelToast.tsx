import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface PixelToastProps {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'info' | 'danger' | 'success';
  className?: string;
}

const ACCENT = { info: 'text-gold-300', danger: 'text-hp-light', success: 'text-heal' };

export function PixelToast({ children, icon, tone = 'info', className }: PixelToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'px-frame px-frame-wood px-rise-in flex items-center gap-3 px-4 py-3 max-w-[90vw] text-base font-medium text-parchment-100 [&_svg]:size-5',
        className,
      )}
    >
      {icon && <span className={cn('flex shrink-0', ACCENT[tone])} aria-hidden>{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
