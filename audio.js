// -----------------------------------------------------------------------------
// Audio system — synthesized SFX + settings panel
// -----------------------------------------------------------------------------
// Loaded as a classic <script> AFTER game.js. Patches game.js globals so sound
// effects fire at the right moments without touching the 170KB game.js file.
//
// All sounds are synthesized with the WebAudio API — no asset files. This
// keeps the repo light and means the game still works offline / over file://.
//
// Settings:
//   - Master mute (boolean)
//   - Master volume (0..1)
//   - Persisted in localStorage under `hg.audio.muted` and `hg.audio.volume`.
//   - UI: a small gear button (top-right) opens a modal panel. Works from
//     the start screen, during gameplay, and from inside the pause overlay.
//
// AudioContext is created lazily on the first user gesture (browser autoplay
// policy) and resumed when the user clicks Start Game or Resume.
//
// Hooking strategy:
//   - For functions game.js CALLS by name (showPickupMessage, reloadWeapon,
//     gameOver, createEnhancedImpactEffect): overriding window.fn works,
//     because name resolution goes through the global object at call time.
//   - For functions game.js REGISTERS as event listeners (handleMouseDown):
//     overriding window.fn is too late — the listener captured the original
//     by value. So we attach our own listener instead.
// -----------------------------------------------------------------------------

(function () {
    'use strict';

    if (window.GameAudio) return;

    // ---- Settings persistence ----------------------------------------------
    const LS_MUTED = 'hg.audio.muted';
    const LS_VOLUME = 'hg.audio.volume';
    const DEFAULT_VOLUME = 0.7;

    function loadSettings() {
        let muted = false;
        let volume = DEFAULT_VOLUME;
        try {
            const m = localStorage.getItem(LS_MUTED);
            if (m !== null) muted = m === '1';
            const v = localStorage.getItem(LS_VOLUME);
            if (v !== null) {
                const n = parseFloat(v);
                if (!Number.isNaN(n)) volume = Math.min(1, Math.max(0, n));
            }
        } catch (e) { /* private mode etc. */ }
        return { muted, volume };
    }

    function saveSettings(s) {
        try {
            localStorage.setItem(LS_MUTED, s.muted ? '1' : '0');
            localStorage.setItem(LS_VOLUME, String(s.volume));
        } catch (e) { /* ignore */ }
    }

    const settings = loadSettings();

    // ---- AudioContext (lazy) ------------------------------------------------
    let ctx = null;
    let masterGain = null;

    function ensureCtx() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = settings.muted ? 0 : settings.volume;
        masterGain.connect(ctx.destination);
        return ctx;
    }

    function resume() {
        const c = ensureCtx();
        if (c && c.state === 'suspended') {
            c.resume().catch(() => {});
        }
    }

    function applyMasterGain() {
        if (!masterGain) return;
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(settings.muted ? 0 : settings.volume, ctx.currentTime);
    }

    // ---- Sound primitives ---------------------------------------------------
    // Fire-and-forget. Short-circuit when muted/silent so they cost nothing.
    function canPlay() {
        if (settings.muted || settings.volume <= 0) return false;
        if (!ensureCtx()) return false;
        return true;
    }

    let noiseBuffer = null;
    function getNoise() {
        if (!ctx) ensureCtx();
        if (!ctx) return null;
        if (noiseBuffer) return noiseBuffer;
        const len = Math.floor(ctx.sampleRate * 0.5);
        noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return noiseBuffer;
    }

    function envGain(attack, decay, peak) {
        const g = ctx.createGain();
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
        return g;
    }

    function playGunshot() {
        if (!canPlay()) return;
        const t = ctx.currentTime;
        // Noise burst (the crack)
        const noise = ctx.createBufferSource();
        noise.buffer = getNoise();
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 800;
        const noiseGain = envGain(0.001, 0.08, 0.6);
        noise.connect(hp).connect(noiseGain).connect(masterGain);
        noise.start(t);
        noise.stop(t + 0.1);
        // Low thump (the body)
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        const oscGain = envGain(0.001, 0.1, 0.5);
        osc.connect(oscGain).connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    function playDryFire() {
        if (!canPlay()) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 180;
        const g = envGain(0.001, 0.04, 0.12);
        osc.connect(g).connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    function playMechClick(delay) {
        if (!canPlay()) return;
        const t = ctx.currentTime + delay;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoise();
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2500;
        bp.Q.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.35, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        noise.connect(bp).connect(g).connect(masterGain);
        noise.start(t);
        noise.stop(t + 0.06);
    }

    function playReload() {
        // Two clicks ~150ms apart
        playMechClick(0);
        playMechClick(0.15);
    }

    function playPickup() {
        if (!canPlay()) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, t);
        osc.frequency.linearRampToValueAtTime(990, t + 0.08);
        const g = envGain(0.005, 0.12, 0.3);
        osc.connect(g).connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    function playWarning() {
        if (!canPlay()) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(220, t + 0.18);
        const g = envGain(0.005, 0.22, 0.28);
        osc.connect(g).connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.25);
    }

    function playHit() {
        if (!canPlay()) return;
        const t = ctx.currentTime;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoise();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 600;
        const g = envGain(0.001, 0.07, 0.35);
        noise.connect(lp).connect(g).connect(masterGain);
        noise.start(t);
        noise.stop(t + 0.09);
    }

    function playNote(freq, when, dur, peak) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(peak, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(g).connect(masterGain);
        osc.start(when);
        osc.stop(when + dur + 0.02);
    }

    function playWin() {
        if (!canPlay()) return;
        const t = ctx.currentTime;
        playNote(523.25, t,        0.15, 0.25); // C5
        playNote(659.25, t + 0.13, 0.15, 0.25); // E5
        playNote(783.99, t + 0.26, 0.3,  0.3);  // G5
    }

    function playLose() {
        if (!canPlay()) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.6);
        const g = envGain(0.01, 0.65, 0.25);
        osc.connect(g).connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.7);
    }

    // ---- Public API ---------------------------------------------------------
    const GameAudio = {
        play: function (name) {
            switch (name) {
                case 'gunshot':  return playGunshot();
                case 'dryfire':  return playDryFire();
                case 'reload':   return playReload();
                case 'pickup':   return playPickup();
                case 'warning':  return playWarning();
                case 'hit':      return playHit();
                case 'win':      return playWin();
                case 'lose':     return playLose();
                default: return;
            }
        },
        setMuted: function (v) {
            settings.muted = !!v;
            saveSettings(settings);
            applyMasterGain();
        },
        setVolume: function (v) {
            const n = Math.min(1, Math.max(0, Number(v) || 0));
            settings.volume = n;
            saveSettings(settings);
            applyMasterGain();
        },
        getSettings: function () { return { muted: settings.muted, volume: settings.volume }; },
        resume: resume,
    };
    window.GameAudio = GameAudio;

    // ---- Gunshot / dry-fire: own mousedown listener -------------------------
    // We CAN'T wrap window.handleMouseDown because game.js already passed it
    // to addEventListener — that copy is frozen. Add a parallel listener with
    // the same gating logic. Capture phase so we run before any future stops.
    window.addEventListener('mousedown', function (e) {
        if (!e || e.button !== 0) return;
        try {
            if (typeof gameState === 'undefined') return;
            if (!gameState.gameStarted || !gameState.pointerLocked) return;
            if (!gameState.player) return;
            if (gameState.player.isReloading) return;
            const w = gameState.player.weapon;
            if (!w) return;
            if (w.ammo > 0) GameAudio.play('gunshot');
            else GameAudio.play('dryfire');
        } catch (_) { /* never break the game over a SFX */ }
    }, true);

    // ---- Patch hooks for functions game.js calls by name --------------------
    function patchHooks() {
        // Reload click — only play if the reload actually started (the
        // function bails when isReloading or when there's no ammo to load).
        if (typeof window.reloadWeapon === 'function') {
            const orig = window.reloadWeapon;
            window.reloadWeapon = function () {
                const before = (typeof gameState !== 'undefined') && gameState.player &&
                               gameState.player.isReloading;
                const result = orig.apply(this, arguments);
                try {
                    if (typeof gameState !== 'undefined' && gameState.player &&
                        !before && gameState.player.isReloading) {
                        GameAudio.play('reload');
                    }
                } catch (_) {}
                return result;
            };
        }

        // Pickup / warning — every collectible/trap event funnels through here.
        if (typeof window.showPickupMessage === 'function') {
            const orig = window.showPickupMessage;
            window.showPickupMessage = function (message, isWarning) {
                try {
                    GameAudio.play(isWarning ? 'warning' : 'pickup');
                } catch (_) {}
                return orig.apply(this, arguments);
            };
        }

        // Enemy hit — every successful bullet impact funnels through here.
        if (typeof window.createEnhancedImpactEffect === 'function') {
            const orig = window.createEnhancedImpactEffect;
            window.createEnhancedImpactEffect = function (position, type) {
                try {
                    if (!type || type === 'hit') GameAudio.play('hit');
                } catch (_) {}
                return orig.apply(this, arguments);
            };
        }

        // Win / lose
        if (typeof window.gameOver === 'function') {
            const orig = window.gameOver;
            window.gameOver = function (playerWon) {
                try {
                    GameAudio.play(playerWon ? 'win' : 'lose');
                } catch (_) {}
                return orig.apply(this, arguments);
            };
        }

        // Resume the AudioContext on Start Game (first user gesture path).
        if (typeof window.startGame === 'function') {
            const orig = window.startGame;
            window.startGame = function () {
                resume();
                return orig.apply(this, arguments);
            };
        }
        // Also resume on Resume from pause.
        if (typeof window.resumeGame === 'function') {
            const orig = window.resumeGame;
            window.resumeGame = function () {
                resume();
                return orig.apply(this, arguments);
            };
        }
    }

    // Wait for `load` so we wrap the final versions (including any wrappers
    // pause-menu.js or other later scripts installed).
    if (document.readyState === 'complete') {
        patchHooks();
    } else {
        window.addEventListener('load', patchHooks);
    }

    // ---- Settings UI --------------------------------------------------------
    function buildUI() {
        const gear = document.createElement('button');
        gear.id = 'audio-gear';
        gear.type = 'button';
        gear.className = 'audio-gear';
        gear.title = 'Audio settings';
        gear.setAttribute('aria-label', 'Open audio settings');
        gear.textContent = '⚙';

        const panel = document.createElement('div');
        panel.id = 'audio-panel';
        panel.className = 'audio-panel';
        panel.setAttribute('hidden', '');
        panel.innerHTML = [
            '<div class="audio-panel__card" role="dialog" aria-labelledby="audio-panel-title">',
            '  <h2 class="audio-panel__title" id="audio-panel-title">Audio</h2>',
            '  <label class="audio-panel__row">',
            '    <input type="checkbox" id="audio-mute"> Mute all',
            '  </label>',
            '  <label class="audio-panel__row">',
            '    <span>Volume</span>',
            '    <input type="range" id="audio-volume" min="0" max="100" step="1">',
            '    <span class="audio-panel__vnum" id="audio-vnum">70</span>',
            '  </label>',
            '  <div class="audio-panel__row audio-panel__row--right">',
            '    <button type="button" id="audio-test" class="audio-panel__btn">Test</button>',
            '    <button type="button" id="audio-close" class="audio-panel__btn audio-panel__btn--primary">Close</button>',
            '  </div>',
            '</div>'
        ].join('');

        (document.body || document.documentElement).appendChild(gear);
        (document.body || document.documentElement).appendChild(panel);

        const muteEl = panel.querySelector('#audio-mute');
        const volEl = panel.querySelector('#audio-volume');
        const vnumEl = panel.querySelector('#audio-vnum');
        const testEl = panel.querySelector('#audio-test');
        const closeEl = panel.querySelector('#audio-close');

        function syncFromSettings() {
            muteEl.checked = settings.muted;
            volEl.value = String(Math.round(settings.volume * 100));
            vnumEl.textContent = volEl.value;
        }
        syncFromSettings();

        function openPanel() {
            syncFromSettings();
            panel.removeAttribute('hidden');
            resume(); // first user gesture
        }
        function closePanel() {
            panel.setAttribute('hidden', '');
        }

        gear.addEventListener('click', function (e) {
            e.stopPropagation();
            if (panel.hasAttribute('hidden')) openPanel(); else closePanel();
        });
        closeEl.addEventListener('click', function (e) {
            e.stopPropagation();
            closePanel();
        });
        // Click outside the card closes the panel.
        panel.addEventListener('click', function (e) {
            if (e.target === panel) closePanel();
        });

        muteEl.addEventListener('change', function () {
            GameAudio.setMuted(muteEl.checked);
        });
        volEl.addEventListener('input', function () {
            const v = Number(volEl.value) / 100;
            GameAudio.setVolume(v);
            vnumEl.textContent = volEl.value;
        });
        testEl.addEventListener('click', function (e) {
            e.stopPropagation();
            GameAudio.play('pickup');
        });
    }

    if (document.body) {
        buildUI();
    } else {
        document.addEventListener('DOMContentLoaded', buildUI, { once: true });
    }
})();
