import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Music } from 'lucide-react';
import type { ActiveInstrumentProfile, HitJudgement } from '../types';
import { useRhythmGame } from '../hooks/useRhythmGame';
import { StringRhythm } from './StringRhythm';
import { PercussionRhythm } from './PercussionRhythm';
import { WindRhythm } from './WindRhythm';

interface FreestylePlayScreenProps {
  profile: ActiveInstrumentProfile;
  onBack: () => void;
}

export function FreestylePlayScreen({ profile, onBack }: FreestylePlayScreenProps) {
  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());
  const [hitIndicator, setHitIndicator] = useState<{ type: HitJudgement | 'Miss', text: string, id: number } | null>(null);

  const totalLanesOverride = profile.instrument.category === 'string' ? profile.acoustic.scaleNotes.length : undefined;

  const handlePassiveMiss = useCallback(() => {
    setHitIndicator({ type: 'Miss', text: 'MISS', id: Math.random() });
    setTimeout(() => setHitIndicator(null), 400);
  }, []);

  const handleFinishRhythm = useCallback(() => {
    // When done, just loop it or let them exit. For now we just stay on screen.
  }, []);

  const { notes, gameState, startGame, hitLane } = useRhythmGame(
    profile.inputMapping,
    handleFinishRhythm,
    'musician', // default difficulty for freestyle
    'v2',
    60, // 60 seconds
    totalLanesOverride,
    handlePassiveMiss
  );

  useEffect(() => {
    startGame();
  }, [startGame]);

  const handleLaneHit = useCallback((laneId: number) => {
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
    }, 150);
  }, [hitLane, profile, gameState.isPlaying]);

  return (
    <div className="fixed inset-0 bg-[#0f0c0c] z-50 flex flex-col overflow-hidden">
      {/* Background styling for some flavor */}
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: 'url(/assets/expedition/battle_bg.png)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0c0c]/80 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="bg-[#da2d46] text-white font-black px-6 py-3 font-orbitron -skew-x-6 border-4 border-white shadow-[4px_4px_0px_0px_white] hover:bg-[#ff3b56] hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5 stroke-[3px]" />
          BACK
        </button>
        
        <div className="flex items-center gap-3 bg-[#facc15] text-[#0f0c0c] font-orbitron font-black px-6 py-3 -skew-x-6 border-4 border-white shadow-[4px_4px_0px_0px_white]">
          <Music className="w-5 h-5" />
          <span className="uppercase">Freestyle Mode: {profile.instrument.name}</span>
        </div>
      </div>

      {/* Play Area */}
      <div className="flex-1 relative mt-24">
        {hitIndicator && (
          <div 
            key={hitIndicator.id}
            className={`absolute top-1/3 left-1/2 -translate-x-1/2 z-50 font-orbitron font-black text-4xl md:text-6xl -skew-x-6 animate-[bounce_0.2s_ease-out]
              ${hitIndicator.type === 'Miss' 
                ? 'text-[#da2d46] drop-shadow-[4px_4px_0px_#0f0c0c]' 
                : 'text-[#facc15] drop-shadow-[4px_4px_0px_#0f0c0c]'
              }
            `}
          >
            {hitIndicator.text}
          </div>
        )}

        {/* Score/Combo HUD */}
        <div className="absolute top-4 left-4 z-40 bg-[#0f0c0c] border-[3px] border-[#e0e5ed] px-4 py-2 -skew-x-6">
          <div className="text-[#888ea1] font-orbitron text-xs font-bold skew-x-6">COMBO</div>
          <div className="text-white font-orbitron text-2xl font-black skew-x-6">{gameState.combo}x</div>
        </div>

        {profile.instrument.category === 'string' && (
          <StringRhythm 
            profile={profile} 
            notes={notes} 
            gameState={gameState} 
            onLaneHit={handleLaneHit} 
            activeLanes={activeLanes} 
          />
        )}
        {profile.instrument.category === 'percussion' && (
          <PercussionRhythm 
            profile={profile} 
            notes={notes} 
            gameState={gameState} 
            onLaneHit={handleLaneHit} 
            activeLanes={activeLanes} 
          />
        )}
        {profile.instrument.category === 'wind' && (
          <WindRhythm 
            profile={profile} 
            notes={notes} 
            gameState={gameState} 
            onLaneHit={handleLaneHit} 
            activeLanes={activeLanes} 
          />
        )}
      </div>
    </div>
  );
}
