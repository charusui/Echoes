import { useEffect, useState, useCallback } from 'react';
import { X, Play } from 'lucide-react';
import type { ActiveInstrumentProfile, GameplayState } from '../types';
import { audioEngine } from '../services/audioSynth';
import { useRhythmGame } from '../hooks/useRhythmGame';
import { PercussionRhythm } from './PercussionRhythm';
import { StringRhythm } from './StringRhythm';
import { WindRhythm } from './WindRhythm';
import { TnalakWeave } from './TnalakWeave';

interface GameBoardProps {
  profile: ActiveInstrumentProfile;
  onQuit: () => void;
  onFinish?: (state?: GameplayState) => void;
}

export function GameBoard({ profile, onQuit, onFinish }: GameBoardProps) {
  // Ensure AudioContext is running
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioEngine.init();
      } catch (err) {
        console.error("Failed to init audio on mount", err);
      }
    };
    initAudio();
  }, []);

  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());
  const [hitIndicator, setHitIndicator] = useState<{ type: 'perfect' | 'good' | 'miss', text: string, id: number } | null>(null);

  const handleFinishGame = useCallback((state: GameplayState) => {
    if (onFinish) onFinish(state);
  }, [onFinish]);

  const totalLanesOverride = profile.instrument.category === 'string' ? profile.acoustic.scaleNotes.length : undefined;
  const { notes, gameState, startGame, hitLane } = useRhythmGame(profile.inputMapping, handleFinishGame, totalLanesOverride);

  const triggerLane = useCallback((laneId: number) => {
    const isString = profile.instrument.category === 'string';
    const isValidStringLane = isString && laneId >= 0 && laneId < profile.acoustic.scaleNotes.length;
    const lane = profile.inputMapping.lanes.find(l => l.id === laneId);
    
    if (!lane && !isValidStringLane) return;
    
    // Register visual rhythm hit
    const hitResult = hitLane(laneId);
    if (hitResult) {
      setHitIndicator({
        type: hitResult.judgement as any,
        text: hitResult.judgement.toUpperCase(),
        id: Math.random() // Unique ID prevents batching overwrites
      });
      // Clear after animation
      setTimeout(() => setHitIndicator(null), 600);
    }

    // Visual feedback
    setActiveLanes(prev => {
      const next = new Set(prev);
      next.add(laneId);
      return next;
    });

    // Auto-release visual feedback after 100ms
    setTimeout(() => {
      setActiveLanes(prev => {
        const next = new Set(prev);
        next.delete(laneId);
        return next;
      });
    }, 100);
  }, [profile.inputMapping.lanes, hitLane]);

  // Keyboard bindings are now handled entirely by the individual sandbox engines (WindRhythm, StringRhythm, PercussionRhythm)
  // so they can freely play audio in sandbox mode.

  return (
    <div className="fixed inset-0 bg-obsidian flex flex-col select-none overflow-hidden">
      {/* HUD — Top Navigation */}
      <div className="flex items-center justify-between px-6 pt-safe pt-6 pb-4 bg-obsidian/90 backdrop-blur-sm z-10 border-b border-dark-slate">
        <div className="text-left flex flex-col justify-center flex-1 min-w-0 mr-4">
          <div className="text-light-gray/90 text-sm md:text-base font-space-mono font-bold uppercase tracking-[0.2em] glow-light-gray truncate">
            {profile.instrument.name}
          </div>
          <div className="text-light-gray/50 text-[10px] font-space-mono mt-1 truncate">
            {profile.instrument.category.toUpperCase()} INSTRUMENT
          </div>
        </div>
        <div className="flex gap-4 items-center flex-1 justify-center">
          {/* Stats Display */}
          <div className="flex flex-col items-center">
            <span className="text-pale-pink/50 text-[10px] font-space-mono">SCORE</span>
            <span className="text-crimson font-orbitron font-bold text-lg leading-none">{Math.floor(gameState.score)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-pale-pink/50 text-[10px] font-space-mono">COMBO</span>
            <span className="text-light-gray font-orbitron font-bold text-lg leading-none">{gameState.combo}x</span>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-1 justify-end">
          {!gameState.isPlaying && !gameState.isFinished && (
            <button
              onClick={startGame}
              className="px-4 h-10 rounded-xl bg-pale-pink text-obsidian font-bold text-sm hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
            >
              <Play size={16} fill="currentColor" /> START
            </button>
          )}
          {onFinish && !gameState.isFinished && (
            <button
              onClick={() => onFinish(gameState)}
              className="px-4 h-10 rounded-xl bg-pale-pink/10 border border-pale-pink/30 text-pale-pink font-space-mono text-sm active:scale-95 transition-transform hover:bg-pale-pink/20"
            >
              SKIP
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      {gameState.isFinished && (
        <div className="p-4 bg-obsidian border-t border-light-gray/10 flex flex-col gap-3 z-10 relative">
          {onRestart && (
            <button
              onClick={onRestart}
              className="w-full py-4 rounded-xl font-space-mono font-bold tracking-widest text-obsidian bg-gradient-to-r from-light-gray to-light-gray/80 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              PLAY AGAIN
            </button>
          )}
          <button
            onClick={onQuit}
            className="w-full py-4 rounded-xl font-space-mono font-bold tracking-widest text-light-gray bg-obsidian border-2 border-light-gray/20 hover:border-light-gray/50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            RETURN TO MAP
          </button>
        </div>
      )}

      {/* Disclaimers if any */}
      {profile.isFallback && (
        <div className="w-full px-8 py-4">
          <div className="bg-danger/20 border border-danger/40 text-danger text-sm font-space-mono p-4 rounded-lg w-full max-w-2xl mx-auto shadow-lg">
            {profile.fallbackReason === 'not-instrument' ? (
              <><span className="font-bold">⚠️ Notice:</span> The image scanned is not an instrument, so here is a {profile.instrument.name} instead!</>
            ) : (
              <><span className="font-bold">⚠️ Notice:</span> We couldn't find enough acoustic data for this specific instrument, or the API limit was reached. We've loaded the closest cultural equivalent so you can still play!</>
            )}
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 relative z-0 p-4 pb-8 md:p-8">
        <div className="w-full h-full max-w-5xl mx-auto relative shadow-2xl rounded-xl overflow-hidden">
          {hitIndicator && (
            <div 
              key={hitIndicator.id}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-orbitron font-black z-50 pointer-events-none transition-all
                ${hitIndicator.type === 'perfect' ? 'text-[#FED56B] text-4xl md:text-6xl drop-shadow-[0_0_25px_rgba(254,213,107,1)] scale-110' : 
                  hitIndicator.type === 'good' ? 'text-[#64FFDA] text-2xl md:text-4xl drop-shadow-[0_0_15px_rgba(100,255,218,0.8)] scale-100' : 
                  'text-[#E74C3C] text-2xl md:text-4xl drop-shadow-[0_0_15px_rgba(231,76,60,0.8)] scale-90'}`}
              style={{ animation: 'pulse 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
            >
              {hitIndicator.text}
            </div>
          )}
          
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
      
      {/* Procedural Weaving Background */}
      <TnalakWeave />

      
    </div>
  );
}
