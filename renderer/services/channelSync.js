import { state } from '../state/appState.js';
import { t } from '../i18n/i18n.js';
import { autoCategorizeChannels } from '../filters/filterManager.js';
import { renderAll } from '../render/renderAll.js';
import { saveAppState } from './stateManager.js';

export async function updateSchedule() {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    let data = await nativeApi.fetchSchedule(state.globalDomain);
    if ((!data || !Array.isArray(data) || data.length === 0 || data.error) && nativeApi.checkDomain) {
        const fallbackDomain = await nativeApi.checkDomain();
        if (fallbackDomain && fallbackDomain !== state.globalDomain) {
            state.globalDomain = fallbackDomain;
            window.globalDomain = state.globalDomain;
            data = await nativeApi.fetchSchedule(state.globalDomain);
        }
    }
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
        if (btn) { btn.innerText = t('sync.btn.syncing', 'Syncing...'); btn.disabled = true; }
        if (log) { log.textContent = ''; log.classList.add('active'); }
        syncLog(`${t('sync.connecting', '> Connecting to')} ${state.globalDomain}...`);
    }

    let newChannels = await nativeApi.fetchChannels(state.globalDomain);
    if ((!newChannels || !Array.isArray(newChannels) || newChannels.length === 0 || newChannels.error) && nativeApi.checkDomain) {
        if (!silent) syncLog(`> Primary domain unreachable. Searching alternate domains (dlive.sx / dlhd.st / dlhd.pk)...`);
        const fallbackDomain = await nativeApi.checkDomain();
        if (fallbackDomain && fallbackDomain !== state.globalDomain) {
            state.globalDomain = fallbackDomain;
            window.globalDomain = state.globalDomain;
            const globalDomainInput = document.getElementById('global-domain-input');
            if (globalDomainInput) globalDomainInput.value = state.globalDomain;
            if (!silent) syncLog(`> Switched active domain to ${state.globalDomain}`);
            newChannels = await nativeApi.fetchChannels(state.globalDomain);
        }
    }
    if (newChannels && !newChannels.error) {
        if (!silent) syncLog(`${t('sync.received', '> Received')} ${newChannels.length} ${t('sync.channels', 'channels')}`);
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
        if (!silent) syncLog(t('sync.updated_new', '> Updated: {u} | New: {a}').replace('{u}', updated).replace('{a}', added));
        state.dropdownsPopulated = false;
        autoCategorizeChannels();
        renderAll();
        saveAppState();
        if (!silent) syncLog(t('sync.complete', '> Sync complete.'));
    } else {
        if (!silent) syncLog(t('sync.error', '> ERROR: Sync failed.'));
    }

    if (!silent) {
        if (btn) { btn.innerText = t('sync.btn.default', 'Sync Channels'); btn.disabled = false; }
    }

    updateSchedule();
}
