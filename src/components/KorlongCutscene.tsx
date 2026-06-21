import { useState, useEffect, useCallback, useRef } from 'react';

// Import images
import line_one from '../assets/images/line_one.png';
import line_two from '../assets/images/line_two.png';
import line_three from '../assets/images/line_three.png';
import line_four from '../assets/images/line_four.png';

interface KorlongCutsceneProps {
  onComplete: () => void;
}

const ANCESTOR_LINES = [
  { startMs: 5000,  text: 'I HAVE WAITED... ACROSS MANY LIFETIMES.' },
  { startMs: 8500,  text: 'GENERATIONS HAVE PASSED SINCE THESE STRINGS SANG.' },
  { startMs: 12000, text: 'YOU HEARD THE ECHO WHEN OTHERS COULD NOT.' },
  { startMs: 15500, text: 'TAKE IT. GUARD IT. LET IT BREATHE AGAIN.' },
];

export function KorlongCutscene({ onComplete }: KorlongCutsceneProps) {
  const [phase, setPhase] = useState<number>(0);
  const [dialogueLine, setDialogueLine] = useState<number>(-1);
  const [dialogueVisible, setDialogueVisible] = useState(false);
  const [skipReady, setSkipReady] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  useEffect(() => {
    addTimer(() => setPhase(1), 1200);   // Diagonal wipe finishes
    addTimer(() => setPhase(2), 2500);  // Tension hold
    addTimer(() => setPhase(3), 4000);  // Panel slams in + line 0
    addTimer(() => setPhase(4), 8500);  // pan to line 1
    addTimer(() => setPhase(5), 12000); // pan to line 2
    addTimer(() => setPhase(6), 15500); // pan to line 3
    addTimer(() => setPhase(7), 19000); // Sigil + aggressive title slam
    
    // Smooth transition out
    addTimer(() => setPhase(8), 24000); // Fast zoom/fade to the card color
    addTimer(() => onComplete(), 25000); 

    // Dialogue timing
    ANCESTOR_LINES.forEach((line, i) => {
      addTimer(() => {
        setDialogueLine(i);
        setDialogueVisible(true);
      }, line.startMs);
      // hide slightly faster for punchier cuts
      addTimer(() => setDialogueVisible(false), line.startMs + 3000);
    });

    // Skip readiness
    addTimer(() => setSkipReady(true), 4000);

    return () => timersRef.current.forEach(clearTimeout);
  }, [addTimer, onComplete]);

  const handleSkip = useCallback(() => {
    if (skipReady) {
      timersRef.current.forEach(clearTimeout);
      setPhase(8); 
      setTimeout(() => onComplete(), 600);
    }
  }, [skipReady, onComplete]);

  const baybayin = 'ᜀ ᜁ ᜂ ᜃ ᜄ ᜅ ᜆ ᜇ ᜈ ᜉ ᜊ ᜋ ᜌ ᜎ ᜏ ᜐ ᜑ';

  // Calculate the pan position
  const currentPan = Math.max(0, dialogueLine) * 25;
  // Calculate a slow continuous scale (Ken Burns effect) for the active panel
  const currentScale = phase >= 3 && phase <= 6 ? 1 + (dialogueLine * 0.04) : 1;

  return (
    <>
      <style>{`
        /* 1. The Hook: Diagonal Halftone Wipe */
        @keyframes cs-wipe-in {
          0%   { clip-path: polygon(0 0, 0 0, 0 100%, 0% 100%); background-color: #da2d46; }
          40%  { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); background-color: #da2d46; }
          100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); background-color: #0f0c0c; }
        }

        /* 2. The Narrative: Aggressive Panel Entry */
        @keyframes cs-panel-in {
          0%   { opacity: 0; transform: scale(1.2) translateY(50px) rotate(4deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(-1deg); }
        }

        /* Glitchy Text Entry */
        @keyframes cs-dialogue-fade-in {
          0%   { transform: translateY(15px) skewX(-10deg); opacity: 0; }
          50%  { transform: translateY(-5px) skewX(5deg); opacity: 1; }
          100% { transform: translateY(0) skewX(-2deg); opacity: 1; }
        }

        /* Screen Shake for impactful lines */
        @keyframes cs-shake {
          0%, 100% { transform: translateX(0) skewX(-2deg); }
          25% { transform: translateX(-4px) translateY(2px) skewX(-2deg); }
          50% { transform: translateX(4px) translateY(-2px) skewX(-2deg); }
          75% { transform: translateX(-2px) translateY(1px) skewX(-2deg); }
        }

        /* 3. The Climax: Heavy Slam with Chromatic Aberration */
        @keyframes cs-title-slam {
          0%   { opacity: 0; transform: scale(4) skewX(-5deg); text-shadow: 20px 0px 0px #0ff, -20px 0px 0px #da2d46; }
          50%  { opacity: 1; transform: scale(0.9) skewX(-2deg); text-shadow: 10px 0px 0px #0ff, -10px 0px 0px #da2d46; }
          75%  { transform: scale(1.05) skewX(-2deg); text-shadow: 5px 0px 0px #0ff, -5px 0px 0px #da2d46; }
          100% { transform: scale(1) skewX(-2deg); text-shadow: 6px 6px 0px #da2d46, -3px -3px 0px #0ff; }
        }

        @keyframes cs-sigil-spin-in {
          0%   { opacity: 0; transform: scale(0.5) rotate(-90deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes cs-xp-fade-in {
          0%   { opacity: 0; transform: translateY(20px) skewX(12deg) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) skewX(6deg) scale(1); }
        }

        /* 4. The Reward: Zoom out transition */
        @keyframes cs-zoom-out {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }

        .comic-bg-halftone {
          background-image: radial-gradient(#e0e5ed 2px, transparent 2px);
          background-size: 12px 12px;
        }
        .comic-bg-halftone-red {
          background-image: radial-gradient(#da2d46 3px, transparent 3px);
          background-size: 16px 16px;
        }
        .comic-bg-tension-grid {
          background-image: linear-gradient(rgba(100,120,140,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(100,120,140,0.1) 1px, transparent 1px);
          background-size: 32px 32px;
        }
      `}</style>

      <div
        className="fixed inset-0 overflow-hidden"
        style={{
          zIndex: 9999,
          background: '#0f0c0c',
          cursor: 'default',
          animation: phase === 8 ? 'cs-zoom-out 0.6s cubic-bezier(0.85, 0, 0.15, 1) forwards' : 'none',
        }}
        onClick={handleSkip}
      >
        <div className="absolute inset-0 comic-bg-halftone-red opacity-15 mix-blend-screen pointer-events-none z-0" />
        <div className="absolute inset-0 comic-bg-halftone opacity-10 mix-blend-overlay pointer-events-none z-0" />

        {/* Transition Out Overlay */}
        <div 
          className="absolute inset-0 z-[100] pointer-events-none"
          style={{
            backgroundColor: '#2a2d43',
            opacity: phase === 8 ? 1 : 0,
            transition: 'opacity 0.6s ease-in-out'
          }}
        />

        {/* PHASE 0: The Hook Wipe */}
        {phase === 0 && (
          <div className="absolute inset-0 z-[110] pointer-events-none comic-bg-halftone-red" style={{ animation: 'cs-wipe-in 1.2s cubic-bezier(0.77, 0, 0.175, 1) forwards' }} />
        )}

        {/* PHASES 1-2: Tension Build */}
        {phase >= 1 && phase <= 2 && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden comic-bg-tension-grid opacity-70">
            {Array.from({ length: 18 }).map((_, i) => (
              <div 
                key={i}
                className="absolute bg-[#e0e5ed] rounded-full opacity-20"
                style={{
                  width: `${i % 2 === 0 ? 4 : 2}px`,
                  height: `${i % 2 === 0 ? 4 : 2}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `pulse ${1 + Math.random()}s infinite alternate`
                }}
              />
            ))}
          </div>
        )}

        {/* PHASES 3-6: Comic Panel Pan & Scale */}
        {phase >= 3 && phase <= 6 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-[10%] px-4 md:px-12 pointer-events-none overflow-hidden">
            <div 
              className="w-full max-w-4xl aspect-video md:aspect-[21/9] bg-[#0f0c0c] border-[6px] md:border-[10px] border-[#e0e5ed] relative overflow-hidden shadow-[16px_16px_0px_0px_#da2d46]"
              style={{ animation: 'cs-panel-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
            >
              <div 
                className="absolute top-0 bottom-0 left-0 flex w-[400%]"
                style={{ 
                  transform: `translateX(-${currentPan}%) scale(${currentScale})`, 
                  transition: 'transform 3.5s cubic-bezier(0.25, 1, 0.5, 1)',
                  transformOrigin: `${currentPan + 12}% 50%` // Keeps the scale focused on the current image
                }}
              >
                <img src={line_one} alt="Scene 1" className="w-1/4 h-full object-cover grayscale opacity-90 contrast-150" />
                <img src={line_two} alt="Scene 2" className="w-1/4 h-full object-cover grayscale opacity-90 contrast-150" />
                <img src={line_three} alt="Scene 3" className="w-1/4 h-full object-cover grayscale opacity-90 contrast-150" />
                <img src={line_four} alt="Scene 4" className="w-1/4 h-full object-cover grayscale opacity-90 contrast-150" />
              </div>
              <div className="absolute inset-0 opacity-20 comic-bg-halftone pointer-events-none mix-blend-overlay" />
            </div>
          </div>
        )}

        {/* DIALOGUE LINES */}
        {phase >= 3 && phase <= 6 && dialogueLine >= 0 && (
          <div className="absolute left-0 right-0 bottom-[12%] md:bottom-[15%] pointer-events-none flex flex-col items-center px-4 z-20">
            <div 
              className="bg-[#da2d46] border-[4px] border-[#0f0c0c] px-3 py-1 -skew-x-6 mb-4 shadow-[6px_6px_0px_0px_#0f0c0c]"
              style={{
                opacity: dialogueVisible ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
            >
              <span className="font-orbitron font-black text-[#0f0c0c] text-[10px] md:text-xs tracking-widest uppercase skew-x-6 block">
                [ ANCESTRAL TRANSMISSION ]
              </span>
            </div>

            <div
              className="w-full max-w-lg bg-[#e0e5ed] border-[6px] border-[#0f0c0c] p-5 md:p-6 shadow-[12px_12px_0px_0px_#da2d46] relative -skew-x-2"
              style={{
                opacity: dialogueVisible ? 1 : 0,
                // Add shake animation specifically for the final impactful line
                animation: dialogueVisible 
                  ? `cs-dialogue-fade-in 0.3s ease-out forwards${dialogueLine === 3 ? ', cs-shake 0.4s ease-in-out 0.3s' : ''}` 
                  : 'none',
                transition: 'opacity 0.2s ease'
              }}
            >
              {/* Corner Screws */}
              <div className="absolute top-2 left-2 w-2 h-2 bg-[#0f0c0c] rounded-full" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-[#0f0c0c] rounded-full" />
              <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#0f0c0c] rounded-full" />
              <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#0f0c0c] rounded-full" />

              <p className="font-space-mono font-bold text-[#0f0c0c] text-sm md:text-base leading-relaxed tracking-widest text-center skew-x-2">
                "{ANCESTOR_LINES[dialogueLine]?.text}"
              </p>
            </div>
          </div>
        )}

        {/* PHASE 7: The Climax Reveal */}
        {phase >= 7 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            
            {/* Speed Lines Background (Simulated via gradient rays) */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg 15deg, #e0e5ed 15deg 16deg, transparent 16deg 30deg, #da2d46 30deg 32deg, transparent 32deg 45deg, #e0e5ed 45deg 46deg, transparent 46deg 60deg, #da2d46 60deg 61deg, transparent 61deg 75deg, #e0e5ed 75deg 77deg, transparent 77deg 90deg, #da2d46 90deg 91deg, transparent 91deg 105deg, #e0e5ed 105deg 106deg, transparent 106deg 120deg, #da2d46 120deg 122deg, transparent 122deg 135deg, #e0e5ed 135deg 136deg, transparent 136deg 150deg, #da2d46 150deg 151deg, transparent 151deg 165deg, #e0e5ed 165deg 167deg, transparent 167deg 180deg, #da2d46 180deg 181deg, transparent 181deg 195deg, #e0e5ed 195deg 196deg, transparent 196deg 210deg, #da2d46 210deg 212deg, transparent 212deg 225deg, #e0e5ed 225deg 226deg, transparent 226deg 240deg, #da2d46 240deg 241deg, transparent 241deg 255deg, #e0e5ed 255deg 257deg, transparent 257deg 270deg, #da2d46 270deg 271deg, transparent 271deg 285deg, #e0e5ed 285deg 286deg, transparent 286deg 300deg, #da2d46 300deg 302deg, transparent 302deg 315deg, #e0e5ed 315deg 316deg, transparent 316deg 330deg, #da2d46 330deg 331deg, transparent 331deg 345deg, #e0e5ed 345deg 347deg, transparent 347deg 360deg)',
                animation: 'pulse 2s infinite alternate'
              }}
            />

            <div
              style={{
                position: 'absolute',
                width: 'min(88vmin, 520px)',
                height: 'min(88vmin, 520px)',
                animation: 'cs-sigil-spin-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              }}
            >
              <svg viewBox="0 0 520 520" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                <defs>
                  <path id="outerRing" d="M 260,260 m -220,0 a 220,220 0 1,1 440,0 a 220,220 0 1,1 -440,0" />
                </defs>
                <circle cx="260" cy="260" r="225" fill="none" stroke="#e0e5ed" strokeWidth="8" />
                <circle cx="260" cy="260" r="210" fill="none" stroke="#da2d46" strokeWidth="4" strokeDasharray="10 10" />
                <text fill="#e0e5ed" fontSize="18" fontWeight="bold" fontFamily="sans-serif" letterSpacing="18">
                  <textPath href="#outerRing" startOffset="0%">{baybayin}</textPath>
                </text>
                <rect x="150" y="150" width="220" height="220" fill="none" stroke="#da2d46" strokeWidth="12" transform="rotate(45 260 260)" />
                <rect x="150" y="150" width="220" height="220" fill="none" stroke="#e0e5ed" strokeWidth="4" transform="rotate(45 260 260)" />
                <circle cx="260" cy="260" r="80" fill="#0f0c0c" />
                <circle cx="260" cy="260" r="60" fill="#da2d46" stroke="#e0e5ed" strokeWidth="4" />
                <g transform="translate(260,260)" stroke="#e0e5ed" strokeWidth="6">
                  <line x1="0" y1="-40" x2="0" y2="40" />
                  <line x1="-40" y1="0" x2="40" y2="0" />
                </g>
              </svg>
            </div>

            {/* TITLE TEXT: The Slam */}
            <div className="relative z-10 text-center flex flex-col items-center">
              <h1
                className="font-orbitron font-black text-[#e0e5ed] uppercase tracking-tighter"
                style={{
                  fontSize: 'clamp(4rem, 14vmin, 8rem)',
                  animation: 'cs-title-slam 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                KORLONG
              </h1>
              
              <div 
                className="bg-[#0f0c0c] border-[3px] border-[#e0e5ed] px-4 py-1 mt-6 -skew-x-6 shadow-[6px_6px_0px_0px_#da2d46]"
                style={{ opacity: 0, animation: 'cs-dialogue-fade-in 0.4s ease-out 0.3s forwards' }}
              >
                <span className="font-space-mono text-[#e0e5ed] text-[10px] md:text-sm font-bold tracking-widest uppercase skew-x-6 block">
                  EASTERN VISAYAS · LEGENDARY
                </span>
              </div>
            </div>

            <div
              className="absolute bottom-[15%] text-center z-10"
              style={{ animation: 'cs-xp-fade-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.6s both' }}
            >
              <div className="bg-[#da2d46] border-[6px] border-[#0f0c0c] px-6 py-3 -skew-x-6 shadow-[10px_10px_0px_0px_#e0e5ed]">
                <span className="font-orbitron font-black text-[#0f0c0c] text-sm md:text-xl tracking-widest uppercase skew-x-6 block">
                  +100 XP — DATA ACQUIRED
                </span>
              </div>
            </div>
          </div>
        )}

        {skipReady && phase < 7 && (
          <div className="absolute top-6 right-6 font-space-mono font-bold text-[#888ea1] text-[10px] tracking-widest uppercase pointer-events-none border-[2px] border-[#888ea1] px-2 py-1 -skew-x-6 z-30 hover:bg-[#888ea1] hover:text-[#0f0c0c] transition-colors pointer-events-auto cursor-pointer" onClick={handleSkip}>
            <span className="skew-x-6 block">TAP TO SKIP</span>
          </div>
        )}
      </div>
    </>
  );
}