import { useEffect, useCallback } from 'react';
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
      
      // Render a heavy comic-style drum hit zone
      const visualContent = (
        <div className={`w-16 h-16 md:w-24 md:h-24 border-[4px] md:border-[6px] border-[#0f0c0c] transition-all duration-75 flex items-center justify-center z-20 rounded-full
            ${isActive 
              ? 'bg-[#da2d46] scale-95 shadow-[0px_0px_0px_0px_#0f0c0c] translate-y-1.5 translate-x-1.5' 
              : 'bg-[#e0e5ed] shadow-[6px_6px_0px_0px_#0f0c0c]'
            }
        `}>
          {/* Inner ring to make it look like a drum head or target */}
          <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-[3px] border-[#0f0c0c] transition-colors ${isActive ? 'bg-[#f0dde0]' : 'bg-[#888ea1]'}`} />
          
          {/* Comic impact speedlines inside the drum */}
          {isActive && (
            <div 
              className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #0f0c0c 10px, #0f0c0c 12px)' }}
            />
          )}
        </div>
      );

      return (
        <div 
          key={lane.id}
          onPointerDown={(e) => { e.preventDefault(); handleHit(lane.id); }}
          className={`
            relative h-full border-r-[3px] border-[#0f0c0c]/40 last:border-r-0 flex-1 flex flex-col items-center justify-center
            ${isActive ? 'bg-[#da2d46]/10' : 'bg-transparent'}
            transition-colors duration-75 cursor-pointer touch-none
          `}
        >
          {/* Hit Zone Placement */}
          <div className="absolute bottom-[15%] translate-y-1/2 w-full flex items-center justify-center pointer-events-none">
             {visualContent}
          </div>

          {/* Key Binding Hint - Styled as a skewed comic tag */}
          <div className="absolute bottom-[5%] pointer-events-none bg-[#0f0c0c] border-[3px] border-[#da2d46] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#da2d46]">
            <span className="font-orbitron font-black text-[#e0e5ed] text-sm md:text-lg skew-x-6 block">
              {lane.keyBinding}
            </span>
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

      const isMissed = note.missed;
      
      const laneWidth = 100 / mapping.laneCount;
      
      // Map the note's ID to its visual index (0, 1, 2...)
      const visualLaneIdx = mapping.lanes.findIndex(l => l.id === note.lane);
      const safeLaneIdx = visualLaneIdx !== -1 ? visualLaneIdx : Number(note.lane) || 0;

      const leftPos = `${(safeLaneIdx * laneWidth) + (laneWidth / 2)}%`;

      return (
        <div
          key={note.id}
          className={`absolute w-12 h-12 md:w-16 md:h-16 rounded-full border-[4px] border-[#0f0c0c] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center ${
            isMissed 
              ? 'bg-[#888ea1] opacity-50 grayscale' 
              : 'bg-[#da2d46] shadow-[4px_4px_0px_0px_#0f0c0c]'
          }`}
          style={{
            left: leftPos,
            bottom: `calc(15% + ${distance}px)`,
          }}
        >
          {/* Inner marking for the note to make it look like a physical puck */}
          <div className={`w-4 h-4 md:w-6 md:h-6 rounded-full border-[3px] border-[#0f0c0c] ${isMissed ? 'bg-[#2a2d43]' : 'bg-[#f0dde0]'}`} />
        </div>
      );
    });
  };

  return (
    // Replaced transparent blur with solid Dark Slate and heavy border
    <div className="w-full h-full relative overflow-hidden bg-[#2a2d43] border-[6px] border-[#0f0c0c]">
      
      <div className="absolute inset-0 flex flex-row">
        {renderLanes()}
      </div>

      {/* Heavy Graphic Novel Hit Line */}
      <div 
        className="absolute left-0 right-0 h-2 bg-[#0f0c0c] border-t-4 border-[#da2d46] z-0 pointer-events-none -skew-x-12" 
        style={{ bottom: '15%' }} 
      />

      <div className="absolute inset-0 pointer-events-none">
        {renderNotes()}
      </div>

      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0c0c]/80 z-50 backdrop-blur-sm">
          <div className="text-center flex flex-col items-center">
            <div className="bg-[#da2d46] border-[6px] border-[#0f0c0c] px-8 py-3 -skew-x-6 shadow-[8px_8px_0px_0px_#0f0c0c] mb-6">
              <h2 className="font-orbitron font-black text-4xl md:text-5xl text-[#0f0c0c] skew-x-6 uppercase tracking-widest">
                Ready
              </h2>
            </div>
            <p className="font-space-mono font-bold text-[#e0e5ed] text-sm md:text-base bg-[#2a2d43] border-[3px] border-[#0f0c0c] px-4 py-2 -skew-x-2 shadow-[4px_4px_0px_0px_#0f0c0c]">
              <span className="skew-x-2 block">Press any mapped key or tap a drum to start</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}