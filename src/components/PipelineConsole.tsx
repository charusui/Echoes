import { CheckCircle, Loader, Zap, Music, Shield, Cpu, Merge, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { PipelineStatus } from '../types';
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
  'phase1-vision':    '[ SCANNING INSTRUMENT ]',
  'phase2-acoustic':  '[ EXTRACTING AUDIO TIMBRE ]',
  'phase3-mapping':   '[ MAPPING CONTROLS ]',
  'phase4-guardrail': '[ DEPLOYING GUARDRAILS ]',
  'phase5-fuse':      '[ SYNTHESIZING PROFILE ]',
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
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-start px-4 pt-8 pb-12">
      {/* Header */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="font-orbitron text-lg font-black text-cyan mb-1 tracking-wider glow-cyan">
          INITIALIZING INSTRUMENT PROFILE
        </h1>
        {instrumentName && (
          <p className="text-teal text-sm font-space-mono animate-pulse">
            Identified: <span className="text-cyan">{instrumentName}</span>
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-8">
        <div className="h-1 bg-charcoal rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal to-cyan transition-all duration-700 ease-out"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-silver/40 text-xs font-space-mono">{Math.round(status.progress)}%</span>
          <span className="text-silver/40 text-xs font-space-mono">
            {isComplete ? 'COMPLETE' : isError ? 'ERROR' : 'PROCESSING'}
          </span>
        </div>
      </div>

      {/* Phase Steps */}
      <div className="w-full max-w-md space-y-3 mb-6">
        {PHASE_ORDER.map((phase, idx) => {
          const Icon = PHASE_ICONS[phase] ?? Zap;
          const isDone = isComplete || currentPhaseIndex > idx;
          const isActive = currentPhaseIndex === idx && !isComplete && !isError;
          const isPending = currentPhaseIndex < idx && !isComplete;

          // Phases 2+3 run in parallel
          const isParallel = phase === 'phase2-acoustic' || phase === 'phase3-mapping';

          return (
            <div
              key={phase}
              className={`glass-card rounded-xl p-4 border transition-all duration-500 ${
                isActive ? 'border-cyan/50 shadow-lg shadow-cyan/10' :
                isDone   ? 'border-teal/30' :
                isPending ? 'border-silver/10 opacity-40' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDone ? 'bg-teal/20' : isActive ? 'bg-cyan/10' : 'bg-charcoal/50'
                }`}>
                  {isDone
                    ? <CheckCircle size={16} className="text-teal" />
                    : isActive
                      ? <Loader size={16} className="text-cyan animate-spin" />
                      : <Icon size={16} className="text-silver/30" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-space-mono text-xs font-bold tracking-wider ${
                    isDone ? 'text-teal' : isActive ? 'text-cyan' : 'text-silver/30'
                  }`}>
                    {PHASE_LABELS[phase]}
                    {isParallel && <span className="ml-2 text-[10px] opacity-60">// PARALLEL</span>}
                  </div>
                  {isActive && status.detail && (
                    <div className="text-silver/50 text-xs mt-1 truncate">{status.detail}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Log */}
      <div className="w-full max-w-md">
        <div className="glass-card rounded-xl border border-teal/10 p-4">
          <div className="font-space-mono text-xs text-silver/40 mb-2">// CONSOLE OUTPUT</div>
          <div ref={logRef} className="space-y-1 max-h-32 overflow-y-auto">
            {PIPELINE_PHASES.map(({ phase: p, label }) => {
              const idx = PHASE_ORDER.indexOf(p as typeof PHASE_ORDER[number]);
              const done = isComplete || currentPhaseIndex > idx;
              const active = currentPhaseIndex === idx && !isComplete;
              return (
                <div key={p} className={`font-space-mono text-xs ${
                  done ? 'text-teal/70' : active ? 'text-cyan animate-pulse' : 'text-silver/20'
                }`}>
                  {done ? '✓' : active ? '›' : '·'} {label}
                </div>
              );
            })}
            {isComplete && (
              <div className="font-space-mono text-xs text-cyan mt-2">
                ✓ Profile synthesis complete. Launching game...
              </div>
            )}
            {isError && (
              <div className="font-space-mono text-xs text-danger mt-2">
                ✗ {status.error ?? 'Pipeline error. Loading fallback profile...'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decorative scanning animation */}
      <div className="w-full max-w-md mt-6 flex justify-center">
        <div className="flex gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-teal/40 rounded-full animate-pulse"
              style={{
                height: `${8 + Math.sin(i * 0.8) * 8}px`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
