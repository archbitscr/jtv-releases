import { state } from '../state/appState.js';
import { escapeHtml, sanitizeMediaUrl } from '../utils/sanitize.js';
import { getSafeLogoHtml } from '../utils/domHelpers.js';

let ext = {};

export function initFavoritesGrid(dependencies) {
    ext = dependencies;
}

export function getFilteredLiveChannels() {
    if (state.activeDashTab !== "live") return [];

    const liveSearchInput = document.getElementById('live-landing-search');
    const searchVal = liveSearchInput ? liveSearchInput.value.trim() : "";

    const mode = state.zapSourceTab === 'favorites' ? 'favorites' : 'channels';

    return ext.getFilteredChannelsList
        ? ext.getFilteredChannelsList(mode, { searchTerm: searchVal })
        : [];
}

export function getCurrentVodPageIndex() {
    return state.vodFilterMode === "favorites" ? state.vodFavPage : state.vodPage;
}

export function setCurrentVodPageIndex(next) {
    if (state.vodFilterMode === "favorites") {
        state.vodFavPage = next;
    } else {
        state.vodPage = next;
    }
}

export function getVodYear(item) {
    const m = String(item.extraInfo || "").match(/\b(19|20)\d{2}\b/);
    if (m) return m[0];
    return null;
}

export function getVodRatingNumber(item) {
    const r = parseFloat(String(item.rating || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(r) ? r : null;
}

function isVodFavorite(item) {
    return state.vodFavorites.some(f => f && f.type === item.type && String(f.id) === String(item.id));
}

export function toggleVodFavorite(item) {
    const idx = state.vodFavorites.findIndex(f => f && f.type === item.type && String(f.id) === String(item.id));
    if (idx >= 0) {
        state.vodFavorites.splice(idx, 1);
    } else {
        state.vodFavorites.push({
            id: item.id,
            type: item.type,
            title: item.title,
            url: item.url,
            posterUrl: item.posterUrl,
            rating: item.rating,
            quality: item.quality,
            extraInfo: item.extraInfo
        });
    }
    if (ext.saveAppState) ext.saveAppState();
    renderFavoritesGrid();
}

export function renderVodControls() {
    const allBtn = document.getElementById('vod-filter-all');
    const favBtn = document.getElementById('vod-filter-favs');
    const genreSelect = document.getElementById('vod-genre-select');
    const ratingSelect = document.getElementById('vod-rating-select');
    const yearSelect = document.getElementById('vod-year-select');

    if (allBtn && favBtn) {
        allBtn.classList.toggle('active', state.vodFilterMode === 'all');
        favBtn.classList.toggle('active', state.vodFilterMode === 'favorites');
    }

    if (genreSelect && ext.getActiveVodGenres) {
        genreSelect.innerHTML = `<option value="All">Genre</option>` + ext.getActiveVodGenres()
            .filter(g => g.name !== "All")
            .map(g => `<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`)
            .join('');
        genreSelect.value = state.selectedVodGenre;
    }

    if (ratingSelect) {
        ratingSelect.innerHTML = `
            <option value="all">Rating</option>
            <option value="8">⭐ 8+</option>
            <option value="7">⭐ 7+</option>
            <option value="6">⭐ 6+</option>
            <option value="5">⭐ 5+</option>
        `;
        ratingSelect.value = state.selectedVodRating;
    }

    if (yearSelect) {
        yearSelect.value = state.selectedVodYear;
    }

    if (genreSelect && ext.syncCustomSelect) ext.syncCustomSelect(genreSelect);
    if (ratingSelect && ext.syncCustomSelect) ext.syncCustomSelect(ratingSelect);
    if (yearSelect && ext.syncCustomSelect) ext.syncCustomSelect(yearSelect);

    const vodControls = document.getElementById('vod-controls');
    const vodFilterRow = document.getElementById('vod-filter-row');
    if (window.lucide) {
        if (vodControls) window.lucide.createIcons({ nodes: [vodControls] });
        if (vodFilterRow) window.lucide.createIcons({ nodes: [vodFilterRow] });
    }
}

export function updateVodYearOptions(items) {
    const yearSelect = document.getElementById('vod-year-select');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const baseYears = [];
    for (let y = currentYear; y >= 1950; y--) baseYears.push(String(y));

    const extraYears = (items || [])
        .map(getVodYear)
        .filter(Boolean)
        .filter(y => {
            const n = parseInt(y);
            return Number.isFinite(n) && (n < 1950 || n > currentYear);
        });

    const years = Array.from(new Set([...baseYears, ...extraYears])).sort((a, b) => parseInt(b) - parseInt(a));

    yearSelect.innerHTML = `<option value="all">Year</option>` + years.map(y => `<option value="${y}">${y}</option>`).join('');
    if (!years.includes(state.selectedVodYear)) state.selectedVodYear = 'all';
    yearSelect.value = state.selectedVodYear;
    if (ext.syncCustomSelect) ext.syncCustomSelect(yearSelect);
}

export function renderFavoritesGrid() {
    const homeDashboard = document.getElementById('land-dashboard');
    const favoritesGrid = document.getElementById('land-grid');
    if (!homeDashboard || !favoritesGrid) return;

    const dbNavAll = document.getElementById('land-nav-all');
    const dbNavFavs = document.getElementById('land-nav-favorites');
    if (dbNavAll && dbNavFavs) {
        dbNavAll.classList.toggle('active', state.zapSourceTab === 'channels');
        dbNavFavs.classList.toggle('active', state.zapSourceTab === 'favorites');
    }

    const isDashboardVisible = state.isHomeActive && (state.currentModule === 'live' || state.currentModule === 'series' || state.currentModule === 'movies');
    if (!isDashboardVisible) {
        homeDashboard.classList.add('hidden');
        return;
    }

    homeDashboard.classList.remove('hidden');

    const vodControls = document.getElementById('vod-controls');
    const liveSearchContainer = document.getElementById('live-search-container');
    const dashboardFilters = document.getElementById('dashboard-filters');
    const vodFilterRow = document.getElementById('vod-filter-row');

    if (state.activeDashTab === "live") {
        if (vodControls) vodControls.classList.add('hidden');
        if (vodFilterRow) vodFilterRow.classList.add('hidden');
        if (liveSearchContainer) liveSearchContainer.classList.remove('hidden');
        if (dashboardFilters) dashboardFilters.classList.remove('hidden');
        favoritesGrid.classList.remove('vod-active');

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
                const epgText = epg ? epg.event : "Live broadcast";

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
    } else {
        if (vodControls) vodControls.classList.remove('hidden');
        if (vodFilterRow) vodFilterRow.classList.remove('hidden');
        if (liveSearchContainer) liveSearchContainer.classList.add('hidden');
        if (dashboardFilters) dashboardFilters.classList.add('hidden');
        favoritesGrid.classList.add('vod-active');

        renderVodControls();

        const pageItems = state.activeDashTab === "movies" ? state.fetchedMovies : state.fetchedSeries;
        const baseItems = state.vodFilterMode === "favorites"
            ? state.vodFavorites.filter(i => i && i.type === state.activeDashTab)
            : pageItems;

        updateVodYearOptions(baseItems);

        let items = baseItems;
        if (state.selectedVodRating !== "all") {
            const minRating = parseInt(state.selectedVodRating);
            items = items.filter(it => {
                const r = getVodRatingNumber(it);
                return r !== null && r >= minRating;
            });
        }
        if (state.selectedVodYear !== "all") {
            items = items.filter(it => getVodYear(it) === state.selectedVodYear);
        }

        const totalPages = state.vodFilterMode === "favorites"
            ? Math.ceil(items.length / state.VOD_ITEMS_PER_PAGE)
            : state.vodTotalPages;

        if (state.vodFilterMode === "favorites") {
            if (state.vodFavPage >= totalPages && totalPages > 0) state.vodFavPage = totalPages - 1;
        }

        favoritesGrid.innerHTML = '';

        if (items.length === 0) {
            favoritesGrid.innerHTML = `
                <div style="grid-column: 1 / span 5; display: flex; align-items: center; justify-content: center; height: 300px; color: var(--text-dim);">
                    ${state.vodFilterMode === "favorites" ? "No favorites to show." : "No titles found. Try a different search or filters."}
                </div>
            `;
            renderGridDots(0);
            return;
        }

        const visibleItems = state.vodFilterMode === "favorites"
            ? items.slice(state.vodFavPage * state.VOD_ITEMS_PER_PAGE, state.vodFavPage * state.VOD_ITEMS_PER_PAGE + state.VOD_ITEMS_PER_PAGE)
            : items.slice(0, state.VOD_ITEMS_PER_PAGE);

        const itemsToRender = visibleItems.length;
        for (let i = 0; i < itemsToRender; i++) {
            const item = visibleItems[i];
            const gridItem = document.createElement('div');
            gridItem.className = 'land-item vod-card stagger-reveal';
            gridItem.style.animationDelay = `${(i % 10) * 0.03}s`;

            if (item) {
                const qualityHtml = item.quality ? `<div class="vod-badge">${escapeHtml(item.quality)}</div>` : '';
                const badgeHtml = item.rating && item.rating !== "N/A" ? `<div class="vod-badge rating">★ ${escapeHtml(item.rating)}</div>` : '';
                const favActive = isVodFavorite(item);
                const posterSrc = item.posterHD || item.posterUrl || '';
                const safePosterUrl = posterSrc
                    ? sanitizeMediaUrl(posterSrc, { fallback: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=240&auto=format&fit=crop' })
                    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=240&auto=format&fit=crop';
                const safeTitle = escapeHtml(item.title);
                gridItem.innerHTML = `
                    <div class="vod-poster-container">
                        ${qualityHtml}
                        ${badgeHtml}
                        <button class="vod-fav-btn ${favActive ? 'active' : ''}" type="button" title="Favorito">
                            <i data-lucide="heart"></i>
                        </button>
                        <img src="${safePosterUrl}" alt="${safeTitle}" data-name="${safeTitle}" data-fallback-poster="1">
                    </div>
                    <div class="vod-info">
                        <h4>${safeTitle}</h4>
                    </div>
                `;
                gridItem.onclick = () => {
                    if (ext.showVodDetails) ext.showVodDetails(item);
                };
                gridItem.querySelector('.vod-fav-btn').onclick = (e) => {
                    e.stopPropagation();
                    toggleVodFavorite(item);
                };
            }
            favoritesGrid.appendChild(gridItem);
        }

        renderGridDots(totalPages);
        if (window.lucide) {
            window.lucide.createIcons({ nodes: [favoritesGrid] });
        }
    }
}

export function renderGridDots(totalPages) {
    const gridDots = document.getElementById('land-dots');
    if (!gridDots) return;
    gridDots.innerHTML = '';
    if (totalPages <= 1) return;

    const currentPage = state.activeDashTab === "live" ? state.favPage : getCurrentVodPageIndex();
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
        dot.onclick = async () => {
            if (state.activeDashTab === "live") {
                state.favPage = i;
                renderFavoritesGrid();
            } else {
                setCurrentVodPageIndex(i);
                if (state.vodFilterMode === "favorites") {
                    renderFavoritesGrid();
                } else {
                    if (ext.refreshVodContent) await ext.refreshVodContent();
                }
            }
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

    if (state.activeDashTab !== "live") return;

    const allFavs = getFilteredLiveChannels();

    const index = allFavs.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
        const targetPage = Math.floor(index / state.FAVS_PER_PAGE);
        if (state.favPage !== targetPage) {
            state.favPage = targetPage;
        }
    }
}
