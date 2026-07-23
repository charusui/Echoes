/* ==========================================================================
   HARMONYDEX - MAIN GAME INITIALIZATION & ENTRY POINT
   ========================================================================== */

window.startHarmonydexGame = function() {
    console.log('⚡ Start button clicked - Launching Harmonydex!');
    const splashScreen = document.getElementById('splash-screen');
    const gameApp = document.getElementById('game-app');

    const audio = window.audioEngine || (typeof audioEngine !== 'undefined' ? audioEngine : null);
    const overworld = window.overworldController || (typeof overworldController !== 'undefined' ? overworldController : null);
    const ui = window.uiManager || (typeof uiManager !== 'undefined' ? uiManager : null);
    const combat = window.combatController || (typeof combatController !== 'undefined' ? combatController : null);

    // Unlock Web Audio API on click
    if (audio) audio.init();

    // Hide splash screen and reveal game app
    if (splashScreen) splashScreen.classList.remove('active');
    if (gameApp) gameApp.classList.remove('hidden');

    // Initialize controllers safely
    if (overworld) overworld.init();
    if (ui) ui.init();
    if (combat) combat.bindCommandButtons();

    // Play initial unlock SFX
    setTimeout(() => {
        if (audio) audio.playHitSFX('sick');
    }, 150);

    console.log('🎼 Expedition Entered! Welcome to Harmonydex.');
};

function initApp() {
    console.log('⚡ Initializing Harmonydex Prototype DOM...');

    const startBtn = document.getElementById('btn-start-game');
    if (startBtn && !startBtn.dataset.bound) {
        startBtn.dataset.bound = "true";
        startBtn.addEventListener('click', () => {
            window.startHarmonydexGame();
        });
    }

    const combat = window.combatController || (typeof combatController !== 'undefined' ? combatController : null);
    if (combat) combat.bindCommandButtons();

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        const audio = window.audioEngine || (typeof audioEngine !== 'undefined' ? audioEngine : null);
        const rhythm = window.rhythmEngine || (typeof rhythmEngine !== 'undefined' ? rhythmEngine : null);
        const ui = window.uiManager || (typeof uiManager !== 'undefined' ? uiManager : null);
        const com = window.combatController || (typeof combatController !== 'undefined' ? combatController : null);

        // Mute on M
        if (e.key === 'm' || e.key === 'M') {
            if (audio) {
                const isMuted = audio.toggleMute();
                const iconEl = document.getElementById('mute-icon');
                if (iconEl) iconEl.textContent = isMuted ? '🔇' : '🔊';
            }
        }
        // Harmonydex shortcut on H
        if (e.key === 'h' || e.key === 'H') {
            if (rhythm && !rhythm.active && ui) {
                ui.openHarmonydexModal();
            }
        }
        // Equipment shortcut on E
        if (e.key === 'e' || e.key === 'E') {
            if (rhythm && !rhythm.active && com && !com.inBattle && ui) {
                ui.openEquipmentModal();
            }
        }
    });
}

// Run init right away if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
