import { useEffect, useState, useRef, useCallback } from 'react';
import { Mic } from 'pixelarticons/react';
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
    const coveredCount = holes.filter(h => h).length;
    const maxIdx = profile.acoustic.scaleNotes.length - 1;
    let targetIdx = numHoles - coveredCount;
    if (targetIdx > maxIdx) targetIdx = maxIdx;
    if (targetIdx < 0) targetIdx = 0;
    
    const activeIndices: number[] = [];
    holes.forEach((h, idx) => { if (h === false) activeIndices.push(idx); });

    return {
      frequency: profile.acoustic.scaleNotes[targetIdx].frequency,
      laneIndices: activeIndices 
    };
  }, [holes, profile.acoustic.scaleNotes, numHoles]);

  // Handle Audio Synthesis Lifecycle
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
    if (laneIndices.length === 0) return; 
    
    laneIndices.forEach(laneIdx => {
      const mappedLaneId = mapping.lanes[laneIdx]?.id;
      if (mappedLaneId === undefined) return;

      const targetNote = notes.find(n => n.lane === mappedLaneId && !n.hit && !n.missed);
      if (targetNote) {
        const delta = Math.abs(gameState.songTimeSeconds - targetNote.time);
        
        if (delta <= HIT_WINDOWS.perfect) {
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
      if (e.code === 'Space') {
        setIsBlowing(true);
        e.preventDefault();
        return;
      }
      const index = mapping.lanes.findIndex(l => l.keyBinding === e.key.toUpperCase() || l.keyBinding === e.key.toLowerCase());
      if (index !== -1) openHole(index); 
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsBlowing(false);
        return;
      }
      const index = mapping.lanes.findIndex(l => l.keyBinding === e.key.toUpperCase() || l.keyBinding === e.key.toLowerCase());
      if (index !== -1) closeHole(index);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mapping.lanes, openHole, closeHole]);

  const { laneIndices: currentActiveLaneIndices } = getFrequencyAndLane();

  const renderFluteBody = () => {
    return (
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-28 md:w-40 bg-parchment-100 border-x-[8px] border-ink flex flex-col py-16 z-20">
        


        {holes.map((isCovered, idx) => {
          const lane = mapping.lanes[idx];
          const isHit = lane && activeLanes.has(lane.id);
          
          return (
            <div key={idx} className="relative flex-1 flex justify-center items-center w-full group cursor-pointer touch-none"
                 onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); openHole(idx); }} 
                 onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); closeHole(idx); }} 
                 onPointerCancel={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); closeHole(idx); }}
            >
              {/* Comic-style Flute Hole */}
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] transition-all duration-75 relative z-10
                ${!isCovered 
                  ? 'bg-gold-500 border-ink scale-90'
                  : 'bg-plum-800 border-ink scale-100'}
                ${isHit ? 'bg-parchment-100 border-ink scale-110 ' : ''}
              `}>
                {/* Speedline flash when hit */}
                {isHit && (
                  <div className="absolute inset-0 rounded-full opacity-30 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #0f0c0c 4px, #0f0c0c 6px)' }} />
                )}
              </div>

              {/* Fret/Key Hint Tag */}
              {lane && (
                 <div className="absolute left-full ml-4 font-bold text-ink text-sm md:text-xl pointer-events-none bg-parchment-100 border-[3px] border-ink px-3 py-1">
                   <span className="block">{lane.keyBinding}</span>
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
      if (gameState.songTimeSeconds - note.time > 1.5) return null;

      const timeDiff = note.time - gameState.songTimeSeconds;
      const distance = timeDiff * SCROLL_SPEED;
      const numDisplayedHoles = holes.length || 1;
      
      const visualLaneIdx = mapping.lanes.findIndex(l => l.id === note.lane);
      const safeLaneIdx = visualLaneIdx !== -1 ? visualLaneIdx : Number(note.lane) || 0;

      const topPos = `${((safeLaneIdx + 0.5) / numDisplayedHoles) * 100}%`;

      // Comic-style Note block
      let noteClasses = 'absolute w-16 md:w-20 h-8 md:h-10 border-[3px] border-ink -translate-y-1/2 z-50 flex items-center justify-center font-bold text-xs md:text-sm';
      
      if (note.hit) {
        noteClasses += 'bg-parchment-100 text-ink scale-110';
      } else if (note.missed) {
        noteClasses += 'bg-plum-600 text-plum-400 opacity-60 grayscale';
      } else {
        noteClasses += 'bg-gold-500 text-ink ';
      }

      return (
        <div
          key={note.id}
          className={noteClasses}
          style={{
            top: topPos,
            left: distance >= 0 ? `calc(50% + ${distance}px)` : `calc(50% - ${Math.abs(distance)}px)`,
            transform: 'translate(-50%, -50%) skewX(-6deg)',
          }}
        >
          <span className="">{note.hit ? 'HIT!' : '►'}</span>
        </div>
      );
    });
  };

  return (
    // Solid background with heavy border
    <div className="w-full h-full relative overflow-hidden bg-plum-800 border-[3px] md:border-[3px] border-ink select-none touch-none flex z-0">
      


      {/* Side Controls */}
      <div className="absolute left-4 top-4 z-50 flex flex-col gap-4">
        
        {/* Heavy Mechanical Blow Button */}
        <button
          onMouseDown={() => { if (!useMic) { audioEngine.resumeSync(); setIsBlowing(true); isBlowingRef.current = true; } }}
          onMouseUp={() => { if (!useMic) { setIsBlowing(false); isBlowingRef.current = false; } }}
          onMouseLeave={() => { if (!useMic) { setIsBlowing(false); isBlowingRef.current = false; } }}
          onTouchStart={(e) => { if (!useMic) { e.preventDefault(); audioEngine.resumeSync(); setIsBlowing(true); isBlowingRef.current = true; } }}
          onTouchEnd={() => { if (!useMic) { setIsBlowing(false); isBlowingRef.current = false; } }}
          disabled={useMic}
          className={`px-btn min-h-14 px-5 text-base md:text-xl ${isBlowing ? 'px-btn-primary translate-y-[3px]' : 'px-btn-blue'}`}
        >
          <span className="block">{isBlowing ? 'Blowing...' : 'Hold Space to Blow'}</span>
        </button>

        {/* Mic Toggle Tag */}
        <label className="px-frame px-frame-plum flex items-center gap-3 cursor-pointer p-3 w-fit">
          <input 
            type="checkbox" checked={useMic} 
            onChange={(e) => e.target.checked ? startMic() : stopMic()}
            className="size-5 accent-[var(--color-gold-500)]"
          />
          <span className="text-parchment-100 font-bold text-xs md:text-sm flex items-center gap-2">
            <Mic width={16} height={16} className="text-gold-300" /> Use microphone
          </span>
        </label>
        
        {/* Status Tag */}
        <div className="px-frame px-frame-inset px-frame-sm mt-2 flex items-center gap-2 p-2 w-fit">
          <div className={`w-3 h-3 border-[2px] border-ink  ${isBlowing ? 'bg-parchment-100' : 'bg-plum-800'}`} />
          <span className="text-parchment-100 font-bold text-xs md:text-xs">
            {isBlowing ? `PITCH: ${currentActiveLaneIndices.length > 0 ? currentActiveLaneIndices.join(',') : 'Ø'}` : 'SILENT'}
          </span>
        </div>
      </div>

      {renderFluteBody()}
      
      {/* Heavy Graphic Novel Hit Line replacing the thin laser */}
      <div className="absolute inset-y-0 left-1/2 w-4 bg-plum-950 border-x-2 border-gold-300 -translate-x-1/2 z-10 opacity-80" />

      {/* Wrapping the notes in the exact same py-16 padding as the Flute Body so top percentages align perfectly */}
      <div className="absolute inset-y-0 left-0 right-0 py-16 pointer-events-none z-50 flex flex-col">
        <div className="flex-1 relative w-full">
          {renderNotes()}
        </div>
      </div>

      {/* Sandbox "Ready" Screen - Restyled */}
      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-plum-950/90 z-50 pointer-events-none">
          <div className="text-center flex flex-col items-center p-6">
            <div className="bg-gold-500 text-ink border-[3px] border-ink px-8 py-3 mb-6">
              <h2 className="font-bold text-3xl md:text-4xl text-ink">
                Sandbox Mode
              </h2>
            </div>
            <p className="font-bold text-parchment-100 text-sm md:text-base bg-plum-800 border-[3px] border-ink px-6 py-4 max-w-md leading-relaxed">
              <span className="block">
                Hold the blow button and lift your fingers to change pitch. Align your notes with the rhythm tags to score!
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}