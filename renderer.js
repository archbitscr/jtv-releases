import { state } from './renderer/state/appState.js';
import { loadLocale, applyLocale, t } from './renderer/i18n/i18n.js';

if (import.meta.hot) {
  const _devOverrides = new Map()
  import.meta.hot.on('jtv:css', css => {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g
    let m
    while ((m = ruleRe.exec(stripped)) !== null) {
      const sel = m[1].trim()
      if (!sel) continue
      _devOverrides.set(sel, m[2].trim())
    }
    let el = document.getElementById('__jtv-dev-css')
    if (!el) { el = document.createElement('style'); el.id = '__jtv-dev-css'; }
    else { el.remove(); }
    el.textContent = [..._devOverrides.entries()].map(([s, b]) => `${s} { ${b} }`).join('\n')
    document.head.appendChild(el)
    console.log('[JTV] jtv:css applied —', _devOverrides.size, 'rule(s)')
  })
}
import defaultChannels from './data/defaultChannels.json';
import { initWatchTimer } from './renderer/player/watchTimer.js';
import { initFailover } from './renderer/player/failover.js';
import { initPlayerController, selectChannel, zapChannel, mountRemotePlayer, updatePlayerActiveState } from './renderer/player/playerController.js';
import { initNavigation, showModule, showLiveLanding, switchTab, hideMenu } from './renderer/ui/navigation.js';
import { initInactivity, startInactivityTimers } from './renderer/ui/inactivity.js';
import { initChannelList, renderList, syncMenuScroll } from './renderer/render/channelList.js';
import { initGuide, renderGuide } from './renderer/render/guide.js';
import { initFavoritesGrid, renderFavoritesGrid, syncGridPageToActiveChannel } from './renderer/render/favoritesGrid.js';
import { initRenderAll, renderAll } from './renderer/render/renderAll.js';
import { eventIconsList, mapIconToEmoji } from './renderer/filters/filterState.js';
import { initFilterManager, populateDropdowns, matchesOnboardingLanguages, getFilteredChannelsList, syncFilterList, removeFilterFromChannel, startEditingFilter, removeSettingsFilter, autoCategorizeChannels } from './renderer/filters/filterManager.js';
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
import { syncCenterNavWidth, checkResolution, updateFullscreenButton, toggleAppFullscreen, handleResizeDimensions, updatePlayerVideoBox } from './renderer/ui/layout.js';
// sensors.js is dev-only: loaded dynamically in the dev block below (see import.meta.env.PROD gate)
import { updateTriggersVisibility } from './renderer/ui/triggersVisibility.js';
import { setupEventListeners } from './renderer/ui/eventListeners.js';

import { getPlaceholderHtml, TV_ICON_SVG } from './renderer/utils/domHelpers.js';
import { sanitizeMediaUrl } from './renderer/utils/sanitize.js';

const nativeApi = window.jtvAPI;

window.timeoutsConfig = {
    settingsActive: 8000,
    settingsActiveEnabled: true,
    menuActive: 3000,
    menuActiveEnabled: true,
    topNav: 3000,
    topNavEnabled: true,
    zappingHUD: 3000,
    zappingHUDEnabled: true,
    cursorActive: 3000,
    cursorActiveEnabled: true,
    failoverMain: 3000,
    failoverMainEnabled: true,
    failoverAlt: 3000,
    failoverAltEnabled: true,
    watchdogFreeze: 3000,
    watchdogFreezeEnabled: true,
    watchdogSilence: 10000,
    landAutoHide: 6000,
    landAutoHideEnabled: true,
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
    const sourceBtns = document.querySelectorAll('.pbar-source-btn');
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

    // Dev-only UI gate (prep for Task 23 — Tree Shaking): reveal elements marked
    // data-dev="true". Always active in the Vite dev server; in packaged builds the
    // developer module adds .dev-mode when dev mode is available (see developerModule.js).
    if (import.meta.env.DEV) document.body.classList.add('dev-mode');

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
        syncGridPageToActiveChannel,
        updatePlayerVideoBox
    });

    // Initialize UI navigation dependencies
    initNavigation({
        applyWallpaper,
        updatePlayerActiveState,
        selectChannel,
        renderFavoritesGrid,
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
        selectChannel,
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

    // Initialize Event Assigner
    initEventAssigner();

    // Re-expose to window
    window.renderAll = renderAll;
    window.renderFavoritesGrid = renderFavoritesGrid;
    window.removeFilterFromChannel = removeFilterFromChannel;
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

    // En modo browser (Vite dev sin Electron) no hay IPC — mostrar la app directamente
    if (!nativeApi) {
        if (loaderMessage) loaderMessage.innerText = 'Initializing local database...';
        setTimeout(() => {
            if (appLoader) {
                appLoader.classList.add('fade-out');
                setTimeout(() => appLoader.classList.add('hidden'), 600);
            }
        }, 800);
        return;
    }

    const savedDataLocal = await nativeApi.loadUserData().catch(() => null);

    // Load locale early so loader messages are translated
    await loadLocale(savedDataLocal?.appLanguage || 'en');
    if (loaderMessage) loaderMessage.innerText = t('loader.init', 'Initializing local database...');

    // Progress bar animations
    setTimeout(() => {
        if (loaderProgressBar) loaderProgressBar.style.width = '50%';
        if (loaderMessage) loaderMessage.innerText = t('loader.ui', 'Loading UI/UX...');
    }, 300);

    setTimeout(() => {
        if (loaderProgressBar) loaderProgressBar.style.width = '100%';
        if (loaderMessage) loaderMessage.innerText = t('loader.ready', 'Ready.');
    }, 600);

    // Core Data Loading
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
            const merged = { ...state.hotkeyMap, ...savedData.hotkeyMap };
            for (const action of Object.keys(merged)) {
                if (Array.isArray(merged[action]) && merged[action].length > 2) {
                    merged[action] = merged[action].slice(0, 2);
                }
            }
            state.hotkeyMap = merged;
        }
        if (savedData.timeoutsConfig) {
            window.timeoutsConfig = { ...window.timeoutsConfig, ...savedData.timeoutsConfig };
        }
        if (savedData.appLanguage) {
            state.appLanguage = savedData.appLanguage;
        }
    }

    await loadLocale(state.appLanguage);
    applyLocale();

    // Dev-only modules (Task 23): loaded exclusively via dynamic import() guarded by
    // import.meta.env.PROD. In production builds Vite/esbuild replaces PROD with `true`,
    // eliminates this block as dead code, and — since nothing else imports them — drops
    // developerModule.js, glassTuner.js and sensors.js from the bundle entirely.
    if (!import.meta.env.PROD) {
        try {
            const sensorsModule = await import('./renderer/ui/sensors.js');
            window.updateSensorsUI = sensorsModule.updateSensorsUI;
            const devModule = await import('./developerModule.js');
            if (savedData) {
                window.setDeveloperState(savedData);
            }
            await devModule.initDeveloperFeatures();
            const autotuneToggleBtn = document.getElementById('pbar-autotune-toggle-btn');
            if (autotuneToggleBtn) {
                autotuneToggleBtn.onclick = () => devModule.toggleAutotuneControls();
            }
            const { initGlassTuner } = await import('./renderer/utils/glassTuner.js');
            initGlassTuner();
        } catch (err) {
            console.error('Failed to load developer module:', err);
        }
    }

    // User-mode shutdown control (Task 23). The dev module manages #corner-power-zone
    // visibility while developing; in production the dev module is absent, so wire the
    // user Power button and reveal its hover zone here — otherwise the packaged app
    // (frameless) would have no way to close.
    const powerUserBtn = document.getElementById('corner-power-btn');
    if (powerUserBtn) powerUserBtn.onclick = () => window.close();
    if (import.meta.env.PROD) {
        const powerHoverZone = document.getElementById('corner-power-zone');
        if (powerHoverZone) powerHoverZone.style.display = 'flex';
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
    const autoDomainToggle = document.getElementById('auto-domain-toggle');
    const audioLevelerToggle = document.getElementById('audio-leveler-toggle');
    const hwAccelToggle = document.getElementById('hw-accel-toggle');
    const minimizeToTrayToggle = document.getElementById('minimize-to-tray-toggle');
    const preventSleepToggle = document.getElementById('prevent-sleep-toggle');
    const cloudflareProtectionToggle = document.getElementById('cloudflare-protection-toggle');

    if (globalDomainInput) globalDomainInput.value = state.globalDomain;
    if (apiKeyInput) apiKeyInput.value = state.apiKey;
    if (apiEndpointInput) apiEndpointInput.value = state.apiEndpoint;
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
        
    }, 900);

    showModule('live');

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

}

window.addEventListener('load', () => {
    checkResolution();
    syncCenterNavWidth();
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
