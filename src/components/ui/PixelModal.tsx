import { useEffect, useRef, type ReactNode } from 'react';
import { Close } from 'pixelarticons/react';
import { cn } from '../../lib/cn';
import { playUiSound } from '../../hooks/useUiSound';

export interface PixelModalProps {
  open?: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class for the dialog. */
  maxWidth?: string;
  className?: string;
  bodyClassName?: string;
  closeSound?: string | null;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function PixelModal({
  open = true, onClose, title, subtitle, icon, children, footer,
  maxWidth = 'max-w-3xl', className, bodyClassName, closeSound = 'ui_back',
}: PixelModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (closeSound) playUiSound(closeSound);
        onCloseRef.current();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, closeSound]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-plum-950/85 px-fade-in"
        onClick={() => { if (closeSound) playUiSound(closeSound); onClose(); }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={cn('px-frame px-frame-wood relative w-full max-h-[92dvh] flex flex-col px-rise-in', maxWidth, className)}
      >
        <header className="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b-[3px] border-ink bg-plum-800 shrink-0">
          {icon && <span className="flex text-gold-300 [&_svg]:size-6" aria-hidden>{icon}</span>}
          <div className="flex-1 min-w-0">
            <h2 className="font-pixel font-bold text-xl sm:text-2xl leading-none text-parchment-100 truncate">{title}</h2>
            {subtitle && <p className="mt-1 text-sm leading-tight text-parchment-300 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            className="px-btn px-btn-secondary size-10 p-0 [&_svg]:size-5"
            onClick={() => { if (closeSound) playUiSound(closeSound); onClose(); }}
          >
            <Close />
          </button>
        </header>
        <div className={cn('flex-1 min-h-0 overflow-y-auto p-3 sm:p-4', bodyClassName)}>{children}</div>
        {footer && (
          <footer className="shrink-0 flex flex-wrap items-center justify-end gap-3 px-3 py-2 sm:px-4 sm:py-3 border-t-[3px] border-ink bg-plum-800">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
