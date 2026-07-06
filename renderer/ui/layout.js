import { state } from '../state/appState.js';
import { getFilteredChannelsList } from '../filters/filterManager.js';
import { refreshVodContent } from '../vod/vodContent.js';
import { renderFavoritesGrid } from '../render/favoritesGrid.js';

export function updatePlayerVideoBox() {
    const webview = document.getElementById('player-webview');
    if (!webview) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let w, h;
    if (vw / vh > 16 / 9) {
        // Window wider than 16:9 -> pillarbox left/right
        h = vh;
        w = vh * 16 / 9;
    } else {
        // Window taller/narrower than 16:9 -> letterbox top/bottom
        w = vw;
        h = vw * 9 / 16;
    }

    webview.style.width = `${w}px`;
    webview.style.height = `${h}px`;
    webview.style.top = `${(vh - h) / 2}px`;
    webview.style.left = `${(vw - w) / 2}px`;
}

export function syncCenterNavWidth() {
    const topNavMenu = document.getElementById('tnav-menu');
    if (!topNavMenu) return;
    const width = Math.round(topNavMenu.getBoundingClientRect().width);
    if (width > 0) {
        document.documentElement.style.setProperty('--center-nav-width', `${width}px`);
    }
}

export function updateFullscreenButton() {
    const fullscreenToggleBtn = document.getElementById('corner-fs-btn');
    const fullscreenToggleIcon = document.getElementById('corner-fs-icon');
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
    const activeTabBtn = document.querySelector('.side-tab-btn.active');
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

const VOD_ASPECT    = 184 / 314;
const VOD_GAP       = 10;
const VOD_PADDING   = 10;
const VOD_MIN_CELL_H = 100;

let _vodResizeObserver = null;

export function updateVodGridDimensions() {
    const wrapper = document.querySelector('.land-carousel-wrapper');
    const grid    = document.getElementById('land-grid');
    if (!wrapper || !grid) return null;
    if (!grid.classList.contains('vod-active')) return null;

    // wrapper has flex:1; min-height:0 in VOD mode — its clientHeight is the
    // available area for the grid (the flex layout already subtracted top-row,
    // filter-row and dots).  Fall back to math derivation if layout hasn't
    // rendered yet (wrapper still 0-height on the very first synchronous call).
    let availH = wrapper.clientHeight;
    if (availH < VOD_MIN_CELL_H * 2) {
        const dashboard = document.getElementById('vod-library');
        const topRow    = document.querySelector('.land-top-row');
        const filterRow = document.getElementById('vod-filter-row') || document.getElementById('dashboard-filters');
        const dotsEl    = document.querySelector('.land-dots-container');
        const dashH  = dashboard ? dashboard.clientHeight : window.innerHeight;
        const dStyle = dashboard ? getComputedStyle(dashboard) : null;
        const padTop = dStyle ? parseFloat(dStyle.paddingTop)    : 42;
        const padBot = dStyle ? parseFloat(dStyle.paddingBottom) : 30;
        const topH   = topRow  ? topRow.offsetHeight  + (parseFloat(getComputedStyle(topRow).marginBottom)  || 0) : 0;
        const filtH  = filterRow && !filterRow.classList.contains('hidden')
            ? filterRow.offsetHeight + (parseFloat(getComputedStyle(filterRow).marginBottom) || 0)
            : 0;
        const dotsH  = dotsEl ? dotsEl.offsetHeight + 14 : 30;
        availH = Math.max(VOD_MIN_CELL_H * 2, dashH - padTop - padBot - topH - filtH - dotsH);
    }

    const innerH   = availH - VOD_PADDING * 2;
    const navPrevW = document.getElementById('land-prev')?.offsetWidth || 0;
    const navNextW = document.getElementById('land-next')?.offsetWidth || 0;
    const innerW   = (wrapper.clientWidth - navPrevW - navNextW - VOD_PADDING * 2) || (window.innerWidth * 0.8);

    // maxCellH caps at 1/3 of innerH — without this, area math always picks 1 tall row
    const maxCellH = Math.round(innerH / 3);
    const maxRows  = Math.max(1, Math.floor((innerH + VOD_GAP) / (VOD_MIN_CELL_H + VOD_GAP)));
    let bestRows = 1, bestCols = 1, bestArea = 0;
    for (let rows = 1; rows <= maxRows; rows++) {
        const cellH = (innerH - (rows - 1) * VOD_GAP) / rows;
        if (cellH > maxCellH) continue;
        if (cellH < VOD_MIN_CELL_H) break;
        const cellW = cellH * VOD_ASPECT;
        const cols  = Math.max(1, Math.floor((innerW + VOD_GAP) / (cellW + VOD_GAP)));
        const area  = cellH * cellW * rows * cols;
        if (area > bestArea) { bestArea = area; bestRows = rows; bestCols = cols; }
    }

    grid.style.height               = availH + 'px';
    grid.style.width                = '100%';
    grid.style.gridTemplateRows    = `repeat(${bestRows}, 1fr)`;
    grid.style.gridTemplateColumns = `repeat(${bestCols}, auto)`;

    return { cols: bestCols, rows: bestRows, itemsPerPage: bestRows * bestCols };
}

export function initVodGridResizeObserver() {
    if (_vodResizeObserver) return;
    const wrapper = document.querySelector('.land-carousel-wrapper');
    if (!wrapper) return;
    _vodResizeObserver = new ResizeObserver(() => {
        const grid = document.getElementById('land-grid');
        if (!grid || !grid.classList.contains('vod-active')) return;
        const dims = updateVodGridDimensions();
        if (dims && state.VOD_ITEMS_PER_PAGE !== dims.itemsPerPage) {
            state.VOD_ITEMS_PER_PAGE = dims.itemsPerPage;
            refreshVodContent();
        }
    });
    _vodResizeObserver.observe(wrapper);
}

export async function handleResizeDimensions() {
    syncCenterNavWidth();
    checkResolution();
    updatePlayerVideoBox();

    const rows = window.innerHeight <= 500 ? 4 : window.innerHeight > 1200 ? 10 : 5;
    const newFavsPerPage = 2 * rows;
    if (state.FAVS_PER_PAGE !== newFavsPerPage) {
        state.FAVS_PER_PAGE = newFavsPerPage;
        if (state.currentModule === 'live') {
            renderFavoritesGrid();
        }
    }

    const grid = document.getElementById('land-grid');
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
