import { state } from '../state/appState.js';
import { showModule } from './navigation.js';

export function updateSensorsUI() {
    const modEl = document.getElementById('sensor-module-value');
    const chanEl = document.getElementById('sensor-channel-value');

    if (modEl) modEl.textContent = state.currentModule;
    if (chanEl) {
        if (!state.activeChannelId) {
            chanEl.textContent = "None";
        } else {
            const tuned = window.JTV_SENSORS.getTunedChannel();
            chanEl.textContent = tuned ? `${tuned.type}: ${tuned.title || tuned.name || tuned.id}` : `ID: ${state.activeChannelId}`;
        }
    }
}

// Headless Navigation & Diagnostic Sensors API
window.JTV_SENSORS = {
    getCurrentModule: () => state.currentModule,
    navigateTo: (moduleName) => {
        showModule(moduleName);
        return `Navigated to module: ${moduleName}`;
    },
    getTunedChannel: () => {
        if (!state.activeChannelId) return null;
        const chan = state.channels.find(c => String(c.id) === String(state.activeChannelId));
        return chan ? { ...chan, type: 'LiveTV' } : { id: state.activeChannelId, type: 'LiveTV' };
    },
    isSidebarOpen: () => {
        const mainMenu = document.getElementById('side-menu');
        return mainMenu ? !mainMenu.classList.contains('hidden') : false;
    },
    getAudioState: async () => {
        const nativeApi = window.jtvAPI;
        if (!nativeApi) return { isMuted: false, isAudible: false };
        const isMuted = await nativeApi.isAudioMuted();
        const isAudible = await nativeApi.getAudioState();
        return { isMuted, isAudible };
    }
};
