import React, { useEffect, useState, useCallback, useRef } from 'react';
import { audioEngine } from '../services/audioSynth';
import type { ActiveInstrumentProfile } from '../types';

interface StringEngineProps {
  profile: ActiveInstrumentProfile;
}

export function StringEngine({ profile }: StringEngineProps) {
  const [activeStrings, setActiveStrings] = useState<Set<number>>(new Set());

  // Determine expected physical string count based on instrument name as a fallback
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
        // Enforce exact physical string count
        finalLane = idx % expectedStrings;
      }
      if (!lanes[finalLane]) lanes[finalLane] = [];
      lanes[finalLane].push({ ...note, originalIdx: idx });
    });
    return Object.values(lanes);
  }, [profile.acoustic.scaleNotes, expectedStrings]);

  const pluckString = useCallback((index: number, frequency: number) => {
    // Ensure audio context is running
    audioEngine.resumeSync();
    // Play the audio
    audioEngine.playNote(profile.acoustic, frequency);

    window.dispatchEvent(new CustomEvent('instrument-strike'));

    // Trigger visual animation
    setActiveStrings(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    // Remove animation after decay time
    const decayMs = Math.max(100, profile.acoustic.decayTime * 1000);
    setTimeout(() => {
      setActiveStrings(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, decayMs);
  }, [profile.acoustic]);

  const lastNoteIdxRef = useRef<number | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;
    const segment = element.closest('.note-segment');
    if (segment) {
      const idxAttr = segment.getAttribute('data-note-idx');
      const freqAttr = segment.getAttribute('data-note-freq');
      if (idxAttr && freqAttr) {
        const idx = parseInt(idxAttr, 10);
        const freq = parseFloat(freqAttr);
        if (idx !== lastNoteIdxRef.current) {
          audioEngine.resumeSync();
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
        '6': 5, '7': 6, '8': 7, '9': 8, '0': 9
      };
      
      const index = keyMap[e.key];
      if (index !== undefined && index < profile.acoustic.scaleNotes.length) {
        pluckString(index, profile.acoustic.scaleNotes[index].frequency);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile.acoustic.scaleNotes, pluckString]);

  return (
    <div 
      className="flex-1 w-full flex flex-col justify-start md:justify-center items-stretch py-6 px-4 overflow-hidden touch-none select-none pb-safe pt-safe"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="text-center mb-6 md:mb-12">
        <h2 className="font-orbitron text-2xl font-black text-crimson glow-crimson mb-2">STRING ENGINE</h2>
        <p className="text-light-gray/60 font-space-mono text-sm">Hover, swipe, tap, or press 1-0 to pluck.</p>
      </div>

      <div className="flex flex-row justify-center gap-1 sm:gap-6 md:gap-12 w-full max-w-5xl mx-auto flex-1 items-stretch py-8 px-1 sm:px-4">
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
                style={{
                  transitionDuration: notesOnString.some(n => activeStrings.has(n.originalIdx)) 
                    ? '0ms' 
                    : `${profile.acoustic.decayTime * 1000}ms`
                }}
              />
            </div>

            {/* Clickable Fret Segments */}
            <div className="relative w-full h-full flex flex-col z-10">
              {notesOnString.map((note) => {
                const isActive = activeStrings.has(note.originalIdx);
                return (
                  <div
                    key={note.originalIdx}
                    data-note-idx={note.originalIdx}
                    data-note-freq={note.frequency}
                    className="flex-1 w-full flex items-center justify-center cursor-pointer transition-colors note-segment"
                    onMouseEnter={() => pluckString(note.originalIdx, note.frequency)}
                    onTouchStart={(e) => { 
                      e.preventDefault(); 
                      audioEngine.resumeSync();
                      pluckString(note.originalIdx, note.frequency); 
                      lastNoteIdxRef.current = note.originalIdx;
                    }}
                    onMouseDown={() => {
                      audioEngine.resumeSync();
                      pluckString(note.originalIdx, note.frequency);
                    }}
                  >
                    <div className={`font-space-mono text-[10px] md:text-sm font-bold bg-obsidian px-1 sm:px-4 py-1 rounded-full border transition-all ${
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
    </div>
  );
}
