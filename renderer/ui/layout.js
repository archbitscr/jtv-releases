import { state } from '../state/appState.js';
import { getFilteredChannelsList } from '../filters/filterManager.js';
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
}

let resolutionBypassed = false;

export function checkResolution() {
}
