import { state } from '../state/appState.js';
import { autoCategorizeChannels } from '../filters/filterManager.js';
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
            btn.innerText = "Syncing...";
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
            if (!nc.categories.includes('all')) {
                nc.categories.push('all');
            }
        });
        const existingIds = new Set(state.channels.map(c => String(c.id)));
        newChannels.forEach(nc => {
            const idx = state.channels.findIndex(c => String(c.id) === String(nc.id));
            if (idx >= 0) {
                state.channels[idx] = nc;
            } else {
                state.channels.push(nc);
            }
        });
        state.dropdownsPopulated = false;
        autoCategorizeChannels();
        renderAll();
        saveAppState();
    }

    if (!silent) {
        if (btn) {
            btn.innerText = "Sync channels with DaddyLive";
            btn.disabled = false;
        }
    }

    updateSchedule();
}
