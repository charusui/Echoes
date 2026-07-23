/**
 * Harmonydex - Osu! Style Spell Casting Ultimate Engine
 * Requires tracing at least 3 distinct shapes (Rotary Circle, Power Slash, Rune Square) in quick succession.
 */

class SpellCastingEngine {
    constructor() {
        this.active = false;
        this.currentStep = 0;
        this.isDragging = false;
        this.waypoints = [];
        this.currentWaypointIdx = 0;
        this.completedPointsTotal = 0;
        this.totalPointsAllSteps = 0;
        this.timer = null;
        this.timeLeft = 5.5;
        this.onCompleteCallback = null;
        this.svgEl = null;
        this.stageTransitioning = false;

        // The 3 Osu! Spell Trace stages (Must do at least 3 in quick succession, each with its own timer)
        this.stages = [
            {
                name: 'SHAPE 1 OF 3: ROTARY SPELL CIRCLE',
                instruction: 'HOLD & DRAG IN A 360° CIRCLE TO ATTUNE!',
                pathD: 'M 250, 60 A 190 190 0 1 1 249.9, 60',
                pointsCount: 20,
                timeLimit: 3.2
            },
            {
                name: 'SHAPE 2 OF 3: POWER BEAM SLASH',
                instruction: 'QUICK! DRAG RAPIDLY ALONG THE DIAGONAL SLASH!',
                pathD: 'M 80, 100 L 420, 400',
                pointsCount: 16,
                timeLimit: 2.6
            },
            {
                name: 'SHAPE 3 OF 3: RUNE SQUARE SIGIL',
                instruction: 'FINAL SIGIL! TRACE ALL 4 CORNERS IN SUCCESSION!',
                pathD: 'M 110, 110 L 390, 110 L 390, 390 L 110, 390 L 110, 110',
                pointsCount: 24,
                timeLimit: 3.4
            }
        ];

        this.bindEvents();
    }

    bindEvents() {
        const canvasArea = document.getElementById('spell-canvas-area');
        if (!canvasArea) return;

        const handlePointerDown = (e) => {
            if (!this.active || this.stageTransitioning) return;
            e.preventDefault();
            this.isDragging = true;
            this.checkWaypointSnap(e);
        };

        const handlePointerMove = (e) => {
            if (!this.active || !this.isDragging || this.stageTransitioning) return;
            e.preventDefault();
            this.checkWaypointSnap(e);
        };

        const handlePointerUp = (e) => {
            if (!this.active) return;
            this.isDragging = false;
        };

        canvasArea.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }

    startSpellCast({ hero, instrument, onComplete }) {
        if (this.active) return;
        this.active = true;
        this.onCompleteCallback = onComplete;
        this.currentStep = 0;
        this.isDragging = false;
        this.stageTransitioning = false;
        this.completedPointsTotal = 0;
        this.completedShapesCount = 0;

        this.totalPointsAllSteps = this.stages.reduce((acc, st) => acc + st.pointsCount, 0);

        const overlay = document.getElementById('spell-casting-overlay');
        const fillBar = document.getElementById('spell-cast-bar-fill');
        const pctText = document.getElementById('spell-cast-pct');
        this.svgEl = document.getElementById('spell-svg-track');

        if (fillBar) fillBar.style.width = '0%';
        if (pctText) pctText.textContent = '0%';
        if (overlay) overlay.classList.remove('hidden');

        // Load Shape 1 with its own individual timer
        this.loadStage(0);

        // Start countdown timer loop for individual shapes
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            if (!this.active || this.stageTransitioning) return;
            this.timeLeft -= 0.1;
            const timerGauge = document.getElementById('spell-timer-gauge');
            if (timerGauge) timerGauge.textContent = `SHAPE ${this.currentStep + 1} TIME: ${Math.max(0, this.timeLeft).toFixed(1)}s`;

            if (this.timeLeft <= 0) {
                this.handleShapeTimeout();
            }
        }, 100);
    }

    handleShapeTimeout() {
        if (!this.active || this.stageTransitioning) return;
        this.stageTransitioning = true;
        this.isDragging = false;

        const nextStep = this.currentStep + 1;
        if (nextStep >= this.stages.length) {
            // All 3 shapes finished or timed out!
            const banner = document.getElementById('spell-step-banner');
            if (banner) {
                banner.textContent = `✨ SPELL CASTING COMPLETE! CASTING ULTIMATE! ✨`;
                banner.style.color = '#00ff88';
            }
            setTimeout(() => {
                this.finishSpellCast();
            }, 350);
        } else {
            // Timed out on Shape 1 or 2 -> Advance to next shape so player does all 3
            if (window.audioEngine) window.audioEngine.playParryMissSFX();
            const banner = document.getElementById('spell-step-banner');
            if (banner) {
                banner.textContent = `⏱️ TIME UP FOR SHAPE ${this.currentStep + 1}! PREPARE SHAPE ${nextStep + 1}! ⏱️`;
                banner.style.color = '#ffaa00';
            }

            setTimeout(() => {
                if (this.active) {
                    this.loadStage(nextStep);
                }
            }, 500);
        }
    }

    loadStage(stepIdx) {
        if (stepIdx >= this.stages.length) {
            this.finishSpellCast();
            return;
        }

        this.currentStep = stepIdx;
        this.stageTransitioning = false;
        this.isDragging = false;
        const stage = this.stages[stepIdx];

        // Give each shape its own individual time limit!
        this.timeLeft = stage.timeLimit || 3.0;
        const timerGauge = document.getElementById('spell-timer-gauge');
        if (timerGauge) timerGauge.textContent = `SHAPE ${stepIdx + 1} TIME: ${this.timeLeft.toFixed(1)}s`;

        // Update banners
        const banner = document.getElementById('spell-step-banner');
        const instruction = document.getElementById('spell-cast-instruction');
        if (banner) {
            banner.textContent = stage.name;
            banner.style.color = '#fff';
        }
        if (instruction) instruction.textContent = stage.instruction;

        // Update SVG paths
        const trackPath = document.getElementById('spell-track-path');
        const activePath = document.getElementById('spell-track-active');
        if (trackPath) trackPath.setAttribute('d', stage.pathD);
        if (activePath) {
            activePath.setAttribute('d', stage.pathD);
            const totalLen = trackPath ? trackPath.getTotalLength() : 1000;
            activePath.style.strokeDasharray = `${totalLen}`;
            activePath.style.strokeDashoffset = `${totalLen}`;
            this.currentTotalPathLength = totalLen;
        }

        // Generate distinct waypoints along the shape
        this.waypoints = [];
        const numPoints = stage.pointsCount;
        const pathEl = document.getElementById('spell-track-path');
        if (pathEl && pathEl.getTotalLength) {
            const len = pathEl.getTotalLength();
            for (let i = 0; i < numPoints; i++) {
                const pt = pathEl.getPointAtLength((i / (numPoints - 1)) * len);
                this.waypoints.push({ x: pt.x, y: pt.y, length: (i / (numPoints - 1)) * len });
            }
        }

        // Render waypoints inside SVG
        const waypointsGroup = document.getElementById('spell-waypoints-group');
        if (waypointsGroup) {
            waypointsGroup.innerHTML = '';
            this.waypoints.forEach((wp, i) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', wp.x);
                circle.setAttribute('cy', wp.y);
                circle.setAttribute('r', i === 0 ? '18' : (i === numPoints - 1 ? '18' : '7'));
                circle.setAttribute('fill', i === 0 ? '#00ff88' : (i === numPoints - 1 ? '#ff0055' : 'rgba(255, 255, 255, 0.45)'));
                circle.setAttribute('stroke', i === 0 || i === numPoints - 1 ? '#fff' : 'none');
                circle.setAttribute('stroke-width', '2');
                circle.setAttribute('id', `waypoint-${i}`);
                waypointsGroup.appendChild(circle);
            });
        }

        // Place Osu! Slider Ball at waypoint 0
        this.currentWaypointIdx = 0;
        this.moveSliderBall(0);
    }

    moveSliderBall(idx) {
        const ball = document.getElementById('spell-slider-ball');
        if (!ball || !this.waypoints[idx]) return;
        ball.classList.remove('hidden');
        const pt = this.waypoints[idx];
        ball.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);

        const activePath = document.getElementById('spell-track-active');
        if (activePath && this.currentTotalPathLength) {
            const offset = this.currentTotalPathLength - pt.length;
            activePath.style.strokeDashoffset = `${Math.max(0, offset)}`;
        }
    }

    checkWaypointSnap(e) {
        if (!this.active || !this.svgEl || this.stageTransitioning || this.currentWaypointIdx >= this.waypoints.length) return;

        const rect = this.svgEl.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        const scaleX = 500 / rect.width;
        const scaleY = 500 / rect.height;
        const svgX = (clientX - rect.left) * scaleX;
        const svgY = (clientY - rect.top) * scaleY;

        // Check exact distance to current target waypoint
        const targetPt = this.waypoints[this.currentWaypointIdx];
        const dist = Math.hypot(svgX - targetPt.x, svgY - targetPt.y);

        // Precise snap radius (48px) so you must actually drag along the shape instead of holding near the center
        if (dist <= 48) {
            const wpEl = document.getElementById(`waypoint-${this.currentWaypointIdx}`);
            if (wpEl) wpEl.setAttribute('fill', 'var(--accent-gold)');

            this.moveSliderBall(this.currentWaypointIdx);
            this.spawnParticle(clientX, clientY);

            if (window.audioEngine) {
                window.audioEngine.playSpellNote(this.currentStep, this.currentWaypointIdx, this.waypoints.length);
            }

            this.currentWaypointIdx++;
            this.completedPointsTotal++;

            // Update UI attunement bar
            const pct = Math.min(100, Math.round((this.completedPointsTotal / this.totalPointsAllSteps) * 100));
            const fillBar = document.getElementById('spell-cast-bar-fill');
            const pctText = document.getElementById('spell-cast-pct');
            if (fillBar) fillBar.style.width = `${pct}%`;
            if (pctText) pctText.textContent = `${pct}%`;

            // Check if this individual shape is complete!
            if (this.currentWaypointIdx >= this.waypoints.length) {
                this.stageTransitioning = true;
                this.isDragging = false;
                this.completedShapesCount++;
                if (window.audioEngine) window.audioEngine.playSpellStepCompleteSFX();

                const nextStep = this.currentStep + 1;
                if (nextStep >= this.stages.length) {
                    // ALL 3 SHAPES ARE FINISHED!
                    const banner = document.getElementById('spell-step-banner');
                    if (banner) {
                        banner.textContent = `✨ ALL 3 SPELL SIGILS ATTUNED! CASTING ULTIMATE! ✨`;
                        banner.style.color = '#00ff88';
                    }
                    setTimeout(() => {
                        this.finishSpellCast();
                    }, 350);
                } else {
                    // Moving to Shape 2 or Shape 3
                    const banner = document.getElementById('spell-step-banner');
                    if (banner) {
                        banner.textContent = `✨ SHAPE ${this.currentStep + 1} COMPLETE! PREPARE SHAPE ${nextStep + 1}! ✨`;
                        banner.style.color = '#00ff88';
                    }

                    setTimeout(() => {
                        if (this.active) {
                            this.loadStage(nextStep);
                        }
                    }, 500);
                }
            }
        }
    }

    spawnParticle(x, y) {
        const box = document.getElementById('spell-particles-box');
        if (!box) return;
        const el = document.createElement('div');
        el.className = 'spell-spark';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        box.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    finishSpellCast() {
        if (!this.active) return;
        this.active = false;
        if (this.timer) clearInterval(this.timer);

        const overlay = document.getElementById('spell-casting-overlay');
        if (overlay) overlay.classList.add('hidden');

        const finalPct = Math.min(100, Math.round((this.completedPointsTotal / this.totalPointsAllSteps) * 100));
        if (this.onCompleteCallback) {
            this.onCompleteCallback({
                completedShapesCount: this.completedShapesCount,
                scorePct: finalPct
            });
        }
    }
}

// Global instance
const spellCastingEngine = new SpellCastingEngine();
window.spellCastingEngine = spellCastingEngine;
