import React, { useState, useCallback, useEffect } from 'react';
import type { AppView, ActiveInstrumentProfile, ScanMode, PipelineStatus, GameplayState } from './types';
import { GeminiProvider } from './context/GeminiProvider';
import { audioEngine } from './services/audioSynth';
import { useGemini } from './context/GeminiProvider';
import { ProgressProvider, useProgress } from './context/ProgressProvider';

import { TitleScreen } from './components/TitleScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { MapScreen } from './components/MapScreen';
import { LocationServicesScreen } from './components/LocationServicesScreen';
import { Scanner } from './components/Scanner';
import { PipelineConsole } from './components/PipelineConsole';
import { DiscoveryCard } from './components/DiscoveryCard';
import { GameBoard } from './components/GameBoard';
import { QuizScreen } from './components/QuizScreen';
import { StoryScreen } from './components/StoryScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeInstrumentPipeline } from './services/geminiPipeline';

function InnerApp() {
  const { client } = useGemini();
  const [view, setView] = useState<AppView>('title');
  
  // Pipeline tracking
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    phase: 'idle', label: '', detail: '', progress: 0,
  });
  const [activeProfile, setActiveProfile] = useState<ActiveInstrumentProfile | null>(null);
  const [instrumentName, setInstrumentName] = useState<string | undefined>();
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [pipelineImage, setPipelineImage] = useState<{base64: string, mimeType: string} | null>(null);
  const [finalGameState, setFinalGameState] = useState<GameplayState | null>(null);

  const { recordScan, updateStreak, addXP } = useProgress();

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  const handleStartTitle = useCallback(() => {
    const hasSeenOnboarding = localStorage.getItem('filinstruments_has_seen_onboarding');
    if (hasSeenOnboarding) {
      setView('map');
    } else {
      setView('onboarding');
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('filinstruments_has_seen_onboarding', 'true');
    setView('map');
  }, []);

  const handleQuit = useCallback(() => {
    setActiveProfile(null);
    setPipelineImage(null);
    setInstrumentName(undefined);
    setFinalGameState(null);
    setView('map');
  }, []);

  // 1. Scanner Ready
  const handleImageReady = useCallback(async (base64: string, mimeType: string, mode: ScanMode) => {
    if (!client) return;
    setScanMode(mode);
    setPipelineImage({ base64, mimeType });
    setActiveProfile(null);
    setView('pipeline');

    try {
      const profile = await initializeInstrumentPipeline(
        base64, mimeType, client,
        (status) => {
          setPipelineStatus(status);
          if (status.phase === 'phase1-vision' && status.detail.includes('Identified:')) {
            setInstrumentName(status.detail.replace('Identified: ', ''));
          }
        },
      );

      setActiveProfile(profile);
      setInstrumentName(profile.instrument.name);
      
      await new Promise(r => setTimeout(r, 1200));
      
      // Route based on mode
      if (mode === 'camera') {
        const isNew = recordScan(profile.instrument.name);
        if (isNew) {
          addXP(50, 'discovery');
          setView('discoveryCard');
        } else {
          addXP(10, 'scan');
          setView('gameplay');
        }
      } else {
        setView('gameplay');
      }
    } catch (err) {
      console.error('[App] Pipeline error:', err);
      setPipelineStatus(prev => ({ ...prev, phase: 'error', error: err instanceof Error ? err.message : 'Unknown error', progress: 100 }));
      await new Promise(r => setTimeout(r, 2000));
      
      // Fallback
      if (!activeProfile) {
        const { FALLBACK_PROFILES } = await import('./constants');
        const fallback = { ...FALLBACK_PROFILES.percussion, imageBase64: base64, imageMimeType: mimeType, isFallback: true };
        setActiveProfile(fallback);
        setInstrumentName(fallback.instrument.name);
      }
      setView('gameplay');
    }
  }, [client, activeProfile, recordScan, addXP]);

  // 3. Gameplay finishes
  const handleGameFinish = useCallback((gameState?: GameplayState) => {
    if (gameState) setFinalGameState(gameState);
    if (scanMode === 'camera') {
      setView('quiz');
    } else {
      setView('results');
    }
  }, [scanMode]);

  // 4. Quiz finishes
  const handleQuizComplete = useCallback(() => {
    setView('story');
  }, []);

  // 5. Story finishes
  const handleStoryComplete = useCallback(() => {
    setView('results');
  }, []);

  // 6. Play Again from results
  const handlePlayAgain = useCallback(() => {
    setFinalGameState(null);
    setView('gameplay');
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-light-gray overflow-x-hidden">
      {view === 'title' && (
        <TitleScreen onStart={handleStartTitle} />
      )}

      {view === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}

      {view === 'map' && (
        <MapScreen 
          onOpenScanner={() => setView('scanner')}
          onOpenLocationServices={() => setView('locationServices')}
        />
      )}

      {view === 'locationServices' && (
        <LocationServicesScreen onBack={() => setView('map')} />
      )}

      {view === 'scanner' && (
        <Scanner 
          onImageReady={handleImageReady}
          onBack={handleQuit} 
        />
      )}

      {view === 'pipeline' && pipelineImage && (
        <PipelineConsole 
          status={pipelineStatus} 
          instrumentName={instrumentName} 
        />
      )}

      {view === 'discoveryCard' && activeProfile && (
        <DiscoveryCard 
          profile={activeProfile}
          onContinue={() => setView('gameplay')}
        />
      )}

      {view === 'gameplay' && activeProfile && (
        <GameBoard
          profile={activeProfile}
          onFinish={() => handleGameFinish()}
          onQuit={handleQuit}
        />
      )}

      {view === 'quiz' && activeProfile && (
        <QuizScreen 
          profile={activeProfile}
          onComplete={handleQuizComplete}
        />
      )}

      {view === 'story' && activeProfile && (
        <StoryScreen 
          profile={activeProfile}
          onComplete={handleStoryComplete}
        />
      )}

      {view === 'results' && activeProfile && (
        <ResultsScreen
          gameState={finalGameState ?? {
            score: 0, combo: 0, multiplier: 1, weaveProgress: 0,
            currentStreak: 0, totalNotes: 0, perfectCount: 0,
            goodCount: 0, missCount: 0, isPlaying: false,
            isPaused: false, isFinished: true, isFreePlay: false,
            songTimeSeconds: 60,
          }}
          profile={activeProfile}
          onPlayAgain={handlePlayAgain}
          onNewInstrument={handleQuit}
        />
      )}
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  useEffect(() => {
    const handleGesture = () => {
      audioEngine.resumeSync();
      audioEngine.init().catch(err => {
        console.error('[Audio] Global gesture initialization failed:', err);
      });
    };

    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });
    window.addEventListener('touchend', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        audioEngine.resumeSync(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('touchend', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ProgressProvider>
        <GeminiProvider>
          <InnerApp />
        </GeminiProvider>
      </ProgressProvider>
    </ErrorBoundary>
  );
}
