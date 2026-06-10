// -----------------------------------------------------------------------------
// Pause Menu controller
// -----------------------------------------------------------------------------
// Wires the #pause-menu overlay (defined in index.html) and overrides the
// legacy `pauseGame` / `resumeGame` functions that game.js declares.
//
// Loaded as a classic <script> AFTER game.js. In classic scripts, top-level
// `const`/`let` declarations (e.g. `const gameState = {...}`) live in the
// shared script scope and are reachable by bare name from sibling scripts —
// but they are NOT attached to `window`. Top-level `function` declarations
// DO get hoisted onto `window`, which is why we can assign to
// `window.pauseGame` / `window.resumeGame` to override them.
//
// The main animate() loop is already gated by `gameStarted && pointerLocked`,
// so AI, physics, and timers freeze the moment pointer lock is released — no
// additional pause flag is needed here.
// -----------------------------------------------------------------------------

(function () {
    'use strict';

    const pauseMenuEl = document.getElementById('pause-menu');
    const pauseResumeBtn = document.getElementById('pause-resume');
    const pauseRestartBtn = document.getElementById('pause-restart');
    const pauseQuitBtn = document.getElementById('pause-quit');

    // If markup is missing (e.g. older index.html), leave the existing
    // click-to-continue pauseGame in place.
    if (!pauseMenuEl) {
        console.warn('[pause-menu] #pause-menu not found; using legacy pause behaviour.');
        return;
    }

    const containerEl = document.getElementById('game-container');
    const messageEl = document.getElementById('game-message');
    const startBtn = document.getElementById('start-button');

    function showPauseMenu() {
        pauseMenuEl.removeAttribute('hidden');
    }

    function hidePauseMenu() {
        pauseMenuEl.setAttribute('hidden', '');
    }

    function hideLegacyMessage() {
        if (messageEl) messageEl.style.display = 'none';
    }

    // The caller in game.js (`onPointerLockChange`) already gates this with
    //   gameStarted && !stageCompleted && !gameOver
    // so we just need to show the overlay.
    window.pauseGame = function pauseGame() {
        showPauseMenu();
    };

    window.resumeGame = function resumeGame() {
        // gameState is a top-level `const` in game.js — reachable by bare name
        // from this sibling classic script.
        if (typeof gameState === 'undefined' || !gameState.gameStarted || gameState.gameOver) {
            hidePauseMenu();
            return;
        }
        hidePauseMenu();
        hideLegacyMessage();
        if (containerEl && containerEl.requestPointerLock) {
            containerEl.requestPointerLock();
        }
    };

    // Restart only the current stage. Preserves accumulated coins from prior
    // stages; resets stage-scoped state (health, position, ammo, enemies,
    // items, timers) and respawns the stage.
    function restartCurrentStage() {
        hidePauseMenu();
        if (typeof gameState === 'undefined') return;

        const stage = gameState.currentStage;

        gameState.player.health = 100;
        if (gameState.player.position && gameState.player.position.set) {
            gameState.player.position.set(0, 2, 0);
        }
        if (gameState.player.rotation && gameState.player.rotation.set) {
            gameState.player.rotation.set(0, 0, 0);
        }
        gameState.player.isReloading = false;
        gameState.player.reloadTime = 0;
        gameState.enemies = [];
        gameState.items = [];
        gameState.stageCompleted = false;
        gameState.gameOver = false;
        gameState.enemySpawnTimer = 60;
        gameState.enemySpawned = false;
        gameState.warningShown = false;
        gameState.spawnWarningShown = false;

        // `camera` is a top-level `let` in game.js.
        if (typeof camera !== 'undefined' && camera) {
            camera.position.set(0, 2.2, 0);
            camera.rotation.set(0, 0, 0);
        }

        // `setupStage` is a top-level function — on `window`.
        if (typeof setupStage === 'function') {
            setupStage(stage);
        }

        if (containerEl && containerEl.requestPointerLock) {
            containerEl.requestPointerLock();
        }
    }

    function quitToMainMenu() {
        hidePauseMenu();
        hideLegacyMessage();

        if (typeof gameState !== 'undefined') {
            gameState.gameStarted = false;
            gameState.timerActive = false;
        }

        if (document.pointerLockElement === containerEl) {
            document.exitPointerLock();
        }

        // Restore the original Start button so a new game can begin.
        if (startBtn) startBtn.style.display = '';

        // `resetGameState` is a top-level function declared in game.js.
        if (typeof resetGameState === 'function') {
            resetGameState();
        }
    }

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
