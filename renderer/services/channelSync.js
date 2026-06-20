import { state } from '../state/appState.js';
import { autoCategorizeChannels, cleanChannelMetadata } from '../filters/filterManager.js';
import { renderAll } from '../render/renderAll.js';
import { saveAppState } from './stateManager.js';

export async function updateSchedule() {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    const data = await nativeApi.fetchSchedule(state.globalDomain);
    if (data && !data.error) {
        state.scheduleData = data;
        renderAll();
    }
}

export async function syncChannels(silent = false) {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    const btn = document.getElementById('sync-channels-btn');
    if (!silent) {
        if (btn) {
            btn.innerText = "Sincronizando...";
            btn.disabled = true;
        }
    }

    const newChannels = await nativeApi.fetchChannels(state.globalDomain);
    if (newChannels && !newChannels.error) {
        newChannels.forEach(nc => {
            const existing = state.channels.find(c => String(c.id) === String(nc.id));
            if (existing) {
                nc.name = existing.name || nc.name;
                nc.favorite = existing.favorite || false;
                nc.logo = existing.logo || nc.logo;
                nc.watchTime = existing.watchTime || 0;
                nc.path = existing.path || nc.path;
                nc.categories = existing.categories || ["all"];
            } else {
                nc.watchTime = 0;
                nc.categories = ["all"];
            }
            nc.categories = nc.categories.map(cat => cat.toLowerCase());
            if (!nc.categories.includes('all')) {
                nc.categories.push('all');
            }
        });
        state.channels = newChannels;
        state.dropdownsPopulated = false;
        autoCategorizeChannels();
        cleanChannelMetadata();
        renderAll();
        saveAppState();
    }

    if (!silent) {
        if (btn) {
            btn.innerText = "Sincronizar canales con DaddyLive";
            btn.disabled = false;
        }
    }

    updateSchedule();
}
