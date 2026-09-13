import { audioEngine } from '../services/audioSynth';

/** Plays a UI sound effect through the shared audio engine; failures are logged, never thrown. */
export function playUiSound(soundType: string) {
  try {
    if (audioEngine && typeof audioEngine.playHitSFX === 'function') {
      audioEngine.playHitSFX(soundType);
    }
  } catch (e) {
    console.warn('SFX Error:', e);
  }
}
