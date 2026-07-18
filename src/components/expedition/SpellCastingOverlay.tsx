import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Timer } from 'lucide-react';
import { audioEngine } from '../../services/audioSynth';
import { type HeroProfile, type HarmonydexEntry } from '../../types/expedition';

interface SpellCastingOverlayProps {
  hero: HeroProfile;
  instrument: HarmonydexEntry;
  onComplete: (success: boolean, completedPoints: number) => void;
}

interface Waypoint {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

const STAGES = [
  {
    name: 'SHAPE 1 OF 3: ROTARY SPELL CIRCLE',
    instruction: 'HOLD & DRAG IN A 360° CIRCLE TO ATTUNE!',
    pathD: 'M 250, 60 A 190 190 0 1 1 249.9, 60',
    timeLimit: 3.2,
    points: [
      { x: 250, y: 60 }, { x: 335, y: 80 }, { x: 405, y: 140 }, { x: 440, y: 250 },
      { x: 405, y: 360 }, { x: 335, y: 420 }, { x: 250, y: 440 }, { x: 165, y: 420 },
      { x: 95, y: 360 }, { x: 60, y: 250 }, { x: 95, y: 140 }, { x: 165, y: 80 }
    ],
  },
  {
    name: 'SHAPE 2 OF 3: POWER BEAM SLASH',
    instruction: 'QUICK! DRAG RAPIDLY ALONG THE DIAGONAL SLASH!',
    pathD: 'M 80, 100 L 420, 400',
    timeLimit: 2.6,
    points: [
      { x: 80, y: 100 }, { x: 136, y: 150 }, { x: 193, y: 200 }, { x: 250, y: 250 },
      { x: 306, y: 300 }, { x: 363, y: 350 }, { x: 420, y: 400 }
    ],
  },
  {
    name: 'SHAPE 3 OF 3: RUNE SQUARE SIGIL',
    instruction: 'FINAL SIGIL! TRACE ALL 4 CORNERS IN SUCCESSION!',
    pathD: 'M 110, 110 L 390, 110 L 390, 390 L 110, 390 L 110, 110',
    timeLimit: 3.4,
    points: [
      { x: 110, y: 110 }, { x: 250, y: 110 }, { x: 390, y: 110 },
      { x: 390, y: 250 }, { x: 390, y: 390 },
      { x: 250, y: 390 }, { x: 110, y: 390 },
      { x: 110, y: 250 }, { x: 110, y: 110 }
    ],
  },
];

export function SpellCastingOverlay({
  hero,
  instrument,
  onComplete,
}: SpellCastingOverlayProps) {
  const [stageIdx, setStageIdx] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [totalCompletedPoints, setTotalCompletedPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(STAGES[0]!.timeLimit);
  const [isDragging, setIsDragging] = useState(false);

  const stage = STAGES[stageIdx] || STAGES[0]!;
  const timerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const loadStage = useCallback((index: number) => {
    const st = STAGES[index] || STAGES[0]!;
    setWaypoints(
      st.points.map((pt, i) => ({
        id: i,
        x: pt.x,
        y: pt.y,
        hit: false,
      }))
    );
    setTimeLeft(st.timeLimit);
  }, []);

  useEffect(() => {
    loadStage(0);
  }, [loadStage]);

  // Countdown timer
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (finishedRef.current) return prev;
        const next = prev - 0.1;
        if (next <= 0) {
          // Time expired for this stage or all
          if (stageIdx + 1 < STAGES.length) {
            setStageIdx((s) => s + 1);
            loadStage(stageIdx + 1);
            return STAGES[stageIdx + 1]!.timeLimit;
          } else if (!finishedRef.current) {
            finishedRef.current = true;
            onComplete(totalCompletedPoints >= 15, totalCompletedPoints);
          }
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stageIdx, totalCompletedPoints, loadStage, onComplete]);

  // Check waypoint proximity
  const checkHit = useCallback(
    (clientX: number, clientY: number) => {
      if (finishedRef.current) return;
      const svgEl = document.getElementById('spell-trace-svg');
      if (!svgEl) return;

      const rect = svgEl.getBoundingClientRect();
      const scaleX = 500 / rect.width;
      const scaleY = 500 / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      setWaypoints((prev) => {
        let hitIdx = -1;
        prev.forEach((wp, idx) => {
          if (wp.hit) return;
          const dist = Math.hypot(wp.x - x, wp.y - y);
          if (dist < 46 && hitIdx === -1) {
            hitIdx = idx;
          }
        });

        if (hitIdx !== -1) {
          audioEngine.playHitSFX('sick');
          const updated = [...prev];
          updated[hitIdx] = { ...updated[hitIdx]!, hit: true };

          const newTotal = totalCompletedPoints + 1;
          setTotalCompletedPoints(newTotal);

          // Check if all waypoints hit in this stage
          const allStageHit = updated.every((w) => w.hit);
          if (allStageHit && !finishedRef.current) {
            if (stageIdx + 1 < STAGES.length) {
              setTimeout(() => {
                setStageIdx((s) => s + 1);
                loadStage(stageIdx + 1);
              }, 200);
            } else {
              finishedRef.current = true;
              setTimeout(() => {
                onComplete(true, newTotal);
              }, 300);
            }
          }

          return updated;
        }
        return prev;
      });
    },
    [totalCompletedPoints, stageIdx, loadStage, onComplete]
  );

  return (
    <div 
      onPointerDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
        checkHit(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!isDragging) return;
        e.preventDefault();
        checkHit(e.clientX, e.clientY);
      }}
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
      className="bg-[#1e2238] border-[5px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] p-4 flex flex-col gap-3 -skew-x-2 animate-in fade-in zoom-in-95 duration-150 select-none cursor-crosshair touch-none"
    >
      {/* Top Header Bar */}
      <div className="bg-[#0f0c0c] px-4 py-2.5 border-[3px] border-[#facc15] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#facc15] animate-spin" />
          <div className="flex flex-col">
            <span className="font-orbitron font-black text-xs sm:text-sm text-[#facc15] tracking-wider uppercase">
              {stage.name}
            </span>
            <span className="text-2xs text-white font-bold">{stage.instruction}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#da2d46] text-white border-[2px] border-[#0f0c0c] font-orbitron font-black text-xs uppercase -skew-x-6">
            <Timer className="w-3.5 h-3.5" />
            <span>TIME: {timeLeft.toFixed(1)}s</span>
          </div>
          <span className="px-2 py-1 bg-[#38bdf8] text-[#0f0c0c] font-orbitron font-black text-xs uppercase -skew-x-6 border border-[#0f0c0c]">
            PTS: {totalCompletedPoints}/28
          </span>
        </div>
      </div>

      {/* SVG Tracing Area */}
      <div className="relative bg-[#151828] border-[4px] border-[#0f0c0c] aspect-square max-w-[420px] mx-auto w-full flex items-center justify-center p-2">
        <svg id="spell-trace-svg" viewBox="0 0 500 500" className="w-full h-full">
          {/* Background Guidance Path */}
          <path
            d={stage.pathD}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Active Path */}
          <path
            d={stage.pathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="10 10"
          />

          {/* Waypoints */}
          {waypoints.map((wp) => (
            <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
              <circle
                r="22"
                fill={wp.hit ? '#4ade80' : '#1e2238'}
                stroke={wp.hit ? '#ffffff' : '#facc15'}
                strokeWidth="4"
                className="transition-all"
              />
              <circle r="8" fill={wp.hit ? '#ffffff' : '#da2d46'} />
              {wp.hit && (
                <text
                  y="4"
                  textAnchor="middle"
                  fontSize="14"
                  fontFamily="Orbitron, sans-serif"
                  fontWeight="900"
                  fill="#0f0c0c"
                >
                  ✓
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hero Avatar Badge overlay in corner */}
        <div className="absolute bottom-3 left-3 bg-[#0f0c0c] border-[2px] border-[#0f0c0c] px-3 py-1 flex items-center gap-2 -skew-x-6 shadow-[2px_2px_0px_0px_#facc15]">
          <span className="text-xl">{hero.avatar}</span>
          <span className="font-orbitron font-bold text-xs text-white uppercase">
            {hero.name}: {instrument.skillName}
          </span>
        </div>
      </div>

      <div className="text-center text-2xs font-orbitron font-bold text-slate-400 uppercase tracking-wide">
        HOLD DOWN MOUSE OR TOUCH AND SWIPE ACROSS THE GLOWING WAYPOINTS TO ATTUNE YOUR ULTIMATE!
      </div>
    </div>
  );
}
