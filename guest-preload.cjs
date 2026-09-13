const { ipcRenderer } = require('electron');
const console = globalThis.console;

let watchdogTimeoutLimit = 6000;
let watchdogTimeoutEnabled = true;

console.log('[Guest Preload] Preload script loaded in frame: ' + window.location.href);

window.addEventListener('unhandledrejection', (event) => {
    console.error('[Guest Preload] Unhandled Rejection:', event.reason?.stack || event.reason);
});
window.addEventListener('error', (event) => {
    console.error('[Guest Preload] Uncaught Error:', event.error?.stack || event.message);
});

const IPC = {
    ESCAPE_PRESSED: 'escape-pressed',
    GET_CURRENT_VOLUME: 'get-current-volume',
    GET_AUDIO_LEVELER: 'get-audio-leveler',
    SET_VOLUME_LEVEL: 'set-volume-level',
    SET_AUDIO_LEVELER: 'set-audio-leveler'
};

const nuclearStyle = `
    header, footer, aside, nav, .header, .footer, .sidebar, .watch__sidebar,
    .watch__info, .social-share, .floating-btn, .watch__playerActions,
    .watch__playerOverlay, #chat-container, .chatango, #am-container,
    .watch__title, .watch__meta, .watch__tabs, .watch__comments,
    .ad-banner, .adsbygoogle, [id*="google_ads"], [class*="ads-"],
    .menu-container, .top-bar, .bottom-bar,
    .prev, .next, .prev-btn, .next-btn, .prev-channel, .next-channel, .prev-chan, .next-chan,
    a[href*="stream-"], a[href*="/stream-"], a[class*="prev"], a[class*="next"],
    .page-left, .page-right, .carousel-control-prev, .carousel-control-next,
    [class*="prev" i], [class*="next" i], [id*="prev" i], [id*="next" i],
    [class*="previous" i], [id*="previous" i], [class*="left-arrow" i], [class*="right-arrow" i],
    [class*="arrow-left" i], [class*="arrow-right" i], [class*="page-left" i], [class*="page-right" i],
    [class*="carousel-control" i], [class*="btn-navigation" i],
    .media-control, .media-control-layer, .media-control-left-panel, .media-control-right-panel, .media-control-center-panel,
    .media-control-button, .media-control-icon, .media-control-background, .bar-container, .bar-background, .bar-fill-1, .bar-fill-2,
    #first-click-ads-layer, .delayed-popup-ads-layer,
    div[id^="ys"], div#advert1, div[class*="ad-overlay"], div[class*="pop-overlay"], div[class*="ads-overlay"], div[class*="advert-overlay"],
    div[style*="z-index: 2147483647"], div[style*="z-index:2147483647"],
    div[style*="z-index: 100000000"], div[style*="z-index:100000000"],
    div[style*="z-index: 300000"], div[style*="z-index:300000"],
    div[style*="z-index: 99999"], div[style*="z-index:99999"],
    div[style*="z-index: 10000"][style*="position: fixed"],
    div[style*="z-index:10000"][style*="position:fixed"],
    div[style*="z-index: 10000"][style*="position: absolute"],
    div[style*="z-index:10000"][style*="position:absolute"],
    .jw-ads, .jw-ad-ui, .jw-ad-container, .jw-ad-plugins, .jw-plugin-ads, .jw-ad-click, .jw-ad-overlay, .jw-preview,
    iframe#close, iframe[src*="ad.html"], iframe[src*="adbanner"], iframe[src*="rs4k"],
    #rs4k-adbanner, #adex,
    a[href*="/ad/"], a[href*="visit.php"],
    iframe[src*="ads"], iframe[src*="/ad"], iframe[src*=".ad"], iframe[src*="-ad"], iframe[src*="track"], iframe[src*="pop"], iframe[src*="histats"], iframe[src*="analytics"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }

    body, html {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: black !important;
        height: 100vh !important;
        width: 100vw !important;
    }

    #player, .player-container, .watch__playerFrame, #playerFrame, #thatframe,
    #main-player-wrapper {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 99999999 !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
        visibility: visible !important;
        background: black !important;
    }

    /* Prevent container collapsing for absolute/relative structures inside player */
    #player div, .player-container div, #main-player-wrapper div, .container {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        overflow: visible !important;
        background: transparent !important;
    }

    /* Force video element to escape collapsed layout and occupy full viewport */
    video, .jw-video {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 99999999 !important;
        object-fit: contain !important;
        background: transparent !important;
        display: block !important;
        visibility: visible !important;
    }

    .jwplayer, .jw-wrapper, .jw-media {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    }
`;

function injectStyle() {
    if (window.location.protocol === 'file:') return; // Prevent injecting in local file UI
    if (!document.head) return;
    let style = document.getElementById('jtv-nuclear-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'jtv-nuclear-style';
        style.innerHTML = nuclearStyle;
        document.head.appendChild(style);
        console.log('[Guest Preload] CSS Style injected successfully in: ' + window.location.href);
    } else if (style.innerHTML !== nuclearStyle) {
        style.innerHTML = nuclearStyle;
        console.log('[Guest Preload] CSS Style updated successfully in: ' + window.location.href);
    }
}

function autoClickOK() {
    const buttons = document.querySelectorAll('button, a, div, span');
    for (const b of buttons) {
        const text = (b.innerText || '').trim().toLowerCase();
        const className = typeof b.className === 'string' ? b.className.toLowerCase() : '';
        const isSkip = text === 'skip ad' || text === 'skip' || text === 'saltar anuncio' ||
                       className.includes('jw-skip') || className.includes('skip-ad') || className.includes('videoaduiskippbutton');
        if (isSkip) {
            try { b.click(); } catch (e) {}
        }
    }
}

function cleanupHighZIndex() {
    try {
        const allElements = document.querySelectorAll('body *');
        allElements.forEach(el => {
            const zIndex = window.getComputedStyle(el).zIndex;
            if (zIndex && !isNaN(zIndex) && parseInt(zIndex, 10) > 1000) {
                const className = typeof el.className === 'string' ? el.className.toLowerCase() : '';
                const id = typeof el.id === 'string' ? el.id.toLowerCase() : '';
                const isPlayerOrControl =
                    el.tagName === 'VIDEO' ||
                    id.includes('player') ||
                    id.includes('thatframe') ||
                    className.includes('player') ||
                    className.includes('media-control') ||
                    className.includes('clappr') ||
                    el.querySelector('video') !== null;

                if (!isPlayerOrControl) {
                    el.remove();
                }
            }
        });
    } catch (e) {}
}

function disableAdOverlays() {
    try {
        const allElements = document.querySelectorAll('body *');
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const className = typeof el.className === 'string' ? el.className.toLowerCase() : '';
            const id = typeof el.id === 'string' ? el.id.toLowerCase() : '';

            const isPlayerOrWrapper =
                el.tagName === 'VIDEO' ||
                el.tagName === 'IFRAME' ||
                el.querySelector('video') !== null ||
                el.closest('video') !== null ||
                el.closest('.jwplayer') !== null ||
                el.closest('#player') !== null ||
                el.closest('.player-container') !== null ||
                el.closest('#main-player-wrapper') !== null ||
                id.includes('player') ||
                className.includes('player') ||
                id.includes('jw') ||
                className.includes('jw') ||
                id === 'thatframe' ||
                id === 'main-player-wrapper' ||
                className.includes('clappr') ||
                id.includes('clappr') ||
                className.includes('control');

            if ((style.position === 'absolute' || style.position === 'fixed') && style.pointerEvents !== 'none') {
                const rect = el.getBoundingClientRect();
                const isLarge = rect.width > 150 && rect.height > 150;
                if (!isLarge) return;

                if (!isPlayerOrWrapper) {
                    el.style.pointerEvents = 'none';
                    el.style.display = 'none';
                    el.style.opacity = '0';
                }
            } else if (el.style.display === 'none') {
                // If it was previously hidden but now holds or is part of a player/video, restore it!
                const isSafePlayerEl =
                    el.tagName === 'VIDEO' ||
                    el.querySelector('video') !== null ||
                    el.closest('.jwplayer') !== null ||
                    className.includes('jw-wrapper') ||
                    className.includes('jw-media');
                if (isSafePlayerEl && !className.includes('ad') && !id.includes('ad')) {
                    el.style.display = '';
                    el.style.opacity = '';
                    el.style.pointerEvents = '';
                }
            }
        });
    } catch (e) {}
}

function nukeAdWidgetsDevToolsStyle() {
    try {
        const adKeywords = [
            'harem squad', 'recruit, flirt', 'flirt and dominate', 'build your harem',
            'harem', 'recruit', 'dominate', 'mature dating', 'meet singles', 'horny',
            'cam girl', 'fuck now', 'dating site', 'sex game', 'casino', 'betting',
            'free spins', 'register and get', 'bonus code', 'play now', '18+'
        ];

        // 1. Text/Keyword-based target removal
        const all = document.querySelectorAll('div, a, section, aside, span, p, iframe, img');
        all.forEach(el => {
            if (!el || !el.parentElement) return;
            if (el.tagName === 'VIDEO' || el.tagName === 'BODY' || el.tagName === 'HTML') return;
            if (el.closest('.jw-media') || el.closest('video')) return;
            if (el.id === 'player' || el.classList.contains('player-container')) return;

            const text = (el.innerText || '').toLowerCase();
            const alt = (el.getAttribute('alt') || '').toLowerCase();
            const title = (el.getAttribute('title') || '').toLowerCase();
            const href = (el.getAttribute('href') || '').toLowerCase();
            const src = (el.getAttribute('src') || '').toLowerCase();

            const isAdMatch = adKeywords.some(kw =>
                text.includes(kw) || alt.includes(kw) || title.includes(kw) || href.includes(kw) || src.includes(kw)
            );

            if (isAdMatch) {
                let topWidget = el;
                while (topWidget.parentElement &&
                       topWidget.parentElement !== document.body &&
                       topWidget.parentElement.id !== 'player' &&
                       !topWidget.parentElement.classList.contains('jw-media')) {
                    const pStyle = window.getComputedStyle(topWidget.parentElement);
                    if (pStyle.position === 'fixed' || pStyle.position === 'absolute') {
                        topWidget = topWidget.parentElement;
                    } else {
                        break;
                    }
                }
                console.log('[DevTools Ad Nuker] Nuking ad keyword widget:', topWidget);
                try {
                    topWidget.remove();
                } catch(e) {
                    topWidget.style.setProperty('display', 'none', 'important');
                    topWidget.style.setProperty('visibility', 'hidden', 'important');
                    topWidget.style.setProperty('pointer-events', 'none', 'important');
                }
            }
        });

        // 2. Corner floating overlays (top-right ad pills/cards)
        document.querySelectorAll('div, a, section, aside').forEach(el => {
            if (!el || !el.parentElement) return;
            if (el.tagName === 'VIDEO' || el.id === 'player' || el.classList.contains('player-container')) return;
            if (el.closest('.jw-media') || el.closest('video')) return;

            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
                const r = el.getBoundingClientRect();
                const isTopRight = r.right > (window.innerWidth - 380) && r.top < 220 && r.width > 40 && r.height > 20 && r.width < 500 && r.height < 400;
                if (isTopRight) {
                    const isPlayerControl = el.closest('.jw-controls') || el.closest('.media-control') || el.closest('.jtv-ui');
                    if (!isPlayerControl) {
                        const hasAdContents = el.querySelector('img, a, iframe, svg') !== null || el.tagName === 'A' || el.tagName === 'IFRAME';
                        if (hasAdContents) {
                            console.log('[DevTools Ad Nuker] Nuking top-right floating widget:', el);
                            try { el.remove(); } catch(e) { el.style.setProperty('display', 'none', 'important'); }
                        }
                    }
                }
            }
        });

        // 3. Close buttons: remove the enclosing ad container instead of clicking (clicking triggers redirect traps)
        document.querySelectorAll('div, button, span, svg, a').forEach(el => {
            if (!el || !el.parentElement) return;
            const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
            const title = (el.getAttribute('title') || '').toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            const text = (el.innerText || '').trim().toLowerCase();

            const isClose = (cls.includes('close') || cls.includes('dismiss') || title.includes('close') || aria.includes('close') || text === '×' || text === '✕') &&
                            !el.closest('#player-controls') && !el.closest('.jtv-ui') && !el.closest('.jw-controls');
            if (isClose) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.top < 300) {
                    const topAd = el.closest('div[style*="fixed"], div[style*="absolute"], section, aside') || el.parentElement;
                    if (topAd && topAd.id !== 'player' && !topAd.classList.contains('jw-media')) {
                        console.log('[DevTools Ad Nuker] Removing ad container via close button detection:', topAd);
                        try { topAd.remove(); } catch(e) { topAd.style.display = 'none'; }
                    }
                }
            }
        });
    } catch(e) {}
}

function triggerPlayerHover() {
    try {
        const selectors = ['.player-container', '#player', 'video', '.media-control', 'body'];
        const clientX = Math.floor(window.innerWidth / 2);
        const clientY = Math.floor(window.innerHeight / 2);
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window, clientX, clientY }));
                el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window, clientX, clientY }));
            });
        });
    } catch (e) {}
}

function tryGlobalPlayerUnmute() {
    try {
        // Auto-click known unmute buttons (e.g. Forgemindly, Clappr overlays)
        const unmuteBtn = document.getElementById('UnMutePlayer');
        if (unmuteBtn && unmuteBtn.style.display !== 'none') {
            try { unmuteBtn.click(); } catch(e) {}
            if (typeof window.WSUnmute === 'function') {
                try { window.WSUnmute(); } catch(e) {}
            }
        }

        // Disable and bypass first-click ad layers
        const adLayer = document.getElementById('first-click-ads-layer');
        if (adLayer) {
            adLayer.classList.add('is-disabled');
            adLayer.style.display = 'none';
            adLayer.style.pointerEvents = 'none';
        }

        const keys = Object.keys(window);
        for (const k of keys) {
            if (k.toLowerCase().includes('player') || k.toLowerCase().includes('clappr') || k.toLowerCase().includes('hls')) {
                const obj = window[k];
                if (!obj) continue;
                if (typeof obj.unmute === 'function') obj.unmute();
                if (typeof obj.setVolume === 'function') obj.setVolume(100);
                if (typeof obj.volume === 'function') obj.volume(100);
                if (typeof obj.play === 'function' && typeof obj.isPlaying === 'function' && !obj.isPlaying()) {
                    try { obj.play(); } catch(e) {}
                }
            }
        }

        // Clappr / JWPlayer unmute if initialized
        if (typeof window.jwplayer === 'function') {
            try {
                const jw = window.jwplayer();
                if (jw && typeof jw.setMute === 'function' && jw.getMute()) jw.setMute(false);
                if (jw && typeof jw.setVolume === 'function' && jw.getVolume() < 50) jw.setVolume(100);
            } catch(e) {}
        }

        // Ensure direct video elements start playing and unmute
        document.querySelectorAll('video').forEach(v => {
            if (v.paused) {
                v.play().catch(() => {
                    v.muted = true;
                    v.play().catch(() => {});
                });
            }
            if (v.currentTime > 0) {
                if (v.muted) v.muted = false;
                if (v.volume < 0.5) v.volume = 1.0;
            }
        });
    } catch (e) {}
}

let audioCtx = null;
const sourceMap = new WeakMap();
let audioLevelerEnabled = false;
let currentVolumeLevel = 10;
let hostIsMuted = false;

function setupAudioLeveler(video, enabled) {
    if (!video) return;

    let nodes = sourceMap.get(video);
    if (!nodes && enabled) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        try {
            const source = audioCtx.createMediaElementSource(video);
            const compressor = audioCtx.createDynamicsCompressor();
            const gain = audioCtx.createGain();
            source.connect(compressor);
            compressor.connect(gain);
            gain.connect(audioCtx.destination);
            nodes = { source, compressor, gain };
            sourceMap.set(video, nodes);
        } catch (e) {
            return;
        }
    }

    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    if (!nodes) return;

    const targetGain = currentVolumeLevel / 10;
    if (enabled) {
        nodes.compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
        nodes.compressor.knee.setValueAtTime(30, audioCtx.currentTime);
        nodes.compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
        nodes.compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
        nodes.compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
        nodes.gain.gain.setValueAtTime(targetGain * 2.0, audioCtx.currentTime);
    } else {
        nodes.compressor.threshold.setValueAtTime(0, audioCtx.currentTime);
        nodes.compressor.ratio.setValueAtTime(1, audioCtx.currentTime);
        nodes.gain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
    }
}

function syncVideoAudioState(video) {
    if (!video) return;
    video._jtvSynced = true;
    setupAudioLeveler(video, audioLevelerEnabled);

    const targetVol = currentVolumeLevel / 10;
    const nodes = sourceMap.get(video);
    if (nodes) {
        if (video.volume !== 1.0) video.volume = 1.0;
    } else if (video.volume !== targetVol) {
        video.volume = targetVol;
    }

    const targetMuted = currentVolumeLevel === 0 || hostIsMuted;
    if (video.muted !== targetMuted) {
        video.muted = targetMuted;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    injectStyle();
    killCastPageAds();
    cleanupHighZIndex();
    disableAdOverlays();
    autoClickOK();
    killOrphanFrame();

    const observer = new MutationObserver(() => {
        try {
            observer.disconnect();
            injectStyle();
            killCastPageAds();
            cleanupHighZIndex();
            disableAdOverlays();
            autoClickOK();
        } catch (e) {
            console.error('[Guest Preload] MutationObserver error:', e);
        } finally {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
});

window.addEventListener('load', () => {
    injectStyle();
    killCastPageAds();
    cleanupHighZIndex();
    disableAdOverlays();
    autoClickOK();
    reportAdCandidates();
});

// Volume/mute hotkeys that are safe to intercept (don't conflict with player seek controls).
// Arrow keys are intentionally excluded — they control player seeking.
const GUEST_VOLUME_KEYS = new Set(['+', '=', '-', 'm', 'M', '*', 'Add', 'Subtract', 'Multiply']);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ipcRenderer.send(IPC.ESCAPE_PRESSED);
        return;
    }
    if (GUEST_VOLUME_KEYS.has(e.key)) {
        e.preventDefault();
        ipcRenderer.send('guest-hotkey', { key: e.key, repeat: e.repeat });
    }
}, true);

function inspectVolumeButtons() {
    if (window.self === window.top) return; // Only run inside player iframes
    try {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            const id = el.id || '';
            const className = typeof el.className === 'string' ? el.className : '';
            const title = el.getAttribute('title') || '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            
            const matchesVolume = 
                id.toLowerCase().includes('volume') || id.toLowerCase().includes('mute') || id.toLowerCase().includes('audio') ||
                className.toLowerCase().includes('volume') || className.toLowerCase().includes('mute') || className.toLowerCase().includes('audio') ||
                className.toLowerCase().includes('speaker') || className.toLowerCase().includes('sound') ||
                title.toLowerCase().includes('volume') || title.toLowerCase().includes('mute') || title.toLowerCase().includes('sound') || title.toLowerCase().includes('audio') ||
                ariaLabel.toLowerCase().includes('volume') || ariaLabel.toLowerCase().includes('mute') || ariaLabel.toLowerCase().includes('sound') || ariaLabel.toLowerCase().includes('audio');
            
            if (matchesVolume && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && el.tagName !== 'HEAD' && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
                const rect = el.getBoundingClientRect();
                const isButton = 
                    className.toLowerCase().includes('icon') || 
                    className.toLowerCase().includes('btn') || 
                    className.toLowerCase().includes('button') ||
                    el.tagName === 'BUTTON' ||
                    (!className.toLowerCase().includes('bar') && !className.toLowerCase().includes('slider') && !className.toLowerCase().includes('container') && !className.toLowerCase().includes('wrapper'));

                if (isButton && rect.width > 0 && rect.height > 0) {
                    const isMuted = className.toLowerCase().includes('muted') || title.toLowerCase().includes('unmute') || ariaLabel.toLowerCase().includes('unmute') || className.toLowerCase().includes('off');
                    if (isMuted) {
                        console.log(`[VideoSensor/Speaker] Mute button detected (Class="${className}", Title="${title}"). Clicking speaker...`);
                        try {
                            el.click();
                        } catch (e) {}
                    }
                }
            }
        });
    } catch (e) {}
}

let lastPlayState = null;
let lastMuteState = null;

function reportAndControlVideo() {
    const videos = document.querySelectorAll('video');
    videos.forEach((video, index) => {
        const isPlaying = !video.paused && !video.ended;
        const isMuted = video.muted;
        const time = video.currentTime;
        const vol = video.volume;
        const width = video.videoWidth;
        const height = video.videoHeight;
        const cWidth = video.clientWidth;
        const cHeight = video.clientHeight;

        // Watchdog to detect video freezing (currentTime not changing when playing)
        if (isPlaying && watchdogTimeoutEnabled) {
            const now = Date.now();
            if (video._jtvLastTime === undefined) {
                video._jtvLastTime = time;
                video._jtvLastTimeCheckedAt = now;
            } else if (video._jtvLastTime !== time) {
                video._jtvLastTime = time;
                video._jtvLastTimeCheckedAt = now;
                // Only signal genuine playback if video has real dimensions
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    ipcRenderer.sendToHost('guest-playing');
                }
            } else {
                const durationFrozen = now - video._jtvLastTimeCheckedAt;
                const limit = (time === 0) ? 16000 : watchdogTimeoutLimit;
                if (durationFrozen > limit) {
                    console.log(`[VideoWatchdog] Video currentTime frozen at ${time.toFixed(1)}s for ${durationFrozen}ms (limit: ${limit}ms) in frame ${window.location.href}. Sending guest-frozen signal.`);
                    ipcRenderer.sendToHost('guest-frozen');
                    // Reset check timer to prevent continuous spamming
                    video._jtvLastTimeCheckedAt = now;
                }
            }
        } else {
            delete video._jtvLastTime;
            delete video._jtvLastTimeCheckedAt;
        }
        
        if (isPlaying !== lastPlayState || isMuted !== lastMuteState || index === 0) {
            console.log(`[VideoSensor] VIDEO #${index} STATUS: playing=${isPlaying}, time=${time.toFixed(1)}, muted=${isMuted}, volume=${vol.toFixed(2)}, res=${width}x${height}, client=${cWidth}x${cHeight}`);
            lastPlayState = isPlaying;
            lastMuteState = isMuted;
            try {
                const dumpStyles = (el) => {
                    if (!el) return [];
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    const currentDump = `${el.tagName}#${el.id}.${el.className} [pos=${style.position}, zIndex=${style.zIndex}, size=${rect.width.toFixed(1)}x${rect.height.toFixed(1)}, display=${style.display}, vis=${style.visibility}, overflow=${style.overflow}, opacity=${style.opacity}, background=${style.backgroundColor}, top=${style.top}, left=${style.left}]`;
                    return [currentDump, ...dumpStyles(el.parentElement)];
                };
                const videoStyles = dumpStyles(video).reverse().join('\n  -> ');
                console.log(`[VideoSensor] STYLE CHAIN:\n  ${videoStyles}`);

                const els = Array.from(document.querySelectorAll('body *')).map(el => {
                    const style = window.getComputedStyle(el);
                    if (el.offsetWidth > 0 && el.offsetHeight > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
                        return `<${el.tagName} id="${el.id}" class="${el.className}" style="z-index:${style.zIndex}; opacity:${style.opacity}; position:${style.position}; display:${style.display}">`;
                    }
                    return null;
                }).filter(Boolean).join('\n');
                console.log(`[VideoSensor] DOM DUMP inside frame ${window.location.href}:\n${els}`);
            } catch (err) {
                console.error('[VideoSensor] DOM dump failed:', err);
            }
        }

        if (currentVolumeLevel > 0) {
            if (video.muted) {
                console.log(`[VideoSensor] Video is muted. Forcing video.muted = false`);
                video.muted = false;
            }
            if (video.volume === 0) {
                console.log(`[VideoSensor] Video volume is 0. Forcing video.volume = ${currentVolumeLevel / 10}`);
                video.volume = currentVolumeLevel / 10;
            }
        }

        if (video.paused && !video.ended) {
            console.log(`[VideoSensor] Video is paused. Attempting video.play()...`);
            video.play().catch(e => {
                console.warn(`[VideoSensor] play() blocked: ${e.message}. Clicking video element.`);
                try { video.click(); } catch(err) {}
            });
        }
    });
}

let lastFrameLog = 0;
function logFrameDetails() {
    const now = Date.now();
    if (now - lastFrameLog < 3000) return;
    lastFrameLog = now;
    try {
        const iframes = document.querySelectorAll('iframe');
        const videos = document.querySelectorAll('video');
        console.log(`[FrameDetails] URL="${window.location.href}", videos=${videos.length}, iframes=${iframes.length}`);
        iframes.forEach((f, i) => {
            console.log(`[FrameDetails] -> Iframe #${i}: id="${f.id}", class="${f.className}", src="${f.src}", style="${f.getAttribute('style') || ''}", display="${window.getComputedStyle(f).display}"`);
        });

        const all = document.querySelectorAll('*');
        all.forEach(el => {
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'HEAD' || el.tagName === 'HTML' || el.tagName === 'BODY' || el.tagName === 'IFRAME') return;
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const style = window.getComputedStyle(el);
                if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
                    const isNearLeft = rect.left >= 0 && rect.left < 50;
                    const isNearRight = rect.right > (window.innerWidth - 50) && rect.right <= window.innerWidth;
                    if (isNearLeft || isNearRight) {
                        console.log(`[EdgeElement] TAG=${el.tagName}, ID="${el.id}", CLASS="${el.className}", rect=[L:${rect.left.toFixed(0)},R:${rect.right.toFixed(0)},T:${rect.top.toFixed(0)},B:${rect.bottom.toFixed(0)},W:${rect.width.toFixed(0)},H:${rect.height.toFixed(0)}], style=[pos=${style.position}, zIndex=${style.zIndex}, bg=${style.backgroundColor}, opacity=${style.opacity}]`);
                    }
                }
            }
        });
    } catch (e) {
        console.error('[logFrameDetails] error:', e);
    }
}

let lastCenterClick = 0;
let centerClickCount = 0;
function autoClickCenter() {
    // Si este frame contiene iframes (ej. la página que envuelve al reproductor),
    // NO hacer clics ciegos al centro para no pausar el iframe del reproductor
    if (document.querySelectorAll('iframe').length > 0) return;
    if (centerClickCount >= 3) return;

    const videos = document.querySelectorAll('video');
    if (videos.length === 0) return;
    let playing = false;
    videos.forEach(v => {
        if (!v.paused && !v.ended && v.currentTime > 0) playing = true;
    });
    if (playing) return;

    const now = Date.now();
    if (now - lastCenterClick < 4000) return;
    lastCenterClick = now;
    centerClickCount++;

    try {
        const x = Math.floor(window.innerWidth / 2);
        const y = Math.floor(window.innerHeight / 2);
        console.log(`[VideoSensor] No video playing. Simulating click at center (${x}, ${y}) to trigger playback in frame: ${window.location.href}`);
        const el = document.elementFromPoint(x, y);
        if (el) {
            console.log(`[VideoSensor] Element at center is: <${el.tagName}> (id="${el.id}", class="${el.className}")`);
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
        }
    } catch (e) {
        console.error("[VideoSensor] Center click failed:", e);
    }
}

function autoClickPlayOverlays() {
    const videos = document.querySelectorAll('video');
    let playing = false;
    videos.forEach(v => {
        if (!v.paused && v.currentTime > 0) playing = true;
    });
    if (playing) return;

    const playSelectors = [
        '.clappr-play-button',
        '.player-poster',
        '.jw-display-icon-container',
        '.jw-icon-play',
        '.vjs-big-play-button',
        '.play-wrapper',
        '.play-btn',
        '.play-button',
        '#play-button',
        '.playicon',
        '.plyr__control--overlaid',
        '.tv-player-play-btn'
    ];

    playSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                console.log(`[VideoSensor] Play overlay/button detected: selector="${sel}". Clicking element in frame: ${window.location.href}`);
                try {
                    el.click();
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                } catch (e) {
                    console.error(`[VideoSensor] Failed clicking play overlay:`, e);
                }
            }
        });
    });
}

function killCastPageAds() {
    const url = window.location.href;
    const isPlayerPage = url.includes('cast.php') || url.includes('stream-') || url.includes('stream.php');
    if (!isPlayerPage) return;
    try {
        const thatframe = document.getElementById('thatframe') || document.getElementById('playerFrame');
        if (!thatframe) return;
        document.querySelectorAll('body *').forEach(el => {
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'VIDEO') return;
            if (el === thatframe) return;
            if (thatframe.contains(el) || el.contains(thatframe)) return;
            if (el.id === 'player' || el.classList.contains('player-container') || el.querySelector('video') !== null) return;
            el.style.cssText = 'display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;width:0!important;';
        });
    } catch (e) {}
}

function killOrphanFrame() {
    // If this frame has no video AND is not a recognized player context, it's likely an ad frame
    const url = window.location.href;
    if (!url || url === 'about:blank' || url.startsWith('file:') || url.startsWith('devtools:')) return;
    if (window.self === window.top) return; // only in sub-frames
    // Give the frame 2s to load a video before killing
    setTimeout(() => {
        try {
            const videos = document.querySelectorAll('video');
            if (videos.length > 0) return; // has video → legit player frame
            const iframes = document.querySelectorAll('iframe');
            if (iframes.length > 0) return; // has nested player frame → container frame, never hide!
            const isPlayerPath = url.includes('premiumtv') || url.includes('clappr') ||
                url.includes('hls') || url.includes('cast.php') || url.includes('embed') ||
                url.includes('player') || url.includes('watch') || url.includes('stream') ||
                url.includes('nexa') || url.includes('/ch') || url.includes('forgemindly') ||
                url.includes('xyzstreams') || url.includes('streamx305') || url.includes('embed.st');
            if (isPlayerPath) return;
            console.log(`[AdKill] Orphan frame (no video, no player signature): ${url} — hiding body.`);
            if (document.body) {
                document.body.style.cssText = 'display:none!important;visibility:hidden!important;';
            }
        } catch (e) {}
    }, 2000);
}

function reportAdCandidates() {
    // Collect iframe srcs and script srcs that look external; send to main for logging
    if (window.self !== window.top) return; // only from top frame of webview
    try {
        const known = [
            'localhost', '127.0.0.1', 'file:', 'devtools:', 'chrome:',
            'dlhd.', 'dlive.', 'daddylive.', 'rabbitstream.', 'jwpcdn.', 'clappr.',
            'cloudfront.', 'cdnjs.', 'jsdelivr.', 'jquery.', 'unpkg.',
            'fonts.gstatic', 'fonts.googleapis', 'vertex.st', 'embedindia.',
            'megacloud.', 'rapid-cloud.', 'dokicloud.'
        ];
        const candidates = [];
        document.querySelectorAll('iframe[src], script[src]').forEach(el => {
            const src = el.src || el.getAttribute('src') || '';
            if (!src || src.startsWith('blob:') || src.startsWith('data:')) return;
            try {
                const hostname = new URL(src).hostname;
                if (!hostname) return;
                const isKnown = known.some(k => hostname.includes(k));
                if (!isKnown) candidates.push(hostname);
            } catch (e) {}
        });
        if (candidates.length > 0) {
            ipcRenderer.send('ad-candidates', [...new Set(candidates)]);
        }
    } catch (e) {}
}

function hideDistractingSymbols() {
    try {
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'HEAD' || tag === 'HTML' || tag === 'BODY' || tag === 'IFRAME' || tag === 'VIDEO') return;
            if (el.querySelector('video') !== null) return; // Never hide ancestors of video
            
            // Check 1: Text content contains the distracting symbols
            const text = (el.textContent || '').trim();
            const hasSymbol = text === '■' || text === '⤢' || text.includes('■') || text.includes('⤢') || text.includes('\u25A0') || text.includes('\u2922');
            
            // Check 2: Element is a narrow container on the left or right edges
            const rect = el.getBoundingClientRect();
            let isEdgeElement = false;
            if (rect.width > 0 && rect.height > 0) {
                const isNearLeft = rect.left >= 0 && rect.right <= 100;
                const isNearRight = rect.left >= (window.innerWidth - 100) && rect.right <= window.innerWidth;
                if (isNearLeft || isNearRight) {
                    isEdgeElement = true;
                }
            }
            
            // Check 3: Element has class/ID associated with media controls
            const className = typeof el.className === 'string' ? el.className.toLowerCase() : '';
            const id = typeof el.id === 'string' ? el.id.toLowerCase() : '';
            const isControlElement = className.includes('media-control') || className.includes('clappr') || id.includes('clappr');

            if (hasSymbol || isEdgeElement || isControlElement) {
                el.style.display = 'none';
                el.style.setProperty('display', 'none', 'important');
                el.style.visibility = 'hidden';
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.opacity = '0';
                el.style.setProperty('opacity', '0', 'important');
                el.style.pointerEvents = 'none';
                
                // Color black/transparent fallback
                el.style.color = 'black';
                el.style.setProperty('color', 'black', 'important');
                el.style.backgroundColor = 'transparent';
                el.style.setProperty('background-color', 'transparent', 'important');
            }
        });
    } catch (e) {}
}

try {
    console.log(`[Guest Preload] Setting up main interval in frame "${window.location.href}"...`);
    setInterval(() => {
        try {
            console.log(`[IntervalTick] Frame="${window.location.href}"`);
            hideDistractingSymbols();
            logFrameDetails();
            killCastPageAds();
            disableAdOverlays();
            nukeAdWidgetsDevToolsStyle();
            triggerPlayerHover();
            autoClickPlayOverlays();
            autoClickCenter();
            tryGlobalPlayerUnmute();
            inspectVolumeButtons();
            reportAndControlVideo();
            document.querySelectorAll('video').forEach(syncVideoAudioState);
        } catch (err) {
            console.error(`[IntervalError] Error in frame ${window.location.href}:`, err);
        }
    }, 1000);
    console.log(`[Guest Preload] Main interval set up successfully.`);

    // Fast MutationObserver for instant DOM removal of ads
    try {
        const adObserver = new MutationObserver(() => {
            nukeAdWidgetsDevToolsStyle();
        });
        adObserver.observe(document.documentElement, { childList: true, subtree: true });
    } catch(e) {}

    console.log(`[Guest Preload] Setting up sync interval...`);
    setInterval(() => {
        const videos = document.querySelectorAll('video');
        if (!videos.length) return;

        let hasUnsynced = false;
        videos.forEach(v => {
            if (!v._jtvSynced) hasUnsynced = true;
        });

        Promise.all([
            ipcRenderer.invoke(IPC.GET_CURRENT_VOLUME),
            ipcRenderer.invoke(IPC.GET_AUDIO_LEVELER),
            ipcRenderer.invoke('is-audio-muted')
        ]).then(([level, levelerEnabled, muted]) => {
            let updated = hasUnsynced;
            if (level !== undefined && level !== null && level !== currentVolumeLevel) {
                currentVolumeLevel = level;
                updated = true;
            }
            if (levelerEnabled !== undefined && levelerEnabled !== null && levelerEnabled !== audioLevelerEnabled) {
                audioLevelerEnabled = levelerEnabled;
                updated = true;
            }
            if (muted !== undefined && muted !== null && muted !== hostIsMuted) {
                hostIsMuted = muted;
                updated = true;
            }
            if (updated) {
                videos.forEach(syncVideoAudioState);
            }
        }).catch((err) => {
            console.error(`[Guest Preload] Sync interval invoke failed:`, err);
        });
    }, 1000);
    console.log(`[Guest Preload] Sync interval set up successfully.`);

    console.log(`[Guest Preload] Setting up IPC event listeners...`);
    ipcRenderer.on(IPC.SET_VOLUME_LEVEL, (_event, level) => {
        currentVolumeLevel = level;
        document.querySelectorAll('video').forEach(syncVideoAudioState);
    });

    ipcRenderer.on(IPC.SET_AUDIO_LEVELER, (_event, enabled) => {
        audioLevelerEnabled = enabled;
        document.querySelectorAll('video').forEach(syncVideoAudioState);
    });

    ipcRenderer.on('set-watchdog-config', (_event, config) => {
        if (config) {
            if (config.limit !== undefined) watchdogTimeoutLimit = config.limit;
            if (config.enabled !== undefined) watchdogTimeoutEnabled = config.enabled;
            console.log(`[VideoWatchdog] Config updated via IPC: limit=${watchdogTimeoutLimit}, enabled=${watchdogTimeoutEnabled}`);
        }
    });

    console.log(`[Guest Preload] IPC event listeners registered.`);

    console.log(`[Guest Preload] Performing initial state fetch...`);
    Promise.all([
        ipcRenderer.invoke(IPC.GET_CURRENT_VOLUME),
        ipcRenderer.invoke(IPC.GET_AUDIO_LEVELER),
        ipcRenderer.invoke('is-audio-muted')
    ]).then(([level, levelerEnabled, muted]) => {
        console.log(`[Guest Preload] Initial fetch complete: level=${level}, leveler=${levelerEnabled}, muted=${muted}`);
        if (level !== undefined && level !== null) currentVolumeLevel = level;
        if (levelerEnabled !== undefined && levelerEnabled !== null) audioLevelerEnabled = levelerEnabled;
        if (muted !== undefined && muted !== null) hostIsMuted = muted;
        document.querySelectorAll('video').forEach(syncVideoAudioState);
    }).catch((err) => {
        console.error(`[Guest Preload] Initial fetch failed:`, err);
    });
} catch (e) {
    console.error(`[Guest Preload] Exception in bottom initialization:`, e);
}
