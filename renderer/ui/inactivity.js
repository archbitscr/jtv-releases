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

// Called by document activity events (mousedown, click, scroll, etc.)
// Only resets activity-level timers; does NOT touch panel timers (menu, topNav, zappingHUD)
// so that background events don't prevent panels from auto-hiding.
export function startInactivityTimers() {
    if (!timeouts) return;
    timeouts.clear('cursor');
    timeouts.clear('settings');
    timeouts.clear('home');
    timeouts.clear('land');
    document.body.classList.remove('hide-cursor');

    const mainMenu = document.getElementById('side-menu');
    const sourceSwitcher = document.getElementById('pbar');
    const settingsScreen = document.getElementById('settings-screen');
    const homeDashboard = document.getElementById('vod-library');

    const hasChannel = !!state.activeChannelId;
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

    // 2. Hide Cursor (only while a stream is active)
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

    // 3. Home-dashboard inactivity timeout when channel is playing
    if (homeDashboard && !homeDashboard.classList.contains('hidden') && hasChannel) {
        const homeDelay = cfg.settingsActive || 5000;
        timeouts.set('home', () => {
            if (!homeDashboard.matches(':hover') && (!settingsScreen || !settingsScreen.matches(':hover'))) {
                if (ext.showModule) ext.showModule('live');
            }
        }, homeDelay);
    }

    // 4. Live TV landing auto-hide when channel is playing
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

// Called by trigger zones (on show) and panel mouseleave handlers.
// Resets panel-specific hide timers independently of document activity.
export function startPanelTimers() {
    if (!timeouts) return;

    const mainMenu = document.getElementById('side-menu');
    const topNavMenu = document.getElementById('tnav-menu');
    const sourceSwitcher = document.getElementById('pbar');

    const hasChannel = !!state.activeChannelId;
    const cfg = window.timeoutsConfig || {};

    // Sidebar menu
    if (hasChannel && cfg.menuActiveEnabled && mainMenu && !mainMenu.classList.contains('hidden')) {
        timeouts.set('menu', () => {
            if (!mainMenu.matches(':hover')) {
                if (ext.hideMenu) ext.hideMenu();
            }
        }, cfg.menuActive);
    }

    // Top Nav menu
    if (topNavMenu && !topNavMenu.classList.contains('hidden') && cfg.topNavEnabled) {
        timeouts.set('topNav', () => {
            if (!topNavMenu.matches(':hover')) {
                topNavMenu.classList.add('hidden');
            }
        }, cfg.topNav);
    }

    // Source Switcher (pbar) — keep visible while failover is working
    if (sourceSwitcher && !state.hudPinned) {
        if (state.failoverInProgress) {
            sourceSwitcher.classList.remove('hidden');
        } else if (!sourceSwitcher.classList.contains('hidden') && cfg.zappingHUDEnabled) {
            timeouts.set('zappingHUD', () => {
                if (!sourceSwitcher.matches(':hover')) {
                    sourceSwitcher.classList.add('hidden');
                }
            }, cfg.zappingHUD);
        }
    }
}

// Resets only the cursor hide timer — safe to call on mousemove without disturbing panel timers.
export function startCursorTimer() {
    if (!timeouts) return;
    timeouts.clear('cursor');
    const mainMenu = document.getElementById('side-menu');
    const sourceSwitcher = document.getElementById('pbar');
    const hasChannel = !!state.activeChannelId;
    const cfg = window.timeoutsConfig || {};
    if (!hasChannel || !cfg.cursorActiveEnabled) return;
    const rawCursorDelay = cfg.cursorActive;
    const zappingDelay = (cfg.zappingHUDEnabled && sourceSwitcher && !sourceSwitcher.classList.contains('hidden')) ? (cfg.zappingHUD || 0) : 0;
    const cursorDelay = Math.max(rawCursorDelay, zappingDelay + 100);
    timeouts.set('cursor', () => {
        const menuHidden = !mainMenu || mainMenu.classList.contains('hidden');
        const pbarHidden = !sourceSwitcher || sourceSwitcher.classList.contains('hidden');
        if (!state.isHomeActive && menuHidden && pbarHidden) {
            document.body.classList.add('hide-cursor');
        }
    }, cursorDelay);
}
