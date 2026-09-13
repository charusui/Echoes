import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { playUiSound } from '../../hooks/useUiSound';

export interface PixelTab<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

export interface PixelTabsProps<T extends string> {
  tabs: PixelTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  sound?: string | null;
}

export function PixelTabs<T extends string>({ tabs, value, onChange, className, sound = 'ui_click' }: PixelTabsProps<T>) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto', className)}>
      {tabs.map(tab => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => {
              if (active) return;
              if (sound) playUiSound(sound);
              onChange(tab.id);
            }}
            className={cn(
              'relative shrink-0 inline-flex items-center gap-2 min-h-10 px-3 border-[3px] border-ink border-b-0 text-sm font-semibold [&_svg]:size-4',
              'focus-visible:outline-[3px] focus-visible:outline-gold-300 focus-visible:-outline-offset-[6px]',
              active
                ? 'bg-plum-800 text-gold-300 shadow-[inset_0_3px_0_var(--color-plum-600)]'
                : 'bg-plum-950 text-parchment-300 hover:text-parchment-100',
            )}
          >
            {tab.icon && <span className="flex" aria-hidden>{tab.icon}</span>}
            <span className="pt-px">{tab.label}</span>
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
