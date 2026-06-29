import { state } from '../state/appState.js';

let selectChannelFn = () => {};
let mountRemotePlayerFn = () => {};
let updateSourceSwitcherUIFn = () => {};

export function initFailover({ selectChannel, mountRemotePlayer, updateSourceSwitcherUI }) {
    selectChannelFn = selectChannel;
    mountRemotePlayerFn = mountRemotePlayer;
    updateSourceSwitcherUIFn = updateSourceSwitcherUI;
}

// --- State ---
let retryTimeoutId = null;
let retryCount = 0;         // number of full source cycles completed
let cycleInProgress = false; // true while iterating sources

export function resetFailoverState() {
    // called on manual channel change — resets everything
    cycleInProgress = false;
    stopNoSignalRetryLoop();
}

// --- Overlay UI ---
export function showNoSignalOverlay(show, type = 'signal') {
    const overlay = document.getElementById('no-signal-overlay');
    if (!overlay) return;
    if (show) {
        const icon = document.getElementById('no-signal-icon');
        if (icon) icon.src = type === 'internet' ? './assets/images/no-internet.png' : './assets/images/no-signal.png';
        const titleEl = document.querySelector('#no-signal-overlay h2');
        if (titleEl) titleEl.textContent = type === 'internet' ? 'No Internet' : 'No Signal';
        overlay.classList.remove('hidden');
        const audioIndicator = document.getElementById('pbar-indicator-audio');
        const videoIndicator = document.getElementById('pbar-indicator-video');
        if (audioIndicator) {
            audioIndicator.style.color = 'rgba(255,255,255,0.25)';
            audioIndicator.classList.remove('active');
            audioIndicator.classList.add('inactive');
            audioIndicator.setAttribute('title', 'Autotune Audio: Inactivo');
        }
        if (videoIndicator) {
            videoIndicator.style.color = 'rgba(255,255,255,0.25)';
            videoIndicator.classList.remove('active');
            videoIndicator.classList.add('inactive');
            videoIndicator.setAttribute('title', 'Autotune Video: Inactivo');
        }
    } else {
        overlay.classList.add('hidden');
    }
}

function setRetryText(text) {
    const el = document.getElementById('no-signal-retry-text');
    if (el) el.textContent = text;
}

// --- Retry loop (called after each exhausted cycle) ---
export function stopNoSignalRetryLoop() {
    if (retryTimeoutId) { clearTimeout(retryTimeoutId); retryTimeoutId = null; }
    retryCount = 0;
}

export function signalRestored() {
    cycleInProgress = false;
    stopNoSignalRetryLoop();
    if (state.failoverTimeoutId) {
        clearTimeout(state.failoverTimeoutId);
        state.failoverTimeoutId = null;
    }
    state.failoverInProgress = false;
    showNoSignalOverlay(false);
}

function scheduleNextCycle(channelId) {
    let delayMs;
    if (retryCount < 3) delayMs = 60000;
    else if (retryCount < 7) delayMs = 180000;
    else delayMs = 300000;

    const minutes = Math.round(delayMs / 60000);
    setRetryText(`Reintentando en ${minutes} minuto${minutes > 1 ? 's' : ''}...`);

    retryCount++;

    retryTimeoutId = setTimeout(() => {
        retryTimeoutId = null;
        const channel = state.channels?.find(c => c.id === channelId);
        if (!channel) return;
        setRetryText('Searching alternate sources...');
        runFailoverCycle(channelId);
    }, delayMs);
}

// --- Core cycle: iterate all 6 sources sequentially ---
const SOURCES = ['stream', 'player', 'casting', 'plus', 'watch', 'cast'];

function runFailoverCycle(channelId) {
    if (cycleInProgress) return;
    cycleInProgress = true;
    state.failoverInProgress = true;

    // Show overlay immediately on first cycle
    showNoSignalOverlay(true);
    setRetryText('Searching alternate sources...');

    const cfg = window.timeoutsConfig || {};
    const nativeApi = window.jtvAPI;

    let sourceIndex = 0;

    function tryNextSource() {
        if (sourceIndex >= SOURCES.length) {
            // All sources exhausted
            cycleInProgress = false;
            state.failoverInProgress = false;
            state.playerSource = 'stream';
            updateSourceSwitcherUIFn('stream');
            const playerContainer = document.getElementById('player-container');
            if (playerContainer) playerContainer.innerHTML = '';
            nativeApi.logRenderer('Failover: all sources exhausted.');
            scheduleNextCycle(channelId);
            return;
        }

        const source = SOURCES[sourceIndex];
        sourceIndex++;

        const waitTime = source === 'stream'
            ? (cfg.failoverMainEnabled ? cfg.failoverMain : 4000)
            : (cfg.failoverAltEnabled ? cfg.failoverAlt : 3000);

        nativeApi.logRenderer(`Failover: trying source "${source}" in ${waitTime}ms`);

        state.playerSource = source;
        updateSourceSwitcherUIFn(source);

        const channel = state.channels?.find(c => c.id === channelId);
        if (!channel) {
            cycleInProgress = false;
            state.failoverInProgress = false;
            return;
        }

        selectChannelFn(channel, false);

        // Wait for this source to either play or timeout, then try next
        state.failoverTimeoutId = setTimeout(() => {
            state.failoverTimeoutId = null;
            // If still in cycle (no guest-playing received), try next source
            if (cycleInProgress) tryNextSource();
        }, waitTime + 15000); // waitTime to load + 15s for initial load timeout
    }

    tryNextSource();
}

// --- Public entry point (called by watchdog triggers) ---
export function triggerFailover() {
    if (cycleInProgress || retryTimeoutId) return;

    const nativeApi = window.jtvAPI;

    if (!navigator.onLine) {
        nativeApi.logRenderer('Failover paused: No internet connection');
        showNoSignalOverlay(true, 'internet');
        setRetryText('No internet connection. Connect to continue.');
        window.addEventListener('online', resumeFailoverOnce);
        return;
    }

    const channelId = state.activeChannelId;
    runFailoverCycle(channelId);
}

function resumeFailoverOnce() {
    window.removeEventListener('online', resumeFailoverOnce);
    showNoSignalOverlay(false);
    triggerFailover();
}

window.addEventListener('offline', () => {
    if (cycleInProgress) {
        cycleInProgress = false;
        state.failoverInProgress = false;
        if (state.failoverTimeoutId) {
            clearTimeout(state.failoverTimeoutId);
            state.failoverTimeoutId = null;
        }
        stopNoSignalRetryLoop();
    }
    showNoSignalOverlay(true, 'internet');
    setRetryText('No internet connection. Connect to continue.');
    window.addEventListener('online', resumeFailoverOnce);
});
