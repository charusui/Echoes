import React, { useEffect, useState, useCallback, useRef } from 'react';
import { audioEngine } from '../services/audioSynth';
import type { ActiveInstrumentProfile, Note, GameplayState } from '../types';

interface StringRhythmProps {
  profile: ActiveInstrumentProfile;
  notes: Note[];
  gameState: GameplayState;
  onLaneHit: (laneId: number) => void;
  activeLanes: Set<number>;
}

export function StringRhythm({ profile, notes, gameState, onLaneHit, activeLanes }: StringRhythmProps) {
  const [activeStrings, setActiveStrings] = useState<Set<number>>(new Set());
  const mapping = profile.inputMapping;

  // Determine expected physical string count
  const expectedStrings = React.useMemo(() => {
    const name = profile.instrument.name.toLowerCase();
    if (name.includes('kudyapi') || name.includes('kudlong')) return 2;
    if (name.includes('bandurria') || name.includes('octavina') || name.includes('laud')) return 14;
    if (name.includes('guitar')) return 6;
    return null;
  }, [profile.instrument.name]);

  // Group notes by physical string (lane)
  const stringsByLane = React.useMemo(() => {
    const lanes: Record<number, (typeof profile.acoustic.scaleNotes[0] & { originalIdx: number })[]> = {};
    profile.acoustic.scaleNotes.forEach((note, idx) => {
      let finalLane = note.lane ?? idx;
      if (expectedStrings !== null) {
        finalLane = idx % expectedStrings;
      }
      if (!lanes[finalLane]) lanes[finalLane] = [];
      lanes[finalLane].push({ ...note, originalIdx: idx });
    });
    return Object.values(lanes);
  }, [profile.acoustic.scaleNotes, expectedStrings]);

  const pluckString = useCallback((index: number, frequency: number) => {
    audioEngine.resumeSync();
    
    // Play the audio (sandbox mode plays its own audio!)
    audioEngine.playNote(profile.acoustic, frequency);

    // Trigger visual animation
    setActiveStrings(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    const decayMs = Math.max(100, profile.acoustic.decayTime * 1000);
    setTimeout(() => {
      setActiveStrings(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, decayMs);

    // --- Invisible Rhythm Bridge ---
    // We just plucked `index` (which corresponds to an original note index).
    // Does this index belong to a mapped lane?
    // Let's find which lane this index belongs to.
    let mappedLaneId: number | undefined;
    profile.acoustic.scaleNotes.forEach((n, idx) => {
       if (idx === index) {
          mappedLaneId = mapping.lanes[n.lane ?? 0]?.id;
       }
    });

    if (mappedLaneId !== undefined) {
       // Check if there's a visual note in the rhythm window for this lane
       // We use a broader window for manual plucks (e.g. 0.2s)
       const targetNote = notes.find(n => n.lane === mappedLaneId && !n.hit && !n.missed);
       if (targetNote) {
         const delta = Math.abs(gameState.songTimeSeconds - targetNote.time);
         if (delta <= 0.2) {
           onLaneHit(mappedLaneId); // Score!
         }
       }
    }
  }, [profile.acoustic, mapping.lanes, notes, gameState.songTimeSeconds, onLaneHit]);

  const lastNoteIdxRef = useRef<number | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    let clientX, clientY;
    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      if (e.buttons !== 1) { lastNoteIdxRef.current = null; return; } // only swipe if mouse down
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return;
    
    const segment = element.closest('.note-segment');
    if (segment) {
      const idxAttr = segment.getAttribute('data-note-idx');
      const freqAttr = segment.getAttribute('data-note-freq');
      if (idxAttr && freqAttr) {
        const idx = parseInt(idxAttr, 10);
        const freq = parseFloat(freqAttr);
        if (idx !== lastNoteIdxRef.current) {
          pluckString(idx, freq);
          lastNoteIdxRef.current = idx;
        }
      }
    } else {
      lastNoteIdxRef.current = null;
    }
  }, [pluckString]);

  const handleTouchEnd = useCallback(() => {
    lastNoteIdxRef.current = null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
        '6': 5, '7': 6, '8': 7, '9': 8, '0': 9,
        'q': 10, 'w': 11, 'e': 12, 'r': 13
      };
      
      const index = keyMap[e.key.toLowerCase()];
      if (index !== undefined && index < profile.acoustic.scaleNotes.length) {
        pluckString(index, profile.acoustic.scaleNotes[index].frequency);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile.acoustic.scaleNotes, pluckString]);

  // --- Rendering Rhythm Notes Overlay ---
  const renderRhythmNotes = () => {
    return notes.map(note => {
      if (note.hit || (note.missed && gameState.songTimeSeconds - note.time > 1)) return null;

      const timeDiff = note.time - gameState.songTimeSeconds;
      
      // Approach Circle Window: Show circles 1.5 seconds before they are meant to be hit
      if (timeDiff < -1 || timeDiff > 1.5) return null;

      // Scale goes from 3.0 down to 1.0
      const approachScale = Math.max(1, 1 + (timeDiff / 1.5) * 2);
      const opacity = timeDiff > 1.0 ? 1 - ((timeDiff - 1.0) / 0.5) : 1;

      // Find the physical string column for this lane
      let physicalStringIdx = 0;
      let fretIdx = 0;
      let totalFrets = 1;

      // Map the note's ID to its visual index (0, 1, 2...)
      const visualLaneIdx = mapping.lanes.findIndex(l => l.id === note.lane);
      const safeLaneIdx = visualLaneIdx !== -1 ? visualLaneIdx : Number(note.lane) || 0;

      if (safeLaneIdx < stringsByLane.length) {
         physicalStringIdx = safeLaneIdx;
         const laneNotes = stringsByLane[safeLaneIdx];
         fretIdx = Math.floor(laneNotes.length / 2);
         totalFrets = laneNotes.length;
      }

      const stringWidth = 100 / stringsByLane.length;
      const leftPos = `${(physicalStringIdx * stringWidth) + (stringWidth / 2)}%`;
      const topPos = `${((fretIdx + 0.5) / totalFrets) * 100}%`;

      const isPerfectWindow = Math.abs(timeDiff) <= 0.2;

      return (
        <div
          key={note.id}
          className="absolute z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: leftPos, top: topPos, opacity }}
        >
          <div className={`w-10 h-10 rounded-full transition-colors ${
            note.missed ? 'bg-danger/80' : isPerfectWindow ? 'bg-[#66FCF1] shadow-[0_0_20px_#66FCF1]' : 'bg-pale-pink shadow-[0_0_10px_rgba(240,221,224,0.8)]'
          }`} />
          {!note.missed && (
            <div 
              className={`absolute inset-0 rounded-full border-4 transition-colors ${
                isPerfectWindow ? 'border-[#66FCF1]' : 'border-crimson shadow-[0_0_10px_rgba(218,45,70,0.5)]'
              }`}
              style={{ transform: `scale(${approachScale})` }}
            />
          )}
        </div>
      );
    });
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden bg-obsidian/60 backdrop-blur-sm rounded-xl border-2 border-pale-pink/20 touch-none select-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <div className="flex flex-row justify-center gap-1 sm:gap-6 md:gap-12 w-full h-full max-w-5xl mx-auto py-8 px-1 sm:px-4 z-10">
        {stringsByLane.map((notesOnString, stringIdx) => (
          <div key={stringIdx} className="relative h-full flex-1 min-w-[28px] max-w-[64px] sm:max-w-[80px] md:max-w-[96px] flex flex-col group justify-center shrink">
            
            {/* The Physical String Line */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none">
              <div 
                className={`h-full border-l-[4px] md:border-l-[6px] transition-all duration-75 rounded-full
                  ${notesOnString.some(n => activeStrings.has(n.originalIdx)) 
                    ? 'animate-vibrate-x border-[#FED56B] shadow-[0_0_15px_#FED56B] opacity-100' 
                    : 'border-light-gray/40 opacity-60'}
                `}
              />
            </div>

            {/* Clickable Fret Segments */}
            <div className="relative w-full h-full flex flex-col z-20">
              {notesOnString.map((note) => {
                const isActive = activeStrings.has(note.originalIdx);
                return (
                  <div
                    key={note.originalIdx}
                    data-note-idx={note.originalIdx}
                    data-note-freq={note.frequency}
                    className="flex-1 w-full flex items-center justify-center cursor-pointer transition-colors note-segment"
                    onMouseEnter={(e) => { if (e.buttons === 1) pluckString(note.originalIdx, note.frequency); }}
                    onTouchStart={(e) => { 
                      e.preventDefault(); 
                      pluckString(note.originalIdx, note.frequency); 
                      lastNoteIdxRef.current = note.originalIdx;
                    }}
                    onMouseDown={() => {
                      pluckString(note.originalIdx, note.frequency);
                      lastNoteIdxRef.current = note.originalIdx;
                    }}
                  >
                    <div className={`font-space-mono text-[10px] md:text-sm font-bold bg-obsidian px-1 sm:px-4 py-1 rounded-full border transition-all pointer-events-none ${
                      isActive ? 'text-[#FED56B] border-[#FED56B] shadow-[0_0_10px_rgba(254,213,107,0.5)] scale-110' : 'text-light-gray/60 border-light-gray/20'
                    }`}>
                      {note.note}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none z-30">
        {renderRhythmNotes()}
      </div>

      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-obsidian/80 z-50 pointer-events-none">
          <div className="text-center">
            <h2 className="font-orbitron font-black text-3xl text-pale-pink glow-pale-pink mb-4 uppercase">
              Free Play Sandbox
            </h2>
            <p className="font-space-mono text-light-gray text-sm max-w-sm mx-auto">
              Swipe across the strings to play naturally. If you strum a string when a rhythm circle aligns, you score!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
