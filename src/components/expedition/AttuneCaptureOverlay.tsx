import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { type EnemyProfile } from '../../types/expedition';
import { audioEngine } from '../../services/audioSynth';

interface AttuneCaptureOverlayProps {
  enemy: EnemyProfile;
  onComplete: (success: boolean) => void;
}

export function AttuneCaptureOverlay({ enemy, onComplete }: AttuneCaptureOverlayProps) {
  // Bosses or high level enemies require 3 green/strong hits. Normal enemies require 2 or 1.
  const targetHits = enemy.isBoss || enemy.level >= 3 ? 3 : enemy.level === 2 ? 2 : 1;
  const maxAttempts = targetHits + 2; // Extra attempts allowed before failing

  const [currentHits, setCurrentHits] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [needlePos, setNeedlePos] = useState(0); // 0 to 100
  const [isPaused, setIsPaused] = useState(false);
  const [lastResultText, setLastResultText] = useState<string | null>(null);
  const [lastHitColor, setLastHitColor] = useState<'green' | 'orange' | 'yellow' | 'black' | null>(null);

  const directionRef = useRef(1); // 1 = right, -1 = left
  const animRef = useRef<number | null>(null);
  const speedRef = useRef(1.2); // base oscillation speed (% per frame)
  const isFinishedRef = useRef(false);

  // Animation loop for oscillating needle
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (isPaused || isFinishedRef.current) {
        lastTime = time;
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      const delta = time - lastTime;
      lastTime = time;

      // Move needle
      setNeedlePos(prev => {
        let next = prev + directionRef.current * speedRef.current * (delta / 16);
        if (next >= 100) {
          next = 100;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPaused]);

  const handleTriggerHit = useCallback(() => {
    if (isPaused || isFinishedRef.current) return;
    setIsPaused(true);

    const pos = needlePos;
    let hitColor: 'green' | 'orange' | 'yellow' | 'black';
    let hitText = '';
    let points = 0;

    // Green (Strongest Hit): 42% - 58%
    if (pos >= 42 && pos <= 58) {
      hitColor = 'green';
      hitText = 'PERFECT HARMONY! (GREEN)';
      points = 1;
      audioEngine.playHitSFX('sick');
    }
    // Orange (Medium Hit): 30% - 42% or 58% - 70%
    else if ((pos >= 30 && pos < 42) || (pos > 58 && pos <= 70)) {
      hitColor = 'orange';
      hitText = 'MEDIUM ATTUNE! (ORANGE)';
      points = 0.5; // Half progress
      audioEngine.playHitSFX('good');
    }
    // Yellow (Weak Hit): 15% - 30% or 70% - 85%
    else if ((pos >= 15 && pos < 30) || (pos > 70 && pos <= 85)) {
      hitColor = 'yellow';
      hitText = 'WEAK SIGNAL (YELLOW)';
      points = 0;
      audioEngine.playHitSFX('bad');
    }
    // Black (No Damage/Miss): 0% - 15% or 85% - 100%
    else {
      hitColor = 'black';
      hitText = 'DISSONANT MISS (BLACK)';
      points = 0;
      audioEngine.playHitSFX('miss');
    }

    setLastHitColor(hitColor);
    setLastResultText(hitText);

    const newHits = Math.min(targetHits, currentHits + points);
    const newAttempts = attemptsUsed + 1;

    setCurrentHits(newHits);
    setAttemptsUsed(newAttempts);

    // Check if finished
    if (newHits >= targetHits) {
      isFinishedRef.current = true;
      setTimeout(() => {
        onComplete(true);
      }, 1000);
    } else if (newAttempts >= maxAttempts) {
      isFinishedRef.current = true;
      setTimeout(() => {
        onComplete(false);
      }, 1000);
    } else {
      // Resume next attempt after brief pause
      speedRef.current += 0.25; // Increase speed slightly each attempt
      setTimeout(() => {
        setIsPaused(false);
        setLastResultText(null);
      }, 650);
    }
  }, [isPaused, needlePos, currentHits, targetHits, attemptsUsed, maxAttempts, onComplete]);

  // Keyboard support for spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTriggerHit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerHit]);

  return (
    <div className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] p-6 flex flex-col items-center gap-5 -skew-x-2 animate-in fade-in zoom-in-95 duration-150 select-none max-w-xl mx-auto backdrop-blur-md">
      {/* Top Banner */}
      <div className="w-full flex items-center justify-between border-b-[3px] border-[#0f0c0c] pb-3">
        <div className="flex items-center gap-2 bg-[#38bdf8] text-[#0f0c0c] px-3 py-1 border-[2px] border-[#0f0c0c] font-orbitron font-black text-xs uppercase">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>ATTUNE SIGNAL: {enemy.name.toUpperCase()}</span>
        </div>
        <span className="font-orbitron font-bold text-xs text-[#facc15]">
          ATTEMPTS: {maxAttempts - attemptsUsed} LEFT
        </span>
      </div>

      <p className="text-xs text-slate-200 font-bold text-center">
        PRESS <span className="text-[#facc15] font-orbitron font-black">[SPACE]</span> OR CLICK TO LOCK FREQUENCY INSIDE THE GREEN ZONE!
      </p>

      {/* Target Progress Circles */}
      <div className="flex items-center gap-3">
        <span className="font-orbitron font-black text-xs text-white uppercase">
          REQUIRED HARMONY ({targetHits} HITS):
        </span>
        <div className="flex gap-2">
          {Array.from({ length: targetHits }).map((_, i) => (
            <div 
              key={i}
              className={`w-6 h-6 rounded-full border-[3px] border-[#0f0c0c] flex items-center justify-center transition-all ${
                i < Math.floor(currentHits) 
                  ? 'bg-[#4ade80] text-[#0f0c0c] scale-110 shadow-[0_0_10px_#4ade80]' 
                  : i < currentHits 
                    ? 'bg-[#fb923c] text-[#0f0c0c]' 
                    : 'bg-[#151828] text-slate-600'
              }`}
            >
              {i < Math.floor(currentHits) ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : i < currentHits ? (
                <Zap className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 opacity-40" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timing Bar Challenge Box */}
      <div 
        onClick={handleTriggerHit}
        className="w-full relative py-8 px-4 flex flex-col items-center justify-center bg-[#151828] border-[4px] border-[#0f0c0c] cursor-pointer shadow-inner"
      >
        {/* Color Bands Bar */}
        <div className="w-full h-12 relative border-[3px] border-[#0f0c0c] flex overflow-hidden shadow-md">
          {/* Black Zone Left (0% - 15%) */}
          <div style={{ width: '15%' }} className="h-full bg-[#1e2238] flex items-center justify-center">
            <span className="font-orbitron font-black text-3xs text-slate-500 hidden sm:inline">MISS</span>
          </div>
          {/* Yellow Zone Left (15% - 30%) */}
          <div style={{ width: '15%' }} className="h-full bg-[#facc15] border-x-[2px] border-[#0f0c0c] flex items-center justify-center">
            <span className="font-orbitron font-black text-2xs text-[#0f0c0c] hidden sm:inline">WEAK</span>
          </div>
          {/* Orange Zone Left (30% - 42%) */}
          <div style={{ width: '12%' }} className="h-full bg-[#fb923c] border-r-[2px] border-[#0f0c0c] flex items-center justify-center">
            <span className="font-orbitron font-black text-2xs text-[#0f0c0c] hidden sm:inline">MED</span>
          </div>
          {/* Green Zone Center (42% - 58%) */}
          <div style={{ width: '16%' }} className="h-full bg-[#4ade80] flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_12px_rgba(255,255,255,0.4)] animate-pulse">
            <span className="font-orbitron font-black text-xs text-[#0f0c0c] tracking-widest">GREEN</span>
          </div>
          {/* Orange Zone Right (58% - 70%) */}
          <div style={{ width: '12%' }} className="h-full bg-[#fb923c] border-l-[2px] border-[#0f0c0c] flex items-center justify-center">
            <span className="font-orbitron font-black text-2xs text-[#0f0c0c] hidden sm:inline">MED</span>
          </div>
          {/* Yellow Zone Right (70% - 85%) */}
          <div style={{ width: '15%' }} className="h-full bg-[#facc15] border-x-[2px] border-[#0f0c0c] flex items-center justify-center">
            <span className="font-orbitron font-black text-2xs text-[#0f0c0c] hidden sm:inline">WEAK</span>
          </div>
          {/* Black Zone Right (85% - 100%) */}
          <div style={{ width: '15%' }} className="h-full bg-[#1e2238] flex items-center justify-center">
            <span className="font-orbitron font-black text-3xs text-slate-500 hidden sm:inline">MISS</span>
          </div>
        </div>

        {/* Oscillating Needle */}
        <div 
          className="absolute top-4 bottom-4 w-1.5 sm:w-2 bg-white border border-[#0f0c0c] shadow-[0_0_15px_#ffffff] pointer-events-none transition-none"
          style={{
            left: `${needlePos}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Top/Bottom triangular caps */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-white" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-b-[7px] border-b-white" />
        </div>

        {/* Result Banner if hit */}
        {lastResultText && (
          <div className={`absolute -top-4 px-4 py-1.5 rounded border-[3px] border-[#0f0c0c] font-orbitron font-black text-sm tracking-wide uppercase animate-bounce shadow-lg ${
            lastHitColor === 'green' 
              ? 'bg-[#4ade80] text-[#0f0c0c]' 
              : lastHitColor === 'orange'
                ? 'bg-[#fb923c] text-[#0f0c0c]'
                : lastHitColor === 'yellow'
                  ? 'bg-[#facc15] text-[#0f0c0c]'
                  : 'bg-[#da2d46] text-white'
          }`}>
            {lastResultText}
          </div>
        )}
      </div>

      {/* Button footer */}
      <button
        onClick={handleTriggerHit}
        disabled={isPaused || isFinishedRef.current}
        className="w-full py-3 bg-[#38bdf8] text-[#0f0c0c] border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] font-orbitron font-black text-base uppercase hover:bg-[#7dd3fc] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
      >
        {isFinishedRef.current ? "ATTUNEMENT COMPLETE!" : "LOCK FREQUENCY [SPACE]"}
      </button>
    </div>
  );
}
