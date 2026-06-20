import { state } from '../state/appState.js';

let saveAppStateFn = () => {};

export function initWatchTimer({ saveAppState }) {
    saveAppStateFn = saveAppState;
}

export function stopWatchTimer() {
    if (state.currentlyWatchingId && state.watchStartTime) {
        const duration = (Date.now() - state.watchStartTime) / 1000;
        const channel = state.channels.find(c => String(c.id) === String(state.currentlyWatchingId));
        if (channel) {
            channel.watchTime = (channel.watchTime || 0) + duration;
            saveAppStateFn();
        }
    }
    state.currentlyWatchingId = null;
    state.watchStartTime = null;
}
