import { useEffect, useState, useRef, useCallback } from 'react';
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
      const index = mapping.lanes.findIndex(l => l.keyBinding === e.key.toUpperCase() || l.keyBinding === e.key.toLowerCase());
      if (index !== -1) openHole(index); 
    };
    const handleKeyUp = (e: KeyboardEvent) => {
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
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-28 md:w-40 bg-[#e0e5ed] border-x-[8px] border-[#0f0c0c] shadow-[12px_0px_0px_0px_rgba(15,12,12,0.5)] flex flex-col py-16 z-20">
        
        {/* Subtle halftone texture on the flute body */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#0f0c0c 2px, transparent 2px)', backgroundSize: '12px 12px' }}
        />

        {holes.map((isCovered, idx) => {
          const lane = mapping.lanes[idx];
          const isHit = lane && activeLanes.has(lane.id);
          
          return (
            <div key={idx} className="relative flex-1 flex justify-center items-center w-full group cursor-pointer"
                 onPointerDown={(e) => { e.preventDefault(); openHole(idx); }} 
                 onPointerUp={() => closeHole(idx)} 
                 onPointerLeave={() => closeHole(idx)}
            >
              {/* Comic-style Flute Hole */}
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-[6px] transition-all duration-75 relative z-10
                ${!isCovered 
                  ? 'bg-[#da2d46] border-[#0f0c0c] shadow-[inset_4px_4px_0px_rgba(15,12,12,0.4)] scale-90'
                  : 'bg-[#2a2d43] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] scale-100'}
                ${isHit ? 'bg-[#f0dde0] border-[#0f0c0c] scale-110 shadow-[0px_0px_0px_6px_#da2d46]' : ''}
              `}>
                {/* Speedline flash when hit */}
                {isHit && (
                  <div className="absolute inset-0 rounded-full opacity-30 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #0f0c0c 4px, #0f0c0c 6px)' }} />
                )}
              </div>

              {/* Fret/Key Hint Tag */}
              {lane && (
                 <div className="absolute left-full ml-4 font-orbitron font-black text-[#0f0c0c] text-sm md:text-xl pointer-events-none bg-[#f0dde0] border-[3px] border-[#0f0c0c] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c]">
                   <span className="skew-x-6 block">{lane.keyBinding}</span>
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
      let noteClasses = 'absolute w-16 md:w-20 h-8 md:h-10 border-[4px] border-[#0f0c0c] -translate-y-1/2 z-50 flex items-center justify-center font-orbitron font-black text-xs md:text-sm -skew-x-6 ';
      
      if (note.hit) {
        noteClasses += 'bg-[#f0dde0] text-[#0f0c0c] shadow-[0px_0px_0px_4px_#da2d46] scale-110';
      } else if (note.missed) {
        noteClasses += 'bg-[#888ea1] text-[#2a2d43] shadow-[4px_4px_0px_0px_#0f0c0c] opacity-60 grayscale';
      } else {
        noteClasses += 'bg-[#da2d46] text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c]';
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
          <span className="skew-x-6 tracking-widest">{note.hit ? 'HIT!' : '►'}</span>
        </div>
      );
    });
  };

  return (
    // Solid background with heavy border
    <div className="w-full h-full relative overflow-hidden bg-[#2a2d43] border-[6px] md:border-[8px] border-[#0f0c0c] select-none touch-none flex z-0">
      
      {/* Subtle background texture */}
      <div 
        className="absolute inset-0 z-[-1] opacity-20 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '16px 16px' }}
      />

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
          className={`px-4 md:px-6 py-3 md:py-4 font-orbitron font-black text-sm md:text-xl border-[4px] border-[#0f0c0c] -skew-x-6 transition-all duration-75 ${
            isBlowing 
              ? 'bg-[#da2d46] text-[#0f0c0c] translate-y-1 translate-x-1 shadow-none' 
              : 'bg-[#e0e5ed] text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c]'
          } ${useMic ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          <span className="skew-x-6 block tracking-widest">{isBlowing ? 'BLOWING...' : 'HOLD TO BLOW'}</span>
        </button>

        {/* Mic Toggle Tag */}
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#2a2d43] border-[3px] border-[#0f0c0c] -skew-x-6 shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all w-fit">
          <input 
            type="checkbox" checked={useMic} 
            onChange={(e) => e.target.checked ? startMic() : stopMic()}
            className="w-4 h-4 md:w-5 md:h-5 accent-[#da2d46] skew-x-6"
          />
          <span className="font-space-mono text-[#e0e5ed] font-bold text-xs md:text-sm flex items-center gap-2 skew-x-6 uppercase tracking-widest">
            <Mic size={16} className="text-[#da2d46]" /> MIC
          </span>
        </label>
        
        {/* Status Tag */}
        <div className="mt-2 flex items-center gap-2 bg-[#0f0c0c] border-[3px] border-[#da2d46] p-2 -skew-x-6 shadow-[4px_4px_0px_0px_#da2d46] w-fit">
          <div className={`w-3 h-3 border-[2px] border-[#0f0c0c] skew-x-6 ${isBlowing ? 'bg-[#f0dde0]' : 'bg-[#2a2d43]'}`} />
          <span className="font-space-mono text-[#e0e5ed] font-bold text-[10px] md:text-xs skew-x-6 uppercase tracking-widest">
            {isBlowing ? `PITCH: ${currentActiveLaneIndices.length > 0 ? currentActiveLaneIndices.join(',') : 'Ø'}` : 'SILENT'}
          </span>
        </div>
      </div>

      {renderFluteBody()}
      
      {/* Heavy Graphic Novel Hit Line replacing the thin laser */}
      <div className="absolute inset-y-0 left-1/2 w-4 bg-[#0f0c0c] border-x-2 border-[#da2d46] -translate-x-1/2 z-10 opacity-80" />

      {/* Wrapping the notes in the exact same py-16 padding as the Flute Body so top percentages align perfectly */}
      <div className="absolute inset-y-0 left-0 right-0 py-16 pointer-events-none z-50 flex flex-col">
        <div className="flex-1 relative w-full">
          {renderNotes()}
        </div>
      </div>

      {/* Sandbox "Ready" Screen - Restyled */}
      {!gameState.isPlaying && !gameState.isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0c0c]/90 z-50 pointer-events-none">
          <div className="text-center flex flex-col items-center p-6">
            <div className="bg-[#da2d46] border-[6px] border-[#0f0c0c] px-8 py-3 -skew-x-6 shadow-[8px_8px_0px_0px_#0f0c0c] mb-6">
              <h2 className="font-orbitron font-black text-3xl md:text-4xl text-[#0f0c0c] skew-x-6 uppercase tracking-widest">
                Sandbox Mode
              </h2>
            </div>
            <p className="font-space-mono font-bold text-[#e0e5ed] text-sm md:text-base bg-[#2a2d43] border-[3px] border-[#0f0c0c] px-6 py-4 -skew-x-2 shadow-[4px_4px_0px_0px_#da2d46] max-w-md leading-relaxed">
              <span className="skew-x-2 block">
                Hold the blow button and lift your fingers to change pitch. Align your notes with the rhythm tags to score!
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}