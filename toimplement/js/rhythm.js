/* ==========================================================================
   HARMONYDEX - FRIDAY NIGHT FUNKIN' (FNF) RHYTHM HIGHWAY ENGINE
   ========================================================================== */

class RhythmEngine {
    constructor() {
        this.active = false;
        this.mode = 'attack'; // 'attack', 'defend', 'capture'
        this.instrumentPreset = 'pluck-distortion';
        this.notes = [];
        this.activeNotes = [];
        this.speed = 250; // pixels per second
        this.receptorY = 300; // Receptor position from top
        this.startTime = 0;
        this.animId = null;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;
        this.hits = { sick: 0, good: 0, bad: 0, miss: 0 };
        this.captureProgress = 0; // 0 to 100 for Harmonic Attunement
        this.parryCount = 0;

        this.onCompleteCallback = null;
        this.onHitCallback = null;
        this.onMissCallback = null;
        this.isCapture = false;

        this.keyMapping = {
            'ArrowLeft': 0, 'a': 0, 'A': 0,
            'ArrowDown': 1, 's': 1, 'S': 1,
            'ArrowUp': 2, 'w': 2, 'W': 2,
            'ArrowRight': 3, 'd': 3, 'D': 3
        };

        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (!this.active) return;
            const lane = this.keyMapping[e.key];
            if (lane !== undefined) {
                e.preventDefault();
                this.triggerInput(lane);
            }
        });

        // Touch & Mouse tap support for mobile / tablet players
        const lanes = document.querySelectorAll('.track-lane');
        lanes.forEach((laneEl, index) => {
            const handler = (e) => {
                if (!this.active) return;
                e.preventDefault();
                e.stopPropagation();
                this.triggerInput(index);
                const receptor = laneEl.querySelector('.receptor');
                if (receptor) {
                    receptor.classList.add('hit-pulse');
                    setTimeout(() => receptor.classList.remove('hit-pulse'), 120);
                }
            };
            laneEl.addEventListener('pointerdown', handler);
            laneEl.addEventListener('touchstart', handler, { passive: false });
        });
    }

    /**
     * Start the FNF Note Highway session
     */
    startHighway({ mode = 'attack', instrumentPreset = 'pluck-distortion', noteCount = 14, speed = 1.2, isCapture = false, onComplete, onHit, onMiss }) {
        this.active = true;
        this.mode = mode;
        this.instrumentPreset = instrumentPreset;
        this.speed = 220 * speed;
        this.isCapture = isCapture;
        this.onCompleteCallback = onComplete;
        this.onHitCallback = onHit;
        this.onMissCallback = onMiss;

        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;
        this.hits = { sick: 0, good: 0, bad: 0, miss: 0 };
        this.captureProgress = 0;
        this.parryCount = 0;

        // Show highway UI
        const highway = document.getElementById('rhythm-highway');
        highway.classList.remove('hidden');

        // Update mode banner
        const modeText = document.getElementById('highway-mode-text');
        const modeBanner = document.getElementById('highway-mode-banner');
        const captureContainer = document.getElementById('capture-gauge-container');

        if (isCapture || mode === 'capture') {
            modeText.textContent = '🫧 HARMONIC ATTUNEMENT: PLAY TO SEAL INTO HARMONYDEX!';
            modeBanner.style.color = 'var(--accent-gold)';
            captureContainer.classList.remove('hidden');
            this.updateCaptureGauge(0);
        } else if (mode === 'defend') {
            modeText.textContent = '🛡️ DEFENSIVE PARRY HIGHWAY: PERFECT HITS NEGATE DAMAGE!';
            modeBanner.style.color = '#00ff88';
            captureContainer.classList.add('hidden');
        } else {
            modeText.textContent = `⚡ OFFENSIVE RHYTHM: PLAYING ${instrumentPreset.toUpperCase()}!`;
            modeBanner.style.color = 'var(--accent-cyan)';
            captureContainer.classList.add('hidden');
        }

        this.updateComboDisplay();

        // Clear existing streams
        for (let i = 0; i < 4; i++) {
            document.getElementById(`stream-${i}`).innerHTML = '';
        }

        // Generate chart
        this.notes = this.generateChart(noteCount);
        this.activeNotes = [...this.notes];

        // Start backing rhythm loop
        audioEngine.startRhythmLoop(128);

        this.startTime = performance.now();
        this.loop(this.startTime);
    }

    /**
     * Generate structured chart
     */
    generateChart(count) {
        const chart = [];
        const baseIntervalMs = 350; // Distance between notes in ms
        let currentOffsetMs = 800; // Initial delay before first note reaches receptor

        for (let i = 0; i < count; i++) {
            // Pick a groove pattern lane
            let lane = Math.floor(Math.random() * 4);
            // Ensure no triple exact repeats
            if (i >= 2 && chart[i-1].lane === lane && chart[i-2].lane === lane) {
                lane = (lane + 1) % 4;
            }

            const noteObj = {
                id: `note_${i}`,
                lane: lane,
                targetTime: currentOffsetMs,
                hit: false,
                missed: false,
                el: this.createNoteElement(lane, `note_${i}`)
            };

            chart.push(noteObj);
            // Add rhythmic syncopation jumps (e.g. 16th notes or double steps)
            const stepVariation = Math.random() > 0.7 ? baseIntervalMs * 0.5 : baseIntervalMs;
            currentOffsetMs += stepVariation;
        }

        return chart;
    }

    createNoteElement(lane, id) {
        const el = document.createElement('div');
        el.className = `fnf-note note-${lane}`;
        el.id = id;
        const icons = ['◀', '▼', '▲', '▶'];
        el.textContent = icons[lane];
        el.style.top = '-80px';
        document.getElementById(`stream-${lane}`).appendChild(el);
        return el;
    }

    loop(timestamp) {
        if (!this.active) return;
        const elapsedMs = timestamp - this.startTime;

        let allDone = true;

        this.activeNotes.forEach(note => {
            if (note.hit || note.missed) return;
            allDone = false;

            // Calculate note position based on targetTime vs elapsedMs
            const timeDiffMs = note.targetTime - elapsedMs;
            // When timeDiffMs == 0, note should be at receptorY (300px)
            const posY = this.receptorY - (timeDiffMs / 1000) * this.speed;
            note.el.style.top = `${posY}px`;

            // If note falls past bottom (timeDiffMs < -180ms) -> MISS!
            if (timeDiffMs < -180) {
                note.missed = true;
                note.el.style.opacity = '0.3';
                this.handleMiss();
            }
        });

        if (allDone && this.activeNotes.length > 0) {
            // All notes processed, end highway after short pause
            setTimeout(() => this.finishHighway(), 400);
            return;
        }

        this.animId = requestAnimationFrame((ts) => this.loop(ts));
    }

    triggerInput(lane) {
        // Pulse receptor visually
        const receptors = document.querySelectorAll('.receptor');
        const receptor = receptors[lane];
        if (receptor) {
            receptor.classList.add('hit-pulse');
            setTimeout(() => receptor.classList.remove('hit-pulse'), 100);
        }

        // Find closest note in this lane within hit window
        const elapsedMs = performance.now() - this.startTime;
        let closestNote = null;
        let minDiff = 9999;

        this.activeNotes.forEach(note => {
            if (note.lane === lane && !note.hit && !note.missed) {
                const diff = Math.abs(note.targetTime - elapsedMs);
                if (diff < minDiff && diff <= 160) {
                    minDiff = diff;
                    closestNote = note;
                }
            }
        });

        if (closestNote) {
            closestNote.hit = true;
            closestNote.el.remove();

            // Calculate timing precision
            let rating = 'bad';
            if (minDiff <= 45) rating = 'sick';
            else if (minDiff <= 100) rating = 'good';

            this.handleHit(rating, lane);
        } else {
            // Tapped when no note was near -> penalty or minor miss sound
            audioEngine.playHitSFX('bad');
        }
    }

    handleHit(rating, lane) {
        this.hits[rating]++;
        audioEngine.playHitSFX(rating);

        // Play real instrument scale note!
        const noteIndex = lane + (this.combo % 4);
        audioEngine.playInstrumentNote(this.instrumentPreset, noteIndex, 0.28);

        if (rating === 'sick') {
            this.combo++;
            this.score += 300 * Math.min(this.combo, 5);
            if (this.mode === 'defend') this.parryCount++;
            if (this.isCapture) this.captureProgress = Math.min(100, this.captureProgress + 15);
        } else if (rating === 'good') {
            this.combo++;
            this.score += 200 * Math.min(this.combo, 5);
            if (this.mode === 'defend') this.parryCount++;
            if (this.isCapture) this.captureProgress = Math.min(100, this.captureProgress + 10);
        } else {
            // Bad hit keeps combo but gives small points
            this.score += 50;
            if (this.isCapture) this.captureProgress = Math.min(100, this.captureProgress + 4);
        }

        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        this.showPopup(rating);
        this.updateComboDisplay();

        if (this.isCapture) {
            this.updateCaptureGauge(this.captureProgress);
        }

        if (this.onHitCallback) {
            this.onHitCallback({ rating, combo: this.combo, score: this.score, parryCount: this.parryCount });
        }
    }

    handleMiss() {
        this.hits.miss++;
        this.combo = 0;
        audioEngine.playMissSFX();
        this.showPopup('miss');
        this.updateComboDisplay();

        if (this.onMissCallback) {
            this.onMissCallback();
        }
    }

    showPopup(rating) {
        const popup = document.getElementById('rhythm-feedback');
        popup.className = `rhythm-feedback-popup show ${rating}`;
        popup.textContent = rating.toUpperCase() + (rating === 'sick' ? '!!' : (rating === 'good' ? '!' : ''));

        // Reset class after 300ms
        setTimeout(() => {
            if (popup.classList.contains(rating)) {
                popup.classList.remove('show');
            }
        }, 300);
    }

    updateComboDisplay() {
        const comboCounter = document.getElementById('combo-counter');
        const comboMult = document.getElementById('combo-multiplier');

        if (comboCounter) comboCounter.textContent = `${this.combo}`;
        if (comboMult) {
            const mult = Math.min(3.0, 1.0 + (this.combo * 0.15)).toFixed(1);
            comboMult.textContent = `${mult}x DMG`;
        }
    }

    updateCaptureGauge(val) {
        const fill = document.getElementById('capture-gauge-fill');
        const text = document.getElementById('capture-gauge-text');
        if (fill) fill.style.width = `${val}%`;
        if (text) text.textContent = `${Math.round(val)}%`;
    }

    finishHighway() {
        if (!this.active) return;
        this.active = false;
        if (this.animId) cancelAnimationFrame(this.animId);
        audioEngine.stopRhythmLoop();

        // Hide highway
        const highway = document.getElementById('rhythm-highway');
        highway.classList.add('hidden');

        // Calculate total multiplier
        const totalMultiplier = Math.min(3.0, 1.0 + (this.maxCombo * 0.15));

        const results = {
            mode: this.mode,
            score: this.score,
            combo: this.maxCombo,
            hits: { ...this.hits },
            multiplier: totalMultiplier,
            capturePercent: this.captureProgress,
            parryCount: this.parryCount,
            isCapture: this.isCapture
        };

        if (this.onCompleteCallback) {
            this.onCompleteCallback(results);
        }
    }
}

// Global instance
const rhythmEngine = new RhythmEngine();
window.rhythmEngine = rhythmEngine;
