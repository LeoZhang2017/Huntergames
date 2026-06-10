// -----------------------------------------------------------------------------
// Pause Menu controller
// -----------------------------------------------------------------------------
// Wires the #pause-menu overlay (defined in index.html) and overrides the
// legacy pauseGame/resumeGame functions that game.js declares globally.
//
// Loaded AFTER game.js. game.js's function declarations are hoisted onto the
// global (window) scope; assigning `window.pauseGame = ...` here replaces them
// at runtime. game.js's internal call sites (e.g. inside onPointerLockChange)
// look up `pauseGame` through the scope chain and resolve to the new global.
//
// The main animate() loop is already gated by `gameStarted && pointerLocked`,
// so AI, physics, and timers freeze the moment pointer lock is released —
// no additional pause flag is needed.
// -----------------------------------------------------------------------------

(function () {
    'use strict';

    const pauseMenuEl = document.getElementById('pause-menu');
    const pauseResumeBtn = document.getElementById('pause-resume');
    const pauseRestartBtn = document.getElementById('pause-restart');
    const pauseQuitBtn = document.getElementById('pause-quit');

    // If markup is missing (e.g. an older index.html), leave the existing
    // pauseGame/resumeGame in place so the click-to-continue fallback still works.
    if (!pauseMenuEl) {
        console.warn('[pause-menu] #pause-menu not found; using legacy pause behaviour.');
        return;
    }

    function showPauseMenu() {
        pauseMenuEl.removeAttribute('hidden');
    }

    function hidePauseMenu() {
        pauseMenuEl.setAttribute('hidden', '');
    }

    function hideLegacyMessage() {
        const msg = document.getElementById('game-message');
        if (msg) msg.style.display = 'none';
    }

    // --- Override pauseGame ---------------------------------------------------
    // Only show overlay during real gameplay. Never on the start screen,
    // between-stage checkpoints, or game-over screens.
    window.pauseGame = function pauseGame() {
        const gs = window.gameState;
        if (!gs || !gs.gameStarted || gs.gameOver || gs.stageCompleted) return;
        showPauseMenu();
    };

    // --- Override resumeGame -------------------------------------------------
    window.resumeGame = function resumeGame() {
        const gs = window.gameState;
        if (!gs || !gs.gameStarted || gs.gameOver) return;
        hidePauseMenu();
        hideLegacyMessage();
        const container = document.getElementById('game-container');
        if (container && container.requestPointerLock) {
            container.requestPointerLock();
        }
    };

    // --- Restart only the current stage --------------------------------------
    // Resets stage-scoped player state (health, position, ammo) and respawns
    // the current stage. Accumulated coins from prior stages are preserved.
    function restartCurrentStage() {
        const gs = window.gameState;
        if (!gs) return;
        hidePauseMenu();

        const stage = gs.currentStage;

        gs.player.health = 100;
        if (gs.player.position && gs.player.position.set) {
            gs.player.position.set(0, 2, 0);
        }
        if (gs.player.rotation && gs.player.rotation.set) {
            gs.player.rotation.set(0, 0, 0);
        }
        gs.player.isReloading = false;
        gs.player.reloadTime = 0;
        gs.enemies = [];
        gs.items = [];
        gs.stageCompleted = false;
        gs.gameOver = false;
        gs.enemySpawnTimer = 60;
        gs.enemySpawned = false;
        gs.warningShown = false;
        gs.spawnWarningShown = false;

        if (window.camera) {
            window.camera.position.set(0, 2.2, 0);
            window.camera.rotation.set(0, 0, 0);
        }

        if (typeof window.setupStage === 'function') {
            window.setupStage(stage);
        }

        const container = document.getElementById('game-container');
        if (container && container.requestPointerLock) {
            container.requestPointerLock();
        }
    }

    // --- Quit to the start screen -------------------------------------------
    function quitToMainMenu() {
        const gs = window.gameState;
        hidePauseMenu();
        hideLegacyMessage();

        if (gs) {
            gs.gameStarted = false;
            gs.timerActive = false;
        }

        const container = document.getElementById('game-container');
        if (document.pointerLockElement === container) {
            document.exitPointerLock();
        }

        const startBtn = document.getElementById('start-button');
        if (startBtn) startBtn.style.display = '';

        if (typeof window.resetGameState === 'function') {
            window.resetGameState();
        }
    }

    // --- Button wiring -------------------------------------------------------
    if (pauseResumeBtn) {
        pauseResumeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            window.resumeGame();
        });
    }
    if (pauseRestartBtn) {
        pauseRestartBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            restartCurrentStage();
        });
    }
    if (pauseQuitBtn) {
        pauseQuitBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            quitToMainMenu();
        });
    }
})();
