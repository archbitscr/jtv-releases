import { state } from '../state/appState.js';
import { sanitizeRemoteUrl } from '../utils/sanitize.js';
import { getSafeLogoHtml } from '../utils/domHelpers.js';
import { stopWatchTimer } from './watchTimer.js';
import { triggerFailover, showNoSignalOverlay } from './failover.js';

let ext = {};

export function initPlayerController(dependencies) {
    ext = dependencies;
}

export function updatePlayerActiveState() {
    const playerContainer = document.getElementById('player-container');
    const hasWebview = !!playerContainer.querySelector('webview');
    if (hasWebview) {
        document.body.classList.add('player-active');
    } else {
        document.body.classList.remove('player-active');
    }
    if (ext.updateWebviewPointerEvents) ext.updateWebviewPointerEvents();
}

export function mountRemotePlayer(url) {
    const playerContainer = document.getElementById('player-container');
    const nativeApi = window.jtvAPI;
    const safeUrl = sanitizeRemoteUrl(url);
    playerContainer.innerHTML = '';

    const webview = document.createElement('webview');
    webview.id = 'player-webview';
    webview.src = safeUrl;
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.border = '0';
    webview.style.position = 'absolute';
    webview.style.top = '0';
    webview.style.left = '0';
    webview.style.zIndex = '1';
    webview.style.pointerEvents = 'auto';
    webview.setAttribute('partition', 'persist:jtv-playback');
    webview.setAttribute('nodeintegration', 'false');
    webview.setAttribute('contextisolation', 'true');
    webview.setAttribute('allowpopups', 'false');
    webview.setAttribute('preload', './guest-preload.cjs');

    webview.addEventListener('console-message', (e) => {
        nativeApi.logDiagnostic(`[Guest Webview Console] ${e.message}`);
    });

    webview.addEventListener('did-fail-load', (e) => {
        if (e.errorCode === -3) return; // ignore aborts
        nativeApi.logRenderer(`Webview load failed: ${e.errorDescription} (${e.errorCode}). Triggering instant failover.`);
        triggerFailover(0);
    });

    webview.addEventListener('ipc-message', (event) => {
        if (event.channel === 'guest-frozen') {
            nativeApi.logRenderer(`[Player Watchdog] guest-frozen signal received! Triggering failover.`);
            triggerFailover();
        } else if (event.channel === 'guest-playing') {
            if (state.failoverInProgress || state.failoverTimeoutId) {
                nativeApi.logRenderer(`[Player Watchdog] guest-playing signal received. Cancelling pending failover.`);
                if (state.failoverTimeoutId) {
                    clearTimeout(state.failoverTimeoutId);
                    state.failoverTimeoutId = null;
                }
                state.failoverInProgress = false;
                showNoSignalOverlay(false);
            }
        }
    });

    webview.addEventListener('dom-ready', () => {
        setTimeout(() => {
            if (ext.hidePlayerCurtain) ext.hidePlayerCurtain();
        }, 120);
        
        if (window.sendWatchdogConfig) window.sendWatchdogConfig();
        
        webview.insertCSS(`
            #header, #footer, .sidebar, .comments, .social-share, .breadcrumbs, .jw-preview,
            .pre-pagination, .film_list-wrap, .cat-heading, .block_area-header,
            .prev, .next, .prev-btn, .next-btn, .prev-channel, .next-channel, .prev-chan, .next-chan,
            a[href*="stream-"], a[href*="/stream-"], a[class*="prev"], a[class*="next"],
            .page-left, .page-right, .carousel-control-prev, .carousel-control-next,
            [class*="prev" i], [class*="next" i], [id*="prev" i], [id*="next" i],
            [class*="previous" i], [id*="previous" i], [class*="left-arrow" i], [class*="right-arrow" i],
            [class*="arrow-left" i], [class*="arrow-right" i], [class*="page-left" i], [class*="page-right" i],
            [class*="carousel-control" i], [class*="btn-navigation" i],
            .media-control, .media-control-layer, .media-control-left-panel, .media-control-right-panel, .media-control-center-panel,
            .media-control-button, .media-control-icon, .media-control-background, .bar-container, .bar-background, .bar-fill-1, .bar-fill-2,
            iframe[src*="jnbhi.com"], iframe[src*="google"], iframe[src*="ads"], iframe[src*="/ad"], iframe[src*=".ad"], iframe[src*="-ad"] {
                display: none !important;
            }
            #watch-iframe, #iframe-embed, .watch-embed, .player-wrapper, #player, #thatframe {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 999999 !important;
                background: #000 !important;
            }
            body {
                background: #000 !important;
                overflow: hidden !important;
            }
        `).catch(() => {});

        // Performance Fix: Wrap heavy diagnostic inspect queries in feature flag checks
        setTimeout(() => {
            const devState = window.getDeveloperState ? window.getDeveloperState() : { diagnosticsEnabled: false };
            if (!devState.diagnosticsEnabled) return;

            webview.executeJavaScript(`
                (() => {
                    const results = [];
                    const all = document.querySelectorAll('*');
                    all.forEach(el => {
                        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'HEAD' || el.tagName === 'HTML' || el.tagName === 'BODY' || el.tagName === 'IFRAME') return;
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            const style = window.getComputedStyle(el);
                            const isLeft = rect.left >= 0 && rect.left < 100;
                            const isRight = rect.right > (window.innerWidth - 100) && rect.right <= window.innerWidth;
                            if (isLeft || isRight) {
                                results.push({
                                    tag: el.tagName,
                                    id: el.id,
                                    class: el.className,
                                    html: el.outerHTML.slice(0, 300),
                                    rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
                                    style: { position: style.position, zIndex: style.zIndex, display: style.display, bg: style.backgroundColor }
                                });
                            }
                        }
                    });
                    return JSON.stringify(results, null, 2);
                })()
            `).then(res => {
                console.log("[Diagnostic Host Webview EdgeElements]:\n" + res);
            }).catch(err => {
                console.error("[Diagnostic Host Webview EdgeElements Error]:", err);
            });
        }, 15000);

        setTimeout(() => {
            const devState = window.getDeveloperState ? window.getDeveloperState() : { diagnosticsEnabled: false };
            if (!devState.diagnosticsEnabled) return;

            const results = [];
            const all = document.querySelectorAll('*');
            all.forEach(el => {
                if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'HEAD' || el.tagName === 'HTML' || el.tagName === 'BODY' || el.tagName === 'IFRAME' || el.id === 'player-webview') return;
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const style = window.getComputedStyle(el);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
                        const isLeft = rect.left >= 0 && rect.left < 100;
                        const isRight = rect.right > (window.innerWidth - 100) && rect.right <= window.innerWidth;
                        if (isLeft || isRight) {
                            results.push({
                                tag: el.tagName,
                                id: el.id,
                                class: el.className,
                                rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
                                zIndex: style.zIndex,
                                opacity: style.opacity
                            });
                        }
                    }
                }
            });
            console.log("[Diagnostic Host DOM EdgeElements]:\n" + JSON.stringify(results, null, 2));
        }, 15000);
    });

    playerContainer.appendChild(webview);
    updatePlayerActiveState();

    if (ext.ensurePlayerCurtain) ext.ensurePlayerCurtain();
    if (ext.showPlayerCurtain) ext.showPlayerCurtain();
    setTimeout(() => {
        if (ext.hidePlayerCurtain) ext.hidePlayerCurtain();
    }, 2500);
}

export async function selectChannel(channel, resetSource = true, sourceTab = null) {
    const nativeApi = window.jtvAPI;
    const playerContainer = document.getElementById('player-container');
    const sourceSwitcher = document.getElementById('source-switcher');
    const tunerChannelText = document.getElementById('tuner-channel-text');
    const tunerFavHeart = document.getElementById('tuner-fav-heart');

    // Verify trial period expiration on channel tune (Tarea 24)
    const check = await nativeApi.getNetworkDate(channel.path).catch(() => ({ expired: false }));
    if (check && check.expired) {
        playerContainer.innerHTML = '';
        state.activeChannelId = null;
        sourceSwitcher.classList.add('hidden');
        if (ext.applyWallpaper) ext.applyWallpaper(state.selectedWallpaper);
        updatePlayerActiveState();
        
        const expiredBlocker = document.getElementById('trial-expired-blocker');
        if (expiredBlocker) expiredBlocker.classList.remove('hidden');
        return;
    }

    // Reset failover state
    if (state.failoverTimeoutId) clearTimeout(state.failoverTimeoutId);
    state.failoverInProgress = false;
    showNoSignalOverlay(false);

    const wasHomeActive = state.isHomeActive;
    if (sourceTab) {
        state.zapSourceTab = sourceTab;
    } else if (wasHomeActive) {
        state.zapSourceTab = channel.favorite ? 'favorites' : 'channels';
    }

    if (ext.applyWallpaper) ext.applyWallpaper('none');
    if (ext.showPlayerCurtain) ext.showPlayerCurtain();
    stopWatchTimer();
    
    state.activeChannelId = channel.id;
    state.currentlyWatchingId = channel.id;
    state.watchStartTime = Date.now();
    state.isHomeActive = false;
    state.isVodPlaying = false;
    state.shouldRestoreTunedChannel = false;

    nativeApi.logDiagnostic(`Sintonizando canal ID: ${channel.id} ("${channel.name}") [ResetSource=${resetSource}]`);

    if (resetSource) {
        state.playerSource = "stream";
        if (ext.updateSourceSwitcherUI) ext.updateSourceSwitcherUI("stream");
    } else {
        if (ext.updateSourceSwitcherUI) ext.updateSourceSwitcherUI(state.playerSource);
    }

    const epg = ext.getActiveEpg ? ext.getActiveEpg(channel.id) : null;
    const epgText = epg ? epg.event : "Live Stream";
    document.title = `${channel.name} - ${channel.id}`;

    // Update Tuned Info HUD
    tunerChannelText.textContent = `${channel.name} - ${channel.id}`;
    const tunerEpgText = document.getElementById('tuner-epg-text');
    if (tunerEpgText) {
        tunerEpgText.textContent = epgText;
    }

    const hudLogoContainer = document.getElementById('hud-logo-container');
    if (hudLogoContainer) {
        hudLogoContainer.innerHTML = getSafeLogoHtml(channel.name, channel.logo);
    }

    // Update HUD channel filters (Tarea 28)
    if (ext.updateHudChannelFilters) ext.updateHudChannelFilters(channel);

    const hudFavBtn = document.getElementById('hud-fav-btn');
    if (hudFavBtn) {
        hudFavBtn.classList.toggle('active', channel.favorite || false);
    }

    if (tunerFavHeart) {
        if (channel.favorite) {
            tunerFavHeart.style.fill = '#ff4b4b';
            tunerFavHeart.style.color = '#ff4b4b';
        } else {
            tunerFavHeart.style.fill = 'transparent';
            tunerFavHeart.style.color = 'currentColor';
        }
    }

    const tunerMuteIcon = document.getElementById('tuner-mute-icon');
    if (tunerMuteIcon) {
        nativeApi.isAudioMuted().then(isMuted => {
            tunerMuteIcon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // Force show HUD elements immediately
    sourceSwitcher.classList.remove('hidden');
    
    // Hide landing overlay and home screens if showing on top of a channel
    document.getElementById('home-dashboard').classList.add('hidden');
    document.getElementById('app-home-screen').classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
    state.isHomeActive = false;

    if (ext.renderAll) ext.renderAll();
    if (ext.syncMenuScroll) ext.syncMenuScroll();
    if (ext.startInactivityTimers) ext.startInactivityTimers();

    if (wasHomeActive) {
        if (ext.switchTab) ext.switchTab(state.zapSourceTab);
    }

    // Use current source folder for path
    const playerPath = `${state.globalDomain}${state.playerSource}/stream-${channel.id}.php`;
    mountRemotePlayer(playerPath);
    if (ext.updateTriggersVisibility) ext.updateTriggersVisibility();

    // Update the autotune indicators in the Zapping HUD
    updateHudAutotuneIndicators(channel.path);

    if (ext.saveAppState) ext.saveAppState();
}

export async function updateHudAutotuneIndicators(path) {
    const audioIndicator = document.getElementById('hud-indicator-audio');
    const videoIndicator = document.getElementById('hud-indicator-video');
    if (!audioIndicator || !videoIndicator) return;

    // Reset to inactive first
    audioIndicator.style.color = 'rgba(255,255,255,0.25)';
    audioIndicator.classList.remove('active');
    audioIndicator.classList.add('inactive');
    audioIndicator.setAttribute('title', 'Autotune Audio: Inactivo');

    videoIndicator.style.color = 'rgba(255,255,255,0.25)';
    videoIndicator.classList.remove('active');
    videoIndicator.classList.add('inactive');
    videoIndicator.setAttribute('title', 'Autotune Video: Inactivo');

    if (!path) return;

    try {
        const fullUrl = path.startsWith('http') ? path : `${state.globalDomain || 'https://dlhd.pk/'}${path}`;
        const res = await window.jtvAPI.checkChannelStatus(fullUrl);
        
        if (res && res.online) {
            // Audio
            if (res.audio !== false) {
                audioIndicator.style.color = 'var(--accent)';
                audioIndicator.classList.remove('inactive');
                audioIndicator.classList.add('active');
                audioIndicator.setAttribute('title', 'Autotune Audio: Activo');
            }
            // Video
            if (res.video !== false) {
                videoIndicator.style.color = 'var(--accent)';
                videoIndicator.classList.remove('inactive');
                videoIndicator.classList.add('active');
                videoIndicator.setAttribute('title', 'Autotune Video: Activo');
            }
        }
    } catch (e) {
        console.error('[Autotune HUD] Error checking signal status:', e);
    }
}

export function zapChannel(direction) {
    if (state.channels.length === 0) return;

    // Determine active list based on explicit zapping source tab
    const isFavsTabActive = state.zapSourceTab === 'favorites';
    const list = isFavsTabActive
        ? (ext.getFilteredChannelsList ? ext.getFilteredChannelsList('favorites') : [])
        : (ext.getFilteredChannelsList ? ext.getFilteredChannelsList('channels') : []);
    if (list.length === 0) return;

    let currentIndex = list.findIndex(c => String(c.id) === String(state.activeChannelId));
    if (currentIndex === -1) {
        currentIndex = 0;
    }

    let nextIndex;
    if (direction === 'up') {
        nextIndex = (currentIndex - 1 + list.length) % list.length;
    } else {
        nextIndex = (currentIndex + 1) % list.length;
    }

    const nextChannel = list[nextIndex];
    if (nextChannel) {
        selectChannel(nextChannel, true);
    }
}

export function playVod(item) {
    const tunerChannelText = document.getElementById('tuner-channel-text');
    const tunerFavHeart = document.getElementById('tuner-fav-heart');

    if (ext.applyWallpaper) ext.applyWallpaper('none');
    if (ext.showPlayerCurtain) ext.showPlayerCurtain();
    state.activeChannelId = item.id;
    state.currentlyWatchingId = item.id;
    state.watchStartTime = Date.now();
    state.isVodPlaying = true;

    // Show source switcher and channel tuner info HUD
    tunerChannelText.innerText = item.title;
    if (tunerFavHeart) tunerFavHeart.classList.add('hidden');
    
    mountRemotePlayer(item.url);
    if (ext.updateTriggersVisibility) ext.updateTriggersVisibility();
}
