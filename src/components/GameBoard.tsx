import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ActiveInstrumentProfile } from '../types';
import { audioEngine } from '../services/audioSynth';

import { StringEngine } from './StringEngine';
import { WindEngine } from './WindEngine';
import { PercussionEngine } from './PercussionEngine';

interface GameBoardProps {
  profile: ActiveInstrumentProfile;
  onQuit: () => void;
  onFinish?: () => void; // kept for compatibility with App.tsx
}

export function GameBoard({ profile, onQuit }: GameBoardProps) {
  // Ensure AudioContext is running
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioEngine.init();
      } catch (err) {
        console.error("Failed to init audio on mount", err);
      }
    };
    initAudio();
  }, []);

  const renderEngine = () => {
    switch (profile.instrument.category) {
      case 'string':
        return <StringEngine profile={profile} />;
      case 'wind':
        return <WindEngine profile={profile} />;
      case 'percussion':
      default:
        return <PercussionEngine profile={profile} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-obsidian flex flex-col select-none overflow-hidden">
      {/* HUD — Top Navigation */}
      <div className="flex items-center justify-between px-6 pt-safe pt-6 pb-4 bg-obsidian/90 backdrop-blur-sm z-10 border-b border-charcoal">
        <div className="text-left flex flex-col justify-center flex-1 min-w-0 mr-4">
          <div className="text-silver/90 text-sm md:text-base font-space-mono font-bold uppercase tracking-[0.2em] glow-silver truncate">
            {profile.instrument.name}
          </div>
          <div className="text-silver/50 text-[10px] font-space-mono mt-1 truncate">
            {profile.instrument.category.toUpperCase()} INSTRUMENT
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={onQuit}
            className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger active:scale-90 transition-transform hover:bg-danger/20"
            title="Exit Instrument"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Disclaimers if any */}
      {profile.isFallback && (
        <div className="w-full px-8 py-4">
          <div className="bg-danger/20 border border-danger/40 text-danger text-sm font-space-mono p-4 rounded-lg w-full max-w-2xl mx-auto shadow-lg">
            {profile.fallbackReason === 'not-instrument' ? (
              <><span className="font-bold">⚠️ Notice:</span> The image scanned is not an instrument, so here is a {profile.instrument.name} instead!</>
            ) : (
              <><span className="font-bold">⚠️ Notice:</span> We couldn't find enough acoustic data for this specific instrument, or the API limit was reached. We've loaded the closest cultural equivalent so you can still play!</>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Engine Container */}
      {renderEngine()}
      
    </div>
  );
}
