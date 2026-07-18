import { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';

interface ParryQteOverlayProps {
  enemyName: string;
  onParry: (parried: boolean) => void;
}

export function ParryQteOverlay({
  enemyName,
  onParry,
}: ParryQteOverlayProps) {
  const [progress, setProgress] = useState(100); // 100 -> 0
  const [resultText, setResultText] = useState<string | null>(null);
  const finishedRef = useRef(false);
  const animRef = useRef<number | null>(null);

  const DURATION = 1200; // 1.2s fast precision timing

  // Animation loop
  useEffect(() => {
    const startTime = performance.now();

    const loop = (time: number) => {
      const elapsed = time - startTime;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);

      if (pct <= 0) {
        if (!finishedRef.current) {
          finishedRef.current = true;
          setResultText('MISSED!');
          audioEngine.playHitSFX('miss');
          setTimeout(() => onParry(false), 400);
        }
      } else {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [onParry]);

  const handleTriggerParry = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    // Tight precision parry zone between 20% and 40% progress
    if (progress >= 20 && progress <= 40) {
      setResultText('PERFECT PARRY!');
      audioEngine.playHitSFX('sick');
      setTimeout(() => onParry(true), 350);
    } else {
      setResultText(progress > 40 ? 'TOO EARLY!' : 'TOO LATE!');
      audioEngine.playHitSFX('miss');
      setTimeout(() => onParry(false), 350);
    }
  }, [progress, onParry]);

  // Keyboard binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTriggerParry();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerParry]);

  const inTargetZone = progress >= 20 && progress <= 40;

  return (
    <div 
      onClick={handleTriggerParry}
      className="flex flex-col items-center justify-center cursor-pointer select-none py-8 animate-in fade-in duration-100 touch-none"
    >
      {/* Subtle floating alert tag */}
      <div className="flex items-center gap-2 bg-[#0f0c0c]/80 text-[#facc15] px-3 py-1 border border-[#facc15]/50 rounded-full font-orbitron font-bold text-xs uppercase tracking-wider mb-4 shadow-lg backdrop-blur-sm">
        <ShieldAlert className="w-3.5 h-3.5 text-[#da2d46] animate-pulse" />
        <span>INCOMING: {enemyName.toUpperCase()}</span>
      </div>

      {/* Sleek transparent timing ring canvas */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Fixed target ring */}
        <div className={`absolute w-20 h-20 rounded-full border-[3px] transition-colors duration-75 flex items-center justify-center pointer-events-none ${
          inTargetZone ? 'border-[#4ade80] shadow-[0_0_16px_#4ade80]' : 'border-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.4)]'
        }`}>
          <span className={`font-orbitron font-black text-2xs tracking-wider ${
            inTargetZone ? 'text-[#4ade80] animate-pulse' : 'text-[#facc15]'
          }`}>
            [SPACE]
          </span>
        </div>

        {/* Closing ring */}
        <div 
          className={`absolute rounded-full border-[3px] pointer-events-none transition-colors duration-75 ${
            inTargetZone ? 'border-[#4ade80]' : 'border-[#da2d46]'
          }`}
          style={{
            width: `${Math.max(20, (progress / 100) * 144)}px`,
            height: `${Math.max(20, (progress / 100) * 144)}px`,
          }}
        />

        {/* Minimal result popup */}
        {resultText && (
          <div className={`absolute z-10 px-3 py-1 rounded border-[2px] font-orbitron font-black text-sm tracking-wide uppercase animate-bounce drop-shadow-md ${
            resultText.includes('PERFECT') 
              ? 'bg-[#4ade80] text-[#0f0c0c] border-[#0f0c0c]' 
              : 'bg-[#da2d46] text-white border-[#0f0c0c]'
          }`}>
            {resultText}
          </div>
        )}
      </div>
    </div>
  );
}
