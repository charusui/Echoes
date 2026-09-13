import type { ReactNode } from 'react';

/** Keyboard key hint, drawn as a small pixel keycap. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 border-2 border-ink border-b-4 bg-plum-700 text-xs font-semibold leading-none uppercase text-parchment-100 [text-shadow:none] align-middle">
      {children}
    </kbd>
  );
}
