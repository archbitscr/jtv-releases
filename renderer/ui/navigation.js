import { state } from '../state/appState.js';
import { resetAntiBlackScreen } from '../player/playerController.js';

let ext = {};

export function initNavigation(dependencies) {
    ext = dependencies;
}

export function hideEditPane(shouldValidate = true) {
    const editView = document.getElementById('edit-view');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const editedId = state.currentEditingChannelId;

    if (shouldValidate && ext.validateAndCleanupCurrentEdit) {
        ext.validateAndCleanupCurrentEdit();
    }

    if (editView) editView.classList.add('hidden');
    
    const activeTabBtn = document.querySelector('.tab-btn.active');
    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'channels';
    tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === `tab-${activeTab}`));

    if (editedId && ext.syncMenuScroll) {
        ext.syncMenuScroll(editedId);
    }
    state.currentEditingChannelId = null;
}

export function hideMenu() {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.classList.add('hidden');
    hideEditPane(true);
    
    if (state.activeChannelId && ext.syncMenuScroll) {
        ext.syncMenuScroll(state.activeChannelId);
    }
}

export function updateTopNavVisibility(moduleName) {
    const topBtnLive = document.getElementById('top-btn-live');
    const topBtnSeries = document.getElementById('top-btn-series');
    const topBtnMovies = document.getElementById('top-btn-movies');
    const topBtnSettings = document.getElementById('top-btn-settings');
    
    if (topBtnLive) {
        topBtnLive.classList.remove('hidden');
        topBtnLive.classList.toggle('active', moduleName === 'live');
    }
    if (topBtnSeries) {
        topBtnSeries.classList.remove('hidden');
        topBtnSeries.classList.toggle('active', moduleName === 'series');
    }
    if (topBtnMovies) {
        topBtnMovies.classList.remove('hidden');
        topBtnMovies.classList.toggle('active', moduleName === 'movies');
    }
    if (topBtnSettings) {
        topBtnSettings.classList.remove('hidden');
        topBtnSettings.classList.toggle('active', moduleName === 'settings');
    }
}

export function showLiveLanding() {
    const topNavMenu = document.getElementById('top-nav-menu');
    const sectionTitle = document.getElementById('section-title');
    const sourceSwitcher = document.getElementById('pbar');
    
    updateTopNavVisibility('live');
    if (topNavMenu) {
        topNavMenu.classList.remove('hidden');
    }

    state.activeDashTab = "live";
    state.isHomeActive = true;
    state.currentModule = "live";
    
    if (sectionTitle) {
        sectionTitle.textContent = "Live TV";
        sectionTitle.classList.remove('hidden');
    }

    const homeDashboard = document.getElementById('home-dashboard');
    if (homeDashboard) homeDashboard.classList.remove('hidden');
    
    if (ext.syncGridPageToActiveChannel) ext.syncGridPageToActiveChannel();
    if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
    
    if (sourceSwitcher) sourceSwitcher.classList.add('hidden');
    if (ext.updateTriggersVisibility) ext.updateTriggersVisibility();
}

export function showModule(moduleName) {
    if (moduleName === 'live' || moduleName === 'series' || moduleName === 'movies') {
        state.activeDashTab = moduleName === 'live' ? 'live' : moduleName;
    }

    const vodControls = document.getElementById('vod-controls');
    const liveSearchContainer = document.getElementById('live-search-container');
    const dashboardFiltersEl = document.getElementById('dashboard-filters');
    const favoritesGrid = document.getElementById('favorites-grid');
    const gridDots = document.getElementById('grid-dots');
    const playerContainer = document.getElementById('player-container');
    const sourceSwitcher = document.getElementById('pbar');
    const topNavMenu = document.getElementById('top-nav-menu');
    
    if (vodControls) vodControls.classList.add('hidden');
    if (liveSearchContainer) liveSearchContainer.classList.add('hidden');
    if (dashboardFiltersEl) dashboardFiltersEl.classList.add('hidden');

    const isChannelPlaying = state.activeChannelId && !state.isVodPlaying;
    const leavingVod = (state.currentModule === 'series' || state.currentModule === 'movies') && (moduleName !== 'series' && moduleName !== 'movies');

    if (leavingVod && favoritesGrid) {
        favoritesGrid.innerHTML = '';
        if (gridDots) gridDots.innerHTML = '';
    }

    if (moduleName === 'series' || moduleName === 'movies') {
        if (favoritesGrid) favoritesGrid.classList.add('vod-active');
    } else {
        if (favoritesGrid) favoritesGrid.classList.remove('vod-active');
    }

    if (state.currentModule !== 'settings') {
        state.previousModule = state.currentModule;
    }

    if (isChannelPlaying && (moduleName === 'series' || moduleName === 'movies')) {
        const activeChan = state.channels.find(c => String(c.id) === String(state.activeChannelId));
        if (activeChan) {
            state.lastTunedChannel = activeChan;
            state.shouldRestoreTunedChannel = true;
        }
        if (playerContainer) playerContainer.innerHTML = '';
        resetAntiBlackScreen();
        state.activeChannelId = null;
        if (sourceSwitcher) sourceSwitcher.classList.add('hidden');
        if (ext.applyWallpaper) ext.applyWallpaper(state.selectedWallpaper);
        if (ext.updatePlayerActiveState) ext.updatePlayerActiveState();
    }

    if (moduleName === 'home' || moduleName === 'settings' || moduleName === 'series' || moduleName === 'movies') {
        if (sourceSwitcher) sourceSwitcher.classList.add('hidden');
    }

    state.currentModule = moduleName;
    state.isVodPlaying = false;
    document.body.setAttribute('data-module', moduleName);

    const sectionTitle = document.getElementById('section-title');
    if (sectionTitle) {
        if (moduleName === 'live') {
            sectionTitle.textContent = "Live TV";
            sectionTitle.classList.remove('hidden');
        } else if (moduleName === 'series') {
            sectionTitle.textContent = "Series";
            sectionTitle.classList.remove('hidden');
        } else if (moduleName === 'movies') {
            sectionTitle.textContent = "Movies";
            sectionTitle.classList.remove('hidden');
        } else {
            sectionTitle.classList.add('hidden');
        }
    }

    document.getElementById('app-home-screen').classList.add('hidden');
    document.getElementById('home-dashboard').classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
    
    document.querySelectorAll('.header-nav-btn').forEach(btn => btn.classList.remove('active'));

    updateTopNavVisibility(moduleName);

    if (topNavMenu) {
        if (moduleName === 'series' || moduleName === 'movies' || (moduleName === 'live' && !state.activeChannelId)) {
            topNavMenu.classList.remove('hidden');
        } else if (moduleName === 'home' || moduleName === 'settings' || (moduleName === 'live' && state.activeChannelId)) {
            topNavMenu.classList.add('hidden');
        }
    }

    if (moduleName === 'home') {
        if (ext.applyWallpaper) ext.applyWallpaper(state.selectedWallpaper);
        document.getElementById('app-home-screen').classList.remove('hidden');
        document.querySelector('.header-nav-btn[data-nav="home"]')?.classList.add('active');
        state.isHomeActive = true;
        document.title = "JTV";
    } else if (moduleName === 'live') {
        if (state.activeChannelId) {
            state.isHomeActive = false;
            if (sourceSwitcher) sourceSwitcher.classList.remove('hidden');
            const activeChan = state.channels.find(c => String(c.id) === String(state.activeChannelId));
            if (activeChan) {
                document.title = `${activeChan.name} - ${activeChan.id}`;
            }
        } else if (state.shouldRestoreTunedChannel && state.lastTunedChannel) {
            state.shouldRestoreTunedChannel = false;
            if (ext.selectChannel) ext.selectChannel(state.lastTunedChannel);
            return;
        } else {
            if (ext.applyWallpaper) ext.applyWallpaper(state.selectedWallpaper);
            document.getElementById('home-dashboard').classList.remove('hidden');
            state.isHomeActive = true;
            const liveSearchInput = document.getElementById('live-landing-search');
            if (liveSearchInput) liveSearchInput.value = "";
            if (ext.syncGridPageToActiveChannel) ext.syncGridPageToActiveChannel();
            if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
            document.title = "JTV - Live TV";
        }
    } else if (moduleName === 'series') {
        document.getElementById('home-dashboard').classList.remove('hidden');
        state.isHomeActive = true;
        document.querySelector('.header-nav-btn[data-nav="series"]')?.classList.add('active');
        hideMenu();
        const vodSI = document.getElementById('vod-search-input');
        if (vodSI) vodSI.placeholder = "Search series...";
        state.vodFilterMode = "all";
        state.selectedVodRating = "all";
        state.selectedVodYear = "all";
        state.vodPage = 0;
        state.vodFavPage = 0;
        state.vodSearchTerm = "";
        state.selectedVodGenre = "All";
        if (vodSI) vodSI.value = "";
        
        if (ext.updateVodGridDimensions) {
            const dims = ext.updateVodGridDimensions();
            if (dims) state.VOD_ITEMS_PER_PAGE = dims.itemsPerPage;
        }
        
        if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
        if (ext.refreshVodContent) ext.refreshVodContent();
        document.title = "JTV - Series";
    } else if (moduleName === 'movies') {
        document.getElementById('home-dashboard').classList.remove('hidden');
        state.isHomeActive = true;
        document.querySelector('.header-nav-btn[data-nav="movies"]')?.classList.add('active');
        hideMenu();
        const vodSI2 = document.getElementById('vod-search-input');
        if (vodSI2) vodSI2.placeholder = "Search movies...";
        state.vodFilterMode = "all";
        state.selectedVodRating = "all";
        state.selectedVodYear = "all";
        state.vodPage = 0;
        state.vodFavPage = 0;
        state.vodSearchTerm = "";
        state.selectedVodGenre = "All";
        if (vodSI2) vodSI2.value = "";
        
        if (ext.updateVodGridDimensions) {
            const dims = ext.updateVodGridDimensions();
            if (dims) state.VOD_ITEMS_PER_PAGE = dims.itemsPerPage;
        }
        
        if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
        if (ext.refreshVodContent) ext.refreshVodContent();
        document.title = "JTV - Movies";
    } else if (moduleName === 'settings') {
        document.getElementById('settings-screen').classList.remove('hidden');
        document.querySelector('.header-nav-btn[data-nav="settings"]')?.classList.add('active');
        
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        const generalTabBtn = document.querySelector('.settings-tab-btn[data-settings-tab="general"]');
        if (generalTabBtn) generalTabBtn.classList.add('active');

        document.querySelectorAll('.settings-sect-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === 'settings-sect-general');
        });
        
        document.title = "JTV - Settings";
    }
    if (ext.updateTriggersVisibility) ext.updateTriggersVisibility();
    if (ext.updateWebviewPointerEvents) ext.updateWebviewPointerEvents();
}

export function switchTab(tabId) {
    if (!tabId) return;
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (ext.validateAndCleanupCurrentEdit) ext.validateAndCleanupCurrentEdit();
    if (tabId === 'home') {
        hideMenu();
        if (state.activeChannelId && !state.isVodPlaying) {
            showLiveLanding();
        } else {
            showModule('live');
        }
        return;
    }
    if (tabId === 'settings') {
        showModule('settings');
        return;
    }
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === `tab-${tabId}`));

    if ((tabId === 'channels' || tabId === 'favorites') && ext.syncMenuScroll) {
        ext.syncMenuScroll();
    }
}
