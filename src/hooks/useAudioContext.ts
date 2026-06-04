import { useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../services/audioSynth';

// ─── useAudioContext ───────────────────────────────────────────────────────────
// Manages AudioContext lifecycle: init on first user gesture, worklet loading,
// resume/suspend, and cleanup on unmount.

export function useAudioContext() {
  const initializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const ensureInit = useCallback(async () => {
    audioEngine.resumeSync();
    if (initializedRef.current) {
      return;
    }
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }
    initPromiseRef.current = audioEngine.init().then(() => {
      initializedRef.current = true;
    });
    await initPromiseRef.current;
  }, []);

  const resume = useCallback(() => {
    audioEngine.resumeSync();
  }, []);

  const suspend = useCallback(() => {
    audioEngine.suspend();
  }, []);

  // On first mount, attach a one-time gesture listener to init audio
  useEffect(() => {
    const handleGesture = () => {
      audioEngine.resumeSync();
      if (!initializedRef.current) {
        audioEngine.init().then(() => { initializedRef.current = true; });
      }
    };

    window.addEventListener('pointerdown', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Cleanup on unmount — only remove listeners, don't destroy singleton
  useEffect(() => {
    return () => {
      // Don't call audioEngine.dispose() here — it destroys the singleton.
      // The engine should persist across component mounts.
    };
  }, []);

  return { ensureInit, resume, suspend, audioEngine };
}
