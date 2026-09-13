import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Check as CheckCircle2, Close as XCircle, Zap } from 'pixelarticons/react';
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
    <div className="bg-plum-800 border-[3px] border-ink p-6 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-150 select-none max-w-xl mx-auto">
      {/* Top Banner */}
      <div className="w-full flex items-center justify-between border-b-[3px] border-ink pb-3">
        <div className="flex items-center gap-2 bg-xp text-ink px-3 py-1 border-[2px] border-ink font-bold text-xs">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>ATTUNE SIGNAL: {enemy.name.toUpperCase()}</span>
        </div>
        <span className="font-bold text-xs text-gold-300">
          ATTEMPTS: {maxAttempts - attemptsUsed} LEFT
        </span>
      </div>

      <p className="text-xs text-parchment-100 font-bold text-center">
        PRESS <span className="text-gold-300 font-bold">[SPACE]</span> OR CLICK TO LOCK FREQUENCY INSIDE THE GREEN ZONE!
      </p>

      {/* Target Progress Circles */}
      <div className="flex items-center gap-3">
        <span className="font-bold text-xs text-parchment-100">
          REQUIRED HARMONY ({targetHits} HITS):
        </span>
        <div className="flex gap-2">
          {Array.from({ length: targetHits }).map((_, i) => (
            <div 
              key={i}
              className={`w-6 h-6 rounded-full border-[3px] border-ink flex items-center justify-center transition-all ${
                i < Math.floor(currentHits) 
                  ? 'bg-heal text-ink scale-110 ' 
                  : i < currentHits 
                    ? 'bg-orange-500 text-ink' 
                    : 'bg-plum-900 text-parchment-500'
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
        className="w-full relative py-8 px-4 flex flex-col items-center justify-center bg-plum-900 border-[3px] border-ink cursor-pointer shadow-inner"
      >
        {/* Color Bands Bar */}
        <div className="w-full h-12 relative border-[3px] border-ink flex overflow-hidden shadow-md">
          {/* Black Zone Left (0% - 15%) */}
          <div style={{ width: '15%' }} className="h-full bg-plum-800 flex items-center justify-center">
            <span className="font-bold text-3xs text-parchment-500 hidden sm:inline">MISS</span>
          </div>
          {/* Yellow Zone Left (15% - 30%) */}
          <div style={{ width: '15%' }} className="h-full bg-gold-500 border-x-[2px] border-ink flex items-center justify-center">
            <span className="font-bold text-xs text-ink hidden sm:inline">WEAK</span>
          </div>
          {/* Orange Zone Left (30% - 42%) */}
          <div style={{ width: '12%' }} className="h-full bg-orange-500 border-r-[2px] border-ink flex items-center justify-center">
            <span className="font-bold text-xs text-ink hidden sm:inline">MED</span>
          </div>
          {/* Green Zone Center (42% - 58%) */}
          <div style={{ width: '16%' }} className="h-full bg-heal flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_12px_rgba(255,255,255,0.4)] animate-pulse">
            <span className="font-bold text-xs text-ink">GREEN</span>
          </div>
          {/* Orange Zone Right (58% - 70%) */}
          <div style={{ width: '12%' }} className="h-full bg-orange-500 border-l-[2px] border-ink flex items-center justify-center">
            <span className="font-bold text-xs text-ink hidden sm:inline">MED</span>
          </div>
          {/* Yellow Zone Right (70% - 85%) */}
          <div style={{ width: '15%' }} className="h-full bg-gold-500 border-x-[2px] border-ink flex items-center justify-center">
            <span className="font-bold text-xs text-ink hidden sm:inline">WEAK</span>
          </div>
          {/* Black Zone Right (85% - 100%) */}
          <div style={{ width: '15%' }} className="h-full bg-plum-800 flex items-center justify-center">
            <span className="font-bold text-3xs text-parchment-500 hidden sm:inline">MISS</span>
          </div>
        </div>

        {/* Oscillating Needle */}
        <div 
          className="absolute top-4 bottom-4 w-1.5 sm:w-2 bg-parchment-100 border border-ink pointer-events-none transition-none"
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
          <div className={`absolute -top-4 px-4 py-1.5  border-[3px] border-ink  font-bold text-sm   animate-bounce shadow-lg ${
            lastHitColor === 'green' 
              ? 'bg-heal text-ink' 
              : lastHitColor === 'orange'
                ? 'bg-orange-500 text-ink'
                : lastHitColor === 'yellow'
                  ? 'bg-gold-500 text-ink'
                  : 'bg-hp text-parchment-100'
          }`}>
            {lastResultText}
          </div>
        )}
      </div>

      {/* Button footer */}
      <button
        onClick={handleTriggerHit}
        disabled={isPaused || isFinishedRef.current}
        className="px-btn px-btn-blue w-full min-h-12 text-base"
      >
        {isFinishedRef.current ? "Attuned!" : "Lock Frequency (Space)"}
      </button>
    </div>
  );
}
