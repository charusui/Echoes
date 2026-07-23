/* ==========================================================================
   HARMONYDEX - UI & MODAL MANAGEMENT (Encyclopedia, Equipment, Quests)
   ========================================================================== */

class UIManager {
    constructor() {
        this.selectedDexId = 'solaris_strat';
        this.selectedHeroId = 'gustave';
    }

    init() {
        this.bindNav();
        this.bindModals();
        this.updateQuestHUD();
        this.updatePartyMiniHUD();
    }

    bindNav() {
        document.getElementById('nav-btn-overworld')?.addEventListener('click', (e) => {
            this.setActiveNav('nav-btn-overworld');
            document.querySelectorAll('.game-screen').forEach(el => el.classList.remove('active'));
            document.getElementById('screen-overworld').classList.add('active');
        });

        document.getElementById('nav-btn-harmonydex')?.addEventListener('click', () => {
            this.openHarmonydexModal();
        });

        document.getElementById('nav-btn-equipment')?.addEventListener('click', () => {
            this.openEquipmentModal();
        });

        document.getElementById('nav-btn-quests')?.addEventListener('click', () => {
            this.openQuestsModal();
        });

        document.getElementById('hud-quest-pill')?.addEventListener('click', () => {
            this.openQuestsModal();
        });

        document.getElementById('nav-btn-mute')?.addEventListener('click', () => {
            const isMuted = audioEngine.toggleMute();
            const iconEl = document.getElementById('mute-icon');
            if (iconEl) iconEl.textContent = isMuted ? '🔇' : '🔊';
        });
    }

    bindModals() {
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-close');
                document.getElementById(targetId)?.classList.add('hidden');
            });
        });

        // Close when clicking modal backdrop
        document.querySelectorAll('.game-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    setActiveNav(btnId) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(btnId)?.classList.add('active');
    }

    updateQuestHUD() {
        const activeQuest = Object.values(QUESTS).find(q => q.status === 'active') || Object.values(QUESTS)[2];
        const titleEl = document.getElementById('hud-quest-title');
        if (titleEl) {
            titleEl.textContent = activeQuest ? activeQuest.title : 'All Expeditions Completed!';
        }

        // Update Dex badge
        const countBadge = document.getElementById('dex-count-badge');
        const capturedCount = Object.values(INSTRUMENTS).filter(i => i.captured).length;
        const totalCount = Object.keys(INSTRUMENTS).length;
        if (countBadge) {
            countBadge.textContent = `${capturedCount}/${totalCount}`;
        }
    }

    updatePartyMiniHUD() {
        const container = document.getElementById('hud-party-mini');
        if (!container) return;
        container.innerHTML = '';

        Object.values(HEROES).forEach(hero => {
            const inst = INSTRUMENTS[hero.equippedId] || INSTRUMENTS.solaris_strat;
            const hpPct = Math.round((hero.hp / hero.maxHp) * 100);
            const el = document.createElement('div');
            el.className = 'mini-hero-item';
            el.innerHTML = `
                <span class="mini-hero-avatar">${hero.avatar}</span>
                <div class="mini-hero-info">
                    <span class="mini-hero-name">${hero.name} <small style="color: var(--type-${inst.type});">(${inst.icon})</small></span>
                    <div class="mini-hp-bar"><div class="mini-hp-fill" style="width: ${hpPct}%;"></div></div>
                </div>
            `;
            container.appendChild(el);
        });
    }

    /* ==========================================================================
       HARMONYDEX ENCYCLOPEDIA MODAL
       ========================================================================== */
    openHarmonydexModal() {
        const modal = document.getElementById('modal-harmonydex');
        modal.classList.remove('hidden');
        audioEngine.playHitSFX('good');

        this.renderDexSidebar();
        this.renderDexDetail(this.selectedDexId);
    }

    renderDexSidebar() {
        const container = document.getElementById('dex-list-container');
        if (!container) return;
        container.innerHTML = '';

        Object.values(INSTRUMENTS).forEach(inst => {
            const el = document.createElement('div');
            el.className = `dex-list-item ${inst.id === this.selectedDexId ? 'selected' : ''}`;
            el.innerHTML = `
                <span class="dex-item-icon">${inst.captured ? inst.icon : '❓'}</span>
                <div>
                    <div style="font-weight: 800; font-size: 0.95rem;">${inst.captured ? inst.name : 'Unknown Instrument'}</div>
                    <span class="t-badge type-${inst.captured ? inst.type : 'string'}" style="font-size: 0.65rem;">${inst.captured ? inst.type.toUpperCase() : 'LOCKED'}</span>
                </div>
            `;
            el.addEventListener('click', () => {
                this.selectedDexId = inst.id;
                this.renderDexSidebar();
                this.renderDexDetail(inst.id);
                audioEngine.playHitSFX('good');
            });
            container.appendChild(el);
        });
    }

    renderDexDetail(instId) {
        const panel = document.getElementById('dex-detail-panel');
        if (!panel) return;

        const inst = INSTRUMENTS[instId];
        if (!inst || !inst.captured) {
            panel.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 4rem; margin-bottom: 16px;">❓</div>
                    <h2>Undiscovered Instrument</h2>
                    <p style="color: hsla(0,0%,70%,0.8); max-width: 400px; margin: 12px auto;">
                        This harmonic entity has not yet been sealed into your Harmonydex. Encounter it in the overworld and use <strong>Harmonic Attunement</strong> when its HP is below 35%!
                    </p>
                </div>
            `;
            return;
        }

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px;">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div style="font-size: 4rem; width: 100px; height: 100px; border-radius: 16px; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; border: 2px solid var(--type-${inst.type});">
                        ${inst.icon}
                    </div>
                    <div>
                        <span class="t-badge type-${inst.type}">${inst.type.toUpperCase()} TYPE</span>
                        <h2 style="font-size: 2rem; font-weight: 900; margin: 6px 0;">${inst.name}</h2>
                        <span style="font-size: 0.85rem; color: var(--accent-gold); font-weight: 700;">Synthesis Preset: ${inst.audioPreset.toUpperCase()}</span>
                    </div>
                </div>
                <button class="dex-preview-btn" id="btn-dex-preview">
                    <span>🔊 PLAY AUDIO SAMPLE</span>
                </button>
            </div>

            <div style="margin-top: 16px;">
                <h4 style="font-size: 0.9rem; color: var(--accent-cyan); margin-bottom: 6px;">HARMONIC LORE</h4>
                <p style="font-size: 0.95rem; line-height: 1.6; color: hsla(0,0%,85%,0.9);">${inst.lore || inst.desc}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px;">
                <div class="glass-card" style="text-align: center;">
                    <span style="font-size: 0.75rem; color: hsla(0,0%,70%,0.8);">BASE DAMAGE</span>
                    <div style="font-size: 1.6rem; font-weight: 900; color: #fff;">${inst.baseDmg}</div>
                </div>
                <div class="glass-card" style="text-align: center;">
                    <span style="font-size: 0.75rem; color: hsla(0,0%,70%,0.8);">SPECIAL SKILL</span>
                    <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent-cyan);">${inst.skillName || 'Harmonic Burst'}</div>
                </div>
                <div class="glass-card" style="text-align: center;">
                    <span style="font-size: 0.75rem; color: hsla(0,0%,70%,0.8);">RHYTHM SPEED</span>
                    <div style="font-size: 1.6rem; font-weight: 900; color: #00ff88;">${inst.rhythmSpeed || 1.1}x</div>
                </div>
            </div>

            <div class="glass-card" style="margin-top: 16px;">
                <h4 style="font-size: 0.85rem; color: var(--accent-gold); margin-bottom: 6px;">⚡ TYPE MATCHUP SUMMARY</h4>
                <p style="font-size: 0.85rem; line-height: 1.5; color: hsla(0,0%,80%,0.85);">
                    As a <strong>${inst.type.toUpperCase()}</strong> type instrument, it deals <strong>2.0x Super Effective</strong> damage against ${this.getStrongAgainst(inst.type).toUpperCase()} types, but deals reduced damage to ${this.getWeakAgainst(inst.type).toUpperCase()} types!
                </p>
            </div>
        `;

        document.getElementById('btn-dex-preview')?.addEventListener('click', () => {
            // Play a groovy 4-note arpeggio sample
            [0, 2, 4, 6].forEach((noteIdx, idx) => {
                setTimeout(() => {
                    audioEngine.playInstrumentNote(inst.audioPreset, noteIdx, 0.35);
                }, idx * 140);
            });
        });
    }

    getStrongAgainst(type) {
        if (type === 'string') return 'percussion';
        if (type === 'percussion') return 'brass';
        if (type === 'brass') return 'synth';
        if (type === 'synth') return 'woodwind';
        return 'string';
    }

    getWeakAgainst(type) {
        if (type === 'string') return 'woodwind';
        if (type === 'percussion') return 'string';
        if (type === 'brass') return 'percussion';
        if (type === 'synth') return 'brass';
        return 'synth';
    }

    /* ==========================================================================
       EQUIPMENT MODAL
       ========================================================================== */
    openEquipmentModal() {
        const modal = document.getElementById('modal-equipment');
        modal.classList.remove('hidden');
        audioEngine.playHitSFX('good');

        this.renderHeroTabs();
        this.renderHeroEquipView(this.selectedHeroId);
    }

    renderHeroTabs() {
        const container = document.getElementById('equip-hero-tabs');
        if (!container) return;
        container.innerHTML = '';

        Object.values(HEROES).forEach(hero => {
            const btn = document.createElement('button');
            btn.className = `hero-tab-btn ${hero.id === this.selectedHeroId ? 'active' : ''}`;
            btn.innerHTML = `${hero.avatar} ${hero.name}`;
            btn.addEventListener('click', () => {
                this.selectedHeroId = hero.id;
                this.renderHeroTabs();
                this.renderHeroEquipView(hero.id);
                audioEngine.playHitSFX('good');
            });
            container.appendChild(btn);
        });
    }

    renderHeroEquipView(heroId) {
        const container = document.getElementById('hero-equip-view');
        if (!container) return;

        const hero = HEROES[heroId];
        const currentInst = INSTRUMENTS[hero.equippedId] || INSTRUMENTS.solaris_strat;

        // Get all captured instruments
        const capturedInsts = Object.values(INSTRUMENTS).filter(i => i.captured);

        let gridHtml = '';
        capturedInsts.forEach(inst => {
            const isEquipped = inst.id === hero.equippedId;
            gridHtml += `
                <div class="equip-item-card ${isEquipped ? 'equipped' : ''}" data-inst="${inst.id}">
                    <div style="font-size: 2.5rem;">${inst.icon}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 800; font-size: 0.95rem;">${inst.name}</span>
                            <span class="t-badge type-${inst.type}" style="font-size: 0.65rem;">${inst.type.toUpperCase()}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: hsla(0,0%,70%,0.8); margin-top: 4px;">
                            DMG: ${inst.baseDmg} | Skill: ${inst.skillName || 'Burst'}
                        </div>
                    </div>
                    ${isEquipped ? `<span style="color: var(--accent-gold); font-weight: 800; font-size: 0.8rem;">[EQUIPPED]</span>` : `<button class="btn-primary" style="padding: 6px 12px; font-size: 0.75rem;">EQUIP</button>`}
                </div>
            `;
        });

        container.innerHTML = `
            <div class="glass-card" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h3 style="font-size: 1.3rem; color: var(--accent-cyan);">${hero.name} (${hero.role})</h3>
                    <p style="font-size: 0.9rem; color: hsla(0,0%,80%,0.85);">${hero.desc}</p>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.75rem; color: hsla(0,0%,70%,0.8);">CURRENT WEAPON</span>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #fff;">${currentInst.icon} ${currentInst.name}</div>
                </div>
            </div>

            <h4 style="font-size: 0.9rem; color: var(--accent-gold); margin-bottom: 12px;">SELECT FROM CAPTURED HARMONYDEX INSTRUMENTS:</h4>
            <div class="equip-grid">
                ${gridHtml}
            </div>
        `;

        // Bind equip clicks
        container.querySelectorAll('.equip-item-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetInstId = card.getAttribute('data-inst');
                if (targetInstId && targetInstId !== hero.equippedId) {
                    HEROES[heroId].equippedId = targetInstId;
                    audioEngine.playHitSFX('sick');
                    this.renderHeroEquipView(heroId);
                    this.updatePartyMiniHUD();
                }
            });
        });
    }

    /* ==========================================================================
       QUEST JOURNAL MODAL
       ========================================================================== */
    openQuestsModal() {
        const modal = document.getElementById('modal-quests');
        modal.classList.remove('hidden');
        audioEngine.playHitSFX('good');

        const container = document.getElementById('quest-list-container');
        if (!container) return;
        container.innerHTML = '';

        Object.values(QUESTS).forEach(quest => {
            const el = document.createElement('div');
            el.className = 'glass-card';
            el.style.marginBottom = '14px';
            el.style.borderLeft = quest.status === 'active' ? '4px solid var(--accent-gold)' : (quest.status === 'completed' ? '4px solid #00ff88' : '4px solid rgba(255,255,255,0.2)');

            const statusLabel = quest.status === 'active' ? '⚡ ACTIVE EXPEDITION' : (quest.status === 'completed' ? '✓ COMPLETED' : '🔒 LOCKED');
            const statusColor = quest.status === 'active' ? 'var(--accent-gold)' : (quest.status === 'completed' ? '#00ff88' : 'hsla(0,0%,60%,0.8)');

            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3 style="font-size: 1.2rem; font-weight: 800; color: #fff;">${quest.title}</h3>
                    <span style="font-size: 0.75rem; font-weight: 800; color: ${statusColor};">${statusLabel}</span>
                </div>
                <p style="font-size: 0.95rem; line-height: 1.5; color: hsla(0,0%,80%,0.9); margin-bottom: 12px;">${quest.desc}</p>
                <div style="font-size: 0.8rem; color: var(--accent-cyan); font-weight: 700;">
                    🎁 Reward: ${quest.rewardText}
                </div>
            `;
            container.appendChild(el);
        });
    }
}

// Global instance
const uiManager = new UIManager();
window.uiManager = uiManager;
