import { useState, useCallback, useEffect } from 'react';
import { GeminiProvider } from './context/GeminiProvider';
import { audioEngine } from './services/audioSynth';
import { useGemini } from './context/GeminiProvider';
import { Scanner } from './components/Scanner';
import { PipelineConsole } from './components/PipelineConsole';
import { GameBoard } from './components/GameBoard';
import { ResultsScreen } from './components/ResultsScreen';
import { initializeInstrumentPipeline } from './services/geminiPipeline';
import type { AppView, ActiveInstrumentProfile, PipelineStatus, GameplayState } from './types';

// ─── Inner App (needs Gemini context) ─────────────────────────────────────────

function InnerApp() {
  const { client } = useGemini();
  const [view, setView] = useState<AppView>('setup');
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    phase: 'idle', label: '', detail: '', progress: 0,
  });
  const [activeProfile, setActiveProfile] = useState<ActiveInstrumentProfile | null>(null);
  const [finalGameState, setFinalGameState] = useState<GameplayState | null>(null);
  const [instrumentName, setInstrumentName] = useState<string | undefined>();

  const handleImageReady = useCallback(async (base64: string, mimeType: string) => {
    if (!client) return;
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

      // Brief pause so user sees "complete" state
      await new Promise(r => setTimeout(r, 1200));
      setView('gameplay');
    } catch (err) {
      console.error('[App] Pipeline error:', err);
      setPipelineStatus(prev => ({
        ...prev,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        progress: 100,
      }));
      // Auto-recover after 2s with fallback
      await new Promise(r => setTimeout(r, 2000));
      if (!activeProfile) {
        // Import fallback inline
        const { FALLBACK_PROFILES } = await import('./constants');
        setActiveProfile({ ...FALLBACK_PROFILES.percussion, imageBase64: base64, imageMimeType: mimeType, isFallback: true });
      }
      setView('gameplay');
    }
  }, [client, activeProfile]);

  const handleGameFinish = useCallback((gameState?: GameplayState) => {
    if (gameState) setFinalGameState(gameState);
    setView('results');
  }, []);

  const handlePlayAgain = useCallback(() => {
    setFinalGameState(null);
    setView('gameplay');
  }, []);

  const handleNewInstrument = useCallback(() => {
    setActiveProfile(null);
    setFinalGameState(null);
    setInstrumentName(undefined);
    setPipelineStatus({ phase: 'idle', label: '', detail: '', progress: 0 });
    setView('setup');
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-silver overflow-x-hidden">
      {view === 'setup' && (
        <Scanner onImageReady={handleImageReady} />
      )}

      {view === 'pipeline' && (
        <PipelineConsole status={pipelineStatus} instrumentName={instrumentName} />
      )}

      {view === 'gameplay' && activeProfile && (
        <GameBoard
          profile={activeProfile}
          onFinish={() => handleGameFinish()}
          onQuit={handleNewInstrument}
        />
      )}

      {view === 'results' && activeProfile && (
        <ResultsScreen
          gameState={finalGameState ?? {
            score: 0, combo: 0, multiplier: 1, weaveProgress: 0,
            currentStreak: 0, totalNotes: 0, perfectCount: 0,
            goodCount: 0, missCount: 0,
            isPlaying: false,
            isPaused: false,
            isFinished: true,
            isFreePlay: false,
            songTimeSeconds: 60,
          }}
          profile={activeProfile}
          onPlayAgain={handlePlayAgain}
          onNewInstrument={handleNewInstrument}
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

    // Register multiple events to satisfy iOS Safari autoplay policy
    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });
    window.addEventListener('touchend', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });

    // Auto-resume audio when the tab gains focus or visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Pass false so we don't accidentally lazily create the AudioContext outside of a user gesture
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
    <GeminiProvider>
      <InnerApp />
    </GeminiProvider>
  );
}
