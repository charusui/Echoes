/* ==========================================================================
   HARMONYDEX - PROCEDURAL WEB AUDIO API SYNTHESIZER & ENGINE
   ========================================================================== */

class AudioController {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.isUnlocked = false;
        this.loopInterval = null;
        this.bpm = 125;
        this.beatStep = 0;

        // Pentatonic / Minor harmonic frequencies (in Hertz) for scale-quantized notes
        // 0: A3, 1: C4, 2: D4, 3: E4, 4: G4, 5: A4, 6: C5, 7: D5
        this.scaleFrequencies = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
    }

    /**
     * Initialize Web Audio API on user interaction
     */
    init() {
        if (this.ctx && this.isUnlocked) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.muted ? 0 : 0.45;
            this.masterGain.connect(this.ctx.destination);
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.isUnlocked = true;
            console.log('⚡ Web Audio Context Unlocked & Initialized!');
        } catch (e) {
            console.warn('Web Audio API not supported or blocked:', e);
            this.isUnlocked = true; // Mark unlocked so game continues even if audio fails
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.45, this.ctx.currentTime);
        }
        return this.muted;
    }

    /**
     * Synthesize a musical note based on instrument audioPreset
     */
    playInstrumentNote(preset, noteIndex = 0, duration = 0.3) {
        if (!this.isUnlocked || !this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const freq = this.scaleFrequencies[noteIndex % this.scaleFrequencies.length];

        switch (preset) {
            case 'pluck-distortion':
                this.synthPluckDistortion(freq, now, duration);
                break;
            case 'supersaw-pluck':
                this.synthSupersaw(freq, now, duration);
                break;
            case 'sine-breath':
                this.synthWoodwind(freq, now, duration);
                break;
            case 'saw-horn':
                this.synthBrassHorn(freq, now, duration);
                break;
            case 'sub-kick':
                this.synth808Percussion(freq, now, duration);
                break;
            case 'deep-drone':
                this.synthCelloDrone(freq / 2, now, duration * 1.5);
                break;
            default:
                this.synthPluckDistortion(freq, now, duration);
                break;
        }
    }

    // 1. String Pluck / Overdrive Guitar (Solaris Stratocaster)
    synthPluckDistortion(freq, now, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + duration);
        filter.Q.value = 4;

        // ADSR Envelope
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // 2. Synth Supersaw (Aegis Keytar)
    synthSupersaw(freq, now, duration) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq * 0.995, now); // Detuned
        osc2.frequency.setValueAtTime(freq * 1.005, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 5, now);
        filter.Q.value = 6;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    // 3. Woodwind Sine/Triangle with Breath (Valkyrie Flute)
    synthWoodwind(freq, now, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Subtle vibrato
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 6; // 6Hz vibrato
        lfoGain.gain.value = freq * 0.03;
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + duration);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.06);
        gain.gain.setValueAtTime(0.35, now + duration - 0.08);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // 4. Brass Horn Swell (Titan Brass)
    synthBrassHorn(freq, now, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 1.2, now);
        filter.frequency.linearRampToValueAtTime(freq * 4.5, now + duration * 0.4); // Horn swell filter
        filter.Q.value = 5;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.45, now + duration * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // 5. Sub-Bass 808 Kick & Snare (Thunder 808)
    synth808Percussion(freq, now, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    // 6. Deep Cello Drone (Shadow Cello)
    synthCelloDrone(freq, now, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2, now);
        filter.Q.value = 3;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    /* ==========================================================================
       SOUND EFFECTS (SFX)
       ========================================================================== */
    playHitSFX(rating = 'sick') {
        if (!this.isUnlocked || !this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (rating === 'sick') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        } else if (rating === 'good') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(660, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        } else {
            osc.type = 'square';
            osc.frequency.setValueAtTime(330, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        }

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playMissSFX() {
        if (!this.isUnlocked || !this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        // Record scratch / Dissonant buzz
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(110, now);
        osc1.frequency.linearRampToValueAtTime(65, now + 0.25);
        osc2.frequency.setValueAtTime(118, now); // Dissonant interval

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
    }

    playParrySFX() {
        if (!this.isUnlocked || !this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(2400, now + 0.15);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playCaptureSFX() {
        if (!this.isUnlocked || !this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // Major chord arpeggio
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + i * 0.08;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    }

    playVictorySFX() {
        if (!this.isUnlocked || !this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const fanfare = [523.25, 659.25, 783.99, 1046.50]; // C Major Fanfare
        fanfare.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + i * 0.12;
            const dur = i === fanfare.length - 1 ? 0.6 : 0.2;
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(startTime + dur);
        });
    }

    /* ==========================================================================
       BACKGROUND RHYTHM LOOP (FNF Combat Beat)
       ========================================================================== */
    startRhythmLoop(bpm = 125) {
        if (!this.isUnlocked || !this.ctx || this.muted) return;
        this.stopRhythmLoop();
        this.bpm = bpm;
        const stepTimeMs = (60000 / this.bpm) / 4; // 16th note steps
        this.beatStep = 0;

        this.loopInterval = setInterval(() => {
            if (this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;

            // Kick drum on beats 1 and 3 (step 0 and 8)
            if (this.beatStep % 8 === 0) {
                this.playKick(now);
            }
            // Snare on beats 2 and 4 (step 4 and 12)
            if (this.beatStep % 8 === 4) {
                this.playSnare(now);
            }
            // Hi-hat on every even step
            if (this.beatStep % 2 === 0) {
                this.playHiHat(now);
            }

            this.beatStep = (this.beatStep + 1) % 16;
        }, stepTimeMs);
    }

    stopRhythmLoop() {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    playSnare(time) {
        // Noise buffer for snare burst
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(time);
        noise.stop(time + 0.1);
    }

    playHiHat(time) {
        const bufferSize = this.ctx.sampleRate * 0.04;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(time);
        noise.stop(time + 0.04);
    }

    /**
     * Harmonic Overdrive Ultimate Cinematic Audio Sequence
     */
    playUltimateSFX(preset = 'pluck-distortion') {
        if (!this.ctx || !this.isUnlocked || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Layer 1: Sub-bass cinematic impact drop
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(140, now);
        subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.8);
        subGain.gain.setValueAtTime(0.6, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(now);
        subOsc.stop(now + 1.2);

        // Layer 2: Rapid climbing magic circle arpeggio (Harmonic series)
        const notes = [220, 277.18, 329.63, 440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
        notes.forEach((freq, idx) => {
            const time = now + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + 0.25);
        });

        // Layer 3: Climactic Overdrive Chord Explosion at 0.85s
        setTimeout(() => {
            if (!this.ctx || this.isMuted) return;
            const boomTime = this.ctx.currentTime;
            [440, 554.37, 659.25, 880, 1318.51].forEach(f => {
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(f, boomTime);
                g.gain.setValueAtTime(0.25, boomTime);
                g.gain.exponentialRampToValueAtTime(0.001, boomTime + 1.5);
                o.connect(g);
                g.connect(this.masterGain);
                o.start(boomTime);
                o.stop(boomTime + 1.5);
            });
            this.playHitSFX('sick');
        }, 850);
    }

    /**
     * Expedition 33 Enemy Telegraph Wind-Up Audio
     */
    playParryTelegraphSFX() {
        if (!this.ctx || !this.isUnlocked || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Rising resonant chime wind-up over 1.0s
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 1.0);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 1.0);
        filter.Q.value = 8;

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.95);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 1.1);

        // Ping chime at the exact flash moment (1.0s)
        setTimeout(() => {
            if (!this.ctx || this.isMuted) return;
            const pingTime = this.ctx.currentTime;
            const pingOsc = this.ctx.createOscillator();
            const pingGain = this.ctx.createGain();
            pingOsc.type = 'sine';
            pingOsc.frequency.setValueAtTime(2637.02, pingTime); // E7 high bell ping
            pingGain.gain.setValueAtTime(0.4, pingTime);
            pingGain.gain.exponentialRampToValueAtTime(0.001, pingTime + 0.35);
            pingOsc.connect(pingGain);
            pingGain.connect(this.masterGain);
            pingOsc.start(pingTime);
            pingOsc.stop(pingTime + 0.35);
        }, 1000);
    }

    /**
     * Expedition 33 Perfect Parry Counter Audio
     */
    playParrySuccessSFX() {
        if (!this.ctx || !this.isUnlocked || this.isMuted) return;
        const now = this.ctx.currentTime;

        // High metallic sparks clash
        [1760, 2217.46, 2637.02, 3520].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 0.4);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.4);
        });

        // Heavy counter hit impact
        this.playHitSFX('sick');
    }

    /**
     * Expedition 33 Parry Miss / Damage Audio
     */
    playParryMissSFX() {
        if (!this.ctx || !this.isUnlocked || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.3);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    /**
     * Osu! Spell Casting Trace Note Audio
     */
    playSpellNote(stepIndex = 0, waypointIndex = 0, totalWaypoints = 20) {
        if (!this.ctx || !this.isUnlocked || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Base frequency scales higher as you complete the trace and advance steps
        const baseOctave = 220 * Math.pow(1.5, stepIndex); // Step 0: 220Hz, Step 1: 330Hz, Step 2: 495Hz
        const progressRatio = waypointIndex / Math.max(1, totalWaypoints);
        const freq = baseOctave * Math.pow(2, progressRatio * 1.5); // climbs up to 1.5 octaves per step

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = stepIndex === 0 ? 'sine' : (stepIndex === 1 ? 'triangle' : 'sawtooth');
        osc.frequency.setValueAtTime(freq, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    /**
     * Osu! Spell Casting Step Completion Chime
     */
    playSpellStepCompleteSFX() {
        if (!this.ctx || !this.isUnlocked || this.isMuted) return;
        const now = this.ctx.currentTime;
        [880, 1108.73, 1318.51, 1760].forEach((f, idx) => {
            const time = now + idx * 0.06;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, time);
            gain.gain.setValueAtTime(0.25, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(time);
            osc.stop(time + 0.35);
        });
    }
}

// Global instance
const audioEngine = new AudioController();
window.audioEngine = audioEngine;
