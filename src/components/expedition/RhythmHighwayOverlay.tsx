import { useState, useEffect, useRef, useCallback } from 'react';
import { Disc } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';

interface RhythmHighwayOverlayProps {
  mode: 'attack' | 'capture';
  preset: string;
  isCapture: boolean;
  onComplete: (stats: {
    combo: number;
    hits: Record<string, number>;
    captureProgress?: number;
  }) => void;
}

interface Note {
  id: number;
  lane: number;
  y: number;
  hit: boolean;
  missed: boolean;
}

const LANES = [
  { index: 0, symbol: '◀', label: 'LEFT / A', color: '#da2d46', key: 'ArrowLeft', altKey: 'a' },
  { index: 1, symbol: '▼', label: 'DOWN / S', color: '#38bdf8', key: 'ArrowDown', altKey: 's' },
  { index: 2, symbol: '▲', label: 'UP / W', color: '#4ade80', key: 'ArrowUp', altKey: 'w' },
  { index: 3, symbol: '▶', label: 'RIGHT / D', color: '#facc15', key: 'ArrowRight', altKey: 'd' },
];

export function RhythmHighwayOverlay({
  preset,
  isCapture,
  onComplete,
}: RhythmHighwayOverlayProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState<Record<string, number>>({ sick: 0, good: 0, bad: 0, miss: 0 });
  const [captureProgress, setCaptureProgress] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; id: number } | null>(null);
  const [activeLanePulses, setActiveLanePulses] = useState<Record<number, boolean>>({});

  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const finishedRef = useRef(false);

  // Receptors sit near the bottom
  const RECEPTOR_Y = 280;
  const SPEED = 320; // px/sec

  // Generate deterministic notes chart (short, fast, punchy!)
  useEffect(() => {
    const generated: Note[] = [];
    const count = isCapture ? 8 : 6;
    for (let i = 0; i < count; i++) {
      const lane = Math.floor(Math.sin(i * 12.345) * 4 + 4) % 4;
      const delay = 400 + i * 360;
      generated.push({
        id: i,
        lane,
        y: -((delay / 1000) * SPEED),
        hit: false,
        missed: false,
      });
    }
    setNotes(generated);
    startTimeRef.current = performance.now();
  }, [isCapture]);

  // Animation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setNotes((prevNotes) => {
        let anyMissed = false;
        const updated = prevNotes.map((note) => {
          if (note.hit || note.missed) return note;
          const nextY = note.y + SPEED * dt;

          // Check if missed (went below receptor threshold)
          if (nextY > RECEPTOR_Y + 50) {
            anyMissed = true;
            return { ...note, y: nextY, missed: true };
          }
          return { ...note, y: nextY };
        });

        if (anyMissed) {
          setCombo(0);
          setHits((h) => ({ ...h, miss: h.miss + 1 }));
          setFeedback({ text: 'MISS', color: '#da2d46', id: Math.random() });
          audioEngine.playHitSFX('miss');
        }

        // Check if all finished
        const allDone = updated.every((n) => n.hit || n.missed || n.y > RECEPTOR_Y + 70);
        if (allDone && !finishedRef.current && updated.length > 0) {
          finishedRef.current = true;
          setTimeout(() => {
            onComplete({
              combo: maxCombo,
              hits,
              captureProgress: isCapture ? captureProgress : undefined,
            });
          }, 400);
        }

        return updated;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [maxCombo, hits, captureProgress, isCapture, onComplete]);

  // Handle lane input
  const handleLaneTrigger = useCallback(
    (laneIndex: number) => {
      if (finishedRef.current) return;

      // Pulse visual
      setActiveLanePulses((p) => ({ ...p, [laneIndex]: true }));
      setTimeout(() => {
        setActiveLanePulses((p) => ({ ...p, [laneIndex]: false }));
      }, 120);

      // Check notes near target
      setNotes((prevNotes) => {
        let bestNoteIdx = -1;
        let minDist = 999;

        prevNotes.forEach((note, idx) => {
          if (note.hit || note.missed || note.lane !== laneIndex) return;
          const dist = Math.abs(note.y - RECEPTOR_Y);
          if (dist < 60 && dist < minDist) {
            minDist = dist;
            bestNoteIdx = idx;
          }
        });

        if (bestNoteIdx !== -1) {
          const newNotes = [...prevNotes];
          newNotes[bestNoteIdx] = { ...newNotes[bestNoteIdx]!, hit: true };

          let hitType: 'sick' | 'good' | 'bad' = 'sick';
          let feedbackText = 'SICK!';
          let color = '#4ade80';

          if (minDist > 35) {
            hitType = 'bad';
            feedbackText = 'BAD';
            color = '#f97316';
          } else if (minDist > 18) {
            hitType = 'good';
            feedbackText = 'GOOD!';
            color = '#facc15';
          }

          audioEngine.playHitSFX(hitType === 'bad' ? 'good' : hitType);
          setHits((h) => ({ ...h, [hitType]: h[hitType] + 1 }));

          setCombo((c) => {
            const next = c + 1;
            setMaxCombo((m) => Math.max(m, next));
            return next;
          });

          if (isCapture) {
            setCaptureProgress((p) => Math.min(100, p + (hitType === 'sick' ? 14 : 8)));
          }

          setFeedback({ text: feedbackText, color, id: Math.random() });
          return newNotes;
        } else {
          // Ghost tap / miss penalty
          setCombo(0);
          setHits((h) => ({ ...h, miss: h.miss + 1 }));
          setFeedback({ text: 'SABLAY!', color: '#da2d46', id: Math.random() });
          audioEngine.playHitSFX('miss');
          return prevNotes;
        }
      });
    },
    [isCapture]
  );

  // Bind Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      LANES.forEach((lane) => {
        if (e.key === lane.key || e.key.toLowerCase() === lane.altKey) {
          e.preventDefault();
          handleLaneTrigger(lane.index);
        }
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLaneTrigger]);

  return (
    <div className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] p-4 flex flex-col gap-4 -skew-x-2 animate-in fade-in zoom-in-95 duration-150">
      {/* Highway Top Banner */}
      <div className="bg-[#0f0c0c] px-4 py-2 border-[3px] border-[#facc15] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-orbitron font-black text-xs sm:text-sm text-[#facc15] tracking-wider uppercase">
            {isCapture
              ? 'HARMONIC ATTUNEMENT - PLAY TO SEAL ANOMALY!'
              : `RHYTHM ATTACK - PLAYING ${preset.toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-orbitron font-black text-xs text-white">COMBO:</span>
          <span className="font-orbitron font-black text-lg text-[#38bdf8] drop-shadow-[1px_1px_0px_#0f0c0c]">
            {combo}
          </span>
          <span className="px-2 py-0.5 bg-[#da2d46] text-white font-orbitron font-bold text-2xs -skew-x-6 border border-[#0f0c0c]">
            {(1 + combo * 0.05).toFixed(1)}x DMG
          </span>
        </div>
      </div>

      {/* Capture Gauge if active */}
      {isCapture && (
        <div className="bg-[#0f0c0c] p-3 border-[3px] border-[#38bdf8] flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-2xs font-orbitron font-black text-[#38bdf8] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 animate-spin" />
              <span>HARMONIC CAPTURE ATTUNEMENT PROGRESS</span>
            </span>
            <span>{captureProgress}%</span>
          </div>
          <div className="w-full h-3 bg-[#1e2238] border-[2px] border-[#0f0c0c] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] to-[#facc15] transition-all duration-200"
              style={{ width: `${captureProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Note Tracks Box */}
      <div className="relative bg-[#151828] border-[4px] border-[#0f0c0c] h-[340px] flex justify-around p-2 overflow-hidden">
        {/* Track Lanes */}
        {LANES.map((lane) => {
          const isPulsed = activeLanePulses[lane.index];
          return (
            <div
              key={lane.index}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLaneTrigger(lane.index);
              }}
              className="flex-1 max-w-[80px] h-full flex flex-col justify-between items-center border-x border-[#2a2d43] relative select-none cursor-pointer group active:bg-[#ffffff]/5"
            >
              {/* Lane Background Line */}
              <div className="absolute inset-y-0 w-0.5 bg-[#2a2d43]/50 pointer-events-none z-0" />

              {/* Falling Notes */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {notes
                  .filter((n) => n.lane === lane.index && !n.hit && !n.missed && n.y > -40 && n.y < 340)
                  .map((note) => (
                    <div
                      key={note.id}
                      className="absolute left-1/2 -translate-x-1/2 w-10 sm:w-12 h-10 sm:h-12 border-[3px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c] flex items-center justify-center font-black text-lg transition-transform z-10"
                      style={{
                        top: `${note.y}px`,
                        backgroundColor: lane.color,
                        color: '#0f0c0c',
                      }}
                    >
                      {lane.symbol}
                    </div>
                  ))}
              </div>

              {/* Receptor at bottom */}
              <div
                className={`mt-auto mb-10 w-12 sm:w-14 h-12 sm:h-14 border-[4px] border-[#0f0c0c] flex items-center justify-center text-xl font-black transition-all relative z-20 ${
                  isPulsed
                    ? 'scale-110 shadow-[4px_4px_0px_0px_#ffffff]'
                    : 'bg-[#1e2238] text-white shadow-[3px_3px_0px_0px_#0f0c0c]'
                }`}
                style={{
                  backgroundColor: isPulsed ? lane.color : undefined,
                  color: isPulsed ? '#0f0c0c' : undefined,
                }}
              >
                {lane.symbol}
              </div>

              {/* Key Hint */}
              <span className="text-2xs font-orbitron font-bold uppercase text-slate-300 pb-1 relative z-20 bg-[#151828] px-1.5 rounded">
                {lane.label}
              </span>
            </div>
          );
        })}

        {/* Feedback Popup */}
        {feedback && (
          <div
            key={feedback.id}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-[#0f0c0c] border-[3px] font-orbitron font-black text-2xl tracking-widest -skew-x-6 shadow-[4px_4px_0px_0px_#ffffff] animate-bounce pointer-events-none z-50"
            style={{ borderColor: feedback.color, color: feedback.color }}
          >
            {feedback.text}
          </div>
        )}
      </div>

      <div className="text-center text-2xs font-orbitron font-bold text-slate-400">
        PRESS ARROW KEYS (◀ ▼ ▲ ▶) OR W/A/S/D TO HIT NOTES AS THEY PASS THE RECEPTORS!
      </div>
    </div>
  );
}
