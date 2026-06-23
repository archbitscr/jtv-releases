import { state } from '../state/appState.js';
import { sanitizeIconName, escapeHtml } from '../utils/sanitize.js';
import { syncFilterList } from '../filters/filterManager.js';
import { saveChannelsAndFilters } from '../services/stateManager.js';

let ext = {};

export function initRenderAll(dependencies) {
    ext = dependencies;
}

let lastStateCache = {
    channelsLength: 0,
    searchTerm: null,
    favSearchTerm: null,
    scheduleLength: 0,
    guideSearchTerm: null,
    guideFilter: null
};

export function renderFilters() {
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (!clearFiltersBtn) return;
    const selLanguage = document.getElementById('filter-select-language')?.value || 'all';
    const selGenre = document.getElementById('filter-select-genre')?.value || 'all';
    const selEvent = document.getElementById('filter-select-event')?.value || 'all';
    
    let activeCount = 0;
    if (selLanguage !== 'all') activeCount++;
    if (selGenre !== 'all') activeCount++;
    if (selEvent !== 'all') activeCount++;
    
    const hasActiveFilters = activeCount > 0;
    clearFiltersBtn.classList.toggle('hidden', !hasActiveFilters);
    
    const badge = document.getElementById('filters-badge');
    if (badge) {
        badge.textContent = activeCount;
        badge.classList.toggle('hidden', !hasActiveFilters);
    }
}

export function renderFavFilters() {
    const favClearFiltersBtn = document.getElementById('fav-clear-filters-btn');
    if (!favClearFiltersBtn) return;
    const selLanguage = document.getElementById('fav-filter-select-language')?.value || 'all';
    const selGenre = document.getElementById('fav-filter-select-genre')?.value || 'all';
    const selEvent = document.getElementById('fav-filter-select-event')?.value || 'all';
    
    let activeCount = 0;
    if (selLanguage !== 'all') activeCount++;
    if (selGenre !== 'all') activeCount++;
    if (selEvent !== 'all') activeCount++;
    
    const hasActiveFilters = activeCount > 0;
    favClearFiltersBtn.classList.toggle('hidden', !hasActiveFilters);
    
    const badge = document.getElementById('fav-filters-badge');
    if (badge) {
        badge.textContent = activeCount;
        badge.classList.toggle('hidden', !hasActiveFilters);
    }
}

export function renderDashboardFilters() {}

export function renderSettingsFilters() {
    const langContainer = document.getElementById('list-filter-languages');
    const genreContainer = document.getElementById('list-filter-genres');
    const eventContainer = document.getElementById('list-filter-events');
    const seriesContainer = document.getElementById('list-filter-series');
    const moviesContainer = document.getElementById('list-filter-movies');
    
    const renderFilterGroupList = (container, list, type) => {
        if (!container) return;
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = `<div class="empty-list-msg">No hay filtros definidos</div>`;
            return;
        }
        list.forEach(filter => {
            const item = document.createElement('div');
            item.className = 'filter-list-item';
            item.style.cursor = 'pointer';
            if (type === 'event') {
                item.setAttribute('draggable', 'true');
                item.setAttribute('data-filter-name', filter.name);
            }
            const iconColor = type === 'event' ? (ext.getEventIconColor ? ext.getEventIconColor(filter.icon) : '#3b82f6') : '#3b82f6';
            const isEmoji = (filter.icon && /[^\x00-\x7F]/.test(filter.icon)) || (filter.icon && filter.icon.length <= 2);

            const devState = window.getDeveloperState ? window.getDeveloperState() : null;
            const isDevMode = devState ? !!devState.developerModeEnabled : false;

            const systemLanguages = ["Español / Latino", "English", "European", "Middle East"];
            const systemGenres = ["Movies", "Sports", "Comedy", "Reality", "Food", "News", "Documentary", "Kids", "Others"];
            const isSystem = (type === 'language' && systemLanguages.includes(filter.name)) ||
                             ((type === 'genre' || type === 'series' || type === 'movies') && systemGenres.includes(filter.name));

            const showControls = isDevMode || !isSystem;

            item.innerHTML = `
                <div class="item-details" style="flex: 1; display: flex; align-items: center; gap: 6px;">
                    ${isEmoji 
                        ? `<span class="emoji-icon" style="font-size: 14px; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px;">${filter.icon}</span>`
                        : `<i data-lucide="${sanitizeIconName(filter.icon)}" style="color: ${iconColor} !important;"></i>`}
                    <span>${escapeHtml(filter.name)}</span>
                </div>
                ${showControls ? `
                <div style="display: flex; gap: 4px; align-items: center;" onclick="event.stopPropagation();">
                    <button class="remove-btn" type="button" title="Eliminar"><i data-lucide="x"></i></button>
                </div>
                ` : ''}
            `;
            if (showControls) {
                item.onclick = () => {
                    if (ext.startEditingFilter) ext.startEditingFilter(type, filter);
                };
                const removeBtn = item.querySelector('.remove-btn');
                if (removeBtn) {
                    removeBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (ext.removeSettingsFilter) ext.removeSettingsFilter(type, filter.name);
                    };
                }
            } else {
                item.style.cursor = 'default';
            }
            container.appendChild(item);
        });
    };
    
    renderFilterGroupList(langContainer, state.filterLanguages, 'language');
    renderFilterGroupList(genreContainer, state.filterGenres, 'genre');
    renderFilterGroupList(eventContainer, state.filterEvents, 'event');
    renderFilterGroupList(seriesContainer, state.seriesGenres, 'series');
    renderFilterGroupList(moviesContainer, state.moviesGenres, 'movies');
    
    if (ext.initIconPickers) ext.initIconPickers();
    
    const settingsScreen = document.getElementById('settings-screen');
    if (window.lucide && settingsScreen) {
        window.lucide.createIcons({ nodes: [settingsScreen] });
    }

    // Initialize Event Drag & Drop
    initEventsDragAndDrop();

    // Update Assigner Events and Channels lists
    if (ext.initEventAssigner && ext.renderAssignerEvents && ext.renderAssignerChannelsList) {
        if (!window.eventAssignerInitialized) {
            ext.initEventAssigner();
            window.eventAssignerInitialized = true;
        }
        ext.renderAssignerEvents();
        ext.renderAssignerChannelsList();
    }
}

export function renderAll(force = false) {
    if (!state.dropdownsPopulated && ext.populateDropdowns) {
        ext.populateDropdowns();
    }
    renderFilters();
    renderFavFilters();
    renderDashboardFilters();

    const filtered = ext.getFilteredChannelsList ? ext.getFilteredChannelsList('channels') : [];
    const favorites = ext.getFilteredChannelsList ? ext.getFilteredChannelsList('favorites') : [];

    const allChannelsList = document.getElementById('all-channels-list');
    const favoritesList = document.getElementById('favorites-list');

    // Performance Optimization: Fragmented renders (dirty checking)
    const channelsChanged = force || lastStateCache.channelsLength !== state.channels.length;
    
    if (channelsChanged || lastStateCache.searchTerm !== state.searchTerm) {
        if (ext.renderList && allChannelsList) {
            ext.renderList(allChannelsList, filtered, state.searchTerm);
        }
    }

    if (channelsChanged || lastStateCache.favSearchTerm !== state.favSearchTerm) {
        if (ext.renderList && favoritesList) {
            ext.renderList(favoritesList, favorites, state.favSearchTerm);
        }
    }

    if (ext.renderFavoritesGrid) {
        ext.renderFavoritesGrid();
    }
    
    renderSettingsFilters();

    const scheduleChanged = force || lastStateCache.scheduleLength !== state.scheduleData.length;
    if (scheduleChanged || lastStateCache.guideSearchTerm !== state.guideSearchTerm || lastStateCache.guideFilter !== state.guideFilter) {
        if (ext.renderGuide) {
            ext.renderGuide();
        }
    }

    const menuTuningHint = document.getElementById('menu-tuning-hint');
    if (menuTuningHint) {
        const hasTuned = state.activeChannelId && !state.isVodPlaying;
        menuTuningHint.classList.toggle('hidden', !!hasTuned);
    }

    // Update Cache
    lastStateCache.channelsLength = state.channels.length;
    lastStateCache.searchTerm = state.searchTerm;
    lastStateCache.favSearchTerm = state.favSearchTerm;
    lastStateCache.scheduleLength = state.scheduleData.length;
    lastStateCache.guideSearchTerm = state.guideSearchTerm;
    lastStateCache.guideFilter = state.guideFilter;
}

export function initEventsDragAndDrop() {
    const container = document.getElementById('list-filter-events');
    if (!container) return;

    let dragSrcIndex = null;
    let dragSrcEl = null;

    function getItems() {
        return Array.from(container.querySelectorAll('.filter-list-item[draggable="true"]'));
    }

    function clearIndicators() {
        getItems().forEach(el => {
            el.style.borderTop = '';
            el.style.borderBottom = '';
            el.style.opacity = '';
        });
    }

    container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.filter-list-item[draggable="true"]');
        if (!item) return;
        dragSrcEl = item;
        dragSrcIndex = getItems().indexOf(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragSrcIndex);
        setTimeout(() => { item.style.opacity = '0.4'; }, 0);
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const item = e.target.closest('.filter-list-item[draggable="true"]');
        if (!item || item === dragSrcEl) return;
        clearIndicators();
        dragSrcEl.style.opacity = '0.4';
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
            item.style.borderTop = '2px solid #00ffcc';
        } else {
            item.style.borderBottom = '2px solid #00ffcc';
        }
    });

    container.addEventListener('dragleave', (e) => {
        if (!container.contains(e.relatedTarget)) clearIndicators();
    });

    container.addEventListener('dragend', () => {
        clearIndicators();
        dragSrcEl = null;
        dragSrcIndex = null;
    });

    container.addEventListener('drop', async (e) => {
        e.preventDefault();
        const item = e.target.closest('.filter-list-item[draggable="true"]');
        if (!item || item === dragSrcEl) { clearIndicators(); return; }

        const items = getItems();
        const targetIndex = items.indexOf(item);
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const insertAfter = e.clientY >= mid;

        clearIndicators();

        const reordered = [...state.filterEvents];
        const [movedItem] = reordered.splice(dragSrcIndex, 1);
        const finalIndex = dragSrcIndex < targetIndex
            ? (insertAfter ? targetIndex : targetIndex - 1)
            : (insertAfter ? targetIndex + 1 : targetIndex);
        reordered.splice(finalIndex, 0, movedItem);
        state.filterEvents = reordered;

        syncFilterList();
        await saveChannelsAndFilters();
        renderSettingsFilters();
        if (ext.populateDropdowns) ext.populateDropdowns();
    });
}
