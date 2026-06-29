import { state } from '../state/appState.js';

let timeouts = null;
let ext = {};

export function initInactivity(timeoutsManager, dependencies) {
    timeouts = timeoutsManager;
    ext = dependencies;
}

export function clearInactivityTimers() {
    if (!timeouts) return;
    timeouts.clear('menu');
    timeouts.clear('home');
    timeouts.clear('cursor');
    timeouts.clear('settings');
    timeouts.clear('zappingHUD');
    timeouts.clear('topNav');
}

export function startInactivityTimers() {
    if (!timeouts) return;
    clearInactivityTimers();
    document.body.classList.remove('hide-cursor');

    const mainMenu = document.getElementById('main-menu');
    const topNavMenu = document.getElementById('tnav-menu');
    const sourceSwitcher = document.getElementById('pbar');
    const settingsScreen = document.getElementById('settings-screen');

    const hasChannel = !!(state.activeChannelId && !state.isVodPlaying);
    const settingsVisible = settingsScreen && !settingsScreen.classList.contains('hidden');

    const cfg = window.timeoutsConfig || {};

    // 1. Settings inactivity timer
    if (settingsVisible && settingsScreen) {
        const settingsEnabled = hasChannel ? cfg.settingsActiveEnabled : cfg.settingsInactiveEnabled;
        if (settingsEnabled) {
            const settingsDelay = hasChannel ? cfg.settingsActive : cfg.settingsInactive;
            timeouts.set('settings', () => {
                if (!settingsScreen.matches(':hover')) {
                    if (ext.showModule) ext.showModule(state.previousModule || 'home');
                }
            }, settingsDelay);
        }
    }

    // 2. Overlays / Menus (Sidebar menu, details modal)
    const menuEnabled = hasChannel ? cfg.menuActiveEnabled : cfg.menuInactiveEnabled;
    if (menuEnabled && mainMenu) {
        const menuDelay = hasChannel ? cfg.menuActive : cfg.menuInactive;
        timeouts.set('menu', () => {
            if (!mainMenu.matches(':hover')) {
                if (ext.hideMenu) ext.hideMenu();
            }
            const detailsModal = document.getElementById('details-modal');
            if (detailsModal && !detailsModal.classList.contains('hidden') && !detailsModal.matches(':hover')) {
                detailsModal.classList.add('hidden');
            }
        }, menuDelay);
    }

    // 3. Top Nav Menu
    if (topNavMenu && !topNavMenu.classList.contains('hidden')) {
        if (cfg.topNavEnabled) {
            timeouts.set('topNav', () => {
                if (!topNavMenu.matches(':hover')) {
                    topNavMenu.classList.add('hidden');
                }
            }, cfg.topNav);
        }
    }

    // 4. Zapping HUD / Source Switcher
    if (sourceSwitcher && !sourceSwitcher.classList.contains('hidden') && !state.hudPinned) {
        if (cfg.zappingHUDEnabled) {
            timeouts.set('zappingHUD', () => {
                if (!sourceSwitcher.matches(':hover')) {
                    sourceSwitcher.classList.add('hidden');
                }
            }, cfg.zappingHUD);
        }
    }

    // 5. Hide Cursor
    const cursorEnabled = hasChannel ? cfg.cursorActiveEnabled : cfg.cursorInactiveEnabled;
    if (cursorEnabled) {
        const rawCursorDelay = hasChannel ? cfg.cursorActive : cfg.cursorInactive;
        const zappingDelay = (cfg.zappingHUDEnabled && sourceSwitcher && !sourceSwitcher.classList.contains('hidden')) ? (cfg.zappingHUD || 0) : 0;
        const cursorDelay = Math.max(rawCursorDelay, zappingDelay + 100);
        timeouts.set('cursor', () => {
            if (!state.isHomeActive && mainMenu && mainMenu.classList.contains('hidden') && (!sourceSwitcher || sourceSwitcher.classList.contains('hidden'))) {
                document.body.classList.add('hide-cursor');
            }
        }, cursorDelay);
    }

    // 6. Home-dashboard inactivity timeout when channel is playing
    const homeDashboard = document.getElementById('home-dashboard');
    if (homeDashboard && !homeDashboard.classList.contains('hidden') && hasChannel) {
        const homeDelay = cfg.settingsActive || 5000;
        timeouts.set('home', () => {
            if (!homeDashboard.matches(':hover') && (!settingsScreen || !settingsScreen.matches(':hover'))) {
                if (ext.showModule) ext.showModule('live');
            }
        }, homeDelay);
    }
}
