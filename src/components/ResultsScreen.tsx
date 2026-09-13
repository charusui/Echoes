import { Trophy, Undo as RotateCcw, Home, ArrowLeft } from 'pixelarticons/react';
import type { GameplayState, ActiveInstrumentProfile } from '../types';
import { PixelBar, PixelButton, PixelChip, PixelPanel } from './ui';
import { cn } from '../lib/cn';

interface ResultsScreenProps {
  gameState: GameplayState;
  profile: ActiveInstrumentProfile;
  onPlayAgain: () => void;
  onNewInstrument: () => void;
}

function getRank(accuracy: number): { rank: string; label: string; text: string; tile: string } {
  if (accuracy >= 95) return { rank: 'S', label: 'Anting-Anting', text: 'text-gold-300', tile: 'bg-gold-500 text-ink' };
  if (accuracy >= 85) return { rank: 'A', label: 'Bayani', text: 'text-heal', tile: 'bg-heal text-ink' };
  if (accuracy >= 70) return { rank: 'B', label: 'Mandirigma', text: 'text-xp', tile: 'bg-xp text-ink' };
  if (accuracy >= 50) return { rank: 'C', label: 'Tagasunod', text: 'text-purple-300', tile: 'bg-purple-500 text-parchment-100' };
  return { rank: 'D', label: 'Baguhan', text: 'text-parchment-300', tile: 'bg-plum-700 text-parchment-100' };
}

export function ResultsScreen({ gameState, profile, onPlayAgain, onNewInstrument }: ResultsScreenProps) {
  // If the user skipped early, only evaluate notes that were actually processed (hit or miss)
  const isSkipped = gameState.isFinished && gameState.songTimeSeconds < 59;
  const total = isSkipped
    ? (gameState.perfectCount + gameState.goodCount + gameState.missCount || 1)
    : (gameState.totalNotes || 1);

  const accuracy = Math.round(((gameState.perfectCount + gameState.goodCount * 0.5) / total) * 100);
  const { rank, label, text, tile } = getRank(accuracy);
  const displayMissCount = isSkipped
    ? gameState.missCount
    : Math.max(0, total - (gameState.perfectCount + gameState.goodCount));

  return (
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col items-center px-4 pt-6 pb-12 pb-safe overflow-x-hidden">
      <div className="w-full max-w-md flex flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <PixelButton size="sm" variant="ghost" icon={<ArrowLeft />} sound="ui_back" onClick={onNewInstrument}>Map</PixelButton>
          <PixelChip tone="heal">Song complete</PixelChip>
        </header>

        <div className="text-center">
          <h1 className="font-bold text-3xl leading-none">{profile.instrument.name}</h1>
          <p className="mt-2 text-sm text-parchment-500">{profile.instrument.ethnoLinguisticGroup}</p>
        </div>

        {/* Rank */}
        <PixelPanel frame="wood" padding="lg" className="flex items-center justify-center gap-6">
          <div className={cn('px-frame size-28 flex flex-col items-center justify-center gap-1', tile)} style={{ ['--frame-bg' as string]: 'transparent' }}>
            <span className="font-label text-6xl leading-none">{rank}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className={cn('font-bold text-2xl leading-none', text)}>{label}</span>
            <PixelBar kind="gold" height={10} segments={10} value={accuracy} label="Accuracy" valueText={`${accuracy}%`} className="w-40" />
          </div>
        </PixelPanel>

        {/* Score */}
        <PixelPanel padding="lg" className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-parchment-500">Final score</p>
            <p className="font-label text-5xl leading-none text-gold-300">{gameState.score.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <StatTile label="Perfect" value={gameState.perfectCount} tone="text-gold-300" />
            <StatTile label="Good" value={gameState.goodCount} tone="text-heal" />
            <StatTile label="Miss" value={displayMissCount} tone="text-hp-light" />
          </div>

          <div className="px-frame px-frame-inset px-frame-sm flex items-center justify-between px-3 py-2">
            <span className="text-sm text-parchment-300">Best combo</span>
            <span className="font-label text-base text-xp">{gameState.currentStreak}×</span>
          </div>
          <PixelBar kind="xp" height={10} value={gameState.weaveProgress} label="Weave progress" valueText={`${Math.round(gameState.weaveProgress)}%`} />
        </PixelPanel>

        {/* Instrument */}
        <PixelPanel frame="parchment" padding="md">
          <div className="flex items-start gap-3">
            <span className="shrink-0 size-10 flex items-center justify-center border-[3px] border-ink bg-gold-500 text-ink">
              <Trophy className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-lg leading-none text-ink">{profile.instrument.name}</p>
              <p className="mt-1 text-sm leading-snug text-wood-700">{profile.instrument.description}</p>
              <PixelChip tone="dark" className="mt-2">HS {profile.instrument.hornbostelSachs}</PixelChip>
            </div>
          </div>
        </PixelPanel>

        <div className="flex flex-col gap-3">
          <PixelButton id="play-again-btn" variant="primary" size="lg" fullWidth icon={<RotateCcw />} onClick={onPlayAgain}>
            Play Again
          </PixelButton>
          <PixelButton id="new-instrument-btn" fullWidth icon={<Home />} sound="ui_back" onClick={onNewInstrument}>
            Back to Map
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="px-frame px-frame-inset px-frame-sm py-2">
      <p className={cn('font-label text-2xl leading-none', tone)}>{value}</p>
      <p className="mt-1 text-xs text-parchment-500">{label}</p>
    </div>
  );
}
