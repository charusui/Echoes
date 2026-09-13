import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Music } from 'pixelarticons/react';
import { PixelButton } from './ui';
import { cn } from '../lib/cn';
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
    <div className="fixed inset-0 bg-plum-950 z-50 flex flex-col overflow-hidden">
      <div
        className="absolute inset-0 opacity-25 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: 'url(/assets/expedition/battle_bg.png)' }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-plum-950/80 to-transparent pointer-events-none" aria-hidden />

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between gap-3 px-4 pt-4">
        <PixelButton icon={<ArrowLeft />} sound="ui_back" onClick={onBack}>Back</PixelButton>
        <div className="px-frame px-frame-wood flex items-center gap-2 px-4 py-2">
          <Music className="size-5 text-gold-300" aria-hidden />
          <span className="font-semibold text-base text-parchment-100">Freestyle · {profile.instrument.name}</span>
        </div>
        <div className="px-frame px-frame-inset flex flex-col items-end px-3 py-1.5">
          <span className="text-xs text-parchment-500">Combo</span>
          <span className="font-label text-2xl leading-none text-gold-300">{gameState.combo}×</span>
        </div>
      </header>

      {/* Play Area */}
      <div className="flex-1 relative mt-4">
        {hitIndicator && (
          <div
            key={hitIndicator.id}
            className={cn(
              'absolute top-1/3 left-1/2 -translate-x-1/2 z-50 font-bold text-5xl md:text-7xl leading-none [text-shadow:0_5px_0_var(--color-ink)] px-rise-in',
              hitIndicator.type === 'Miss' ? 'text-hp-light' : hitIndicator.type === 'perfect' ? 'text-gold-300' : 'text-heal',
            )}
          >
            {hitIndicator.text}
          </div>
        )}

        {profile.instrument.category === 'string' && (
          <StringRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={handleLaneHit} activeLanes={activeLanes} />
        )}
        {profile.instrument.category === 'percussion' && (
          <PercussionRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={handleLaneHit} activeLanes={activeLanes} />
        )}
        {profile.instrument.category === 'wind' && (
          <WindRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={handleLaneHit} activeLanes={activeLanes} />
        )}
      </div>
    </div>
  );
}
