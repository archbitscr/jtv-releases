/**
 * claudeControl.js — DEV module: Claude remote-control panel
 *
 * Exposes window.claudeControl for CDP-based programmatic access:
 *   claudeControl.freeze()          — pause all timeouts & autotune
 *   claudeControl.unfreeze()        — restore normal operation
 *   claudeControl.isFrozen()        — boolean
 *   claudeControl.tuneSource(src)   — switch source on current channel immediately
 *   claudeControl.tune(id, src)     — tune to channel id + source
 *   claudeControl.status()          — JSON snapshot of app state
 *   claudeControl.clickViz(bool)    — enable/disable red-dot click visualizer
 */

let _frozen = false;
let _clickVizEnabled = false;
let _clickVizHandler = null;

// ── Internal helpers ──────────────────────────────────────────────────────────

function _clearAllFailoverTimers() {
    const s = window.state;
    if (!s) return;
    if (s.failoverTimeoutId) { clearTimeout(s.failoverTimeoutId); s.failoverTimeoutId = null; }
    // stopNoSignalRetryLoop is exported by failover.js and called by playerController;
    // access it via the bridge that playerController registers on window.
    if (window._jtvFailoverBridge?.stopRetryLoop) window._jtvFailoverBridge.stopRetryLoop();
}

function _setWatchdog(enabled) {
    // Broadcast to guest-preload in the active webview via IPC
    if (window.jtvAPI?.setWatchdogConfig) {
        window.jtvAPI.setWatchdogConfig({ enabled });
    }
}

function _updateFreezeBtn() {
    const btn = document.getElementById('claude-freeze-btn');
    const dot = document.getElementById('claude-freeze-indicator');
    if (btn) btn.textContent = _frozen ? 'Unfreeze' : 'Freeze';
    if (dot) {
        dot.className = 'claude-status-dot ' + (_frozen ? 'dot-red' : 'dot-green');
    }
}

function _updateClickVizBtn() {
    const btn = document.getElementById('claude-clickviz-btn');
    const dot = document.getElementById('claude-clickviz-dot');
    if (btn) btn.textContent = _clickVizEnabled ? 'Disable' : 'Enable';
    if (dot) dot.className = 'claude-status-dot ' + (_clickVizEnabled ? 'dot-red' : 'dot-grey');
}

function _highlightSourceBtn(src) {
    document.querySelectorAll('.claude-src-btn').forEach(b => {
        b.classList.toggle('claude-src-active', b.dataset.claudeSrc === src);
    });
}

function _syncSourceHighlight() {
    _highlightSourceBtn(window.state?.playerSource || '');
}

// ── Public API ────────────────────────────────────────────────────────────────

function freeze() {
    _frozen = true;
    // hardFreeze blocks ALL failover paths including did-fail-load bypass
    if (window._jtvFailoverBridge?.hardFreeze) {
        window._jtvFailoverBridge.hardFreeze();
    } else {
        // fallback
        const s = window.state;
        if (s) s.failoverInProgress = true;
        _clearAllFailoverTimers();
    }
    _setWatchdog(false);
    _updateFreezeBtn();
    console.log('[ClaudeControl] FROZEN — all failover paths blocked.');
}

function unfreeze() {
    _frozen = false;
    if (window._jtvFailoverBridge?.hardUnfreeze) {
        window._jtvFailoverBridge.hardUnfreeze();
    } else {
        const s = window.state;
        if (s) s.failoverInProgress = false;
    }
    _setWatchdog(true);
    _updateFreezeBtn();
    console.log('[ClaudeControl] UNFROZEN — normal operation resumed.');
}

function isFrozen() { return _frozen; }

function tuneSource(src) {
    const s = window.state;
    if (!s) return 'no state';
    const ch = (s.channels || []).find(c => String(c.id) === String(s.activeChannelId));
    if (!ch) return 'no active channel';
    s.playerSource = src;
    if (window.selectChannel) window.selectChannel(ch, false);
    _highlightSourceBtn(src);
    console.log('[ClaudeControl] tuneSource →', src, 'ch:', ch.name);
    return 'tuning:' + src + ':' + ch.name;
}

function tune(channelId, src) {
    const s = window.state;
    if (!s) return 'no state';
    const ch = (s.channels || []).find(c => String(c.id) === String(channelId));
    if (!ch) return 'channel ' + channelId + ' not found';
    if (src) s.playerSource = src;
    if (window.selectChannel) window.selectChannel(ch, !src);
    if (src) _highlightSourceBtn(src);
    console.log('[ClaudeControl] tune →', channelId, src || '(default source)', ch.name);
    return 'tuning:ch' + channelId + ':' + (src || s.playerSource);
}

function clickViz(enabled) {
    _clickVizEnabled = !!enabled;
    if (_clickVizEnabled && !_clickVizHandler) {
        _clickVizHandler = (e) => {
            const dot = document.createElement('div');
            dot.style.cssText = [
                'position:fixed',
                'left:' + (e.clientX - 10) + 'px',
                'top:' + (e.clientY - 10) + 'px',
                'width:20px', 'height:20px',
                'border-radius:50%',
                'background:rgba(255,0,0,0.8)',
                'box-shadow:0 0 10px #f00,0 0 22px #f00',
                'pointer-events:none',
                'z-index:2147483647',
                'transition:opacity 0.7s,transform 0.7s',
            ].join(';');
            document.body.appendChild(dot);
            requestAnimationFrame(() => {
                dot.style.opacity = '0';
                dot.style.transform = 'scale(0.1)';
            });
            setTimeout(() => dot.remove(), 800);
        };
        document.addEventListener('mousedown', _clickVizHandler, true);
    } else if (!_clickVizEnabled && _clickVizHandler) {
        document.removeEventListener('mousedown', _clickVizHandler, true);
        _clickVizHandler = null;
    }
    _updateClickVizBtn();
    return _clickVizEnabled ? 'click-viz:ON' : 'click-viz:OFF';
}

function status() {
    const s = window.state || {};
    const result = {
        frozen: _frozen,
        clickViz: _clickVizEnabled,
        activeChannelId: s.activeChannelId,
        playerSource: s.playerSource,
        failoverInProgress: s.failoverInProgress,
        failoverTimeoutId: !!s.failoverTimeoutId,
        globalDomain: s.globalDomain,
        channelCount: (s.channels || []).length,
        currentChannel: (s.channels || []).find(c => String(c.id) === String(s.activeChannelId))?.name,
    };
    const pre = document.getElementById('claude-status-readout');
    if (pre) pre.textContent = JSON.stringify(result, null, 2);
    return result;
}

// ── UI wiring ─────────────────────────────────────────────────────────────────

export function initClaudeControl() {
    // Freeze/Unfreeze button
    const freezeBtn = document.getElementById('claude-freeze-btn');
    if (freezeBtn) {
        freezeBtn.addEventListener('click', () => {
            _frozen ? unfreeze() : freeze();
        });
    }

    // Source buttons
    document.querySelectorAll('.claude-src-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tuneSource(btn.dataset.claudeSrc);
        });
    });
    // Keep source highlight in sync
    setInterval(_syncSourceHighlight, 1000);

    // Channel tune button
    const tuneBtn = document.getElementById('claude-tune-btn');
    if (tuneBtn) {
        tuneBtn.addEventListener('click', () => {
            const input = document.getElementById('claude-ch-input');
            const id = input?.value?.trim();
            if (id) tune(id, null);
        });
    }
    document.getElementById('claude-ch-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('claude-tune-btn')?.click();
    });

    // Click visualizer button
    const cvBtn = document.getElementById('claude-clickviz-btn');
    if (cvBtn) cvBtn.addEventListener('click', () => clickViz(!_clickVizEnabled));

    // Screenshot button
    const ssBtn = document.getElementById('claude-screenshot-btn');
    const ssReadout = document.getElementById('claude-screenshot-readout');
    if (ssBtn) {
        ssBtn.addEventListener('click', async () => {
            ssBtn.disabled = true;
            ssBtn.textContent = '…';
            try {
                const result = await window.jtvAPI?.adScreenshot?.();
                if (ssReadout) ssReadout.textContent = result?.path
                    ? `✅ Saved: ${result.path}\n(${(result.size/1024).toFixed(1)} KB)`
                    : `❌ ${result?.error || 'Unknown error'}`;
            } catch (e) {
                if (ssReadout) ssReadout.textContent = '❌ ' + e.message;
            } finally {
                ssBtn.disabled = false;
                ssBtn.textContent = 'Screenshot';
            }
        });
    }

    // Status refresh button
    const statusBtn = document.getElementById('claude-status-refresh-btn');
    if (statusBtn) statusBtn.addEventListener('click', () => status());

    // Initial UI state
    _updateFreezeBtn();
    _updateClickVizBtn();
    _syncSourceHighlight();

    async function screenshot() {
        const result = await window.jtvAPI?.adScreenshot?.();
        if (result?.path) console.log('[ClaudeControl] Screenshot →', result.path);
        return result;
    }

    // Expose globally for CDP access
    window.claudeControl = { freeze, unfreeze, isFrozen, tuneSource, tune, clickViz, status, screenshot };
    console.log('[ClaudeControl] Initialized. window.claudeControl ready.');
}
