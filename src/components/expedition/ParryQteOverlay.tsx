import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../../services/audioSynth';

interface ParryQteOverlayProps {
  enemyName: string;
  onParry: (parried: boolean) => void;
}

interface OsuCircle {
  id: number;
  num: number;
  x: number; // percentage
  y: number; // percentage
  spawnTime: number; // ms timestamp from start
  targetTime: number; // ms timestamp for perfect hit
  status: 'pending' | 'perfect' | 'good' | 'miss';
}

const CIRCLE_COUNT = 5;
const APPROACH_DURATION = 1400; // Time the ring takes to close in (ms)
const STAGGER = 350; // Delay between each circle spawning (ms)
const PRE_DELAY = 500; // Give the player half a second before the first one appears

export function ParryQteOverlay({
  enemyName: _enemyName,
  onParry,
}: ParryQteOverlayProps) {
  const [circles, setCircles] = useState<OsuCircle[]>([]);
  const [hits, setHits] = useState({ perfect: 0, good: 0, miss: 0 });
  const [screenShake, setScreenShake] = useState(false);
  
  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);
  const animRef = useRef<number | null>(null);

  // ─── BEATMAP GENERATION ───
  useEffect(() => {
    startTimeRef.current = performance.now();
    
    const generated: OsuCircle[] = Array.from({ length: CIRCLE_COUNT }, (_, i) => {
      // Keep circles within responsive safe bounds (20% to 80% width, 25% to 70% height)
      const x = 20 + Math.random() * 60;
      const y = 25 + Math.random() * 45; 
      
      const targetTime = PRE_DELAY + APPROACH_DURATION + (i * STAGGER);
      const spawnTime = targetTime - APPROACH_DURATION;

      return {
        id: i,
        num: i + 1,
        x,
        y,
        spawnTime,
        targetTime,
        status: 'pending',
      };
    });

    setCircles(generated);
  }, []);

  // ─── GAME ENGINE LOOP ───
  useEffect(() => {
    const loop = () => {
      if (finishedRef.current) return;
      const now = performance.now() - startTimeRef.current;

      setCircles(prev => {
        let changed = false;
        
        const next: OsuCircle[] = prev.map(c => {
          if (c.status === 'pending' && now > c.targetTime + 300) {
            changed = true;
            setHits(h => ({ ...h, miss: h.miss + 1 }));
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 150);
            audioEngine.playHitSFX('miss');
            return { ...c, status: 'miss' as const };
          }
          return c;
        });

        if (next.every(c => c.status !== 'pending')) {
          finishedRef.current = true;
          const totalScore = hits.perfect * 2 + hits.good * 1;
          const isSuccess = totalScore >= 5;
          
          setTimeout(() => {
            onParry(isSuccess);
          }, 800); 
        }

        return changed ? next : prev;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [hits, onParry]);

  // ─── HIT LOGIC ───
  const triggerHit = useCallback((targetId?: number) => {
    if (finishedRef.current) return;
    const now = performance.now() - startTimeRef.current;

    setCircles(prev => {
      const circleToHit = targetId !== undefined 
        ? prev.find(c => c.id === targetId)
        : prev.find(c => c.status === 'pending' && now >= c.spawnTime);

      if (!circleToHit || circleToHit.status !== 'pending') return prev;

      const timeDiff = Math.abs(now - circleToHit.targetTime);
      let newStatus: 'perfect' | 'good' | 'miss' = 'miss';

      if (timeDiff <= 120) {
        newStatus = 'perfect';
        setHits(h => ({ ...h, perfect: h.perfect + 1 }));
        audioEngine.playHitSFX('sick');
      } else if (timeDiff <= 300) {
        newStatus = 'good';
        setHits(h => ({ ...h, good: h.good + 1 }));
        audioEngine.playHitSFX('good');
      } else {
        newStatus = 'miss';
        setHits(h => ({ ...h, miss: h.miss + 1 }));
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 150);
        audioEngine.playHitSFX('miss');
      }

      return prev.map(c => c.id === circleToHit.id ? { ...c, status: newStatus } : c);
    });
  }, []);


  const shakeTransform = screenShake 
    ? `translate(${(Math.random() - 0.5) * 10}px, ${(Math.random() - 0.5) * 10}px)` 
    : 'none';

  return (
    <div 
      className="absolute inset-0 z-50 pointer-events-none touch-none select-none overflow-hidden animate-in fade-in duration-200"
      style={{ transform: shakeTransform }}
    >
      <style>{`
        @keyframes osuApproach {
          0% { transform: scale(3.5); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes osuPopIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes osuBurst {
          0% { transform: scale(0.8); opacity: 1; }
          30% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* Play Area */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {circles.map((circle) => {
          const isPending = circle.status === 'pending';
          
          return (
            <div 
              key={circle.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${circle.x}%`,
                top: `${circle.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 100 - circle.id, 
              }}
            >
              {/* Osu! Approach Ring */}
              {isPending && (
                <div 
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-20 sm:h-20 rounded-full border-[3px] sm:border-[4px] border-[#facc15] shadow-[0_0_8px_#facc15] pointer-events-none"
                  style={{
                    animation: `osuApproach ${APPROACH_DURATION}ms linear forwards`,
                    animationDelay: `${circle.spawnTime}ms`,
                    opacity: 0, 
                  }}
                />
              )}

              {/* The Hit Circle */}
              {isPending && (
                <div 
                  onPointerDown={(e) => { e.preventDefault(); triggerHit(circle.id); }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[#0f0c0c]/90 backdrop-blur-md border-[3px] sm:border-[4px] border-[#da2d46] shadow-[0_0_15px_rgba(218,45,70,0.8)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                  style={{
                    animation: `osuPopIn 200ms cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards`,
                    animationDelay: `${circle.spawnTime}ms`,
                    opacity: 0, 
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-[#da2d46]/20 animate-pulse pointer-events-none" />
                  <span className="font-orbitron font-black text-xl sm:text-2xl text-white pointer-events-none drop-shadow-[2px_2px_0px_#0f0c0c]">
                    {circle.num}
                  </span>
                </div>
              )}

              {/* Hit Feedback Burst */}
              {!isPending && (
                <div 
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-orbitron font-black text-xl sm:text-3xl tracking-widest uppercase pointer-events-none drop-shadow-[0_0_10px_currentColor] ${
                    circle.status === 'perfect' ? 'text-[#4ade80]' :
                    circle.status === 'good' ? 'text-[#facc15]' :
                    'text-[#da2d46]'
                  }`}
                  style={{
                    animation: 'osuBurst 500ms ease-out forwards',
                  }}
                >
                  {circle.status}
                </div>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
}