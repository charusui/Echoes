import React from 'react';
import { Camera, Map, Flame, Award, Shield } from 'lucide-react';
import { useProgress } from '../context/ProgressProvider';

interface MapScreenProps {
  onOpenScanner: () => void;
  onOpenLocationServices: () => void;
}

export function MapScreen({ onOpenScanner, onOpenLocationServices }: MapScreenProps) {
  const { progress } = useProgress();

  const xpForNextLevel = progress.level === 1 ? 100 : progress.level === 2 ? 250 : progress.level === 3 ? 500 : progress.level === 4 ? 900 : 900;
  const xpProgress = Math.min((progress.xp / xpForNextLevel) * 100, 100);

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative overflow-hidden pb-safe">
      
      {/* Background Map Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 mix-blend-screen"
        style={{ backgroundImage: 'url(/visayas_map.png)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-obsidian/80 z-0" />

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
        
        {/* Regions Tracker (Mocked UI) */}
        <div className="glass-card p-5 rounded-2xl border border-pale-pink/20 shadow-2xl mb-4">
          <h2 className="font-orbitron font-bold text-light-gray text-sm mb-3">YOUR EXPEDITIONS</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-space-mono text-xs text-light-gray/80">Western Visayas</span>
              <span className="font-space-mono text-xs text-crimson font-bold">
                {progress.unlockedRegions.includes('Western Visayas') ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
            <div className="w-full h-px bg-light-gray/10" />
            <div className="flex items-center justify-between">
              <span className="font-space-mono text-xs text-light-gray/50">Central Visayas</span>
              <span className="font-space-mono text-xs text-light-gray/30">LOCKED</span>
            </div>
          </div>
          
          {progress.unlockedInstruments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-light-gray/10 flex gap-2 overflow-x-auto">
              {progress.unlockedInstruments.map(inst => (
                <div key={inst} className="w-12 h-12 shrink-0 bg-dark-slate rounded-lg border border-pale-pink/30 flex items-center justify-center font-space-mono text-[8px] text-pale-pink text-center break-words p-1">
                  {inst}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onOpenLocationServices}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-dark-slate border border-light-gray/20 rounded-2xl active:scale-95 transition-transform"
          >
            <Map size={24} className="text-pale-pink" />
            <span className="font-space-mono text-xs text-light-gray/80">INSTRUMENT RADAR</span>
          </button>
          
          <button 
            className="flex flex-col items-center justify-center gap-2 p-4 bg-dark-slate border border-light-gray/20 rounded-2xl active:scale-95 transition-transform opacity-50"
          >
            <Award size={24} className="text-light-gray/50" />
            <span className="font-space-mono text-xs text-light-gray/50">LEADERBOARD</span>
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
