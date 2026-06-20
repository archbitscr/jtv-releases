import { state } from '../state/appState.js';
import { getFilteredChannelsList } from '../filters/filterManager.js';
import { refreshVodContent } from '../vod/vodContent.js';

export function syncCenterNavWidth() {
    const topNavMenu = document.getElementById('top-nav-menu');
    if (!topNavMenu) return;
    const width = Math.round(topNavMenu.getBoundingClientRect().width);
    if (width > 0) {
        document.documentElement.style.setProperty('--center-nav-width', `${width}px`);
    }
}

export function updateFullscreenButton() {
    const fullscreenToggleBtn = document.getElementById('fullscreen-toggle');
    const fullscreenToggleIcon = document.getElementById('fullscreen-toggle-icon');
    if (!fullscreenToggleBtn || !fullscreenToggleIcon) return;
    
    fullscreenToggleBtn.classList.toggle('is-fullscreen', state.isAppFullscreen);
    fullscreenToggleIcon.setAttribute('data-lucide', state.isAppFullscreen ? 'minimize' : 'maximize');
    fullscreenToggleBtn.title = state.isAppFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
    fullscreenToggleBtn.setAttribute('aria-label', fullscreenToggleBtn.title);
    if (window.lucide) window.lucide.createIcons();
}

export async function toggleAppFullscreen() {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    state.isAppFullscreen = await nativeApi.toggleFullscreen();
    updateFullscreenButton();
}

export function getActiveSidebarTab() {
    const activeTabBtn = document.querySelector('.tab-btn.active');
    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'channels';
    return activeTab === 'favorites' ? 'favorites' : 'channels';
}

export function getCurrentNavigationChannels() {
    return getFilteredChannelsList(getActiveSidebarTab());
}

export function isEditableElement(element) {
    if (!element) return false;
    const tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable;
}

export function updateVodGridDimensions() {
    if (state.currentModule !== 'movies' && state.currentModule !== 'series') return null;

    const wrapper = document.querySelector('.grid-carousel-wrapper');
    const grid = document.getElementById('favorites-grid');
    if (!wrapper || !grid) return null;

    const isVodActive = grid.classList.contains('vod-active') || state.currentModule === 'movies' || state.currentModule === 'series';
    const gridWidth = isVodActive ? (window.innerWidth * 0.95) - 120 : wrapper.clientWidth - 120; // Subtract space for nav buttons
    const gridHeight = window.innerHeight - 280;

    const rowHeight = gridHeight / 3;
    const posterHeight = Math.max(100, rowHeight - 45); // Account for card padding and vod-info text
    const posterWidth = (2 / 3) * posterHeight;
    const cardWidth = Math.floor(posterWidth);

    const gap = 20;
    let cols = Math.floor((gridWidth + gap) / (cardWidth + gap));
    if (cols < 5) cols = 5;

    const itemsPerPage = cols * 3;

    grid.style.setProperty('--vod-cols', cols);
    grid.style.setProperty('--vod-card-width', `${cardWidth}px`);

    return { cols, itemsPerPage };
}

export async function handleResizeDimensions() {
    syncCenterNavWidth();
    checkResolution();
    if (state.currentModule === 'movies' || state.currentModule === 'series') {
        const dims = updateVodGridDimensions();
        if (dims && state.VOD_ITEMS_PER_PAGE !== dims.itemsPerPage) {
            state.VOD_ITEMS_PER_PAGE = dims.itemsPerPage;
            await refreshVodContent();
        }
    }
}

let countdownInterval = null;

export function checkResolution() {
    const devState = window.getDeveloperState ? window.getDeveloperState() : null;
    if (devState && devState.diagnosticsEnabled) {
        const blocker = document.getElementById('resolution-blocker');
        if (blocker) blocker.classList.add('hidden');
        if (window.timeouts) {
            window.timeouts.clear('resolution');
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        return;
    }
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const blocker = document.getElementById('resolution-blocker');
    
    if (screenWidth < 1220 || screenHeight < 1080) {
        const resVal = document.getElementById('current-res-val');
        if (blocker) {
            blocker.classList.remove('hidden');
        }
        if (resVal) {
            resVal.textContent = `${screenWidth} x ${screenHeight}`;
        }
        
        // Start auto-close countdown if not already running
        if (window.timeouts && !window.timeouts.has('resolution')) {
            let secondsLeft = 5;
            const btn = document.getElementById('close-app-btn');
            if (btn) btn.innerText = `Cerrar Aplicación (${secondsLeft}s)`;
            
            countdownInterval = setInterval(() => {
                secondsLeft--;
                if (btn) btn.innerText = `Cerrar Aplicación (${secondsLeft}s)`;
                if (secondsLeft <= 0) {
                    clearInterval(countdownInterval);
                    window.close();
                }
            }, 1000);
            
            window.timeouts.set('resolution', () => {
                window.close();
            }, 5000);
        }
    } else {
        if (blocker) {
            blocker.classList.add('hidden');
        }
        // Cancel countdown if resolution is restored
        if (window.timeouts) {
            window.timeouts.clear('resolution');
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        const btn = document.getElementById('close-app-btn');
        if (btn) btn.innerText = `Cerrar Aplicación`;
    }
}
