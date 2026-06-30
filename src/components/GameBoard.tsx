//UI Update
import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Play, FastForward, Star } from 'lucide-react';
import type { ActiveInstrumentProfile, GameplayState, Difficulty } from '../types';
import { audioEngine } from '../services/audioSynth';
import { useRhythmGame } from '../hooks/useRhythmGame';
import { PercussionRhythm } from './PercussionRhythm';
import { StringRhythm } from './StringRhythm';
import { WindRhythm } from './WindRhythm';
import { TnalakWeave } from './TnalakWeave';

interface GameBoardProps {
  profile: ActiveInstrumentProfile;
  onQuit: () => void;
  onFinish?: (state?: GameplayState) => void;
  onKorlongHunt?: () => void;
}

export function GameBoard({ profile, onQuit, onFinish, onKorlongHunt }: GameBoardProps) {
  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());
  const [hitIndicator, setHitIndicator] = useState<{ type: 'Tadhana' | 'Ganda' | 'Sablay', text: string, id: number } | null>(null);
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
    return `/audio/songs/${catFolder}/${trackName}`;
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
      type: 'Sablay',
      text: 'SABLAY',
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
      const typeMap = { perfect: 'Tadhana', good: 'Ganda' } as const;
      const textMap = { perfect: 'TADHANA', good: 'GANDA' };
      const jType = hitResult.judgement as 'perfect' | 'good';
      
      setHitIndicator({
        type: typeMap[jType] as any,
        text: textMap[jType],
        id: Math.random() 
      });
      setTimeout(() => setHitIndicator(null), 500);
    } else if (gameState.isPlaying) {
      setHitIndicator({
        type: 'Sablay',
        text: 'SABLAY',
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

  return (
    <div className="fixed inset-0 bg-[#2a2d43] flex flex-col select-none overflow-hidden pb-12 md:pb-16 pb-safe z-0">
      
      {/* HUD — Top Navigation */}
      <div className="flex items-center justify-between px-4 md:px-6 pt-safe pt-6 pb-4 bg-[#e0e5ed] z-20 border-b-[6px] border-[#0f0c0c] shadow-[0px_8px_0px_0px_rgba(15,12,12,0.4)]">
        <button 
          onClick={() => {
            if (audioRef.current) audioRef.current.pause();
            if (typeof window !== 'undefined' && (window as any).korlongHuntAudio) {
              (window as any).korlongHuntAudio.pause();
              (window as any).korlongHuntAudio = null;
            }
            onQuit();
          }}
          className="mr-2 md:mr-4 px-3 md:px-4 py-2 bg-[#f0dde0] border-[3px] border-[#0f0c0c] hover:bg-[#da2d46] text-[#0f0c0c] transition-all duration-200 flex items-center justify-center gap-1.5 font-orbitron text-[10px] md:text-xs font-black tracking-widest uppercase shrink-0 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none"
        >
          <X size={16} className="skew-x-6 stroke-[3px]" /> <span className="skew-x-6 hidden sm:block">ABORT</span>
        </button>

        <div className="text-left flex flex-col justify-center flex-1 min-w-0 mr-2 md:mr-4 skew-x-[-2deg]">
          <div 
            className="text-[#0f0c0c] text-sm md:text-xl font-orbitron font-black uppercase tracking-widest truncate"
            style={{ textShadow: '2px 2px 0px #f0dde0' }}
          >
            {profile.instrument.name}
          </div>
          <div className="inline-block bg-[#0f0c0c] px-2 py-0.5 mt-0.5 w-fit -skew-x-6">
            <span className="text-[#da2d46] text-[8px] md:text-[10px] font-space-mono font-bold tracking-widest skew-x-6 block">
              {profile.instrument.category.toUpperCase()} ENG.
            </span>
          </div>
        </div>

        <div className="flex gap-2 md:gap-4 items-center flex-1 justify-center shrink-0">
          <div className="flex flex-col items-center bg-[#2a2d43] border-[3px] border-[#0f0c0c] px-2 md:px-4 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c]">
            <span className="text-[#888ea1] text-[8px] md:text-[10px] font-space-mono font-bold skew-x-6">SCORE</span>
            <span className="text-[#e0e5ed] font-orbitron font-black text-sm md:text-lg leading-none skew-x-6">
              {Math.floor(gameState.score)}
            </span>
          </div>
          <div className="flex flex-col items-center bg-[#da2d46] border-[3px] border-[#0f0c0c] px-2 md:px-4 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c]">
            <span className="text-[#0f0c0c] text-[8px] md:text-[10px] font-space-mono font-bold skew-x-6">COMBO</span>
            <span key={gameState.combo} className="text-[#0f0c0c] font-orbitron font-black text-sm md:text-lg leading-none skew-x-6 animate-combo-pop block">
              {gameState.combo}x
            </span>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-1 justify-end">
          {!gameState.isPlaying && !gameState.isFinished && selectedDifficulty && (
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.play().catch((e: any) => console.warn(e));
                startGame();
              }}
              className="px-3 md:px-6 h-10 md:h-12 border-[3px] md:border-[4px] border-[#0f0c0c] bg-[#da2d46] text-[#0f0c0c] font-black font-orbitron text-xs md:text-sm -skew-x-6 shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all flex items-center gap-2 group"
            >
              <Play size={16} className="fill-current skew-x-6 group-active:scale-95" /> 
              <span className="skew-x-6 tracking-widest hidden sm:block">START</span>
            </button>
          )}
          {onFinish && !gameState.isFinished && (
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                if (typeof window !== 'undefined' && (window as any).korlongHuntAudio) {
                  (window as any).korlongHuntAudio.pause();
                  (window as any).korlongHuntAudio = null;
                }
                onFinish(gameState);
              }}
              className="px-3 md:px-4 h-10 md:h-12 border-[3px] md:border-[4px] border-[#0f0c0c] bg-[#2a2d43] text-[#e0e5ed] font-space-mono font-bold text-xs -skew-x-6 shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all hover:bg-[#888ea1] hover:text-[#0f0c0c] flex items-center gap-1 group"
            >
              <FastForward size={14} className="skew-x-6 stroke-[3px]" />
              <span className="skew-x-6 hidden md:block">SKIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Disclaimers (Comic Warning Box) */}
      {profile.isFallback && showAlert && (
        <div className="absolute top-24 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
          <div className="w-full max-w-2xl animate-comic-float pointer-events-auto">
            <div className="bg-[#f0dde0] border-[4px] border-[#0f0c0c] text-[#0f0c0c] text-xs md:text-sm font-space-mono font-bold p-3 md:p-4 shadow-[4px_4px_0px_0px_#da2d46] md:shadow-[6px_6px_0px_0px_#da2d46] -skew-x-2 relative pr-10">
              
              <button 
                onClick={() => setShowAlert(false)}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center border-[3px] border-[#0f0c0c] bg-[#da2d46] text-[#0f0c0c] hover:bg-[#0f0c0c] hover:text-[#da2d46] transition-colors skew-x-2 active:translate-y-0.5 active:translate-x-0.5"
              >
                <X size={16} className="stroke-[4px]" />
              </button>

              {profile.fallbackReason === 'not-instrument' ? (
                <p className="skew-x-2">
                  <span className="inline-block bg-[#0f0c0c] text-[#da2d46] px-2 py-0.5 mr-2 font-orbitron uppercase tracking-widest -skew-x-6">! WARNING</span> 
                  Object scanned is not recognized. Booting fallback profile: <span className="font-black border-b-2 border-[#da2d46]">{profile.instrument.name}</span>.
                </p>
              ) : (
                <p className="skew-x-2">
                  <span className="inline-block bg-[#0f0c0c] text-[#da2d46] px-2 py-0.5 mr-2 font-orbitron uppercase tracking-widest -skew-x-6">! ALERT</span> 
                  Acoustic data fragments missing. Loaded closest cultural equivalent for simulation.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Difficulty Selector */}
      {!selectedDifficulty && (
        <div className="absolute inset-0 bg-[#2a2d43]/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-xl w-full bg-[#e0e5ed] border-[6px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#0f0c0c] -skew-x-2 p-6 md:p-8 flex flex-col items-center animate-comic-float">
            <h2 className="font-orbitron font-black text-2xl md:text-4xl text-[#0f0c0c] uppercase tracking-widest skew-x-2 mb-6 text-center">
              Select Difficulty
            </h2>
            <div className="flex flex-col gap-4 w-full skew-x-2">
              <div className="w-full flex flex-col gap-2">
                <button onClick={() => handleSelectDifficulty('apprentice', 'v1')} className="w-full bg-[#da2d46] text-[#0f0c0c] border-[4px] border-[#0f0c0c] p-3 md:p-4 font-space-mono font-bold text-lg md:text-xl hover:bg-[#0f0c0c] hover:text-[#da2d46] transition-colors shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-x-1 active:translate-y-1 active:shadow-none flex justify-between items-center group">
                  <span className="font-black group-hover:scale-105 transition-transform">APPRENTICE (V1)</span> <span className="text-xs md:text-sm bg-[#0f0c0c] text-[#da2d46] px-2 py-1 group-hover:bg-[#da2d46] group-hover:text-[#0f0c0c] transition-colors">Slow</span>
                </button>
                <button onClick={() => handleSelectDifficulty('apprentice', 'v2')} className="w-full bg-[#da2d46] text-[#0f0c0c] border-[4px] border-[#0f0c0c] p-3 md:p-4 font-space-mono font-bold text-lg md:text-xl hover:bg-[#0f0c0c] hover:text-[#da2d46] transition-colors shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-x-1 active:translate-y-1 active:shadow-none flex justify-between items-center group">
                  <span className="font-black group-hover:scale-105 transition-transform">APPRENTICE (V2)</span> <span className="text-xs md:text-sm bg-[#0f0c0c] text-[#da2d46] px-2 py-1 group-hover:bg-[#da2d46] group-hover:text-[#0f0c0c] transition-colors">Slow</span>
                </button>
              </div>

              <div className="w-full flex flex-col gap-2">
                <button onClick={() => handleSelectDifficulty('musician', 'v1')} className="w-full bg-[#da2d46] text-[#0f0c0c] border-[4px] border-[#0f0c0c] p-3 md:p-4 font-space-mono font-bold text-lg md:text-xl hover:bg-[#0f0c0c] hover:text-[#da2d46] transition-colors shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-x-1 active:translate-y-1 active:shadow-none flex justify-between items-center group">
                  <span className="font-black group-hover:scale-105 transition-transform">MUSICIAN {(profile.instrument.category === 'percussion' || profile.instrument.category === 'string') ? '(V1)' : ''}</span> <span className="text-xs md:text-sm bg-[#0f0c0c] text-[#da2d46] px-2 py-1 group-hover:bg-[#da2d46] group-hover:text-[#0f0c0c] transition-colors">Medium</span>
                </button>
                {(profile.instrument.category === 'percussion' || profile.instrument.category === 'string') && (
                  <button onClick={() => handleSelectDifficulty('musician', 'v2')} className="w-full bg-[#da2d46] text-[#0f0c0c] border-[4px] border-[#0f0c0c] p-3 md:p-4 font-space-mono font-bold text-lg md:text-xl hover:bg-[#0f0c0c] hover:text-[#da2d46] transition-colors shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-x-1 active:translate-y-1 active:shadow-none flex justify-between items-center group">
                    <span className="font-black group-hover:scale-105 transition-transform">MUSICIAN (V2)</span> <span className="text-xs md:text-sm bg-[#0f0c0c] text-[#da2d46] px-2 py-1 group-hover:bg-[#da2d46] group-hover:text-[#0f0c0c] transition-colors">Medium</span>
                  </button>
                )}
              </div>

              <div className="w-full flex flex-col gap-2">
                <button onClick={() => handleSelectDifficulty('virtuoso', 'v1')} className="w-full bg-[#da2d46] text-[#0f0c0c] border-[4px] border-[#0f0c0c] p-3 md:p-4 font-space-mono font-bold text-lg md:text-xl hover:bg-[#0f0c0c] hover:text-[#da2d46] transition-colors shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-x-1 active:translate-y-1 active:shadow-none flex justify-between items-center group">
                  <span className="font-black group-hover:scale-105 transition-transform">VIRTUOSO {profile.instrument.category === 'wind' ? '(V1)' : ''}</span> <span className="text-xs md:text-sm bg-[#0f0c0c] text-[#da2d46] px-2 py-1 group-hover:bg-[#da2d46] group-hover:text-[#0f0c0c] transition-colors">Fast</span>
                </button>
                {profile.instrument.category === 'wind' && (
                  <button onClick={() => handleSelectDifficulty('virtuoso', 'v2')} className="w-full bg-[#da2d46] text-[#0f0c0c] border-[4px] border-[#0f0c0c] p-3 md:p-4 font-space-mono font-bold text-lg md:text-xl hover:bg-[#0f0c0c] hover:text-[#da2d46] transition-colors shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-x-1 active:translate-y-1 active:shadow-none flex justify-between items-center group">
                    <span className="font-black group-hover:scale-105 transition-transform">VIRTUOSO (V2)</span> <span className="text-xs md:text-sm bg-[#0f0c0c] text-[#da2d46] px-2 py-1 group-hover:bg-[#da2d46] group-hover:text-[#0f0c0c] transition-colors">Fast</span>
                  </button>
                )}
              </div>
              
              {localStorage.getItem(`mastery_unlocked_${profile.instrument.category}`) === 'true' ? (
                <button onClick={() => handleSelectDifficulty('mastery')} className="w-full bg-[#0f0c0c] text-[#da2d46] border-[4px] border-[#da2d46] p-3 md:p-4 font-space-mono font-black text-lg md:text-xl hover:bg-[#da2d46] hover:text-[#0f0c0c] transition-colors shadow-[4px_4px_0px_0px_#da2d46] active:translate-x-1 active:translate-y-1 active:shadow-none flex justify-between items-center mt-2">
                  <span className="animate-pulse">MASTERY</span> <span className="text-xs md:text-sm bg-[#da2d46] text-[#0f0c0c] px-2 py-1">Endless</span>
                </button>
              ) : (
                <button disabled className="w-full bg-[#888ea1] border-[4px] border-[#0f0c0c] p-3 md:p-4 font-space-mono font-bold text-lg md:text-xl opacity-60 flex flex-col items-start cursor-not-allowed mt-2">
                  <span className="text-[#0f0c0c]">MASTERY <span className="text-xs ml-2">(Locked)</span></span>
                  <span className="text-xs mt-1 bg-[#0f0c0c] text-[#888ea1] px-2 py-1">Achieve 100% Perfect on Virtuoso</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 relative z-10 p-4 pb-8 md:p-8 flex justify-center">
        <div className="w-full h-full max-w-5xl relative border-[6px] md:border-[8px] border-[#0f0c0c] bg-[#2a2d43] shadow-[12px_12px_0px_0px_rgba(15,12,12,0.8)] overflow-hidden">
          
          <div 
            className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(#e0e5ed 2px, transparent 2px)', backgroundSize: '16px 16px' }}
          />

          {hitIndicator && (
            <div 
              key={hitIndicator.id}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center justify-center"
            >
              {hitIndicator.type === 'Tadhana' && (
                <div className="relative animate-comic-hit-pop">
                  <div className="absolute inset-0 bg-[#da2d46] blur-md scale-125 -z-10" />
                  <span 
                    className="font-orbitron font-black text-[#f0dde0] text-5xl md:text-7xl italic tracking-tighter block"
                    style={{ textShadow: '6px 6px 0px #0f0c0c, -4px -4px 0px #da2d46' }}
                  >
                    {hitIndicator.text}!
                  </span>
                </div>
              )}
              {hitIndicator.type === 'Ganda' && (
                <span 
                  className="font-orbitron font-black text-[#e0e5ed] text-4xl md:text-5xl italic tracking-tight block animate-comic-hit-pop"
                  style={{ textShadow: '4px 4px 0px #0f0c0c' }}
                >
                  {hitIndicator.text}
                </span>
              )}
              {hitIndicator.type === 'Sablay' && (
                <span 
                  className="font-orbitron font-black italic tracking-widest block text-4xl md:text-6xl animate-comic-glitch line-through decoration-[#da2d46] decoration-[8px]"
                >
                  {hitIndicator.text}
                </span>
              )}
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
        <div className="absolute top-[15%] md:top-[12%] left-1/2 -translate-x-1/2 z-[100] animate-comic-float cursor-pointer hover:scale-105 transition-transform" onClick={handleKorlongPopupClick}>
          <div className="bg-[#da2d46] border-[4px] border-[#0f0c0c] px-6 py-3 shadow-[6px_6px_0px_0px_#0f0c0c] -skew-x-6 flex items-center gap-3">
            <Star size={24} className="text-[#0f0c0c] skew-x-6 fill-current animate-pulse" />
            <span className="font-orbitron font-black text-[#0f0c0c] text-sm md:text-base uppercase tracking-widest skew-x-6 block">
              KORLONG NEARBY - TAP TO INTERCEPT!
            </span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-[-1] opacity-50">
        <TnalakWeave />
      </div>

      <style>{`
        @keyframes comic-hit-pop {
          0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          30% { transform: scale(1.2) rotate(10deg); opacity: 1; }
          50% { transform: scale(0.9) rotate(-5deg); opacity: 1; }
          80% { transform: scale(1.05) rotate(2deg); opacity: 1; }
          100% { transform: scale(1.1) rotate(5deg); opacity: 0; }
        }
        
        @keyframes comic-glitch {
          0% { transform: translate(4px, 4px) skewX(-10deg); color: #0f0c0c; text-shadow: -3px 0 #da2d46, 3px 0 #e0e5ed; }
          20% { transform: translate(-4px, -2px) skewX(10deg); color: #da2d46; text-shadow: 3px 0 #0f0c0c, -3px 0 #e0e5ed; }
          40% { transform: translate(2px, -4px) skewX(-5deg); color: #0f0c0c; text-shadow: -3px 0 #da2d46, 3px 0 #e0e5ed; }
          60% { transform: translate(-2px, 4px) skewX(5deg); color: #e0e5ed; text-shadow: 3px 0 #0f0c0c, -3px 0 #da2d46; }
          80% { transform: translate(4px, -2px) skewX(-10deg); color: #0f0c0c; text-shadow: -3px 0 #da2d46, 3px 0 #e0e5ed; }
          100% { transform: translate(0, 0) skewX(0); color: #0f0c0c; text-shadow: -2px -2px 0px #da2d46, 2px 2px 0px #da2d46; opacity: 0; }
        }

        @keyframes combo-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4) rotate(-5deg); color: #e0e5ed; text-shadow: 2px 2px 0 #0f0c0c; }
          100% { transform: scale(1); }
        }
        
        /* FIX: Removed translateX(-50%) from the keyframes so it doesn't break Flexbox centering! */
        @keyframes comic-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .animate-comic-hit-pop { animation: comic-hit-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-comic-glitch { animation: comic-glitch 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-combo-pop { animation: combo-pop 0.25s ease-out; }
        .animate-comic-float { animation: comic-float 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}