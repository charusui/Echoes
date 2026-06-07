import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Mic } from 'lucide-react';
import { audioEngine } from '../services/audioSynth';
import type { ActiveInstrumentProfile } from '../types';

interface WindEngineProps {
  profile: ActiveInstrumentProfile;
}

export function WindEngine({ profile }: WindEngineProps) {
  const [useMic, setUseMic] = useState(false);
  const [isBlowing, setIsBlowing] = useState(false);
  
  const expectedHoles = useMemo(() => {
    const name = profile.instrument.name.toLowerCase();
    if (name.includes('tongali') || name.includes('kaleleng')) return 4;
    if (name.includes('suling') || name.includes('bansuri')) return 6;
    if (name.includes('palendag')) return 5;
    return null;
  }, [profile.instrument.name]);

  const numHoles = useMemo(() => {
    if (expectedHoles !== null) return expectedHoles;
    const uniqueLanes = new Set(profile.acoustic.scaleNotes.map(n => n.lane).filter(l => l !== undefined));
    return uniqueLanes.size > 0 ? uniqueLanes.size : Math.max(1, profile.acoustic.scaleNotes.length - 1);
  }, [profile.acoustic.scaleNotes, expectedHoles]);

  const [holes, setHoles] = useState<boolean[]>(() => Array(numHoles).fill(true)); // true = covered (finger down)

  useEffect(() => {
    setHoles(Array(numHoles).fill(true));
  }, [numHoles]);
  
  const currentNote = useRef<{ stop: () => void; setFrequency?: (f: number) => void } | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const isBlowingRef = useRef(false);

  // Calculate current frequency based on holes covered
  const getFrequency = useCallback(() => {
    const coveredCount = holes.filter(h => h).length;
    const maxIdx = profile.acoustic.scaleNotes.length - 1;
    // Reverse map: all covered -> idx 0. 0 covered -> maxIdx
    let targetIdx = numHoles - coveredCount;
    if (targetIdx > maxIdx) targetIdx = maxIdx;
    if (targetIdx < 0) targetIdx = 0;
    return profile.acoustic.scaleNotes[targetIdx].frequency;
  }, [holes, profile.acoustic.scaleNotes, numHoles]);

  // Handle Audio Synthesis Lifecycle
  useEffect(() => {
    if (isBlowing) {
      const freq = getFrequency();
      if (!currentNote.current) {
        // Start blowing
        currentNote.current = audioEngine.playNote(profile.acoustic, freq);
      } else {
        // Change pitch while blowing
        if (currentNote.current.setFrequency) {
          currentNote.current.setFrequency(freq);
        } else {
          // Fallback if synth doesn't support setFrequency (like gongs)
          currentNote.current.stop();
          currentNote.current = audioEngine.playNote(profile.acoustic, freq);
        }
      }
    } else {
      if (currentNote.current) {
        currentNote.current.stop();
        currentNote.current = null;
      }
    }
  }, [isBlowing, getFrequency, profile.acoustic]);

  const stopMic = useCallback(() => {
    setUseMic(false);
    setIsBlowing(false);
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
      
      if (!audioEngine.audioContext) {
        await audioEngine.init();
      }
      
      const ctx = audioEngine.audioContext;
      if (!ctx) throw new Error("No AudioContext available");
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Float32Array(analyser.fftSize);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);
        
        // Calculate RMS
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        
        if (rms > 0.05) { // Blowing threshold
          if (!isBlowingRef.current) {
            setIsBlowing(true);
            isBlowingRef.current = true;
            // Just trigger the visual weave once per blow sequence
            window.dispatchEvent(new CustomEvent('instrument-strike'));
          }
        } else {
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
      console.error("Microphone access denied or error:", err);
      setUseMic(false);
      alert("Microphone access was denied. Please ensure you have granted microphone permissions in your iOS settings.");
    }
  }, []);

  const handleToggleMic = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      startMic();
    } else {
      stopMic();
    }
  }, [startMic, stopMic]);

  // Clean up audio and mic on unmount
  useEffect(() => {
    return () => {
      stopMic();
      if (currentNote.current) {
        currentNote.current.stop();
        currentNote.current = null;
      }
    };
  }, [stopMic]);

  const openHole = useCallback((index: number) => {
    audioEngine.resumeSync();
    setHoles(prev => {
      if (!prev[index]) return prev; // already open
      const next = [...prev];
      next[index] = false; // false = open (uncovered)
      return next;
    });
  }, []);

  const closeHole = useCallback((index: number) => {
    setHoles(prev => {
      if (prev[index]) return prev; // already closed
      const next = [...prev];
      next[index] = true; // true = covered
      return next;
    });
  }, []);

  // Keyboard shortcuts — hold key to open hole, release to close
  useEffect(() => {
    const keyMap: Record<string, number> = {
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const index = keyMap[e.key];
      if (index !== undefined) openHole(index);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const index = keyMap[e.key];
      if (index !== undefined) closeHole(index);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [openHole, closeHole]);

  const coveredCount = holes.filter(h => h).length;

  return (
    <div className="flex-1 w-full flex flex-col justify-start md:justify-center items-center py-6 px-4 overflow-y-auto select-none touch-none pb-safe pt-safe">
      <div className="bg-obsidian/60 border border-pale-pink/30 p-6 md:p-8 rounded-3xl backdrop-blur-md w-full max-w-2xl flex flex-col items-center my-auto">
        
        <h2 className="font-orbitron text-2xl font-black text-crimson glow-crimson mb-8">WIND ENGINE</h2>
        
        {/* Blow Controls */}
        <div className="flex flex-col items-center gap-6 mb-12 w-full">
          <button
            onMouseDown={() => {
              if (!useMic) {
                audioEngine.resumeSync();
                setIsBlowing(true);
              }
            }}
            onMouseUp={() => !useMic && setIsBlowing(false)}
            onMouseLeave={() => !useMic && setIsBlowing(false)}
            onTouchStart={(e) => {
              if (!useMic) {
                e.preventDefault();
                audioEngine.resumeSync();
                setIsBlowing(true);
              }
            }}
            onTouchEnd={() => !useMic && setIsBlowing(false)}
            disabled={useMic}
            className={`w-full max-w-sm py-6 rounded-2xl font-orbitron font-black text-2xl transition-all duration-100 ${
              isBlowing 
                ? 'bg-crimson text-obsidian shadow-[0_0_30px_rgba(254,213,107,0.8)] scale-95' 
                : 'bg-obsidian border-2 border-crimson text-crimson'
            } ${useMic ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isBlowing ? 'BLOWING...' : 'HOLD TO BLOW'}
          </button>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useMic} 
              onChange={handleToggleMic}
              className="w-5 h-5 accent-crimson"
            />
            <span className="font-space-mono text-light-gray/80 text-sm flex items-center gap-2">
              <Mic size={16} className="text-light-gray/60" /> Use Microphone to Blow (RMS)
            </span>
          </label>
        </div>

        {/* Hole Modification Matrix (Vertical Flute Body) */}
        <div className="flex flex-col items-center bg-dark-slate/60 py-10 px-6 rounded-full mb-8 border-4 border-obsidian shadow-2xl gap-6">
          {holes.map((isCovered, idx) => (
            <div key={idx} className="flex items-center gap-4 w-full justify-center relative">
              <span className="absolute -left-8 text-light-gray/40 font-space-mono text-xs">({idx + 1})</span>
              <button
                onMouseDown={() => openHole(idx)}
                onMouseUp={() => closeHole(idx)}
                onMouseLeave={() => closeHole(idx)}
                onTouchStart={(e) => { e.preventDefault(); openHole(idx); }}
                onTouchEnd={() => closeHole(idx)}
                onTouchCancel={() => closeHole(idx)}
                className={`w-12 h-12 rounded-full border-4 transition-all duration-75 select-none ${
                  !isCovered
                    ? 'bg-crimson/80 border-crimson shadow-[0_0_20px_rgba(254,213,107,0.7)] scale-110'
                    : 'bg-obsidian border-crimson/60 shadow-[inset_0_0_15px_rgba(254,213,107,0.3)]'
                }`}
              />
              <span className={`absolute -right-12 font-space-mono text-xs font-bold ${!isCovered ? 'text-crimson' : 'text-light-gray/40'}`}>
                {!isCovered ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          ))}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isBlowing ? 'bg-crimson glow-crimson' : 'bg-dark-slate'}`} />
          <span className="font-space-mono text-light-gray/60 text-sm">
            Status: {isBlowing ? `Playing... (${coveredCount} Holes Covered)` : 'Silent'}
          </span>
        </div>

      </div>
    </div>
  );
}
