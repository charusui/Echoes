import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Star, Zap, CircleDot, Wand2, Slash, Circle } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';
import { type HeroProfile, type HarmonydexEntry } from '../../types/expedition';

interface SpellCastingOverlayProps {
  hero: HeroProfile;
  instrument: HarmonydexEntry;
  onComplete: (success: boolean, completedPoints: number) => void;
}

const MAX_POINTS = 20;
const TIME_LIMIT = 4000; // 4.0 seconds total casting time

// Cycle cleanly through: Orbit (replacing Scatter) -> Linear -> Circle -> Constellation
type OverdriveMode = 'orbit' | 'linear' | 'circle' | 'constellation';

let spellCastCount = 0;

interface RuneNode {
  id: number;
  angleDeg?: number; // for orbit mode
  x?: number; // percentage for constellation/linear/circle dots
  y?: number;
  lit: boolean;
  hitQuality?: 'perfect' | 'good';
}

// Helper to generate dots for linear and circle modes
const generateDots = (mode: OverdriveMode): Array<{ id: number; x: number; y: number }> => {
  const newDots: Array<{ id: number; x: number; y: number }> = [];
  
  if (mode === 'linear') {
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
  } else if (mode === 'circle') {
    const radius = 35;
    const startAngle = Math.random() * Math.PI * 2;
    const direction = Math.random() > 0.5 ? 1 : -1;
    for (let i = 0; i < MAX_POINTS; i++) {
      const angle = startAngle + direction * (i / MAX_POINTS) * Math.PI * 1.8;
      newDots.push({ id: i, x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius });
    }
  }
  return newDots;
};

export function SpellCastingOverlay({ hero, instrument, onComplete }: SpellCastingOverlayProps) {
  // Cycle sequentially across all 4 modes without skipping inside React StrictMode
  const [mode] = useState<OverdriveMode>(() => {
    const modes: OverdriveMode[] = ['orbit', 'linear', 'circle', 'constellation'];
    return modes[spellCastCount % modes.length];
  });

  // Initialize nodes for Orbit and Constellation modes
  const [runes, setRunes] = useState<RuneNode[]>(() => {
    if (mode === 'orbit') {
      return [
        { id: 0, angleDeg: -90, lit: false },
        { id: 1, angleDeg: -18, lit: false },
        { id: 2, angleDeg: 54, lit: false },
        { id: 3, angleDeg: 126, lit: false },
        { id: 4, angleDeg: 198, lit: false },
      ];
    } else if (mode === 'constellation') {
      return [
        { id: 0, x: 50, y: 18, lit: false },
        { id: 1, x: 82, y: 44, lit: false },
        { id: 2, x: 70, y: 80, lit: false },
        { id: 3, x: 30, y: 80, lit: false },
        { id: 4, x: 18, y: 44, lit: false },
      ];
    }
    return [];
  });

  // Initialize dots for Linear and Circle modes
  const [dots] = useState(() => generateDots(mode));
  const [spawnedCount, setSpawnedCount] = useState(0);
  const [hitIds, setHitIds] = useState<Set<number>>(new Set());

  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [currentOrbitAngle, setCurrentOrbitAngle] = useState(-90);
  const [constellationStep, setConstellationStep] = useState(0);
  const [hitEffects, setHitEffects] = useState<Array<{ id: number; x: number; y: number; text: string }>>([]);
  const [isHolding, setIsHolding] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const runesRef = useRef(runes);
  runesRef.current = runes;
  const spawnedCountRef = useRef(0);
  const hitIdsRef = useRef(new Set<number>());
  const isHoldingRef = useRef(false);
  const lastConstellationIgniteRef = useRef(0);

  const handleEnd = useCallback((finalScore: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    spellCastCount = (spellCastCount + 1) % 4;
    onComplete(finalScore >= 12, finalScore);
  }, [onComplete]);

  // Main Game Loop & Timer
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

      if (mode === 'orbit') {
        const totalDegreeSweep = 720;
        const newAngle = -90 + (elapsed / TIME_LIMIT) * totalDegreeSweep;
        setCurrentOrbitAngle(newAngle);
      } else if (mode === 'linear' || mode === 'circle') {
        const expectedSpawns = Math.min(MAX_POINTS, Math.floor(elapsed / spawnInterval));
        if (expectedSpawns > spawnedCountRef.current) {
          spawnedCountRef.current = expectedSpawns;
          setSpawnedCount(expectedSpawns);
        }
      } else if (mode === 'constellation' && isHoldingRef.current && !finishedRef.current) {
        if (time - lastConstellationIgniteRef.current >= 300) {
          const unlitIdx = runesRef.current.findIndex(r => !r.lit);
          if (unlitIdx !== -1) {
            const target = runesRef.current[unlitIdx];
            audioEngine.playHitSFX('perfect');
            setRunes(prev => prev.map(r => r.id === target.id ? { ...r, lit: true, hitQuality: 'perfect' } : r));
            setHitEffects(prev => [...prev, { id: Date.now(), x: target.x!, y: target.y!, text: 'CHARGED!' }]);
            lastConstellationIgniteRef.current = time;
            setConstellationStep(unlitIdx + 1);

            if (unlitIdx === runesRef.current.length - 1) {
              setTimeout(() => handleEnd(MAX_POINTS), 200);
            }
          }
        }
      }

      if (remaining <= 0) {
        if (mode === 'linear' || mode === 'circle') {
          handleEnd(hitIdsRef.current.size);
        } else {
          const litCount = runesRef.current.filter(r => r.lit).length;
          handleEnd(litCount * 4);
        }
      } else {
        reqId = requestAnimationFrame(loop);
      }
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [mode, handleEnd]);

  // ─── MODE 1: ORBIT RESONANCE (TAP WHEN ORB PASSES GLYPH) ───
  const handleOrbitTap = useCallback(() => {
    if (finishedRef.current || mode !== 'orbit') return;

    const normalizedCurrent = ((currentOrbitAngle % 360) + 360) % 360;
    let bestRune: RuneNode | null = null;
    let minDiff = 999;

    for (const r of runesRef.current) {
      if (r.lit) continue;
      const normTarget = (((r.angleDeg! % 360) + 360) % 360);
      let diff = Math.abs(normalizedCurrent - normTarget);
      if (diff > 180) diff = 360 - diff;

      if (diff < minDiff) {
        minDiff = diff;
        bestRune = r;
      }
    }

    if (bestRune && minDiff <= 32) {
      const quality = minDiff <= 14 ? 'perfect' : 'good';
      audioEngine.playHitSFX(quality);

      setRunes(prev => prev.map(r => r.id === bestRune!.id ? { ...r, lit: true, hitQuality: quality } : r));

      const rad = (bestRune.angleDeg! * Math.PI) / 180;
      const x = 50 + Math.cos(rad) * 38;
      const y = 50 + Math.sin(rad) * 38;
      setHitEffects(prev => [...prev, { id: Date.now(), x, y, text: quality === 'perfect' ? 'PERFECT!' : 'GOOD!' }]);

      const nextLitCount = runesRef.current.filter(r => r.lit).length + 1;
      if (nextLitCount >= 5) {
        setTimeout(() => handleEnd(MAX_POINTS), 200);
      }
    } else {
      audioEngine.playHitSFX('miss');
    }
  }, [mode, currentOrbitAngle, handleEnd]);

  // ─── MODE 2 & 3: LINEAR & CIRCLE (SLASH / TRACE THE DOTS) ───
  const checkDotHit = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || finishedRef.current || (mode !== 'linear' && mode !== 'circle')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;

    let hitSomething = false;
    const currentHits = new Set(hitIdsRef.current);

    for (let i = 0; i < spawnedCountRef.current; i++) {
      const dot = dots[i];
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
  }, [mode, dots, handleEnd]);

  // Clean up floating hit text after 600ms
  useEffect(() => {
    if (hitEffects.length > 0) {
      const timer = setTimeout(() => {
        setHitEffects(prev => prev.slice(1));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [hitEffects]);

  const currentPoints = (mode === 'linear' || mode === 'circle') ? hitIds.size : runes.filter(r => r.lit).length * 4;

  const modeData = mode === 'orbit' 
    ? { title: 'RUNE RESONANCE', subtitle: 'TAP SCREEN WHEN ORB PASSES OVER GLYPHS!', icon: CircleDot }
    : mode === 'linear'
    ? { title: 'LINEAR STRIKE', subtitle: 'SLASH ALONG THE LINE OF RUNES!', icon: Slash }
    : mode === 'circle'
    ? { title: 'ARCANE CIRCLE', subtitle: 'TRACE ALONG THE RUNE CIRCLE!', icon: Circle }
    : { title: 'SIGIL CONSTELLATION', subtitle: 'PRESS & HOLD DOWN TO CHANNEL & IGNITE THE CONSTELLATION!', icon: Star };

  const ModeIcon = modeData.icon;

  return (
    <div 
      className="flex flex-col items-center justify-center w-full max-w-[320px] sm:max-w-md mx-auto animate-in fade-in zoom-in-95 select-none touch-none"
      onPointerDown={(e) => {
        if (mode === 'orbit') handleOrbitTap();
        else if (mode === 'linear' || mode === 'circle') checkDotHit(e.clientX, e.clientY);
        else if (mode === 'constellation') {
          setIsHolding(true);
          isHoldingRef.current = true;
          if (lastConstellationIgniteRef.current === 0) {
            lastConstellationIgniteRef.current = performance.now() - 300;
          }
        }
      }}
      onPointerMove={(e) => {
        if ((mode === 'linear' || mode === 'circle') && e.buttons > 0) {
          checkDotHit(e.clientX, e.clientY);
        }
      }}
      onPointerUp={() => {
        if (mode === 'constellation') {
          setIsHolding(false);
          isHoldingRef.current = false;
        }
      }}
      onPointerLeave={() => {
        if (mode === 'constellation') {
          setIsHolding(false);
          isHoldingRef.current = false;
        }
      }}
      onPointerCancel={() => {
        if (mode === 'constellation') {
          setIsHolding(false);
          isHoldingRef.current = false;
        }
      }}
    >
      {/* ── Overdrive Magic Circle Header ── */}
      <div className="w-full bg-[#0f0c0c]/95 border-[2px] sm:border-[3px] border-[#facc15] shadow-[0_0_30px_rgba(250,204,21,0.4)] p-2.5 sm:p-3 mb-3 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-md rounded-sm">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#facc15_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="flex items-center gap-2 relative z-10">
          <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#facc15] animate-pulse" />
          <span className="text-[#facc15] font-orbitron font-black text-xs sm:text-sm uppercase tracking-widest drop-shadow-[0_0_8px_#facc15]">
            {instrument.name.toUpperCase()} • {modeData.title}
          </span>
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#facc15] animate-pulse" />
        </div>
        
        <span className="text-slate-200 text-2xs sm:text-xs font-bold mt-1 uppercase tracking-wider bg-[#da2d46]/90 px-2.5 py-0.5 rounded-sm border border-[#facc15]/40 shadow-sm relative z-10 animate-bounce">
          {modeData.subtitle}
        </span>

        {/* Timer & Score Pill */}
        <div className="flex items-center gap-3 mt-2.5 w-full justify-center relative z-10">
          <div className="px-3 py-1 bg-[#e0e5ed] text-[#0f0c0c] font-orbitron font-black text-xs sm:text-sm -skew-x-6 border border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] flex items-center gap-1">
            <span>⏱️</span>
            <span>{(timeLeft / 1000).toFixed(1)}S</span>
          </div>
          <div className="px-3 py-1 bg-[#facc15] text-[#0f0c0c] font-orbitron font-black text-xs sm:text-sm -skew-x-6 border border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-[#0f0c0c]" />
            <span>POWER: {currentPoints}/{MAX_POINTS}</span>
          </div>
        </div>
      </div>

      {/* ── Magic Circle Arena ── */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-square max-h-[46vh] bg-[#0c0f1d]/95 border-[3px] border-[#38bdf8]/60 shadow-[0_0_40px_rgba(56,189,248,0.3)] rounded-full flex items-center justify-center cursor-pointer overflow-hidden backdrop-blur-xl"
      >
        {/* Outer Rotating Sacred Geometry Ring */}
        <div className="absolute inset-2 rounded-full border-[2px] border-dashed border-[#facc15]/30 animate-[spin_16s_linear_infinite] pointer-events-none" />
        {/* Inner Counter-Rotating Runes Ring */}
        <div className="absolute inset-8 rounded-full border border-[#38bdf8]/40 animate-[spin_10s_linear_infinite_reverse] pointer-events-none flex items-center justify-center">
          <div className="w-3/4 h-3/4 rounded-full border border-dotted border-[#da2d46]/30" />
        </div>

        {/* Center Core Pulse */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.4)_0%,transparent_70%)] animate-pulse flex items-center justify-center">
            <ModeIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#facc15] drop-shadow-[0_0_12px_#facc15]" />
          </div>
          <span className="font-orbitron font-bold text-2xs sm:text-xs text-[#38bdf8] uppercase tracking-widest mt-1 opacity-80">
            {hero.name}
          </span>
        </div>

        {/* ── MODE 1: ORBIT RESONANCE RINGS & ORB ── */}
        {mode === 'orbit' && (
          <>
            <div className="absolute w-[76%] h-[76%] rounded-full border-[2px] border-[#facc15]/40 pointer-events-none" />
            <div 
              className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none"
              style={{ transform: `rotate(${currentOrbitAngle}deg)` }}
            >
              <div className="absolute -top-3 sm:-top-4 left-[38%] -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#facc15] shadow-[0_0_20px_#facc15,0_0_40px_#ff8000] flex items-center justify-center border-2 border-white">
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
            </div>

            {runes.map((r) => {
              const rad = (r.angleDeg! * Math.PI) / 180;
              const x = 50 + Math.cos(rad) * 38;
              const y = 50 + Math.sin(rad) * 38;
              const normCurrent = ((currentOrbitAngle % 360) + 360) % 360;
              const normTarget = (((r.angleDeg! % 360) + 360) % 360);
              let diff = Math.abs(normCurrent - normTarget);
              if (diff > 180) diff = 360 - diff;
              const isAligned = !r.lit && diff <= 32;

              return (
                <div
                  key={r.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-150"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-[2px] sm:border-[3px] transition-all duration-200 ${
                      r.lit
                        ? 'bg-[#facc15] border-white scale-110 shadow-[0_0_25px_#facc15]'
                        : isAligned
                        ? 'bg-[#da2d46]/80 border-[#facc15] scale-125 shadow-[0_0_30px_#da2d46] animate-pulse'
                        : 'bg-[#1e2238]/90 border-[#38bdf8]/60 shadow-md opacity-80 hover:opacity-100'
                    }`}
                  >
                    {r.lit ? (
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#0f0c0c] fill-[#0f0c0c]" />
                    ) : (
                      <span className="font-orbitron font-black text-xs sm:text-sm text-white">
                        {r.id + 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── MODE 2 & 3: LINEAR & CIRCLE STRIKE (THE RESTORED QTEs) ── */}
        {(mode === 'linear' || mode === 'circle') && (
          <>
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#38bdf8 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
            {dots.map((dot) => {
              const isHit = hitIds.has(dot.id);
              const isSpawned = dot.id < spawnedCount;
              if (!isSpawned && !isHit) return null;

              return (
                <div
                  key={dot.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 pointer-events-none ${
                    isHit 
                      ? 'scale-150 opacity-0' 
                      : 'scale-100 opacity-100 animate-in zoom-in duration-100'
                  }`}
                  style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                >
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-[#38bdf8] flex items-center justify-center bg-[#151828]/90 shadow-[0_0_12px_#38bdf8]">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#da2d46] shadow-[0_0_8px_#da2d46]" />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── MODE 4: SIGIL CONSTELLATION STARS & PATH ── */}
        {mode === 'constellation' && (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {runes.map((r, i) => {
                if (i === runes.length - 1) return null;
                const next = runes[i + 1];
                const isLineLit = r.lit && next.lit;
                return (
                  <line
                    key={`line-${i}`}
                    x1={`${r.x}%`}
                    y1={`${r.y}%`}
                    x2={`${next.x}%`}
                    y2={`${next.y}%`}
                    stroke={isLineLit ? '#facc15' : 'rgba(56, 189, 248, 0.25)'}
                    strokeWidth={isLineLit ? '4' : '2'}
                    strokeDasharray={isLineLit ? 'none' : '6,6'}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {runes.map((r, i) => {
              const isCurrentTarget = i === constellationStep;

              return (
                <div
                  key={r.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200"
                  style={{ left: `${r.x}%`, top: `${r.y}%` }}
                >
                  {isCurrentTarget && (
                    <div className="absolute inset-0 -m-3 rounded-full border-2 border-[#facc15] animate-ping pointer-events-none" />
                  )}

                  <div
                    className={`w-12 h-12 sm:w-15 sm:h-15 rounded-full flex items-center justify-center border-[2px] sm:border-[3px] transition-all duration-200 ${
                      r.lit
                        ? 'bg-[#facc15] border-white scale-110 shadow-[0_0_25px_#facc15]'
                        : isCurrentTarget
                        ? 'bg-[#da2d46] border-[#facc15] scale-125 shadow-[0_0_30px_#da2d46] animate-pulse'
                        : 'bg-[#151828]/90 border-slate-600 opacity-60'
                    }`}
                  >
                    {r.lit ? (
                      <Star className="w-6 h-6 text-[#0f0c0c] fill-[#0f0c0c]" />
                    ) : (
                      <span className="font-orbitron font-black text-sm sm:text-base text-white">
                        {r.id + 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Hold Prompt Indicator in Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center text-center z-20">
              <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 transition-all duration-200 ${
                isHolding
                  ? 'bg-[#facc15]/95 border-white text-[#0f0c0c] scale-110 shadow-[0_0_35px_#facc15] animate-pulse font-black'
                  : 'bg-[#0f0c0c]/90 border-[#facc15] text-[#facc15] scale-100 shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-bounce font-bold'
              }`}>
                <span className="font-orbitron text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1.5">
                  <Star className={`w-4 h-4 ${isHolding ? 'fill-[#0f0c0c]' : 'fill-[#facc15]'}`} />
                  {isHolding ? '⚡ CHANNELING... ⚡' : '✨ HOLD TO CHANNEL ✨'}
                  <Star className={`w-4 h-4 ${isHolding ? 'fill-[#0f0c0c]' : 'fill-[#facc15]'}`} />
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Pop-up Hit Quality Feedback Alerts ── */}
        {hitEffects.map(effect => (
          <div
            key={effect.id}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none animate-out fade-out slide-out-to-top duration-500 z-30"
            style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
          >
            <span className="font-orbitron font-black text-sm sm:text-base text-[#facc15] drop-shadow-[0_2px_4px_#0f0c0c] uppercase tracking-wider bg-[#0f0c0c]/80 px-2 py-0.5 rounded border border-[#facc15]">
              {effect.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}