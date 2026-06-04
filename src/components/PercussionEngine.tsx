import { useEffect, useState, useCallback, useMemo } from 'react';
import { audioEngine } from '../services/audioSynth';
import type { ActiveInstrumentProfile } from '../types';

interface PercussionEngineProps {
  profile: ActiveInstrumentProfile;
}

export function PercussionEngine({ profile }: PercussionEngineProps) {
  const [activePads, setActivePads] = useState<Set<number>>(new Set());

  // Determine expected physical drum count based on instrument name as a fallback
  const expectedDrums = useMemo(() => {
    const name = profile.instrument.name.toLowerCase();
    if (name.includes('agong') || name.includes('agung')) return 2;
    if (name.includes('kulintang')) return 8;
    if (name.includes('dabakan') || name.includes('babandil')) return 1;
    if (name.includes('gangsa')) return 6;
    return null;
  }, [profile.instrument.name]);

  // Group notes by physical drum (lane)
  const drumsByLane = useMemo(() => {
    const lanes: Record<number, (typeof profile.acoustic.scaleNotes[0] & { originalIdx: number })[]> = {};
    profile.acoustic.scaleNotes.forEach((note, idx) => {
      let finalLane = note.lane ?? idx;
      if (expectedDrums !== null) {
        // Enforce exact physical drum count, distribute notes into hit zones
        finalLane = idx % expectedDrums;
      }
      if (!lanes[finalLane]) lanes[finalLane] = [];
      lanes[finalLane].push({ ...note, originalIdx: idx });
    });
    return Object.values(lanes);
  }, [profile.acoustic.scaleNotes, expectedDrums]);

  const strikePad = useCallback((index: number, frequency: number) => {
    // Ensure audio context is running synchronously
    audioEngine.resumeSync();
    // Fire and forget sound with natural decay
    audioEngine.playNote(profile.acoustic, frequency);

    // Trigger visual shockwave
    setActivePads(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    // Remove active state quickly for percussive visual snap
    setTimeout(() => {
      setActivePads(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 150);
  }, [profile.acoustic]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        'q': 0, 'w': 1, 'e': 2, 'r': 3,
        'a': 4, 's': 5, 'd': 6, 'f': 7,
        'z': 8, 'x': 9, 'c': 10, 'v': 11
      };
      
      const key = e.key.toLowerCase();
      const index = keyMap[key];
      if (index !== undefined && index < profile.acoustic.scaleNotes.length) {
        strikePad(index, profile.acoustic.scaleNotes[index].frequency);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile.acoustic.scaleNotes, strikePad]);

  return (
    <div className="flex-1 w-full flex flex-col items-center py-12 px-8 overflow-y-auto select-none touch-none">
      <div className="text-center mb-12">
        <h2 className="font-orbitron text-2xl font-black text-teal glow-cyan mb-2">PERCUSSION ENGINE</h2>
        <p className="text-silver/60 font-space-mono text-sm">Tap, click, or use QWER/ASDF to strike.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-10 w-full max-w-4xl px-2 md:px-4 py-8">
        {drumsByLane.map((notesOnDrum, drumIdx) => {
          return (
            <div key={drumIdx} className="flex flex-col items-center gap-2 md:gap-4">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 flex items-center justify-center">
                {/* Render concentric hit zones from largest to smallest */}
                {notesOnDrum.map((note, zoneIdx) => {
                  const isActive = activePads.has(note.originalIdx);
                  const keyHint = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'][note.originalIdx];
                  const totalZones = notesOnDrum.length;
                  
                  // Calculate size: largest is 100%, distribute the rest evenly to leave large tap margins
                  const sizePercent = 100 - (zoneIdx * (100 / totalZones)); 
                  const zIndex = zoneIdx * 10;

                  return (
                    <button
                      key={note.originalIdx}
                      onMouseDown={(e) => { e.stopPropagation(); strikePad(note.originalIdx, note.frequency); }}
                      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); strikePad(note.originalIdx, note.frequency); }}
                      className="absolute rounded-full outline-none focus:outline-none transition-all flex items-center justify-center border-2 border-teal/40 bg-charcoal/80 shadow-xl hover:bg-teal/20"
                      style={{ 
                        width: `${sizePercent}%`, 
                        height: `${sizePercent}%`,
                        zIndex,
                        backgroundColor: isActive ? 'rgba(102, 252, 241, 0.4)' : undefined,
                        borderColor: isActive ? '#66FCF1' : undefined,
                        boxShadow: isActive ? '0 0 30px rgba(254, 213, 107, 0.6)' : undefined,
                        transform: isActive ? 'scale(0.95)' : 'scale(1)'
                      }}
                      title={`Zone: ${note.note} (${keyHint})`}
                    >
                      {/* Only show the note name if it's a single zone, or if it's the innermost to avoid clutter, 
                          but user wants letters/hints. Let's show key hint in the center of each zone if possible, or just on the drum. */}
                      {totalZones === 1 && (
                        <span className="font-orbitron font-bold text-silver/80 text-sm md:text-lg">
                          {note.note}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Key Hints below the drum */}
              <div className="flex gap-2 flex-wrap justify-center">
                {notesOnDrum.map((note) => {
                  const keyHint = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'][note.originalIdx];
                  return (
                    <div key={note.originalIdx} className="font-space-mono text-[10px] md:text-xs font-bold text-silver/40 bg-obsidian px-2 py-1 rounded border border-silver/10 text-center">
                      <div className="text-silver/20 mb-1">{note.note}</div>
                      [ {keyHint || note.originalIdx + 1} ]
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
