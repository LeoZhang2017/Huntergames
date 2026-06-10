// -----------------------------------------------------------------------------
// Audio system — synthesized SFX, positional footsteps, ambient BGM + settings
// -----------------------------------------------------------------------------
// Loaded as a classic <script> AFTER game.js. Patches game.js globals so sound
// effects fire at the right moments without touching the 170KB game.js file.
//
// All sounds are synthesized with the WebAudio API — no asset files.
//
// Sections (in order):
//   1. Settings persistence (master mute / master volume / music volume)
//   2. AudioContext + master gain + music bus
//   3. SFX synth primitives (gunshot, dryfire, reload, pickup, warning, hit,
//      win, lose, hurt)
//   4. Positional audio (PannerNode pool, listener sync, enemy footstep tick)
//   5. BGM (per-stage ambient pad, cross-fade, pause/resume)
//   6. Public GameAudio API
//   7. Hooks into game.js (own mousedown listener; wraps for updateUI,
//      reloadWeapon, showPickupMessage, createEnhancedImpactEffect, gameOver,
//      setupStage, pauseGame, resumeGame, startGame)
//   8. Settings UI (gear button + modal panel)
//
// Hooking notes:
//   - Functions game.js CALLS by name (updateUI, reloadWeapon, gameOver, etc.)
//     can be wrapped by reassigning window.fn — name lookup goes through the
//     global object at call time.
//   - Functions game.js REGISTERS as event listeners (handleMouseDown) can't
//     be wrapped that way — the listener captured the original by value. We
//     attach our own listener in capture phase instead.
// -----------------------------------------------------------------------------

(function () {
    'use strict';

    if (window.GameAudio) return;

    // =========================================================================
    // 1. Settings persistence
    // =========================================================================
    const LS_MUTED = 'hg.audio.muted';
    const LS_VOLUME = 'hg.audio.volume';
    const LS_MUSIC = 'hg.audio.music';
    const DEFAULT_VOLUME = 0.7;
    const DEFAULT_MUSIC = 0.4; // BGM is naturally less prominent than SFX.

    function loadSettings() {
        let muted = false;
        let volume = DEFAULT_VOLUME;
        let music = DEFAULT_MUSIC;
        try {
            const m = localStorage.getItem(LS_MUTED);
            if (m !== null) muted = m === '1';
            const v = localStorage.getItem(LS_VOLUME);
            if (v !== null) {
                const n = parseFloat(v);
                if (!Number.isNaN(n)) volume = clamp01(n);
            }
            const mu = localStorage.getItem(LS_MUSIC);
            if (mu !== null) {
                const n = parseFloat(mu);
                if (!Number.isNaN(n)) music = clamp01(n);
            }
        } catch (e) { /* private mode etc. */ }
        return { muted, volume, music };
    }

    function saveSettings(s) {
        try {
            localStorage.setItem(LS_MUTED, s.muted ? '1' : '0');
            localStorage.setItem(LS_VOLUME, String(s.volume));
            localStorage.setItem(LS_MUSIC, String(s.music));
        } catch (e) { /* ignore */ }
    }

    function clamp01(n) { return Math.min(1, Math.max(0, n)); }

    const settings = loadSettings();

    // =========================================================================
    // 2. AudioContext + master gain + music bus
    // =========================================================================
    let ctx = null;
    let masterGain = null;   // everything connects through here
    let musicGain = null;    // sub-bus just for BGM (multiplied by music vol)

    function ensureCtx() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = settings.muted ? 0 : settings.volume;
        masterGain.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.gain.value = settings.music;
        musicGain.connect(masterGain);
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

    function applyMusicGain() {
        if (!musicGain) return;
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(settings.music, ctx.currentTime);
    }

    // =========================================================================
    // 3. SFX synth primitives
    // =========================================================================
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
        const noise = ctx.createBufferSource();
        noise.buffer = getNoise();
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 800;
        const noiseGain = envGain(0.001, 0.08, 0.6);
        noise.connect(hp).connect(noiseGain).connect(masterGain);
        noise.start(t);
        noise.stop(t + 0.1);
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

    function playHurt() {
        // Player taking damage — sharp gasp/grunt. Distinct from enemy hits.
        if (!canPlay()) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.22);
        const g = envGain(0.005, 0.25, 0.4);
        // A touch of LP to soften the saw's bite.
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        osc.connect(lp).connect(g).connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.3);
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

    // =========================================================================
    // 4. Positional audio — enemy footsteps via HRTF panner
    // =========================================================================
    // We sync ctx.listener to the THREE camera every tick. PannerNodes are
    // cheap individually but we pool them per-enemy so we don't churn the
    // audio graph each footstep. Footsteps fire on a jittered ~500ms cadence
    // per enemy so multiple enemies don't lock into unison.

    const FOOTSTEP_RANGE = 30;       // metres; beyond this we don't bother
    const FOOTSTEP_PERIOD_MS = 500;  // base cadence
    const FOOTSTEP_JITTER_MS = 200;  // per-step random offset
    const enemyPanners = new WeakMap(); // enemy -> { panner }
    const enemyNextStep = new WeakMap(); // enemy -> next-step timestamp (ms)

    function getEnemyPanner(enemy) {
        let entry = enemyPanners.get(enemy);
        if (entry) return entry;
        if (!ensureCtx()) return null;
        const panner = ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 2;
        panner.maxDistance = FOOTSTEP_RANGE;
        panner.rolloffFactor = 1.2;
        panner.connect(masterGain);
        entry = { panner };
        enemyPanners.set(enemy, entry);
        return entry;
    }

    function setPannerPos(panner, x, y, z) {
        // Old AudioParam API vs. positionX (newer); support both.
        if (panner.positionX) {
            const now = ctx.currentTime;
            panner.positionX.setValueAtTime(x, now);
            panner.positionY.setValueAtTime(y, now);
            panner.positionZ.setValueAtTime(z, now);
        } else if (panner.setPosition) {
            panner.setPosition(x, y, z);
        }
    }

    function syncListenerToCamera() {
        if (!ctx) return;
        if (typeof camera === 'undefined' || !camera) return;
        const listener = ctx.listener;
        const p = camera.position;
        // Forward and up vectors from camera quaternion.
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        if (listener.positionX) {
            const now = ctx.currentTime;
            listener.positionX.setValueAtTime(p.x, now);
            listener.positionY.setValueAtTime(p.y, now);
            listener.positionZ.setValueAtTime(p.z, now);
            listener.forwardX.setValueAtTime(fwd.x, now);
            listener.forwardY.setValueAtTime(fwd.y, now);
            listener.forwardZ.setValueAtTime(fwd.z, now);
            listener.upX.setValueAtTime(up.x, now);
            listener.upY.setValueAtTime(up.y, now);
            listener.upZ.setValueAtTime(up.z, now);
        } else if (listener.setPosition) {
            listener.setPosition(p.x, p.y, p.z);
            listener.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
        }
    }

    function playFootstep(panner) {
        // Short low-passed noise tick. Very quiet on its own — distance + HRTF
        // make it feel like a real bootstep in space.
        if (!canPlay()) return;
        const t = ctx.currentTime;
        const noise = ctx.createBufferSource();
        noise.buffer = getNoise();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 800 + Math.random() * 400; // tiny per-step variation
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.45, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        noise.connect(lp).connect(g).connect(panner);
        noise.start(t);
        noise.stop(t + 0.1);
    }

    // Polling tick — runs only while gameplay is active.
    let positionalTickHandle = null;
    function startPositionalTick() {
        if (positionalTickHandle != null) return;
        positionalTickHandle = setInterval(positionalTick, 100);
    }
    function stopPositionalTick() {
        if (positionalTickHandle == null) return;
        clearInterval(positionalTickHandle);
        positionalTickHandle = null;
    }

    function positionalTick() {
        try {
            if (typeof gameState === 'undefined') return;
            if (!gameState.gameStarted || !gameState.pointerLocked) return;
            if (settings.muted || settings.volume <= 0) return;
            const enemies = gameState.enemies;
            if (!enemies || enemies.length === 0) return;
            if (!ensureCtx()) return;
            syncListenerToCamera();

            const now = performance.now();
            const cam = (typeof camera !== 'undefined' && camera) ? camera.position : null;
            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                if (!enemy || !enemy.mesh || enemy.health <= 0) continue;
                const pos = enemy.mesh.position;

                // Skip enemies far enough that footsteps would be inaudible.
                if (cam) {
                    const dx = pos.x - cam.x;
                    const dz = pos.z - cam.z;
                    if (dx * dx + dz * dz > FOOTSTEP_RANGE * FOOTSTEP_RANGE) continue;
                }

                const entry = getEnemyPanner(enemy);
                if (!entry) continue;
                setPannerPos(entry.panner, pos.x, pos.y, pos.z);

                let nextAt = enemyNextStep.get(enemy);
                if (nextAt == null) {
                    // Stagger initial steps so a fresh wave doesn't fire together.
                    nextAt = now + Math.random() * FOOTSTEP_PERIOD_MS;
                    enemyNextStep.set(enemy, nextAt);
                    continue;
                }
                if (now >= nextAt) {
                    playFootstep(entry.panner);
                    enemyNextStep.set(enemy,
                        now + FOOTSTEP_PERIOD_MS + (Math.random() - 0.5) * 2 * FOOTSTEP_JITTER_MS);
                }
            }
        } catch (_) { /* never break the loop over a SFX */ }
    }

    // =========================================================================
    // 5. BGM — synthesized per-stage ambient pad
    // =========================================================================
    // Two detuned sawtooths through an LP filter with a slow LFO on the
    // cutoff = lo-fi pad. A second voice an octave below for body. Cross-
    // fades on stage swaps and pauses with the game.

    // Stage IDs match game.js STAGES (WAREHOUSE=0, ARENA=1, FOREST=2). If
    // STAGES isn't yet defined when this script first runs, the constants
    // are still safe — we look them up by stage index at the call site.
    const STAGE_ROOT_HZ = {
        0: 110.00,  // A2 — Warehouse: tense, low
        1: 146.83,  // D3 — Arena: a touch brighter
        2:  98.00,  // G2 — Forest: darker
    };

    let bgmNodes = null;    // { osc1, osc2, oscSub, lfo, lp, gain } or null
    let bgmStage = null;    // currently playing stage id (or null)
    let bgmPaused = false;

    function buildBgm(stage) {
        if (!ensureCtx()) return null;
        const root = STAGE_ROOT_HZ[stage] || STAGE_ROOT_HZ[0];

        const gain = ctx.createGain();
        gain.gain.value = 0; // we ramp up to fade in
        gain.connect(musicGain);

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 600;
        lp.Q.value = 1.2;
        lp.connect(gain);

        // Slow LFO on cutoff for movement.
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07; // ~14s period
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 250;
        lfo.connect(lfoGain).connect(lp.frequency);
        lfo.start();

        function makeOsc(freq, detuneCents, type) {
            const o = ctx.createOscillator();
            o.type = type || 'sawtooth';
            o.frequency.value = freq;
            o.detune.value = detuneCents;
            o.connect(lp);
            o.start();
            return o;
        }
        const osc1 = makeOsc(root, -7, 'sawtooth');
        const osc2 = makeOsc(root,  7, 'sawtooth');
        const oscSub = makeOsc(root / 2, 0, 'sine'); // body

        return { osc1, osc2, oscSub, lfo, lp, gain };
    }

    function fadeOutAndStop(nodes, fadeSec) {
        if (!nodes || !ctx) return;
        const now = ctx.currentTime;
        try {
            nodes.gain.gain.cancelScheduledValues(now);
            nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
            nodes.gain.gain.linearRampToValueAtTime(0, now + fadeSec);
            setTimeout(function () {
                try {
                    nodes.osc1.stop();
                    nodes.osc2.stop();
                    nodes.oscSub.stop();
                    nodes.lfo.stop();
                    nodes.gain.disconnect();
                } catch (_) {}
            }, (fadeSec * 1000) + 50);
        } catch (_) {}
    }

    function fadeIn(nodes, peak, fadeSec) {
        if (!nodes || !ctx) return;
        const now = ctx.currentTime;
        nodes.gain.gain.cancelScheduledValues(now);
        nodes.gain.gain.setValueAtTime(0, now);
        nodes.gain.gain.linearRampToValueAtTime(peak, now + fadeSec);
    }

    const BGM_TARGET_GAIN = 0.35;

    function startBgm(stage) {
        if (!ensureCtx()) return;
        if (bgmStage === stage && bgmNodes && !bgmPaused) return;
        // Cross-fade.
        if (bgmNodes) fadeOutAndStop(bgmNodes, 1.0);
        bgmNodes = buildBgm(stage);
        bgmStage = stage;
        bgmPaused = false;
        if (bgmNodes) fadeIn(bgmNodes, BGM_TARGET_GAIN, 1.0);
    }

    function stopBgm() {
        if (bgmNodes) fadeOutAndStop(bgmNodes, 0.5);
        bgmNodes = null;
        bgmStage = null;
        bgmPaused = false;
    }

    function pauseBgm() {
        if (!bgmNodes || bgmPaused || !ctx) return;
        bgmPaused = true;
        const now = ctx.currentTime;
        bgmNodes.gain.gain.cancelScheduledValues(now);
        bgmNodes.gain.gain.setValueAtTime(bgmNodes.gain.gain.value, now);
        bgmNodes.gain.gain.linearRampToValueAtTime(0, now + 0.2);
    }
    function resumeBgm() {
        if (!bgmNodes || !bgmPaused || !ctx) return;
        bgmPaused = false;
        const now = ctx.currentTime;
        bgmNodes.gain.gain.cancelScheduledValues(now);
        bgmNodes.gain.gain.setValueAtTime(bgmNodes.gain.gain.value, now);
        bgmNodes.gain.gain.linearRampToValueAtTime(BGM_TARGET_GAIN, now + 0.4);
    }

    // =========================================================================
    // 6. Public API
    // =========================================================================
    const GameAudio = {
        play: function (name) {
            switch (name) {
                case 'gunshot':  return playGunshot();
                case 'dryfire':  return playDryFire();
                case 'reload':   return playReload();
                case 'pickup':   return playPickup();
                case 'warning':  return playWarning();
                case 'hit':      return playHit();
                case 'hurt':     return playHurt();
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
            settings.volume = clamp01(Number(v) || 0);
            saveSettings(settings);
            applyMasterGain();
        },
        setMusicVolume: function (v) {
            settings.music = clamp01(Number(v) || 0);
            saveSettings(settings);
            applyMusicGain();
        },
        getSettings: function () {
            return { muted: settings.muted, volume: settings.volume, music: settings.music };
        },
        resume: resume,
        // Exposed mostly for diagnostics / future hooks.
        _bgm: { start: startBgm, stop: stopBgm, pause: pauseBgm, resume: resumeBgm },
    };
    window.GameAudio = GameAudio;

    // =========================================================================
    // 7. Hooks into game.js
    // =========================================================================

    // Gunshot / dry-fire: own mousedown listener (handleMouseDown was already
    // captured by game.js's addEventListener, so wrapping window.fn is too late).
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
        } catch (_) {}
    }, true);

    // Player hurt: watch health for decreases inside the per-frame updateUI.
    // Throttled so a fast-firing enemy or trap loop doesn't stack a chord.
    let lastSeenHealth = null;
    let lastHurtAt = 0;
    const HURT_THROTTLE_MS = 200;
    function maybeHurt() {
        try {
            if (typeof gameState === 'undefined' || !gameState.player) return;
            const h = gameState.player.health;
            if (typeof h !== 'number') return;
            if (lastSeenHealth == null) { lastSeenHealth = h; return; }
            if (h < lastSeenHealth && gameState.gameStarted && !gameState.gameOver) {
                const now = performance.now();
                if (now - lastHurtAt >= HURT_THROTTLE_MS) {
                    GameAudio.play('hurt');
                    lastHurtAt = now;
                }
            }
            lastSeenHealth = h;
        } catch (_) {}
    }

    function patchHooks() {
        // updateUI runs every frame; perfect place to watch health.
        if (typeof window.updateUI === 'function') {
            const orig = window.updateUI;
            window.updateUI = function () {
                maybeHurt();
                return orig.apply(this, arguments);
            };
        }

        // Reload click
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

        // Pickup / warning
        if (typeof window.showPickupMessage === 'function') {
            const orig = window.showPickupMessage;
            window.showPickupMessage = function (message, isWarning) {
                try {
                    GameAudio.play(isWarning ? 'warning' : 'pickup');
                } catch (_) {}
                return orig.apply(this, arguments);
            };
        }

        // Enemy hit
        if (typeof window.createEnhancedImpactEffect === 'function') {
            const orig = window.createEnhancedImpactEffect;
            window.createEnhancedImpactEffect = function (position, type) {
                try {
                    if (!type || type === 'hit') GameAudio.play('hit');
                } catch (_) {}
                return orig.apply(this, arguments);
            };
        }

        // Win / lose: also stops BGM so the fanfare/loss tone gets the stage.
        if (typeof window.gameOver === 'function') {
            const orig = window.gameOver;
            window.gameOver = function (playerWon) {
                try {
                    GameAudio.play(playerWon ? 'win' : 'lose');
                    stopBgm();
                } catch (_) {}
                return orig.apply(this, arguments);
            };
        }

        // Stage change: switch BGM root (cross-fades).
        if (typeof window.setupStage === 'function') {
            const orig = window.setupStage;
            window.setupStage = function (stage) {
                const result = orig.apply(this, arguments);
                try { startBgm(stage); } catch (_) {}
                return result;
            };
        }

        // Start Game: resume AudioContext, kick off BGM and positional tick.
        if (typeof window.startGame === 'function') {
            const orig = window.startGame;
            window.startGame = function () {
                resume();
                const result = orig.apply(this, arguments);
                try {
                    if (typeof gameState !== 'undefined') {
                        startBgm(gameState.currentStage);
                    }
                    startPositionalTick();
                } catch (_) {}
                return result;
            };
        }

        // Pause / Resume: dim BGM and stop the footstep tick while paused.
        if (typeof window.pauseGame === 'function') {
            const orig = window.pauseGame;
            window.pauseGame = function () {
                try { pauseBgm(); stopPositionalTick(); } catch (_) {}
                return orig.apply(this, arguments);
            };
        }
        if (typeof window.resumeGame === 'function') {
            const orig = window.resumeGame;
            window.resumeGame = function () {
                resume();
                try { resumeBgm(); startPositionalTick(); } catch (_) {}
                return orig.apply(this, arguments);
            };
        }
    }

    if (document.readyState === 'complete') {
        patchHooks();
    } else {
        window.addEventListener('load', patchHooks);
    }

    // =========================================================================
    // 8. Settings UI
    // =========================================================================
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
            '  <label class="audio-panel__row">',
            '    <span>Music</span>',
            '    <input type="range" id="audio-music" min="0" max="100" step="1">',
            '    <span class="audio-panel__vnum" id="audio-mnum">40</span>',
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
        const musicEl = panel.querySelector('#audio-music');
        const mnumEl = panel.querySelector('#audio-mnum');
        const testEl = panel.querySelector('#audio-test');
        const closeEl = panel.querySelector('#audio-close');

        function syncFromSettings() {
            muteEl.checked = settings.muted;
            volEl.value = String(Math.round(settings.volume * 100));
            vnumEl.textContent = volEl.value;
            musicEl.value = String(Math.round(settings.music * 100));
            mnumEl.textContent = musicEl.value;
        }
        syncFromSettings();

        function openPanel() {
            syncFromSettings();
            panel.removeAttribute('hidden');
            resume();
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
        panel.addEventListener('click', function (e) {
            if (e.target === panel) closePanel();
        });

        muteEl.addEventListener('change', function () {
            GameAudio.setMuted(muteEl.checked);
        });
        volEl.addEventListener('input', function () {
            GameAudio.setVolume(Number(volEl.value) / 100);
            vnumEl.textContent = volEl.value;
        });
        musicEl.addEventListener('input', function () {
            GameAudio.setMusicVolume(Number(musicEl.value) / 100);
            mnumEl.textContent = musicEl.value;
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
