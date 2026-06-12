import { useState, useCallback, useEffect } from 'react';
import type { AppView, ActiveInstrumentProfile, ScanMode, PipelineStatus, GameplayState, VerificationResult } from './types';
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
import { CollectionScreen } from './components/CollectionScreen';
import { ScanVerificationScreen } from './components/ScanVerificationScreen';
import { KorlongHuntScreen } from './components/KorlongHuntScreen';
import { TeachableStudentScreen } from './components/TeachableStudentScreen';
import { DevMenu } from './components/DevMenu';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeInstrumentPipeline } from './services/geminiPipeline';
import { MASTER_INSTRUMENTS, FALLBACK_PROFILES, KORLONG_INSTRUMENT } from './constants';

function InnerApp() {
  const { client } = useGemini();
  const [view, setView] = useState<AppView>('title');
  
  // Pipeline tracking
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    phase: 'idle', label: '', detail: '', progress: 0,
  });
  const [activeProfile, setActiveProfile] = useState<ActiveInstrumentProfile | null>(null);
  const [instrumentName, setInstrumentName] = useState<string | undefined>();
  const [pipelineImage, setPipelineImage] = useState<{base64: string, mimeType: string} | null>(null);
  const [finalGameState, setFinalGameState] = useState<GameplayState | null>(null);
  // Pending image held while ScanVerificationScreen runs
  const [pendingImageData, setPendingImageData] = useState<{base64: string; mimeType: string} | null>(null);

  const { recordScan, updateStreak, addXP, progress, saveCustomProfile, addPendingReview } = useProgress();

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

  const handleSelectInstrument = useCallback((selectedInstrumentName: string) => {
    // Determine which fallback profile template to use based on categories of the 14 instruments
    const INSTRUMENT_CATEGORIES: Record<string, 'string' | 'wind' | 'percussion'> = {
      // Western
      'tultugan': 'percussion',
      'buktot': 'string',
      'pasiyak': 'wind',
      'tulali': 'wind',
      'tugo': 'percussion',
      'litguit': 'percussion',
      // Central
      'cebuano gitara': 'string',
      'bandurria': 'string',
      'laud': 'string',
      'octavina': 'string',
      'bajo de uñas': 'string',
      // Eastern
      'lantoy': 'wind',
      'subing': 'percussion',
      'korlong': 'string',
    };

    const nameLower = selectedInstrumentName.toLowerCase();
    const category = INSTRUMENT_CATEGORIES[nameLower] || 'percussion';
    const profileTemplate = FALLBACK_PROFILES[category];

    const profile: ActiveInstrumentProfile = {
       ...profileTemplate,
       isFallback: true,
       fallbackReason: 'map-selection',
       imageBase64: '',
       imageMimeType: ''
    };
    
    // Override the generic name with the specific regional instrument
    profile.instrument = {
      ...profileTemplate.instrument,
      name: selectedInstrumentName,
      localName: selectedInstrumentName,
      region: MASTER_INSTRUMENTS.find(i => i.name.toLowerCase() === nameLower)?.region || 'Visayas',
    };
    
    setActiveProfile(profile);
    setInstrumentName(selectedInstrumentName);
    
    // Skip scanner pipeline, go straight to gameplay
    setView('gameplay');
  }, []);

  const handleSelectCustomProfile = useCallback((profile: any) => {
    setActiveProfile(profile);
    setInstrumentName(profile.instrument.name);
    setView('gameplay');
  }, []);

  // Shared pipeline processor
  const processImage = useCallback(async (base64: string, mimeType: string, verificationResult: VerificationResult) => {
    if (!client) return;
    setPipelineImage({ base64, mimeType });
    setActiveProfile(null);
    setView('pipeline');

    // XP multiplier based on verification method
    const xpMultiplier = verificationResult.method === 'gps' ? 1.0
      : verificationResult.method === 'webxr' ? 0.8
      : verificationResult.method === 'community' ? 0.2
      : 0; // upload gives no XP

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

      // Attach verification result to profile
      profile.verificationResult = verificationResult;
      setActiveProfile(profile);
      setInstrumentName(profile.instrument.name);

      if (verificationResult.method === 'community') {
        addPendingReview(verificationResult);
      }

      await new Promise(r => setTimeout(r, 1200));

      const parsedName = profile.instrument.name;
      const matchedMaster = MASTER_INSTRUMENTS.find(
        inst => inst.name.toLowerCase() === parsedName.toLowerCase()
      );

      if (matchedMaster) {
        profile.instrument.name = matchedMaster.name;
        const isNew = recordScan(matchedMaster.name);
        if (isNew) {
          if (xpMultiplier > 0) addXP(Math.round(50 * xpMultiplier), 'discovery');
          setView('discoveryCard');
        } else {
          if (xpMultiplier > 0) addXP(Math.round(10 * xpMultiplier), 'scan');
          setView('gameplay');
        }
      } else {
        const profileId = parsedName || `Custom Instrument ${Date.now()}`;
        const isNewCustom = !progress.customProfiles || !progress.customProfiles[profileId];
        saveCustomProfile(profileId, profile);
        if (isNewCustom) {
          if (xpMultiplier > 0) addXP(Math.round(20 * xpMultiplier), 'custom_discovery');
          setView('discoveryCard');
        } else {
          if (xpMultiplier > 0) addXP(Math.round(5 * xpMultiplier), 'custom_scan');
          setView('gameplay');
        }
      }
    } catch (err) {
      console.error('[App] Pipeline error:', err);
      setPipelineStatus(prev => ({ ...prev, phase: 'error', error: err instanceof Error ? err.message : 'Unknown error', progress: 100 }));
      await new Promise(r => setTimeout(r, 2000));
      if (!activeProfile) {
        const fallback = { ...FALLBACK_PROFILES.percussion, imageBase64: base64, imageMimeType: mimeType, isFallback: true };
        setActiveProfile(fallback);
        setInstrumentName(fallback.instrument.name);
      }
      setView('gameplay');
    }
  }, [client, activeProfile, recordScan, addXP, saveCustomProfile, addPendingReview, progress.customProfiles]);

  const handleVerificationComplete = useCallback(async (verificationResult: VerificationResult) => {
    if (!pendingImageData) return;
    processImage(pendingImageData.base64, pendingImageData.mimeType, verificationResult);
  }, [pendingImageData, processImage]);

  // 1. Scanner captures image → intercept for verification
  const handleImageReady = useCallback(async (base64: string, mimeType: string, mode: ScanMode) => {
    if (mode === 'upload') {
      processImage(base64, mimeType, { method: 'upload', timestamp: new Date().toISOString() });
    } else {
      setPendingImageData({ base64, mimeType });
      setView('scanVerification');
    }
  }, [processImage]);

  const handleVerificationCancel = useCallback(() => {
    setPendingImageData(null);
    setView('scanner');
  }, []);

  // Korlong discovered via GPS hunt
  const handleKorlongDiscovered = useCallback(() => {
    const isNew = recordScan(KORLONG_INSTRUMENT.name);
    if (isNew) addXP(100, 'korlong_hunt');
    // Build a minimal profile for the discovery card
    const korlongProfile: ActiveInstrumentProfile = {
      ...FALLBACK_PROFILES.string,
      isFallback: true,
      fallbackReason: 'map-selection',
      imageBase64: '',
      imageMimeType: '',
    };
    korlongProfile.instrument = {
      ...FALLBACK_PROFILES.string.instrument,
      name: KORLONG_INSTRUMENT.name,
      localName: 'Korlong',
      ethnoLinguisticGroup: 'Waray-Waray / Eastern Visayan',
      culturalPurpose: 'Critically endangered two-stringed fiddle, rarely heard today',
      category: 'string',
      description: 'A critically endangered two-stringed fiddle from Eastern Visayas, traditionally using abaca or horsehair strings. One of the rarest instruments in the Visayan archipelago.',
      region: 'Eastern Visayas',
    };
    setActiveProfile(korlongProfile);
    setInstrumentName(KORLONG_INSTRUMENT.name);
    setView('discoveryCard');
  }, [recordScan, addXP]);

  // 3. Gameplay finishes
  const handleGameFinish = useCallback((gameState?: GameplayState) => {
    if (gameState) setFinalGameState(gameState);
    // Always guide the player through the Quiz and Story screens to explore the full game content
    setView('quiz');
  }, []);

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
      {/* Dev Menu — only show on map screen */}
      {view === 'map' && <DevMenu onOpenStudentSession={() => setView('teachableStudent')} />}
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
          onSelectInstrument={handleSelectInstrument}
          onOpenCollection={() => setView('collection')}
        />
      )}

      {view === 'collection' && (
        <CollectionScreen 
          onBack={() => setView('map')} 
          onSelectInstrument={handleSelectInstrument}
          onSelectCustomProfile={handleSelectCustomProfile}
          onOpenKorlongHunt={() => setView('korlongHunt')}
          onOpenScanner={() => setView('scanner')}
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

      {/* Scan Verification Overlay */}
      {view === 'scanVerification' && pendingImageData && (
        <ScanVerificationScreen
          imageBase64={pendingImageData.base64}
          imageMimeType={pendingImageData.mimeType}
          onVerified={handleVerificationComplete}
          onCancel={handleVerificationCancel}
        />
      )}

      {/* Korlong GPS Hunt */}
      {view === 'korlongHunt' && (
        <KorlongHuntScreen
          onBack={() => setView('collection')}
          onDiscovered={handleKorlongDiscovered}
        />
      )}

      {/* Teachable Student */}
      {view === 'teachableStudent' && (
        <TeachableStudentScreen
          unlockedInstruments={progress.unlockedInstruments}
          onBack={() => setView('map')}
          onSessionComplete={() => { addXP(30, 'teaching'); setView('map'); }}
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
          onBack={handleQuit}
        />
      )}

      {view === 'gameplay' && activeProfile && (
        <GameBoard
          profile={activeProfile}
          onFinish={handleGameFinish}
          onQuit={handleQuit}
        />
      )}

      {view === 'quiz' && activeProfile && (
        <QuizScreen 
          profile={activeProfile}
          onComplete={handleQuizComplete}
          onBack={handleQuit}
        />
      )}

      {view === 'story' && activeProfile && (
        <StoryScreen 
          profile={activeProfile}
          onComplete={handleStoryComplete}
          onBack={handleQuit}
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
