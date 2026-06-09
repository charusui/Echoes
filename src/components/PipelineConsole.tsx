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
  'phase1-vision':    'SCANNING INSTRUMENT',
  'phase2-acoustic':  'EXTRACTING AUDIO TIMBRE',
  'phase3-mapping':   'MAPPING CONTROLS',
  'phase4-guardrail': 'DEPLOYING GUARDRAILS',
  'phase5-fuse':      'SYNTHESIZING PROFILE',
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
    <div className="min-h-screen bg-[#2a2d43] flex flex-col items-center justify-start px-4 pt-12 pb-12 relative z-0 overflow-hidden">
      
      {/* Halftone Dot Pattern Background */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />

      {/* Header */}
      <div className="w-full max-w-md text-center mb-6 relative z-10 flex flex-col items-center">
        <h1 
          className="font-orbitron text-2xl md:text-3xl font-black text-[#e0e5ed] mb-4 tracking-widest uppercase leading-tight"
          style={{ textShadow: '3px 3px 0px #0f0c0c, -1px -1px 0px #da2d46' }}
        >
          INITIALIZING<br />PROFILE
        </h1>
        {instrumentName && (
          <div className="bg-[#0f0c0c] border-[3px] border-[#da2d46] px-4 py-2 -skew-x-6 shadow-[4px_4px_0px_0px_#da2d46] inline-block animate-comic-pulse">
            <p className="text-[#f0dde0] text-xs font-space-mono font-bold tracking-widest skew-x-6 uppercase">
              TARGET ACQUIRED: <span className="text-[#da2d46]">{instrumentName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Heavy Mechanical Progress Bar */}
      <div className="w-full max-w-md mb-8 relative z-10">
        <div className="h-4 border-[4px] border-[#0f0c0c] bg-[#2a2d43] -skew-x-6 relative shadow-[4px_4px_0px_0px_#0f0c0c]">
          <div
            className="h-full bg-[#da2d46] transition-all duration-700 ease-out"
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 font-space-mono font-black text-[10px] md:text-xs uppercase tracking-widest">
          <span className="text-[#e0e5ed]">{Math.round(status.progress)}%</span>
          <span className={`${isComplete ? 'text-[#e0e5ed]' : isError ? 'text-[#da2d46]' : 'text-[#888ea1]'}`}>
            {isComplete ? 'COMPLETE' : isError ? 'ERROR' : 'PROCESSING...'}
          </span>
        </div>
      </div>

      {/* Phase Steps - Comic Panels */}
      <div className="w-full max-w-md space-y-3 mb-8 relative z-10">
        {PHASE_ORDER.map((phase, idx) => {
          const Icon = PHASE_ICONS[phase] ?? Zap;
          const isDone = isComplete || currentPhaseIndex > idx;
          const isActive = currentPhaseIndex === idx && !isComplete && !isError;
          const isPending = currentPhaseIndex < idx && !isComplete;

          // Phases 2+3 run in parallel
          const isParallel = phase === 'phase2-acoustic' || phase === 'phase3-mapping';

          // Determine styling based on state
          let panelStyles = 'bg-[#2a2d43] text-[#888ea1] border-[#0f0c0c] opacity-60';
          if (isActive) panelStyles = 'bg-[#da2d46] text-[#0f0c0c] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] translate-x-1 scale-[1.02]';
          else if (isDone) panelStyles = 'bg-[#e0e5ed] text-[#0f0c0c] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c]';

          return (
            <div
              key={phase}
              className={`border-[4px] p-3 transition-all duration-300 -skew-x-2 ${panelStyles}`}
            >
              <div className="flex items-center gap-3 skew-x-2">
                <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border-[3px] border-[#0f0c0c] ${
                  isActive ? 'bg-[#f0dde0]' : isDone ? 'bg-[#f0dde0]' : 'bg-[#2a2d43]'
                }`}>
                  {isDone
                    ? <CheckCircle size={18} className="text-[#0f0c0c] stroke-[3px]" />
                    : isActive
                      ? <Loader size={18} className="text-[#0f0c0c] animate-spin stroke-[3px]" />
                      : <Icon size={16} className="text-[#888ea1] stroke-[3px]" />
                  }
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-space-mono text-xs md:text-sm font-black tracking-widest uppercase">
                    [{PHASE_LABELS[phase]}]
                    {isParallel && <span className="ml-2 text-[9px] opacity-70 tracking-tighter">// PARALLEL</span>}
                  </div>
                  {isActive && status.detail && (
                    <div className="text-[10px] md:text-xs mt-0.5 truncate font-space-mono font-bold opacity-80">
                      &gt; {status.detail}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Log - Graphic Data Box */}
      <div className="w-full max-w-md relative z-10">
        <div className="border-[4px] border-[#0f0c0c] bg-[#0f0c0c] p-4 -skew-x-2 shadow-[6px_6px_0px_0px_#da2d46]">
          <div className="font-space-mono text-[10px] font-bold text-[#da2d46] mb-2 skew-x-2 tracking-widest uppercase">
            // SYSTEM OUTPUT LOG
          </div>
          
          <div ref={logRef} className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar skew-x-2 pr-2">
            {PIPELINE_PHASES.map(({ phase: p, label }) => {
              const idx = PHASE_ORDER.indexOf(p as typeof PHASE_ORDER[number]);
              const done = isComplete || currentPhaseIndex > idx;
              const active = currentPhaseIndex === idx && !isComplete;
              
              return (
                <div key={p} className={`font-space-mono text-[10px] md:text-xs font-bold ${
                  done ? 'text-[#e0e5ed]' : active ? 'text-[#da2d46] animate-comic-pulse' : 'text-[#888ea1]'
                }`}>
                  {done ? '[OK]' : active ? '>>>>' : '[--]'} {label.replace(/\[|\]/g, '')}
                </div>
              );
            })}
            {isComplete && (
              <div className="font-space-mono text-xs font-black text-[#e0e5ed] mt-3 bg-[#da2d46] inline-block px-2 py-0.5">
                &gt; SYNC COMPLETE. LAUNCHING.
              </div>
            )}
            {isError && (
              <div className="font-space-mono text-xs font-black text-[#0f0c0c] bg-[#e0e5ed] mt-3 inline-block px-2 py-0.5 animate-comic-glitch">
                &gt; ERROR: {status.error?.toUpperCase() ?? 'PIPELINE FAILED. LOADING FALLBACK.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heavy Sharp Decorative Loading Animation */}
      <div className="w-full max-w-md mt-8 flex justify-center gap-1.5 relative z-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 md:w-4 md:h-4 bg-[#da2d46] border-[2px] border-[#0f0c0c] -skew-x-6 animate-block-flash"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      {/* Animation & Scrollbar Styles */}
      <style>{`
        @keyframes comic-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        @keyframes block-flash {
          0%, 100% { background-color: #2a2d43; border-color: #0f0c0c; }
          50% { background-color: #da2d46; border-color: #f0dde0; }
        }
        @keyframes comic-glitch {
          0% { transform: translate(2px, 2px); }
          20% { transform: translate(-2px, -1px); }
          40% { transform: translate(1px, -2px); }
          60% { transform: translate(-1px, 2px); }
          80% { transform: translate(2px, -1px); }
          100% { transform: translate(0, 0); }
        }

        .animate-comic-pulse { animation: comic-pulse 1s ease-in-out infinite; }
        .animate-block-flash { animation: block-flash 0.9s steps(1) infinite; }
        .animate-comic-glitch { animation: comic-glitch 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite; }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f0c0c; border-left: 2px solid #2a2d43; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #da2d46; }
      `}</style>
    </div>
  );
}