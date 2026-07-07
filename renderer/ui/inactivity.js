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
    timeouts.clear('land');
    timeouts.clear('cursor');
    timeouts.clear('settings');
    timeouts.clear('zappingHUD');
    timeouts.clear('topNav');
}

export function startInactivityTimers() {
    if (!timeouts) return;
    clearInactivityTimers();
    document.body.classList.remove('hide-cursor');

    const mainMenu = document.getElementById('side-menu');
    const topNavMenu = document.getElementById('tnav-menu');
    const sourceSwitcher = document.getElementById('pbar');
    const settingsScreen = document.getElementById('settings-screen');

    const hasChannel = !!(state.activeChannelId && !state.isVodPlaying);
    const settingsVisible = settingsScreen && !settingsScreen.classList.contains('hidden');

    const cfg = window.timeoutsConfig || {};

    // 1. Settings inactivity timer (only while a stream is active)
    if (settingsVisible && settingsScreen && hasChannel && cfg.settingsActiveEnabled) {
        timeouts.set('settings', () => {
            if (!settingsScreen.matches(':hover')) {
                if (ext.showModule) ext.showModule(state.previousModule || 'home');
            }
        }, cfg.settingsActive);
    }

    // 2. Overlays / Menus (Sidebar menu, details modal — only while a stream is active)
    if (hasChannel && cfg.menuActiveEnabled && mainMenu) {
        const menuDelay = cfg.menuActive;
        timeouts.set('menu', () => {
            if (!mainMenu.matches(':hover')) {
                if (ext.hideMenu) ext.hideMenu();
            }
            // detail page persists on inactivity — user is reading
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

    // 4. Source Switcher
    if (sourceSwitcher && !sourceSwitcher.classList.contains('hidden') && !state.hudPinned) {
        if (cfg.zappingHUDEnabled) {
            timeouts.set('zappingHUD', () => {
                if (!sourceSwitcher.matches(':hover')) {
                    sourceSwitcher.classList.add('hidden');
                }
            }, cfg.zappingHUD);
        }
    }

    // 5. Hide Cursor (only while a stream is active)
    if (hasChannel && cfg.cursorActiveEnabled) {
        const rawCursorDelay = cfg.cursorActive;
        const zappingDelay = (cfg.zappingHUDEnabled && sourceSwitcher && !sourceSwitcher.classList.contains('hidden')) ? (cfg.zappingHUD || 0) : 0;
        const cursorDelay = Math.max(rawCursorDelay, zappingDelay + 100);
        timeouts.set('cursor', () => {
            if (!state.isHomeActive && mainMenu && mainMenu.classList.contains('hidden') && (!sourceSwitcher || sourceSwitcher.classList.contains('hidden'))) {
                document.body.classList.add('hide-cursor');
            }
        }, cursorDelay);
    }

    // 6. Home-dashboard inactivity timeout when channel is playing
    const homeDashboard = document.getElementById('vod-library');
    if (homeDashboard && !homeDashboard.classList.contains('hidden') && hasChannel) {
        const homeDelay = cfg.settingsActive || 5000;
        timeouts.set('home', () => {
            if (!homeDashboard.matches(':hover') && (!settingsScreen || !settingsScreen.matches(':hover'))) {
                if (ext.showModule) ext.showModule('live');
            }
        }, homeDelay);
    }

    // 7. Live TV landing auto-hide when channel is playing
    if (homeDashboard && !homeDashboard.classList.contains('hidden') && hasChannel) {
        if (cfg.landAutoHideEnabled) {
            timeouts.set('land', () => {
                if (!homeDashboard.matches(':hover')) {
                    homeDashboard.classList.add('hidden');
                }
            }, cfg.landAutoHide);
        }
    }
}

// Resets only the cursor hide timer — safe to call on mousemove without disturbing panel timers.
export function startCursorTimer() {
    if (!timeouts) return;
    timeouts.clear('cursor');
    const mainMenu = document.getElementById('side-menu');
    const sourceSwitcher = document.getElementById('pbar');
    const hasChannel = !!(state.activeChannelId && !state.isVodPlaying);
    const cfg = window.timeoutsConfig || {};
    if (!hasChannel || !cfg.cursorActiveEnabled) return;
    const rawCursorDelay = cfg.cursorActive;
    const zappingDelay = (cfg.zappingHUDEnabled && sourceSwitcher && !sourceSwitcher.classList.contains('hidden')) ? (cfg.zappingHUD || 0) : 0;
    const cursorDelay = Math.max(rawCursorDelay, zappingDelay + 100);
    timeouts.set('cursor', () => {
        if (!state.isHomeActive && mainMenu && mainMenu.classList.contains('hidden') && (!sourceSwitcher || sourceSwitcher.classList.contains('hidden'))) {
            document.body.classList.add('hide-cursor');
        }
    }, cursorDelay);
}
