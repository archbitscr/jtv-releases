import { state } from '../state/appState.js';
import { t } from '../i18n/i18n.js';
import { resetAntiBlackScreen } from '../player/playerController.js';
import { resetFailoverState, showNoSignalOverlay } from '../player/failover.js';

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
    
    const activeTabBtn = document.querySelector('.side-tab-btn.active');
    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'channels';
    tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === `tab-${activeTab}`));

    if (editedId && ext.syncMenuScroll) {
        ext.syncMenuScroll(editedId);
    }
    state.currentEditingChannelId = null;
}

export function hideMenu() {
    const mainMenu = document.getElementById('side-menu');
    if (mainMenu) mainMenu.classList.add('hidden');
    hideEditPane(true);
    
    if (state.activeChannelId && ext.syncMenuScroll) {
        ext.syncMenuScroll(state.activeChannelId);
    }
}

export function updateTopNavVisibility(moduleName) {
    const topBtnLive = document.getElementById('tnav-btn-live');
    const topBtnSettings = document.getElementById('tnav-btn-settings');

    if (topBtnLive) {
        topBtnLive.classList.remove('hidden');
        topBtnLive.classList.toggle('active', moduleName === 'live');
    }
    if (topBtnSettings) {
        topBtnSettings.classList.remove('hidden');
        topBtnSettings.classList.toggle('active', moduleName === 'settings');
    }
}

export function showLiveLanding() {
    const topNavMenu = document.getElementById('tnav-menu');
    const sectionTitle = document.getElementById('land-title');
    const sourceSwitcher = document.getElementById('pbar');
    
    updateTopNavVisibility('live');
    if (topNavMenu) {
        topNavMenu.classList.remove('hidden');
    }

    state.isHomeActive = true;
    state.currentModule = "live";
    document.body.setAttribute('data-module', 'live');
    
    if (sectionTitle) {
        sectionTitle.textContent = t('nav.live_tv', 'Live TV');
        sectionTitle.classList.remove('hidden');
    }

    const homeDashboard = document.getElementById('vod-library');
    if (homeDashboard) homeDashboard.classList.remove('hidden');

    if (ext.applyWallpaper) ext.applyWallpaper(state.selectedWallpaper);
    if (ext.syncGridPageToActiveChannel) ext.syncGridPageToActiveChannel();
    if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
    
    if (sourceSwitcher) sourceSwitcher.classList.add('hidden');
    if (ext.updateTriggersVisibility) ext.updateTriggersVisibility();
}

export function showModule(moduleName) {
    // 'home' is now an alias for 'live'
    if (moduleName === 'home') moduleName = 'live';

    const liveSearchContainer = document.getElementById('live-search-container');
    const dashboardFiltersEl = document.getElementById('dashboard-filters');
    const sourceSwitcher = document.getElementById('pbar');
    const topNavMenu = document.getElementById('tnav-menu');

    if (liveSearchContainer) liveSearchContainer.classList.add('hidden');
    if (dashboardFiltersEl) dashboardFiltersEl.classList.add('hidden');

    if (state.currentModule !== 'settings') {
        state.previousModule = state.currentModule;
    }

    if (moduleName === 'settings') {
        if (sourceSwitcher) sourceSwitcher.classList.add('hidden');
    }

    state.currentModule = moduleName;
    document.body.setAttribute('data-module', moduleName);

    const sectionTitle = document.getElementById('land-title');
    if (sectionTitle) {
        if (moduleName === 'live') {
            sectionTitle.textContent = t('nav.live_tv', 'Live TV');
            sectionTitle.classList.remove('hidden');
        } else {
            sectionTitle.classList.add('hidden');
        }
    }

    document.getElementById('vod-library').classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');

    document.querySelectorAll('.header-nav-btn').forEach(btn => btn.classList.remove('active'));

    updateTopNavVisibility(moduleName);

    if (topNavMenu) {
        if (moduleName === 'live' && !state.activeChannelId) {
            topNavMenu.classList.remove('hidden');
        } else {
            topNavMenu.classList.add('hidden');
        }
    }

    if (moduleName === 'live') {
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
            document.getElementById('vod-library').classList.remove('hidden');
            state.isHomeActive = true;
            const liveSearchInput = document.getElementById('live-landing-search');
            if (liveSearchInput) liveSearchInput.value = "";
            if (ext.syncGridPageToActiveChannel) ext.syncGridPageToActiveChannel();
            if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
            document.title = "JTV - Live TV";
        }
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
    const tabBtns = document.querySelectorAll('.side-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (ext.validateAndCleanupCurrentEdit) ext.validateAndCleanupCurrentEdit();
    if (tabId === 'home') {
        hideMenu();
        if (state.activeChannelId) {
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
