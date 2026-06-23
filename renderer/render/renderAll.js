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

    // Remover draggable de items existentes (ya no se usa HTML5 drag)
    container.querySelectorAll('.filter-list-item[draggable]').forEach(el => {
        el.removeAttribute('draggable');
    });

    let dragState = null;
    let ghost = null;
    let placeholder = null;
    let rafId = null;

    function getItems() {
        return Array.from(container.querySelectorAll('.filter-list-item'));
    }

    function createGhost(el, x, y) {
        const rect = el.getBoundingClientRect();
        ghost = el.cloneNode(true);
        ghost.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.95;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            border: 1px solid rgba(0,255,204,0.5) !important;
            border-radius: 8px;
            transition: none;
        `;
        document.body.appendChild(ghost);
        return { offsetX: x - rect.left, offsetY: y - rect.top };
    }

    function createPlaceholder(el) {
        placeholder = document.createElement('div');
        placeholder.style.cssText = `
            height: ${el.offsetHeight}px;
            background: rgba(0,255,204,0.08);
            border: 2px dashed rgba(0,255,204,0.4);
            border-radius: 8px;
            margin: 2px 0;
            pointer-events: none;
        `;
        return placeholder;
    }

    function getDropTarget(y) {
        const items = getItems().filter(el => el !== dragState.el && el !== placeholder);
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            if (y < rect.bottom) {
                const mid = rect.top + rect.height / 2;
                return { el: item, before: y < mid };
            }
        }
        return { el: items[items.length - 1], before: false };
    }

    container.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.filter-list-item');
        if (!handle) return;
        // Solo iniciar si click no es en botón interno
        if (e.target.closest('button, input, select, a')) return;

        e.preventDefault();
        const items = getItems();
        const srcIndex = items.indexOf(handle);

        const { offsetX, offsetY } = createGhost(handle, e.clientX, e.clientY);
        createPlaceholder(handle);
        handle.parentNode.insertBefore(placeholder, handle);
        handle.style.display = 'none';

        dragState = { el: handle, srcIndex, offsetX, offsetY };
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragState || !ghost) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            ghost.style.left = (e.clientX - dragState.offsetX) + 'px';
            ghost.style.top = (e.clientY - dragState.offsetY) + 'px';

            const target = getDropTarget(e.clientY);
            if (target.el) {
                if (target.before) {
                    target.el.parentNode.insertBefore(placeholder, target.el);
                } else {
                    target.el.parentNode.insertBefore(placeholder, target.el.nextSibling);
                }
            }
        });
    });

    document.addEventListener('mouseup', async (e) => {
        if (!dragState) return;

        // Insertar elemento en la posición del placeholder
        placeholder.parentNode.insertBefore(dragState.el, placeholder);
        dragState.el.style.display = '';

        // Limpiar
        if (ghost) ghost.remove();
        if (placeholder) placeholder.remove();
        ghost = null;
        placeholder = null;
        if (rafId) cancelAnimationFrame(rafId);

        // Leer nuevo orden del DOM
        const newOrder = getItems().map(el => el.dataset.filterName);
        const reordered = newOrder
            .map(name => state.filterEvents.find(f => f.name === name))
            .filter(Boolean);

        if (reordered.length === state.filterEvents.length) {
            state.filterEvents = reordered;
            syncFilterList();
            await saveChannelsAndFilters();
            renderSettingsFilters();
            if (ext.populateDropdowns) ext.populateDropdowns();
        }
        dragState = null;
    });
}
