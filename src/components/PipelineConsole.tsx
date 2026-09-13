import { Check as CheckCircle, Loader, Zap, Music, Shield, Cpu, GitMerge as Merge } from 'pixelarticons/react';
import type { ComponentType as __PxComponentType, SVGProps as __PxSVGProps } from 'react';
type LucideIcon = __PxComponentType<__PxSVGProps<SVGSVGElement> & { size?: number | string }>;
import { useEffect, useRef } from 'react';
import type { PipelineStatus } from '../types';
import { PixelBar, PixelChip, PixelPanel } from './ui';
import { cn } from '../lib/cn';
import { PIPELINE_PHASES } from '../constants';

interface PipelineConsoleProps {
  status: PipelineStatus;
  instrumentName?: string;
}

const PHASE_ORDER: PipelineStatus['phase'][] = [
  'phase1-vision', 'phase2-acoustic', 'phase3-mapping', 'phase4-guardrail', 'phase5-fuse',
];

const PHASE_ICONS: Record<string, LucideIcon> = {
  'phase1-vision':    Zap,
  'phase2-acoustic':  Music,
  'phase3-mapping':   Cpu,
  'phase4-guardrail': Shield,
  'phase5-fuse':      Merge,
};

const PHASE_LABELS: Record<string, string> = {
  'phase1-vision':    'Identifying the instrument',
  'phase2-acoustic':  'Learning its sound',
  'phase3-mapping':   'Mapping the controls',
  'phase4-guardrail': 'Checking the details',
  'phase5-fuse':      'Building your instrument',
};

function getPhaseIndex(phase: PipelineStatus['phase']): number {
  return PHASE_ORDER.indexOf(phase as PipelineStatus['phase']);
}

export function PipelineConsole({ status, instrumentName }: PipelineConsoleProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [status]);

  const currentPhaseIndex = getPhaseIndex(status.phase);
  const isComplete = status.phase === 'complete';
  const isError = status.phase === 'error';

  return (
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-5">
        <header className="text-center flex flex-col items-center gap-3">
          <h1 className="font-bold text-3xl leading-none">
            {isComplete ? 'Instrument ready!' : isError ? 'Something went wrong' : 'Studying your instrument...'}
          </h1>
          {instrumentName && <PixelChip tone="gold">{instrumentName}</PixelChip>}
        </header>

        <PixelBar
          kind={isError ? 'hp' : isComplete ? 'heal' : 'gold'}
          height={14}
          value={status.progress}
          label={isComplete ? 'Complete' : isError ? 'Error' : 'Working'}
          valueText={`${Math.round(status.progress)}%`}
          transition="width 700ms steps(8)"
        />

        <ol className="flex flex-col gap-2">
          {PHASE_ORDER.map((phase, idx) => {
            const Icon = PHASE_ICONS[phase] ?? Zap;
            const isDone = isComplete || currentPhaseIndex > idx;
            const isActive = currentPhaseIndex === idx && !isComplete && !isError;

            return (
              <li
                key={phase}
                className={cn(
                  'px-frame flex items-center gap-3 p-3',
                  isActive ? 'px-frame-parchment' : isDone ? 'px-frame-plum' : 'px-frame-inset opacity-60',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'shrink-0 size-9 flex items-center justify-center border-[3px] border-ink [&_svg]:size-5',
                    isDone ? 'bg-heal text-ink' : isActive ? 'bg-gold-500 text-ink' : 'bg-plum-800 text-parchment-500',
                  )}
                  aria-hidden
                >
                  {isDone ? <CheckCircle /> : isActive ? <Loader className="animate-spin" /> : <Icon />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={cn('block font-semibold text-base leading-none', isActive ? 'text-ink' : 'text-parchment-100')}>
                    {PHASE_LABELS[phase]}
                  </span>
                  {isActive && status.detail && (
                    <span className="block mt-1 truncate text-sm text-wood-700">{status.detail}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        <PixelPanel frame="inset" padding="sm" title="Log">
          <div ref={logRef} className="flex flex-col gap-1 max-h-32 overflow-y-auto font-label text-[8px] sm:text-base leading-tight">
            {PIPELINE_PHASES.map(({ phase: p, label }) => {
              const idx = PHASE_ORDER.indexOf(p as typeof PHASE_ORDER[number]);
              const done = isComplete || currentPhaseIndex > idx;
              const active = currentPhaseIndex === idx && !isComplete;
              return (
                <p key={p} className={cn(done ? 'text-heal' : active ? 'text-gold-300' : 'text-parchment-500')}>
                  {done ? 'OK' : active ? '>>' : '--'} {label.replace(/\[|\]/g, '')}
                </p>
              );
            })}
            {isComplete && <p className="text-heal">Ready. Launching...</p>}
            {isError && <p className="text-hp-light">{status.error ?? 'Pipeline failed. Loading a fallback instrument.'}</p>}
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
