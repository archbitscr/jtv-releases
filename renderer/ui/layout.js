import { state } from '../state/appState.js';
import { getFilteredChannelsList } from '../filters/filterManager.js';
import { refreshVodContent } from '../vod/vodContent.js';
import { renderFavoritesGrid } from '../render/favoritesGrid.js';

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
    fullscreenToggleBtn.title = state.isAppFullscreen ? 'Exit fullscreen' : 'Fullscreen';
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
    const wrapper = document.querySelector('.grid-carousel-wrapper');
    const grid = document.getElementById('favorites-grid');
    if (!wrapper || !grid) return null;

    const isVodActive = grid.classList.contains('vod-active') || state.currentModule === 'movies' || state.currentModule === 'series';
    if (!isVodActive) return null;
    const navSpace = Math.min(120, window.innerWidth * 0.1);
    const gridWidth = (window.innerWidth * 0.95) - navSpace; // Subtract space for nav buttons
    const gridHeight = window.innerHeight - 280;

    const rowHeight = gridHeight / 3;
    const posterHeight = Math.max(100, rowHeight - 45); // Account for card padding and vod-info text
    const posterWidth = (2 / 3) * posterHeight;
    const cardWidth = Math.floor(posterWidth * 0.56);

    const gap = 20;
    let cols = Math.floor((gridWidth + gap) / (cardWidth + gap));
    const minCols = window.innerWidth < 900 ? 2 : window.innerWidth < 1400 ? 3 : 5;
    if (cols < minCols) cols = minCols;

    const itemsPerPage = cols * 3;

    grid.style.setProperty('--vod-cols', cols);
    grid.style.setProperty('--vod-card-width', `${cardWidth}px`);

    return { cols, itemsPerPage };
}

export async function handleResizeDimensions() {
    syncCenterNavWidth();
    checkResolution();

    const cols = window.innerWidth < 800 ? 1 : 2;
    const rows = window.innerHeight <= 600 ? 3 : 5;
    const newFavsPerPage = cols * rows;
    if (state.FAVS_PER_PAGE !== newFavsPerPage) {
        state.FAVS_PER_PAGE = newFavsPerPage;
        if (state.currentModule === 'live') {
            renderFavoritesGrid();
        }
    }

    const grid = document.getElementById('favorites-grid');
    const isVod = grid && grid.classList.contains('vod-active');
    if (state.currentModule === 'movies' || state.currentModule === 'series' || isVod) {
        const dims = updateVodGridDimensions();
        if (dims && state.VOD_ITEMS_PER_PAGE !== dims.itemsPerPage) {
            state.VOD_ITEMS_PER_PAGE = dims.itemsPerPage;
            await refreshVodContent();
        }
    }
}

let resolutionBypassed = false;

export function checkResolution() {
}
