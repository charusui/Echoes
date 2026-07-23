/* ==========================================================================
   HARMONYDEX - TURN-BASED COMBAT CONTROLLER (Expedition 33 x Pokemon)
   ========================================================================== */

class CombatController {
    constructor() {
        this.inBattle = false;
        this.party = [];
        this.enemy = null;
        this.queue = [];
        this.currentTurnIndex = 0;
        this.activeUnit = null;
        this.onVictory = null;
        this.onDefeat = null;
        this.onCapture = null;

        this.bindCommandButtons();
    }

    bindCommandButtons() {
        document.getElementById('cmd-btn-attack')?.addEventListener('click', () => this.onCommandAttack());
        document.getElementById('cmd-btn-skill')?.addEventListener('click', () => this.onCommandSkill());
        document.getElementById('cmd-btn-attune')?.addEventListener('click', () => this.onCommandAttune());
        document.getElementById('cmd-btn-defend')?.addEventListener('click', () => this.onCommandDefend());
        document.getElementById('btn-result-continue')?.addEventListener('click', () => this.exitCombat());
    }

    /**
     * Start a battle encounter against an enemy instrument
     */
    startBattle({ enemyId, onVictory, onDefeat, onCapture }) {
        this.inBattle = true;
        this.onVictory = onVictory;
        this.onDefeat = onDefeat;
        this.onCapture = onCapture;

        // Clone live party state
        this.party = [
            { ...HEROES.gustave, shield: 0 },
            { ...HEROES.maelle, shield: 0 },
            { ...HEROES.lune, shield: 0 }
        ];

        // Setup enemy
        const baseInst = INSTRUMENTS[enemyId] || INSTRUMENTS.corrupted_violin;
        const isBoss = baseInst.id === 'lord_cacophony';
        this.enemy = {
            id: baseInst.id,
            name: baseInst.name,
            type: baseInst.type,
            level: isBoss ? 10 : 3,
            hp: isBoss ? 1200 : 500,
            maxHp: isBoss ? 1200 : 500,
            stagger: 0,
            maxStagger: 100,
            staggered: false,
            baseDmg: isBoss ? 55 : 35,
            captured: baseInst.captured || false,
            preset: baseInst.audioPreset || 'saw-horn'
        };

        // Initialize turn queue: Alternate party heroes and enemy
        this.queue = [this.party[0], this.enemy, this.party[1], this.party[2]];
        this.currentTurnIndex = 0;

        // Render Stage and UI
        this.renderStage();
        this.renderTopHUD();
        this.renderPartyCards();
        this.renderQueue();

        // Switch screen
        document.querySelectorAll('.game-screen').forEach(el => el.classList.remove('active'));
        document.getElementById('screen-combat').classList.add('active');

        // Start first turn after brief delay
        setTimeout(() => this.nextTurn(), 600);
    }

    renderStage() {
        // Render Party Sprites
        const partyStage = document.getElementById('party-stage-group');
        partyStage.innerHTML = '';
        this.party.forEach((hero, idx) => {
            const inst = INSTRUMENTS[hero.equippedId] || INSTRUMENTS.solaris_strat;
            const el = document.createElement('div');
            el.className = `hero-sprite hero-stage-${hero.id}`;
            el.id = `stage-hero-${hero.id}`;
            el.innerHTML = `
                <div class="avatar-box">
                    <span>${hero.avatar}</span>
                    <div class="type-indicator t-badge type-${inst.type}">${inst.type.slice(0, 3)}</div>
                </div>
                <div class="hero-stage-info">
                    <div class="hero-stage-name">${hero.name}</div>
                    <div class="hero-stage-weapon">${inst.icon} ${inst.name}</div>
                </div>
            `;
            partyStage.appendChild(el);
        });

        // Render Enemy Sprite (10-frame Pixel Art Sprite)
        const enemyStage = document.getElementById('enemy-stage-group');
        const currentFrameIdx = this.currentEnemyFrame || 0;
        
        // If the enemy sprite container already exists, only update type badge without resetting the img or interrupting animations
        const existingImg = document.getElementById('enemy-sprite-img');
        if (existingImg && enemyStage.children.length > 0) {
            existingImg.src = `assets/enemy_frame_${currentFrameIdx}.png`;
            const badge = enemyStage.querySelector('.type-indicator');
            if (badge) {
                badge.className = `type-indicator t-badge type-${this.enemy.type}`;
                badge.textContent = this.enemy.type.toUpperCase();
            }
        } else {
            enemyStage.innerHTML = `
                <div class="enemy-sprite" id="enemy-sprite-container">
                    <div class="avatar-box enemy-pixel-box" id="enemy-pixel-box" style="width: 220px; height: 240px; border: none !important; background: transparent !important; overflow: visible; position: relative; box-shadow: none !important;">
                        <img id="enemy-sprite-img" src="assets/enemy_frame_${currentFrameIdx}.png" class="enemy-pixel-sprite" alt="Enemy Sprite" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; transition: transform 0.12s ease; filter: drop-shadow(0 15px 15px rgba(0,0,0,0.6));">
                        <div class="type-indicator t-badge type-${this.enemy.type}" style="bottom: -10px; right: 24px; font-size: 0.85rem; padding: 4px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.8);">${this.enemy.type.toUpperCase()}</div>
                    </div>
                </div>
            `;
        }
    }

    setEnemyFrame(frameIdx) {
        this.currentEnemyFrame = frameIdx;
        const img = document.getElementById('enemy-sprite-img');
        if (img) {
            img.src = `assets/enemy_frame_${frameIdx}.png`;
        }
    }


    renderTopHUD() {
        const nameEl = document.getElementById('enemy-name');
        const levelEl = document.getElementById('enemy-level');
        const badgeEl = document.getElementById('enemy-type-badge');
        const hpBar = document.getElementById('enemy-hp-bar');
        const hpText = document.getElementById('enemy-hp-text');
        const staggerBar = document.getElementById('enemy-stagger-bar');
        const staggerText = document.getElementById('enemy-stagger-text');

        nameEl.textContent = this.enemy.name;
        levelEl.textContent = `Lv. ${this.enemy.level}`;
        badgeEl.textContent = this.enemy.type.toUpperCase();
        badgeEl.className = `enemy-type-badge t-badge type-${this.enemy.type}`;

        const hpPct = Math.max(0, Math.round((this.enemy.hp / this.enemy.maxHp) * 100));
        hpBar.style.width = `${hpPct}%`;
        hpText.textContent = `${Math.max(0, Math.round(this.enemy.hp))} / ${this.enemy.maxHp} HP`;

        const stagPct = Math.min(100, Math.round((this.enemy.stagger / this.enemy.maxStagger) * 100));
        staggerBar.style.width = `${stagPct}%`;
        staggerText.textContent = `STAGGER: ${stagPct}% ${this.enemy.staggered ? '(STUNNED!)' : ''}`;
    }

    renderPartyCards() {
        const deck = document.getElementById('party-status-deck');
        deck.innerHTML = '';

        this.party.forEach(hero => {
            const inst = INSTRUMENTS[hero.equippedId] || INSTRUMENTS.solaris_strat;
            const el = document.createElement('div');
            el.className = `hero-status-card ${this.activeUnit && this.activeUnit.id === hero.id ? 'active-turn' : ''}`;
            el.id = `card-${hero.id}`;

            const hpPct = Math.max(0, Math.round((hero.hp / hero.maxHp) * 100));

            // Generate AP pips
            let pipsHtml = '';
            for (let i = 0; i < hero.maxAp; i++) {
                pipsHtml += `<div class="ap-pip ${i < hero.ap ? 'filled' : ''}"></div>`;
            }

            el.innerHTML = `
                <div class="hero-card-top">
                    <span class="hero-card-name">${hero.avatar} ${hero.name}</span>
                    <span class="t-badge type-${inst.type}" style="font-size: 0.65rem;">${inst.icon} ${inst.type}</span>
                </div>
                <div class="hp-bar-container" style="height: 14px;">
                    <div class="hp-bar-fill" style="width: ${hpPct}%; background: ${hero.hp > 100 ? 'var(--accent-cyan)' : '#ff0055'};"></div>
                    <span class="hp-text" style="font-size: 0.7rem;">${Math.max(0, Math.round(hero.hp))} / ${hero.maxHp} HP ${hero.shield > 0 ? `[+${hero.shield} SHIELD]` : ''}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75rem; color: hsla(0,0%,70%,0.8);">ACTION POINTS:</span>
                    <div class="ap-pips">${pipsHtml}</div>
                </div>
            `;
            deck.appendChild(el);
        });
    }

    renderQueue() {
        const container = document.getElementById('queue-items');
        container.innerHTML = '';
        this.queue.forEach((unit, idx) => {
            const el = document.createElement('div');
            el.className = `queue-chip ${unit === this.activeUnit ? 'active-turn' : ''}`;
            el.innerHTML = `<span>${unit.avatar || '⚡'}</span> <span>${unit.name.split(' ')[0]}</span>`;
            container.appendChild(el);
        });
    }

    /**
     * Advance to the next turn in the queue
     */
    nextTurn() {
        if (!this.inBattle) return;

        // Check victory/defeat conditions
        if (this.enemy.hp <= 0) {
            this.handleVictory();
            return;
        }

        const livingHeroes = this.party.filter(h => h.hp > 0);
        if (livingHeroes.length === 0) {
            this.handleDefeat();
            return;
        }

        // Get next unit from queue
        this.activeUnit = this.queue.shift();
        this.queue.push(this.activeUnit); // Cycle to end

        // If unit is dead or enemy is staggered, skip turn
        if (this.activeUnit.hp !== undefined && this.activeUnit.hp <= 0) {
            this.nextTurn();
            return;
        }

        if (this.activeUnit === this.enemy && this.enemy.staggered) {
            this.showFloatingText('STAGGER STUN! ENEMY TURN SKIPPED!', '#ffd700');
            this.enemy.staggered = false; // Recover stagger after skipped turn
            this.enemy.stagger = 0;
            setTimeout(() => this.nextTurn(), 1200);
            return;
        }

        // Update UI highlights
        this.renderTopHUD();
        this.renderPartyCards();
        this.renderQueue();

        // Update hero sprites highlights
        document.querySelectorAll('.hero-sprite').forEach(el => el.classList.remove('active-turn'));
        if (this.activeUnit !== this.enemy) {
            document.getElementById(`stage-hero-${this.activeUnit.id}`)?.classList.add('active-turn');
        }

        // Handle Turn Type
        if (this.activeUnit === this.enemy) {
            this.handleEnemyTurn();
        } else {
            this.handleHeroTurn();
        }
    }

    handleHeroTurn() {
        const hero = this.activeUnit;
        const inst = INSTRUMENTS[hero.equippedId] || INSTRUMENTS.solaris_strat;

        // Update active hero badge
        const badge = document.getElementById('cmd-hero-badge');
        badge.textContent = `⚡ ACTIVE TURN: ${hero.name.toUpperCase()} (${inst.icon} ${inst.name})`;

        // Update skill button text based on hero
        const skillSub = document.getElementById('cmd-skill-sub');
        skillSub.textContent = `${inst.skillName || 'Harmonic Burst'} (${inst.skillCost || 2} AP)`;

        // Check if ATTUNE is available (enemy HP < 35% and not already captured)
        const attuneBtn = document.getElementById('cmd-btn-attune');
        const canAttune = (this.enemy.hp / this.enemy.maxHp) <= 0.35 && !this.enemy.captured;
        attuneBtn.disabled = !canAttune;
        if (canAttune) {
            attuneBtn.classList.add('glow-btn');
        } else {
            attuneBtn.classList.remove('glow-btn');
        }

        // Enable / disable buttons based on AP
        document.getElementById('cmd-btn-attack').disabled = hero.ap < 1;
        document.getElementById('cmd-btn-skill').disabled = hero.ap < (inst.skillCost || 2);
        document.getElementById('cmd-btn-defend').disabled = false;
    }

    handleEnemyTurn() {
        const badge = document.getElementById('cmd-hero-badge');
        badge.textContent = `⚠️ ENEMY ATTACKING: ${this.enemy.name.toUpperCase()} IS LUNGING!`;

        // Disable command buttons during enemy turn
        document.querySelectorAll('.cmd-btn').forEach(btn => btn.disabled = true);

        // Pick a living target hero
        const livingHeroes = this.party.filter(h => h.hp > 0);
        const target = livingHeroes[Math.floor(Math.random() * livingHeroes.length)];

        this.showFloatingText(`${this.enemy.name} lunges at ${target.name}!`, '#ff0055');

        // Visible character attack telegraph animations (Sequence through all 10 Sprite Frames!)
        const enemyEl = document.querySelector('.enemy-sprite');
        const targetEl = document.getElementById(`stage-hero-${target.id}`);
        if (enemyEl) enemyEl.classList.add('enemy-lunge-windup');
        if (targetEl) targetEl.classList.add('parry-target-highlight');

        // Step through Wind-up and Thrust animation frames right as the telegraph starts
        this.setEnemyFrame(1); // Frame 1: WIND-UP 1 (0ms)
        setTimeout(() => { if (!resolved) this.setEnemyFrame(2); }, 280); // Frame 2: WIND-UP 2
        setTimeout(() => { if (!resolved) this.setEnemyFrame(3); }, 560); // Frame 3: ATTACK THRUST 1
        setTimeout(() => { if (!resolved) this.setEnemyFrame(4); }, 760); // Frame 4: ATTACK THRUST 2
        setTimeout(() => { if (!resolved) this.setEnemyFrame(5); }, 920); // Frame 5: ATTACK PEAK (right at parry flash!)
        setTimeout(() => { if (!resolved) this.setEnemyFrame(6); }, 1050); // Frame 6: ATTACK IMPACT

        // Launch Expedition 33 Real-Time Action Parry QTE right on the battlefield!
        const parryOverlay = document.getElementById('parry-qte-overlay');
        const outerRing = document.getElementById('parry-ring-outer');
        const innerRing = document.getElementById('parry-ring-inner');
        const parryFeedback = document.getElementById('parry-feedback');
        const instructionText = document.getElementById('parry-instruction-text');

        if (instructionText) instructionText.textContent = '[SPACE]';
        if (parryFeedback) parryFeedback.innerHTML = '';
        if (parryOverlay) parryOverlay.classList.remove('hidden');

        // Trigger shrinking ring animation
        if (outerRing) {
            outerRing.classList.remove('shrinking-ring');
            void outerRing.offsetWidth; // force reflow
            outerRing.classList.add('shrinking-ring');
        }
        if (innerRing) innerRing.classList.remove('parry-flash-active');

        // Play Telegraph wind-up sound
        audioEngine.playParryTelegraphSFX();

        let parried = false;
        let resolved = false;
        const startTime = performance.now();

        const resolveAttack = (success) => {
            if (resolved) return;
            resolved = true;
            parried = success;

            // Remove listeners
            window.removeEventListener('keydown', keyHandler);
            if (parryOverlay) parryOverlay.removeEventListener('pointerdown', touchHandler);
            document.removeEventListener('pointerdown', touchHandler);

            if (success) {
                // PERFECT PARRY & COUNTER!
                audioEngine.playParrySuccessSFX();
                if (parryFeedback) parryFeedback.innerHTML = `<div class="parry-success-sparks">✨ PERFECT PARRY!! 0 DAMAGE! ✨<br><span style="font-size:1.1rem; color:#00ffff;">COUNTER SLASH -65 HP &amp; +2 AP!</span></div>`;
                if (innerRing) innerRing.classList.add('parry-flash-active');

                // Recoil frame sequence on parry success
                this.setEnemyFrame(7); // Frame 7: RECOIL 1
                setTimeout(() => { if (this.currentEnemyFrame === 7) this.setEnemyFrame(8); }, 220); // Frame 8: RECOIL 2
                setTimeout(() => { if (this.currentEnemyFrame === 8) this.setEnemyFrame(9); }, 440); // Frame 9: IDLE AGAIN
                setTimeout(() => { if (this.currentEnemyFrame === 9) this.setEnemyFrame(0); }, 680); // Frame 0: IDLE

                // Counter attack animation
                if (targetEl) {
                    targetEl.classList.add('counter-dash');
                    setTimeout(() => targetEl.classList.remove('counter-dash'), 500);
                }

                // Counter damage & stagger to enemy
                this.enemy.hp = Math.max(0, this.enemy.hp - 65);
                this.enemy.stagger = Math.min(this.enemy.maxStagger, this.enemy.stagger + 35);
                target.ap = Math.min(target.maxAp, target.ap + 2);
            } else {
                // DIRECT HIT / MISS!
                audioEngine.playParryMissSFX();
                let finalDmg = this.enemy.baseDmg || 35;
                if (target.shield > 0) {
                    const absorbed = Math.min(target.shield, finalDmg);
                    target.shield -= absorbed;
                    finalDmg -= absorbed;
                }
                target.hp = Math.max(0, target.hp - finalDmg);

                if (parryFeedback) parryFeedback.innerHTML = `<div class="parry-hit-text">💥 DIRECT HIT! -${Math.round(finalDmg)} HP 💥</div>`;
                this.showFloatingText(`-${Math.round(finalDmg)} HP`, '#ff0055');

                // Impact and Recoil frame sequence on hit
                this.setEnemyFrame(6); // Frame 6: ATTACK IMPACT
                setTimeout(() => { if (this.currentEnemyFrame === 6) this.setEnemyFrame(8); }, 300); // Frame 8: RECOIL 2
                setTimeout(() => { if (this.currentEnemyFrame === 8) this.setEnemyFrame(0); }, 650); // Frame 0: IDLE

                // Shake screen and flash red
                document.body.classList.add('shake-screen');
                if (targetEl) targetEl.classList.add('hero-taking-hit');
                setTimeout(() => {
                    document.body.classList.remove('shake-screen');
                    if (targetEl) targetEl.classList.remove('hero-taking-hit');
                }, 400);
            }

            this.renderStage();
            this.renderTopHUD();
            this.renderPartyCards();

            // Cleanup & advance turn after 1.1s
            setTimeout(() => {
                if (parryOverlay) parryOverlay.classList.add('hidden');
                if (outerRing) outerRing.classList.remove('shrinking-ring');
                if (enemyEl) enemyEl.classList.remove('enemy-lunge-windup');
                if (targetEl) targetEl.classList.remove('parry-target-highlight');
                this.nextTurn();
            }, 1100);
        };

        const attemptParry = () => {
            if (resolved) return;
            const elapsed = performance.now() - startTime;
            // Perfect window: between 850ms and 1250ms during the ring contraction!
            if (elapsed >= 850 && elapsed <= 1250) {
                resolveAttack(true);
            } else if (elapsed < 850) {
                // Tapped too early!
                resolveAttack(false);
            }
        };

        const keyHandler = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                attemptParry();
            }
        };

        const touchHandler = (e) => {
            e.preventDefault();
            attemptParry();
        };

        window.addEventListener('keydown', keyHandler);
        if (parryOverlay) parryOverlay.addEventListener('pointerdown', touchHandler);
        document.addEventListener('pointerdown', touchHandler);

        // Visual flash indication right when the perfect parry window opens at 950ms
        setTimeout(() => {
            if (!resolved && innerRing) {
                innerRing.classList.add('parry-flash-active');
            }
        }, 950);

        // Auto-fail if not parried by 1300ms
        setTimeout(() => {
            if (!resolved) {
                resolveAttack(false);
            }
        }, 1300);
    }

    /* ==========================================================================
       HERO COMMAND ACTIONS
       ========================================================================== */
    onCommandAttack() {
        const hero = this.activeUnit;
        if (hero.ap < 1) return;

        hero.ap -= 1;
        const inst = INSTRUMENTS[hero.equippedId] || INSTRUMENTS.solaris_strat;

        this.showFloatingText(`${hero.name} plays ${inst.name}!`, 'var(--accent-cyan)');

        rhythmEngine.startHighway({
            mode: 'attack',
            instrumentPreset: inst.audioPreset,
            noteCount: 14,
            speed: inst.rhythmSpeed || 1.1,
            onComplete: (results) => {
                // Calculate weakness multiplier
                const weaknessMult = getTypeMultiplier(inst.type, this.enemy.type);
                let baseDmg = inst.baseDmg * results.multiplier * (results.score / 1500 + 0.5);
                let finalDmg = baseDmg * weaknessMult;

                if (this.enemy.staggered) finalDmg *= 1.5; // Bonus damage on staggered enemies!

                this.enemy.hp = Math.max(0, this.enemy.hp - finalDmg);

                // Add Stagger
                if (!this.enemy.staggered) {
                    const staggerGain = (weaknessMult * 25) + (results.combo * 2);
                    this.enemy.stagger = Math.min(100, this.enemy.stagger + staggerGain);
                    if (this.enemy.stagger >= 100) {
                        this.enemy.staggered = true;
                        this.showFloatingText('⚡ STAGGER BREAK!! ENEMY STUNNED!', '#ffd700');
                    }
                }

                // Show feedback text
                if (weaknessMult > 1.0) {
                    this.showFloatingText(`SUPER EFFECTIVE! -${Math.round(finalDmg)} HP`, '#00ff88');
                } else if (weaknessMult < 1.0) {
                    this.showFloatingText(`RESISTED -${Math.round(finalDmg)} HP`, '#ffaa00');
                } else {
                    this.showFloatingText(`-${Math.round(finalDmg)} HP`, '#ff0055');
                }

                // Restore 1 AP to active hero for high combo
                if (results.combo >= 8) {
                    hero.ap = Math.min(hero.maxAp, hero.ap + 1);
                    this.showFloatingText('+1 AP COMBO BONUS!', 'var(--accent-cyan)');
                }

                this.renderTopHUD();
                this.renderPartyCards();

                setTimeout(() => this.nextTurn(), 900);
            }
        });
    }

    onCommandSkill() {
        const hero = this.activeUnit;
        const inst = INSTRUMENTS[hero.equippedId] || INSTRUMENTS.solaris_strat;
        const cost = inst.skillCost || 2;
        if (hero.ap < cost) return;

        hero.ap -= cost;

        // Disable command buttons during Ultimate cast & spell tracing
        document.querySelectorAll('.cmd-btn').forEach(btn => btn.disabled = true);

        this.showFloatingText(`🔮 SPELL CASTING: ${inst.name.toUpperCase()} ATTUNEMENT! 🔮`, 'var(--accent-cyan)');

        // Launch Osu! Style Spell Casting Tracing Engine
        if (window.spellCastingEngine) {
            window.spellCastingEngine.startSpellCast({
                hero: hero,
                instrument: inst,
                onComplete: (spellResult) => {
                    this.executeUltimateCinematic(hero, inst, spellResult);
                }
            });
        } else {
            this.executeUltimateCinematic(hero, inst, { completedShapesCount: 3, scorePct: 100 });
        }
    }

    executeUltimateCinematic(hero, inst, spellResult = { completedShapesCount: 3, scorePct: 100 }) {
        // Handle both object format { completedShapesCount, scorePct } or raw number
        const shapesCompleted = typeof spellResult === 'object' && spellResult.completedShapesCount !== undefined ? spellResult.completedShapesCount : 3;
        const scorePct = typeof spellResult === 'object' && spellResult.scorePct !== undefined ? spellResult.scorePct : (typeof spellResult === 'number' ? spellResult : 100);

        // Determine multiplier directly from how many shapes were completed (0 to 3)
        let scoreMultiplier = 1.0;
        let rankText = 'STANDARD';
        let rankColor = '#fff';

        if (shapesCompleted >= 3) {
            scoreMultiplier = 2.5; // 3/3 PERFECT ATTUNEMENT
            rankText = '⚡ 3/3 SIGILS PERFECT! 2.5x MAXIMUM OVERDRIVE! ⚡';
            rankColor = 'var(--accent-gold)';
        } else if (shapesCompleted === 2) {
            scoreMultiplier = 1.8; // 2/3 GREAT ATTUNEMENT
            rankText = '✨ 2/3 SIGILS ATTUNED! 1.8x MAJOR OVERDRIVE! ✨';
            rankColor = '#00ff88';
        } else if (shapesCompleted === 1) {
            scoreMultiplier = 1.2; // 1/3 BASIC ATTUNEMENT
            rankText = '🔮 1/3 SIGIL ATTUNED! 1.2x RESONANCE! 🔮';
            rankColor = 'var(--accent-cyan)';
        } else {
            scoreMultiplier = 0.5; // MISSED ALL SHAPES
            rankText = '⚠️ 0/3 SIGILS! SPELL FRACTURED (0.5x POWER) ⚠️';
            rankColor = '#ff0055';
        }

        this.showFloatingText(rankText, rankColor);
        audioEngine.playUltimateSFX(inst.audioPreset);

        // Populate and display Ultimate Cinematic Overlay
        const ultOverlay = document.getElementById('ultimate-cinematic-overlay');
        const ultAvatar = document.getElementById('ultimate-avatar');
        const ultTitle = document.getElementById('ultimate-title');
        const cutinSub = document.querySelector('.cutin-sub');

        if (ultAvatar) ultAvatar.textContent = hero.avatar;
        if (ultTitle) ultTitle.textContent = `${inst.name.toUpperCase()} SYMPHONY`;
        if (cutinSub) cutinSub.textContent = `HARMONIC ATTUNEMENT: ${shapesCompleted}/3 SHAPES (${scoreMultiplier}x POWER)`;
        if (ultOverlay) {
            ultOverlay.classList.remove('hidden');
            ultOverlay.classList.remove('active-animation');
            void ultOverlay.offsetWidth;
            ultOverlay.classList.add('active-animation');
        }

        // Screen shake and neon flash
        document.body.classList.add('shake-screen');

        setTimeout(() => {
            if (ultOverlay) ultOverlay.classList.add('hidden');
            document.body.classList.remove('shake-screen');

            if (inst.id === 'valkyrie_flute') {
                // Heals party + damage
                const healAmt = Math.round(140 * scoreMultiplier);
                const dmgAmt = Math.round(240 * scoreMultiplier);
                this.showFloatingText(`🌟 SYMPHONY OF RENEWAL! +${healAmt} HP & ${dmgAmt} DMG! 🌟`, '#00ff88');
                this.party.forEach(h => {
                    if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + healAmt);
                });
                this.enemy.hp = Math.max(0, this.enemy.hp - dmgAmt);
            } else if (inst.id === 'aegis_keytar') {
                // Harmonic Shield + AP + burst
                const shieldAmt = Math.round(65 * scoreMultiplier);
                const dmgAmt = Math.round(290 * scoreMultiplier);
                this.showFloatingText(`🛡️ AEGIS BARRAGE! +${shieldAmt} SHIELD & ${dmgAmt} DMG! 🛡️`, 'var(--accent-cyan)');
                this.party.forEach(h => {
                    if (h.hp > 0) {
                        h.shield += shieldAmt;
                        h.ap = Math.min(h.maxAp, h.ap + 3);
                    }
                });
                this.enemy.hp = Math.max(0, this.enemy.hp - dmgAmt);
            } else {
                // Pure Overdrive Shred Ultimate
                const weaknessMult = getTypeMultiplier(inst.type, this.enemy.type);
                const baseUltDmg = inst.baseDmg * 3.5 * (weaknessMult > 1 ? 1.5 : 1.0) * scoreMultiplier;
                const finalUltDmg = Math.round(baseUltDmg + (this.enemy.staggered ? 250 : 0));

                this.enemy.hp = Math.max(0, this.enemy.hp - finalUltDmg);
                this.enemy.stagger = Math.min(this.enemy.maxStagger, this.enemy.stagger + Math.round(45 * scoreMultiplier));

                if (this.enemy.stagger >= this.enemy.maxStagger) {
                    this.enemy.staggered = true;
                    this.showFloatingText(`💥 STAGGER BREAK! -${finalUltDmg} ULTIMATE CRIT! 💥`, '#00ffff');
                } else {
                    this.showFloatingText(`💥 OVERDRIVE DESTRUCTION! -${finalUltDmg} HP! 💥`, '#ff0055');
                }
            }

            this.renderStage();
            this.renderTopHUD();
            this.renderPartyCards();
            setTimeout(() => this.nextTurn(), 1000);
        }, 2200);
    }

    onCommandAttune() {
        const hero = this.activeUnit;
        if (hero.ap < 1) return;
        if ((this.enemy.hp / this.enemy.maxHp) > 0.35 || this.enemy.captured) {
            this.showFloatingText('Enemy is too strong to capture! Lower HP below 35%!', '#ffaa00');
            return;
        }

        hero.ap -= 1;
        this.showFloatingText('🫧 HARMONIC ATTUNEMENT INITIATED!', 'var(--accent-gold)');

        rhythmEngine.startHighway({
            mode: 'capture',
            instrumentPreset: 'sine-breath',
            noteCount: 20,
            speed: 1.3,
            isCapture: true,
            onComplete: (results) => {
                if (results.capturePercent >= 75) {
                    // Capture Success!
                    this.enemy.hp = 0; // End fight
                    this.enemy.captured = true;
                    if (INSTRUMENTS[this.enemy.id]) {
                        INSTRUMENTS[this.enemy.id].captured = true;
                    }
                    this.renderTopHUD();
                    audioEngine.playCaptureSFX();
                    this.showFloatingText('✨ HARMONIC ATTUNEMENT SUCCESS! SEALED IN HARMONYDEX!', 'var(--accent-gold)');
                    setTimeout(() => this.handleCaptureSuccess(this.enemy.id), 1200);
                } else {
                    this.showFloatingText(`Capture failed! Only reached ${results.capturePercent}%. Hit more notes!`, '#ff0055');
                    setTimeout(() => this.nextTurn(), 1000);
                }
            }
        });
    }

    onCommandDefend() {
        const hero = this.activeUnit;
        hero.ap = Math.min(hero.maxAp, hero.ap + 2);
        hero.shield += 40;
        this.showFloatingText(`${hero.name} enters Parry Stance! (+40 Shield, +2 AP)`, '#00ff88');
        this.renderPartyCards();
        setTimeout(() => this.nextTurn(), 800);
    }

    /* ==========================================================================
       VICTORY / DEFEAT / CAPTURE MODALS
       ========================================================================== */
    handleVictory() {
        this.inBattle = false;
        audioEngine.playVictorySFX();

        const banner = document.getElementById('result-banner');
        const title = document.getElementById('result-title');
        const desc = document.getElementById('result-desc');
        const showcase = document.getElementById('result-capture-showcase');

        banner.textContent = '⚡ HARMONY RESTORED!';
        title.textContent = 'Victory!';
        desc.textContent = `You defeated ${this.enemy.name} and earned 200 Harmonic XP! Party AP and Health fully restored for exploration.`;
        showcase.classList.add('hidden');

        document.getElementById('modal-result').classList.remove('hidden');

        if (this.onVictory) this.onVictory(this.enemy.id);
    }

    handleCaptureSuccess(instId) {
        this.inBattle = false;
        const inst = INSTRUMENTS[instId] || INSTRUMENTS.titan_brass;

        const banner = document.getElementById('result-banner');
        const title = document.getElementById('result-title');
        const desc = document.getElementById('result-desc');
        const showcase = document.getElementById('result-capture-showcase');

        banner.textContent = '✨ HARMONIC ATTUNEMENT COMPLETE ✨';
        title.textContent = 'Instrument Captured!';
        desc.textContent = `You successfully attuned and sealed ${inst.name} into your Harmonydex!`;

        showcase.classList.remove('hidden');
        document.getElementById('capture-icon').textContent = inst.icon;
        document.getElementById('capture-name').textContent = inst.name;
        document.getElementById('capture-type').textContent = `${inst.type.toUpperCase()} TYPE`;
        document.getElementById('capture-type').className = `t-badge type-${inst.type}`;
        document.getElementById('capture-stats').textContent = `Base DMG: ${inst.baseDmg} | Preset: ${inst.audioPreset}`;

        document.getElementById('modal-result').classList.remove('hidden');

        if (this.onCapture) this.onCapture(instId);
    }

    handleDefeat() {
        this.inBattle = false;
        const banner = document.getElementById('result-banner');
        const title = document.getElementById('result-title');
        const desc = document.getElementById('result-desc');
        const showcase = document.getElementById('result-capture-showcase');

        banner.textContent = '⚠️ DISSONANCE OVERWHELMS...';
        title.textContent = 'Defeated';
        desc.textContent = 'Your party fell to the Dissonance. The village elder has restored your party to try again!';
        showcase.classList.add('hidden');

        document.getElementById('modal-result').classList.remove('hidden');

        if (this.onDefeat) this.onDefeat();
    }

    exitCombat() {
        document.getElementById('modal-result').classList.add('hidden');
        document.querySelectorAll('.game-screen').forEach(el => el.classList.remove('active'));
        document.getElementById('screen-overworld').classList.add('active');
        // Restore party HP for next fight
        this.party.forEach(h => { h.hp = h.maxHp; h.ap = h.maxAp; });
    }

    showFloatingText(text, color = '#ffffff') {
        const container = document.getElementById('fx-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.textContent = text;
        el.style.color = color;
        el.style.left = `${35 + Math.random() * 30}%`;
        el.style.top = `${35 + Math.random() * 20}%`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
}

// Global instance
const combatController = new CombatController();
window.combatController = combatController;
