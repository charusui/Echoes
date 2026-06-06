import React, { useEffect, useCallback } from 'react';
import { audioEngine } from '../services/audioSynth';
import type { ActiveInstrumentProfile, Note, GameplayState } from '../types';
import { SCROLL_SPEED } from '../constants';

interface PercussionRhythmProps {
  profile: ActiveInstrumentProfile;
  notes: Note[];
  gameState: GameplayState;
  onLaneHit: (laneId: number) => void;
  activeLanes: Set<number>;
}

export function PercussionRhythm({ profile, notes, gameState, onLaneHit, activeLanes }: PercussionRhythmProps) {
  const mapping = profile.inputMapping;
  
  const handleHit = useCallback((laneId: number) => {
    const lane = mapping.lanes.find(l => l.id === laneId);
    if (!lane) return;
    
    // Play audio locally as a sandbox engine
    audioEngine.resumeSync();
    audioEngine.playNote(profile.acoustic, lane.frequency);
    
    // Pass to Rhythm Game listener
    onLaneHit(laneId);
  }, [mapping.lanes, profile.acoustic, onLaneHit]);

  // Handle keyboard locally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const lane = mapping.lanes.find(
        l => l.keyBinding === e.key.toUpperCase() || l.keyBinding === e.key.toLowerCase()
      );
      if (lane) {
        handleHit(lane.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapping.lanes, handleHit]);

  const renderLanes = () => {
    return mapping.lanes.map((lane) => {
      const isActive = activeLanes.has(lane.id);
      
      // Render a top-down view of a drum/gong
      const visualContent = (
        <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full border-2 transition-all flex items-center justify-center shadow-xl z-20
            ${isActive ? 'bg-pale-pink/40 border-[#66FCF1] scale-95 shadow-[0_0_30px_rgba(254,213,107,0.6)]' : 'bg-dark-slate/80 border-pale-pink/40'}
        `}>
            <div className="w-4 h-4 rounded-full bg-obsidian/50" />
        </div>
      );

      return (
        <div 
          key={lane.id}
          onPointerDown={() => handleHit(lane.id)}
          className={`
            relative h-full border-r border-slate-gray/30 last:border-r-0 flex-1 flex flex-col items-center justify-center
            ${isActive ? 'bg-pale-pink/5' : 'bg-transparent'}
            transition-colors duration-75 cursor-pointer
          `}
        >
          {/* Hit Line Placement */}
          <div className="absolute bottom-[15%] translate-y-1/2 w-full flex items-center justify-center pointer-events-none">
             {visualContent}
          </div>

          {/* Key Binding Hint */}
          <div className="absolute bottom-[5%] font-orbitron font-bold text-pale-pink/50 text-xl pointer-events-none">
            {lane.keyBinding}
          </div>
        </div>
      );
    });
  };

  const renderNotes = () => {
    return notes.map(note => {
      if (note.hit || (note.missed && gameState.songTimeSeconds - note.time > 1)) return null;

      const timeDiff = note.time - gameState.songTimeSeconds;
      const distance = timeDiff * SCROLL_SPEED;

      let noteColor = 'bg-light-gray shadow-[0_0_15px_rgba(224,229,237,0.8)]';
      if (note.missed) noteColor = 'bg-danger shadow-[0_0_10px_rgba(231,76,60,0.5)] opacity-50';

      const laneWidth = 100 / mapping.laneCount;
      const leftPos = `${(note.lane * laneWidth) + (laneWidth / 2)}%`;

      return (
        <div
          key={note.id}
          className={`absolute w-12 h-6 rounded-full -translate-x-1/2 -translate-y-1/2 z-10 ${noteColor}`}
          style={{
            left: leftPos,
            bottom: `calc(15% + ${distance}px)`,
          }}
        />
      );
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-obsidian/60 backdrop-blur-sm rounded-xl border-2 border-pale-pink/20">
      <div className="absolute inset-0 flex flex-row">
        {renderLanes()}
      </div>

      <div className="absolute left-0 right-0 h-1 bg-crimson shadow-[0_0_20px_rgba(218,45,70,0.5)] z-0" style={{ bottom: '15%' }} />

      <div className="absolute inset-0 pointer-events-none">
        {renderNotes()}
      </div>

      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-obsidian/80 z-50">
          <div className="text-center">
            <h2 className="font-orbitron font-black text-3xl text-pale-pink glow-pale-pink mb-4 uppercase">
              Ready
            </h2>
            <p className="font-space-mono text-light-gray text-sm">
              Press any mapped key or tap a drum to start
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
