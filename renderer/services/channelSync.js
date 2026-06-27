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

function syncLog(msg) {
    const log = document.getElementById('sync-log');
    if (!log) return;
    log.classList.add('active');
    log.textContent += msg + '\n';
    log.scrollTop = log.scrollHeight;
}

export async function syncChannels(silent = false) {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    const btn = document.getElementById('sync-channels-btn');
    const log = document.getElementById('sync-log');

    if (!silent) {
        if (btn) { btn.innerText = "Syncing..."; btn.disabled = true; }
        if (log) { log.textContent = ''; log.classList.add('active'); }
        syncLog(`> Connecting to ${state.globalDomain}...`);
    }

    const newChannels = await nativeApi.fetchChannels(state.globalDomain);
    if (newChannels && !newChannels.error) {
        if (!silent) syncLog(`> Received ${newChannels.length} channels`);
        let updated = 0, added = 0;
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
        newChannels.forEach(nc => {
            const idx = state.channels.findIndex(c => String(c.id) === String(nc.id));
            if (idx >= 0) {
                state.channels[idx] = nc;
                updated++;
            } else {
                state.channels.push(nc);
                added++;
            }
        });
        if (!silent) syncLog(`> Updated: ${updated} | New: ${added}`);
        state.dropdownsPopulated = false;
        autoCategorizeChannels();
        renderAll();
        saveAppState();
        if (!silent) syncLog('> Sync complete.');
    } else {
        if (!silent) syncLog('> ERROR: Sync failed.');
    }

    if (!silent) {
        if (btn) { btn.innerText = "Sync Channels"; btn.disabled = false; }
    }

    updateSchedule();
}
