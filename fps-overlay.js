// -----------------------------------------------------------------------------
// FPS / performance overlay
// -----------------------------------------------------------------------------
// Toggleable HUD (top-left) showing:
//   - FPS (frames per second)
//   - Frame time (ms/frame)
//   - Three.js triangles + draw calls (from renderer.info.render)
//   - JS heap (Chrome only; hidden gracefully on other browsers)
//
// Toggle with F3. Visibility persists across reloads via localStorage.
//
// Notes:
//   - Runs its own requestAnimationFrame loop. This is the standard stats.js
//     pattern and is decoupled from game.js's animate() — it keeps measuring
//     even when the game is paused, so you can confirm idle-state perf.
//   - `renderer.info.render` is reset every render() call; we sample it once
//     per second in sync with the FPS update so the numbers are stable.
//   - Pointer-events are disabled on the overlay so it does not intercept
//     canvas clicks (pointer lock still works).
// -----------------------------------------------------------------------------

(function () {
    'use strict';

    const STORAGE_KEY = 'hg.debug.fpsVisible';
    const TOGGLE_KEY = 'F3';

    // Avoid double-init if the script is accidentally loaded twice.
    if (window.__hgFpsOverlayInitialized) return;
    window.__hgFpsOverlayInitialized = true;

    // ---- Overlay element ----------------------------------------------------
    const overlay = document.createElement('div');
    overlay.id = 'fps-overlay';
    overlay.className = 'fps-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // Restore last visibility (default: hidden).
    let visible = false;
    try {
        visible = localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
        // localStorage can throw in private browsing / sandboxed contexts.
    }
    if (!visible) overlay.setAttribute('hidden', '');

    // Build inner structure once; we update text nodes each tick.
    overlay.innerHTML = [
        '<div class="fps-overlay__row"><span class="fps-overlay__label">FPS</span><span class="fps-overlay__value" id="fps-overlay-fps">--</span></div>',
        '<div class="fps-overlay__row"><span class="fps-overlay__label">ms</span><span class="fps-overlay__value" id="fps-overlay-ms">--</span></div>',
        '<div class="fps-overlay__row"><span class="fps-overlay__label">tris</span><span class="fps-overlay__value" id="fps-overlay-tris">--</span></div>',
        '<div class="fps-overlay__row"><span class="fps-overlay__label">calls</span><span class="fps-overlay__value" id="fps-overlay-calls">--</span></div>',
        '<div class="fps-overlay__row" id="fps-overlay-heap-row" hidden><span class="fps-overlay__label">heap</span><span class="fps-overlay__value" id="fps-overlay-heap">--</span></div>',
        '<div class="fps-overlay__hint">F3 to toggle</div>'
    ].join('');

    function attach() {
        if (overlay.isConnected) return;
        (document.body || document.documentElement).appendChild(overlay);
    }
    if (document.body) {
        attach();
    } else {
        document.addEventListener('DOMContentLoaded', attach, { once: true });
    }

    const fpsEl = overlay.querySelector('#fps-overlay-fps');
    const msEl = overlay.querySelector('#fps-overlay-ms');
    const trisEl = overlay.querySelector('#fps-overlay-tris');
    const callsEl = overlay.querySelector('#fps-overlay-calls');
    const heapRow = overlay.querySelector('#fps-overlay-heap-row');
    const heapEl = overlay.querySelector('#fps-overlay-heap');

    const hasHeap = !!(performance && performance.memory && performance.memory.usedJSHeapSize);
    if (hasHeap && heapRow) heapRow.removeAttribute('hidden');

    // ---- Toggle -------------------------------------------------------------
    function setVisible(v) {
        visible = !!v;
        if (visible) overlay.removeAttribute('hidden');
        else overlay.setAttribute('hidden', '');
        try {
            localStorage.setItem(STORAGE_KEY, visible ? '1' : '0');
        } catch (e) { /* ignore */ }
    }

    window.addEventListener('keydown', function (e) {
        // e.code is layout-independent ('F3' on every keyboard).
        // e.key is the printed key; check both for safety.
        if (e.code === TOGGLE_KEY || e.key === TOGGLE_KEY) {
            // Don't fight the browser if the user is typing in an input.
            const t = e.target;
            const tag = t && t.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
            e.preventDefault();
            setVisible(!visible);
        }
    });

    // Expose for debugging / external toggles.
    window.toggleFpsOverlay = function (force) {
        if (typeof force === 'boolean') setVisible(force);
        else setVisible(!visible);
    };

    // ---- Measurement loop ---------------------------------------------------
    // We accumulate frames over ~1 second and update the display once per
    // second. This is more readable than per-frame jitter.
    let frames = 0;
    let lastSampleAt = performance.now();
    // Smoothed frame time (ms) — EWMA so it tracks recent perf, not all-time avg.
    let smoothedMs = 0;
    let lastFrameAt = lastSampleAt;

    function tick(now) {
        // Cheap exit when hidden: still schedule the loop but skip DOM writes.
        // This keeps the overlay responsive when toggled back on, and avoids
        // any string allocations while invisible.
        const frameMs = now - lastFrameAt;
        lastFrameAt = now;
        // EWMA with alpha=0.1 (smooth enough to read, responsive to spikes).
        smoothedMs = smoothedMs === 0 ? frameMs : smoothedMs * 0.9 + frameMs * 0.1;
        frames++;

        if (visible) {
            const elapsed = now - lastSampleAt;
            if (elapsed >= 1000) {
                const fps = Math.round((frames * 1000) / elapsed);
                fpsEl.textContent = String(fps);
                msEl.textContent = smoothedMs.toFixed(1);

                // Read Three.js renderer stats if the game's renderer exists.
                // `renderer` is declared with `let` at top level in game.js;
                // sibling classic scripts can read it by bare name. Use a
                // try/catch in case it's not yet initialized at first tick.
                let tris = '--';
                let calls = '--';
                try {
                    if (typeof renderer !== 'undefined' && renderer && renderer.info && renderer.info.render) {
                        const info = renderer.info.render;
                        tris = formatInt(info.triangles);
                        calls = String(info.calls);
                    }
                } catch (e) { /* ignore */ }
                trisEl.textContent = tris;
                callsEl.textContent = calls;

                if (hasHeap) {
                    const mb = performance.memory.usedJSHeapSize / 1048576;
                    heapEl.textContent = mb.toFixed(1) + ' MB';
                }

                frames = 0;
                lastSampleAt = now;
            }
        } else {
            // While hidden, still roll over the sample window so the first
            // visible second has a clean number rather than a multi-second avg.
            if (now - lastSampleAt >= 1000) {
                frames = 0;
                lastSampleAt = now;
            }
        }

        requestAnimationFrame(tick);
    }

    function formatInt(n) {
        // 12345 -> "12,345"
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    requestAnimationFrame(function (now) {
        lastSampleAt = now;
        lastFrameAt = now;
        requestAnimationFrame(tick);
    });
})();
