import type { ActiveInstrumentProfile, Note, GameplayState } from '../types';
import { SCROLL_SPEED } from '../constants';

interface RhythmHighwayProps {
  profile: ActiveInstrumentProfile;
  notes: Note[];
  gameState: GameplayState;
  onLaneHit: (laneId: number) => void;
  activeLanes: Set<number>; // lanes currently pressed down
}

export function RhythmHighway({ profile, notes, gameState, onLaneHit, activeLanes }: RhythmHighwayProps) {
  const mapping = profile.inputMapping;
  const isVerticalScroll = mapping.orientation === 'horizontal'; // Lanes laid out horizontally, notes fall down
  
  const renderLanes = () => {
    return mapping.lanes.map((lane) => {
      const isActive = activeLanes.has(lane.id);
      
      let visualContent = null;
      if (profile.instrument.category === 'percussion') {
         // Render a top-down view of a drum/gong
         visualContent = (
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full border-2 transition-all flex items-center justify-center shadow-xl z-20
               ${isActive ? 'bg-pale-pink/40 border-[#66FCF1] scale-95 shadow-[0_0_30px_rgba(254,213,107,0.6)]' : 'bg-dark-slate/80 border-pale-pink/40'}
            `}>
               <div className="w-4 h-4 rounded-full bg-obsidian/50" /> {/* Boss/center */}
            </div>
         );
      } else if (profile.instrument.category === 'string') {
         // Render a horizontal string stretching across the lane
         visualContent = (
            <div className={`transition-all z-20
               ${isVerticalScroll ? 'w-full h-1 md:h-2' : 'h-full w-1 md:w-2'}
               ${isActive ? 'bg-[#66FCF1] shadow-[0_0_20px_rgba(102,252,241,0.8)] scale-150' : 'bg-pale-pink/60 shadow-[0_0_5px_rgba(240,221,224,0.5)]'}
            `} />
         );
      } else if (profile.instrument.category === 'wind') {
         // Render a flute hole
         visualContent = (
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full border transition-all shadow-inner z-20
               ${isActive ? 'bg-pale-pink/40 border-[#66FCF1] scale-90' : 'bg-obsidian border-pale-pink/30'}
            `} />
         );
      }

      return (
        <div 
          key={lane.id}
          onPointerDown={() => onLaneHit(lane.id)}
          className={`
            relative flex items-center justify-center border-slate-gray/30
            ${isVerticalScroll ? 'h-full border-r last:border-r-0 flex-1' : 'w-full border-b last:border-b-0 flex-1'}
            ${isActive ? 'bg-pale-pink/5' : 'bg-transparent'}
            transition-colors duration-75 cursor-pointer
          `}
        >
          {/* Hit Line Placement (The dynamic instrument UI) */}
          <div className={`absolute flex items-center justify-center pointer-events-none
             ${isVerticalScroll ? 'bottom-[15%] translate-y-1/2 w-full' : 'left-[15%] -translate-x-1/2 h-full'}
          `}>
             {visualContent}
          </div>

          {/* Key Binding Hint */}
          <div className={`
            absolute font-orbitron font-bold text-pale-pink/50 text-xl pointer-events-none
            ${isVerticalScroll ? 'bottom-[5%]' : 'left-[5%]'}
          `}>
            {lane.keyBinding}
          </div>
        </div>
      );
    });
  };

  const renderNotes = () => {
    return notes.map(note => {
      // Don't render notes that are fully hit or way past missed
      if (note.hit || (note.missed && gameState.songTimeSeconds - note.time > 1)) return null;

      const timeDiff = note.time - gameState.songTimeSeconds;
      
      // Calculate position
      const distance = timeDiff * SCROLL_SPEED;

      // Note styling based on hit/miss
      let noteColor = 'bg-light-gray shadow-[0_0_15px_rgba(224,229,237,0.8)]';
      if (note.missed) noteColor = 'bg-danger shadow-[0_0_10px_rgba(231,76,60,0.5)] opacity-50';

      if (isVerticalScroll) {
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
      } else {
        const laneHeight = 100 / mapping.laneCount;
        const topPos = `${(note.lane * laneHeight) + (laneHeight / 2)}%`;

        return (
          <div
            key={note.id}
            className={`absolute w-6 h-12 rounded-full -translate-x-1/2 -translate-y-1/2 z-10 ${noteColor}`}
            style={{
              top: topPos,
              left: `calc(15% + ${distance}px)`,
            }}
          />
        );
      }
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-obsidian/60 backdrop-blur-sm rounded-xl border-2 border-pale-pink/20">
      
      {/* Lanes Background */}
      <div className={`absolute inset-0 flex ${isVerticalScroll ? 'flex-row' : 'flex-col'}`}>
        {renderLanes()}
      </div>

      {/* Hit Line */}
      {isVerticalScroll ? (
        <div className="absolute left-0 right-0 h-1 bg-crimson shadow-[0_0_20px_rgba(218,45,70,0.5)] z-0" style={{ bottom: '15%' }} />
      ) : (
        <div className="absolute top-0 bottom-0 w-1 bg-crimson shadow-[0_0_20px_rgba(218,45,70,0.5)] z-0" style={{ left: '15%' }} />
      )}

      {/* Notes Container */}
      <div className="absolute inset-0 pointer-events-none">
        {renderNotes()}
      </div>

      {/* Overlays / Start Text */}
      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-obsidian/80 z-50">
          <div className="text-center">
            <h2 className="font-orbitron font-black text-3xl text-pale-pink glow-pale-pink mb-4 uppercase">
              Ready
            </h2>
            <p className="font-space-mono text-light-gray text-sm">
              Press any mapped key or tap a lane to start
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
