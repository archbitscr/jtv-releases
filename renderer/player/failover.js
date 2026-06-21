import { state } from '../state/appState.js';

let selectChannelFn = () => {};
let mountRemotePlayerFn = () => {};
let updateSourceSwitcherUIFn = () => {};

export function initFailover({ selectChannel, mountRemotePlayer, updateSourceSwitcherUI }) {
    selectChannelFn = selectChannel;
    mountRemotePlayerFn = mountRemotePlayer;
    updateSourceSwitcherUIFn = updateSourceSwitcherUI;
}

let streamRetried = false;

export function resetFailoverState() {
    streamRetried = false;
}

export function showNoSignalOverlay(show, message = "") {
    const overlay = document.getElementById('no-signal-overlay');
    const msgEl = document.getElementById('no-signal-message');
    if (!overlay) return;
    if (show) {
        overlay.classList.remove('hidden');
        if (msgEl && message) msgEl.textContent = message;
        
        // Force indicators to inactive when signal is lost
        const audioIndicator = document.getElementById('hud-indicator-audio');
        const videoIndicator = document.getElementById('hud-indicator-video');
        if (audioIndicator && videoIndicator) {
            audioIndicator.style.color = 'rgba(255,255,255,0.25)';
            audioIndicator.classList.remove('active');
            audioIndicator.classList.add('inactive');
            audioIndicator.setAttribute('title', 'Autotune Audio: Inactivo');

            videoIndicator.style.color = 'rgba(255,255,255,0.25)';
            videoIndicator.classList.remove('active');
            videoIndicator.classList.add('inactive');
            videoIndicator.setAttribute('title', 'Autotune Video: Inactivo');
        }
    } else {
        overlay.classList.add('hidden');
    }
}

function resumeFailoverOnce() {
    window.removeEventListener('online', resumeFailoverOnce);
    showNoSignalOverlay(false);
    triggerFailover();
}

export async function triggerFailover(delayMs = null) {
    if (state.failoverInProgress) return;
    state.failoverInProgress = true;

    const nativeApi = window.jtvAPI;

    if (!navigator.onLine) {
        nativeApi.logRenderer("Failover paused: No internet connection");
        showNoSignalOverlay(true, "Sin conexión a Internet. Conéctate para continuar.");
        state.failoverInProgress = false;
        window.addEventListener('online', resumeFailoverOnce);
        return;
    }

    const sources = ['stream', 'watch', 'player', 'plus', 'cast', 'casting'];
    const currentIdx = sources.indexOf(state.playerSource);
    
    let nextSource;
    if (state.playerSource === 'stream' && !streamRetried) {
        streamRetried = true;
        nextSource = 'stream';
    } else {
        nextSource = sources[currentIdx + 1];
    }
    
    if (nextSource) {
        const cfg = window.timeoutsConfig || {};
        let waitTime = 3000;
        if (delayMs !== null) {
            waitTime = delayMs;
        } else {
            if (nextSource === 'stream') {
                waitTime = cfg.failoverMainEnabled ? cfg.failoverMain : 0;
            } else {
                waitTime = cfg.failoverAltEnabled ? cfg.failoverAlt : 0;
            }
        }
        
        nativeApi.logRenderer(`Watchdog: Switching source from "${state.playerSource}" to "${nextSource}" in ${waitTime}ms${nextSource === 'stream' ? ' (Retry)' : ''}`);
        showNoSignalOverlay(false);
        
        if (state.failoverTimeoutId) clearTimeout(state.failoverTimeoutId);
        
        state.failoverTimeoutId = setTimeout(() => {
            state.playerSource = nextSource;
            updateSourceSwitcherUIFn(state.playerSource);
            const channel = state.channels.find(c => c.id === state.activeChannelId);
            if (channel) {
                selectChannelFn(channel, false);
            }
            state.failoverInProgress = false;
        }, waitTime);
    } else {
        nativeApi.logRenderer("Failover: Exhausted all sources. Returning to stream and showing Sin Señal.");
        state.playerSource = "stream";
        streamRetried = false;
        updateSourceSwitcherUIFn("stream");
        const channel = state.channels.find(c => c.id === state.activeChannelId);
        if (channel) {
            selectChannelFn(channel, false);
        }
        showNoSignalOverlay(true, "No se pudo sintonizar el canal en ninguna fuente disponible.");
        state.failoverInProgress = false;
    }
}
