import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { audioEngine } from '../services/audioSynth';
import type { ActiveInstrumentProfile, Note, GameplayState } from '../types';

interface StringRhythmProps {
  profile: ActiveInstrumentProfile;
  notes: Note[];
  gameState: GameplayState;
  onLaneHit: (laneId: number) => void;
  activeLanes: Set<number>;
}

export function StringRhythm({ profile, notes, gameState, onLaneHit, activeLanes: _activeLanes }: StringRhythmProps) {
  const [activeStrings, setActiveStrings] = useState<Set<number>>(new Set());
  const lastNoteIdxRef = useRef<number | null>(null);
  const mapping = profile.inputMapping;

  // Determine expected physical string count
  const expectedStrings = useMemo(() => {
    const name = profile.instrument.name.toLowerCase();
    if (name.includes('kudyapi') || name.includes('kudlong')) return 2;
    if (name.includes('bandurria') || name.includes('octavina') || name.includes('laud')) return 14;
    if (name.includes('guitar')) return 6;
    return null;
  }, [profile.instrument.name]);

  // Group notes by physical string (lane)
  const stringsByLane = useMemo(() => {
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
    let mappedLaneId: number | undefined;
    profile.acoustic.scaleNotes.forEach((_, idx) => {
       if (idx === index) {
          mappedLaneId = mapping.lanes[idx]?.id ?? idx;
       }
    });

    if (mappedLaneId !== undefined) {
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
            
            if (!lastTouchedIndicesRef.current.has(idx)) {
              pluckString(idx, freq);
            }
          }
        }
      }
      lastTouchedIndicesRef.current = currentTouches;
    } else {
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

  return (
    // Base container replaced with heavy border and solid background
    <div 
      className="w-full h-full relative overflow-hidden bg-[#2a2d43] border-[6px] border-[#0f0c0c] touch-none select-none"
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
            
            {/* The Physical String Line - Restyled as a thick ink stroke */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none">
              <div 
                className={`h-full border-l-[6px] md:border-l-[8px] transition-all duration-75
                  ${notesOnString.some(n => activeStrings.has(n.originalIdx)) 
                    ? 'animate-vibrate-x border-[#f0dde0] opacity-100' 
                    : 'border-[#0f0c0c] opacity-80'}
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
                    {/* Fret Marker - Replaced circle with a heavy skewed tag */}
                    <div className={`shrink-0 relative z-10 font-space-mono text-[10px] md:text-xs font-black leading-none p-1 w-12 h-12 md:w-16 md:h-16 flex flex-col items-center justify-center text-center -skew-x-6 border-[3px] md:border-[4px] border-[#0f0c0c] transition-all duration-75 ${
                      isActive 
                        ? 'bg-[#da2d46] text-[#0f0c0c] scale-110 shadow-none translate-y-1 translate-x-1' 
                        : 'bg-[#2a2d43] text-[#e0e5ed] shadow-[4px_4px_0px_0px_#0f0c0c]'
                    }`}>
                      
                      <span className="pointer-events-none relative z-20 skew-x-6">{note.note}</span>

                      {/* Approach "Circles" - Restyled as heavy square borders snapping inward */}
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
                            className={`absolute -inset-[2px] md:-inset-[4px] border-[4px] md:border-[6px] transition-colors pointer-events-none z-0 ${
                              n.missed ? 'border-[#888ea1]' : isPerfectWindow ? 'border-[#f0dde0]' : 'border-[#da2d46]'
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

      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0c0c]/80 z-50 pointer-events-none backdrop-blur-sm">
          <div className="text-center flex flex-col items-center p-6">
            <div className="bg-[#da2d46] border-[6px] border-[#0f0c0c] px-8 py-3 -skew-x-6 shadow-[8px_8px_0px_0px_#0f0c0c] mb-6">
              <h2 className="font-orbitron font-black text-3xl md:text-4xl text-[#0f0c0c] skew-x-6 uppercase tracking-widest">
                Sandbox Mode
              </h2>
            </div>
            <p className="font-space-mono font-bold text-[#e0e5ed] text-sm md:text-base bg-[#2a2d43] border-[3px] border-[#0f0c0c] px-6 py-4 -skew-x-2 shadow-[4px_4px_0px_0px_#0f0c0c] max-w-sm">
              <span className="skew-x-2 block">Swipe across the strings to play naturally. If you strum a string when a rhythm target aligns, you score!</span>
            </p>
          </div>
        </div>
      )}

      {/* Vibration keyframe for the physical string pluck */}
      <style>{`
        @keyframes vibrate-x {
          0%, 100% { transform: translateX(-50%); }
          25% { transform: translateX(calc(-50% - 2px)); }
          75% { transform: translateX(calc(-50% + 2px)); }
        }
        .animate-vibrate-x {
          animation: vibrate-x 0.05s linear infinite;
        }
      `}</style>
    </div>
  );
}