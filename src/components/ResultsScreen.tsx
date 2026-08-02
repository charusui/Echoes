import { Trophy, RotateCcw, Home, ArrowLeft } from 'lucide-react';
import type { GameplayState, ActiveInstrumentProfile } from '../types';

interface ResultsScreenProps {
  gameState: GameplayState;
  profile: ActiveInstrumentProfile;
  onPlayAgain: () => void;
  onNewInstrument: () => void;
}

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = (accuracy / 100) * circ;
  
  // Use flat, stark colors instead of smooth gradients for the comic look
  let color = '#da2d46'; // Crimson
  if (accuracy >= 85) color = '#f0dde0'; // Pale Pink
  if (accuracy >= 95) color = '#66FCF1'; // Cyan for perfect

  return (
    <svg width={100} height={100} className="rotate-[-90deg]">
      {/* Heavy background track */}
      <circle cx={50} cy={50} r={r} stroke="#0f0c0c" strokeWidth={12} fill="none" />
      {/* Sharp fill track */}
      <circle
        cx={50} cy={50} r={r}
        stroke={color} strokeWidth={8} fill="none"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="square" // Square edges instead of round
      />
    </svg>
  );
}

function getRank(accuracy: number): { rank: string; color: string; label: string; bg: string } {
  if (accuracy >= 95) return { rank: 'S', color: '#66FCF1', bg: '#0f0c0c', label: 'Anting-Anting' };
  if (accuracy >= 85) return { rank: 'A', color: '#0f0c0c', bg: '#f0dde0', label: 'Bayani' };
  if (accuracy >= 70) return { rank: 'B', color: '#f0dde0', bg: '#9B59B6', label: 'Mandirigma' };
  if (accuracy >= 50) return { rank: 'C', color: '#0f0c0c', bg: '#F39C12', label: 'Tagasunod' };
  return { rank: 'D', color: '#0f0c0c', bg: '#da2d46', label: 'Baguhan' };
}

export function ResultsScreen({ gameState, profile, onPlayAgain, onNewInstrument }: ResultsScreenProps) {
  // If the user skipped early, only evaluate notes that were actually processed (hit or miss)
  const isSkipped = gameState.isFinished && gameState.songTimeSeconds < 59;
  const total = isSkipped
    ? (gameState.perfectCount + gameState.goodCount + gameState.missCount || 1)
    : (gameState.totalNotes || 1);

  const accuracy = Math.round(((gameState.perfectCount + gameState.goodCount * 0.5) / total) * 100);
  const { rank, color, bg, label } = getRank(accuracy);
  const displayMissCount = isSkipped
    ? gameState.missCount
    : Math.max(0, total - (gameState.perfectCount + gameState.goodCount));

  return (
    <div className="min-h-screen bg-[#2a2d43] flex flex-col items-center justify-start px-4 pt-10 md:pt-12 pb-20 overflow-y-auto overflow-x-hidden pb-12 md:pb-16 pb-safe relative z-0">
      
      {/* Halftone Background Pattern */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }}
      />
      
      {/* Sharp Diagonal Background Cut */}
      <div className="absolute top-0 left-0 w-[120%] h-[35%] bg-[#0f0c0c] -skew-y-3 -translate-y-10 z-[-2] border-b-[8px] border-[#da2d46]" />

      {/* Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-8 relative z-10">
        <button 
          onClick={onNewInstrument}
          className="px-4 py-2 bg-[#f0dde0] border-[3px] border-[#0f0c0c] hover:bg-[#da2d46] text-[#0f0c0c] transition-all flex items-center gap-1.5 font-orbitron text-[10px] md:text-xs font-black tracking-widest uppercase -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none"
        >
          <ArrowLeft size={16} className="skew-x-6 stroke-[3px]" /> 
          <span className="skew-x-6 hidden sm:block">MAP</span>
        </button>
        
        <div className="bg-[#0f0c0c] border-[3px] border-[#da2d46] px-3 py-1 -skew-x-6 shadow-[4px_4px_0px_0px_#da2d46]">
          <span className="font-space-mono text-[9px] md:text-xs text-[#f0dde0] font-black tracking-widest uppercase skew-x-6 block">
            SESSION COMPLETE
          </span>
        </div>
      </div>

      <div className="w-full max-w-md text-center mb-6 relative z-10">
        <h2 
          className="font-orbitron font-black text-[#e0e5ed] text-2xl md:text-3xl tracking-widest uppercase leading-none"
          style={{ textShadow: '3px 3px 0px #0f0c0c, -1px -1px 0px #da2d46' }}
        >
          {profile.instrument.name}
        </h2>
        <div className="inline-block bg-[#0f0c0c] border-[2px] border-[#e0e5ed] px-2 py-0.5 mt-2 -skew-x-6">
          <p className="text-[#e0e5ed] text-[10px] font-space-mono font-bold tracking-widest uppercase skew-x-6 block">
            {profile.instrument.ethnoLinguisticGroup}
          </p>
        </div>
      </div>

      {/* Rank Card */}
      <div className="w-full max-w-md mb-6 relative z-10">
        <div 
          className="border-[6px] border-[#0f0c0c] p-6 text-center -skew-x-2 shadow-[8px_8px_0px_0px_#0f0c0c]" 
          style={{ backgroundColor: bg }}
        >
          <div className="flex items-center justify-center gap-8 skew-x-2">
            
            <div className="relative border-[4px] border-[#0f0c0c] bg-[#2a2d43] rounded-full p-2 shadow-[4px_4px_0px_0px_#0f0c0c]">
              <AccuracyRing accuracy={accuracy} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-orbitron font-black text-sm md:text-base tracking-tighter" style={{ color: color === '#0f0c0c' ? '#e0e5ed' : color }}>
                  {accuracy}%
                </span>
              </div>
            </div>
            
            <div className="text-left">
              <div 
                className="font-orbitron font-black text-7xl md:text-8xl leading-none tracking-tighter"
                style={{ color, textShadow: color === '#0f0c0c' ? '3px 3px 0px #e0e5ed' : '3px 3px 0px #0f0c0c' }}
              >
                {rank}
              </div>
              <div 
                className="font-space-mono text-sm md:text-base font-black tracking-widest uppercase mt-1 px-2 py-0.5 border-[2px] border-[#0f0c0c] inline-block -skew-x-6 shadow-[2px_2px_0px_0px_#0f0c0c]" 
                style={{ backgroundColor: color === '#0f0c0c' ? '#e0e5ed' : '#0f0c0c', color: color === '#0f0c0c' ? '#0f0c0c' : color }}
              >
                <span className="skew-x-6 block">{label}</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Score Breakdown Panel */}
      <div className="w-full max-w-md mb-6 relative z-10">
        <div className="bg-[#e0e5ed] border-[6px] border-[#0f0c0c] p-5 shadow-[8px_8px_0px_0px_#0f0c0c] -skew-x-1">
          
          {/* Final Score Block */}
          <div className="text-center border-b-[4px] border-[#0f0c0c] pb-4 mb-4 skew-x-1">
            <div className="bg-[#0f0c0c] border-[3px] border-[#da2d46] px-4 py-2 inline-block -skew-x-6 shadow-[4px_4px_0px_0px_#da2d46] mb-2">
              <div className="font-orbitron text-4xl md:text-5xl font-black text-[#f0dde0] skew-x-6 tracking-widest">
                {gameState.score.toLocaleString()}
              </div>
            </div>
            <div className="text-[#0f0c0c] font-black text-xs md:text-sm font-space-mono tracking-widest uppercase">
              FINAL SCORE
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center mb-4 skew-x-1">
            <div className="bg-[#f0dde0] border-[3px] border-[#0f0c0c] py-2 -skew-x-2 shadow-[2px_2px_0px_0px_#0f0c0c]">
              <div className="font-orbitron font-black text-xl text-[#0f0c0c] skew-x-2">{gameState.perfectCount}</div>
              <div className="text-[#da2d46] font-black text-[9px] font-space-mono tracking-widest uppercase skew-x-2">SICK</div>
            </div>
            <div className="bg-[#f0dde0] border-[3px] border-[#0f0c0c] py-2 -skew-x-2 shadow-[2px_2px_0px_0px_#0f0c0c]">
              <div className="font-orbitron font-black text-xl text-[#0f0c0c] skew-x-2">{gameState.goodCount}</div>
              <div className="text-[#0f0c0c] font-black text-[9px] font-space-mono tracking-widest uppercase skew-x-2">GOOD</div>
            </div>
            <div className="bg-[#2a2d43] border-[3px] border-[#0f0c0c] py-2 -skew-x-2 shadow-[2px_2px_0px_0px_#0f0c0c]">
              <div className="font-orbitron font-black text-xl text-[#e0e5ed] skew-x-2">{displayMissCount}</div>
              <div className="text-[#da2d46] font-black text-[9px] font-space-mono tracking-widest uppercase skew-x-2">MISS</div>
            </div>
          </div>

          {/* Max Combo & Weave */}
          <div className="bg-[#2a2d43] border-[3px] border-[#0f0c0c] p-3 -skew-x-2 shadow-[4px_4px_0px_0px_#0f0c0c]">
            <div className="flex justify-between items-center mb-2 skew-x-2">
              <span className="text-[#888ea1] font-black text-[10px] font-space-mono tracking-widest uppercase">MAX COMBO</span>
              <span className="font-orbitron font-black text-[#e0e5ed] bg-[#da2d46] px-2 py-0.5 border-[2px] border-[#0f0c0c]">{gameState.currentStreak}×</span>
            </div>

            <div className="skew-x-2">
              <div className="flex justify-between mb-1">
                <span className="text-[#888ea1] font-black text-[10px] font-space-mono tracking-widest uppercase">WEAVE PROGRESS</span>
                <span className="text-[#da2d46] font-black text-[10px] font-space-mono">{Math.round(gameState.weaveProgress)}%</span>
              </div>
              <div className="h-3 bg-[#0f0c0c] border-[2px] border-[#0f0c0c] relative">
                <div
                  className="h-full bg-[#da2d46] transition-all duration-1000"
                  style={{ width: `${gameState.weaveProgress}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Instrument Info */}
      <div className="w-full max-w-md mb-8 relative z-10">
        <div className="bg-[#0f0c0c] border-[4px] border-[#da2d46] p-4 shadow-[6px_6px_0px_0px_#da2d46] -skew-x-2">
          <div className="flex items-start gap-3 skew-x-2">
            <div className="bg-[#da2d46] p-2 border-[2px] border-[#0f0c0c] shadow-[2px_2px_0px_0px_#0f0c0c]">
              <Trophy size={20} className="text-[#0f0c0c] stroke-[2.5px]" />
            </div>
            <div>
              <div className="text-[#da2d46] font-black text-[10px] font-space-mono mb-1 tracking-widest uppercase">INSTRUMENT PROFILE</div>
              <div className="text-[#e0e5ed] font-black text-sm md:text-base uppercase tracking-widest font-orbitron">{profile.instrument.name}</div>
              <div className="text-[#888ea1] text-xs mt-1 leading-relaxed font-space-mono">
                {profile.instrument.description}
              </div>
              <div className="inline-block text-[#0f0c0c] bg-[#e0e5ed] border-[2px] border-[#0f0c0c] font-black text-[9px] mt-3 px-2 py-0.5 font-space-mono uppercase shadow-[2px_2px_0px_0px_#da2d46]">
                HS: {profile.instrument.hornbostelSachs}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-4 relative z-10">
        <button
          id="play-again-btn"
          onClick={onPlayAgain}
          className="w-full py-4 bg-[#da2d46] border-[6px] border-[#0f0c0c] font-orbitron text-sm md:text-base font-black tracking-widest uppercase text-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all flex items-center justify-center gap-3 -skew-x-6"
        >
          <RotateCcw size={18} className="skew-x-6 stroke-[3px]" /> <span className="skew-x-6">PLAY AGAIN</span>
        </button>
        <button
          id="new-instrument-btn"
          onClick={onNewInstrument}
          className="w-full py-4 bg-[#2a2d43] border-[6px] border-[#0f0c0c] font-orbitron text-sm md:text-base font-black tracking-widest uppercase text-[#e0e5ed] shadow-[8px_8px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_#0f0c0c] hover:bg-[#e0e5ed] hover:text-[#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all flex items-center justify-center gap-3 -skew-x-6 group"
        >
          <Home size={18} className="skew-x-6 stroke-[3px] group-hover:text-[#0f0c0c]" /> <span className="skew-x-6">RETURN TO MAP</span>
        </button>
      </div>

    </div>
  );
}