import { state } from '../state/appState.js';
import { t } from '../i18n/i18n.js';
import { escapeHtml, sanitizeMediaUrl } from '../utils/sanitize.js';
import { getSafeLogoHtml } from '../utils/domHelpers.js';

let ext = {};

export function initFavoritesGrid(dependencies) {
    ext = dependencies;
}

export function getFilteredLiveChannels() {

    const liveSearchInput = document.getElementById('live-landing-search');
    const searchVal = liveSearchInput ? liveSearchInput.value.trim() : "";

    const mode = state.zapSourceTab === 'favorites' ? 'favorites' : 'channels';

    return ext.getFilteredChannelsList
        ? ext.getFilteredChannelsList(mode, { searchTerm: searchVal })
        : [];
}

export function renderFavoritesGrid() {
    const homeDashboard = document.getElementById('vod-library');
    const favoritesGrid = document.getElementById('land-grid');
    if (!homeDashboard || !favoritesGrid) return;

    const dbNavAll = document.getElementById('land-nav-all');
    const dbNavFavs = document.getElementById('land-nav-favorites');
    if (dbNavAll && dbNavFavs) {
        dbNavAll.classList.toggle('active', state.zapSourceTab === 'channels');
        dbNavFavs.classList.toggle('active', state.zapSourceTab === 'favorites');
    }

    if (!state.isHomeActive || state.currentModule !== 'live') {
        homeDashboard.classList.add('hidden');
        return;
    }

    homeDashboard.classList.remove('hidden');

    const liveSearchContainer = document.getElementById('live-search-container');
    const dashboardFilters = document.getElementById('dashboard-filters');

    if (liveSearchContainer) liveSearchContainer.classList.remove('hidden');
    if (dashboardFilters) dashboardFilters.classList.remove('hidden');
    favoritesGrid.style.gridTemplateColumns = '';
    favoritesGrid.style.gridTemplateRows = '';
    favoritesGrid.style.height = '';
    favoritesGrid.style.width = '';
    favoritesGrid.style.padding = '';

    const allFavs = getFilteredLiveChannels();

    const totalPages = Math.ceil(allFavs.length / state.FAVS_PER_PAGE);
    if (state.favPage >= totalPages && totalPages > 0) state.favPage = totalPages - 1;

    const start = state.favPage * state.FAVS_PER_PAGE;
    const pageFavs = allFavs.slice(start, start + state.FAVS_PER_PAGE);

    favoritesGrid.innerHTML = '';
    for (let i = 0; i < state.FAVS_PER_PAGE; i++) {
        const channel = pageFavs[i];
        const gridItem = document.createElement('div');
        const isActive = channel && String(state.activeChannelId) === String(channel.id);
        gridItem.className = `land-item stagger-reveal ${isActive ? 'active' : ''}`;
        gridItem.style.animationDelay = `${(i % 5) * 0.04}s`;
        if (channel) {
            gridItem.setAttribute('data-id', channel.id);
            const epg = ext.getActiveEpg ? ext.getActiveEpg(channel.id) : null;
            const epgText = epg ? epg.event : t('channel.live_broadcast', 'Live broadcast');

            const logoHtml = getSafeLogoHtml(channel.name, channel.logo);
            gridItem.innerHTML = `
                <div class="land-corner">
                    <span class="land-channel-id">${escapeHtml(String(channel.id))}</span>
                    ${channel.favorite ? `<span class="land-fav-indicator"><i data-lucide="heart"></i></span>` : ''}
                </div>
                <div class="land-logo">${logoHtml}</div>
                <div class="land-text-content">
                    <h4>${escapeHtml(channel.name)}</h4>
                    <p class="land-epg">${escapeHtml(epgText)}</p>
                </div>
            `;
            gridItem.onclick = () => {
                if (ext.selectChannel) ext.selectChannel(channel);
            };
        } else {
            gridItem.classList.add('empty');
            gridItem.innerHTML = `<div class="land-logo"><i data-lucide="plus" style="opacity: 0.1"></i></div>`;
        }
        favoritesGrid.appendChild(gridItem);
    }

    renderGridDots(totalPages);
    if (window.lucide) {
        window.lucide.createIcons({ nodes: [favoritesGrid] });
    }
}

export function renderGridDots(totalPages) {
    const gridDots = document.getElementById('land-dots');
    if (!gridDots) return;
    gridDots.innerHTML = '';
    if (totalPages <= 1) return;

    const currentPage = state.favPage;
    const maxDots = 8;
    let startDot = Math.max(0, currentPage - Math.floor(maxDots / 2));
    let endDot = Math.min(totalPages, startDot + maxDots);
    if (endDot - startDot < maxDots) {
        startDot = Math.max(0, endDot - maxDots);
    }

    if (startDot > 0) {
        const dot = document.createElement('div');
        dot.className = 'land-dot';
        dot.innerText = '...';
        dot.style.display = 'flex';
        dot.style.alignItems = 'center';
        dot.style.justifyContent = 'center';
        dot.style.fontSize = '0.6rem';
        dot.style.color = 'rgba(255,255,255,0.4)';
        gridDots.appendChild(dot);
    }

    for (let i = startDot; i < endDot; i++) {
        const dot = document.createElement('div');
        dot.className = `land-dot ${currentPage === i ? 'active' : ''}`;
        dot.onclick = () => {
            state.favPage = i;
            renderFavoritesGrid();
        };
        gridDots.appendChild(dot);
    }

    if (endDot < totalPages) {
        const dot = document.createElement('div');
        dot.className = 'land-dot';
        dot.innerText = '...';
        dot.style.display = 'flex';
        dot.style.alignItems = 'center';
        dot.style.justifyContent = 'center';
        dot.style.fontSize = '0.6rem';
        dot.style.color = 'rgba(255,255,255,0.4)';
        gridDots.appendChild(dot);
    }
}

export function syncGridPageToActiveChannel(channelId) {
    const id = channelId || state.activeChannelId;
    if (!id) return;


    const allFavs = getFilteredLiveChannels();

    const index = allFavs.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
        const targetPage = Math.floor(index / state.FAVS_PER_PAGE);
        if (state.favPage !== targetPage) {
            state.favPage = targetPage;
        }
    }
}
