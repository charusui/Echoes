//UI Update
import { useEffect, useState, useCallback, useRef } from 'react';
import { Close as X, Play, Forward as FastForward, Star, InfoBox } from 'pixelarticons/react';
import { PixelButton, PixelIconButton, PixelToast } from './ui';
import { cn } from '../lib/cn';
import type { ActiveInstrumentProfile, GameplayState, Difficulty } from '../types';
import { audioEngine } from '../services/audioSynth';
import { useRhythmGame } from '../hooks/useRhythmGame';
import { PercussionRhythm } from './PercussionRhythm';
import { StringRhythm } from './StringRhythm';
import { WindRhythm } from './WindRhythm';
import { TnalakWeave } from './TnalakWeave';
import { RhythmDifficultySelect } from './RhythmDifficultySelect';

interface GameBoardProps {
  profile: ActiveInstrumentProfile;
  onQuit: () => void;
  onFinish?: (state?: GameplayState) => void;
  onKorlongHunt?: () => void;
}

export function GameBoard({ profile, onQuit, onFinish, onKorlongHunt }: GameBoardProps) {
  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());
  const [hitIndicator, setHitIndicator] = useState<{ type: 'Sick' | 'Good' | 'Miss', text: string, id: number } | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const [showKorlongPopup, setShowKorlongPopup] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<'v1' | 'v2'>('v1');
  const [audioDuration, setAudioDuration] = useState<number>(60);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleFinishGame = useCallback((state: GameplayState) => {
    if (selectedDifficulty === 'virtuoso' && state.perfectCount === state.totalNotes && state.totalNotes > 0) {
      localStorage.setItem(`mastery_unlocked_${profile.instrument.category}`, 'true');
    }
    if (audioRef.current) audioRef.current.pause();
    if (onFinish) onFinish(state);
  }, [onFinish, selectedDifficulty, profile.instrument.category]);

  const getAudioPath = (category: string, difficulty: Difficulty, version: 'v1' | 'v2' = 'v1') => {
    let catFolder = '';
    let trackName = '';
    if (category === 'percussion') {
      catFolder = 'percussion/Percussion';
      if (difficulty === 'apprentice') trackName = version === 'v2' ? 'Slow v2.mp3' : 'Slow.mp3';
      else if (difficulty === 'musician') trackName = version === 'v2' ? 'Moderate v2.mp3' : 'Moderate.mp3';
      else trackName = 'Fast.mp3';
    } else if (category === 'string') {
      catFolder = 'strings/Strings';
      if (difficulty === 'apprentice') trackName = version === 'v2' ? 'Slow v2.mp3' : 'Slow.mp3';
      else if (difficulty === 'musician') trackName = version === 'v2' ? 'Moderate v2.mp3' : 'Moderate.mp3';
      else trackName = 'Fast.mp3'; 
    } else {
      catFolder = 'wind/Wind';
      if (difficulty === 'apprentice') trackName = version === 'v2' ? 'Slow v2.mp3' : 'Slow.mp3';
      else if (difficulty === 'musician') trackName = 'Moderate.mp3';
      else trackName = version === 'v2' ? 'Fast v2.mp3' : 'Fast.mp3';
    }
    return `/assets/audio/songs/${catFolder}/${trackName}`;
  };

  const handleSelectDifficulty = (diff: Difficulty, version: 'v1' | 'v2' = 'v1') => {
    setSelectedDifficulty(diff);
    setSelectedVersion(version);
    const path = getAudioPath(profile.instrument.category, diff, version);
    const audio = new Audio(path);
    if (diff === 'mastery') {
       audio.loop = true;
       setAudioDuration(9999); 
    }
    audio.addEventListener('loadedmetadata', () => {
      if (diff !== 'mastery') setAudioDuration(audio.duration);
    });
    audioRef.current = audio;
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const handlePassiveMiss = useCallback(() => {
    setHitIndicator({
      type: 'Miss',
      text: 'MISS',
      id: Math.random()
    });
    setTimeout(() => setHitIndicator(null), 400);
  }, []);

  const totalLanesOverride = profile.instrument.category === 'string' ? profile.acoustic.scaleNotes.length : undefined;
  
  // Hook call consolidated into one block
  const { notes, gameState, startGame, hitLane } = useRhythmGame(
    profile.inputMapping, 
    handleFinishGame, 
    selectedDifficulty || 'apprentice',
    selectedVersion,
    audioDuration,
    totalLanesOverride,
    handlePassiveMiss
  );

  // Interaction Logic
  useEffect(() => {
    const handleInteraction = (e: Event) => {
      if (!gameState.isPlaying && !gameState.isFinished && selectedDifficulty) {
        if (e instanceof KeyboardEvent && ['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
          e.preventDefault();
        }
        if (audioRef.current) {
           audioRef.current.play().catch((err: any) => console.warn("Audio play failed:", err));
        }
        startGame();
        setShowAlert(false);
      }
    };

    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [gameState.isPlaying, gameState.isFinished, startGame, selectedDifficulty]);

  const triggerLane = useCallback((laneId: number) => {
    const isString = profile.instrument.category === 'string';
    const isValidStringLane = isString && laneId >= 0 && laneId < profile.acoustic.scaleNotes.length;
    const lane = profile.inputMapping.lanes.find(l => l.id === laneId);
    
    if (!lane && !isValidStringLane) return;
    
    const hitResult = hitLane(laneId);
    
    if (hitResult) {
      const typeMap = { perfect: 'Sick', good: 'Good' } as const;
      const textMap = { perfect: 'SICK', good: 'GOOD' };
      const jType = hitResult.judgement as 'perfect' | 'good';
      
      setHitIndicator({
        type: typeMap[jType] as any,
        text: textMap[jType],
        id: Math.random() 
      });
      setTimeout(() => setHitIndicator(null), 500);
    } else if (gameState.isPlaying) {
      setHitIndicator({
        type: 'Miss',
        text: 'MISS',
        id: Math.random()
      });
      setTimeout(() => setHitIndicator(null), 400);
    }

    setActiveLanes(prev => {
      const next = new Set(prev);
      next.add(laneId);
      return next;
    });

    setTimeout(() => {
      setActiveLanes(prev => {
        const next = new Set(prev);
        next.delete(laneId);
        return next;
      });
    }, 100);
  }, [profile.inputMapping.lanes, hitLane, gameState.isPlaying, profile.instrument.category, profile.acoustic.scaleNotes.length]);

  // Demo Logic for Korlong
  useEffect(() => {
    if (gameState.isPlaying && localStorage.getItem('echoes_demo_korlong_gameplay') === '1') {
      const t = setTimeout(() => {
        setShowKorlongPopup(true);
      }, 5000); // Popup appears 5 seconds into gameplay
      return () => clearTimeout(t);
    }
  }, [gameState.isPlaying]);

  const handleKorlongPopupClick = useCallback(() => {
    setShowKorlongPopup(false);
    
    // Pause the rhythmic gameplay music
    audioEngine.suspend();
    
    if (onKorlongHunt) {
      onKorlongHunt();
    }
  }, [onKorlongHunt]);

  const stopAllAudio = () => {
    if (audioRef.current) audioRef.current.pause();
    if (typeof window !== 'undefined' && (window as any).korlongHuntAudio) {
      (window as any).korlongHuntAudio.pause();
      (window as any).korlongHuntAudio = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-plum-950 text-parchment-100 flex flex-col select-none overflow-hidden pb-safe z-0">

      {/* HUD */}
      <header className="shrink-0 z-20 bg-plum-900 border-b-[3px] border-ink px-3 md:px-6 pt-safe py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <PixelIconButton icon={<X />} label="Quit song" sound="ui_back" onClick={() => { stopAllAudio(); onQuit(); }} />
          <div className="min-w-0">
            <p className="font-bold text-lg md:text-2xl leading-none truncate">{profile.instrument.name}</p>
            <p className="mt-1 text-xs text-parchment-500">{profile.instrument.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="px-frame px-frame-inset px-frame-sm flex flex-col items-center px-3 py-1">
            <span className="text-xs text-parchment-500">Score</span>
            <span className="font-label text-[8px] md:text-base leading-none text-parchment-100">{Math.floor(gameState.score)}</span>
          </div>
          <div className="px-frame px-frame-inset px-frame-sm flex flex-col items-center px-3 py-1">
            <span className="text-xs text-parchment-500">Combo</span>
            <span key={gameState.combo} className="font-label text-[8px] md:text-base leading-none text-gold-300 animate-combo-pop">
              {gameState.combo}×
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          {!gameState.isPlaying && !gameState.isFinished && selectedDifficulty && (
            <PixelButton
              variant="primary"
              icon={<Play />}
              onClick={() => {
                if (audioRef.current) audioRef.current.play().catch((e: any) => console.warn(e));
                startGame();
              }}
            >
              Start
            </PixelButton>
          )}
          {onFinish && !gameState.isFinished && (
            <PixelButton size="sm" variant="ghost" icon={<FastForward />} onClick={() => { stopAllAudio(); onFinish(gameState); }}>
              <span className="hidden md:inline">Skip</span>
            </PixelButton>
          )}
        </div>
      </header>

      {/* Fallback notice */}
      {profile.isFallback && showAlert && (
        <div className="absolute top-24 inset-x-0 px-4 flex justify-center z-50 pointer-events-none">
          <div className="w-full max-w-2xl pointer-events-auto">
            <PixelToast icon={<InfoBox />} className="w-full max-w-none pr-14">
              {profile.fallbackReason === 'not-instrument'
                ? <>We didn't recognize that object, so we loaded <strong className="font-semibold text-gold-300">{profile.instrument.name}</strong> instead.</>
                : <>Some sound data was missing, so we loaded the closest matching instrument.</>}
            </PixelToast>
            <PixelIconButton className="absolute top-2 right-6 size-9" icon={<X />} label="Dismiss" sound="ui_back" onClick={() => setShowAlert(false)} />
          </div>
        </div>
      )}

      {!selectedDifficulty && (
        <RhythmDifficultySelect profile={profile} onSelectDifficulty={handleSelectDifficulty} onBack={onQuit} />
      )}

      {/* Game Area */}
      <div className="flex-1 relative z-10 p-3 md:p-6 flex justify-center">
        <div className="px-frame px-frame-wood w-full h-full max-w-5xl relative overflow-hidden" style={{ padding: 0 }}>
          {hitIndicator && (
            <div key={hitIndicator.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
              <span
                className={cn(
                  'block font-bold leading-none [text-shadow:0_6px_0_var(--color-ink)] animate-hit-pop',
                  hitIndicator.type === 'Sick' && 'text-6xl md:text-8xl text-gold-300',
                  hitIndicator.type === 'Good' && 'text-5xl md:text-6xl text-heal',
                  hitIndicator.type === 'Miss' && 'text-4xl md:text-6xl text-hp-light',
                )}
              >
                {hitIndicator.type === 'Sick' ? `${hitIndicator.text}!` : hitIndicator.text}
              </span>
            </div>
          )}

          <div className="relative z-10 w-full h-full">
            {profile.instrument.category === 'percussion' && (
              <PercussionRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={triggerLane} activeLanes={activeLanes} />
            )}
            {profile.instrument.category === 'string' && (
              <StringRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={triggerLane} activeLanes={activeLanes} />
            )}
            {profile.instrument.category === 'wind' && (
              <WindRhythm profile={profile} notes={notes} gameState={gameState} onLaneHit={triggerLane} activeLanes={activeLanes} />
            )}
          </div>
        </div>
      </div>

      {showKorlongPopup && (
        <div className="absolute top-[15%] md:top-[12%] left-1/2 -translate-x-1/2 z-[100]">
          <PixelButton variant="primary" size="lg" icon={<Star />} className="animate-bounce" onClick={handleKorlongPopupClick}>
            A Korlong is nearby! Tap to find it
          </PixelButton>
        </div>
      )}

      <div className="absolute inset-0 z-[-1] opacity-40">
        <TnalakWeave />
      </div>

      <style>{`
        @keyframes hit-pop {
          0% { transform: scale(0.4); opacity: 0; }
          30% { transform: scale(1.15); opacity: 1; }
          70% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.05); opacity: 0; }
        }
        @keyframes combo-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        .animate-hit-pop { animation: hit-pop 0.5s steps(8) forwards; }
        .animate-combo-pop { animation: combo-pop 0.25s steps(4); }
      `}</style>
    </div>
  );
}
