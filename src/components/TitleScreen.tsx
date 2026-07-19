import { useEffect, useState, useRef } from 'react';

// Running animation frames
import one from '../assets/running animation/1.png';
import two from '../assets/running animation/2.png';
import three from '../assets/running animation/3.png';
import four from '../assets/running animation/4.png';
import five from '../assets/running animation/5.png';
import six from '../assets/running animation/6.png';
import seven from '../assets/running animation/7.png';
import eight from '../assets/running animation/8.png';
import nine from '../assets/running animation/9.png';
import ten from '../assets/running animation/10.png';
import eleven from '../assets/running animation/11.png';
import twelve from '../assets/running animation/12.png';
import thirteen from '../assets/running animation/13.png';
import fourteen from '../assets/running animation/14.png';
import fifteen from '../assets/running animation/15.png';
import sixteen from '../assets/running animation/16.png';
import seventeen from '../assets/running animation/17.png';
import eighteen from '../assets/running animation/18.png';
import nineteen from '../assets/running animation/19.png';
import twenty from '../assets/running animation/20.png';
import fullbg from '../assets/running animation/fullbg.png';

const FRAMES = [
  one, two, three, four, five, six, seven, eight, nine, ten,
  eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen,
  eighteen, nineteen, twenty,
];

const FRAME_DURATION = 220;

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % FRAMES.length);
    }, FRAME_DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden flex flex-col bg-[#181926]">

      {/* ── SCROLLING BACKGROUND ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="flex h-full w-max"
          style={{ animation: 'scrollBgLoop 60s linear infinite' }}
        >
          {[0, 1, 2].map(i => (
            <img key={i} src={fullbg} alt="" aria-hidden
              className="h-full w-auto max-w-none object-cover" />
          ))}
        </div>
      </div>

      {/* ── SUBTLE DOT OVERLAY ── */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div
        className="relative z-10 flex flex-col items-center shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 120px)',
          paddingLeft: 16,
          paddingRight: 16,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-16px)',
          transition: 'opacity 0.55s ease, transform 0.55s ease',
        }}
      >
        {/* Eyebrow tag */}
        <div
          style={{
            marginBottom: 30,
            padding: '6px 20px',
            background: '#0d0d12',
            borderLeft: '4px solid #e52b35',
            borderRight: '4px solid #e52b35',
            transform: 'skewX(-15deg)',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
          }}
        >
          <span
            style={{
              display: 'block',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(9px, 1.8vw, 12px)',
              letterSpacing: '0.06em',
              color: '#ffffff',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              transform: 'skewX(15deg)',
              WebkitFontSmoothing: 'none',
            }}
          >
            The Cultural Resonance Project
          </span>
        </div>

        {/* MUSIKULTURA */}
        <h1
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 'clamp(2rem, 6.5vw, 4.5rem)',
            fontWeight: 400, // PS2P has built-in weight
            lineHeight: 1.3,
            textTransform: 'uppercase',
            textAlign: 'center',
            margin: 0,
            color: '#ffffff',
            textShadow:
              '4px 4px 0px #0a0a0f,' +
              '8px 8px 0px rgba(229,43,53,0.45)',
            WebkitFontSmoothing: 'none',
            // Allow wrapping on very narrow screens (< 320px) rather than overflow
            wordBreak: 'break-word',
          }}
        >
          MUSIKULTURA
        </h1>

        {/* Red underline accent */}
        <div
          style={{
            marginTop: 12,
            width: mounted ? 'clamp(180px, 55vw, 340px)' : '0px',
            height: 5,
            background: '#e52b35',
            transform: 'skewX(-20deg)',
            transition: 'width 0.8s 0.3s cubic-bezier(0.2,0.8,0.2,1)',
            boxShadow: '3px 3px 0 #0a0a0f',
          }}
        />
      </div>

      {/* ── ROW 2 — CHARACTER (fills the sky between title and button) ── */}
      <div
        className="relative z-10 flex items-end justify-center w-full flex-1 pointer-events-none"
        style={{
          // Minimum so it never collapses to nothing on tiny phones
          minHeight: 160,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.6s 0.2s',
        }}
      >
        {/* Speed lines — only render if there's enough horizontal room */}
        <div className="absolute inset-0 hidden sm:block pointer-events-none">
          {[18, 36, 52, 68, 84].map((top, i) => (
            <div key={i} style={{
              position: 'absolute',
              top,
              // Positioned relative to horizontal centre
              left: `calc(50% - clamp(100px, 13vw, 180px) - ${24 + i * 9}px - 6px)`,
              height: 2,
              width: 24 + i * 9,
              background: 'rgba(255,255,255,0.55)',
              animation: `speedLine ${0.38 + i * 0.07}s linear infinite`,
              borderRadius: 1,
            }} />
          ))}
        </div>

        <img
          src={FRAMES[frameIdx]}
          alt="Running character"
          style={{
            /*
             * Was clamp(140px, 25vh, 320px).
             * Increased minimum to 200px and percentage to 32vh
             * so the sprite feels substantial even on small phones.
             * Cap stays at 360px on large screens.
             */
            height: 'clamp(200px, 32vh, 360px)',
            width: 'auto',
            imageRendering: 'pixelated',
            // Lift character up from the bottom of its row
            marginBottom: 'clamp(24px, 5vh, 60px)',
            filter:
              'drop-shadow(3px 0 0 #000) ' +
              'drop-shadow(-3px 0 0 #000) ' +
              'drop-shadow(0 3px 0 #000) ' +
              'drop-shadow(0 -3px 0 #000) ' +
              'drop-shadow(6px 6px 0 rgba(0,0,0,0.4))',
          }}
        />
      </div>

      {/* ── ROW 3 — BUTTON STRIP ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center shrink-0"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 48px)',
          paddingTop: 8,
          gap: 10,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s 0.4s, transform 0.6s 0.4s',
        }}
      >
        <button
          onClick={onStart}
          aria-label="Start game"
          className="group cursor-pointer outline-none border-none bg-transparent p-0"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px', /* Moved gap here to guarantee centering */
              height: 'clamp(48px, 7vh, 60px)',
              minWidth: '240px', /* Solid minimum width prevents squeezing on mobile */
              padding: '0 24px', /* Flat padding */
              background: '#f42a35',
              boxShadow: 'inset 0 0 0 2px #ff6b73, 0 6px 0 #0d0d12',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = 'inset 0 0 0 2px #ff6b73, 0 8px 0 #0d0d12';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'inset 0 0 0 2px #ff6b73, 0 6px 0 #0d0d12';
            }}
            onMouseDown={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(5px)';
              el.style.boxShadow = 'inset 0 0 0 2px #ff6b73, 0 1px 0 #0d0d12';
            }}
            onMouseUp={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'inset 0 0 0 2px #ff6b73, 0 6px 0 #0d0d12';
            }}
          >
            {/* Shimmer */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.2) 50%, transparent 62%)',
              animation: 'shimmer 2.4s ease-in-out infinite',
            }} />

            {/* Flat Flex children - no nested wrappers */}
            <div style={{
              width: 0, height: 0,
              borderStyle: 'solid',
              borderWidth: '7px 0 7px 12px',
              borderColor: 'transparent transparent transparent #0d0d12',
              flexShrink: 0,
              marginTop: '4px',
              position: 'relative', zIndex: 2, 
            }} />
            
            <span style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(0.75rem, 3vw, 0.9rem)',
              color: '#0d0d12',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              WebkitFontSmoothing: 'none',
              lineHeight: 1, 
              marginTop: '4px',
              position: 'relative', zIndex: 2,
            }}>
              Play Game
            </span>
          </div>
        </button>
      </div>

      {/* ── KEYFRAMES ── */}
      <style>{`
        @keyframes scrollBgLoop {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
        @keyframes speedLine {
          0%   { opacity: 0.65; transform: scaleX(1);   }
          50%  { opacity: 0.08; transform: scaleX(0.3); }
          100% { opacity: 0.65; transform: scaleX(1);   }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          55%  { transform: translateX(220%);  }
          100% { transform: translateX(220%);  }
        }

        /* Landscape phone — keep character visible without crowding */
        @media (max-height: 500px) {
          .character-img {
            height: 120px !important;
          }
        }
      `}</style>
    </div>
  );
}