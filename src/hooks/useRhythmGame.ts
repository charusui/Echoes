import { useState, useEffect, useRef, useCallback } from 'react';
import type { Note, GameplayState, InputMapping, HitJudgement, HitResult, Difficulty } from '../types';
import { HIT_WINDOWS, SCORE_VALUES, MULTIPLIER_THRESHOLDS } from '../constants';
import { generateProceduralChart, generateFixedChart } from '../services/chartGenerator';

export function useRhythmGame(
  mapping: InputMapping, 
  onFinish: (state: GameplayState) => void, 
  difficulty: Difficulty,
  version: 'v1' | 'v2',
  duration: number,
  totalLanesOverride?: number,
  onPassiveMiss?: () => void // <-- NEW PARAMETER: Hook calls this when a note drops
) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [gameState, setGameState] = useState<GameplayState>({
    score: 0,
    combo: 0,
    multiplier: 1,
    weaveProgress: 0,
    currentStreak: 0,
    totalNotes: 0,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    isPlaying: false,
    isPaused: false,
    isFinished: false,
    isFreePlay: false,
    songTimeSeconds: 0,
  });

  const startTimeRef = useRef<number | null>(null);
  const notesRef = useRef<Note[]>([]);
  const stateRef = useRef<GameplayState>(gameState);

  // Initialize
  useEffect(() => {
    const chart = difficulty === 'mastery' 
      ? generateProceduralChart(mapping, duration, version, totalLanesOverride)
      : generateFixedChart(mapping, difficulty, duration, version, totalLanesOverride);
      
    setNotes(chart);
    notesRef.current = chart;
    
    setGameState(prev => {
      const newState = { ...prev, totalNotes: chart.length };
      stateRef.current = newState;
      return newState;
    });
  }, [mapping, difficulty, duration, version, totalLanesOverride]);

  // Start the game loop
  const startGame = useCallback(() => {
    startTimeRef.current = performance.now() / 1000;
    setGameState(prev => {
      const newState = { ...prev, isPlaying: true };
      stateRef.current = newState;
      return newState;
    });
  }, []);

  // Update Loop
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isFinished) return;

    let reqId: number;

    const loop = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time / 1000;
      
      const currentTime = (time / 1000) - startTimeRef.current;
      
      // Check for missed notes
      let missedCount = 0;
      const currentNotes = notesRef.current.map(note => {
        if (!note.hit && !note.missed && currentTime > note.time + HIT_WINDOWS.good) {
          missedCount++;
          return { ...note, missed: true };
        }
        return note;
      });

      if (missedCount > 0) {
        notesRef.current = currentNotes;
        setNotes(currentNotes);
        
        setGameState(prev => {
          const newState = {
            ...prev,
            combo: 0, // Reset combo on passive miss
            multiplier: 1, // Reset multiplier
            missCount: prev.missCount + missedCount,
          };
          stateRef.current = newState;
          return newState;
        });

        // Trigger the visual glitch in GameBoard!
        if (onPassiveMiss) {
          onPassiveMiss();
        }
      }

      setGameState(prev => {
        const newState = { ...prev, songTimeSeconds: currentTime };
        stateRef.current = newState;
        return newState;
      });

      if (currentTime >= duration) {
        setGameState(prev => {
          const newState = { ...prev, isPlaying: false, isFinished: true };
          stateRef.current = newState;
          onFinish(newState);
          return newState;
        });
        return;
      }

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [gameState.isPlaying, gameState.isFinished, duration, onFinish, onPassiveMiss]);

  const hitLane = useCallback((laneIndex: number): HitResult | null => {
    if (!stateRef.current.isPlaying || stateRef.current.isFinished) return null;

    const currentTime = stateRef.current.songTimeSeconds;
    
    // Find the earliest unhit/unmissed note in this lane
    const targetNote = notesRef.current.find(n => n.lane === laneIndex && !n.hit && !n.missed);
    
    if (!targetNote) {
      // PENALTY FIX: They tapped an empty lane! Reset their combo.
      setGameState(prev => {
        const newState = { ...prev, combo: 0, multiplier: 1 };
        stateRef.current = newState;
        return newState;
      });
      return null; // Triggers "MISS" indicator in GameBoard
    }
    
    const delta = Math.abs(currentTime - targetNote.time);
    
    let judgement: HitJudgement | null = null;
    if (delta <= HIT_WINDOWS.perfect) judgement = 'perfect';
    else if (delta <= HIT_WINDOWS.good) judgement = 'good';
    else {
      // Early tap penalty
      setGameState(prev => {
        const newState = { ...prev, combo: 0, multiplier: 1 };
        stateRef.current = newState;
        return newState;
      });
      return null;
    }
    
    if (judgement) {
      // Mark as hit
      const currentNotes = notesRef.current.map(n => 
        n.id === targetNote.id ? { ...n, hit: true } : n
      );
      notesRef.current = currentNotes;
      setNotes(currentNotes);

      // Update state
      setGameState(prev => {
        const newCombo = prev.combo + 1;
        const newStreak = Math.max(prev.currentStreak, newCombo);
        
        let newMultiplier = 1;
        for (const thresh of MULTIPLIER_THRESHOLDS) {
          if (newCombo >= thresh.combo) {
            newMultiplier = thresh.multiplier;
            break;
          }
        }

        const scoreAdd = SCORE_VALUES[judgement as HitJudgement] * prev.multiplier;
        const newScore = prev.score + scoreAdd;
        
        const weaveProgress = Math.min(100, (newScore / (prev.totalNotes * SCORE_VALUES.perfect)) * 100);

        const newState = {
          ...prev,
          score: newScore,
          combo: newCombo,
          currentStreak: newStreak,
          multiplier: newMultiplier,
          weaveProgress,
          perfectCount: judgement === 'perfect' ? prev.perfectCount + 1 : prev.perfectCount,
          goodCount: judgement === 'good' ? prev.goodCount + 1 : prev.goodCount,
        };
        stateRef.current = newState;
        return newState;
      });

      return { judgement, noteId: targetNote.id, delta: currentTime - targetNote.time };
    }

    return null;
  }, []);

  return { notes, gameState, startGame, hitLane };
}