import React, { useState, useEffect, useRef } from 'react';
import { Camera, Map, Flame, Award, Shield, MapPin, Lock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';

// map
import map from '../assets/png/visayas_map.png';

/* ─── Inline keyframes (inject once) ─── */
const STYLE_ID = '__map-screen-animations';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes ripple {
      0% { transform: scale(0.8); opacity: 0.6; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes ripple-delayed {
      0% { transform: scale(0.8); opacity: 0.4; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    @keyframes float-gentle {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
    @keyframes float-label {
      0%, 100% { transform: translate(-50%, 0px); }
      50% { transform: translate(-50%, -3px); }
    }
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 15px rgba(218, 45, 70, 0.3), 0 0 30px rgba(218, 45, 70, 0.1); }
      50% { box-shadow: 0 0 25px rgba(218, 45, 70, 0.5), 0 0 50px rgba(218, 45, 70, 0.2); }
    }
    @keyframes particle-float {
      0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
      10% { opacity: 0.7; }
      90% { opacity: 0.3; }
      100% { transform: translateY(-120px) translateX(30px) scale(0.3); opacity: 0; }
    }
    @keyframes scan-btn-glow {
      0%, 100% { box-shadow: 0 4px 20px rgba(218, 45, 70, 0.3), 0 0 40px rgba(218, 45, 70, 0.1); }
      50% { box-shadow: 0 6px 30px rgba(218, 45, 70, 0.5), 0 0 60px rgba(218, 45, 70, 0.25), 0 0 80px rgba(240, 221, 224, 0.1); }
    }
    @keyframes streak-fire {
      0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(218,45,70,0.4)); }
      50% { filter: brightness(1.3) drop-shadow(0 0 10px rgba(218,45,70,0.7)); }
    }
    @keyframes lock-shimmer {
      0% { opacity: 0.3; }
      50% { opacity: 0.6; }
      100% { opacity: 0.3; }
    }
    @keyframes badge-pop {
      0% { transform: scale(0.9); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .shimmer-bar {
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(240, 221, 224, 0.25) 40%,
        rgba(255, 255, 255, 0.4) 50%,
        rgba(240, 221, 224, 0.25) 60%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: shimmer 2s ease-in-out infinite;
    }
    .gradient-text-warm {
      background: linear-gradient(135deg, #da2d46, #f0dde0, #da2d46);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradient-shift 4s ease infinite;
    }
  `;
  document.head.appendChild(style);
}

interface MapScreenProps {
  onOpenScanner: () => void;
  onOpenLocationServices: () => void;
  onSelectInstrument: (instrumentName: string) => void;
  onOpenCollection: () => void;
}

const REGION_PINS = [
  { id: 'western', name: 'Western Visayas', instrument: 'Tultugan', levelRequired: 1, top: '45%', left: '25%', emoji: '🪘' },
  { id: 'central', name: 'Central Visayas', instrument: 'Cebuano Gitara', levelRequired: 2, top: '65%', left: '55%', emoji: '🎸' },
  { id: 'eastern', name: 'Eastern Visayas', instrument: 'Lantoy', levelRequired: 3, top: '40%', left: '80%', emoji: '🎶' },
  { id: 'negros', name: 'Negros Region', instrument: 'Subing', levelRequired: 4, top: '60%', left: '42%', emoji: '🎵' },
];

/* ─── Floating Particle Component ─── */
function FloatingParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${4 + Math.random() * 4}s`,
    size: 2 + Math.random() * 4,
    color: i % 3 === 0 ? '#da2d46' : i % 3 === 1 ? '#f0dde0' : '#888ea1',
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '20%',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            opacity: 0,
            animation: `particle-float ${p.duration} ${p.delay} ease-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function MapScreen({ onOpenScanner, onOpenLocationServices, onSelectInstrument, onOpenCollection }: MapScreenProps) {
  const { progress } = useProgress();
  const [isExpeditionsExpanded, setIsExpeditionsExpanded] = useState(false);

  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Panning & Zoom States
  const [mapScale, setMapScale] = useState(1.2);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState(0);

  const getBoundedPan = (x: number, y: number, scale: number) => {
    const limitX = scale > 1 ? (dimensions.width / 2) * (1 - 1 / scale) : 0;
    const limitY = scale > 1 ? (dimensions.height / 2) * (1 - 1 / scale) : 0;
    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    };
  };

  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handlePanMove = (clientX: number, clientY: number) => {
    if (!isPanning) return;
    const newX = clientX - panStart.x;
    const newY = clientY - panStart.y;
    setPanOffset(getBoundedPan(newX, newY, mapScale));
  };

  const handlePanEnd = () => setIsPanning(false);

  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) setTouchStartDist(getTouchDist(e.touches));
    else if (e.touches.length === 1) handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist > 0) {
      const dist = getTouchDist(e.touches);
      const factor = dist / touchStartDist;
      const newScale = Math.max(1.0, Math.min(3.0, mapScale * (1 + (factor - 1) * 0.1)));
      setMapScale(newScale);
      setPanOffset(prev => getBoundedPan(prev.x, prev.y, newScale));
    } else if (e.touches.length === 1) {
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) setTouchStartDist(0);
    handlePanEnd();
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.max(1.0, Math.min(3.0, mapScale + scaleAmount));
    setMapScale(newScale);
    setPanOffset(prev => getBoundedPan(prev.x, prev.y, newScale));
  };

  const centerOnPin = (leftStr: string, topStr: string) => {
    const leftRatio = parseFloat(leftStr) / 100;
    const topRatio = parseFloat(topStr) / 100;
    const relativeX = dimensions.width * leftRatio - dimensions.width / 2;
    const relativeY = dimensions.height * topRatio - dimensions.height / 2;
    setPanOffset(getBoundedPan(-relativeX, -relativeY, mapScale));
  };

  const indicators = REGION_PINS.map(pin => {
    const isUnlocked =
      progress.unlockedRegions.includes(pin.name) ||
      (pin.name === 'Western Visayas' && progress.level >= 1) ||
      (pin.name === 'Central Visayas' && progress.level >= 2) ||
      (pin.name === 'Eastern Visayas' && progress.level >= 3);

    const pinLeftRatio = parseFloat(pin.left) / 100;
    const pinTopRatio = parseFloat(pin.top) / 100;
    const relativeX = dimensions.width * pinLeftRatio - dimensions.width / 2;
    const relativeY = dimensions.height * pinTopRatio - dimensions.height / 2;
    
    const x = dimensions.width / 2 + (relativeX + panOffset.x) * mapScale;
    const y = dimensions.height / 2 + (relativeY + panOffset.y) * mapScale;
    
    const isOffLeft = x < 65;
    const isOffRight = x > dimensions.width - 65;
    const isOffTop = y < 110;
    const isOffBottom = y > dimensions.height - 180;

    return {
      id: pin.id, name: pin.name, left: pin.left, top: pin.top,
      isUnlocked, x, y, isOffLeft, isOffRight, isOffTop, isOffBottom,
      isOffScreen: isOffLeft || isOffRight || isOffTop || isOffBottom,
    };
  });

  const xpForNextLevel =
    progress.level === 1 ? 100 : progress.level === 2 ? 250 : progress.level === 3 ? 500 : progress.level === 4 ? 900 : 900;
  const xpProgress = Math.min((progress.xp / xpForNextLevel) * 100, 100);

  const levelTitle =
    progress.level === 1 ? '🎵 Apprentice'
    : progress.level === 2 ? '🎶 Village Musician'
    : progress.level === 3 ? '🏆 Cultural Keeper'
    : progress.level === 4 ? '⭐ Regional Expert'
    : '👑 Master Instrumentalist';

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden pb-safe"
      style={{
        background: 'linear-gradient(165deg, #0f0c0c 0%, #1a1228 30%, #2a2d43 60%, #1a1228 100%)',
      }}
    >
      {/* Subtle warm ambient glow spots */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div
          style={{
            position: 'absolute', top: '10%', left: '20%',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(218,45,70,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '20%', right: '10%',
            width: 250, height: 250, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,221,224,0.06) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 400, height: 400, borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(136,142,161,0.05) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <FloatingParticles />

      {/* ─── Background Map Image & Interactive Pins ─── */}
      <div
        className={`absolute inset-0 z-[2] select-none cursor-grab active:cursor-grabbing ${isPanning ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${mapScale})` }}
        onMouseDown={e => handlePanStart(e.clientX, e.clientY)}
        onMouseMove={e => handlePanMove(e.clientX, e.clientY)}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={map}
            alt="Visayas Map"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: 0.65,
              mixBlendMode: 'screen',
              filter: 'saturate(1.2) brightness(1.1)',
            }}
          />
        </div>

        {/* ─── Map Pins ─── */}
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
          {REGION_PINS.map(pin => {
            let isUnlocked = progress.unlockedRegions.includes(pin.name);
            if (pin.name === 'Western Visayas') isUnlocked = progress.level >= 1;
            else if (pin.name === 'Central Visayas') isUnlocked = progress.level >= 2;
            else if (pin.name === 'Eastern Visayas') isUnlocked = progress.level >= 3;
            else if (pin.name === 'Negros Region') isUnlocked = progress.level >= 4;

            return (
              <button
                key={pin.id}
                onClick={() => isUnlocked && onSelectInstrument(pin.instrument)}
                disabled={!isUnlocked}
                className="absolute pointer-events-auto flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:scale-110 active:scale-95 group"
                style={{
                  top: pin.top, left: pin.left,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  // Inverse scale: pins stay the same visual size regardless of map zoom
                  transform: `translate(-50%, -50%) scale(${1 / mapScale})`,
                  transformOrigin: 'center center',
                }}
              >
                {isUnlocked && (
                  <>
                    <div
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        width: 48, height: 48, marginTop: -24, marginLeft: -24,
                        borderRadius: '50%',
                        border: '2px solid rgba(218, 45, 70, 0.4)',
                        animation: 'ripple 2s ease-out infinite',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        width: 48, height: 48, marginTop: -24, marginLeft: -24,
                        borderRadius: '50%',
                        border: '2px solid rgba(240, 221, 224, 0.25)',
                        animation: 'ripple-delayed 2s 0.6s ease-out infinite',
                      }}
                    />
                  </>
                )}
                <div
                  style={{
                    position: 'relative', zIndex: 10,
                    width: 48, height: 48, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                    background: isUnlocked
                      ? 'linear-gradient(135deg, #da2d46, #f0dde0)'
                      : 'linear-gradient(135deg, #2a2d43, #3a3d55)',
                    border: isUnlocked ? '3px solid rgba(240,221,224,0.5)' : '2px solid #888ea1',
                    boxShadow: isUnlocked
                      ? '0 0 20px rgba(218,45,70,0.4), 0 4px 15px rgba(0,0,0,0.3)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    animation: isUnlocked ? 'float-gentle 3s ease-in-out infinite' : 'lock-shimmer 3s ease-in-out infinite',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isUnlocked ? (
                    <span>{pin.emoji}</span>
                  ) : (
                    <Lock size={18} style={{ color: '#888ea1' }} />
                  )}
                </div>
                <div
                  style={{
                    background: isUnlocked
                      ? 'linear-gradient(135deg, rgba(218,45,70,0.15), rgba(42,45,67,0.9))'
                      : 'rgba(42,45,67,0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: isUnlocked
                      ? '1px solid rgba(218,45,70,0.3)'
                      : '1px solid rgba(136,142,161,0.2)',
                    padding: '6px 12px', borderRadius: 10,
                    textAlign: 'center',
                    boxShadow: isUnlocked
                      ? '0 4px 15px rgba(218,45,70,0.15)'
                      : '0 2px 8px rgba(0,0,0,0.2)',
                    animation: isUnlocked ? 'float-label 3s ease-in-out infinite' : 'none',
                  }}
                >
                  <p
                    className="font-orbitron font-bold"
                    style={{
                      fontSize: 10,
                      color: isUnlocked ? '#f0dde0' : '#888ea1',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {pin.name.toUpperCase()}
                  </p>
                  {isUnlocked ? (
                    <p className="font-space-mono" style={{ fontSize: 9, color: '#da2d46', fontWeight: 600 }}>
                      ♪ {pin.instrument}
                    </p>
                  ) : (
                    <p className="font-space-mono" style={{ fontSize: 9, color: '#888ea1' }}>
                      🔒 Reach Lvl {pin.levelRequired}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[3]"
        style={{
          background: 'linear-gradient(to top, rgba(15,12,12,0.85) 0%, rgba(42,45,67,0.3) 40%, rgba(15,12,12,0.5) 100%)',
        }}
      />

      {/* ─── Floating Offscreen Indicators ─── */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {indicators.map(ind => {
          if (!ind.isOffScreen) return null;

          let style: React.CSSProperties = {};
          let arrow = '';
          let regionShort = ind.name.split(' ')[0];

          if (ind.isOffLeft) {
            style = { left: 16, top: Math.max(120, Math.min(dimensions.height - 240, ind.y)), transform: 'translateY(-50%)' };
            arrow = '← ';
          } else if (ind.isOffRight) {
            style = { right: 16, top: Math.max(120, Math.min(dimensions.height - 240, ind.y)), transform: 'translateY(-50%)' };
            arrow = ' →';
          } else if (ind.isOffTop) {
            style = { top: 110, left: Math.max(85, Math.min(dimensions.width - 120, ind.x)), transform: 'translateX(-50%)' };
            arrow = '↑ ';
          } else if (ind.isOffBottom) {
            style = { bottom: 180, left: Math.max(85, Math.min(dimensions.width - 120, ind.x)), transform: 'translateX(-50%)' };
            arrow = '↓ ';
          }

          return (
            <button
              key={ind.id}
              onClick={() => centerOnPin(ind.left, ind.top)}
              style={{
                ...style,
                position: 'absolute',
                pointerEvents: 'auto',
                background: 'linear-gradient(135deg, rgba(218,45,70,0.2), rgba(42,45,67,0.9))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(218,45,70,0.4)',
                color: '#f0dde0',
                fontSize: 10,
                fontFamily: 'Space Mono, monospace',
                padding: '6px 14px',
                borderRadius: 20,
                boxShadow: '0 0 15px rgba(218,45,70,0.2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => {
                (e.target as HTMLElement).style.boxShadow = '0 0 25px rgba(218,45,70,0.4)';
                (e.target as HTMLElement).style.transform += ' scale(1.05)';
              }}
              onMouseOut={e => {
                (e.target as HTMLElement).style.boxShadow = '0 0 15px rgba(218,45,70,0.2)';
              }}
            >
              {ind.isOffRight ? `${regionShort}${arrow}` : `${arrow}${regionShort}`}
            </button>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════ */}
      {/* ─── HUD (TOP RIGHT CLUSTER) ─── */}
      {/* ═════════════════════════════════════════════ */}
      <div className="absolute top-0 right-0 z-40 p-4 pt-10 sm:p-6 sm:pt-12 flex flex-col items-end gap-2 sm:gap-3 pointer-events-none w-full max-w-sm">
        
        {/* Profile Info & Streak Row */}
        <div className="flex items-start justify-end gap-3 sm:gap-5 pointer-events-auto">
          <div className="text-right">
            <h1
              className="font-orbitron text-xl sm:text-2xl font-black drop-shadow-md"
              style={{ letterSpacing: '0.08em' }}
            >
              <span style={{ color: '#e0e5ed' }}>VISAYAS </span>
              <span className="gradient-text-warm text-[1.2rem] sm:text-[1.4rem]">ARC</span>
            </h1>
            <p
              className="font-space-mono text-[9px] sm:text-[11px] uppercase mt-1"
              style={{
                color: '#f0dde0',
                letterSpacing: '0.15em',
                textShadow: '0 0 10px rgba(240,221,224,0.3)',
              }}
            >
              {levelTitle}
            </p>
          </div>

          <div className="flex flex-col items-end pointer-events-auto">
            <div
              className="flex items-center gap-1.5 font-orbitron font-bold text-lg sm:text-xl"
              style={{
                color: progress.currentStreak > 0 ? '#da2d46' : '#888ea1',
                animation: progress.currentStreak > 0 ? 'streak-fire 1.5s ease-in-out infinite' : 'none',
              }}
            >
              <Flame size={20} className="sm:w-[22px] sm:h-[22px]" />
              <span>{progress.currentStreak}</span>
            </div>
            <div className="flex gap-1 sm:gap-1.5 mt-1 sm:mt-1.5">
              {Array.from({ length: progress.streakShields }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    animation: `badge-pop 0.5s ${i * 0.1}s ease-out`,
                  }}
                >
                  <Shield size={12} className="sm:w-[14px] sm:h-[14px]" style={{ color: '#f0dde0', filter: 'drop-shadow(0 0 3px rgba(240,221,224,0.4))' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="w-[200px] sm:w-[260px] pointer-events-auto mt-1 sm:mt-2 mb-1">
          <div
            className="flex justify-between mb-1.5 font-space-mono"
            style={{ fontSize: 11, color: 'rgba(224,229,237,0.7)' }}
          >
            <span style={{ fontWeight: 700, color: '#f0dde0' }}>LVL {progress.level}</span>
            <span>{progress.xp} / {xpForNextLevel} XP</span>
          </div>
          <div
            style={{
              height: 10, width: '100%', borderRadius: 8,
              background: 'rgba(42,45,67,0.8)',
              border: '1px solid rgba(224,229,237,0.1)',
              overflow: 'hidden', position: 'relative',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                height: '100%', borderRadius: 8, position: 'relative',
                width: `${xpProgress}%`,
                background: 'linear-gradient(90deg, #da2d46, #f0dde0, #da2d46)',
                backgroundSize: '200% 100%',
                animation: 'gradient-shift 3s ease infinite',
                transition: 'width 1s ease-out',
                boxShadow: '0 0 10px rgba(218,45,70,0.4)',
              }}
            >
              <div
                className="shimmer-bar"
                style={{
                  position: 'absolute', inset: 0, borderRadius: 8,
                }}
              />
            </div>
          </div>
        </div>

        {/* Game Icon Menus */}
        <div className="flex gap-2 sm:gap-2.5 pointer-events-auto mt-1 sm:mt-2">
          {/* Radar */}
          <button
            onClick={onOpenLocationServices}
            className="flex flex-col items-center justify-center gap-1 w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] rounded-xl sm:rounded-2xl active:scale-95 transition-all duration-200 group"
            style={{
              background: 'linear-gradient(145deg, rgba(42,45,67,0.8), rgba(42,45,67,0.5))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(240,221,224,0.15)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
            onMouseOver={e => {
              (e.currentTarget as HTMLElement).style.border = '1px solid rgba(240,221,224,0.35)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(240,221,224,0.1)';
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLElement).style.border = '1px solid rgba(240,221,224,0.15)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(240,221,224,0.15), rgba(240,221,224,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] rounded-md sm:rounded-lg"
            >
              <Map className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px]" style={{ color: '#f0dde0' }} />
            </div>
            <span className="font-space-mono uppercase text-[8px] sm:text-[9px]" style={{ color: 'rgba(224,229,237,0.8)', letterSpacing: '0.08em' }}>
              Radar
            </span>
          </button>

          {/* Archive */}
          <button
            onClick={onOpenCollection}
            className="flex flex-col items-center justify-center gap-1 w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] rounded-xl sm:rounded-2xl active:scale-95 transition-all duration-200"
            style={{
              background: 'linear-gradient(145deg, rgba(218,45,70,0.2), rgba(42,45,67,0.8))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(218,45,70,0.35)',
              boxShadow: '0 4px 20px rgba(218,45,70,0.15), 0 0 30px rgba(218,45,70,0.05)',
              animation: 'glow-pulse 3s ease-in-out infinite',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(218,45,70,0.3), rgba(218,45,70,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] rounded-md sm:rounded-lg"
            >
              <Award className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px]" style={{ color: '#da2d46', filter: 'drop-shadow(0 0 4px rgba(218,45,70,0.5))' }} />
            </div>
            <span className="font-space-mono uppercase font-bold text-[8px] sm:text-[9px]" style={{ color: '#e0e5ed', letterSpacing: '0.08em' }}>
              Archive
            </span>
          </button>

          {/* Ranks */}
          <button
            className="flex flex-col items-center justify-center gap-1 w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] rounded-xl sm:rounded-2xl transition-all duration-200"
            style={{
              background: 'linear-gradient(145deg, rgba(42,45,67,0.5), rgba(42,45,67,0.3))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(136,142,161,0.1)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            <div
              style={{
                background: 'rgba(136,142,161,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] rounded-md sm:rounded-lg"
            >
              <Flame className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px]" style={{ color: 'rgba(136,142,161,0.4)' }} />
            </div>
            <span className="font-space-mono uppercase text-[8px] sm:text-[9px]" style={{ color: 'rgba(136,142,161,0.4)', letterSpacing: '0.08em' }}>
              Ranks
            </span>
          </button>
        </div>

        {/* Expeditions Dropdown */}
        <div
          className="w-[260px] sm:w-full mt-2 sm:mt-3 rounded-xl sm:rounded-2xl transition-all duration-300 pointer-events-auto"
          style={{
            background: 'linear-gradient(135deg, rgba(42,45,67,0.6), rgba(15,12,12,0.7))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(240,221,224,0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(240,221,224,0.05)',
          }}
        >
          <button
            onClick={() => setIsExpeditionsExpanded(!isExpeditionsExpanded)}
            className="w-full p-3 sm:p-4 flex items-center justify-between text-left rounded-xl sm:rounded-2xl transition-colors"
            style={{ background: 'transparent' }}
            onMouseOver={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')}
            onMouseOut={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: '#da2d46' }} />
              <h2
                className="font-orbitron font-bold text-[10px] sm:text-[11px]"
                style={{ color: '#e0e5ed', letterSpacing: '0.1em' }}
              >
                YOUR EXPEDITIONS
              </h2>
            </div>
            {isExpeditionsExpanded ? (
              <ChevronUp size={16} style={{ color: '#f0dde0' }} />
            ) : (
              <ChevronDown size={16} style={{ color: '#888ea1' }} />
            )}
          </button>

          {isExpeditionsExpanded && (
            <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(224,229,237,0.05)' }}>
              {/* Tip box */}
              <div
                className="font-space-mono"
                style={{
                  fontSize: 10, color: '#f0dde0',
                  background: 'linear-gradient(135deg, rgba(218,45,70,0.1), rgba(218,45,70,0.03))',
                  border: '1px solid rgba(218,45,70,0.15)',
                  padding: '10px 14px', borderRadius: 12, marginBottom: 16, marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                💡 Scan new instruments or play rhythm games to earn XP. Level up to unlock new regions!
              </div>

              {/* Region rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {REGION_PINS.map(pin => {
                  const isUnlocked = progress.level >= pin.levelRequired;
                  const xpNeeded = pin.levelRequired === 1 ? 0 : pin.levelRequired === 2 ? 100 : pin.levelRequired === 3 ? 250 : 500;
                  const regionProgress = isUnlocked ? 100 : Math.min((progress.xp / Math.max(xpNeeded, 1)) * 100, 99);

                  return (
                    <div key={pin.id}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                        <span
                          className="font-space-mono text-[11px] sm:text-xs"
                          style={{
                            color: isUnlocked ? '#e0e5ed' : 'rgba(136,142,161,0.6)',
                            fontWeight: isUnlocked ? 600 : 400,
                          }}
                        >
                          {pin.emoji} {pin.name}
                        </span>
                        <span
                          className="font-space-mono font-bold text-[9px] sm:text-[10px]"
                          style={{
                            color: isUnlocked ? '#da2d46' : 'rgba(136,142,161,0.5)',
                            textShadow: isUnlocked ? '0 0 8px rgba(218,45,70,0.4)' : 'none',
                          }}
                        >
                          {isUnlocked ? '✓ UNLOCKED' : `🔒 LVL ${pin.levelRequired}`}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4, borderRadius: 4,
                          background: 'rgba(42,45,67,0.8)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%', borderRadius: 4,
                            width: `${regionProgress}%`,
                            background: isUnlocked
                              ? 'linear-gradient(90deg, #da2d46, #f0dde0)'
                              : 'linear-gradient(90deg, rgba(136,142,161,0.3), rgba(136,142,161,0.5))',
                            transition: 'width 0.8s ease-out',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Unlocked Instruments */}
              {progress.unlockedInstruments.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(224,229,237,0.08)' }}>
                  <span
                    className="font-orbitron uppercase"
                    style={{ fontSize: 9, color: '#888ea1', display: 'block', marginBottom: 8, letterSpacing: '0.1em' }}
                  >
                    🎵 Unlocked Instruments ({progress.unlockedInstruments.length})
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {progress.unlockedInstruments.map((inst, i) => (
                      <div
                        key={inst}
                        style={{
                          width: 56, height: 56, flexShrink: 0,
                          background: 'linear-gradient(135deg, rgba(218,45,70,0.15), rgba(42,45,67,0.8))',
                          borderRadius: 12,
                          border: '1px solid rgba(240,221,224,0.25)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          padding: 4, position: 'relative', overflow: 'hidden',
                          animation: `badge-pop 0.4s ${i * 0.1}s ease-out`,
                          boxShadow: '0 2px 10px rgba(218,45,70,0.1)',
                        }}
                      >
                        <span className="font-space-mono text-center" style={{ fontSize: 8, color: '#f0dde0', lineHeight: 1.3 }}>
                          {inst}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════ */}
      {/* ─── BOTTOM CTA (SCAN BUTTON) ─── */}
      {/* ═════════════════════════════════════════════ */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center w-full px-4 sm:px-6">
        
        <div className="w-[260px] sm:w-[320px] max-w-full relative pointer-events-auto">
          {progress.xp === 0 && progress.unlockedInstruments.length === 0 && (
            <div
              className="absolute z-50 pointer-events-none flex flex-col items-center"
              style={{
                top: -44, left: '50%', transform: 'translateX(-50%)',
                animation: 'float-gentle 1.5s ease-in-out infinite',
              }}
            >
              <div
                className="font-space-mono font-bold"
                style={{
                  background: 'linear-gradient(135deg, #f0dde0, #da2d46)',
                  color: '#0f0c0c', fontSize: 11,
                  padding: '6px 16px', borderRadius: 20,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 20px rgba(240,221,224,0.5), 0 4px 15px rgba(218,45,70,0.3)',
                }}
              >
                START YOUR ADVENTURE!
              </div>
              <div style={{
                width: 0, height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: '7px solid #da2d46',
                marginTop: -1,
              }} />
            </div>
          )}

          <button
            onClick={onOpenScanner}
            className="w-full font-orbitron text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 sm:gap-3 relative overflow-hidden group py-[14px] sm:py-[18px] px-4 sm:px-6 rounded-[14px] sm:rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #da2d46, #e8556a, #f0dde0)',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 4s ease infinite, scan-btn-glow 2s ease-in-out infinite',
              color: '#0f0c0c',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              position: 'relative',
              zIndex: 10,
            }}
            onMouseOver={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.02)')}
            onMouseOut={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
          >
            <div
              className="shimmer-bar"
              style={{
                position: 'absolute', inset: 0, borderRadius: 16,
                pointerEvents: 'none',
              }}
            />
            <Camera size={18} className="sm:w-[20px] sm:h-[20px]" />
            <span style={{ position: 'relative', zIndex: 2 }}>SCAN NEW INSTRUMENT</span>
          </button>
        </div>
      </div>

    </div>
  );
}