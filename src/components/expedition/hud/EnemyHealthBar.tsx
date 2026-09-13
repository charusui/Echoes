import { cn } from '../../../lib/cn';

interface EnemyHealthBarProps {
  name: string;
  level: number;
  isBoss?: boolean;
  hp: number;
  maxHp: number;
  /** Trailing "recent damage" value that drains after hp. */
  ghostHp?: number;
  stagger?: number;
  maxStagger?: number;
  shaking?: boolean;
  className?: string;
}

const pct = (v: number, max: number) => Math.max(0, Math.min(100, (v / (max || 1)) * 100));

export function EnemyHealthBar({
  name, level, isBoss, hp, maxHp, ghostHp = hp, stagger, maxStagger, shaking, className,
}: EnemyHealthBarProps) {
  return (
    <div className={cn('w-full flex flex-col gap-1', className)}>
      <div className="flex items-end justify-between gap-2 px-0.5 [text-shadow:0_2px_0_var(--color-ink)]">
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-base sm:text-xl leading-none text-parchment-100 truncate">{name}</span>
          {isBoss && <span className="shrink-0 px-1.5 py-0.5 border-2 border-ink bg-hp text-parchment-100 text-xs font-semibold leading-none [text-shadow:none]">Boss</span>}
        </span>
        <span className="shrink-0 font-label text-[8px] sm:text-base leading-none text-parchment-300">
          Lv {level} · {Math.max(0, hp)}/{maxHp}
        </span>
      </div>

      <div
        className="px-frame px-frame-inset px-frame-sm overflow-hidden"
        style={{ animation: shaking ? 'hpShake 0.4s ease-out both' : 'none' }}
        role="progressbar"
        aria-label={`${name} health`}
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={Math.max(0, hp)}
      >
        <div className="relative h-3 sm:h-4">
          <div className="absolute inset-y-0 left-0 bg-parchment-100/70 transition-[width] duration-700 ease-out" style={{ width: `${pct(ghostHp, maxHp)}%` }} />
          <div
            className="absolute inset-y-0 left-0 bg-hp shadow-[inset_0_-3px_0_var(--color-hp-dark),inset_0_2px_0_rgba(255,255,255,0.25)] transition-[width] duration-200"
            style={{ width: `${pct(hp, maxHp)}%` }}
          />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,transparent_calc(25%-1px),var(--color-ink)_calc(25%-1px)_25%,transparent_25%_calc(50%-1px),var(--color-ink)_calc(50%-1px)_50%,transparent_50%_calc(75%-1px),var(--color-ink)_calc(75%-1px)_75%,transparent_75%)] opacity-60" />
        </div>
      </div>

      {stagger !== undefined && maxStagger !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs leading-none text-parchment-300 [text-shadow:0_2px_0_var(--color-ink)]">Stagger</span>
          <div className="flex-1 h-2.5 bg-plum-700 border-2 border-ink overflow-hidden">
            <div className="h-full bg-gold-500 transition-[width] duration-300" style={{ width: `${pct(stagger, maxStagger)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
