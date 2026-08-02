import { useEffect } from 'react';
import { Trophy, Skull, Crosshair, Zap, Timer, ChevronRight, Sparkles } from 'lucide-react';
import { type HarmonydexEntry } from '../../types/expedition';

interface CombatResultModalProps {
  result: {
    victory: boolean;
    xpGained: number;
    capturedEntry?: HarmonydexEntry;
    stats?: {
      totalDamage: number;
      maxCombo: number;
      turnsTaken: number;
      rank: 'S' | 'A' | 'B' | 'C' | 'F';
    };
  };
  onContinue: () => void;
}

export function CombatResultModal({ result, onContinue }: CombatResultModalProps) {
  const { victory, xpGained, capturedEntry } = result;

  const stats = result.stats || {
    totalDamage: victory ? 1450 : 320,
    maxCombo: victory ? 24 : 5,
    turnsTaken: 6,
    rank: victory ? 'S' : 'F',
  };

  // ─── BACKGROUND MUSIC ENGINE ───
  useEffect(() => {
    // Choose track based on battle outcome
    const audioTrack = victory 
      ? '/assets/expedition/victory_theme.mp3' 
      : '/assets/expedition/defeat_theme.mp3';

    const bgm = new Audio(audioTrack);
    bgm.loop = true;
    bgm.volume = 0.5; // Set volume to 50% so it doesn't blast the player's ears
    
    bgm.play().catch((err) => {
      console.warn("Browser autoplay policy prevented result BGM from playing:", err);
    });

    // Cleanup: Stop the music instantly when the component unmounts
    return () => {
      bgm.pause();
      bgm.currentTime = 0;
    };
  }, [victory]);

  const borderColor = victory ? 'border-[#facc15]' : 'border-[#da2d46]';

  return (
    <div className="absolute inset-0 z-50 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto animate-in slide-in-from-bottom-8 fade-in duration-500">
      
      {/* ─── SCAN-STYLE BACKGROUND ─── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#2a2d43]">
        {/* Dark Blue Dotted Pattern */}
        <div 
          className="absolute inset-0 opacity-30" 
          style={{ 
            backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        {/* Thick Black Slanted Divider */}
        <div 
          className="absolute inset-0 bg-[#0f0c0c]" 
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(35% + 12px), 0 calc(65% + 12px))' }} 
        />
        {/* Solid Red Slanted Top */}
        <div 
          className="absolute inset-0 bg-[#da2d46]" 
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 35%, 0 65%)' }} 
        />
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="relative w-full max-w-4xl mx-auto flex flex-col flex-1 gap-6 z-10">
        
        {/* HEADER BANNER */}
        <div className="w-full p-4 sm:p-6 border-[4px] sm:border-[6px] border-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] -skew-x-3 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1e2238]">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-[4px] border-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] text-3xl sm:text-4xl skew-x-3 ${victory ? 'bg-[#facc15] text-[#0f0c0c]' : 'bg-[#da2d46] text-white'}`}>
              {victory ? <Trophy className="fill-current w-10 h-10" /> : <Skull className="fill-current w-10 h-10" />}
            </div>
            <div className="skew-x-3 flex flex-col text-center sm:text-left">
              <span className={`font-orbitron font-black text-2xl sm:text-4xl tracking-widest uppercase drop-shadow-[2px_2px_0px_#0f0c0c] ${victory ? 'text-[#4ade80]' : 'text-[#da2d46]'}`}>
                {victory ? 'TARGET ELIMINATED' : 'EXPEDITION FAILED'}
              </span>
              <span className="font-space-mono font-bold text-xs sm:text-sm text-slate-300 uppercase tracking-widest mt-1">
                {victory ? 'The dissonance has been cleared.' : 'Overwhelming frequencies detected.'}
              </span>
            </div>
          </div>

          {/* Rank Stamp */}
          <div className="skew-x-3 flex flex-col items-center justify-center bg-[#0f0c0c] px-6 py-2 border-[3px] border-slate-700">
            <span className="font-orbitron font-bold text-[10px] text-slate-400 tracking-widest">COMBAT RANK</span>
            <span className={`font-orbitron font-black text-5xl sm:text-6xl leading-none drop-shadow-[0_0_15px_currentColor] ${
              stats.rank === 'S' ? 'text-[#facc15]' :
              stats.rank === 'A' ? 'text-[#4ade80]' :
              stats.rank === 'F' ? 'text-[#da2d46]' : 'text-[#38bdf8]'
            }`}>
              {stats.rank}
            </span>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          
          {/* LEFT: Performance Stats */}
          <div className="bg-[#1e2238]/95 backdrop-blur-sm border-[4px] border-[#0f0c0c] p-5 shadow-[6px_6px_0px_0px_#0f0c0c] flex flex-col gap-4">
            <div className={`border-b-[3px] pb-2 flex items-center gap-2 ${borderColor}`}>
              <Crosshair className={`w-5 h-5 ${victory ? 'text-[#facc15]' : 'text-[#da2d46]'}`} />
              <h3 className="font-orbitron font-black text-lg text-white tracking-widest uppercase">Performance</h3>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <StatRow icon={<Zap className="w-4 h-4 text-[#da2d46]" />} label="Total Damage Dealt" value={stats.totalDamage.toString()} />
              <StatRow icon={<Sparkles className="w-4 h-4 text-[#38bdf8]" />} label="Highest Rhythm Combo" value={`${stats.maxCombo}x`} />
              <StatRow icon={<Timer className="w-4 h-4 text-[#4ade80]" />} label="Turns Taken" value={stats.turnsTaken.toString()} />
            </div>
          </div>

          {/* RIGHT: Rewards & Captures */}
          <div className="bg-[#1e2238]/95 backdrop-blur-sm border-[4px] border-[#0f0c0c] p-5 shadow-[6px_6px_0px_0px_#0f0c0c] flex flex-col gap-4">
            <div className={`border-b-[3px] pb-2 flex items-center gap-2 ${borderColor}`}>
              <Trophy className={`w-5 h-5 ${victory ? 'text-[#facc15]' : 'text-[#da2d46]'}`} />
              <h3 className="font-orbitron font-black text-lg text-white tracking-widest uppercase">Rewards</h3>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              {/* XP Box */}
              <div className="bg-[#0f0c0c] border-[2px] border-slate-700 p-3 flex justify-between items-center -skew-x-2">
                <span className="font-space-mono font-bold text-xs text-slate-300 uppercase skew-x-2">Expedition XP</span>
                <span className={`font-orbitron font-black text-xl skew-x-2 ${victory ? 'text-[#4ade80]' : 'text-slate-500'}`}>
                  +{xpGained}
                </span>
              </div>

              {/* Captured Entity Card */}
              {capturedEntry ? (
                <div className="relative bg-[#0f0c0c] border-[3px] border-[#38bdf8] p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(56,189,248,0.2)] mt-2">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#38bdf8] text-[#0f0c0c] px-3 py-0.5 font-orbitron font-black text-[10px] tracking-widest uppercase -skew-x-6 border-[2px] border-[#0f0c0c]">
                    Anomaly Sealed
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-16 h-16 bg-white border-[2px] border-[#38bdf8] flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] overflow-hidden p-1">
                      <img src={`/assets/instruments/${capturedEntry.id}.png?v=2`} alt={capturedEntry.name} className="w-full h-full object-contain scale-110 mix-blend-multiply" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-orbitron font-black text-lg text-white leading-tight uppercase">
                        {capturedEntry.name}
                      </span>
                      <span className="font-space-mono font-bold text-[10px] text-[#38bdf8] uppercase tracking-wider mb-1">
                        Class: {capturedEntry.type}
                      </span>
                      <span className="text-xs text-slate-300 font-bold bg-[#1e2238] px-2 py-1 border border-slate-700 inline-block w-max">
                        Skill: {capturedEntry.skillName}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0f0c0c] border-[2px] border-slate-800 border-dashed p-4 flex items-center justify-center h-[100px] mt-2">
                  <span className="font-space-mono font-bold text-xs text-slate-500 uppercase tracking-widest">
                    No Anomalies Captured
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-auto pt-4">
          <button
            onClick={onContinue}
            className={`w-full py-4 sm:py-5 border-[4px] sm:border-[6px] border-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] sm:shadow-[8px_8px_0px_0px_#0f0c0c] font-orbitron font-black text-lg sm:text-2xl uppercase -skew-x-3 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-3 ${
              victory 
                ? 'bg-[#facc15] text-[#0f0c0c] hover:bg-[#ffdf3d]' 
                : 'bg-[#da2d46] text-white hover:bg-[#ff3b56]'
            }`}
          >
            <span className="skew-x-3">{victory ? 'CONTINUE EXPEDITION' : 'RETREAT TO BASE'}</span>
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 skew-x-3 font-black" />
          </button>
        </div>

      </div>
    </div>
  );
}

// Reusable component for the stats rows
function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-[#0f0c0c] border-[2px] border-slate-700 p-2.5 px-3">
      <div className="flex items-center gap-3">
        <div className="bg-[#1e2238] p-1.5 border border-slate-600">
          {icon}
        </div>
        <span className="font-space-mono font-bold text-xs text-slate-300 uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-orbitron font-black text-lg text-white drop-shadow-[1px_1px_0px_#0f0c0c]">
        {value}
      </span>
    </div>
  );
}