import React, { useState, useEffect } from 'react';
import { Camera, Map, Flame, Shield, Lock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';
import map from '../assets/png/visayas_map.png';
import { ExpeditionScreen } from './expedition/ExpeditionScreen';

interface MapScreenProps {
  onOpenScanner: () => void;
  onOpenLocationServices: () => void;
  onSelectInstrument: (instrumentName: string) => void;
  onOpenCollection: () => void;
  onOpenBadges?: () => void;
  onOpenRanks?: () => void;
  onOpenExpedition?: () => void;
}

export function MapScreen({ onOpenScanner, onOpenLocationServices, onOpenCollection, onOpenBadges, onOpenRanks, onOpenExpedition }: MapScreenProps) {
  return (
    <ExpeditionScreen
      isRootMap={true}
      onBack={onOpenExpedition || (() => {})}
      onOpenScanner={onOpenScanner}
      onOpenLocationServices={onOpenLocationServices}
      onOpenCollection={onOpenCollection}
      onOpenBadges={onOpenBadges}
      onOpenRanks={onOpenRanks}
    />
  );
}

const REGION_PINS = [
  { id: 'western', name: 'Western Visayas', instrument: 'Tultugan', levelRequired: 1, top: '45%', left: '25%', emoji: '🪘', totalInstruments: 6 },
  { id: 'central', name: 'Central Visayas', instrument: 'Cebuano Gitara', levelRequired: 2, top: '65%', left: '55%', emoji: '🎸', totalInstruments: 5 },
  { id: 'eastern', name: 'Eastern Visayas', instrument: 'Lantoy', levelRequired: 3, top: '40%', left: '80%', emoji: '🎶', totalInstruments: 3 },
  { id: 'negros', name: 'Negros Region', instrument: 'Subing', levelRequired: 4, top: '60%', left: '42%', emoji: '🎵'}, 
];

// Legacy MapScreen code kept for reference if needed
export function LegacyMapScreen({ onOpenScanner, onOpenLocationServices, onSelectInstrument, onOpenCollection: _onOpenCollection, onOpenBadges, onOpenRanks, onOpenExpedition }: MapScreenProps) {
  const { progress } = useProgress();
  const [isExpeditionsExpanded, setIsExpeditionsExpanded] = useState(false);

  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
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

  const xpForNextLevel = progress.level === 1 ? 100 : progress.level === 2 ? 250 : progress.level === 3 ? 500 : progress.level === 4 ? 900 : 900;
  const xpProgress = Math.min((progress.xp / xpForNextLevel) * 100, 100);

  const levelTitle =
    progress.level === 1 ? 'APPRENTICE'
    : progress.level === 2 ? 'VILLAGE MUSICIAN'
    : progress.level === 3 ? 'CULTURAL KEEPER'
    : progress.level === 4 ? 'REGIONAL EXPERT'
    : 'MASTER INSTRUMENTALIST';

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden pb-safe bg-[#2a2d43] z-0">
      
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />

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
            className="w-full h-full object-cover"
            style={{
              opacity: 0.8,
              mixBlendMode: 'hard-light',
              filter: 'saturate(1.5) contrast(1.2) sepia(0.3) hue-rotate(-10deg)',
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

            const acquiredCount = progress.unlockedInstruments.includes(pin.instrument) ? 1 : 0;

            // DYNAMIC LABEL OFFSET: Calculates screen position to prevent edge clipping
            const pinLeftRatio = parseFloat(pin.left) / 100;
            const relativeX = dimensions.width * pinLeftRatio - dimensions.width / 2;
            const screenX = dimensions.width / 2 + (relativeX + panOffset.x) * mapScale;
            
            let labelOffset = '-50%'; // default centered
            if (screenX < 120) labelOffset = '-15%'; // Pin near left edge -> shift right
            else if (screenX > dimensions.width - 120) labelOffset = '-85%'; // Pin near right edge -> shift left

            return (
              <button
                key={pin.id}
                onClick={() => isUnlocked && onSelectInstrument(pin.instrument)}
                disabled={!isUnlocked}
                className="absolute pointer-events-auto group"
                style={{
                  top: pin.top, left: pin.left,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  transform: `translate(-50%, -50%) scale(${1 / mapScale})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Wrapper ensures animation affects both circle and label without messing up flex centering */}
                <div className="relative flex flex-col items-center animate-comic-bounce">
                  
                  {/* Bouncing Circular Pin */}
                  <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[3px] sm:border-[4px] border-[#0f0c0c] flex items-center justify-center text-lg sm:text-xl transition-colors ${
                    isUnlocked 
                      ? 'bg-gradient-to-br from-[#da2d46] to-[#f0dde0] shadow-[4px_4px_0px_0px_#0f0c0c]' 
                      : 'bg-gradient-to-br from-[#2a2d43] to-[#888ea1] shadow-[2px_2px_0px_0px_#0f0c0c]'
                  }`}>
                    
                    {/* Comic Ripples */}
                    {isUnlocked && (
                      <>
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#da2d46] animate-comic-ripple" />
                        <div className="absolute inset-0 rounded-full border-[3px] border-[#da2d46] animate-comic-ripple-delayed" />
                      </>
                    )}
                    <span className="relative z-10 block translate-y-px">{isUnlocked ? pin.emoji : <Lock size={16} className="text-[#0f0c0c]"/>}</span>
                  </div>

                  {/* Absolutely Positioned Label (Stays connected to circle but adjusts bounds dynamically) */}
                  <div 
                    className={`absolute top-full mt-2 w-max px-3 py-1 sm:px-4 sm:py-1.5 border-[3px] border-[#0f0c0c] flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_0px_#0f0c0c] transition-all duration-300 ${
                      isUnlocked ? 'bg-[#da2d46] group-hover:bg-[#e0e5ed]' : 'bg-[#2a2d43]'
                    }`}
                    style={{
                      left: '50%',
                      transform: `translateX(${labelOffset}) skewX(-6deg)`
                    }}
                  >
                    <p className={`font-orbitron font-black text-[9px] sm:text-[10px] tracking-widest uppercase ${isUnlocked ? 'text-[#0f0c0c]' : 'text-[#888ea1]'}`}>
                      {isUnlocked ? pin.name : 'LOCKED'}
                    </p>
                    
                    {isUnlocked ? (
                      <p className="font-space-mono flex items-center justify-center gap-1 text-[8px] sm:text-[9px] text-[#0f0c0c] font-black uppercase mt-0.5">
                        <span>♪ {pin.instrument}</span>
                        {pin.totalInstruments && (
                          <span className="bg-[#0f0c0c] text-[#f0dde0] px-1 ml-1 rounded-[2px]">
                            {acquiredCount}/{pin.totalInstruments}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="font-space-mono flex items-center justify-center gap-1 text-[8px] sm:text-[9px] text-[#888ea1] font-black uppercase mt-0.5">
                        <Lock size={10} /> LVL {pin.levelRequired}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-[3] border-[12px] border-[#0f0c0c] md:hidden" />

      {/* ─── HUD (COMPACTED HEAVILY FOR MOBILE) ─── */}
      <div className="absolute top-0 right-0 z-40 p-2 pt-6 sm:p-6 sm:pt-12 flex flex-col items-end gap-1.5 sm:gap-3 pointer-events-none w-full max-w-[220px] sm:max-w-sm">
        
        {/* Main HUD Panel */}
        <div className="bg-[#e0e5ed] border-[2px] sm:border-[4px] border-[#0f0c0c] p-1.5 sm:p-3 shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] -skew-x-2 pointer-events-auto w-full">
          
          <div className="flex items-start justify-between gap-1.5 sm:gap-3 skew-x-2">
            <div className="text-left flex-1">
              <h1 
                className="font-orbitron text-[14px] sm:text-2xl font-black uppercase text-[#e0e5ed] leading-none"
                style={{ textShadow: '2px 2px 0px #0f0c0c, -1px 0px 0px #da2d46' }}
              >
                VISAYAS ARC
              </h1>
              <div className="inline-block bg-[#0f0c0c] px-1 sm:px-2 py-0.5 mt-0.5 sm:mt-1 -skew-x-6">
                <p className="font-space-mono text-[7px] sm:text-[10px] uppercase font-bold text-[#f0dde0] skew-x-6 tracking-widest leading-tight">
                  {levelTitle}
                </p>
              </div>
            </div>

            {/* Streak & Shields */}
            <div className="flex flex-col items-end mt-0.5">
              <div className="flex items-center gap-1 font-orbitron font-black text-[10px] sm:text-lg bg-[#da2d46] border-2 border-[#0f0c0c] px-1 sm:px-2 shadow-[2px_2px_0px_0px_#0f0c0c] -skew-x-6 text-[#0f0c0c]">
                <Flame size={10} className="skew-x-6 sm:w-4 sm:h-4" />
                <span className="skew-x-6 leading-tight">{progress.currentStreak}</span>
              </div>
              <div className="flex gap-0.5 sm:gap-1 mt-1 sm:mt-1.5">
                {Array.from({ length: progress.streakShields }).map((_, i) => (
                  <Shield key={i} size={8} className="text-[#0f0c0c] fill-[#f0dde0] sm:w-[14px]" />
                ))}
              </div>
            </div>
          </div>

          {/* Heavy XP Bar */}
          <div className="mt-1.5 sm:mt-4 skew-x-2">
            <div className="flex justify-between mb-0.5 sm:mb-1 font-space-mono text-[7px] sm:text-[10px] font-black text-[#0f0c0c] uppercase">
              <span>LVL {progress.level}</span>
              <span>{progress.xp} / {xpForNextLevel} XP</span>
            </div>
            <div className="h-1.5 sm:h-3 w-full border-[2px] sm:border-[3px] border-[#0f0c0c] bg-[#2a2d43] relative skew-x-6">
              <div
                className="h-full bg-[#da2d46] transition-all duration-500 ease-out"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Game Icon Menus - Row of Skewed Buttons */}
        <div className="flex gap-1.5 sm:gap-3 pointer-events-auto w-full justify-end">
          <button
            onClick={onOpenLocationServices}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#f0dde0] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group"
          >
            <Map size={14} className="skew-x-6 text-[#0f0c0c] group-hover:text-white sm:w-5 sm:h-5" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Radar</span>
          </button>

          <button
            onClick={onOpenBadges}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#fbe8eb] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group"
          >
            <Shield size={14} className="skew-x-6 text-[#da2d46] group-hover:text-white sm:w-5 sm:h-5" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Badges</span>
          </button>

          <button
            onClick={onOpenRanks}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#fef3c7] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group"
          >
            <Flame size={14} className="skew-x-6 text-[#d97706] group-hover:text-white sm:w-5 sm:h-5 animate-pulse" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Ranks</span>
          </button>

          <button
            onClick={onOpenExpedition}
            className="flex-1 max-w-[60px] sm:max-w-[80px] py-1 sm:py-2 bg-[#facc15] border-[2px] sm:border-[4px] border-[#0f0c0c] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[4px_4px_0px_0px_#0f0c0c] -skew-x-6 active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#da2d46] hover:text-white transition-all group animate-pulse"
            title="Harmonydex Expedition 33 Mode"
          >
            <Sparkles size={14} className="skew-x-6 text-[#0f0c0c] group-hover:text-white sm:w-5 sm:h-5" />
            <span className="font-space-mono uppercase font-black text-[7px] sm:text-[9px] skew-x-6 text-[#0f0c0c] group-hover:text-white">Exped</span>
          </button>
        </div>

        {/* Expeditions Accordion */}
        <div className="w-full pointer-events-auto bg-[#f0dde0] border-[2px] sm:border-[4px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] sm:shadow-[6px_6px_0px_0px_#0f0c0c] -skew-x-2">
          <button
            onClick={() => setIsExpeditionsExpanded(!isExpeditionsExpanded)}
            className="w-full p-1.5 sm:p-3 flex items-center justify-between text-left active:bg-[#da2d46] transition-colors"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 skew-x-2">
              <Sparkles size={12} className="text-[#0f0c0c] sm:w-4 sm:h-4" />
              <h2 className="font-orbitron font-black text-[8px] sm:text-[12px] text-[#0f0c0c] tracking-widest uppercase">
                YOUR EXPEDITIONS
              </h2>
            </div>
            {isExpeditionsExpanded ? <ChevronUp size={14} className="text-[#0f0c0c] skew-x-2" /> : <ChevronDown size={14} className="text-[#0f0c0c] skew-x-2" />}
          </button>

          {isExpeditionsExpanded && (
            <div className="p-2 sm:p-4 border-t-[2px] sm:border-t-[4px] border-[#0f0c0c] bg-[#e0e5ed] skew-x-2">
              <button
                onClick={onOpenExpedition}
                className="w-full mb-3 py-2 sm:py-2.5 bg-[#da2d46] text-white border-[3px] border-[#0f0c0c] shadow-[3px_3px_0px_0px_#0f0c0c] font-orbitron font-black text-[9px] sm:text-xs uppercase -skew-x-6 hover:bg-[#ff3b56] transition-all flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none"
              >
                <Sparkles size={14} className="fill-current animate-spin" />
                <span>ENTER HARMONYDEX EXPEDITION 33 ➔</span>
              </button>
              <div className="font-space-mono text-[7px] sm:text-[10px] font-bold text-[#e0e5ed] bg-[#0f0c0c] p-1.5 sm:p-3 -skew-x-2 mb-2 sm:mb-3 shadow-[1px_1px_0px_0px_#da2d46] sm:shadow-[3px_3px_0px_0px_#da2d46]">
                <span className="skew-x-2 block">
                  Scan instruments or play rhythm games to earn XP. Level up to unlock new regions!
                </span>
              </div>
              <div className="flex flex-col gap-1.5 sm:gap-3">
                {REGION_PINS.map(pin => {
                  const isUnlocked = progress.level >= pin.levelRequired;
                  const xpNeeded = pin.levelRequired === 1 ? 0 : pin.levelRequired === 2 ? 100 : pin.levelRequired === 3 ? 250 : 500;
                  const regionProgress = isUnlocked ? 100 : Math.min((progress.xp / Math.max(xpNeeded, 1)) * 100, 99);
                  return (
                    <div key={pin.id}>
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className={`font-space-mono text-[7px] sm:text-[10px] font-black uppercase ${isUnlocked ? 'text-[#0f0c0c]' : 'text-[#888ea1]'}`}>
                          {pin.emoji} {pin.name}
                        </span>
                        <span className={`font-space-mono text-[6px] sm:text-[9px] font-black uppercase ${isUnlocked ? 'text-[#da2d46]' : 'text-[#888ea1]'}`}>
                          {isUnlocked ? 'UNLOCKED' : `LVL ${pin.levelRequired}`}
                        </span>
                      </div>
                      <div className="h-1 sm:h-2 w-full border border-[#0f0c0c] bg-[#2a2d43] -skew-x-6">
                        <div
                          className={`h-full transition-all duration-500 ease-out ${isUnlocked ? 'bg-[#da2d46]' : 'bg-[#888ea1]'}`}
                          style={{ width: `${regionProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM CTA (SCAN BUTTON & TOOLTIP) ─── */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-full px-4 sm:px-6 max-w-sm">
        
        <div className="relative w-full pointer-events-auto">
          {/* Restored: Tooltip Speech Bubble positioned clearly above */}
          {progress.xp === 0 && progress.unlockedInstruments.length === 0 && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-comic-float flex flex-col items-center">
              <div className="bg-[#f0dde0] border-[3px] sm:border-[4px] border-[#0f0c0c] text-[#0f0c0c] font-space-mono font-black text-[9px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] whitespace-nowrap">
                <span className="skew-x-6 block tracking-widest">START YOUR ADVENTURE!</span>
              </div>
              {/* Bubble Tail */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#0f0c0c] mt-0.5" />
            </div>
          )}

          <button
            onClick={onOpenScanner}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 bg-[#da2d46] border-[4px] sm:border-[6px] border-[#0f0c0c] text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-[0px_0px_0px_0px_#0f0c0c] transition-all -skew-x-6 group"
          >
            <Camera size={18} className="skew-x-6 font-black sm:w-6 sm:h-6" />
            <span className="font-space-mono font-black text-sm sm:text-lg tracking-widest uppercase skew-x-6">
              SCAN INSTRUMENT
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes comic-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes comic-ripple {
          0% { transform: scale(0.8); opacity: 1; border-width: 4px; }
          100% { transform: scale(2.2); opacity: 0; border-width: 1px; }
        }
        @keyframes comic-float {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-6px) translateX(-50%); }
        }
        .animate-comic-bounce { animation: comic-bounce 1.5s ease-in-out infinite; }
        .animate-comic-ripple { animation: comic-ripple 2s ease-out infinite; }
        .animate-comic-ripple-delayed { animation: comic-ripple 2s 1s ease-out infinite; }
        .animate-comic-float { animation: comic-float 2s ease-in-out infinite; }

        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #2a2d43; border: 2px solid #0f0c0c; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #da2d46; border-right: 2px solid #0f0c0c; }
      `}</style>
    </div>
  );
}