import { useState, useEffect, useCallback, useRef } from 'react';

interface KorlongCutsceneProps {
  onComplete: () => void;
}

/**
 * KORLONG CUTSCENE — Full cinematic reveal.
 *
 * Phase timeline (ms from start):
 *  0     – Pure white flash burst
 *  900   – Flash fades, screen goes to absolute black
 *  3000  – Black hold (silence, tension)
 *
 *  5000  – Ancestor speaks: "I have waited..."   (orb appears)
 *  8500  – Ancestor speaks: "Generations have passed..."
 *  12000 – Ancestor speaks: "You are worthy."
 *  15500 – Ancestor speaks: "Take it. Guard it."
 *  19000 – Sigil explodes outward. "KORLONG" title reveal. +100XP.
 *  24000 – Fade out → onComplete
 */

const ANCESTOR_LINES = [
  { startMs: 5000,  text: '"I have waited... across many lifetimes."' },
  { startMs: 8500,  text: '"Generations have passed since these strings last sang."' },
  { startMs: 12000, text: '"You heard the echo when others could not."' },
  { startMs: 15500, text: '"Take it. Guard it. Let it breathe again."' },
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
    // Phase 0 → flash burst at 0ms (already set)
    addTimer(() => setPhase(1), 900);   // flash fades
    addTimer(() => setPhase(2), 3000);  // full black hold
    addTimer(() => setPhase(3), 5000);  // orb appears + line 0
    addTimer(() => setPhase(4), 8500);  // orb grows + line 1
    addTimer(() => setPhase(5), 12000); // line 2
    addTimer(() => setPhase(6), 15500); // line 3
    addTimer(() => setPhase(7), 19000); // sigil + title
    addTimer(() => setPhase(8), 24000); // fade out
    addTimer(() => onComplete(), 26500);

    // Dialogue timing
    ANCESTOR_LINES.forEach((line, i) => {
      addTimer(() => {
        setDialogueLine(i);
        setDialogueVisible(true);
      }, line.startMs);
      // hide after 3.2s
      addTimer(() => setDialogueVisible(false), line.startMs + 3200);
    });

    // Skip readiness
    addTimer(() => setSkipReady(true), 4000);

    return () => timersRef.current.forEach(clearTimeout);
  }, [addTimer, onComplete]);

  const handleSkip = useCallback(() => {
    if (skipReady) {
      timersRef.current.forEach(clearTimeout);
      onComplete();
    }
  }, [skipReady, onComplete]);

  const baybayin = 'ᜀ ᜁ ᜂ ᜃ ᜄ ᜅ ᜆ ᜇ ᜈ ᜉ ᜊ ᜋ ᜌ ᜎ ᜏ ᜐ ᜑ ᜀ ᜁ ᜂ ᜃ ᜄ ᜅ ᜆ ᜇ ᜈ ᜉ ᜊ ᜋ ᜌ ᜎ ᜏ ᜐ ᜑ';

  return (
    <>
      {/* ── Global style overrides: hide all game UI beneath ── */}
      <style>{`
        /* Cutscene keyframes */
        @keyframes cs-flash {
          0%   { opacity: 0; transform: scale(0.5); }
          20%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(2); }
        }
        @keyframes cs-ray {
          0%   { transform: translate(-50%,-50%) rotate(var(--angle)) scaleX(0); opacity:0; }
          20%  { opacity: 0.9; }
          100% { transform: translate(-50%,-50%) rotate(var(--angle)) scaleX(1); opacity:0; }
        }
        @keyframes cs-orb-in {
          0%   { opacity: 0; transform: scale(0.3); filter: blur(30px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        @keyframes cs-orb-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.07); }
        }
        @keyframes cs-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cs-spin-rev {
          to { transform: rotate(-360deg); }
        }
        @keyframes cs-flare {
          0%, 100% { opacity: 0.5; transform: scaleX(0.85); }
          50%       { opacity: 1;   transform: scaleX(1); }
        }
        @keyframes cs-dialogue-in {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cs-title-in {
          0%   { opacity: 0; letter-spacing: 0.4em; filter: blur(8px); }
          100% { opacity: 1; letter-spacing: 0.18em; filter: blur(0); }
        }
        @keyframes cs-sigil-in {
          0%   { opacity: 0; transform: scale(0.4) rotate(-20deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes cs-xp-in {
          0%   { opacity: 0; transform: scale(0.8) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cs-particle {
          0%   { opacity: 0; transform: translateY(0) scale(0); }
          30%  { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(-80px) scale(1.5); }
        }
        @keyframes cs-fade-out {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes cs-ring-pulse {
          0%, 100% { stroke-opacity: 0.15; }
          50%       { stroke-opacity: 0.4; }
        }
      `}</style>

      <div
        className="fixed inset-0"
        style={{
          zIndex: 9999,
          background: '#000',
          cursor: 'default',
          // Fade out in phase 8
          animation: phase === 8 ? 'cs-fade-out 2.5s ease-in forwards' : 'none',
        }}
        onClick={handleSkip}
      >
        {/* ═══════════════════════════════════════════════
            PHASE 0 — White flash burst
        ═══════════════════════════════════════════════ */}
        {phase === 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Central bloom */}
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: '300px',
                height: '300px',
                marginLeft: '-150px',
                marginTop: '-150px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff 0%, #d8e8f8 30%, transparent 70%)',
                filter: 'blur(15px)',
                animation: 'cs-flash 0.9s ease-out forwards',
              }}
            />
            {/* 8 star rays */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2"
                style={{
                  ['--angle' as string]: `${i * 22.5}deg`,
                  width: '180vw',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 40%, #fff 50%, rgba(255,255,255,0.9) 60%, transparent 100%)',
                  transformOrigin: 'center center',
                  animation: `cs-ray 0.9s ease-out forwards`,
                  filter: 'blur(1px)',
                }}
              />
            ))}
            {/* Full white screen flash */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#fff',
                animation: 'cs-fade-out 0.6s ease-out 0.1s forwards',
                opacity: 0.7,
              }}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            PHASES 1-2 — Absolute black (tension)
        ═══════════════════════════════════════════════ */}
        {/* Nothing rendered — pure black builds anticipation */}

        {/* ═══════════════════════════════════════════════
            PHASES 3-6 — Ancestor Orb + Dialogue
        ═══════════════════════════════════════════════ */}
        {phase >= 3 && phase <= 6 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{
              animation: phase === 3 ? 'cs-orb-in 1.5s ease-out forwards' : 'none',
            }}
          >
            {/* Outer ambient glow — very large, very soft */}
            <div
              style={{
                position: 'absolute',
                width: '70vmin',
                height: '70vmin',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(140,170,200,0.12) 0%, rgba(100,130,160,0.06) 50%, transparent 80%)',
                filter: 'blur(40px)',
                animation: 'cs-orb-breathe 4s ease-in-out infinite',
              }}
            />

            {/* Rotating outer ring */}
            <div
              style={{
                position: 'absolute',
                width: '48vmin',
                height: '48vmin',
                borderRadius: '50%',
                border: '1px solid rgba(160,185,210,0.25)',
                animation: 'cs-spin 25s linear infinite',
              }}
            >
              {/* Tick marks on ring */}
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: i % 6 === 0 ? '12px' : '5px',
                    height: '1.5px',
                    background: `rgba(160,185,210,${i % 6 === 0 ? 0.5 : 0.2})`,
                    transformOrigin: '0 center',
                    transform: `rotate(${i * 15}deg) translateX(calc(24vmin - ${i % 6 === 0 ? 12 : 5}px))`,
                  }}
                />
              ))}
            </div>

            {/* Counter-rotating inner ring */}
            <div
              style={{
                position: 'absolute',
                width: '36vmin',
                height: '36vmin',
                borderRadius: '50%',
                border: '1px dashed rgba(160,185,210,0.18)',
                animation: 'cs-spin-rev 18s linear infinite',
              }}
            />

            {/* Core orb — plasma sphere */}
            <div
              style={{
                position: 'relative',
                width: '22vmin',
                height: '22vmin',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 38% 33%, rgba(200,220,240,0.55) 0%, rgba(150,175,205,0.3) 40%, rgba(80,110,140,0.1) 70%, transparent 100%)',
                boxShadow: '0 0 60px 10px rgba(150,185,220,0.2), inset 0 0 30px rgba(200,220,240,0.15)',
                animation: 'cs-orb-breathe 3s ease-in-out infinite',
              }}
            >
              {/* Plasma swirl inside orb */}
              <div
                style={{
                  position: 'absolute',
                  inset: '10%',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, transparent 0%, rgba(180,205,230,0.3) 15%, transparent 30%, rgba(200,220,240,0.2) 50%, transparent 65%, rgba(180,205,230,0.3) 80%, transparent 100%)',
                  filter: 'blur(6px)',
                  animation: 'cs-spin 8s linear infinite',
                }}
              />
              {/* Inner bright core */}
              <div
                style={{
                  position: 'absolute',
                  top: '25%', left: '25%',
                  width: '50%', height: '50%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(230,240,255,0.7) 0%, rgba(180,210,240,0.3) 60%, transparent 100%)',
                  filter: 'blur(4px)',
                }}
              />
            </div>

            {/* Horizontal lens flare */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0, right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(180,205,230,0.05) 15%, rgba(200,220,240,0.5) 40%, rgba(230,240,255,0.95) 50%, rgba(200,220,240,0.5) 60%, rgba(180,205,230,0.05) 85%, transparent 100%)',
                animation: 'cs-flare 3s ease-in-out infinite',
              }}
            />
            {/* Wide soft flare */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0, right: 0,
                height: '80px',
                marginTop: '-40px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(150,175,200,0.03) 20%, rgba(170,195,220,0.08) 45%, rgba(190,210,235,0.1) 50%, rgba(170,195,220,0.08) 55%, rgba(150,175,200,0.03) 80%, transparent 100%)',
                filter: 'blur(15px)',
                animation: 'cs-flare 4s ease-in-out 0.5s infinite',
              }}
            />

            {/* Floating particles */}
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={`p-${i}`}
                style={{
                  position: 'absolute',
                  width: `${1.5 + (i % 3)}px`,
                  height: `${1.5 + (i % 3)}px`,
                  borderRadius: '50%',
                  background: 'rgba(200,220,240,0.7)',
                  left: `${30 + (i * 47 % 40)}%`,
                  top: `${25 + (i * 31 % 50)}%`,
                  animation: `cs-particle ${4 + (i % 4)}s ease-out ${(i * 0.4) % 3.5}s infinite`,
                  boxShadow: '0 0 4px rgba(200,220,240,0.5)',
                }}
              />
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            DIALOGUE LINES (phases 3-6)
        ═══════════════════════════════════════════════ */}
        {phase >= 3 && phase <= 6 && dialogueLine >= 0 && (
          <div
            className="absolute left-0 right-0 pointer-events-none flex flex-col items-center"
            style={{
              bottom: '12%',
              padding: '0 8%',
            }}
          >
            {/* Ancestor label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px',
                opacity: dialogueVisible ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
            >
              <div style={{ width: '24px', height: '1px', background: 'rgba(160,185,210,0.4)' }} />
              <span
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '9px',
                  letterSpacing: '0.3em',
                  color: 'rgba(160,185,210,0.6)',
                  textTransform: 'uppercase',
                }}
              >
                Ancestor Spirit
              </span>
              <div style={{ width: '24px', height: '1px', background: 'rgba(160,185,210,0.4)' }} />
            </div>

            {/* Dialogue box */}
            <div
              style={{
                position: 'relative',
                maxWidth: '480px',
                width: '100%',
                padding: '18px 24px',
                background: 'rgba(8, 12, 20, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(160,185,210,0.2)',
                boxShadow: '0 0 30px rgba(120,155,185,0.1), inset 0 0 20px rgba(120,155,185,0.03)',
                opacity: dialogueVisible ? 1 : 0,
                transform: dialogueVisible ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              {/* Corner decorators */}
              {[
                { top: 0, left: 0, borderRight: 'none', borderBottom: 'none' },
                { top: 0, right: 0, borderLeft: 'none', borderBottom: 'none' },
                { bottom: 0, left: 0, borderRight: 'none', borderTop: 'none' },
                { bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none' },
              ].map((style, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '10px',
                    height: '10px',
                    border: '1px solid rgba(160,185,210,0.5)',
                    ...style,
                  }}
                />
              ))}

              <p
                style={{
                  fontFamily: '"Times New Roman", Georgia, serif',
                  fontSize: 'clamp(0.95rem, 3vw, 1.15rem)',
                  color: 'rgba(210, 225, 240, 0.92)',
                  textAlign: 'center',
                  lineHeight: 1.7,
                  letterSpacing: '0.04em',
                  margin: 0,
                  textShadow: '0 0 20px rgba(160,185,210,0.3)',
                  fontStyle: 'italic',
                }}
              >
                {ANCESTOR_LINES[dialogueLine]?.text}
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            PHASE 7 — Sigil explosion + Title reveal
        ═══════════════════════════════════════════════ */}
        {phase >= 7 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{
              animation: 'cs-orb-in 1.2s ease-out forwards',
            }}
          >
            {/* === SIGIL === */}
            <div
              style={{
                position: 'absolute',
                width: 'min(88vmin, 520px)',
                height: 'min(88vmin, 520px)',
                animation: 'cs-sigil-in 1.5s cubic-bezier(0.16,1,0.3,1) forwards',
              }}
            >
              {/* Outer ambient glow ring */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-10%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, transparent 45%, rgba(140,170,200,0.12) 60%, rgba(160,190,220,0.18) 75%, transparent 90%)',
                  filter: 'blur(20px)',
                  animation: 'cs-orb-breathe 5s ease-in-out infinite',
                }}
              />

              <svg
                viewBox="0 0 520 520"
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="glow-strong">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <path id="outerRing" d="M 260,260 m -220,0 a 220,220 0 1,1 440,0 a 220,220 0 1,1 -440,0" />
                </defs>

                {/* Baybayin text on outer ring */}
                <circle cx="260" cy="260" r="225" fill="none" stroke="rgba(160,185,210,0.25)" strokeWidth="1" />
                <circle cx="260" cy="260" r="218" fill="none" stroke="rgba(160,185,210,0.08)" strokeWidth="6" filter="url(#glow)" />
                <text fill="rgba(180,205,230,0.4)" fontSize="14" fontFamily="serif" letterSpacing="5">
                  <textPath href="#outerRing" startOffset="0%">{baybayin}</textPath>
                </text>

                {/* Concentric rings */}
                {[190, 165, 140].map((r, i) => (
                  <circle key={r} cx="260" cy="260" r={r} fill="none" stroke={`rgba(160,185,210,${0.2 - i * 0.04})`} strokeWidth="1" style={{ animation: `cs-ring-pulse ${3 + i}s ease-in-out infinite` }} />
                ))}

                {/* Overlapping rotated squares forming star */}
                {[0, 45, 22.5, 67.5].map((angle, i) => (
                  <rect
                    key={angle}
                    x="130" y="130" width="260" height="260"
                    fill="none"
                    stroke={`rgba(170,195,220,${i < 2 ? 0.28 : 0.15})`}
                    strokeWidth={i < 2 ? 1.5 : 1}
                    transform={`rotate(${angle} 260 260)`}
                    filter={i < 2 ? 'url(#glow)' : undefined}
                  />
                ))}

                {/* Inner decorative circles */}
                <circle cx="260" cy="260" r="95" fill="none" stroke="rgba(160,185,210,0.2)" strokeWidth="1" />
                <circle cx="260" cy="260" r="70" fill="none" stroke="rgba(160,185,210,0.15)" strokeWidth="1" />

                {/* Dark center void */}
                <circle cx="260" cy="260" r="50" fill="rgba(0,0,0,0.92)" stroke="rgba(170,195,220,0.35)" strokeWidth="1.5" filter="url(#glow)" />

                {/* Center star/cross */}
                <g transform="translate(260,260)" stroke="rgba(200,220,240,0.6)" strokeWidth="1" filter="url(#glow)">
                  <line x1="0" y1="-42" x2="0" y2="42" />
                  <line x1="-42" y1="0" x2="42" y2="0" />
                  <line x1="-30" y1="-30" x2="30" y2="30" />
                  <line x1="30" y1="-30" x2="-30" y2="30" />
                </g>
              </svg>

              {/* Spinning layer (counter-rotating outer ring) */}
              <svg
                viewBox="0 0 520 520"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  animation: 'cs-spin 30s linear infinite',
                  transformOrigin: 'center',
                }}
              >
                {/* Dashed ring detail */}
                <circle cx="260" cy="260" r="205" fill="none" stroke="rgba(155,180,205,0.18)" strokeWidth="1" strokeDasharray="4 8" />
              </svg>
              <svg
                viewBox="0 0 520 520"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  animation: 'cs-spin-rev 20s linear infinite',
                  transformOrigin: 'center',
                }}
              >
                <circle cx="260" cy="260" r="178" fill="none" stroke="rgba(155,180,205,0.12)" strokeWidth="1" strokeDasharray="2 12" />
              </svg>
            </div>

            {/* === Horizontal lens flare === */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0, right: 0,
                height: '1.5px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(180,205,230,0.08) 10%, rgba(215,230,248,0.7) 42%, rgba(240,248,255,1) 50%, rgba(215,230,248,0.7) 58%, rgba(180,205,230,0.08) 90%, transparent 100%)',
                animation: 'cs-flare 2.5s ease-in-out infinite',
              }}
            />

            {/* === TITLE TEXT === */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                textAlign: 'center',
                animation: 'cs-title-in 2s cubic-bezier(0.16,1,0.3,1) 0.3s both',
              }}
            >
              <h1
                style={{
                  fontFamily: '"Times New Roman", Georgia, serif',
                  fontSize: 'clamp(2.2rem, 8vmin, 4.5rem)',
                  fontWeight: 400,
                  letterSpacing: '0.18em',
                  color: 'rgba(225, 235, 250, 0.95)',
                  textShadow: '0 0 40px rgba(180,205,230,0.6), 0 0 100px rgba(160,190,220,0.25)',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                KORLONG
              </h1>
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  animation: 'cs-title-in 2s cubic-bezier(0.16,1,0.3,1) 0.8s both',
                }}
              >
                <div style={{ height: '1px', width: '40px', background: 'rgba(160,185,210,0.35)' }} />
                <span
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '9px',
                    letterSpacing: '0.35em',
                    color: 'rgba(160,185,210,0.65)',
                    textTransform: 'uppercase',
                  }}
                >
                  Eastern Visayas · Legendary
                </span>
                <div style={{ height: '1px', width: '40px', background: 'rgba(160,185,210,0.35)' }} />
              </div>
            </div>

            {/* === XP Badge === */}
            <div
              style={{
                position: 'absolute',
                bottom: '14%',
                textAlign: 'center',
                animation: 'cs-xp-in 1.5s ease-out 1.2s both',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  padding: '8px 24px',
                  background: 'rgba(218,45,70,0.15)',
                  border: '1px solid rgba(218,45,70,0.5)',
                  boxShadow: '0 0 20px rgba(218,45,70,0.15)',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '11px',
                    letterSpacing: '0.3em',
                    color: 'rgba(218,45,70,0.9)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  +100 XP — Legendary Find
                </span>
              </div>
              <p
                style={{
                  marginTop: '10px',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '10px',
                  color: 'rgba(100,120,140,0.7)',
                  letterSpacing: '0.1em',
                }}
              >
                Tap to continue
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            SKIP HINT
        ═══════════════════════════════════════════════ */}
        {skipReady && phase < 7 && (
          <div
            style={{
              position: 'absolute',
              top: '5%',
              right: '5%',
              fontFamily: '"Space Mono", monospace',
              fontSize: '9px',
              letterSpacing: '0.25em',
              color: 'rgba(100,120,140,0.45)',
              textTransform: 'uppercase',
              animation: 'cs-title-in 1s ease-out forwards',
              pointerEvents: 'none',
            }}
          >
            Tap to skip
          </div>
        )}
      </div>
    </>
  );
}
