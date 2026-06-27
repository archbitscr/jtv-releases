import { state } from './renderer/state/appState.js';
import defaultChannels from './data/defaultChannels.json';
import { initWatchTimer } from './renderer/player/watchTimer.js';
import { initFailover } from './renderer/player/failover.js';
import { initPlayerController, selectChannel, zapChannel, mountRemotePlayer, playVod, updatePlayerActiveState } from './renderer/player/playerController.js';
import { initNavigation, showModule, showLiveLanding, switchTab, hideMenu } from './renderer/ui/navigation.js';
import { initInactivity, startInactivityTimers } from './renderer/ui/inactivity.js';
import { initChannelList, renderList, syncMenuScroll } from './renderer/render/channelList.js';
import { initGuide, renderGuide } from './renderer/render/guide.js';
import { initFavoritesGrid, renderFavoritesGrid, syncGridPageToActiveChannel } from './renderer/render/favoritesGrid.js';
import { initRenderAll, renderAll } from './renderer/render/renderAll.js';
import { eventIconsList, getActiveVodGenres, mapIconToEmoji } from './renderer/filters/filterState.js';
import { initFilterManager, populateDropdowns, matchesOnboardingLanguages, getFilteredChannelsList, syncFilterList, removeFilterFromChannel, startEditingFilter, removeSettingsFilter, autoCategorizeChannels } from './renderer/filters/filterManager.js';
import { initVodContent, refreshVodContent, showVodDetails } from './renderer/vod/vodContent.js';
import { initVodCache, warmupVodCache, scheduleVodCacheUpdate } from './renderer/vod/vodCache.js';
import { hashPIN, verifyPIN, promptParentalPIN, isParentalTimeLocked } from './renderer/settings/parental.js';
import { initEventAssigner, renderAssignerChannelsList, renderAssignerEvents, selectAssignerChannel, selectAssignerChannelMultiple } from './renderer/filters/filterAssigner.js';
import { initIconPickers } from './renderer/utils/iconPicker.js';
import { initDashCustomSelects, syncCustomSelect } from './renderer/utils/customSelect.js';
import { initCustomTooltips } from './renderer/utils/tooltips.js';

// Modularized Service & UI Imports
import { getActiveEpg } from './renderer/services/epg.js';
import { applyWallpaper, normalizeWallpaperPath } from './renderer/settings/wallpaper.js';
import { saveAppState } from './renderer/services/stateManager.js';
import { syncChannels, updateSchedule } from './renderer/services/channelSync.js';
import { checkValidity, updateEditLogo } from './renderer/ui/editPane.js';
import { adjustVolume, toggleMute, updateVolumeUI } from './renderer/ui/volumeController.js';
import { setSettingsFilterTab, setConnectivityTab, setChannelsTab } from './renderer/settings/settingsTabs.js';
import { ensurePlayerCurtain, showPlayerCurtain, hidePlayerCurtain, updateWebviewPointerEvents, updateHudChannelFilters } from './renderer/ui/playerUI.js';
import { syncCenterNavWidth, checkResolution, updateFullscreenButton, toggleAppFullscreen, handleResizeDimensions, updateVodGridDimensions } from './renderer/ui/layout.js';
import { updateSensorsUI } from './renderer/ui/sensors.js';
import { updateTriggersVisibility } from './renderer/ui/triggersVisibility.js';
import { setupEventListeners } from './renderer/ui/eventListeners.js';

import { getPlaceholderHtml, TV_ICON_SVG } from './renderer/utils/domHelpers.js';
import { sanitizeMediaUrl } from './renderer/utils/sanitize.js';

const nativeApi = window.jtvAPI;

window.timeoutsConfig = {
    settingsActive: 5000,
    settingsActiveEnabled: true,
    settingsInactive: 15000,
    settingsInactiveEnabled: true,
    menuActive: 5000,
    menuActiveEnabled: true,
    menuInactive: 15000,
    menuInactiveEnabled: true,
    topNav: 2000,
    topNavEnabled: true,
    zappingHUD: 4900,
    zappingHUDEnabled: true,
    cursorActive: 5000,
    cursorActiveEnabled: true,
    cursorInactive: 15000,
    cursorInactiveEnabled: true,
    failoverMain: 4000,
    failoverMainEnabled: true,
    failoverAlt: 3000,
    failoverAltEnabled: true,
    watchdogFreeze: 2000,
    watchdogFreezeEnabled: true,
    watchdogSilence: 10000
};

class TimeoutManager {
    constructor() {
        this.timers = new Map();
    }
    set(name, callback, delay) {
        this.clear(name);
        const id = setTimeout(() => {
            this.timers.delete(name);
            callback();
        }, delay);
        this.timers.set(name, id);
        return id;
    }
    has(name) {
        return this.timers.has(name);
    }
    clear(name) {
        if (this.timers.has(name)) {
            clearTimeout(this.timers.get(name));
            this.timers.delete(name);
        }
    }
}
const timeouts = new TimeoutManager();

window.handleLogoError = (img) => {
    const name = img.getAttribute('data-name') || '';
    img.outerHTML = getPlaceholderHtml(name);
};

window.handleEditLogoError = (img) => {
    img.outerHTML = TV_ICON_SVG;
};

window.updateSourceSwitcherUI = (source) => {
    const sourceBtns = document.querySelectorAll('.source-btn');
    sourceBtns.forEach(btn => {
        if (btn.dataset.source === source) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

async function init() {
    window.timeouts = timeouts;

    // Initialize watch duration trackers
    initWatchTimer({ saveAppState });

    // Initialize failover watchdog
    initFailover({
        selectChannel,
        mountRemotePlayer,
        updateSourceSwitcherUI: (src) => {
            window.updateSourceSwitcherUI(src);
        }
    });

    // Initialize filter manager dependencies
    initFilterManager({
        getActiveEpg,
        isParentalTimeLocked,
        renderAll,
        saveAppState,
        initIconPickers,
        syncCustomSelect,
        initDashCustomSelects
    });

    // Initialize player controller dependencies
    initPlayerController({
        applyWallpaper,
        showPlayerCurtain,
        hidePlayerCurtain,
        ensurePlayerCurtain,
        updateSourceSwitcherUI: (src) => {
            window.updateSourceSwitcherUI(src);
        },
        getActiveEpg,
        renderAll,
        startInactivityTimers,
        switchTab,
        updateTriggersVisibility,
        getFilteredChannelsList,
        updateWebviewPointerEvents,
        updateHudChannelFilters,
        syncMenuScroll,
        saveAppState,
        syncGridPageToActiveChannel
    });

    // Initialize UI navigation dependencies
    initNavigation({
        applyWallpaper,
        updatePlayerActiveState,
        selectChannel,
        renderFavoritesGrid,
        updateVodGridDimensions,
        refreshVodContent,
        updateTriggersVisibility,
        updateWebviewPointerEvents,
        startInactivityTimers,
        syncMenuScroll,
        syncGridPageToActiveChannel
    });

    // Initialize inactivity timers dependencies
    initInactivity(timeouts, {
        showModule,
        hideMenu
    });

    // Initialize render modules
    initChannelList({
        getActiveEpg,
        selectChannel,
        showEditPane: (ch) => {
            if (window.showEditPane) window.showEditPane(ch);
        },
        renderAll,
        saveAppState
    });

    initGuide({
        selectChannel
    });

    initFavoritesGrid({
        saveAppState,
        getActiveEpg,
        matchesOnboardingLanguages,
        isParentalTimeLocked,
        selectChannel,
        showVodDetails,
        refreshVodContent,
        getActiveVodGenres,
        syncCustomSelect,
        getFilteredChannelsList
    });

    initRenderAll({
        renderList,
        populateDropdowns,
        getFilteredChannelsList,
        renderFavoritesGrid,
        renderGuide,
        getEventIconColor: (icon) => {
            if (typeof eventIconsList !== 'undefined') {
                const found = eventIconsList.find(i => i.name === icon);
                return found ? found.color : '#3b82f6';
            }
            return '#3b82f6';
        },
        startEditingFilter,
        removeSettingsFilter,
        initIconPickers,
        initEventAssigner: () => {
            window.eventAssignerInitialized = true;
        },
        renderAssignerEvents,
        renderAssignerChannelsList
    });

    // Initialize VOD Modules
    initVodContent({
        nativeApi,
        scheduleVodCacheUpdate,
        renderFavoritesGrid,
        renderAll,
        playVod
    });

    initVodCache({
        timeouts,
        saveAppState,
        nativeApi,
        renderFavoritesGrid
    });

    // Initialize Event Assigner
    initEventAssigner();

    // Re-expose to window
    window.renderAll = renderAll;
    window.renderFavoritesGrid = renderFavoritesGrid;
    window.removeFilterFromChannel = removeFilterFromChannel;
    window.refreshVodContent = refreshVodContent;
    window.showVodDetails = showVodDetails;
    window.warmupVodCache = warmupVodCache;
    window.isParentalTimeLocked = isParentalTimeLocked;
    window.promptParentalPIN = promptParentalPIN;
    window.initEventAssigner = initEventAssigner;
    window.renderAssignerEvents = renderAssignerEvents;
    window.renderAssignerChannelsList = renderAssignerChannelsList;
    window.selectAssignerChannel = selectAssignerChannel;
    window.selectAssignerChannelMultiple = selectAssignerChannelMultiple;
    window.showModule = showModule;
    window.initIconPickers = initIconPickers;
    window.syncCustomSelect = syncCustomSelect;
    window.initDashCustomSelects = initDashCustomSelects;
    window.initCustomTooltips = initCustomTooltips;
    window.updateHudChannelFilters = updateHudChannelFilters;
    window.selectChannel = selectChannel;
    window.state = state;
    window.saveAppState = saveAppState;
    window.hideMenu = hideMenu;
    
    // Legacy Window API
    window.getChannels = () => state.channels;
    window.setChannels = (c) => { state.channels = c; state.dropdownsPopulated = false; };
    window.getActiveChannelId = () => state.activeChannelId;
    window.updateActiveChannelHudFilters = () => {
        if (state.activeChannelId) {
            const channel = state.channels.find(c => String(c.id) === String(state.activeChannelId));
            if (channel && window.updateHudChannelFilters) {
                window.updateHudChannelFilters(channel);
            }
        }
    };
    window.adjustVolume = adjustVolume;
    window.toggleMute = toggleMute;
    window.updateVolumeUI = updateVolumeUI;
    window.toggleAppFullscreen = toggleAppFullscreen;
    window.syncCenterNavWidth = syncCenterNavWidth;
    window.checkResolution = checkResolution;
    window.handleResizeDimensions = handleResizeDimensions;
    window.updateSensorsUI = updateSensorsUI;
    window.updateTriggersVisibility = updateTriggersVisibility;
    window.showEditPane = (ch) => {
        if (window.selectCrudChannel) window.selectCrudChannel(state.channels.findIndex(c => c.id === ch.id));
    };

    // Show loading screen immediately
    const appLoader = document.getElementById('app-loader');
    const loaderProgressBar = document.getElementById('loader-progress-bar');
    const loaderMessage = document.getElementById('loader-message');
    
    if (appLoader) appLoader.classList.remove('hidden');
    if (loaderProgressBar) loaderProgressBar.style.width = '0%';
    if (loaderMessage) loaderMessage.innerText = 'Initializing local database...';

    // Verify trial period on startup
    const trialCheck = await nativeApi.getNetworkDate().catch(() => ({ expired: false }));
    const savedDataLocal = await nativeApi.loadUserData().catch(() => null);
    const isDevMode = savedDataLocal && savedDataLocal.developerModeEnabled !== undefined ? !!savedDataLocal.developerModeEnabled : true;

    if (!isDevMode && trialCheck && trialCheck.expired) {
        if (appLoader) appLoader.classList.add('hidden');
        const expiredBlocker = document.getElementById('trial-expired-blocker');
        if (expiredBlocker) expiredBlocker.classList.remove('hidden');
        return; // Halt app boot
    }

    // Update trial status in settings pane
    const trialStatusEl = document.getElementById('account-trial-status');
    if (trialStatusEl) {
        if (isDevMode) {
            trialStatusEl.innerText = 'Developer Mode';
        } else if (trialCheck.firstTime) {
            trialStatusEl.innerText = 'Trial period active (3 days remaining).';
        } else {
            const totalHoursLeft = Math.max(0, (3 - (trialCheck.elapsedDays || 0)) * 24);
            const d = Math.floor(totalHoursLeft / 24);
            const h = Math.round(totalHoursLeft % 24);
            const timeStr = d >= 1 ? `${d} days remaining.` : `${h} hours remaining.`;
            trialStatusEl.innerText = `Trial period active. ${timeStr}`;
        }
    }

    // Progress bar animations
    setTimeout(() => {
        if (loaderProgressBar) loaderProgressBar.style.width = '35%';
        if (loaderMessage) loaderMessage.innerText = 'Loading wallpapers and styles...';
    }, 300);

    setTimeout(() => {
        if (loaderProgressBar) loaderProgressBar.style.width = '65%';
        if (loaderMessage) loaderMessage.innerText = 'Syncing DaddyLive channels...';
    }, 650);

    setTimeout(() => {
        if (loaderProgressBar) loaderProgressBar.style.width = '100%';
        if (loaderMessage) loaderMessage.innerText = 'Ready.';
    }, 1000);

    // Core Data Loading and sflix / Domain setups
    const savedData = await nativeApi.loadUserData();
    if (savedData) {
        state.channels = (savedData.channels || []).filter(c => c.name && (c.path || c.customUrl));
        state.channels.forEach(c => {
            if (!c.categories) {
                c.categories = c.category ? [c.category] : ["all"];
                delete c.category;
            }
        });
        state.globalDomain = savedData.globalDomain || state.globalDomain;
        window.globalDomain = state.globalDomain;
        state.apiKey = savedData.apiKey || "";
        state.apiEndpoint = savedData.apiEndpoint || "";
        state.tmdbKey = savedData.tmdbKey || "";
        state.omdbKey = savedData.omdbKey || "";
        state.autoUpdateDomain = savedData.autoUpdateDomain !== undefined ? savedData.autoUpdateDomain : true;

        if (savedData.filterLanguages) {
            const defaultEnabled = new Set(['English', 'Español']);
            state.filterLanguages = savedData.filterLanguages.map(f => ({
                ...f,
                enabled: f.enabled !== undefined ? f.enabled : defaultEnabled.has(f.name)
            }));
        }
        if (savedData.filterGenres) {
            state.filterGenres = savedData.filterGenres;
            if (!state.filterGenres.some(f => f.name === 'XXX')) {
                state.filterGenres.push({ name: 'XXX', icon: 'ban' });
            }
        }

        if (savedData.filterEvents) {
            const loadedEvents = [...savedData.filterEvents];
            loadedEvents.forEach(e => {
                e.icon = mapIconToEmoji(e.icon || e.name);
            });
            state.filterEvents = loadedEvents;
        }

        syncFilterList();

        saveAppState();

        if (savedData.seriesGenres && savedData.seriesGenres.length > 0) {
            state.seriesGenres = savedData.seriesGenres;
        }
        if (savedData.moviesGenres && savedData.moviesGenres.length > 0) {
            state.moviesGenres = savedData.moviesGenres;
        }
        if (Array.isArray(savedData.vodFavorites)) {
            state.vodFavorites = savedData.vodFavorites;
        }
        if (savedData.vodCache && typeof savedData.vodCache === 'object') {
            state.vodCache = {
                movies: {
                    items: Array.isArray(savedData.vodCache.movies?.items) ? savedData.vodCache.movies.items : [],
                    updatedAt: Number(savedData.vodCache.movies?.updatedAt) || 0
                },
                series: {
                    items: Array.isArray(savedData.vodCache.series?.items) ? savedData.vodCache.series.items : [],
                    updatedAt: Number(savedData.vodCache.series?.updatedAt) || 0
                }
            };
            if (state.vodCache.movies.items.length) state.fetchedMovies = state.vodCache.movies.items.map(it => ({ ...it, type: 'movies' })).slice(0, 100);
            if (state.vodCache.series.items.length) state.fetchedSeries = state.vodCache.series.items.map(it => ({ ...it, type: 'series' })).slice(0, 100);
        }
        state.selectedWallpaper = normalizeWallpaperPath(savedData.selectedWallpaper || "assets/wallpapers/Planet.jpg");
        state.audioLevelerEnabled = savedData.audioLevelerEnabled !== undefined ? savedData.audioLevelerEnabled : false;
        state.hwAccelEnabled = savedData.hwAccelEnabled !== undefined ? savedData.hwAccelEnabled : true;
        state.minimizeToTray = savedData.minimizeToTray !== undefined ? savedData.minimizeToTray : false;
        state.preventSleep = savedData.preventSleep !== undefined ? savedData.preventSleep : false;
        state.cloudflareProtectionEnabled = savedData.cloudflareProtectionEnabled !== undefined ? savedData.cloudflareProtectionEnabled : false;
        if (savedData.zapSourceTab !== undefined) {
            state.zapSourceTab = savedData.zapSourceTab;
        }
        if (savedData.currentVolumeLevel !== undefined) {
            state.currentVolumeLevel = savedData.currentVolumeLevel;
        }
        if (savedData.hotkeyMap) {
            state.hotkeyMap = { ...state.hotkeyMap, ...savedData.hotkeyMap };
        }
        if (savedData.timeoutsConfig) {
            window.timeoutsConfig = { ...window.timeoutsConfig, ...savedData.timeoutsConfig };
        }
    }

    const isProd = false;
    if (!isProd) {
        try {
            const devModule = await import('./developerModule.js');
            if (savedData) {
                window.setDeveloperState(savedData);
            }
            await devModule.initDeveloperFeatures();
            const { initGlassTuner } = await import('./renderer/utils/glassTuner.js');
            initGlassTuner();
        } catch (err) {
            console.error('Failed to load developer module:', err);
        }
    }

    if (state.autoUpdateDomain) {
        const detected = await nativeApi.checkDomain();
        if (detected) {
            state.globalDomain = detected;
            window.globalDomain = state.globalDomain;
        }
    }

    // Set UI Inputs values
    const globalDomainInput = document.getElementById('global-domain-input');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiEndpointInput = document.getElementById('api-endpoint-input');
    const tmdbKeyInput = document.getElementById('tmdb-key-input');
    const omdbKeyInput = document.getElementById('omdb-key-input');
    const autoDomainToggle = document.getElementById('auto-domain-toggle');
    const audioLevelerToggle = document.getElementById('audio-leveler-toggle');
    const hwAccelToggle = document.getElementById('hw-accel-toggle');
    const minimizeToTrayToggle = document.getElementById('minimize-to-tray-toggle');
    const preventSleepToggle = document.getElementById('prevent-sleep-toggle');
    const cloudflareProtectionToggle = document.getElementById('cloudflare-protection-toggle');

    if (globalDomainInput) globalDomainInput.value = state.globalDomain;
    if (apiKeyInput) apiKeyInput.value = state.apiKey;
    if (apiEndpointInput) apiEndpointInput.value = state.apiEndpoint;
    if (tmdbKeyInput) tmdbKeyInput.value = state.tmdbKey;
    if (omdbKeyInput) omdbKeyInput.value = state.omdbKey;
    if (autoDomainToggle) autoDomainToggle.checked = state.autoUpdateDomain;
    if (audioLevelerToggle) audioLevelerToggle.checked = state.audioLevelerEnabled;
    if (hwAccelToggle) hwAccelToggle.checked = state.hwAccelEnabled;
    if (minimizeToTrayToggle) minimizeToTrayToggle.checked = state.minimizeToTray;
    if (preventSleepToggle) preventSleepToggle.checked = state.preventSleep;
    if (cloudflareProtectionToggle) cloudflareProtectionToggle.checked = !!state.cloudflareProtectionEnabled;

    if (state.channels.length === 0) {
        state.channels = defaultChannels.map(c => ({ ...c }));
        syncFilterList();

        saveAppState();
        syncChannels(true);
    } else {
        autoCategorizeChannels();

        saveAppState();
    }

    applyWallpaper(state.selectedWallpaper);

    const initialVolume = await nativeApi.getCurrentVolume();
    if (initialVolume !== undefined && initialVolume !== null) {
        state.currentVolumeLevel = initialVolume;
        updateVolumeUI();
    }

    document.title = "JTV";
    syncGridPageToActiveChannel();
    renderAll();
    setupEventListeners();
    state.isAppFullscreen = await nativeApi.getFullscreenState();
    updateFullscreenButton();

    populateDropdowns();

    setTimeout(() => {
        if (appLoader) {
            appLoader.classList.add('fade-out');
            setTimeout(() => {
                appLoader.classList.add('hidden');
                if (window.updateDeveloperUI) window.updateDeveloperUI();
            }, 600);
        }
        
    }, 1200);

    showModule('home');

    // Document error boundaries
    document.addEventListener('error', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;

        if (target.dataset.fallbackLogo === '1') {
            window.handleLogoError(target);
            return;
        }

        if (target.dataset.fallbackEditLogo === '1') {
            window.handleEditLogoError(target);
            return;
        }

        if (target.dataset.fallbackPoster === '1') {
            target.src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=240&auto=format&fit=crop';
        }
    }, true);

    document.addEventListener('click', async (e) => {
        const a = e.target?.closest?.('a.external-link');
        if (!a) return;
        const url = a.getAttribute('href');
        if (!url) return;
        e.preventDefault();
        await nativeApi.openExternal(url);
    });

    nativeApi.onFullscreenStateChanged((fsState) => {
        state.isAppFullscreen = fsState;
        updateFullscreenButton();
    });

    updateSchedule();
    setInterval(updateSchedule, 10 * 60 * 1000);
    updateTriggersVisibility();
    checkResolution();
    updatePlayerActiveState();

    setTimeout(() => {
        warmupVodCache();
    }, 250);
}

window.addEventListener('load', () => {
    checkResolution();
    syncCenterNavWidth();
    if (state.currentModule === 'movies' || state.currentModule === 'series') {
        const dims = updateVodGridDimensions();
        if (dims) state.VOD_ITEMS_PER_PAGE = dims.itemsPerPage;
    }
    initCustomTooltips();
    if (window.lucide) window.lucide.createIcons();
    syncCenterNavWidth();
});
window.addEventListener('resize', handleResizeDimensions);

// Bind close application button
const closeAppBtn = document.getElementById('close-app-btn');
if (closeAppBtn) {
    closeAppBtn.onclick = () => {
        window.close();
    };
}

init();
