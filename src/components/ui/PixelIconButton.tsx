import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { playUiSound } from '../../hooks/useUiSound';

export interface PixelIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  /** Accessible name; shown underneath when `showLabel` is set. */
  label: string;
  showLabel?: boolean;
  variant?: 'secondary' | 'primary' | 'danger';
  sound?: string | null;
}

export function PixelIconButton({
  icon, label, showLabel, variant = 'secondary', sound = 'ui_click', className, onClick, type = 'button', ...rest
}: PixelIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'px-btn',
        `px-btn-${variant}`,
        showLabel ? 'flex-col gap-1 min-h-14 min-w-14 px-2 py-1.5 [&_svg]:size-5' : 'size-11 p-0 [&_svg]:size-5',
        className,
      )}
      onClick={e => {
        if (sound) playUiSound(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      <span className="flex" aria-hidden>{icon}</span>
      {showLabel && <span className="text-xs leading-none font-medium">{label}</span>}
    </button>
  );
}
