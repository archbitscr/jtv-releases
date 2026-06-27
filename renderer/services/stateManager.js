import { state } from '../state/appState.js';

const LANGS = new Set(['English','Español','Français','Português','Arabic','Italiano','Deutsch','Polish','Turkish','Greek','Dutch','Russian','Serbian','Croatian','Bulgarian','Hebrew','Danish','Swedish','Romanian','Czech','Slovak','Hungarian']);

function sortChannelCategories() {
    state.channels.forEach(c => {
        if (!c.categories) { c.categories = ['all']; return; }
        const all = [], l = [], g = [], e = [], o = [];
        const eventNames = new Set((state.filterEvents || []).map(f => f.name));
        c.categories.forEach(cat => {
            if (cat === 'all') all.push(cat);
            else if (LANGS.has(cat)) l.push(cat);
            else if (eventNames.has(cat)) e.push(cat);
            else o.push(cat);
        });
        c.categories = [...all, ...l, ...o, ...e];
    });
}

let saveTimeout = null;

export async function saveAppState(force = false) {
    if (force === true) {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }
        await actualSaveAppState();
        return;
    }

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        saveTimeout = null;
        await actualSaveAppState();
    }, 500);
}

export async function actualSaveAppState() {
    sortChannelCategories();
    const validChannels = state.channels.filter(c => c.name && c.path);
    const devState = window.getDeveloperState ? window.getDeveloperState() : {
        developerModeEnabled: false,
        diagnosticsEnabled: false,
        showDiagnosticClicks: false,
        hudDevControlsEnabled: false
    };
    const dataToSave = { 
        channels: validChannels, 
        globalDomain: state.globalDomain, 
        apiKey: state.apiKey, 
        apiEndpoint: state.apiEndpoint, 
        zapSourceTab: state.zapSourceTab, 
        tmdbKey: state.tmdbKey, 
        omdbKey: state.omdbKey, 
        autoUpdateDomain: state.autoUpdateDomain, 
        filterList: state.filterList, 
        filterLanguages: state.filterLanguages,
        filterGenres: state.filterGenres,
        filterEvents: state.filterEvents,
        seriesGenres: state.seriesGenres,
        moviesGenres: state.moviesGenres,
        vodFavorites: state.vodFavorites,
        vodCache: state.vodCache,
        selectedWallpaper: state.selectedWallpaper,
        audioLevelerEnabled: state.audioLevelerEnabled,
        hwAccelEnabled: state.hwAccelEnabled,
        minimizeToTray: state.minimizeToTray,
        preventSleep: state.preventSleep,
        cloudflareProtectionEnabled: state.cloudflareProtectionEnabled,
        currentVolumeLevel: state.currentVolumeLevel,
        developerModeEnabled: devState.developerModeEnabled,
        diagnosticsEnabled: devState.diagnosticsEnabled,
        showDiagnosticClicks: devState.showDiagnosticClicks,
        hudDevControlsEnabled: devState.hudDevControlsEnabled,
        hotkeyMap: state.hotkeyMap,
        timeoutsConfig: window.timeoutsConfig
    };
    if (window.jtvAPI) {
        await window.jtvAPI.saveUserData(dataToSave);
    }
}

export async function saveChannelsAndFilters() {
    sortChannelCategories();
    const validChannels = state.channels.filter(c => c && c.id);
    const devState = window.getDeveloperState ? window.getDeveloperState() : {
        developerModeEnabled: false,
        diagnosticsEnabled: false,
        showDiagnosticClicks: false,
        hudDevControlsEnabled: false
    };
    const dataToSave = { 
        channels: validChannels,
        globalDomain: state.globalDomain,
        apiKey: state.apiKey,
        apiEndpoint: state.apiEndpoint,
        zapSourceTab: state.zapSourceTab,
        tmdbKey: state.tmdbKey,
        omdbKey: state.omdbKey,
        autoUpdateDomain: state.autoUpdateDomain,
        filterList: state.filterList,
        filterLanguages: state.filterLanguages,
        filterGenres: state.filterGenres,
        filterEvents: state.filterEvents,
        seriesGenres: state.seriesGenres,
        moviesGenres: state.moviesGenres,
        vodFavorites: state.vodFavorites,
        selectedWallpaper: state.selectedWallpaper,
        audioLevelerEnabled: state.audioLevelerEnabled,
        hwAccelEnabled: state.hwAccelEnabled,
        minimizeToTray: state.minimizeToTray,
        preventSleep: state.preventSleep,
        cloudflareProtectionEnabled: state.cloudflareProtectionEnabled,
        currentVolumeLevel: state.currentVolumeLevel,
        developerModeEnabled: devState.developerModeEnabled,
        diagnosticsEnabled: devState.diagnosticsEnabled,
        showDiagnosticClicks: devState.showDiagnosticClicks,
        hudDevControlsEnabled: devState.hudDevControlsEnabled,
        hotkeyMap: state.hotkeyMap,
        timeoutsConfig: window.timeoutsConfig
    };
    if (window.jtvAPI) {
        await window.jtvAPI.saveUserData(dataToSave);
    }
}
