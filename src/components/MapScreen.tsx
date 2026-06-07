import React from 'react';
import { Camera, Map, Flame, Award, Shield, MapPin, Lock } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';

interface MapScreenProps {
  onOpenScanner: () => void;
  onOpenLocationServices: () => void;
  onSelectInstrument: (instrumentName: string) => void;
  onOpenCollection: () => void;
}

const REGION_PINS = [
  { id: 'western', name: 'Western Visayas', instrument: 'Tultugan', top: '45%', left: '25%' },
  { id: 'central', name: 'Central Visayas', instrument: 'Cebuano Gitara', top: '65%', left: '55%' },
  { id: 'eastern', name: 'Eastern Visayas', instrument: 'Lantoy', top: '40%', left: '80%' },
];

export function MapScreen({ onOpenScanner, onOpenLocationServices, onSelectInstrument, onOpenCollection }: MapScreenProps) {
  const { progress } = useProgress();

  const xpForNextLevel = progress.level === 1 ? 100 : progress.level === 2 ? 250 : progress.level === 3 ? 500 : progress.level === 4 ? 900 : 900;
  const xpProgress = Math.min((progress.xp / xpForNextLevel) * 100, 100);

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative overflow-hidden pb-safe">
      
      {/* Background Map Image & Interactive Pins */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
          style={{ backgroundImage: 'url(/visayas_map.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-obsidian/80" />
        
        {/* Render Map Pins */}
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
          {REGION_PINS.map(pin => {
            let isUnlocked = progress.unlockedRegions.includes(pin.name);
            if (pin.name === 'Western Visayas') isUnlocked = progress.level >= 1;
            else if (pin.name === 'Central Visayas') isUnlocked = progress.level >= 2;
            else if (pin.name === 'Eastern Visayas') isUnlocked = progress.level >= 3;
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
                  <p className="font-space-mono text-[8px] text-pale-pink">
                    {pin.instrument}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Bar / Stats */}
      <div className="relative z-10 px-6 pt-12 pb-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-orbitron text-2xl font-black text-light-gray drop-shadow-md">
              VISAYAS <span className="text-crimson glow-crimson">ARC</span>
            </h1>
            <p className="font-space-mono text-xs text-pale-pink uppercase tracking-widest mt-1">
              {progress.level === 1 ? 'Apprentice' : progress.level === 2 ? 'Village Musician' : progress.level === 3 ? 'Cultural Keeper' : progress.level === 4 ? 'Regional Expert' : 'Master Instrumentalist'}
            </p>
          </div>
          
          {/* Streak Indicator */}
          <div className="flex flex-col items-end">
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
        <div className="w-full">
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

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 gap-4">
        
        {/* Regions Tracker */}
        <div className="glass-card p-5 rounded-2xl border border-pale-pink/20 shadow-2xl mb-4">
          <h2 className="font-orbitron font-bold text-light-gray text-sm mb-3">YOUR EXPEDITIONS</h2>
          
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
                {progress.level >= 2 ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
            <div className="w-full h-px bg-light-gray/10" />
            
            <div className="flex items-center justify-between">
              <span className={`font-space-mono text-xs ${progress.level >= 3 ? 'text-light-gray/90' : 'text-slate-gray/50'}`}>Eastern Visayas (Lvl 3)</span>
              <span className={`font-space-mono text-xs font-bold ${progress.level >= 3 ? 'text-crimson glow-crimson' : 'text-slate-gray/50'}`}>
                {progress.level >= 3 ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
            <div className="w-full h-px bg-light-gray/10" />
            
            <div className="flex items-center justify-between">
              <span className={`font-space-mono text-xs ${progress.level >= 4 ? 'text-light-gray/90' : 'text-slate-gray/50'}`}>Negros Region (Lvl 4)</span>
              <span className={`font-space-mono text-xs font-bold ${progress.level >= 4 ? 'text-crimson glow-crimson' : 'text-slate-gray/50'}`}>
                {progress.level >= 4 ? 'UNLOCKED' : 'LOCKED'}
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

        {/* Primary Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={onOpenLocationServices}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-dark-slate border border-light-gray/20 rounded-2xl active:scale-95 transition-transform text-center"
          >
            <Map size={20} className="text-pale-pink" />
            <span className="font-space-mono text-[10px] text-light-gray/80 uppercase">Radar</span>
          </button>
          
          <button 
            onClick={onOpenCollection}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-dark-slate border border-crimson/30 rounded-2xl active:scale-95 transition-transform text-center bg-gradient-to-b from-dark-slate to-crimson/5 shadow-[0_0_10px_rgba(218,45,70,0.1)] font-bold text-light-gray hover:border-crimson/50"
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

        <div className="relative w-full mt-2">
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
