import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Mic } from 'lucide-react';
import { audioEngine } from '../services/audioSynth';
import type { ActiveInstrumentProfile, Note, GameplayState } from '../types';
import { SCROLL_SPEED, HIT_WINDOWS } from '../constants';

interface WindRhythmProps {
  profile: ActiveInstrumentProfile;
  notes: Note[];
  gameState: GameplayState;
  onLaneHit: (laneId: number) => void;
  activeLanes: Set<number>;
}

export function WindRhythm({ profile, notes, gameState, onLaneHit, activeLanes }: WindRhythmProps) {
  const mapping = profile.inputMapping;
  const [useMic, setUseMic] = useState(false);
  const [isBlowing, setIsBlowing] = useState(false);
  
  const numHoles = mapping.laneCount;
  const [holes, setHoles] = useState<boolean[]>(() => Array(numHoles).fill(true)); // true = BLACK (unpressed)

  useEffect(() => {
    setHoles(Array(numHoles).fill(true)); // Default to BLACK
  }, [numHoles]);

  const currentNote = useRef<{ stop: () => void; setFrequency?: (f: number) => void } | null>(null);
  const isBlowingRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // --- Original Sandbox Frequency Logic ---
  const getFrequencyAndLane = useCallback(() => {
    // 1. Original Flute Pitch Logic (based on total holes covered/black)
    const coveredCount = holes.filter(h => h).length;
    const maxIdx = profile.acoustic.scaleNotes.length - 1;
    let targetIdx = numHoles - coveredCount;
    if (targetIdx > maxIdx) targetIdx = maxIdx;
    if (targetIdx < 0) targetIdx = 0;
    
    // 2. Rhythm Game Lane Logic (supports multiple simultaneously held lanes!)
    const activeIndices: number[] = [];
    holes.forEach((h, idx) => { if (h === false) activeIndices.push(idx); });

    return {
      frequency: profile.acoustic.scaleNotes[targetIdx].frequency,
      laneIndices: activeIndices 
    };
  }, [holes, profile.acoustic.scaleNotes, numHoles]);

  // Handle Audio Synthesis Lifecycle (Infinite sustained note while blowing)
  useEffect(() => {
    if (isBlowing) {
      const { frequency } = getFrequencyAndLane();
      if (!currentNote.current) {
        currentNote.current = audioEngine.playNote(profile.acoustic, frequency);
      } else {
        if (currentNote.current.setFrequency) {
          currentNote.current.setFrequency(frequency);
        } else {
          currentNote.current.stop();
          currentNote.current = audioEngine.playNote(profile.acoustic, frequency);
        }
      }
    } else {
      if (currentNote.current) {
        currentNote.current.stop();
        currentNote.current = null;
      }
    }
  }, [isBlowing, getFrequencyAndLane, profile.acoustic]);

  // --- Invisible Rhythm Bridge ---
  useEffect(() => {
    const { laneIndices } = getFrequencyAndLane();
    if (laneIndices.length === 0) return; // If no keys held down, don't trigger hits
    
    // Process hits for all currently held holes simultaneously
    laneIndices.forEach(laneIdx => {
      const mappedLaneId = mapping.lanes[laneIdx]?.id;
      if (mappedLaneId === undefined) return;

      // Find the earliest unhit note in this lane using the proper ID
      const targetNote = notes.find(n => n.lane === mappedLaneId && !n.hit && !n.missed);
      if (targetNote) {
        const delta = Math.abs(gameState.songTimeSeconds - targetNote.time);
        
        // Use EXACTLY the perfect window to guarantee a PERFECT score when holding holes!
        if (delta <= HIT_WINDOWS.perfect) {
             // Tell the game engine to register the hit
             onLaneHit(mappedLaneId);
        }
      }
    });
  }, [gameState.songTimeSeconds, getFrequencyAndLane, notes, mapping.lanes, onLaneHit]);

  // --- Microphone Logic ---
  const stopMic = useCallback(() => {
    setUseMic(false);
    setIsBlowing(false);
    isBlowingRef.current = false;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  const startMic = useCallback(async () => {
    audioEngine.resumeSync();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      if (!audioEngine.audioContext) await audioEngine.init();
      const ctx = audioEngine.audioContext;
      if (!ctx) throw new Error("No AudioContext");
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const dataArray = new Float32Array(analyser.fftSize);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) sumSquares += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sumSquares / dataArray.length);
        
        if (rms > 0.05) {
          if (!isBlowingRef.current) {
             setIsBlowing(true);
             isBlowingRef.current = true;
          }
        } else if (rms < 0.02) {
          if (isBlowingRef.current) {
             setIsBlowing(false);
             isBlowingRef.current = false;
          }
        }
        animationRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
      setUseMic(true);
    } catch (err) {
      console.error("Mic error:", err);
      setUseMic(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMic();
      if (currentNote.current) {
        currentNote.current.stop();
        currentNote.current = null;
      }
    };
  }, [stopMic]);

  // --- Hole Logic ---
  const openHole = useCallback((index: number) => {
    audioEngine.resumeSync();
    setHoles(prev => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = false; // RED
      return next;
    });
  }, []);

  const closeHole = useCallback((index: number) => {
    setHoles(prev => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true; // BLACK
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const index = mapping.lanes.findIndex(l => l.keyBinding === e.key.toUpperCase() || l.keyBinding === e.key.toLowerCase());
      if (index !== -1) openHole(index); // KeyDown -> RED (Active)
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const index = mapping.lanes.findIndex(l => l.keyBinding === e.key.toUpperCase() || l.keyBinding === e.key.toLowerCase());
      if (index !== -1) closeHole(index); // KeyUp -> BLACK (Inactive)
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mapping.lanes, openHole, closeHole]);

  const { laneIndices: currentActiveLaneIndices } = getFrequencyAndLane();
  const coveredCount = holes.filter(h => h).length;

  const renderFluteBody = () => {
    return (
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-24 md:w-32 bg-[#2A1E1E] border-x-4 border-[#3E2B2B] rounded-full shadow-2xl flex flex-col py-16 z-20">
        {holes.map((isCovered, idx) => {
          // Display the holes visually. 
          const lane = mapping.lanes[idx];
          const isHit = lane && activeLanes.has(lane.id);
          
          return (
            <div key={idx} className="relative flex-1 flex justify-center items-center w-full group cursor-pointer"
                 onPointerDown={(e) => { e.preventDefault(); openHole(idx); }} // PointerDown -> RED
                 onPointerUp={() => closeHole(idx)} // PointerUp -> BLACK
                 onPointerLeave={() => closeHole(idx)}
            >
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full border-4 transition-all duration-150 shadow-inner select-none
                ${!isCovered 
                  ? 'bg-crimson/80 border-crimson shadow-[0_0_20px_rgba(254,213,107,0.7)] scale-110'
                  : 'bg-obsidian border-dark-slate shadow-[inset_0_0_15px_#000] scale-100'}
                ${isHit ? 'ring-4 ring-[#FED56B] bg-[#FED56B] shadow-[0_0_40px_#FED56B] scale-[1.3]' : ''}
              `} />
              {lane && (
                 <div className="absolute left-full ml-4 font-orbitron font-bold text-pale-pink/50 text-xl pointer-events-none">
                   {lane.keyBinding}
                 </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderNotes = () => {
    return notes.map(note => {
      // Notes disappear 1.5 seconds after passing the center (whether hit or missed)
      if (gameState.songTimeSeconds - note.time > 1.5) return null;

      const timeDiff = note.time - gameState.songTimeSeconds;
      const distance = timeDiff * SCROLL_SPEED;

      let noteColor = 'shadow-[0_0_15px_rgba(224,229,237,0.8)]'; // light-gray glow
      if (note.missed) noteColor = 'shadow-[0_0_10px_rgba(231,76,60,0.5)] opacity-50'; // danger glow

      const numDisplayedHoles = holes.length || 1;
      
      // We must find the visual index (0, 1, 2, 3) for this note's ID to position it correctly!
      // This handles cases where Gemini generated 1-based IDs or string IDs.
      const visualLaneIdx = mapping.lanes.findIndex(l => l.id === note.lane);
      const safeLaneIdx = visualLaneIdx !== -1 ? visualLaneIdx : Number(note.lane) || 0;

      const topPos = `${((safeLaneIdx + 0.5) / numDisplayedHoles) * 100}%`;

      let noteStyle: React.CSSProperties = {
        top: topPos,
        left: distance >= 0 ? `calc(50% + ${distance}px)` : `calc(50% - ${Math.abs(distance)}px)`,
        transform: 'translate(-50%, 0)',
        opacity: note.missed ? 0.5 : 1
      };

      if (note.hit) {
        // The pill is 48px wide (w-12). Left edge is distance - 24.
        // It starts crossing when distance = 24, and finishes when distance = -24.
        let fillPct = ((24 - distance) / 48) * 100;
        fillPct = Math.max(0, Math.min(100, fillPct));
        noteStyle.background = `linear-gradient(to right, #FED56B ${fillPct}%, #e0e5ed ${fillPct}%)`;
        noteStyle.border = '2px solid #FED56B'; // Immediate feedback!
        noteColor = 'shadow-[0_0_20px_rgba(254,213,107,0.8)] scale-110';
      } else if (note.missed) {
        noteStyle.backgroundColor = '#E74C3C';
      } else {
        noteStyle.backgroundColor = '#e0e5ed';
      }

      return (
        <div
          key={note.id}
          className={`absolute w-12 h-6 rounded-full -translate-y-1/2 z-50 ${noteColor}`}
          style={noteStyle}
        />
      );
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-obsidian/60 backdrop-blur-sm rounded-xl border-2 border-pale-pink/20 select-none touch-none flex">
      
      {/* Side Controls */}
      <div className="absolute left-4 top-4 z-50 flex flex-col gap-4">
        <button
          onMouseDown={() => { if (!useMic) { audioEngine.resumeSync(); setIsBlowing(true); isBlowingRef.current = true; } }}
          onMouseUp={() => { if (!useMic) { setIsBlowing(false); isBlowingRef.current = false; } }}
          onMouseLeave={() => { if (!useMic) { setIsBlowing(false); isBlowingRef.current = false; } }}
          onTouchStart={(e) => { if (!useMic) { e.preventDefault(); audioEngine.resumeSync(); setIsBlowing(true); isBlowingRef.current = true; } }}
          onTouchEnd={() => { if (!useMic) { setIsBlowing(false); isBlowingRef.current = false; } }}
          disabled={useMic}
          className={`px-6 py-4 rounded-xl font-orbitron font-black text-xl transition-all ${
            isBlowing 
              ? 'bg-crimson text-obsidian shadow-[0_0_30px_rgba(254,213,107,0.8)] scale-95' 
              : 'bg-obsidian border-2 border-crimson text-crimson'
          } ${useMic ? 'opacity-50' : ''}`}
        >
          {isBlowing ? 'BLOWING...' : 'HOLD TO BLOW'}
        </button>

        <label className="flex items-center gap-3 cursor-pointer p-2 bg-obsidian/80 rounded-lg">
          <input 
            type="checkbox" checked={useMic} 
            onChange={(e) => e.target.checked ? startMic() : stopMic()}
            className="w-5 h-5 accent-crimson"
          />
          <span className="font-space-mono text-light-gray/80 text-xs flex items-center gap-2">
            <Mic size={14} /> Use Mic
          </span>
        </label>
        
        <div className="mt-4 flex items-center gap-2 bg-obsidian/80 p-2 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${isBlowing ? 'bg-[#66FCF1] shadow-[0_0_10px_#66FCF1]' : 'bg-dark-slate'}`} />
          <span className="font-space-mono text-light-gray/60 text-xs">
            {isBlowing ? `Pitch: Lane(s) ${currentActiveLaneIndices.length > 0 ? currentActiveLaneIndices.join(', ') : 'None'}` : 'Silent'}
          </span>
        </div>
      </div>

      {renderFluteBody()}
      
      <div className="absolute inset-y-0 left-1/2 w-1 shadow-[0_0_20px_rgba(218,45,70,0.5)] -translate-x-1/2 z-10" style={{ backgroundColor: 'rgba(218, 45, 70, 0.3)' }} />

      {/* Wrapping the notes in the exact same py-16 padding as the Flute Body so top percentages align perfectly */}
      <div className="absolute inset-y-0 left-0 right-0 py-16 pointer-events-none z-50 flex flex-col">
        <div className="flex-1 relative w-full">
          {renderNotes()}
        </div>
      </div>

      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-obsidian/80 z-50">
          <div className="text-center">
            <h2 className="font-orbitron font-black text-3xl text-pale-pink glow-pale-pink mb-4 uppercase">
              Free Play Sandbox
            </h2>
            <p className="font-space-mono text-light-gray text-sm max-w-sm mx-auto">
              You are free to blow and lift your fingers to create melodies. 
              If the melody you play matches the falling rhythm notes, you score points!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
