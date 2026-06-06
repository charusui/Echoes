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
          mappedLaneId = mapping.lanes[idx]?.id ?? idx;
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

  const lastTouchedIndicesRef = useRef<Set<number>>(new Set());

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      const currentTouches = new Set<number>();
      
      // Iterate over ALL active fingers for true multi-touch swiping!
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const noteEl = el?.closest('.note-segment');
        
        if (noteEl) {
          const idxStr = noteEl.getAttribute('data-note-idx');
          const freqStr = noteEl.getAttribute('data-note-freq');
          if (idxStr && freqStr) {
            const idx = parseInt(idxStr, 10);
            const freq = parseFloat(freqStr);
            
            currentTouches.add(idx);
            
            // If this specific finger wasn't touching this string in the last frame, pluck it!
            if (!lastTouchedIndicesRef.current.has(idx)) {
              pluckString(idx, freq);
            }
          }
        }
      }
      
      // Update the active touches for the next frame
      lastTouchedIndicesRef.current = currentTouches;
    } else {
      // Mouse drag support
      if (e.buttons !== 1) { 
        lastTouchedIndicesRef.current.clear(); 
        return; 
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const noteEl = el?.closest('.note-segment');
      if (noteEl) {
        const idxStr = noteEl.getAttribute('data-note-idx');
        const freqStr = noteEl.getAttribute('data-note-freq');
        if (idxStr && freqStr) {
          const idx = parseInt(idxStr, 10);
          const freq = parseFloat(freqStr);
          if (!lastTouchedIndicesRef.current.has(idx)) {
            pluckString(idx, freq);
            lastTouchedIndicesRef.current.clear();
            lastTouchedIndicesRef.current.add(idx);
          }
        }
      }
    }
  }, [pluckString]);

  const handleTouchEnd = useCallback(() => {
    lastTouchedIndicesRef.current.clear();
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

  // Note: renderRhythmNotes is removed because we now render the approach circles directly inside the fret bubbles!

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
                
                // Find any falling rhythm notes targeting this specific fret
                const fallingNotes = notes.filter(n => {
                  const visualLaneIdx = mapping.lanes.findIndex(l => l.id === n.lane);
                  const targetOriginalIdx = visualLaneIdx !== -1 ? visualLaneIdx : Number(n.lane) || 0;
                  return targetOriginalIdx === note.originalIdx;
                });

                return (
                  <div
                    key={note.originalIdx}
                    data-note-idx={note.originalIdx}
                    data-note-freq={note.frequency}
                    className="flex-1 w-full flex items-center justify-center cursor-pointer transition-colors note-segment relative"
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
                    {/* Text Bubble - acting as the absolute positioning anchor */}
                    <div className={`shrink-0 relative z-10 font-space-mono text-[10px] md:text-xs font-bold leading-none bg-obsidian p-1 w-14 h-14 md:w-16 md:h-16 aspect-square flex flex-col items-center justify-center text-center rounded-full border transition-all ${
                      isActive ? 'text-[#FED56B] border-[#FED56B] shadow-[inset_0_0_10px_rgba(254,213,107,0.5)] scale-110' : 'text-light-gray/60 border-light-gray/20'
                    }`}>
                      <span className="pointer-events-none relative z-20">{note.note}</span>

                      {/* OSU Approach Circles glued directly inside the text bubble! */}
                      {fallingNotes.map(n => {
                        if (n.hit || (n.missed && gameState.songTimeSeconds - n.time > 1)) return null;

                        const timeDiff = n.time - gameState.songTimeSeconds;
                        if (timeDiff < -1 || timeDiff > 1.5) return null;

                        const approachScale = Math.max(1, 1 + (timeDiff / 1.5) * 2);
                        const opacity = timeDiff > 1.0 ? 1 - ((timeDiff - 1.0) / 0.5) : 1;
                        const isPerfectWindow = Math.abs(timeDiff) <= 0.2;

                        return (
                          <div 
                            key={n.id}
                            className={`absolute -inset-[1px] rounded-full border-[3px] md:border-[4px] transition-colors pointer-events-none z-0 ${
                              n.missed ? 'border-danger/80' : isPerfectWindow ? 'border-[#66FCF1] shadow-[0_0_15px_#66FCF1]' : 'border-crimson shadow-[0_0_10px_rgba(218,45,70,0.5)]'
                            }`}
                            style={{ opacity, transform: `scale(${approachScale})` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Rhythm Notes are now rendered directly inside the clickable fret segments! */}

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
