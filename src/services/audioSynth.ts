import type { AcousticProfile } from '../types';

// ─── Audio Engine ──────────────────────────────────────────────────────────────

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ksNode: AudioWorkletNode | null = null;
  private workletReady = false;
  private schedulerWorker: Worker | null = null;
  private isWarmedUp = false;

  constructor() {
    // AudioContext is intentionally NOT created here.
    // iOS Safari requires creation to happen purely inside a user gesture for maximum reliability.
  }

  /** Initialize AudioWorklet and warmup. Must be called after or during a user gesture */
  async init(): Promise<void> {
    this.resumeSync();

    // Warm up the AudioContext with a short silent note to unlock audio output on iOS
    if (this.ctx && !this.isWarmedUp) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.value = 0.0001; // almost silent
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(0);
        osc.stop(this.ctx.currentTime + 0.01);
        this.isWarmedUp = true;
      } catch (e) {
        console.warn('[Audio] Failed to warm up AudioContext:', e);
      }
    }

    // Load AudioWorklet for Karplus-Strong
    if (this.ctx && !this.workletReady) {
      try {
        await this.ctx.audioWorklet.addModule('/assets/karplus-strong-processor.js');
        this.ksNode = new AudioWorkletNode(this.ctx, 'karplus-strong-processor');
        this.ksNode.connect(this.masterGain!);
        this.workletReady = true;
      } catch (e) {
        console.warn('[Audio] AudioWorklet not available, string synthesis disabled:', e);
      }
    }
  }

  get audioContext(): AudioContext | null { return this.ctx; }
  get currentTime(): number { return this.ctx?.currentTime ?? 0; }

  // Synchronous resume to bypass strict iOS Safari async gesture loss
  resumeSync(allowCreate: boolean = true): void {
    if (!this.ctx && allowCreate) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 44100 });
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.85;
          this.masterGain.connect(this.ctx.destination);
          console.log('[Audio] AudioContext created lazily in user gesture');
        }
      } catch (e) {
        console.warn('[Audio] Failed to initialize AudioContext lazily', e);
      }
    }

    if (this.ctx && (this.ctx.state === 'suspended' || (this.ctx as any).state === 'interrupted')) {
      this.ctx.resume().catch(e => console.warn('[Audio] Sync resume failed:', e));
    }
  }

  private isMuted = false;

  resume(): Promise<void> {
    this.resumeSync();
    return Promise.resolve();
  }

  suspend(): void { this.ctx?.suspend(); }

  setVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.85;
    }
    return this.isMuted;
  }

  playHitSFX(judgement: string): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (judgement === 'sick' || judgement === 'perfect') {
      // Satisfying bright "chime" (Root, 5th, Octave)
      const freqs = [880, 1320, 1760]; 
      freqs.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 0.3);
      });
    } else if (judgement === 'good') {
      // Slightly softer chime (Root, 5th)
      const freqs = [659.25, 988.88]; 
      freqs.forEach(freq => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 0.2);
      });
    } else {
      // miss / bad - low thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  }

  // ── Plucked String (Karplus-Strong) ────────────────────────────────────────

  playString(profile: AcousticProfile, frequency: number, atTime?: number): { stop: () => void } {
    if (!this.ctx || !this.masterGain) return { stop: () => {} };
    const t = atTime ?? this.ctx.currentTime;
    const attack = Math.max(0.005, profile.attackTime);
    const decay = Math.max(0.1, profile.decayTime);
    const stopFns: (() => void)[] = [];

    if (this.workletReady && this.ksNode) {
      // Map decay time to KS feedback coefficient
      const ksDecay = Math.max(0.9, Math.min(0.999, 1 - (1 / (decay * 100))));
      this.ksNode.port.postMessage({ type: 'pluck', frequency, decay: ksDecay });
    } else {
      const stopFallback = this._playFallbackString(frequency, t, attack, decay);
      stopFns.push(stopFallback);
    }

    // Add a sustained sine wave so the hold note actually sustains
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);

    stopFns.push(() => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05); // fast mute
      osc.stop(now + 0.1);
    });

    return { stop: () => stopFns.forEach(fn => fn()) };
  }

  private _playFallbackString(frequency: number, t: number, attack: number, decay: number): () => void {
    if (!this.ctx || !this.masterGain) return () => {};
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = frequency * 3;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);

    return () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.stop(now + 0.1);
    };
  }

  // ── FM Gong Synthesis ──────────────────────────────────────────────────────

  playGong(profile: AcousticProfile, frequency: number, atTime?: number): { stop: () => void; setFrequency?: (newFreq: number) => void } {
    if (!this.ctx || !this.masterGain) return { stop: () => {} };
    const t = atTime ?? this.ctx.currentTime;
    const attack = Math.max(0.005, profile.attackTime);
    const decay = Math.max(0.2, profile.decayTime);

    // Carrier
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;

    // Modulator — √2 ratio produces inharmonic metallic partials
    const modulator = this.ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.value = frequency * 1.4142;

    // Modulation depth gain
    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(0, t);
    modGain.gain.linearRampToValueAtTime(frequency * 2, t + attack);
    modGain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay * 0.7);

    // Master output gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.55, t + attack);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);

    // Connect FM graph
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(masterGain);
    masterGain.connect(this.masterGain);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + attack + decay + 0.1);
    modulator.stop(t + attack + decay + 0.1);

    return {
      stop: () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
        carrier.stop(now + 0.1);
        modulator.stop(now + 0.1);
      }
    };
  }

  // ── Breathy Flute Synthesis ────────────────────────────────────────────────

  playFlute(profile: AcousticProfile, frequency: number, atTime?: number): { stop: () => void; setFrequency?: (newFreq: number) => void } {
    if (!this.ctx || !this.masterGain) return { stop: () => {} };
    const t = atTime ?? this.ctx.currentTime;
    const attack = Math.max(0.05, profile.attackTime);
    const decay = Math.max(0.1, profile.decayTime);

    // Tonal component (Triangle for hollow tube harmonics)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    
    // Lowpass filter to soften the triangle harshness
    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = frequency * 2.5;
    
    const oscGain = this.ctx.createGain();

    // Vibrato LFO (6 Hz, ±3 Hz deviation)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 6;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Breath noise component
    const noiseBuffer = this._createNoiseBuffer(2); // 2s loop
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const breathFilter = this.ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = frequency * 2;
    breathFilter.Q.value = 1.0;
    const noiseGain = this.ctx.createGain();

    // Output mixer
    const mixGain = this.ctx.createGain();
    mixGain.gain.value = 2.0;

    // Connect graph
    osc.connect(toneFilter);
    toneFilter.connect(oscGain);
    noiseSource.connect(breathFilter);
    breathFilter.connect(noiseGain);
    oscGain.connect(mixGain);
    noiseGain.connect(mixGain);
    mixGain.connect(this.masterGain);

    // Breath "chiff" — noise peaks before tone
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.4, t + attack * 0.5);
    noiseGain.gain.linearRampToValueAtTime(0.15, t + attack);

    // Tone fades in
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.8, t + attack);

    osc.start(t); lfo.start(t);
    noiseSource.start(t);

    return {
      stop: () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        oscGain.gain.cancelScheduledValues(now);
        noiseGain.gain.cancelScheduledValues(now);
        mixGain.gain.cancelScheduledValues(now);
        
        oscGain.gain.setValueAtTime(oscGain.gain.value, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, Math.max(now + 0.01, now + decay));
        
        noiseGain.gain.setValueAtTime(noiseGain.gain.value, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, Math.max(now + 0.01, now + decay));
        
        osc.stop(now + decay + 0.1);
        noiseSource.stop(now + decay + 0.1);
        lfo.stop(now + decay + 0.1);
        mixGain.gain.linearRampToValueAtTime(0, now + decay + 0.1);
      },
      setFrequency: (newFreq: number) => {
        if (!this.ctx) return;
        osc.frequency.setTargetAtTime(newFreq, this.ctx.currentTime, 0.05);
        toneFilter.frequency.setTargetAtTime(newFreq * 2.5, this.ctx.currentTime, 0.05);
        breathFilter.frequency.setTargetAtTime(newFreq * 2, this.ctx.currentTime, 0.05);
      }
    };
  }

  // ── Membrane Drum Synthesis ────────────────────────────────────────────────

  playDrum(profile: AcousticProfile, frequency: number, atTime?: number): { stop: () => void; setFrequency?: (newFreq: number) => void } {
    if (!this.ctx || !this.masterGain) return { stop: () => {} };
    const t = atTime ?? this.ctx.currentTime;
    const attack = Math.max(0.005, profile.attackTime);
    const decay = Math.max(0.1, profile.decayTime);

    // Pitch sweep sine
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const oscGain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(frequency * 2.5, t);
    osc.frequency.exponentialRampToValueAtTime(frequency, t + attack * 2);
    
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.8, t + attack);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);

    // Noise burst
    const noiseBuffer = this._createNoiseBuffer(0.5);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = frequency * 4;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.6, t + attack);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay * 0.2);

    osc.connect(oscGain);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    const masterDrumGain = this.ctx.createGain();
    oscGain.connect(masterDrumGain);
    noiseGain.connect(masterDrumGain);
    masterDrumGain.connect(this.masterGain);

    osc.start(t);
    noiseSource.start(t);
    osc.stop(t + attack + decay + 0.1);

    return {
      stop: () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        masterDrumGain.gain.cancelScheduledValues(now);
        masterDrumGain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.stop(now + 0.1);
        noiseSource.stop(now + 0.1);
      }
    };
  }

  // ── Brass Synthesis ────────────────────────────────────────────────────────

  playBrass(profile: AcousticProfile, frequency: number, atTime?: number): { stop: () => void; setFrequency?: (newFreq: number) => void } {
    if (!this.ctx || !this.masterGain) return { stop: () => {} };
    const t = atTime ?? this.ctx.currentTime;
    const attack = Math.max(0.05, profile.attackTime);
    const decay = Math.max(0.1, profile.decayTime);

    // Sawtooth base
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    // Resonant lowpass that opens up (brass swell)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.5;
    
    // Filter envelope
    filter.frequency.setValueAtTime(frequency, t);
    filter.frequency.linearRampToValueAtTime(frequency * 5, t + attack);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.6, t + attack);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);

    return {
      stop: () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, Math.max(now + 0.01, now + decay));
        
        filter.frequency.cancelScheduledValues(now);
        filter.frequency.setValueAtTime(filter.frequency.value, now);
        filter.frequency.exponentialRampToValueAtTime(frequency, Math.max(now + 0.01, now + decay));
        
        osc.stop(now + decay + 0.1);
      },
      setFrequency: (newFreq: number) => {
        if (!this.ctx) return;
        osc.frequency.setTargetAtTime(newFreq, this.ctx.currentTime, 0.05);
      }
    };
  }

  // ── Synth Lead Synthesis ───────────────────────────────────────────────────

  playSynthLead(profile: AcousticProfile, frequency: number, atTime?: number): { stop: () => void; setFrequency?: (newFreq: number) => void } {
    if (!this.ctx || !this.masterGain) return { stop: () => {} };
    const t = atTime ?? this.ctx.currentTime;
    const attack = Math.max(0.01, profile.attackTime);
    const decay = Math.max(0.2, profile.decayTime);

    // Dual oscillators
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.value = frequency;
    
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = frequency * 1.01; // slight detune

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);

    return {
      stop: () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc1.stop(now + 0.1);
        osc2.stop(now + 0.1);
      }
    };
  }

  private _createNoiseBuffer(durationSec: number): AudioBuffer {
    if (!this.ctx) throw new Error('No AudioContext');
    const len = this.ctx.sampleRate * durationSec;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ── Play Note by Profile ───────────────────────────────────────────────────

  playNote(
    profile: AcousticProfile,
    frequency: number,
    atTime?: number,
  ): { stop: () => void; setFrequency?: (f: number) => void } {
    switch (profile.synthesisType) {
      case 'string': return this.playString(profile, frequency, atTime);
      case 'flute': return this.playFlute(profile, frequency, atTime);
      case 'membrane-drum': return this.playDrum(profile, frequency, atTime);
      case 'brass': return this.playBrass(profile, frequency, atTime);
      case 'synth-lead': return this.playSynthLead(profile, frequency, atTime);
      case 'fm-gong':
      default:
        return this.playGong(profile, frequency, atTime);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  dispose(): void {
    this.schedulerWorker?.postMessage('stop');
    this.schedulerWorker?.terminate();
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    this.ksNode = null;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
