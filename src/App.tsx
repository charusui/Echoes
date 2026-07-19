import { useState, useCallback, useEffect } from 'react';
import type { AppView, ActiveInstrumentProfile, ScanMode, PipelineStatus, GameplayState, VerificationResult } from './types';
import { GeminiProvider } from './context/GeminiProvider';
import { audioEngine } from './services/audioSynth';
import { useGemini } from './context/GeminiProvider';
import { ProgressProvider, useProgress } from './context/ProgressProvider';

import { TitleScreen } from './components/TitleScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
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
import { BadgesScreen } from './components/BadgesScreen';
import { RanksScreen } from './components/RanksScreen';
import { ExpeditionScreen } from './components/expedition/ExpeditionScreen';
import { DevMenu } from './components/DevMenu';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeInstrumentPipeline } from './services/geminiPipeline';
import { MASTER_INSTRUMENTS, FALLBACK_PROFILES, KORLONG_INSTRUMENT } from './constants';

function InnerApp() {
  const { client } = useGemini();
  const [view, setView] = useState<AppView>('title');
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Pipeline tracking
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    phase: 'idle', label: '', detail: '', progress: 0,
  });
  const [activeProfile, setActiveProfile] = useState<ActiveInstrumentProfile | null>(null);
  const [instrumentName, setInstrumentName] = useState<string | undefined>();
  const [pipelineImage, setPipelineImage] = useState<{base64: string, mimeType: string} | null>(null);
  const [finalGameState, setFinalGameState] = useState<GameplayState | null>(null);
  const [pendingImageData, setPendingImageData] = useState<{base64: string; mimeType: string} | null>(null);

  const { recordScan, updateStreak, addXP, progress, saveCustomProfile, addPendingReview } = useProgress();

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  const handleStartTitle = useCallback(() => {
    const hasSeenOnboarding = localStorage.getItem('filinstruments_has_seen_onboarding');
    if (hasSeenOnboarding) {
      setView('expedition'); // Directly to expedition
    } else {
      setView('onboarding');
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('filinstruments_has_seen_onboarding', 'true');
    setView('expedition'); // Directly to expedition
  }, []);

  const handleQuit = useCallback(() => {
    setActiveProfile(null);
    setPipelineImage(null);
    setInstrumentName(undefined);
    setFinalGameState(null);
    setView('expedition'); // Return to expedition on quit
  }, []);

  const handleSelectInstrument = useCallback((selectedInstrumentName: string) => {
    const INSTRUMENT_CATEGORIES: Record<string, 'string' | 'wind' | 'percussion'> = {
      'tultugan': 'percussion', 'buktot': 'string', 'pasiyak': 'wind', 'tulali': 'wind', 'tugo': 'percussion', 'litguit': 'percussion',
      'cebuano gitara': 'string', 'bandurria': 'string', 'laud': 'string', 'octavina': 'string', 'bajo de uñas': 'string',
      'lantoy': 'wind', 'subing': 'percussion', 'korlong': 'string',
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
    
    profile.instrument = {
      ...profileTemplate.instrument,
      name: selectedInstrumentName,
      localName: selectedInstrumentName,
      region: MASTER_INSTRUMENTS.find(i => i.name.toLowerCase() === nameLower)?.region || 'Visayas',
    };
    
    setActiveProfile(profile);
    setInstrumentName(selectedInstrumentName);
    setView('gameplay');
  }, []);

  const handleSelectCustomProfile = useCallback((profile: any) => {
    setActiveProfile(profile);
    setInstrumentName(profile.instrument.name);
    setView('gameplay');
  }, []);

  const processImage = useCallback(async (base64: string, mimeType: string, verificationResult: VerificationResult) => {
    if (!client) return;
    setPipelineImage({ base64, mimeType });
    setActiveProfile(null);
    setView('pipeline');

    const xpMultiplier = verificationResult.method === 'gps' ? 1.0
      : verificationResult.method === 'webxr' ? 0.8
      : verificationResult.method === 'community' ? 0.2
      : 0; 

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

  const handleKorlongDiscovered = useCallback(() => {
    setIsTransitioning(true);

    setTimeout(() => {
      const isNew = recordScan(KORLONG_INSTRUMENT.name);
      if (isNew) addXP(100, 'korlong_hunt');
      
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
            history: KORLONG_INSTRUMENT.history,
            region: 'Eastern Visayas',
          };
          
          setActiveProfile(korlongProfile);
          setInstrumentName(KORLONG_INSTRUMENT.name);
          
          setView('discoveryCard');

          setTimeout(() => {
            setIsTransitioning(false);
          }, 50);
          
        }, 50); 
      }, [recordScan, addXP]);

  const handleGameFinish = useCallback((gameState?: GameplayState) => {
    if (gameState) setFinalGameState(gameState);
    setView('quiz');
  }, []);

  const handleQuizComplete = useCallback(() => {
    setView('story');
  }, []);

  const handleStoryComplete = useCallback(() => {
    setView('results');
  }, []);

  const handlePlayAgain = useCallback(() => {
    setFinalGameState(null);
    setView('gameplay');
  }, []);

  return (
    <div className="min-h-screen bg-obsidian text-light-gray overflow-x-hidden relative">
      
      <div 
        className="fixed inset-0 bg-[#2a2d43] pointer-events-none"
        style={{ 
          opacity: isTransitioning ? 1 : 0,
          transition: isTransitioning ? 'none' : 'opacity 0.4s ease-out',
          zIndex: 99999 
        }}
      />

      {/* Dev Menu — only show on expedition screen now */}
      {view === 'expedition' && <DevMenu 
        onOpenStudentSession={() => setView('teachableStudent')} 
        onOpenKorlongHunt={() => setView('korlongHunt')}
        onStartGameplay={handleSelectInstrument}
      />}
      
      {view === 'title' && (
        <TitleScreen onStart={handleStartTitle} />
      )}

      {view === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}

      {/* Replaced MapScreen with ExpeditionScreen as the main hub */}
      {view === 'expedition' && (
        <ExpeditionScreen 
          isRootMap={true}
          onBack={() => setView('title')}
          onOpenScanner={() => setView('scanner')}
          onOpenLocationServices={() => setView('locationServices')}
          onOpenCollection={() => setView('collection')}
          onOpenBadges={() => setView('badges')}
          onOpenRanks={() => setView('ranks')}
        />
      )}

      {view === 'badges' && (
        <BadgesScreen onBack={() => setView('expedition')} />
      )}

      {view === 'ranks' && (
        <RanksScreen 
          onBack={() => setView('expedition')} 
          onOpenBadges={() => setView('badges')} 
        />
      )}

      {view === 'collection' && (
        <CollectionScreen 
          onBack={() => setView('expedition')} 
          onSelectInstrument={handleSelectInstrument}
          onSelectCustomProfile={handleSelectCustomProfile}
          onOpenKorlongHunt={() => setView('korlongHunt')}
          onOpenScanner={() => setView('scanner')}
        />
      )}

      {view === 'locationServices' && (
        <LocationServicesScreen onBack={() => setView('expedition')} />
      )}

      {view === 'scanner' && (
        <Scanner 
          onImageReady={handleImageReady}
          onBack={handleQuit} 
        />
      )}

      {view === 'scanVerification' && pendingImageData && (
        <ScanVerificationScreen
          imageBase64={pendingImageData.base64}
          imageMimeType={pendingImageData.mimeType}
          onVerified={handleVerificationComplete}
          onCancel={handleVerificationCancel}
        />
      )}

      {view === 'korlongHunt' && (
        <KorlongHuntScreen
          onBack={() => setView('collection')}
          onDiscovered={handleKorlongDiscovered}
        />
      )}

      {view === 'teachableStudent' && (
        <TeachableStudentScreen
          unlockedInstruments={progress.unlockedInstruments}
          onBack={() => setView('expedition')}
          onSessionComplete={() => { addXP(30, 'teaching'); setView('expedition'); }}
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
            onKorlongHunt={() => setView('korlongHunt')}
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