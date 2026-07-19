import { useState, useEffect, useRef, useCallback } from 'react';
import { Disc, Flame } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';

export interface RhythmCompleteStats {
  combo: number;
  hits: { sick: number; good: number; bad: number; miss: number };
  captureProgress?: number;
}

interface RhythmHighwayOverlayProps {
  mode?: 'attack' | 'capture';
  preset?: string;
  isCapture?: boolean;
  onComplete?: (stats: RhythmCompleteStats) => void;
}

interface Note {
  id: number;
  lane: number;
  y: number;
  hit: boolean;
  miss: boolean;
}

interface FloatTextItem {
  id: number;
  text: string;
  lane: number;
  y: number;
  color: string;
  fontSize: string;
  rotation: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

const LANES = [
  { index: 0, symbol: '◀', label: 'A', color: '#da2d46', key: 'ArrowLeft', altKey: 'a' },
  { index: 1, symbol: '▼', label: 'S', color: '#38bdf8', key: 'ArrowDown', altKey: 's' },
  { index: 2, symbol: '▲', label: 'W', color: '#4ade80', key: 'ArrowUp',   altKey: 'w' },
  { index: 3, symbol: '▶', label: 'D', color: '#facc15', key: 'ArrowRight',altKey: 'd' },
];

// ADJUSTED: Shifted slightly up so it never gets clipped by mobile browsers
const RECEPTOR_Y = 250; 
const SPEED      = 450; 
const FIRST_ARRIVAL = 1.0;  
const NOTE_SPACING  = 0.45; 
const NOTE_COUNT    = 18;   

export function RhythmHighwayOverlay({
  preset = 'default',
  isCapture = false,
  onComplete,
}: RhythmHighwayOverlayProps) {
  
  const highwayRef = useRef<HTMLDivElement>(null);
  const [_laneW, setLaneW] = useState(80);
  const laneWRef = useRef(80);

  useEffect(() => {
    const el = highwayRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.floor(el.clientWidth / LANES.length);
      setLaneW(w);
      laneWRef.current = w;
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Game state
  const [notes, setNotes] = useState<Note[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState({ sick: 0, good: 0, bad: 0, miss: 0 });
  const [captureProgress, setCaptureProgress] = useState(0);
  
  // Crazy Visual States
  const [activeLanes, setActiveLanes] = useState<Record<number, boolean>>({});
  const [laneFlashes, setLaneFlashes] = useState<Record<number, boolean>>({});
  const [floatTexts, setFloatTexts] = useState<FloatTextItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenShake, setScreenShake] = useState(0); // 0: none, 1: light, 2: heavy
  const [glitch, setGlitch] = useState(false);

  const isCrazyMode = combo >= 10;

  // Refs for game loop logic
  const animRef = useRef<number | null>(null);
  const partAnimRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const notesRef = useRef<Note[]>([]);
  const hitsRef = useRef(hits);
  const maxComboRef = useRef(maxCombo);
  const captureProgressRef = useRef(captureProgress);
  const floatIdRef = useRef(0);
  const particleIdRef = useRef(0);

  // Sync refs
  hitsRef.current = hits;
  maxComboRef.current = maxCombo;
  captureProgressRef.current = captureProgress;

  // ─── INITIALIZE NOTES ───
  useEffect(() => {
    const generated: Note[] = Array.from({ length: NOTE_COUNT }, (_, i) => ({
      id: i,
      lane: Math.floor(Math.abs(Math.sin(i * 12.345)) * 4) % 4, 
      y: RECEPTOR_Y - (FIRST_ARRIVAL + i * NOTE_SPACING) * SPEED,
      hit: false,
      miss: false,
    }));
    notesRef.current = generated;
    setNotes(generated);
    finishedRef.current = false;
  }, []);

  // ─── EFFECTS HELPERS ───
  const addFloat = useCallback((text: string, lane: number, y: number, color: string, fontSize = 'text-xl') => {
    const id = floatIdRef.current++;
    const rotation = `rotate(${(Math.random() - 0.5) * 40}deg)`;
    setFloatTexts(prev => [...prev.slice(-15), { id, text, lane, y, color, fontSize, rotation }]);
    setTimeout(() => {
      setFloatTexts(prev => prev.filter(f => f.id !== id));
    }, 500); 
  }, []);

  const spawnParticles = useCallback((laneIndex: number, color: string, count: number) => {
    const lw = laneWRef.current;
    const cx = laneIndex * lw + lw / 2;
    const newP: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const spd = 5 + Math.random() * 8; 
      return {
        id: particleIdRef.current++,
        x: cx + (Math.random() - 0.5) * 30, 
        y: RECEPTOR_Y + 10,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 5,
        life: 1, maxLife: 1, color
      };
    });
    setParticles(prev => [...prev.slice(-80), ...newP]);
  }, []);

  // ─── PARTICLES LOOP ───
  useEffect(() => {
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000; last = t;
      setParticles(prev => prev
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.4, life: p.life - dt * 2.5 }))
        .filter(p => p.life > 0)
      );
      partAnimRef.current = requestAnimationFrame(loop);
    };
    partAnimRef.current = requestAnimationFrame(loop);
    return () => { if (partAnimRef.current) cancelAnimationFrame(partAnimRef.current); };
  }, []);

  // ─── MAIN GAME LOOP ───
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (finishedRef.current) return;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      let missedCount = 0;
      const updatedNotes = notesRef.current.map(n => {
        if (n.hit || n.miss) return n;
        const nextY = n.y + SPEED * dt;
        
        // ADJUSTED: Wait until note is truly past the receptor box and hint text to mark as miss
        if (nextY > RECEPTOR_Y + 65) {
          missedCount++;
          return { ...n, y: nextY, miss: true };
        }
        return { ...n, y: nextY };
      });

      notesRef.current = updatedNotes;
      setNotes(updatedNotes);

      if (missedCount > 0) {
        setCombo(0);
        setHits(h => ({ ...h, miss: h.miss + missedCount }));
        setScreenShake(2);
        setGlitch(true);
        setTimeout(() => { setScreenShake(0); setGlitch(false); }, 200);
        audioEngine.playHitSFX('miss');
        
        const missedNote = updatedNotes.find(n => n.miss && n.y > RECEPTOR_Y + 65 && n.y < RECEPTOR_Y + 115);
        if (missedNote) addFloat('MISS', missedNote.lane, RECEPTOR_Y + 30, '#da2d46', 'text-2xl');
      }

      const allDone = updatedNotes.every(n => n.hit || n.miss || n.y > RECEPTOR_Y + 80);
      if (allDone && !finishedRef.current && updatedNotes.length > 0) {
        finishedRef.current = true;
        setTimeout(() => {
          onComplete?.({
            combo: maxComboRef.current,
            hits: hitsRef.current,
            captureProgress: isCapture ? captureProgressRef.current : undefined
          });
        }, 800); 
      } else {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isCapture, onComplete, addFloat]);

  // ─── INPUT HANDLER ───
  const handleLaneTrigger = useCallback((laneIndex: number) => {
    if (finishedRef.current) return;
    const laneConfig = LANES[laneIndex]!;

    setActiveLanes(p => ({ ...p, [laneIndex]: true }));
    setTimeout(() => setActiveLanes(p => ({ ...p, [laneIndex]: false })), 80);

    let bestIdx = -1;
    let minDist = 999;

    notesRef.current.forEach((n, i) => {
      if (n.hit || n.miss || n.lane !== laneIndex) return;
      const dist = Math.abs(n.y - RECEPTOR_Y);
      if (dist < 70 && dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    });

    if (bestIdx !== -1) {
      const newNotes = [...notesRef.current];
      newNotes[bestIdx] = { ...newNotes[bestIdx]!, hit: true };
      notesRef.current = newNotes;
      setNotes(newNotes);

      let rating: 'sick' | 'good' | 'bad' = 'sick';
      let ptsText = '+3';
      let color = '#facc15';
      let fontSize = 'text-4xl'; 

      if (minDist > 50) {
        rating = 'bad'; ptsText = '+1'; color = '#f97316'; fontSize = 'text-2xl';
      } else if (minDist > 25) {
        rating = 'good'; ptsText = '+2'; color = '#4ade80'; fontSize = 'text-3xl';
      }

      addFloat(ptsText, laneIndex, RECEPTOR_Y - 30, color, fontSize);
      addFloat(rating.toUpperCase(), laneIndex, RECEPTOR_Y - 70, color, 'text-xl');

      setLaneFlashes(p => ({ ...p, [laneIndex]: true }));
      setTimeout(() => setLaneFlashes(p => ({ ...p, [laneIndex]: false })), 150);

      setCombo(c => {
        const next = c + 1;
        setMaxCombo(m => Math.max(m, next));
        if (next > 0 && next % 10 === 0) addFloat(`OVERDRIVE x${next}!`, 1.5, 150, '#da2d46', 'text-2xl sm:text-4xl');
        return next;
      });

      if (rating === 'sick') {
        setScreenShake(isCrazyMode ? 2 : 1);
        setGlitch(true);
        setTimeout(() => { setScreenShake(0); setGlitch(false); }, 120);
        spawnParticles(laneIndex, laneConfig.color, isCrazyMode ? 25 : 12);
      } else {
        spawnParticles(laneIndex, laneConfig.color, 6);
      }

      audioEngine.playHitSFX(rating === 'bad' ? 'good' : rating);
      setHits(h => ({ ...h, [rating]: h[rating] + 1 }));
      if (isCapture) setCaptureProgress(p => Math.min(100, p + (rating === 'sick' ? 15 : 8)));

    } else {
      setCombo(0);
      setHits(h => ({ ...h, miss: h.miss + 1 }));
      addFloat('MISS', laneIndex, RECEPTOR_Y, '#da2d46', 'text-2xl');
      setScreenShake(1);
      setTimeout(() => setScreenShake(0), 100);
      audioEngine.playHitSFX('miss');
    }
  }, [isCapture, addFloat, isCrazyMode, spawnParticles]);

  // ─── KEYBOARD BINDS ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      LANES.forEach(l => {
        if (e.key === l.key || e.key.toLowerCase() === l.altKey) {
          e.preventDefault();
          handleLaneTrigger(l.index);
        }
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleLaneTrigger]);

  const comboMult = (1 + combo * 0.05).toFixed(1);

  const shakeX = screenShake === 2 ? (Math.random() - 0.5) * 16 : screenShake === 1 ? (Math.random() - 0.5) * 6 : 0;
  const shakeY = screenShake === 2 ? (Math.random() - 0.5) * 16 : screenShake === 1 ? (Math.random() - 0.5) * 6 : 0;
  const shakeRot = screenShake === 2 ? (Math.random() - 0.5) * 3 : 0;

  return (
    <div 
      className={`w-full max-w-xl mx-auto relative border-[3px] sm:border-[5px] border-[#0f0c0c] flex flex-col transition-all duration-75 ${
        isCrazyMode ? 'bg-[#2a0808] shadow-[0_0_30px_#da2d46,inset_0_0_20px_#da2d46]' : 'bg-[#1e2238] shadow-[6px_6px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c]'
      }`}
      style={{ transform: `translate(${shakeX}px, ${shakeY}px) rotate(${shakeRot}deg)` }}
    >
      <style>{`
        @keyframes crazyFloatUp {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.2); }
          15% { opacity: 1; transform: translate(-50%, -20px) scale(1.4); }
          100% { opacity: 0; transform: translate(-50%, -80px) scale(1); }
        }
        @keyframes overdriveScroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
      `}</style>

      {/* Chromatic Glitch Overlay */}
      {glitch && (
        <>
          <div className="absolute inset-0 bg-[#da2d46] mix-blend-screen opacity-50 translate-x-[-6px] pointer-events-none z-[100]" />
          <div className="absolute inset-0 bg-[#38bdf8] mix-blend-screen opacity-50 translate-x-[6px] pointer-events-none z-[100]" />
        </>
      )}

      {/* ── TOP BANNER ── */}
      <div className={`px-2 sm:px-3 py-1.5 sm:py-2 border-b-[3px] border-[#facc15] flex items-center justify-between z-10 relative ${isCrazyMode ? 'bg-[#da2d46] animate-pulse' : 'bg-[#0f0c0c]'}`}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isCrazyMode ? <Flame className="text-[#facc15] animate-bounce w-4 h-4 sm:w-5 sm:h-5" /> : <span className="text-[#facc15] animate-pulse text-sm sm:text-base">⚡</span>}
          <span className={`font-orbitron font-black text-[9px] sm:text-xs tracking-wider uppercase ${isCrazyMode ? 'text-white drop-shadow-[2px_2px_0px_#0f0c0c]' : 'text-[#facc15]'}`}>
            {isCapture ? 'HARMONIC ATTUNEMENT' : isCrazyMode ? 'OVERDRIVE MAXIMUM!' : `RHYTHM ATTACK: ${preset}`}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`font-orbitron font-black text-[8px] sm:text-[10px] ${isCrazyMode ? 'text-white' : 'text-slate-400'}`}>COMBO</span>
          <span className={`font-orbitron font-black text-lg sm:text-xl leading-none drop-shadow-[2px_2px_0px_#0f0c0c] w-6 text-center ${isCrazyMode ? 'text-[#facc15] scale-125' : 'text-[#38bdf8]'}`}>
            {combo}
          </span>
        </div>
      </div>

      {/* ── CAPTURE GAUGE ── */}
      {isCapture && (
        <div className="bg-[#0f0c0c] p-1.5 sm:p-2 border-b-[3px] border-[#38bdf8] flex flex-col gap-1 z-10">
          <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-orbitron font-black text-[#38bdf8] uppercase tracking-wider">
            <span className="flex items-center gap-1"><Disc className="w-3 h-3 animate-spin" /> CAPTURE PROGRESS</span>
            <span>{captureProgress}%</span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-[#1e2238] border border-[#0f0c0c]">
            <div className="h-full bg-gradient-to-r from-[#38bdf8] to-[#facc15] transition-all duration-200" style={{ width: `${captureProgress}%` }} />
          </div>
        </div>
      )}

      {/* ── PLAY AREA (Sleek Highway) ── */}
      {/* ADJUSTED: Added shrink-0 and ensured stable h-[340px] to prevent mobile squish */}
      <div ref={highwayRef} className="relative border-y-[3px] sm:border-y-[4px] border-[#0f0c0c] h-[340px] sm:h-[360px] shrink-0 w-full overflow-hidden flex bg-[#0a0a12] shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]">
        
        {/* Sleek Vertical Highway Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12] via-[#111424] to-[#1a1e36] pointer-events-none z-0" />

        {/* Speedlines / Overdrive Background */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none z-0" 
          style={{ 
            backgroundImage: isCrazyMode 
              ? 'repeating-linear-gradient(180deg, transparent, transparent 20px, #da2d46 20px, #da2d46 40px)' 
              : 'repeating-linear-gradient(180deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)', 
            backgroundSize: '100% 200%',
            animation: 'overdriveScroll 0.5s linear infinite'
          }} 
        />

        {/* Floating Text Overlay */}
        <div className="absolute inset-0 pointer-events-none z-50">
          {floatTexts.map(f => (
            <div 
              key={f.id} 
              className={`absolute font-orbitron font-black uppercase drop-shadow-[3px_3px_0px_#0f0c0c] ${f.fontSize}`}
              style={{
                left: `${(f.lane * 25) + 12.5}%`,
                top: f.y,
                color: f.color,
                animation: `crazyFloatUp 0.5s cubic-bezier(0.1, 0.9, 0.2, 1) forwards`,
                transform: f.rotation 
              }}
            >
              {f.text}
            </div>
          ))}
        </div>

        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none z-[45]">
          {particles.map(p => {
            const op = Math.max(0, p.life / p.maxLife);
            return (
              <div key={p.id} className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 sm:w-3 sm:h-3"
                style={{ left: p.x, top: p.y, backgroundColor: p.color, opacity: op, transform: `scale(${op * 1.5}) rotate(${p.vx * 10}deg)`, boxShadow: `0 0 10px ${p.color}` }} 
              />
            );
          })}
        </div>

        {/* Lane Dividers */}
        <div className="absolute inset-0 flex pointer-events-none z-0">
          {LANES.map((_, i) => (
            <div key={i} className={`flex-1 ${i < LANES.length - 1 ? 'border-r-[2px] border-white/10' : ''}`} />
          ))}
        </div>

        {/* Glowing Hit Line */}
        <div className="absolute left-0 right-0 h-1 bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10 pointer-events-none" style={{ top: RECEPTOR_Y + 15 }} />

        {/* Lanes */}
        {LANES.map(lane => {
          const isActive = activeLanes[lane.index];
          const isFlashing = laneFlashes[lane.index];
          return (
            <div 
              key={lane.index}
              onPointerDown={(e) => { e.preventDefault(); handleLaneTrigger(lane.index); }}
              className="flex-1 relative cursor-pointer touch-none z-20"
            >
              {/* Lane Hit Flash (White-Hot Explosion) */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-white to-transparent pointer-events-none transition-opacity duration-150"
                style={{ opacity: isFlashing ? 0.8 : 0 }} 
              />
              
              {/* Standard Active Pulse */}
              <div 
                className="absolute inset-0 transition-opacity duration-100 pointer-events-none"
                style={{ backgroundColor: lane.color, opacity: isActive ? 0.4 : 0 }} 
              />

              {/* Falling Notes */}
              {notes.filter(n => n.lane === lane.index && !n.hit && !n.miss && n.y > -50 && n.y < 380).map(note => (
                <div 
                  key={note.id}
                  className="absolute left-1/2 -translate-x-1/2 w-12 h-8 sm:w-14 sm:h-10 border-[2px] sm:border-[3px] border-[#0f0c0c] -skew-x-6 flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.8)] z-10"
                  style={{ top: note.y, backgroundColor: lane.color }}
                >
                  <div className="absolute inset-0 border-[1px] sm:border-[2px] border-white/40 pointer-events-none" />
                  <span className="font-orbitron font-black text-white text-sm sm:text-lg leading-none drop-shadow-[1px_1px_0px_#0f0c0c]">
                    {lane.symbol}
                  </span>
                </div>
              ))}

              {/* ADJUSTED: Grouped Receptor and Hint inside a wrapper to anchor them together safely */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-20 w-full"
                style={{ top: RECEPTOR_Y }}
              >
                {/* Receptor Box */}
                <div 
                  className={`w-12 h-10 sm:w-14 sm:h-12 border-[2px] sm:border-[3px] -skew-x-6 flex items-center justify-center transition-all ${
                    isActive ? 'bg-white scale-[1.15] sm:scale-[1.2] shadow-[0_0_20px_currentColor]' : 'bg-[#151828]/90 scale-100 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]'
                  }`}
                  style={{ 
                    borderColor: isActive ? '#ffffff' : lane.color, 
                    color: isActive ? '#0f0c0c' : lane.color 
                  }}
                >
                  <span className="font-orbitron font-black text-lg sm:text-2xl">{lane.symbol}</span>
                </div>

                {/* Input Hint */}
                <div className="mt-2 text-center pointer-events-none">
                  <span className={`px-1.5 sm:px-2 py-0.5 border-[2px] border-[#0f0c0c] font-space-mono font-bold text-[9px] sm:text-[10px] -skew-x-6 transition-colors ${isActive ? 'bg-white text-black' : 'bg-[#0f0c0c] text-white'}`}>
                    {lane.label}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── FOOTER STATS ── */}
      <div className={`p-1.5 sm:p-2 flex justify-between items-center z-10 transition-colors ${isCrazyMode ? 'bg-[#da2d46]' : 'bg-[#0f0c0c]'}`}>
        <div className="flex gap-2 sm:gap-5 px-1 bg-[#0f0c0c]/50 rounded p-1 border border-white/10">
          {[
            { key: 'sick' as const, label: 'SICK', color: 'text-[#facc15]' },
            { key: 'good' as const, label: 'GOOD', color: 'text-[#4ade80]' },
            { key: 'bad'  as const, label: 'BAD',  color: 'text-[#f97316]' },
            { key: 'miss' as const, label: 'MISS', color: 'text-[#da2d46]' },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex flex-col items-center">
              <span className="font-space-mono font-bold text-[7px] sm:text-[9px] text-white leading-tight">{label}</span>
              <span className={`font-orbitron font-black text-[10px] sm:text-sm leading-tight drop-shadow-[1px_1px_0px_#0f0c0c] ${color}`}>{hits[key]}</span>
            </div>
          ))}
        </div>
        
        <div className={`px-2 sm:px-3 py-1 border-[2px] sm:border-[3px] border-[#0f0c0c] -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c] sm:shadow-[3px_3px_0px_0px_#0f0c0c] ${isCrazyMode ? 'bg-[#facc15] text-[#0f0c0c] animate-bounce' : 'bg-[#da2d46] text-white'}`}>
          <span className="font-orbitron font-black text-[8px] sm:text-xs skew-x-6 block">DMG: {comboMult}x</span>
        </div>
      </div>

    </div>
  );
}