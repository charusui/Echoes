import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

export type CombatCommandColor = 'primary' | 'purple' | 'blue' | 'green' | 'pink' | 'secondary' | 'ghost';

export interface CombatCommand {
  id: string;
  label: string;
  /** Cost or short rule, e.g. "1 AP". */
  hint?: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Each command keeps a fixed color so players learn it; retreat-style exits use `ghost`. */
  variant?: CombatCommandColor;
  /** Draws the gold cursor ring. Mark exactly one command. */
  featured?: boolean;
}

interface CommandMenuProps {
  commands: CombatCommand[];
  className?: string;
}

/** Battle command bar: color-coded actions, one featured with a gold ring, a quiet exit. */
export function CommandMenu({ commands, className }: CommandMenuProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end gap-2.5 sm:gap-3.5 p-1.5', className)} role="toolbar" aria-label="Battle commands">
      {commands.map(cmd => {
        const variant = cmd.variant ?? 'secondary';
        return (
          <div key={cmd.id} className="relative flex">
            <button
              type="button"
              onClick={cmd.onClick}
              disabled={cmd.disabled}
              className={cn(
                'px-btn w-full justify-start text-left min-h-12 sm:min-h-14 px-2.5 sm:px-4 gap-2 sm:gap-3 [&_svg]:size-5 [&_svg]:shrink-0',
                `px-btn-${variant}`,
                variant !== 'ghost' && 'px-btn-gloss',
                variant === 'ghost' && 'no-underline justify-center lg:justify-start',
              )}
            >
              <span className="flex" aria-hidden>{cmd.icon}</span>
              <span className="flex flex-col min-w-0 gap-1">
                <span className="text-sm sm:text-base font-semibold leading-none truncate">{cmd.label}</span>
                {cmd.hint && <span className="text-xs leading-none opacity-80 truncate">{cmd.hint}</span>}
              </span>
            </button>
            {cmd.featured && !cmd.disabled && <span className="px-cursor-ring" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}
