const { ipcRenderer } = require('electron');
const IPC = require('./shared/ipcChannels.json');

// Stub standard dialog boxes to prevent hanging the renderer process
try {
    window.alert = () => { console.log("[Preload Stub] Blocked window.alert"); };
    window.confirm = () => { console.log("[Preload Stub] Blocked window.confirm"); return true; };
    window.prompt = () => { console.log("[Preload Stub] Blocked window.prompt"); return null; };
} catch (e) {
    console.error("[Preload Stub] Error overriding dialogs:", e);
}

// 1. Ultra-Aggressive Nuclear CSS
const nuclearStyle = `
    /* Hide ALL common elements and specific high-z-index garbage */
    header, footer, aside, nav, .header, .footer, .sidebar, .watch__sidebar, 
    .watch__info, .social-share, .floating-btn, .watch__playerActions, 
    .watch__playerOverlay, #chat-container, .chatango, #am-container, 
    .watch__title, .watch__meta, .watch__tabs, .watch__comments, 
    .ad-banner, .adsbygoogle, [id*="google_ads"], [class*="ads-"],
    .menu-container, .top-bar, .bottom-bar,
    div[id^="ys"], div#advert1, div[class*="overlay"], 
    div[style*="z-index: 2147483647"], div[style*="z-index:2147483647"],
    iframe:not([src*="stream-"]):not([src*="daddy"]):not(#thatframe) {
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

    /* Force the player container to the front */
    #player, .player-container, .watch__playerFrame, #playerFrame, #thatframe, 
    iframe[src*="stream-"], iframe[src*="daddy"], #main-player-wrapper {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 99999999 !important; /* Extremely high but not max to avoid overlapping system UI if any */
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
    video {
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
`;

function injectStyle() {
    if (window.location.protocol === 'file:') return;
    if (document.head) {
        let style = document.getElementById('jtv-nuclear-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'jtv-nuclear-style';
            document.head.appendChild(style);
            console.log('[Preload] CSS Style injected successfully in: ' + window.location.href);
        } else {
            console.log('[Preload] CSS Style updated successfully in: ' + window.location.href);
        }
        style.innerHTML = nuclearStyle;
    }
}

function autoClickOK() {
    if (window.location.protocol === 'file:') return;
    const buttons = document.querySelectorAll('button, a, div');
    for (const b of buttons) {
        const text = (b.innerText || '').trim().toLowerCase();
        if (text === 'ok' || text === 'continue' || text === 'i agree' || text === 'close' || text === 'skip ad') {
            b.click();
        }
    }
}

function cleanupHighZIndex() {
    if (window.location.protocol === 'file:') return;
    try {
        const allElements = document.querySelectorAll('body *');
        allElements.forEach(el => {
            const zIndex = window.getComputedStyle(el).zIndex;
            if (zIndex && !isNaN(zIndex) && parseInt(zIndex) > 1000) {
                // Safeguard: Do NOT remove video, player containers, or media controls
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
                    console.log(`[Preload Cleanup] Removing element <${el.tagName}> Class="${className}" ID="${id}" with high z-index: ${zIndex}`);
                    el.remove();
                }
            }
        });
    } catch (e) {
        console.error("Error in cleanupHighZIndex:", e);
    }
}

// 2. Disable Ad Overlays dynamically by removing pointer events
function disableAdOverlays() {
    if (window.location.protocol === 'file:') return;
    try {
        const allElements = document.querySelectorAll('body *');
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const position = style.position;
            const pointerEvents = style.pointerEvents;
            
            if ((position === 'absolute' || position === 'fixed') && pointerEvents !== 'none') {
                const rect = el.getBoundingClientRect();
                const isLarge = rect.width > 150 && rect.height > 150;
                
                if (isLarge) {
                    const isVideo = el.tagName === 'VIDEO';
                    const isIframe = el.tagName === 'IFRAME';
                    const hasVideo = el.querySelector('video') !== null;
                    const isPlayerOrWrapper = 
                        el.id.toLowerCase().includes('player') || 
                        el.className.toLowerCase().includes('player') ||
                        el.id === 'thatframe' ||
                        el.id === 'main-player-wrapper';
                    const isControl = 
                        el.classList.contains('media-control') || 
                        el.closest('.media-control') !== null ||
                        el.className.toLowerCase().includes('clappr') ||
                        el.id.toLowerCase().includes('clappr') ||
                        el.className.toLowerCase().includes('control');
                        
                    if (!isVideo && !isIframe && !hasVideo && !isPlayerOrWrapper && !isControl) {
                        console.log(`[Preload Cleanup] Disabling ad overlay: <${el.tagName}> Class="${el.className}" ID="${el.id}" Position="${position}" Rect=${rect.width}x${rect.height}`);
                        el.style.pointerEvents = 'none';
                        el.style.display = 'none';
                        el.style.opacity = '0';
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error in disableAdOverlays:", e);
    }
}

// 3. Keep player video element centered inside viewport
function scrollVideoIntoView() {
    if (window.location.protocol === 'file:') return;
    try {
        const video = document.querySelector('video');
        if (video) {
            video.scrollIntoView({ block: 'center', inline: 'center' });
        }
    } catch (e) {
        console.error("Error scrolling video into view:", e);
    }
}

// Aggressive Mutation Observer
const observer = new MutationObserver((mutations) => {
    observer.disconnect();
    try {
        injectStyle();
        cleanupHighZIndex();
        disableAdOverlays();
        scrollVideoIntoView();
        autoClickOK();
        
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            v.style.width = '100vw';
            v.style.height = '100vh';
        });
    } finally {
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
});

window.addEventListener('DOMContentLoaded', () => {
    injectStyle();
    cleanupHighZIndex();
    disableAdOverlays();
    scrollVideoIntoView();
    autoClickOK();
    observer.observe(document.documentElement, { childList: true, subtree: true });
});

window.addEventListener('load', () => {
    injectStyle();
    cleanupHighZIndex();
    disableAdOverlays();
    scrollVideoIntoView();
    autoClickOK();
});

// DOM Inspector to identify volume/mute elements in cross-origin player iframes
function inspectVolumeButtons() {
    if (window.self === window.top) return; // Only run inside player iframes
    
    try {
        const elements = document.querySelectorAll('*');
        let foundCount = 0;
        elements.forEach(el => {
            const id = el.id || '';
            const className = typeof el.className === 'string' ? el.className : '';
            const title = el.getAttribute('title') || '';
            const ariaLabel = el.getAttribute('aria-label') || '';
            
            // Check typical volume/mute/audio class or attribute keywords
            const matchesVolume = 
                id.toLowerCase().includes('volume') || id.toLowerCase().includes('mute') || id.toLowerCase().includes('audio') ||
                className.toLowerCase().includes('volume') || className.toLowerCase().includes('mute') || className.toLowerCase().includes('audio') ||
                className.toLowerCase().includes('speaker') || className.toLowerCase().includes('sound') ||
                title.toLowerCase().includes('volume') || title.toLowerCase().includes('mute') || title.toLowerCase().includes('sound') || title.toLowerCase().includes('audio') ||
                ariaLabel.toLowerCase().includes('volume') || ariaLabel.toLowerCase().includes('mute') || ariaLabel.toLowerCase().includes('sound') || ariaLabel.toLowerCase().includes('audio');
            
            if (matchesVolume && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && el.tagName !== 'HEAD' && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
                const rect = el.getBoundingClientRect();
                
                // Determine if it's the click-target icon/button vs a slider bar
                const isButton = 
                    className.toLowerCase().includes('icon') || 
                    className.toLowerCase().includes('btn') || 
                    className.toLowerCase().includes('button') ||
                    el.tagName === 'BUTTON' ||
                    (!className.toLowerCase().includes('bar') && !className.toLowerCase().includes('slider') && !className.toLowerCase().includes('container') && !className.toLowerCase().includes('wrapper'));

                if (isButton && rect.width > 0 && rect.height > 0) {
                    const centerX = Math.floor(rect.x + rect.width / 2);
                    const centerY = Math.floor(rect.y + rect.height / 2);
                    const isMuted = className.toLowerCase().includes('muted') || title.toLowerCase().includes('unmute') || ariaLabel.toLowerCase().includes('unmute');
                    
                    // console.log(`[DOM-Inspector] Match #${++foundCount} (Speaker Button): <${el.tagName}> Class="${className}" Rect: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}. Reporting Center: (${centerX}, ${centerY}), isMuted=${isMuted}`);
                    
                    if (isMuted) {
                        console.log(`[Preload] Speaker is muted. Attempting programmatic click...`);
                        try {
                            el.click();
                        } catch (clickErr) {
                            console.error("[Preload] Programmatic click error:", clickErr);
                        }
                    }
                    
                    ipcRenderer.invoke(IPC.REPORT_SPEAKER_COORDS, {
                        x: centerX,
                        y: centerY,
                        isMuted: isMuted
                    }).catch(() => {});
                } else {
                    // console.log(`[DOM-Inspector] Match #${++foundCount} (Other): <${el.tagName}> Class="${className}" Rect: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);
                }
            }
        });
    } catch (e) {
        console.error("[DOM-Inspector] Error scanning DOM:", e);
    }
}

function triggerPlayerHover() {
    if (window.self === window.top) return;
    try {
        const selectors = ['.player-container', '#player', 'video', '.media-control', 'body'];
        const clientX = Math.floor(window.innerWidth / 2);
        const clientY = Math.floor(window.innerHeight / 2);
        
        selectors.forEach(sel => {
            const elements = document.querySelectorAll(sel);
            elements.forEach(el => {
                const mouseOverEvent = new MouseEvent('mouseover', {
                    bubbles: true, cancelable: true, view: window, clientX, clientY
                });
                const mouseMoveEvent = new MouseEvent('mousemove', {
                    bubbles: true, cancelable: true, view: window, clientX, clientY
                });
                el.dispatchEvent(mouseOverEvent);
                el.dispatchEvent(mouseMoveEvent);
            });
        });
    } catch (e) {
        console.error("[Preload] Error dispatching hover events:", e);
    }
}

function tryGlobalPlayerUnmute() {
    if (window.self === window.top) return;
    try {
        // Search window keys for common player objects
        const keys = Object.keys(window);
        for (const k of keys) {
            if (k.toLowerCase().includes('player') || k.toLowerCase().includes('clappr') || k.toLowerCase().includes('hls')) {
                const obj = window[k];
                if (obj) {
                    if (typeof obj.unmute === 'function') {
                        console.log(`[Preload] Found player object window.${k}. Calling unmute()...`);
                        obj.unmute();
                    }
                    if (typeof obj.setVolume === 'function') {
                        console.log(`[Preload] Found player object window.${k}. Calling setVolume(100)...`);
                        obj.setVolume(100);
                    }
                    if (typeof obj.volume === 'function') {
                        console.log(`[Preload] Found player object window.${k}. Calling volume(100)...`);
                        obj.volume(100);
                    }
                }
            }
        }
    } catch (e) {
        console.error("[Preload] Error trying global player unmute:", e);
    }
}

if (window.self !== window.top) {
    // Start scanning periodically after load (every 1 second) and programmatically hover & unmute
    setInterval(() => {
        disableAdOverlays();
        scrollVideoIntoView();
        triggerPlayerHover();
        tryGlobalPlayerUnmute();
        inspectVolumeButtons();
    }, 1000);
}

// Escape key forwarder to main process
window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
    );

    if (e.key === 'Escape') {
        console.log("[Preload] Escape key intercepted in webview, forwarding to main process");
        ipcRenderer.send(IPC.ESCAPE_PRESSED);
    }
}, true);

// Web Audio API context and state variables
let audioCtx = null;
let sourceMap = new WeakMap();
let audioLevelerEnabled = false;
let currentVolumeLevel = 10;

function setupAudioLeveler(video, enabled) {
    if (!video) return;
    
    let nodes = sourceMap.get(video);
    if (!nodes && enabled) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        
        try {
            const source = audioCtx.createMediaElementSource(video);
            const compressor = audioCtx.createDynamicsCompressor();
            const gain = audioCtx.createGain();
            
            // Connect Video -> Compressor -> Gain -> Output Destination
            source.connect(compressor);
            compressor.connect(gain);
            gain.connect(audioCtx.destination);
            
            nodes = { source, compressor, gain };
            sourceMap.set(video, nodes);
            console.log("[Preload AudioLeveler] Wired DynamicsCompressor successfully.");
        } catch (e) {
            // Note: cross-origin audio elements will warn here, but won't crash
            console.warn("[Preload AudioLeveler] MediaElementSource wiring skipped/blocked (CORS):", e);
            return;
        }
    }
    
    if (nodes) {
        const targetGain = currentVolumeLevel / 10;
        if (enabled) {
            // Apply Automatic Gain Control (AGC) compressor rules
            nodes.compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
            nodes.compressor.knee.setValueAtTime(30, audioCtx.currentTime);
            nodes.compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
            nodes.compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
            nodes.compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
            nodes.gain.gain.setValueAtTime(targetGain * 2.0, audioCtx.currentTime); // makeup boost gain
            console.log(`[Preload AudioLeveler] Compressor applied with target gain: ${targetGain * 2.0}`);
        } else {
            // Bypass compression (linear ratio, threshold 0)
            nodes.compressor.threshold.setValueAtTime(0, audioCtx.currentTime);
            nodes.compressor.ratio.setValueAtTime(1, audioCtx.currentTime);
            nodes.gain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
            console.log(`[Preload AudioLeveler] Bypassed compressor, set target gain: ${targetGain}`);
        }
    }
}

function syncVideoAudioState(v) {
    if (!v) return;
    
    // Wire/configure Web Audio leveler only if it is enabled
    setupAudioLeveler(v, audioLevelerEnabled);
    
    const targetVol = currentVolumeLevel / 10;
    const nodes = sourceMap.get(v);
    
    if (nodes) {
        // If Web Audio is active, we keep video.volume = 1.0 to avoid double attenuation
        if (v.volume !== 1.0) {
            v.volume = 1.0;
        }
    } else {
        // Web Audio NOT active -> video.volume must be directly forced
        if (v.volume !== targetVol) {
            v.volume = targetVol;
        }
    }
    
    const targetMuted = (currentVolumeLevel === 0);
    if (v.muted !== targetMuted) {
        v.muted = targetMuted;
    }
}

if (window.self !== window.top) {
    // Start scanning periodically after load and programmatically hover, unmute, & wire audio
    setInterval(() => {
        disableAdOverlays();
        scrollVideoIntoView();
        triggerPlayerHover();
        tryGlobalPlayerUnmute();
        inspectVolumeButtons();
        
        // General sync of video element volume levels
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            syncVideoAudioState(v);
        });
    }, 1000);

    // Fast-polling loop (150ms) to ensure volume adjustments react instantly in nested frames
    setInterval(() => {
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
            Promise.all([
                ipcRenderer.invoke(IPC.GET_CURRENT_VOLUME),
                ipcRenderer.invoke(IPC.GET_AUDIO_LEVELER)
            ]).then(([level, levelerEnabled]) => {
                let updated = false;
                if (level !== undefined && level !== null && level !== currentVolumeLevel) {
                    currentVolumeLevel = level;
                    updated = true;
                }
                if (levelerEnabled !== undefined && levelerEnabled !== null && levelerEnabled !== audioLevelerEnabled) {
                    audioLevelerEnabled = levelerEnabled;
                    updated = true;
                }
                if (updated) {
                    videos.forEach(v => {
                        syncVideoAudioState(v);
                    });
                }
            }).catch(() => {});
        }
    }, 150);
}

// Listen for volume level changes from the main process (as backup)
ipcRenderer.on(IPC.SET_VOLUME_LEVEL, (event, level) => {
    console.log(`[Preload] Setting HTML5 video volume to level: ${level}/10`);
    currentVolumeLevel = level;
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
        syncVideoAudioState(v);
    });
});

// Listen for audio leveler status changes (as backup)
ipcRenderer.on(IPC.SET_AUDIO_LEVELER, (event, enabled) => {
    console.log(`[Preload] Audio Leveler setting updated: ${enabled}`);
    audioLevelerEnabled = enabled;
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
        syncVideoAudioState(v);
    });
});

// Fetch initial state on load
Promise.all([
    ipcRenderer.invoke(IPC.GET_CURRENT_VOLUME),
    ipcRenderer.invoke(IPC.GET_AUDIO_LEVELER)
]).then(([level, levelerEnabled]) => {
    if (level !== undefined && level !== null) {
        console.log(`[Preload] Initialized video volume to: ${level}/10`);
        currentVolumeLevel = level;
    }
    if (levelerEnabled !== undefined && levelerEnabled !== null) {
        audioLevelerEnabled = levelerEnabled;
    }
    
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
        syncVideoAudioState(v);
    });
}).catch(e => console.error("[Preload Startup] Error fetching initial volume settings:", e));
