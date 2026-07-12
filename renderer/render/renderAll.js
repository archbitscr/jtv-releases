import { state } from '../state/appState.js';
import { sanitizeIconName, escapeHtml } from '../utils/sanitize.js';
import { syncFilterList } from '../filters/filterManager.js';
import { emojiToHtml } from '../filters/filterState.js';
import { saveChannelsAndFilters } from '../services/stateManager.js';
import Sortable from 'sortablejs';

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

export function renderFilters() {}

export function renderFavFilters() {}

export function renderDashboardFilters() {}

export function renderSettingsFilters() {
    const langContainer = document.getElementById('list-filter-languages');
    const genreContainer = document.getElementById('list-filter-genres');
    const eventContainer = document.getElementById('list-filter-events');
    const renderFilterGroupList = (container, list, type) => {
        if (!container) return;
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = `<div class="empty-list-msg">No filters defined</div>`;
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
                             (type === 'genre' && systemGenres.includes(filter.name));

            // Genre is read-only in user mode; language add/delete controls
            // are hidden at the card level but checkboxes remain functional.
            const readOnlyType = !isDevMode && (type === 'genre' || type === 'language');
            const showControls = readOnlyType ? false : (isDevMode || !isSystem);

            item.innerHTML = `
                <div class="item-details">
                    ${isEmoji
                        ? `<span class="emoji-icon">${emojiToHtml(filter.icon)}</span>`
                        : `<i data-lucide="${sanitizeIconName(filter.icon)}" style="color: ${iconColor} !important;"></i>`}
                    <span>${escapeHtml(filter.name)}</span>
                </div>
                ${showControls ? `
                <div class="filter-item-controls" onclick="event.stopPropagation();">
                    <button class="remove-btn" type="button" title="Delete"><i data-lucide="x"></i></button>
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
            if (type === 'language') {
                const enabledCheckbox = document.createElement('input');
                enabledCheckbox.type = 'checkbox';
                enabledCheckbox.className = 'filter-lang-enabled';
                enabledCheckbox.checked = filter.enabled !== false;
                enabledCheckbox.title = 'Toggle language';
                enabledCheckbox.classList.add('filter-lang-checkbox');
                enabledCheckbox.addEventListener('change', async (e) => {
                    e.stopPropagation();
                    filter.enabled = e.target.checked;
                    const langInState = state.filterLanguages.find(f => f.name === filter.name);
                    if (langInState) langInState.enabled = e.target.checked;
                    await saveChannelsAndFilters();
                    state.dropdownsPopulated = false;
                    renderAll();
                });
                item.insertBefore(enabledCheckbox, item.firstChild);
            }
            container.appendChild(item);
        });
    };

    renderFilterGroupList(langContainer, state.filterLanguages, 'language');
    renderFilterGroupList(genreContainer, state.filterGenres, 'genre');
    renderFilterGroupList(eventContainer, state.filterEvents, 'event');
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
        const hasTuned = !!state.activeChannelId;
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

    // Destruir instancia anterior si existe
    if (container._sortable) {
        container._sortable.destroy();
        container._sortable = null;
    }

    container._sortable = new Sortable(container, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        handle: '.filter-list-item',
        onEnd: async (evt) => {
            if (evt.oldIndex === evt.newIndex) return;
            const reordered = [...state.filterEvents];
            const [moved] = reordered.splice(evt.oldIndex, 1);
            reordered.splice(evt.newIndex, 0, moved);
            state.filterEvents = reordered;
            syncFilterList();
            await saveChannelsAndFilters();
            renderSettingsFilters();
            if (ext.populateDropdowns) ext.populateDropdowns();
        }
    });
}
