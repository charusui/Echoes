import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { playUiSound } from '../../hooks/useUiSound';

export type PixelButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type PixelButtonSize = 'sm' | 'md' | 'lg';

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PixelButtonVariant;
  size?: PixelButtonSize;
  icon?: ReactNode;
  /** SFX id passed to audioEngine.playHitSFX. `null` disables the click sound. */
  sound?: string | null;
  fullWidth?: boolean;
}

const SIZE_CLASSES: Record<PixelButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm [&_svg]:size-4',
  md: 'min-h-11 px-4 text-base [&_svg]:size-5',
  lg: 'min-h-14 px-6 text-xl [&_svg]:size-6',
};

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(function PixelButton(
  { variant = 'secondary', size = 'md', icon, sound = 'ui_click', fullWidth, className, onClick, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('px-btn', `px-btn-${variant}`, SIZE_CLASSES[size], fullWidth && 'w-full', className)}
      onClick={e => {
        if (sound) playUiSound(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      {icon && <span className="shrink-0 flex" aria-hidden>{icon}</span>}
      {children != null && <span className="truncate pt-px">{children}</span>}
    </button>
  );
});
