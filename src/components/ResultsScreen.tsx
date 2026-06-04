import { Trophy, RotateCcw, Home } from 'lucide-react';
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
  return (
    <svg width={100} height={100} className="rotate-[-90deg]">
      <circle cx={50} cy={50} r={r} stroke="#1F2833" strokeWidth={8} fill="none" />
      <circle
        cx={50} cy={50} r={r}
        stroke="url(#acGrad)" strokeWidth={8} fill="none"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="acGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#45A29E" />
          <stop offset="100%" stopColor="#66FCF1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function getRank(accuracy: number): { rank: string; color: string; label: string } {
  if (accuracy >= 95) return { rank: 'S', color: '#66FCF1', label: 'Anting-Anting' };
  if (accuracy >= 85) return { rank: 'A', color: '#45A29E', label: 'Bayani' };
  if (accuracy >= 70) return { rank: 'B', color: '#9B59B6', label: 'Mandirigma' };
  if (accuracy >= 50) return { rank: 'C', color: '#F39C12', label: 'Tagasunod' };
  return { rank: 'D', color: '#FC4445', label: 'Baguhan' };
}

export function ResultsScreen({ gameState, profile, onPlayAgain, onNewInstrument }: ResultsScreenProps) {
  const total = gameState.totalNotes || 1;
  const accuracy = Math.round(((gameState.perfectCount + gameState.goodCount * 0.5) / total) * 100);
  const { rank, color, label } = getRank(accuracy);

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-start px-4 pt-8 pb-20 overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="font-orbitron text-xl font-black text-cyan glow-cyan tracking-wider mb-1">
          SESSION COMPLETE
        </h1>
        <p className="text-teal text-sm font-space-mono">
          {profile.instrument.name} · {profile.instrument.ethnoLinguisticGroup}
        </p>
      </div>

      {/* Rank Card */}
      <div className="w-full max-w-md mb-5">
        <div className="glass-card rounded-2xl border p-6 text-center" style={{ borderColor: `${color}40` }}>
          <div className="flex items-center justify-center gap-6">
            <div className="relative">
              <AccuracyRing accuracy={accuracy} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-orbitron font-black text-sm" style={{ color }}>
                  {accuracy}%
                </span>
              </div>
            </div>
            <div>
              <div
                className="font-orbitron font-black text-6xl mb-1"
                style={{ color, textShadow: `0 0 20px ${color}80` }}
              >
                {rank}
              </div>
              <div className="font-space-mono text-xs" style={{ color }}>
                {label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="w-full max-w-md mb-5">
        <div className="glass-card rounded-xl border border-teal/20 p-5 space-y-4">
          {/* Final Score */}
          <div className="text-center border-b border-teal/10 pb-4">
            <div className="font-orbitron text-3xl font-black text-cyan glow-cyan">
              {gameState.score.toLocaleString()}
            </div>
            <div className="text-silver/50 text-xs font-space-mono">FINAL SCORE</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-orbitron font-bold text-lg text-cyan">{gameState.perfectCount}</div>
              <div className="text-cyan/60 text-xs font-space-mono">TADHANA</div>
            </div>
            <div>
              <div className="font-orbitron font-bold text-lg text-teal">{gameState.goodCount}</div>
              <div className="text-teal/60 text-xs font-space-mono">GANDA</div>
            </div>
            <div>
              <div className="font-orbitron font-bold text-lg text-danger">{gameState.missCount}</div>
              <div className="text-danger/60 text-xs font-space-mono">SABLAY</div>
            </div>
          </div>

          {/* Max Combo */}
          <div className="flex justify-between items-center border-t border-teal/10 pt-3">
            <span className="text-silver/50 text-xs font-space-mono">MAX COMBO</span>
            <span className="font-orbitron font-bold text-teal">{gameState.currentStreak}×</span>
          </div>

          {/* Weave Progress */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-silver/50 text-xs font-space-mono">WEAVE PROGRESS</span>
              <span className="text-cyan text-xs font-space-mono">{Math.round(gameState.weaveProgress)}%</span>
            </div>
            <div className="h-2 bg-charcoal rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal to-cyan rounded-full transition-all duration-1000"
                style={{ width: `${gameState.weaveProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Instrument Info */}
      <div className="w-full max-w-md mb-6">
        <div className="glass-card rounded-xl border border-teal/10 p-4">
          <div className="flex items-start gap-3">
            <Trophy size={16} className="text-teal mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-teal text-xs font-space-mono mb-1">INSTRUMENT PROFILE</div>
              <div className="text-silver text-sm font-medium">{profile.instrument.name}</div>
              <div className="text-silver/50 text-xs mt-1 leading-relaxed">
                {profile.instrument.description}
              </div>
              <div className="text-silver/40 text-xs mt-2 font-space-mono">
                {profile.instrument.hornbostelSachs}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md space-y-3">
        <button
          id="play-again-btn"
          onClick={onPlayAgain}
          className="w-full py-4 rounded-xl font-orbitron text-sm font-bold tracking-widest uppercase
            bg-gradient-to-r from-teal to-cyan text-obsidian
            hover:shadow-lg hover:shadow-cyan/30 active:scale-[0.98] transition-all
            flex items-center justify-center gap-3"
        >
          <RotateCcw size={16} /> PLAY AGAIN
        </button>
        <button
          id="new-instrument-btn"
          onClick={onNewInstrument}
          className="w-full py-4 rounded-xl font-orbitron text-sm font-bold tracking-widest uppercase
            bg-charcoal/60 border border-teal/30 text-teal
            hover:border-teal/60 active:scale-[0.98] transition-all
            flex items-center justify-center gap-3"
        >
          <Home size={16} /> NEW INSTRUMENT
        </button>
      </div>
    </div>
  );
}
