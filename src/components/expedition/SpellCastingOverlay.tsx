import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';
import { type HeroProfile, type HarmonydexEntry } from '../../types/expedition';

interface SpellCastingOverlayProps {
  hero: HeroProfile;
  instrument: HarmonydexEntry;
  onComplete: (success: boolean, completedPoints: number) => void;
}

const MAX_POINTS = 20;
const TIME_LIMIT = 4000; 

type PhaseMode = 'scatter' | 'linear' | 'circle';

// Global counter to cycle through the mini-games sequentially across different spell casts
let spellCastCount = 0;

// Helper to generate specific patterns
const generateDots = (mode: PhaseMode) => {
  const newDots: Array<{ id: number; x: number; y: number }> = [];
  
  if (mode === 'scatter') {
    for (let i = 0; i < MAX_POINTS; i++) {
      let x = 0, y = 0, valid = false;
      let attempts = 0;
      do {
        x = 10 + Math.random() * 80;
        y = 10 + Math.random() * 80;
        valid = true;
        for (const d of newDots) {
          if (Math.hypot(d.x - x, d.y - y) < 18) { valid = false; break; }
        }
        attempts++;
      } while (!valid && attempts < 100);
      newDots.push({ id: i, x, y });
    }
  } 
  else if (mode === 'linear') {
    const angle = Math.random() * Math.PI * 2;
    const length = 80; 
    const startX = 50 - (Math.cos(angle) * length) / 2;
    const startY = 50 - (Math.sin(angle) * length) / 2;
    for (let i = 0; i < MAX_POINTS; i++) {
      const t = i / (MAX_POINTS - 1);
      newDots.push({ 
        id: i, 
        x: startX + Math.cos(angle) * length * t, 
        y: startY + Math.sin(angle) * length * t 
      });
    }
  } 
  else if (mode === 'circle') {
    const radius = 35;
    const startAngle = Math.random() * Math.PI * 2;
    const direction = Math.random() > 0.5 ? 1 : -1;
    for (let i = 0; i < MAX_POINTS; i++) {
      const angle = startAngle + direction * (i / (MAX_POINTS)) * Math.PI * 1.8;
      newDots.push({ id: i, x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius });
    }
  }
  return newDots;
};

// Shuffle function for scatter mode only
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function SpellCastingOverlay({ hero, instrument: _instrument, onComplete }: SpellCastingOverlayProps) {
  // Cycle sequentially through Scatter -> Linear -> Circle
  const mode = useMemo<PhaseMode>(() => {
    const modes: PhaseMode[] = ['scatter', 'linear', 'circle'];
    const selected = modes[spellCastCount % modes.length];
    spellCastCount++; 
    return selected;
  }, []);

  const [dots] = useState(() => generateDots(mode));
  
  // For scatter mode, we randomize the spawn order. For linear/circle, we keep order.
  const spawnOrder = useMemo(() => {
    const base = [...Array(MAX_POINTS).keys()];
    return mode === 'scatter' ? shuffleArray(base) : base;
  }, [mode]);
  
  const [spawnedCount, setSpawnedCount] = useState(0);
  const [hitIds, setHitIds] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const spawnedCountRef = useRef(0);
  const hitIdsRef = useRef(new Set<number>());
  const finishedRef = useRef(false);

  const handleEnd = useCallback((finalScore: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete(finalScore >= 15, finalScore);
  }, [onComplete]);

  // Main Game Loop: Sequential Spawning & Timer
  useEffect(() => {
    let startTime: number | null = null;
    let reqId: number;
    const spawnInterval = (TIME_LIMIT * 0.7) / MAX_POINTS;

    const loop = (time: number) => {
      if (finishedRef.current) return;
      if (!startTime) startTime = time;
      
      const elapsed = time - startTime;
      const remaining = Math.max(0, TIME_LIMIT - elapsed);
      setTimeLeft(remaining);

      const expectedSpawns = Math.min(MAX_POINTS, Math.floor(elapsed / spawnInterval));
      if (expectedSpawns > spawnedCountRef.current) {
        spawnedCountRef.current = expectedSpawns;
        setSpawnedCount(expectedSpawns);
      }

      if (remaining <= 0) {
        handleEnd(hitIdsRef.current.size);
      } else {
        reqId = requestAnimationFrame(loop);
      }
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [handleEnd]);

  // Swipe / Drag Detection
  const checkHit = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || finishedRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;

    let hitSomething = false;
    const currentHits = new Set(hitIdsRef.current);
    
    // Check only spawned dots
    for (let i = 0; i < spawnedCountRef.current; i++) {
      const dotIndex = spawnOrder[i];
      const dot = dots[dotIndex];
      if (!currentHits.has(dot.id)) {
        if (Math.hypot(dot.x - xPct, dot.y - yPct) < 15) {
          currentHits.add(dot.id);
          hitSomething = true;
        }
      }
    }

    if (hitSomething) {
      audioEngine.playHitSFX('good');
      hitIdsRef.current = currentHits;
      setHitIds(currentHits);
      if (currentHits.size >= MAX_POINTS) handleEnd(currentHits.size);
    }
  }, [dots, spawnOrder, handleEnd]);

  const modeData = {
    scatter: { title: 'CHAOS SCATTER', subtitle: 'SWIPE RAPIDLY!' },
    linear: { title: 'LINEAR STRIKE', subtitle: 'SLASH THE LINE!' },
    circle: { title: 'ARCANE CIRCLE', subtitle: 'TRACE THE RUNE!' }
  }[mode];

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[260px] sm:max-w-sm mx-auto animate-in fade-in zoom-in-95">
      
      <div className="w-full bg-[#0f0c0c]/95 border-[2px] sm:border-[3px] border-[#facc15] shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] p-2 mb-2 flex flex-col items-center text-center">
        <span className="text-[#facc15] font-orbitron font-black text-xs uppercase tracking-wider">{modeData.title}</span>
        <span className="text-slate-300 text-[9px] font-bold mt-0.5 uppercase">{modeData.subtitle}</span>
        
        <div className="flex gap-2 mt-2 w-full justify-center">
          <div className="px-2 py-1 bg-[#e0e5ed] text-[#0f0c0c] font-orbitron font-black text-xs -skew-x-6">
             {(timeLeft / 1000).toFixed(1)}S
          </div>
          <div className="bg-[#38bdf8] text-[#0f0c0c] px-2 py-1 font-orbitron font-black text-xs -skew-x-6">
             PTS: {hitIds.size}/{MAX_POINTS}
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-square max-h-[50vh] bg-[#151828]/95 border-[3px] border-[#1e2238] shadow-[0px_8px_24px_rgba(0,0,0,0.8)] touch-none cursor-crosshair rounded-sm"
        onPointerDown={(e) => checkHit(e.clientX, e.clientY)}
        onPointerMove={(e) => e.buttons > 0 && checkHit(e.clientX, e.clientY)}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#38bdf8 2px, transparent 2px)', backgroundSize: '20px 20px' }} />

        {spawnOrder.slice(0, spawnedCount).map((dotIdx) => {
          const dot = dots[dotIdx];
          const isHit = hitIds.has(dot.id);
          return (
            <div
              key={dot.id}
              className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-[3px] flex items-center justify-center transition-all duration-150 pointer-events-none
                ${isHit ? 'bg-[#4ade80] border-[#4ade80] scale-110 shadow-[0_0_15px_#4ade80]' : 'bg-[#1e2238] border-[#38bdf8] scale-100'}
              `}
              style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
            >
              {isHit ? <Check size={20} className="text-[#0f0c0c]" /> : <div className="w-3 h-3 bg-[#da2d46] rounded-full animate-pulse" />}
            </div>
          );
        })}
      </div>
      
      <div className="mt-2 bg-[#0f0c0c] border-[2px] border-[#38bdf8] px-3 py-1 flex items-center gap-2 -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]">
         <Sparkles className="w-4 h-4 text-[#38bdf8]" />
         <span className="font-orbitron font-black text-[10px] text-white uppercase tracking-widest truncate">{hero.name}</span>
      </div>
    </div>
  );
}