import { state } from '../state/appState.js';
import { eventIconsList, mapIconToEmoji, getGenreIcon } from './filterState.js';
import { sanitizeIconName, escapeHtml, sanitizeMediaUrl } from '../utils/sanitize.js';
import { getPlaceholderHtml, TV_ICON_SVG } from '../utils/domHelpers.js';

let ext = {};

export function initFilterManager(dependencies) {
    ext = dependencies;
}

export function syncFilterList() {
    if (Array.isArray(state.filterLanguages)) {
        state.filterLanguages.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
    }
    if (Array.isArray(state.filterGenres)) {
        state.filterGenres.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
    }
    if (Array.isArray(state.seriesGenres)) {
        state.seriesGenres.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
    }
    if (Array.isArray(state.moviesGenres)) {
        state.moviesGenres.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
    }

    state.filterList = [
        { name: "All", icon: "layout-grid" },
        ...state.filterLanguages,
        ...state.filterGenres,
        ...state.filterEvents
    ];
    state.dropdownsPopulated = false;
}

export function populateDropdowns() {
    const languages = new Set((state.filterLanguages || []).filter(f => f.enabled !== false).map(f => f.name));
    const genres = new Set((state.filterGenres || []).map(f => f.name));
    const events = new Set((state.filterEvents || []).map(f => f.name));

    const getEventIconHtml = (eventName) => {
        const found = (state.filterEvents || []).find(f => f.name.toLowerCase() === eventName.toLowerCase());
        if (found && found.icon) {
            const isEmoji = /[^\x00-\x7F]/.test(found.icon) || found.icon.length <= 2;
            if (isEmoji) return found.icon;
        }
        return '';
    };

    const updateSelect = (ids, set, defaultText, isEvent = false) => {
        ids.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = `<option value="all">${defaultText}</option>`;
            const sortedArray = isEvent ? Array.from(set) : Array.from(set).sort();
            sortedArray.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;

                let displayText = val;
                if (isEvent) {
                    const emoji = getEventIconHtml(val);
                    if (emoji) displayText = emoji + ' ' + val;
                }
                opt.textContent = displayText;
                select.appendChild(opt);
            });
            if (currentVal && Array.from(set).includes(currentVal)) {
                select.value = currentVal;
            } else {
                select.value = 'all';
            }
        });
    };

    updateSelect(['filter-select-language'], languages, 'Todos');
    updateSelect(['filter-select-genre'], genres, 'Todos');
    updateSelect(['filter-select-event'], events, 'Todos', true);
    state.dropdownsPopulated = true;
    if (ext.initDashCustomSelects) ext.initDashCustomSelects();
}

export function matchesOnboardingLanguages(channel) {
    const enabledLanguages = (state.filterLanguages || []).filter(f => f.enabled !== false);

    if (enabledLanguages.length === 0) return true;

    const cats = (channel.categories || []).map(c => c.toLowerCase());
    const langNames = (state.filterLanguages || []).map(f => f.name.toLowerCase());
    const channelLangCats = cats.filter(cat => langNames.some(lang => cat.includes(lang.toLowerCase())));

    if (channelLangCats.length === 0) return true;

    return enabledLanguages.some(lang =>
        channelLangCats.some(cat => cat.includes(lang.name.toLowerCase()))
    );
}

export function getFilteredChannelsList(mode = 'channels', opts = {}) {
    const isFavoritesMode = mode === 'favorites';

    const term = opts.searchTerm !== undefined
        ? opts.searchTerm.toLowerCase().trim()
        : (isFavoritesMode ? state.favSearchTerm : state.searchTerm).toLowerCase().trim();

    const selLanguage = document.getElementById('filter-select-language')?.value || 'all';
    const selGenre = document.getElementById('filter-select-genre')?.value || 'all';
    const selEvent = document.getElementById('filter-select-event')?.value || 'all';

    let list = state.channels.filter(channel => {
        if (isFavoritesMode && !channel.favorite) return false;

        // Onboarding languages check (Tarea 18, 21)
        if (!matchesOnboardingLanguages(channel)) return false;

        // Block XXX channels unless explicitly unlocked
        if (localStorage.getItem('jtv_parental_adult_content') !== 'true') {
            const cats = (channel.categories || []).map(c => c.toLowerCase());
            if (cats.includes('xxx')) return false;
        }

        // Parental Lock automatic check (Tarea 19, 25)
        if (ext.isParentalTimeLocked && ext.isParentalTimeLocked()) {
            const cats = (channel.categories || []).map(c => c.toLowerCase());
            const isKids = cats.includes('kids') || cats.includes('niños');
            if (!isKids && !channel.kidsAllowed) return false;
        }

        // Search engine multicriterio (Tarea 16, EPG / ID / Name)
        const nameLower = (channel.name || "").toLowerCase();
        const idStr = (channel.id || "").toString().toLowerCase();
        const epg = ext.getActiveEpg ? ext.getActiveEpg(channel.id) : null;
        const epgEvent = epg ? epg.event.toLowerCase() : "";
        
        const matchesSearch = nameLower.includes(term) || idStr.includes(term) || epgEvent.includes(term);
        if (!matchesSearch) return false;

        // Dynamic select dropdown categories check (Tarea 29)
        const cats = channel.categories || [];
        if (selLanguage !== 'all' && !cats.includes(selLanguage)) return false;
        if (selGenre !== 'all' && !cats.includes(selGenre)) return false;
        if (selEvent !== 'all' && !cats.includes(selEvent)) return false;

        return true;
    });

    if (/^\d+$/.test(term)) {
        list.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    } else if (isFavoritesMode) {
        list.sort((a, b) => {
            const diff = (b.watchTime || 0) - (a.watchTime || 0);
            if (diff !== 0) return diff;
            return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: 'base', numeric: true });
        });
    } else {
        list.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: 'base', numeric: true }));
    }

    return list;
}

export function autoCategorizeChannels() {
    const filterMap = new Map();
    const allFilters = [...(state.filterLanguages || []), ...(state.filterGenres || []), ...(state.filterEvents || [])];
    allFilters.forEach(f => {
        if (f && f.name) {
            filterMap.set(f.name.toLowerCase().trim(), f.name);
        }
    });

    function findFilter(keywords) {
        for (const f of allFilters) {
            const fname = f.name.toLowerCase();
            for (const kw of keywords) {
                if (fname === kw || fname.includes(kw) || kw.includes(fname)) {
                    return f.name;
                }
            }
        }
        return null;
    }

    state.channels.forEach(c => {
        if (!c.categories) c.categories = [];
        c.categories = c.categories.filter(cat => {
            const norm = cat.toLowerCase().trim();
            return norm === 'all' || filterMap.has(norm);
        }).map(cat => {
            const norm = cat.toLowerCase().trim();
            return norm === 'all' ? 'all' : filterMap.get(norm);
        });

        if (c.categories.length === 0 || (c.categories.length === 1 && c.categories[0] === "all")) {
            const name = (c.name || "").toLowerCase();
            const cats = new Set(["all"]);

            const movieFilter = findFilter(["películas", "peliculas", "movies", "movie", "cine"]);
            if (movieFilter && (name.includes("movie") || name.includes("hbo") || name.includes("cinema") || name.includes("cine"))) {
                cats.add(movieFilter);
            }

            const sportFilter = findFilter(["deportes", "deporte", "sports", "sport"]);
            if (sportFilter && (name.includes("sport") || name.includes("espn") || name.includes("sky") || name.includes("arena") || name.includes("tudn"))) {
                cats.add(sportFilter);
            }

            const newsFilter = findFilter(["noticias", "noticia", "news"]);
            if (newsFilter && (name.includes("news") || name.includes("cnn") || name.includes("bbc") || name.includes("24h"))) {
                cats.add(newsFilter);
            }

            const kidsFilter = findFilter(["infantiles", "infantil", "kids", "kid"]);
            if (kidsFilter && (name.includes("kid") || name.includes("nick") || name.includes("disney") || name.includes("cartoon"))) {
                cats.add(kidsFilter);
            }

            const musicFilter = findFilter(["música", "musica", "music"]);
            if (musicFilter && (name.includes("music") || name.includes("mtv") || name.includes("vh1"))) {
                cats.add(musicFilter);
            }

            const englishFilter = findFilter(["english", "inglés", "ingles", "usa", "uk"]);
            if (englishFilter && (name.includes("usa") || name.includes("uk") || name.includes("english"))) {
                cats.add(englishFilter);
            }

            const spanishFilter = findFilter(["español", "espanol", "spanish", "hispanic", "latino"]);
            if (spanishFilter && (name.includes("hispanic") || name.includes("espn") || name.includes("star") || name.includes("latino") || name.includes("mx"))) {
                cats.add(spanishFilter);
            }

            c.categories = Array.from(cats);
        }
        if (!c.categories.includes('all')) {
            c.categories.push('all');
        }
    });
}

export function sortCategories(cats) {
    if (!cats) return [];
    const sorted = [...cats];
    const langNames = (state.filterLanguages || []).map(f => f.name.toLowerCase());
    const genreNames = (state.filterGenres || []).map(f => f.name.toLowerCase());
    const eventNames = (state.filterEvents || []).map(f => f.name.toLowerCase());
    
    sorted.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        
        if (aLower === 'all') return -1;
        if (bLower === 'all') return 1;
        
        let aGroup = 99;
        if (langNames.includes(aLower)) aGroup = 1;
        else if (genreNames.includes(aLower)) aGroup = 2;
        else if (eventNames.includes(aLower)) aGroup = 3;
        
        let bGroup = 99;
        if (langNames.includes(bLower)) bGroup = 1;
        else if (genreNames.includes(bLower)) bGroup = 2;
        else if (eventNames.includes(bLower)) bGroup = 3;
        
        if (aGroup !== bGroup) {
            return aGroup - bGroup;
        }
        return aLower.localeCompare(bLower);
    });
    return sorted;
}

export function removeSettingsFilter(type, filterName) {
    const systemLanguages = ["Español / Latino", "English", "European", "Middle East"];
    const systemGenres = ["Movies", "Sports", "Comedy", "Reality", "Food", "News", "Documentary", "Kids", "Others"];
    const isSystem = (type === 'language' && systemLanguages.includes(filterName)) ||
                     ((type === 'genre' || type === 'series' || type === 'movies') && systemGenres.includes(filterName));

    const devState = window.getDeveloperState ? window.getDeveloperState() : null;
    const isDevMode = devState ? !!devState.developerModeEnabled : false;

    if (isSystem && !isDevMode) {
        console.warn(`[FilterManager] Intento de eliminar filtro del sistema bloqueado: ${filterName} (${type})`);
        return;
    }

    if (type === 'language') {
        state.filterLanguages = state.filterLanguages.filter(f => f.name !== filterName);
    } else if (type === 'genre') {
        state.filterGenres = state.filterGenres.filter(f => f.name !== filterName);
    } else if (type === 'event') {
        state.filterEvents = state.filterEvents.filter(f => f.name !== filterName);
    } else if (type === 'series') {
        state.seriesGenres = state.seriesGenres.filter(f => f.name !== filterName);
    } else if (type === 'movies') {
        state.moviesGenres = state.moviesGenres.filter(f => f.name !== filterName);
    }
    
    // Limpieza profunda de categorías en canales locales
    state.channels.forEach(channel => {
        if (channel.categories) {
            channel.categories = channel.categories.filter(c => c.toLowerCase() !== filterName.toLowerCase());
            if (channel.categories.length === 0) {
                channel.categories = ["all"];
            }
        }
    });
    
    syncFilterList();
    if (ext.renderAll) ext.renderAll();
    if (ext.saveAppState) ext.saveAppState(true);
}

export function removeFilter(filterName) {
    if (state.activeSettingsFilterTab === "series") {
        state.seriesGenres = state.seriesGenres.filter(g => g.name !== filterName);
    } else if (state.activeSettingsFilterTab === "movies") {
        state.moviesGenres = state.moviesGenres.filter(g => g.name !== filterName);
    }
    if (ext.renderAll) ext.renderAll();
    if (ext.saveAppState) ext.saveAppState(true);
}

export function updateEventIconSelectBtnColor(btn, iconName) {
    if (!btn || btn.id !== 'event-icon-select-btn') return;
    const found = eventIconsList.find(i => i.name === iconName);
    if (found) {
        btn.style.color = found.color;
    } else {
        btn.style.color = '';
    }
}

export function renderChannelFiltersManager(channel) {
    const channelFiltersManager = document.getElementById('channel-filters-manager');
    if (!channelFiltersManager) return;
    channelFiltersManager.innerHTML = '';
    
    // Combinar todos los grupos de filtros para buscar iconos correspondientes
    const allFilters = [...state.filterLanguages, ...state.filterGenres, ...state.filterEvents];

    const sortedCats = sortCategories(channel.categories || []);

    sortedCats.forEach(catName => {
        const isAll = catName.toLowerCase() === 'all';
        const filter = allFilters.find(f => f.name.toLowerCase() === catName.toLowerCase()) || { icon: 'tag', name: catName };
        const chip = document.createElement('div');
        chip.className = 'settings-chip';
        
        if (isAll) {
            chip.innerHTML = `
                <i data-lucide="tv"></i>
                <span>${filter.name}</span>
            `;
        } else {
            const isEmoji = (filter.icon && /[^\x00-\x7F]/.test(filter.icon)) || (filter.icon && filter.icon.length <= 2);
            chip.innerHTML = `
                ${isEmoji 
                    ? `<span class="emoji-icon" style="font-size: 14px; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-right: 4px;">${filter.icon}</span>`
                    : `<i data-lucide="${filter.icon}"></i>`}
                <span>${filter.name || catName}</span>
                <button class="remove-btn" onclick="removeFilterFromChannel('${catName}')"><i data-lucide="x"></i></button>
            `;
        }
        channelFiltersManager.appendChild(chip);
    });

    const addFilterToChannel = document.getElementById('add-filter-to-channel');
    if (!addFilterToChannel) return;
    addFilterToChannel.innerHTML = '<option value="">+ Add Filter...</option>';
    
    // Agrupar las opciones disponibles por tipo usando optgroups premium
    const langGroup = document.createElement('optgroup');
    langGroup.label = "Idiomas";
    state.filterLanguages.forEach(f => {
        if (!channel.categories.map(c => c.toLowerCase()).includes(f.name.toLowerCase())) {
            const opt = document.createElement('option');
            opt.value = f.name;
            opt.textContent = f.name;
            langGroup.appendChild(opt);
        }
    });
    if (langGroup.children.length > 0) addFilterToChannel.appendChild(langGroup);

    const genreGroup = document.createElement('optgroup');
    genreGroup.label = "Géneros";
    state.filterGenres.forEach(f => {
        if (!channel.categories.map(c => c.toLowerCase()).includes(f.name.toLowerCase())) {
            const opt = document.createElement('option');
            opt.value = f.name;
            opt.textContent = f.name;
            genreGroup.appendChild(opt);
        }
    });
    if (genreGroup.children.length > 0) addFilterToChannel.appendChild(genreGroup);

    const eventGroup = document.createElement('optgroup');
    eventGroup.label = "Eventos";
    state.filterEvents.forEach(f => {
        if (!channel.categories.map(c => c.toLowerCase()).includes(f.name.toLowerCase())) {
            const opt = document.createElement('option');
            opt.value = f.name;
            opt.textContent = f.name;
            eventGroup.appendChild(opt);
        }
    });
    if (eventGroup.children.length > 0) addFilterToChannel.appendChild(eventGroup);

    if (ext.syncCustomSelect) ext.syncCustomSelect(addFilterToChannel);
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

export function bindAddFilterToChannel({ getChannels, getCurrentEditingChannelId, renderAll }) {
    const addFilterToChannel = document.getElementById('add-filter-to-channel');
    if (!addFilterToChannel) return;
    addFilterToChannel.onchange = (e) => {
        const catName = e.target.value;
        if (!catName) return;
        const channel = getChannels().find(c => String(c.id) === String(getCurrentEditingChannelId()));
        if (channel && !channel.categories.includes(catName)) {
            channel.categories.push(catName);
            renderChannelFiltersManager(channel);
            renderAll();
            e.target.value = "";
        }
    };
}

export function removeFilterFromChannel(catName) {
    const channels = state.channels;
    const channel = channels.find(c => String(c.id) === String(state.currentEditingChannelId));
    if (channel) {
        if (catName.toLowerCase() === 'all') {
            alert('El filtro "All" es obligatorio para todos los canales y no puede ser removido.');
            return;
        }
        channel.categories = channel.categories.filter(c => c !== catName);
        if (channel.categories.length === 0) channel.categories = ["all"];
        renderChannelFiltersManager(channel);
        if (ext.renderAll) ext.renderAll();
    }
}

export function startEditingFilter(type, filter) {
    let inputId, selectBtnId, addBtnId;
    if (type === 'language') {
        inputId = 'add-lang-input';
        addBtnId = 'add-lang-btn';
    } else if (type === 'genre') {
        inputId = 'add-genre-input';
        selectBtnId = 'genre-icon-select-btn';
        addBtnId = 'add-genre-btn';
    } else if (type === 'event') {
        inputId = 'add-event-input';
        selectBtnId = 'event-icon-select-btn';
        addBtnId = 'add-event-btn';
    } else if (type === 'series') {
        inputId = 'add-series-input';
        selectBtnId = 'series-icon-select-btn';
        addBtnId = 'add-series-btn';
    } else if (type === 'movies') {
        inputId = 'add-movies-input';
        selectBtnId = 'movies-icon-select-btn';
        addBtnId = 'add-movies-btn';
    }

    const input = document.getElementById(inputId);
    const addBtn = document.getElementById(addBtnId);
    if (!input || !addBtn) return;

    input.value = filter.name;
    input.focus();
    
    const clearBtnId = inputId.replace('add-', 'clear-');
    const clearBtn = document.getElementById(clearBtnId);
    if (clearBtn) {
        clearBtn.classList.remove('hidden');
    }

    if (selectBtnId) {
        const selectBtn = document.getElementById(selectBtnId);
        if (selectBtn) {
            selectBtn.setAttribute('data-selected-icon', filter.icon);
            const isEmoji = (filter.icon && /[^\x00-\x7F]/.test(filter.icon)) || (filter.icon && filter.icon.length <= 2);
            selectBtn.innerHTML = isEmoji
                ? `<span class="emoji-icon" style="font-size: 16px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;">${filter.icon}</span>`
                : `<i data-lucide="${sanitizeIconName(filter.icon)}"></i>`;
            if (selectBtnId === 'event-icon-select-btn') {
                updateEventIconSelectBtnColor(selectBtn, filter.icon);
            }
        }
    }

    addBtn.innerHTML = `<i data-lucide="check"></i>`;
    addBtn.setAttribute('title', 'Guardar filtro');
    addBtn.setAttribute('data-tooltip', 'Guardar filtro');
    if (window.lucide) window.lucide.createIcons();

    state.editingFilter = {
        type: type,
        originalName: filter.name,
        inputId: inputId,
        addBtnId: addBtnId,
        selectBtnId: selectBtnId
    };
}
