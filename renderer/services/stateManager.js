import { state } from '../state/appState.js';
import { cleanChannelMetadata } from '../filters/filterManager.js';

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
    cleanChannelMetadata();
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
        timeoutsConfig: window.timeoutsConfig,
        onboarded: localStorage.getItem('jtv_onboarded') === 'true',
        selectedLanguages: JSON.parse(localStorage.getItem('jtv_selected_languages') || '[]')
    };
    if (window.jtvAPI) {
        await window.jtvAPI.saveUserData(dataToSave);
    }
}

export async function saveChannelsAndFilters() {
    cleanChannelMetadata();
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
        timeoutsConfig: window.timeoutsConfig,
        onboarded: localStorage.getItem('jtv_onboarded') === 'true',
        selectedLanguages: JSON.parse(localStorage.getItem('jtv_selected_languages') || '[]')
    };
    if (window.jtvAPI) {
        await window.jtvAPI.saveUserData(dataToSave);
    }
}
