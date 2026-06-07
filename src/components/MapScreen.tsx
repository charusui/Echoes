import React, { useState } from 'react';
import { Camera, Map, Flame, Award, Shield, MapPin, Lock } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';

//map
import map from '../assets/png/visayas_map.png'

interface MapScreenProps {
  onOpenScanner: () => void;
  onOpenLocationServices: () => void;
  onSelectInstrument: (instrumentName: string) => void;
  onOpenCollection: () => void;
}

const REGION_PINS = [
  { id: 'western', name: 'Western Visayas', instrument: 'Tultugan', levelRequired: 1, top: '45%', left: '25%' },
  { id: 'central', name: 'Central Visayas', instrument: 'Cebuano Gitara', levelRequired: 2, top: '65%', left: '55%' },
  { id: 'eastern', name: 'Eastern Visayas', instrument: 'Lantoy', levelRequired: 3, top: '40%', left: '80%' },
  { id: 'negros', name: 'Negros Region', instrument: 'Subing', levelRequired: 4, top: '60%', left: '42%' },
];

export function MapScreen({ onOpenScanner, onOpenLocationServices, onSelectInstrument, onOpenCollection }: MapScreenProps) {
  const { progress } = useProgress();
  const [isExpeditionsExpanded, setIsExpeditionsExpanded] = useState(false);

  // Measure window dimensions for off-screen checking
  const [dimensions, setDimensions] = React.useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1000, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
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
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mapScale, setMapScale] = useState(1.0);
  const [touchStartDist, setTouchStartDist] = useState(0);

  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handlePanMove = (clientX: number, clientY: number) => {
    if (!isPanning) return;
    const newX = clientX - panStart.x;
    const newY = clientY - panStart.y;
    
    // Bounds limits (based on scale and screen size)
    const limitX = dimensions.width * 0.5 * mapScale;
    const limitY = dimensions.height * 0.4 * mapScale;
    setPanOffset({
      x: Math.max(-limitX, Math.min(limitX, newX)),
      y: Math.max(-limitY, Math.min(limitY, newY))
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Pinch-to-zoom distance helper
  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setTouchStartDist(getTouchDist(e.touches));
    } else if (e.touches.length === 1) {
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist > 0) {
      const dist = getTouchDist(e.touches);
      const factor = dist / touchStartDist;
      // Adjust zoom multiplier safely between 0.7x and 2.0x
      setMapScale(prev => Math.max(0.7, Math.min(2.0, prev * (1 + (factor - 1) * 0.1))));
    } else if (e.touches.length === 1) {
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setTouchStartDist(0);
    }
    handlePanEnd();
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleAmount = -e.deltaY * 0.001;
    setMapScale(prev => Math.max(0.7, Math.min(2.0, prev + scaleAmount)));
  };

  // Center map smoothly on a specific pin (taking scale into account)
  const centerOnPin = (leftStr: string, topStr: string) => {
    const leftRatio = parseFloat(leftStr) / 100;
    const topRatio = parseFloat(topStr) / 100;
    
    const relativeX = dimensions.width * leftRatio - dimensions.width / 2;
    const relativeY = dimensions.height * topRatio - dimensions.height / 2;
    
    setPanOffset({
      x: -relativeX * mapScale,
      y: -relativeY * mapScale
    });
  };

  // Calculate off-screen indicators for each pin (accounting for zoom scale)
  const indicators = REGION_PINS.map(pin => {
    const isUnlocked = progress.unlockedRegions.includes(pin.name) || 
      (pin.name === 'Western Visayas' && progress.level >= 1) ||
      (pin.name === 'Central Visayas' && progress.level >= 2) ||
      (pin.name === 'Eastern Visayas' && progress.level >= 3);

    const pinLeftRatio = parseFloat(pin.left) / 100;
    const pinTopRatio = parseFloat(pin.top) / 100;
    
    const relativeX = dimensions.width * pinLeftRatio - dimensions.width / 2;
    const relativeY = dimensions.height * pinTopRatio - dimensions.height / 2;
    
    // Position on viewport screen including zoom and pan
    const x = dimensions.width / 2 + relativeX * mapScale + panOffset.x;
    const y = dimensions.height / 2 + relativeY * mapScale + panOffset.y;
    
    // Bounds check relative to screen size (adding margins for UI bars)
    const isOffLeft = x < 65;
    const isOffRight = x > dimensions.width - 65;
    const isOffTop = y < 110;
    const isOffBottom = y > dimensions.height - 180;
    
    return {
      id: pin.id,
      name: pin.name,
      left: pin.left,
      top: pin.top,
      isUnlocked,
      x,
      y,
      isOffLeft,
      isOffRight,
      isOffTop,
      isOffBottom,
      isOffScreen: isOffLeft || isOffRight || isOffTop || isOffBottom
    };
  });

  const xpForNextLevel = progress.level === 1 ? 100 : progress.level === 2 ? 250 : progress.level === 3 ? 500 : progress.level === 4 ? 900 : 900;
  const xpProgress = Math.min((progress.xp / xpForNextLevel) * 100, 100);

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative overflow-hidden pb-safe">
      
      {/* Background Map Image & Interactive Pins Container */}
      <div 
        className={`absolute inset-0 z-0 select-none cursor-grab active:cursor-grabbing ${isPanning ? '' : 'transition-transform duration-500 ease-out'}`}
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
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen pointer-events-none"
        >
          <img src = {map}/>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-obsidian/80 pointer-events-none" />
        
        {/* Render Map Pins */}
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
                className={`absolute pointer-events-auto flex flex-col items-center justify-center gap-1 -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 active:scale-95 ${
                  isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
                style={{ top: pin.top, left: pin.left }}
              >
                {/* Pin Icon */}
                <div className="relative">
                  {isUnlocked && (
                    <div className="absolute inset-0 bg-crimson rounded-full animate-ping opacity-60" />
                  )}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    isUnlocked ? 'bg-gradient-to-br from-crimson to-pale-pink border-2 border-obsidian' : 'bg-dark-slate border-2 border-slate-gray'
                  }`}>
                    {isUnlocked ? <MapPin size={20} className="text-obsidian" /> : <Lock size={16} className="text-slate-gray" />}
                  </div>
                </div>
                
                {/* Pin Label */}
                <div className="bg-obsidian/80 backdrop-blur-sm border border-light-gray/10 px-2 py-1 rounded-md text-center shadow-lg">
                  <p className={`font-orbitron font-bold text-[9px] ${isUnlocked ? 'text-light-gray' : 'text-slate-gray'}`}>
                    {pin.name.toUpperCase()}
                  </p>
                  {isUnlocked ? (
                    <p className="font-space-mono text-[8px] text-pale-pink">
                      {pin.instrument}
                    </p>
                  ) : (
                    <p className="font-space-mono text-[8px] text-crimson font-black uppercase">
                      REACH LVL {pin.levelRequired}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Offscreen Indicators Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {indicators.map(ind => {
          if (!ind.isOffScreen) return null;
          
          let style: React.CSSProperties = {};
          let label = '';
          
          if (ind.isOffLeft) {
            style = {
              left: '16px',
              top: `${Math.max(120, Math.min(dimensions.height - 240, ind.y))}px`,
              transform: 'translateY(-50%)'
            };
            label = `<- PAN ${ind.name.split(' ')[0]}`;
          } else if (ind.isOffRight) {
            style = {
              right: '16px',
              top: `${Math.max(120, Math.min(dimensions.height - 240, ind.y))}px`,
              transform: 'translateY(-50%)'
            };
            label = `${ind.name.split(' ')[0]} PAN ->`;
          } else if (ind.isOffTop) {
            style = {
              top: '110px',
              left: `${Math.max(85, Math.min(dimensions.width - 120, ind.x))}px`,
              transform: 'translateX(-50%)'
            };
            label = `^ PAN ${ind.name.split(' ')[0]}`;
          } else if (ind.isOffBottom) {
            style = {
              bottom: '180px',
              left: `${Math.max(85, Math.min(dimensions.width - 120, ind.x))}px`,
              transform: 'translateX(-50%)'
            };
            label = `v PAN ${ind.name.split(' ')[0]}`;
          }
          
          return (
            <button
              key={ind.id}
              onClick={() => centerOnPin(ind.left, ind.top)}
              className="absolute pointer-events-auto bg-obsidian/90 backdrop-blur-md border border-crimson/40 text-crimson text-[9px] font-space-mono px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(218, 45, 70, 0.2)] animate-pulse transition-all hover:scale-105 active:scale-95 uppercase tracking-wider"
              style={style}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Top Bar / Stats (Clicks pass through empty areas) */}
      <div className="relative z-10 px-6 pt-12 pb-4 flex flex-col gap-4 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="font-orbitron text-2xl font-black text-light-gray drop-shadow-md">
              VISAYAS <span className="text-crimson glow-crimson">ARC</span>
            </h1>
            <p className="font-space-mono text-xs text-pale-pink uppercase tracking-widest mt-1">
              {progress.level === 1 ? 'Apprentice' : progress.level === 2 ? 'Village Musician' : progress.level === 3 ? 'Cultural Keeper' : progress.level === 4 ? 'Regional Expert' : 'Master Instrumentalist'}
            </p>
          </div>
          
          {/* Streak Indicator */}
          <div className="flex flex-col items-end pointer-events-auto">
            <div className={`flex items-center gap-1 font-orbitron font-bold text-xl ${progress.currentStreak > 0 ? 'text-crimson glow-crimson' : 'text-slate-gray'}`}>
              <Flame size={20} className={progress.currentStreak > 0 ? 'animate-pulse' : ''} />
              {progress.currentStreak}
            </div>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: progress.streakShields }).map((_, i) => (
                <Shield key={i} size={12} className="text-pale-pink" />
              ))}
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="w-full pointer-events-auto">
          <div className="flex justify-between text-[10px] font-space-mono text-light-gray/60 mb-1">
            <span>LVL {progress.level}</span>
            <span>{progress.xp} / {xpForNextLevel} XP</span>
          </div>
          <div className="h-2 w-full bg-dark-slate rounded-full overflow-hidden border border-light-gray/10">
            <div 
              className="h-full bg-crimson transition-all duration-1000 ease-out"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area (Layout wrapper passes events, children capture them) */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 gap-4 pointer-events-none">
        
        {/* Regions Tracker */}
        <div className="glass-card rounded-2xl border border-pale-pink/20 shadow-2xl mb-4 transition-all duration-300 pointer-events-auto">
          <button 
            onClick={() => setIsExpeditionsExpanded(!isExpeditionsExpanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 rounded-2xl transition-colors"
          >
            <h2 className="font-orbitron font-bold text-light-gray text-xs tracking-wider">YOUR EXPEDITIONS</h2>
            <span className="font-space-mono text-[9px] text-pale-pink uppercase">
              {isExpeditionsExpanded ? 'Collapse [-]' : 'Expand [+]'}
            </span>
          </button>
          
          {isExpeditionsExpanded && (
            <div className="px-5 pb-5 pt-1 border-t border-light-gray/5 space-y-3">
              <p className="font-space-mono text-[9px] text-pale-pink/70 mb-4 bg-crimson/5 border border-crimson/10 px-3 py-2 rounded-xl">
                [TIP] Scan new instruments or play rhythm games to earn XP. Level up to unlock new regions!
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`font-space-mono text-xs ${progress.level >= 1 ? 'text-light-gray/90' : 'text-slate-gray/50'}`}>Western Visayas (Lvl 1)</span>
                  <span className={`font-space-mono text-xs font-bold ${progress.level >= 1 ? 'text-crimson glow-crimson' : 'text-slate-gray/50'}`}>
                    {progress.level >= 1 ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>
                <div className="w-full h-px bg-light-gray/10" />
                
                <div className="flex items-center justify-between">
                  <span className={`font-space-mono text-xs ${progress.level >= 2 ? 'text-light-gray/90' : 'text-slate-gray/50'}`}>Central Visayas (Lvl 2)</span>
                  <span className={`font-space-mono text-xs font-bold ${progress.level >= 2 ? 'text-crimson glow-crimson' : 'text-slate-gray/50'}`}>
                    {progress.level >= 2 ? 'UNLOCKED' : 'LOCKED (100 XP)'}
                  </span>
                </div>
                <div className="w-full h-px bg-light-gray/10" />
                
                <div className="flex items-center justify-between">
                  <span className={`font-space-mono text-xs ${progress.level >= 3 ? 'text-light-gray/90' : 'text-slate-gray/50'}`}>Eastern Visayas (Lvl 3)</span>
                  <span className={`font-space-mono text-xs font-bold ${progress.level >= 3 ? 'text-crimson glow-crimson' : 'text-slate-gray/50'}`}>
                    {progress.level >= 3 ? 'UNLOCKED' : 'LOCKED (250 XP)'}
                  </span>
                </div>
                <div className="w-full h-px bg-light-gray/10" />
                
                <div className="flex items-center justify-between">
                  <span className={`font-space-mono text-xs ${progress.level >= 4 ? 'text-light-gray/90' : 'text-slate-gray/50'}`}>Negros Region (Lvl 4)</span>
                  <span className={`font-space-mono text-xs font-bold ${progress.level >= 4 ? 'text-crimson glow-crimson' : 'text-slate-gray/50'}`}>
                    {progress.level >= 4 ? 'UNLOCKED' : 'LOCKED (500 XP)'}
                  </span>
                </div>
              </div>
              
              {progress.unlockedInstruments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-light-gray/10">
                  <span className="block font-orbitron text-[9px] text-slate-gray uppercase mb-2">Unlocked Instruments ({progress.unlockedInstruments.length})</span>
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {progress.unlockedInstruments.map(inst => (
                      <div key={inst} className="w-12 h-12 shrink-0 bg-dark-slate rounded-lg border border-pale-pink/30 flex flex-col items-center justify-center font-space-mono text-[8px] text-pale-pink text-center p-1 relative overflow-hidden">
                        <span className="text-[7px] line-clamp-2">{inst}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-3 gap-2 pointer-events-auto">
          <button 
            onClick={onOpenLocationServices}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-dark-slate border border-light-gray/20 rounded-2xl active:scale-95 transition-transform text-center"
          >
            <Map size={20} className="text-pale-pink" />
            <span className="font-space-mono text-[10px] text-light-gray/80 uppercase">Radar</span>
          </button>
          
          <button 
            onClick={onOpenCollection}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-dark-slate border border-crimson/30 rounded-2xl active:scale-95 transition-transform text-center bg-gradient-to-b from-dark-slate to-crimson/5 shadow-[0_0_10px_rgba(218, 45, 70, 0.1)] font-bold text-light-gray hover:border-crimson/50"
          >
            <Award size={20} className="text-crimson animate-pulse" />
            <span className="font-space-mono text-[10px] text-light-gray uppercase">Archive</span>
          </button>
          
          <button 
            className="flex flex-col items-center justify-center gap-2 p-3 bg-dark-slate border border-light-gray/20 rounded-2xl active:scale-95 transition-transform opacity-50 text-center"
          >
            <Flame size={20} className="text-light-gray/50" />
            <span className="font-space-mono text-[10px] text-light-gray/50 uppercase">Ranks</span>
          </button>
        </div>

        <div className="relative w-full mt-2 pointer-events-auto">
          {/* Tutorial Pulse for brand new players */}
          {progress.xp === 0 && progress.unlockedInstruments.length === 0 && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-50 pointer-events-none">
              <div className="bg-pale-pink text-obsidian text-[10px] font-bold font-space-mono px-3 py-1.5 rounded-full whitespace-nowrap shadow-[0_0_15px_rgba(240,221,224,0.6)]">
                START HERE!
              </div>
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-pale-pink mt-[-1px]" />
            </div>
          )}
          
          <button 
            onClick={onOpenScanner}
            className="w-full py-5 rounded-2xl font-orbitron text-sm font-bold tracking-widest uppercase
              bg-gradient-to-r from-crimson to-pale-pink text-obsidian
              hover:shadow-lg hover:shadow-crimson/40 active:scale-[0.98]
              transition-all duration-200 flex items-center justify-center gap-3 relative z-10"
          >
            <Camera size={20} /> SCAN NEW INSTRUMENT
          </button>
        </div>

      </div>
    </div>
  );
}
