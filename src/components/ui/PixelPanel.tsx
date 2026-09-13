import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type PixelFrame = 'plum' | 'wood' | 'parchment' | 'inset';

export interface PixelPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  frame?: PixelFrame;
  /** Small caps title rendered as the panel's first row. */
  title?: ReactNode;
  titleAction?: ReactNode;
  small?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = { none: 'p-0', sm: 'p-2', md: 'p-3', lg: 'p-5' };

export function PixelPanel({
  frame = 'plum', title, titleAction, small, padding = 'md', className, children, ...rest
}: PixelPanelProps) {
  return (
    <div className={cn('px-frame', `px-frame-${frame}`, small && 'px-frame-sm', PADDING[padding], className)} {...rest}>
      {(title || titleAction) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          {title && <SectionLabel tone={frame === 'parchment' ? 'dark' : 'light'}>{title}</SectionLabel>}
          {titleAction}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionLabel({
  children, tone = 'light', className,
}: { children: ReactNode; tone?: 'light' | 'dark' | 'gold'; className?: string }) {
  return (
    <h4
      className={cn(
        'font-label text-base leading-none uppercase',
        tone === 'light' && 'text-parchment-300',
        tone === 'dark' && 'text-wood-700',
        tone === 'gold' && 'text-gold-300',
        className,
      )}
    >
      {children}
    </h4>
  );
}
