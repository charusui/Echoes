import { useState, useEffect, useCallback, useMemo } from 'react';
import type { HeroProfile, HarmonydexEntry } from '../../types/expedition';
import type { GameplayState, HitJudgement } from '../../types';
import { getExpeditionProfile } from '../../constants/expeditionProfiles';
import { useRhythmGame } from '../../hooks/useRhythmGame';
import { StringRhythm } from '../StringRhythm';
import { PercussionRhythm } from '../PercussionRhythm';
import { WindRhythm } from '../WindRhythm';
import { SpellCastingOverlay } from './SpellCastingOverlay';
import { Zap } from 'lucide-react';

interface UltimateSequenceOverlayProps {
  hero: HeroProfile;
  instrument: HarmonydexEntry;
  onComplete: (success: boolean, completedPoints: number) => void;
}

export function UltimateSequenceOverlay({ hero, instrument, onComplete }: UltimateSequenceOverlayProps) {
  const [phase, setPhase] = useState<'rhythm' | 'seal'>('rhythm');
  const [rhythmStats, setRhythmStats] = useState<GameplayState | null>(null);
  
  // Local hit indicator state (similar to GameBoard)
  const [hitIndicator, setHitIndicator] = useState<{ type: HitJudgement | 'Miss', text: string, id: number } | null>(null);
  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());

  // 1) Dynamically build the perfect profile from our handcrafted manual dictionary
  const profile = useMemo(() => {
    return getExpeditionProfile(instrument.id, instrument.type as any);
  }, [instrument]);

  const totalLanesOverride = profile.instrument.category === 'string' ? profile.acoustic.scaleNotes.length : undefined;

  // 2) Initialize the rhythm game hook for exactly 8 seconds (8000ms)
  const handlePassiveMiss = useCallback(() => {
    setHitIndicator({ type: 'Miss', text: 'MISS', id: Math.random() });
    setTimeout(() => setHitIndicator(null), 400);
  }, []);

  const handleFinishRhythm = useCallback((finalState: GameplayState) => {
    setRhythmStats(finalState);
    setPhase('seal'); // Automatically transition to sealing phase
  }, []);

  const difficultyLevel = 'musician';

  const { notes, gameState, startGame, hitLane } = useRhythmGame(
    profile.inputMapping,
    handleFinishRhythm,
    difficultyLevel,
    'v2',
    8, // 8 seconds
    totalLanesOverride,
    handlePassiveMiss
  );

  // Auto-start rhythm phase on mount
  useEffect(() => {
    if (phase === 'rhythm') {
      startGame();
    }
  }, [startGame, phase]);

  const triggerLane = useCallback((laneId: number) => {
    const isString = profile.instrument.category === 'string';
    const isValidStringLane = isString && laneId >= 0 && laneId < profile.acoustic.scaleNotes.length;
    const lane = profile.inputMapping.lanes.find((l: any) => l.id === laneId);
    
    if (!lane && !isValidStringLane) return;
    
    const hitResult = hitLane(laneId);
    
    if (hitResult) {
      const textMap = { perfect: 'SICK!', good: 'GOOD!' };
      const jType = hitResult.judgement as 'perfect' | 'good';
      
      setHitIndicator({
        type: jType,
        text: textMap[jType],
        id: Math.random() 
      });
      setTimeout(() => setHitIndicator(null), 500);
    } else if (gameState.isPlaying) {
      setHitIndicator({
        type: 'Miss',
        text: 'MISS!',
        id: Math.random()
      });
      setTimeout(() => setHitIndicator(null), 400);
    }

    setActiveLanes(prev => {
      const next = new Set(prev);
      next.add(laneId);
      return next;
    });

    setTimeout(() => {
      setActiveLanes(prev => {
        const next = new Set(prev);
        next.delete(laneId);
        return next;
      });
    }, 100);
  }, [profile.inputMapping.lanes, hitLane, gameState.isPlaying, profile.instrument.category, profile.acoustic.scaleNotes.length]);


  // Global keyboard listeners for lane triggering during rhythm phase
  useEffect(() => {
    if (phase !== 'rhythm' || !gameState.isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if they are pressing space or arrows to scroll
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) return;
      
      const lane = profile.inputMapping.lanes.find((l: any) => l.keyBinding.toLowerCase() === e.key.toLowerCase());
      if (lane !== undefined) {
        triggerLane(lane.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, gameState.isPlaying, profile.inputMapping.lanes, triggerLane]);


  // 3) Handle final seal completion
  const handleSealComplete = (success: boolean, completedPoints: number) => {
    // Add bonus damage based on rhythm performance
    let comboBonus = 0;
    if (rhythmStats) {
      comboBonus = Math.floor(rhythmStats.score / 50); // Scale down for combat points
      if (rhythmStats.combo >= 15) comboBonus += 5;
    }
    
    onComplete(success, completedPoints + comboBonus);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0f0c0c]/90 flex flex-col animate-in fade-in duration-300">
      
      {phase === 'rhythm' && (
        <div className="relative w-full h-full flex flex-col pt-safe">
          
          {/* Header */}
          <div className="px-6 py-4 flex justify-between items-center bg-[#da2d46] border-b-[6px] border-[#0f0c0c]">
            <div>
              <h2 className="font-orbitron font-black text-2xl text-[#f0dde0] uppercase tracking-wider shadow-black drop-shadow-md">
                Overdrive Ultimate
              </h2>
              <p className="font-outfit font-bold text-[#0f0c0c] text-sm opacity-90">
                Phase 1: Channeling {profile.instrument.name}
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="font-outfit font-bold text-sm text-[#0f0c0c]">COMBO</p>
                <p className={`font-orbitron font-black text-3xl transition-colors duration-200 ${gameState.combo >= 10 ? 'text-[#ffb800]' : 'text-[#f0dde0]'}`}>
                  {gameState.combo}x
                </p>
              </div>
              <div className="h-12 w-[6px] bg-[#0f0c0c]" />
              <div className="text-right">
                <p className="font-outfit font-bold text-sm text-[#0f0c0c]">TIME</p>
                <p className="font-orbitron font-black text-2xl text-[#f0dde0]">
                  {Math.max(0, 8 - gameState.songTimeSeconds).toFixed(1)}s
                </p>
              </div>
            </div>
          </div>

          {/* Rhythm Gameplay Area */}
          <div className="relative flex-1 bg-[#2a2d43] border-x-[6px] border-[#0f0c0c] mx-auto w-full max-w-7xl shadow-2xl">
            {/* Visual Hit Indicator */}
            {hitIndicator && (
              <div 
                key={hitIndicator.id}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none"
              >
                {hitIndicator.type === 'perfect' && (
                  <span className="font-orbitron font-black italic tracking-widest block text-5xl md:text-7xl text-[#ffb800] drop-shadow-[4px_4px_0_#0f0c0c] animate-comic-pop flex items-center gap-2">
                    <Zap className="fill-current w-12 h-12" />
                    {hitIndicator.text}
                  </span>
                )}
                {hitIndicator.type === 'good' && (
                  <span className="font-orbitron font-black italic tracking-widest block text-4xl md:text-6xl text-[#4a90e2] drop-shadow-[3px_3px_0_#0f0c0c] animate-comic-pop-slight">
                    {hitIndicator.text}
                  </span>
                )}
                {hitIndicator.type === 'Miss' && (
                  <span className="font-orbitron font-black italic tracking-widest block text-4xl md:text-6xl text-[#6b7280] drop-shadow-[3px_3px_0_#0f0c0c] animate-comic-glitch line-through decoration-[#da2d46] decoration-[8px]">
                    {hitIndicator.text}
                  </span>
                )}
              </div>
            )}

            {/* Instrument Lane Components */}
            <div className="w-full h-full relative z-10">
              {profile.instrument.category === 'percussion' && (
                <PercussionRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={triggerLane} activeLanes={activeLanes} />
              )}
              {profile.instrument.category === 'string' && (
                <StringRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={triggerLane} activeLanes={activeLanes} />
              )}
              {profile.instrument.category === 'wind' && (
                <WindRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={triggerLane} activeLanes={activeLanes} />
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'seal' && (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center">
          <SpellCastingOverlay 
            hero={hero}
            instrument={instrument}
            onComplete={handleSealComplete}
          />
        </div>
      )}

    </div>
  );
}
