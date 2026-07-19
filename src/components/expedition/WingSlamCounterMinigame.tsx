import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../../services/audioSynth';

interface WingSlamCounterMinigameProps {
  bossName: string;
  onComplete: (totalDamage: number, totalStagger: number, hits: number) => void;
}

export function WingSlamCounterMinigame({
  bossName,
  onComplete,
}: WingSlamCounterMinigameProps) {
  const [currentBeat, setCurrentBeat] = useState(1); // 1, 2, 3
  const [progress, setProgress] = useState(100); // 100 -> 0 per beat
  const [hits, setHits] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [totalStagger, setTotalStagger] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const beatResolvedRef = useRef(false);
  const animRef = useRef<number | null>(null);
  const hitsRef = useRef(0);
  const dmgRef = useRef(0);
  const staggerRef = useRef(0);
  const currentBeatRef = useRef(1);

  const BEAT_DURATION = 500; // 500ms per strike window
  const MAX_BEATS = 3;

  // Advance to next beat or complete minigame
  const advanceBeat = useCallback(() => {
    if (currentBeatRef.current >= MAX_BEATS) {
      setIsFinished(true);
      setTimeout(() => {
        onComplete(dmgRef.current, staggerRef.current, hitsRef.current);
      }, 700);
    } else {
      currentBeatRef.current += 1;
      setCurrentBeat(currentBeatRef.current);
      beatResolvedRef.current = false;
      setProgress(100);
      setFeedback(null);
    }
  }, [onComplete]);

  // Animation loop per beat
  useEffect(() => {
    if (isFinished) return;

    let startTime = performance.now();
    beatResolvedRef.current = false;

    const loop = (time: number) => {
      if (beatResolvedRef.current || isFinished) return;
      const elapsed = time - startTime;
      const pct = Math.max(0, 100 - (elapsed / BEAT_DURATION) * 100);
      setProgress(pct);

      if (pct <= 0) {
        if (!beatResolvedRef.current) {
          beatResolvedRef.current = true;
          setFeedback('MISSED!');
          audioEngine.playHitSFX('miss');
          setTimeout(advanceBeat, 350);
        }
      } else {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [currentBeat, isFinished, advanceBeat]);

  // Handle strike action (Spacebar or Click)
  const handleStrike = useCallback(() => {
    if (beatResolvedRef.current || isFinished) return;
    beatResolvedRef.current = true;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    // Hit window: between 10% and 85% progress
    if (progress >= 15 && progress <= 85) {
      const isPerfect = progress >= 35 && progress <= 65;
      const dmg = isPerfect ? 100 : 70;
      const stag = isPerfect ? 20 : 12;

      hitsRef.current += 1;
      dmgRef.current += dmg;
      staggerRef.current += stag;

      setHits(hitsRef.current);
      setTotalDamage(dmgRef.current);
      setTotalStagger(staggerRef.current);

      setFeedback(isPerfect ? '⚡ PERFECT STRIKE! +100 DMG!' : '🔥 GREAT STRIKE! +70 DMG!');
      audioEngine.playHitSFX('sick');
    } else {
      setFeedback(progress > 85 ? 'TOO EARLY!' : 'TOO LATE!');
      audioEngine.playHitSFX('miss');
    }

    setTimeout(advanceBeat, 380);
  }, [progress, isFinished, advanceBeat]);

  // Keyboard shortcut: Spacebar or Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStrike();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStrike]);

  return (
    <div className="w-full relative z-50 flex flex-col items-center justify-center pointer-events-auto select-none animate-fadeIn">
      {/* Title Header */}
      <div className="bg-[#da2d46] border-[4px] border-[#0f0c0c] px-6 py-2 shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-12 mb-6 animate-pulse">
        <h3 className="font-orbitron font-black text-lg sm:text-2xl text-white uppercase tracking-wider text-center flex items-center gap-2">
          <span>⚡</span>
          <span>WINGS EXPOSED! COUNTER-ATTACK QTE!</span>
          <span>⚡</span>
        </h3>
      </div>

      {!isFinished ? (
        <div className="flex flex-col items-center gap-6 max-w-md w-full bg-[#1e2238]/95 border-[4px] border-[#0f0c0c] p-6 shadow-[8px_8px_0px_0px_#0f0c0c] relative overflow-hidden">
          {/* Progress Beat Indicator */}
          <div className="flex items-center justify-between w-full pb-3 border-b-2 border-white/20">
            <span className="font-orbitron font-bold text-xs uppercase text-[#facc15] tracking-widest">
              STRIKE {currentBeat} OF {MAX_BEATS}
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={`w-4 h-4 border-2 border-[#0f0c0c] transition-all ${
                    num < currentBeat
                      ? 'bg-[#facc15]'
                      : num === currentBeat
                      ? 'bg-[#da2d46] animate-ping'
                      : 'bg-[#0f0c0c]/60'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Timing Circle / Target Zone */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center my-2">
            {/* Outer Static Target Ring */}
            <div className="absolute inset-0 border-[6px] border-white/30 rounded-full" />
            
            {/* Precision Perfect Ring */}
            <div className="absolute inset-6 border-[4px] border-[#facc15]/60 rounded-full border-dashed animate-spin-slow" />

            {/* Shrinking Strike Ring based on Progress */}
            <div
              className="absolute rounded-full border-[6px] border-[#da2d46] shadow-[0_0_20px_#da2d46] transition-all duration-75"
              style={{
                width: `${Math.max(25, progress)}%`,
                height: `${Math.max(25, progress)}%`,
                opacity: progress / 100 + 0.2,
              }}
            />

            {/* Center Strike Button */}
            <button
              onClick={handleStrike}
              disabled={beatResolvedRef.current}
              className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 bg-[#facc15] border-[4px] border-[#0f0c0c] rounded-full flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_#0f0c0c] hover:scale-105 active:scale-95 transition-transform cursor-pointer font-orbitron font-black text-xl text-[#0f0c0c]"
            >
              <span>STRIKE!</span>
              <span className="text-2xs font-bold text-[#da2d46]">[SPACE]</span>
            </button>
          </div>

          {/* Feedback & Stats */}
          <div className="h-10 flex items-center justify-center">
            {feedback ? (
              <span className="font-orbitron font-black text-base sm:text-lg uppercase tracking-wide text-white bg-[#0f0c0c] px-4 py-1 border-2 border-[#facc15] animate-bounce">
                {feedback}
              </span>
            ) : (
              <span className="font-orbitron font-bold text-xs text-white/70 tracking-wider">
                TIMING: HIT AS RING SHRINKS TO CENTER
              </span>
            )}
          </div>

          {/* Current Accumulation */}
          <div className="flex items-center gap-6 text-xs font-orbitron font-bold text-[#facc15]">
            <span>HITS: {hits}/{MAX_BEATS}</span>
            <span>TOTAL COUNTER DMG: {totalDamage}</span>
          </div>
        </div>
      ) : (
        /* Summary Banner */
        <div className="max-w-md w-full bg-[#facc15] border-[4px] border-[#0f0c0c] p-6 shadow-[8px_8px_0px_0px_#0f0c0c] flex flex-col items-center justify-center gap-3 animate-bounce">
          <span className="font-orbitron font-black text-2xl text-[#0f0c0c] uppercase">
            {hits > 0 ? '⚡ COUNTER SUCCESSFUL! ⚡' : '❌ COUNTER MISSED! ❌'}
          </span>
          <p className="font-orbitron font-bold text-sm text-[#0f0c0c] text-center">
            DEALT <span className="text-lg font-black text-[#da2d46]">{totalDamage} HP</span> &{' '}
            <span className="text-lg font-black text-[#da2d46]">{totalStagger} STAGGER</span> TO {bossName}!
          </p>
        </div>
      )}
    </div>
  );
}
