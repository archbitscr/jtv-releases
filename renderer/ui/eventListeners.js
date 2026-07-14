/* global lucide */
import { state } from '../state/appState.js';
import { applyLocale, getCurrentLang, t } from '../i18n/i18n.js';
import { selectChannel, zapChannel, mountRemotePlayer, updatePlayerActiveState } from '../player/playerController.js';
import { showModule, switchTab, showLiveLanding, hideMenu, hideEditPane } from '../ui/navigation.js';
import { syncMenuScroll } from '../render/channelList.js';
import { startInactivityTimers, clearInactivityTimers, startCursorTimer } from '../ui/inactivity.js';
import { applyWallpaper } from '../settings/wallpaper.js';
import { syncFilterList, populateDropdowns, removeSettingsFilter, updateEventIconSelectBtnColor } from '../filters/filterManager.js';
import { emojiToHtml } from '../filters/filterState.js';
import { syncCustomSelect, initDashCustomSelects } from '../utils/customSelect.js';
import { initIconPickers } from '../utils/iconPicker.js';
import { initCustomTooltips } from '../utils/tooltips.js';
import { syncCenterNavWidth, checkResolution, updateFullscreenButton, toggleAppFullscreen, getActiveSidebarTab, getCurrentNavigationChannels, isEditableElement, handleResizeDimensions } from '../ui/layout.js';
// sensors.js is dev-only: loaded dynamically in renderer.js dev block; called via window.updateSensorsUI?.()
import { updateTriggersVisibility } from '../ui/triggersVisibility.js';
import { adjustVolume, toggleMute, updateVolumeUI } from '../ui/volumeController.js';
import { saveAppState } from '../services/stateManager.js';
import { syncChannels } from '../services/channelSync.js';
import { checkValidity, updateEditLogo } from '../ui/editPane.js';
import { setSettingsFilterTab, setConnectivityTab, setChannelsTab, setGeneralTab } from '../settings/settingsTabs.js';
import { renderAll, renderSettingsFilters } from '../render/renderAll.js';
import { processLogo } from '../utils/domHelpers.js';
import { renderChannelFiltersManager, removeFilterFromChannel, bindAddFilterToChannel } from '../filters/filterManager.js';
import { selectAssignerChannelMultiple, renderAssignerChannelsList, renderAssignerEvents, initEventAssigner } from '../filters/filterAssigner.js';
import { showNoSignalOverlay, triggerFailover, stopNoSignalRetryLoop } from '../player/failover.js';
import { updateSourceSwitcherUI } from '../player/sourceSwitcher.js';
import { renderFavoritesGrid, getFilteredLiveChannels } from '../render/favoritesGrid.js';
// developerModule.js is dev-only: loaded dynamically in renderer.js dev block; called via window.updateDeveloperUI?.()

export function setupEventListeners() {
    // Local handle to the preload-exposed jtvAPI (preload injects window.jtvAPI)
    const nativeApi = window.jtvAPI;

    // Buffer local mutable que reusa el array de state; permite reasignar
    // sin tocar el estado global (p.ej. channels = channels.filter(...)).
    let channels = state.channels;

    // DOM Element Declarations to avoid ReferenceErrors in ES Modules
    const triggerLeft = document.getElementById('trigger-left');
    const triggerBottom = document.getElementById('trigger-bottom');
    const triggerRight = document.getElementById('trigger-right');
    const triggerTop = document.getElementById('trigger-top');
    const mainMenu = document.getElementById('side-menu');
    const sourceSwitcher = document.getElementById('pbar');
    const topNavMenu = document.getElementById('tnav-menu');
    const gridPrevBtn = document.getElementById('land-prev');
    const gridNextBtn = document.getElementById('land-next');
    const gridDots = document.getElementById('land-dots');
    const favoritesGrid = document.getElementById('land-grid');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const allChannelsList = document.getElementById('all-channels-list');
    const favoritesList = document.getElementById('favorites-list');
    const guideSearchInput = document.getElementById('guide-search-input');
    const guideFiltersChips = document.querySelectorAll('.guide-filter-chip');
    const logoUploadInput = document.getElementById('logo-upload-input');
    const logoCanvas = document.getElementById('logo-canvas');
    const editUploadBtn = document.getElementById('edit-upload-btn');
    const editFavToggle = document.getElementById('edit-fav-toggle');
    const tunerUpBtn = document.getElementById('pbar-up');
    const tunerDownBtn = document.getElementById('pbar-down');
    const tunerFavHeart = document.getElementById('pbar-fav-heart');
    const editNameInput = document.getElementById('edit-name-input');
    const editIdInput = document.getElementById('edit-id-input');
    const editStreamInput = document.getElementById('edit-stream-input');
    const globalDomainInput = document.getElementById('global-domain-input');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiEndpointInput = document.getElementById('api-endpoint-input');
    const autoDomainToggle = document.getElementById('auto-domain-toggle');
    const minimizeToTrayToggle = document.getElementById('minimize-to-tray-toggle');
    const preventSleepToggle = document.getElementById('prevent-sleep-toggle');

    let lastTypingState = false;

    function isTypingElement(el) {
        if (!el) return false;
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return true;
        if (el.isContentEditable) return true;
        return false;
    }

    function syncTypingState() {
        const active = document.activeElement;
        const nextState = isTypingElement(active);
        if (nextState === lastTypingState) return;
        lastTypingState = nextState;
        nativeApi.typingState(nextState);
    }

    document.addEventListener('focusin', syncTypingState, true);
    document.addEventListener('focusout', () => setTimeout(syncTypingState, 0), true);
    syncTypingState();


    // 3. Factory Reset
    const factoryResetBtn = document.getElementById('factory-reset-btn');
    if (factoryResetBtn) {
        factoryResetBtn.onclick = async () => {
            if (confirm(t('alert.factory_reset.confirm', 'Are you sure you want to factory reset the app? All local data and custom channels will be lost.'))) {
                localStorage.clear();
                await nativeApi.saveUserData({});
                await nativeApi.relaunch();
            }
        };
    }

    // 4. AutoUpdater button
    const updateBtn = document.getElementById('update-check-btn');
    if (updateBtn) {
        const _setUpdateState = (state, percent) => {
            updateBtn.disabled = state !== 'idle' && state !== 'restart';
            switch (state) {
                case 'idle':
                    updateBtn.textContent = t('settings.system.update.check', 'Check for Updates');
                    updateBtn.onclick = () => { _setUpdateState('checking'); nativeApi.checkForUpdates(); };
                    break;
                case 'checking':
                    updateBtn.textContent = t('settings.system.update.checking', 'Checking...');
                    break;
                case 'up_to_date':
                    updateBtn.textContent = t('settings.system.update.up_to_date', 'Up to date');
                    setTimeout(() => _setUpdateState('idle'), 3000);
                    break;
                case 'downloading':
                    updateBtn.textContent = t('settings.system.update.downloading', 'Downloading… {p}%').replace('{p}', percent ?? 0);
                    break;
                case 'restart':
                    updateBtn.textContent = t('settings.system.update.restart', 'Restart to Update');
                    updateBtn.disabled = false;
                    updateBtn.onclick = () => nativeApi.quitAndInstall();
                    break;
                case 'failed':
                    updateBtn.textContent = t('settings.system.update.failed', 'Update check failed');
                    setTimeout(() => _setUpdateState('idle'), 3000);
                    break;
            }
        };
        _setUpdateState('idle');
        nativeApi.onUpdateAvailable(() => _setUpdateState('downloading', 0));
        nativeApi.onDownloadProgress(({ percent }) => _setUpdateState('downloading', percent));
        nativeApi.onUpdateDownloaded(() => _setUpdateState('restart'));
        nativeApi.onUpdateNotAvailable(() => _setUpdateState('up_to_date'));
        nativeApi.onUpdateError(() => _setUpdateState('failed'));
    }

    // 5. Donate PayPal button + QR
    const PAYPAL_URL = 'https://www.paypal.com/donate/?hosted_button_id=GWPABYM5EFM8U';
    const donatePaypalBtn = document.getElementById('donate-paypal-btn');
    if (donatePaypalBtn) donatePaypalBtn.onclick = () => nativeApi.openExternal(PAYPAL_URL);
    const qrPaypalImg = document.getElementById('qr-paypal-img');
    if (qrPaypalImg) qrPaypalImg.onclick = () => nativeApi.openExternal(PAYPAL_URL);

    // 6. Unified filter dropdowns (single set shared by sidebar and landing)
    ['filter-select-language', 'filter-select-genre', 'filter-select-event'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.onchange = () => {
                state.favPage = 0;
                renderAll(true);
            };
        }
    });

    // 7. Dashboard landing navigation
    const dbNavAll = document.getElementById('land-nav-all');
    const dbNavFavs = document.getElementById('land-nav-favorites');

    if (dbNavAll) {
        dbNavAll.onclick = () => {
            state.zapSourceTab = 'channels';
            state.favPage = 0;
            renderAll(true);
            saveAppState();
        };
    }

    if (dbNavFavs) {
        dbNavFavs.onclick = () => {
            state.zapSourceTab = 'favorites';
            state.favPage = 0;
            renderAll(true);
            saveAppState();
        };
    }

    const fullscreenToggleBtn = document.getElementById('corner-fs-btn');
    if (fullscreenToggleBtn) {
        fullscreenToggleBtn.onclick = async (e) => {
            e.stopPropagation();
            await toggleAppFullscreen();
        };
    }

    triggerLeft.onmouseenter = () => {
        if (state.currentModule !== 'live' && !state.activeChannelId) return;
        switchTab(state.zapSourceTab || 'channels');

        mainMenu.classList.remove('hidden');
        startInactivityTimers();
        setTimeout(() => {
            syncMenuScroll(state.activeChannelId);
        }, 50);
    };

    if (triggerBottom) {
        triggerBottom.onmouseenter = () => {
            if (state.currentModule !== 'live' && !state.activeChannelId) return;
            if (!state.isHomeActive) {
                sourceSwitcher.classList.remove('hidden');
                startInactivityTimers();
            }
        };
    }

    if (triggerRight) {
        triggerRight.onmouseenter = () => {
            if (state.currentModule !== 'live' && !state.activeChannelId) return;
            if (!state.isHomeActive) {
                sourceSwitcher.classList.remove('hidden');
                startInactivityTimers();
            }
        };
    }

    if (triggerTop) {
        triggerTop.onmouseenter = () => {
            if (state.currentModule !== 'live') return;
            topNavMenu.classList.remove('hidden');
            startInactivityTimers();
        };
    }

    if (topNavMenu) {
        topNavMenu.onmouseenter = () => {
            clearInactivityTimers();
            document.body.classList.remove('hide-cursor');
        };
        topNavMenu.onmouseleave = () => startInactivityTimers();
    }

    if (sourceSwitcher) {
        sourceSwitcher.onmouseenter = () => {
            clearInactivityTimers();
            document.body.classList.remove('hide-cursor');
        };
        sourceSwitcher.onmouseleave = () => startInactivityTimers();
    }

    mainMenu.onmouseenter = () => {
        clearInactivityTimers();
        document.body.classList.remove('hide-cursor');
    };

    mainMenu.onmouseleave = () => startInactivityTimers();

    const settingsScreenEl = document.getElementById('settings-screen');
    if (settingsScreenEl) {
        settingsScreenEl.onmouseenter = () => {
            clearInactivityTimers();
            document.body.classList.remove('hide-cursor');
        };
        settingsScreenEl.onmouseleave = () => startInactivityTimers();
    }

    // Mouse movement un-hides the cursor and restarts only the cursor hide timer.
    // Panel timers (pbar, topnav, sidebar) are NOT reset — panels activate via their trigger zones only.
    document.addEventListener('mousemove', () => { document.body.classList.remove('hide-cursor'); startCursorTimer(); });
    document.addEventListener('pointermove', () => { document.body.classList.remove('hide-cursor'); startCursorTimer(); });

    // All other activity events reset all inactivity timers (panels + cursor).
    ['mousedown', 'mouseup', 'click', 'wheel', 'scroll',
     'pointerdown', 'pointerup',
     'touchstart', 'touchmove', 'touchend',
     'keydown', 'keypress', 'keyup'
    ].forEach(evtName => {
        document.addEventListener(evtName, () => startInactivityTimers());
    });

    // When JTV loses window focus, start the cursor timer so it hides over JTV's area
    // even while the user is interacting with another app side by side.
    // On refocus, show cursor and restart the timer fresh.
    window.addEventListener('blur', () => startCursorTimer());
    window.addEventListener('focus', () => {
        document.body.classList.remove('hide-cursor');
        startCursorTimer();
    });

    // Top Navigation Bar button clicks
    document.querySelectorAll('.tnav-menu .tnav-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const dest = btn.dataset.nav;
            if (dest) {
                if (dest === 'live' && state.currentModule === 'live') {
                    if (state.activeChannelId) {
                        showLiveLanding();
                    } else {
                        showModule('live');
                    }
                } else {
                    showModule(dest);
                }
            }
        };
    });

    // Sidebar header nav button clicks (legacy compat)
    document.querySelectorAll('.header-nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const moduleName = btn.dataset.nav;
            showModule(moduleName);
        };
    });

    // Home landing page cards click events (legacy, no longer rendered)
    const cardSettings = document.getElementById('card-settings');
    if (cardSettings) cardSettings.onclick = () => showModule('settings');

    // Settings tab clicks inside Configuration screen.
    // Delegated on the container so the dynamically-injected Developer tab
    // is handled by the same logic (no load-order or double-binding issues).
    const settingsTabsContainer = document.querySelector('.settings-tabs');
    if (settingsTabsContainer) {
        settingsTabsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.settings-tab-btn');
            if (!btn || !settingsTabsContainer.contains(btn)) return;

            const targetTab = btn.dataset.settingsTab;
            if (!targetTab) return;

            const activateTab = () => {
                document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.settings-sect-pane').forEach(pane => {
                    pane.classList.toggle('active', pane.id === `settings-sect-${targetTab}`);
                });

                if (targetTab === 'general') {
                    setGeneralTab('general-tab-options');
                }
                if (targetTab === 'sensors') {
                    window.updateSensorsUI?.();
                }
                if (targetTab === 'filters') {
                    renderSettingsFilters();
                }
                if (targetTab === 'connectivity') {
                    setConnectivityTab('servers');
                }
                if (targetTab === 'developer') {
                    window.updateDeveloperUI?.();
                    // Reset sub-tabs to General and re-render icons
                    const devPane = document.getElementById('settings-sect-developer');
                    if (devPane) {
                        devPane.querySelectorAll('.dev-subnav-btn').forEach(b => b.classList.remove('active'));
                        const firstBtn = devPane.querySelector('.dev-subnav-btn');
                        if (firstBtn) firstBtn.classList.add('active');
                        devPane.querySelectorAll('.dev-tab-pane').forEach(p => p.style.display = 'none');
                        const firstPane = document.getElementById('dev-tab-general');
                        if (firstPane) firstPane.style.display = '';
                    }
                    if (window.lucide) window.lucide.createIcons();
                }
                if (targetTab === 'channels') {
                    const devState = window.getDeveloperState ? window.getDeveloperState() : null;
                    if (devState && devState.developerModeEnabled && typeof window.renderCrudChannelsList === 'function') {
                        window.renderCrudChannelsList();
                    }
                }
            };

            activateTab();
        });
    }

    document.querySelectorAll('.general-subnav-btn').forEach(btn => {
        btn.onclick = () => setGeneralTab(btn.dataset.generalTab);
    });

    document.querySelectorAll('.settings-subnav-btn[data-filter-type]').forEach(btn => {
        btn.onclick = () => setSettingsFilterTab(btn.dataset.filterType);
    });

    document.querySelectorAll('.channels-subnav-btn').forEach(btn => {
        btn.onclick = () => setChannelsTab(btn.dataset.channelsTab);
    });

    // Settings screen close button
    const closeSettingsBtn = document.getElementById('close-settings');
    if (closeSettingsBtn) {
        closeSettingsBtn.onclick = () => {
            showModule(state.previousModule || 'home');
        };
    }

    // Dashboard close button — goes to App Home Screen or returns to tuned stream
    const closeHomeBtn = document.getElementById('close-home');
    if (closeHomeBtn) {
        closeHomeBtn.onclick = (e) => {
            e.stopPropagation();
            if (state.activeChannelId) {
                document.getElementById('vod-library').classList.add('hidden');
                state.isHomeActive = false;
                sourceSwitcher.classList.remove('hidden');
                updateTriggersVisibility();
            } else {
                showModule('home');
            }
        };
    }

    // Sidebar close buttons — hide menu/edit pane
    document.querySelectorAll('.side-close-btn').forEach(btn => {
        btn.onclick = () => {
            hideMenu();
            hideEditPane();
            startInactivityTimers();
        };
    });

    if (gridPrevBtn) {
        gridPrevBtn.onclick = () => {
            if (state.favPage > 0) {
                state.favPage--;
                renderFavoritesGrid();
            }
        };
    }

    if (gridNextBtn) {
        gridNextBtn.onclick = () => {
            const allFavs = getFilteredLiveChannels();
            const totalPages = Math.ceil(allFavs.length / state.FAVS_PER_PAGE);
            if (state.favPage < totalPages - 1) {
                state.favPage++;
                renderFavoritesGrid();
            }
        };
    }

    backToListBtn.onclick = () => hideEditPane();
    const tabBtns = document.querySelectorAll('.side-tab-btn');
    tabBtns.forEach(btn => btn.onclick = () => {
        const tab = btn.dataset.tab;
        if (tab === 'channels' || tab === 'favorites') {
            state.zapSourceTab = tab;
            saveAppState();
        }
        switchTab(tab);
    });

    const liveLandingSearch = document.getElementById('live-landing-search');
    const clearLiveLandingSearch = document.getElementById('clear-live-landing-search');
    if (liveLandingSearch) {
        liveLandingSearch.oninput = () => {
            if (clearLiveLandingSearch) {
                clearLiveLandingSearch.classList.toggle('hidden', liveLandingSearch.value.trim() === "");
            }
            state.searchTerm = liveLandingSearch.value;
            state.favSearchTerm = liveLandingSearch.value;
            state.favPage = 0;
            renderAll();
        };
    }

    if (clearLiveLandingSearch && liveLandingSearch) {
        clearLiveLandingSearch.onclick = () => {
            liveLandingSearch.value = "";
            clearLiveLandingSearch.classList.add('hidden');
            state.searchTerm = "";
            state.favSearchTerm = "";
            state.favPage = 0;
            renderAll();
            liveLandingSearch.focus();
        };
    }

    if (guideSearchInput) {
        guideSearchInput.oninput = (e) => { state.guideSearchTerm = e.target.value; renderAll(); };
    }
    if (guideFiltersChips) {
        guideFiltersChips.forEach(chip => {
            chip.onclick = () => {
                guideFiltersChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state.guideFilter = chip.dataset.filter;
                renderAll();
            };
        });
    }

    const eventPicker = document.getElementById('event-icon-picker');
    if (eventPicker) {
        eventPicker.onclick = (e) => {
            const icon = e.target.closest('.picker-icon');
            if (icon) {
                eventPicker.querySelectorAll('.picker-icon').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                state.selectedEventFilterIcon = icon.dataset.icon || icon.getAttribute('data-icon') || 'flag';
            }
        };
    }

    const setupAddFilterInput = (inputId, clearId, btnId, type) => {
        const input = document.getElementById(inputId);
        const clearBtn = document.getElementById(clearId);
        const addBtn = document.getElementById(btnId);

        if (!input) return;

        input.oninput = () => {
            if (clearBtn) {
                clearBtn.classList.toggle('hidden', input.value.trim() === "");
            }
        };

        if (clearBtn) {
            clearBtn.onclick = () => {
                input.value = "";
                clearBtn.classList.add('hidden');

                if (state.editingFilter && state.editingFilter.inputId === inputId) {
                    state.editingFilter = null;
                    if (addBtn) {
                        addBtn.innerHTML = `<i data-lucide="plus"></i>`;
                        addBtn.setAttribute('title', 'Add Filter');
                        addBtn.setAttribute('data-tooltip', 'Add Filter');
                    }

                    let defaultIcon = 'tag';
                    let selectBtnId = null;
                    if (type === 'language') defaultIcon = 'globe';
                    else if (type === 'genre') { defaultIcon = 'tag'; selectBtnId = 'genre-icon-select-btn'; }
                    else if (type === 'event') { defaultIcon = '🏁'; selectBtnId = 'event-icon-select-btn'; }
                    if (selectBtnId) {
                        const selectBtn = document.getElementById(selectBtnId);
                        if (selectBtn) {
                            selectBtn.setAttribute('data-selected-icon', defaultIcon);
                            const isEmoji = (defaultIcon && /[^\x00-\x7F]/.test(defaultIcon)) || (defaultIcon && defaultIcon.length <= 2);
                            selectBtn.innerHTML = isEmoji
                                ? `<span class="emoji-icon">${emojiToHtml(defaultIcon)}</span>`
                                : `<i data-lucide="${defaultIcon}"></i>`;
                        }
                    }
                    lucide.createIcons();
                }

                input.focus();
            };
        }

        const submitAdd = () => {
            const name = input.value.trim();
            if (!name) {
                input.classList.add('input-error');
                setTimeout(() => input.classList.remove('input-error'), 1000);
                return;
            }

            let listToCheck;
            let defaultIcon = 'tag';
            let selectBtnId = null;

            if (type === 'language') {
                listToCheck = state.filterLanguages;
                defaultIcon = 'globe';
            } else if (type === 'genre') {
                listToCheck = state.filterGenres;
                defaultIcon = 'tag';
                selectBtnId = 'genre-icon-select-btn';
            } else if (type === 'event') {
                listToCheck = state.filterEvents;
                defaultIcon = '🏁';
                selectBtnId = 'event-icon-select-btn';
            }
            
            let icon = defaultIcon;
            if (selectBtnId) {
                const selectBtn = document.getElementById(selectBtnId);
                if (selectBtn) {
                    icon = selectBtn.getAttribute('data-selected-icon') || defaultIcon;
                }
            }
            
            if (state.editingFilter && state.editingFilter.inputId === inputId) {
                const oldName = state.editingFilter.originalName;
                const newName = name;

                if (oldName.toLowerCase() !== newName.toLowerCase() &&
                    listToCheck.some(f => f.name.toLowerCase() === newName.toLowerCase())) {
                    alert(t('alert.filter.duplicate', 'The filter "{name}" already exists in this group.').replace('{name}', newName));
                    return;
                }
                
                const itemIndex = listToCheck.findIndex(f => f.name === oldName);
                if (itemIndex !== -1) {
                    listToCheck[itemIndex].name = newName;
                    listToCheck[itemIndex].icon = icon;
                }
                
                if (type === 'language' || type === 'genre' || type === 'event') {
                    channels.forEach(channel => {
                        if (channel.categories) {
                            channel.categories = channel.categories.map(c => {
                                if (c.toLowerCase() === oldName.toLowerCase()) {
                                    return newName;
                                }
                                return c;
                            });
                        }
                    });
                }
                
                state.editingFilter = null;
                addBtn.innerHTML = `<i data-lucide="plus"></i>`;
                addBtn.setAttribute('title', 'Add Filter');
                addBtn.setAttribute('data-tooltip', 'Add Filter');
            } else {
                if (listToCheck.some(f => f.name.toLowerCase() === name.toLowerCase())) {
                    alert(t('alert.filter.duplicate', 'The filter "{name}" already exists in this group.').replace('{name}', name));
                    return;
                }
                const newEntry = { name, icon };
                if (type === 'language') newEntry.enabled = false;
                listToCheck.push(newEntry);
            }
            
            input.value = '';
            if (clearBtn) clearBtn.classList.add('hidden');
            
            if (selectBtnId) {
                const selectBtn = document.getElementById(selectBtnId);
                if (selectBtn) {
                    selectBtn.setAttribute('data-selected-icon', defaultIcon);
                    const isEmoji = (defaultIcon && /[^\x00-\x7F]/.test(defaultIcon)) || (defaultIcon && defaultIcon.length <= 2);
                    selectBtn.innerHTML = isEmoji
                        ? `<span class="emoji-icon" style="font-size: 16px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;">${defaultIcon}</span>`
                        : `<i data-lucide="${defaultIcon}"></i>`;
                    if (selectBtnId === 'event-icon-select-btn') {
                        updateEventIconSelectBtnColor(selectBtn, defaultIcon);
                    }
                }
            }
            
            syncFilterList();
            renderAll();
            saveAppState();
            lucide.createIcons();
        };
        
        if (addBtn) {
            addBtn.onclick = submitAdd;
        }
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                submitAdd();
            }
        };
    };

    setupAddFilterInput('add-lang-input', 'clear-lang-input', 'add-lang-btn', 'language');
    setupAddFilterInput('add-genre-input', 'clear-genre-input', 'add-genre-btn', 'genre');
    setupAddFilterInput('add-event-input', 'clear-event-input', 'add-event-btn', 'event');

    bindAddFilterToChannel({
        getChannels: () => channels,
        getCurrentEditingChannelId: () => state.currentEditingChannelId,
        renderAll
    });

    // Scroll Wheel Support for Favorites Grid
    const handleWheel = (e) => {
        if (!state.isHomeActive) return;

        const allFavs = getFilteredLiveChannels();
        const totalPages = Math.ceil(allFavs.length / state.FAVS_PER_PAGE);
        if (totalPages <= 1) return;

        if (e.deltaY > 0) {
            if (state.favPage < totalPages - 1) {
                state.favPage++;
                renderFavoritesGrid();
            }
        } else {
            if (state.favPage > 0) {
                state.favPage--;
                renderFavoritesGrid();
            }
        }
    };

    favoritesGrid.addEventListener('wheel', handleWheel);
    gridDots.addEventListener('wheel', handleWheel);

    // sync-channels-btn / apply-domain-btn live in the dev-only Channels & Connectivity
    // panes (stripped in production builds), so guard against missing elements.
    const syncChannelsBtn = document.getElementById('sync-channels-btn');
    if (syncChannelsBtn) syncChannelsBtn.onclick = () => syncChannels();
    const applyDomainBtn = document.getElementById('apply-domain-btn');
    if (applyDomainBtn) applyDomainBtn.onclick = () => {
        state.globalDomain = globalDomainInput.value;
        state.apiKey = apiKeyInput.value;
        state.apiEndpoint = apiEndpointInput.value;
        if (!state.globalDomain.endsWith('/')) state.globalDomain += '/';
        window.globalDomain = state.globalDomain;
        saveAppState(); syncChannels(); alert(t('alert.saved_syncing', 'Settings saved. Syncing...'));
    };

    if (autoDomainToggle) autoDomainToggle.onchange = (e) => { state.autoUpdateDomain = e.target.checked; saveAppState(); };
    const audioLevelerToggle = document.getElementById('audio-leveler-toggle');
    if (audioLevelerToggle) {
        audioLevelerToggle.onchange = (e) => {
            state.audioLevelerEnabled = e.target.checked;
            saveAppState();
            nativeApi.broadcastAudioLeveler(state.audioLevelerEnabled);
        };
    }
    const hwAccelToggle = document.getElementById('hw-accel-toggle');
    if (hwAccelToggle) {
        hwAccelToggle.onchange = async (e) => {
            state.hwAccelEnabled = e.target.checked;
            await saveAppState();
            if (confirm(t('alert.hw_accel.confirm', 'To apply hardware acceleration changes, the app must restart now. Do you want to restart?'))) {
                await nativeApi.relaunch();
            }
        };
    }
    if (minimizeToTrayToggle) {
        minimizeToTrayToggle.onchange = (e) => {
            state.minimizeToTray = e.target.checked;
            saveAppState();
        };
    }
    if (preventSleepToggle) {
        preventSleepToggle.onchange = (e) => {
            state.preventSleep = e.target.checked;
            saveAppState();
        };
    }
    const cloudflareProtectionToggle = document.getElementById('cloudflare-protection-toggle');
    if (cloudflareProtectionToggle) {
        cloudflareProtectionToggle.onchange = (e) => {
            state.cloudflareProtectionEnabled = e.target.checked;
            saveAppState();
        };
    }

    const langSelect = document.getElementById('app-language-select');
    const langApplyBtn = document.getElementById('lang-apply-btn');
    if (langSelect) {
        langSelect.value = state.appLanguage || 'en';
        syncCustomSelect(langSelect);
        langSelect.onchange = () => {
            syncCustomSelect(langSelect);
            if (langApplyBtn) langApplyBtn.style.display = langSelect.value !== getCurrentLang() ? '' : 'none';
        };
    }
    if (langApplyBtn) {
        langApplyBtn.onclick = async () => {
            const newLang = langSelect.value;
            state.appLanguage = newLang;
            await applyLocale(newLang);
            renderAll();
            const landTitle = document.getElementById('land-title');
            if (landTitle && !landTitle.classList.contains('hidden')) {
                landTitle.textContent = t('nav.live_tv', 'Live TV');
            }
            langApplyBtn.style.display = 'none';
            await saveAppState(true);
        };
    }


    editNameInput.oninput = (e) => {
        checkValidity();
        const channel = channels.find(c => String(c.id) === String(state.currentEditingChannelId));
        if (channel) { channel.name = e.target.value; renderAll(); }
    };

    editIdInput.oninput = (e) => {
        checkValidity();
        const channel = channels.find(c => String(c.id) === String(state.currentEditingChannelId));
        if (channel) {
            channel.id = e.target.value.trim();
            if (!channel.path || channel.path.startsWith("watch.php?id=")) {
                channel.path = "watch.php?id=" + channel.id;
                if (editStreamInput) editStreamInput.value = channel.path;
            }
            state.currentEditingChannelId = channel.id;
            renderAll();
        }
    };

    if (editStreamInput) {
        editStreamInput.oninput = (e) => {
            checkValidity();
            const channel = channels.find(c => String(c.id) === String(state.currentEditingChannelId));
            if (channel) {
                channel.path = e.target.value.trim();
                renderAll();
            }
        };
    }

    const deleteChannelBtn = document.getElementById('delete-channel-btn');
    if (deleteChannelBtn) {
        deleteChannelBtn.onclick = () => {
            if (!state.currentEditingChannelId) return;
            const channel = channels.find(c => String(c.id) === String(state.currentEditingChannelId));
            const channelName = channel ? channel.name || `ID #${channel.id}` : `ID #${state.currentEditingChannelId}`;
            if (confirm(t('alert.delete_channel.confirm', 'Are you sure you want to delete "{name}"?').replace('{name}', channelName))) {
                channels = channels.filter(c => String(c.id) !== String(state.currentEditingChannelId));
                state.currentEditingChannelId = null;
                hideEditPane(false);
                renderAll();
                saveAppState();
            }
        };
    }

    logoUploadInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            processLogo(e.target.files[0], {
                logoCanvas,
                getChannels: () => channels,
                getCurrentEditingChannelId: () => state.currentEditingChannelId,
                updateEditLogo,
                renderAll
            });
        }
    };
    editUploadBtn.onclick = () => logoUploadInput.click();
    editFavToggle.onclick = () => {
        const channel = channels.find(c => String(c.id) === String(state.currentEditingChannelId));
        if (!channel) return;
        channel.favorite = !channel.favorite;
        editFavToggle.classList.toggle('active', channel.favorite);
        if (String(state.activeChannelId) === String(channel.id)) {
            const hudFavBtn = document.getElementById('pbar-fav-btn');
            if (hudFavBtn) hudFavBtn.classList.toggle('active', channel.favorite);
            if (tunerFavHeart) {
                tunerFavHeart.style.fill = channel.favorite ? '#ff4b4b' : 'transparent';
                tunerFavHeart.style.color = channel.favorite ? '#ff4b4b' : 'currentColor';
            }
        }
        renderAll(true);
        saveAppState();
    };

    // Anti-Hotkeys Global Capturer
    document.addEventListener('keydown', (e) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            if (e.key !== 'Enter' && e.key !== 'Escape') {
                e.stopPropagation();
            }
        }
    }, true);

    function matchesHotkey(action, key, e) {
        const keys = state.hotkeyMap[action];
        if (!keys) return false;
        return keys.some(k => {
            if (k.startsWith('Ctrl+')) {
                return e && (e.ctrlKey || e.metaKey) && k.slice(5).toLowerCase() === key.toLowerCase();
            }
            return k.toLowerCase() === key.toLowerCase();
        });
    }

    function handleHotkeyAction(key, e) {
        if (matchesHotkey('volumeUp', key, e)) {
            adjustVolume(1);
            return true;
        } else if (matchesHotkey('volumeDown', key, e)) {
            adjustVolume(-1);
            return true;
        } else if (matchesHotkey('toggleMute', key, e)) {
            toggleMute();
            return true;
        }

        if (matchesHotkey('escape', key, e)) {
            const settingsScreen = document.getElementById('settings-screen');
            if (settingsScreen && !settingsScreen.classList.contains('hidden')) {
                showModule('live');
                return true;
            }
            if (state.currentModule === 'live' && state.activeChannelId) {
                showLiveLanding();
                return true;
            }
            if (state.currentModule === 'settings') {
                showModule('live');
                return true;
            }
            return true;
        }

        if (matchesHotkey('fullscreen', key, e)) {
            toggleAppFullscreen();
            return true;
        }

        const isSettingsOpen = !document.getElementById('settings-screen').classList.contains('hidden');

        if (!state.isHomeActive && state.activeChannelId && !isSettingsOpen) {
            if (matchesHotkey('prevChannel', key, e)) {
                zapChannel('up');
                return true;
            } else if (matchesHotkey('nextChannel', key, e)) {
                zapChannel('down');
                return true;
            } else if (matchesHotkey('prevSource', key, e)) {
                const sources = Array.from(document.querySelectorAll('.pbar-source-btn')).map(b => b.dataset.source);
                const currentIdx = sources.indexOf(state.playerSource);
                if (currentIdx !== -1) {
                    const prevIdx = (currentIdx - 1 + sources.length) % sources.length;
                    document.querySelector(`.pbar-source-btn[data-source="${sources[prevIdx]}"]`)?.click();
                }
                return true;
            } else if (matchesHotkey('nextSource', key, e)) {
                const sources = Array.from(document.querySelectorAll('.pbar-source-btn')).map(b => b.dataset.source);
                const currentIdx = sources.indexOf(state.playerSource);
                if (currentIdx !== -1) {
                    const nextIdx = (currentIdx + 1) % sources.length;
                    document.querySelector(`.pbar-source-btn[data-source="${sources[nextIdx]}"]`)?.click();
                }
                return true;
            }
        }

        if (matchesHotkey('toggleHUD', key, e)) {
            if (!state.isHomeActive && state.activeChannelId) {
                state.hudPinned = !state.hudPinned;
                const sourceSwitcherEl = document.getElementById('pbar');
                if (sourceSwitcherEl) {
                    if (state.hudPinned) {
                        sourceSwitcherEl.classList.remove('hidden');
                        clearInactivityTimers();
                    } else {
                        startInactivityTimers();
                    }
                }
                const pinBtn = document.getElementById('pbar-pin-btn');
                if (pinBtn) {
                    pinBtn.classList.toggle('active', state.hudPinned);
                    pinBtn.title = state.hudPinned ? 'Unpin Player' : 'Pin Player';
                }
                return true;
            }
            return false;
        }
        return false;
    }

    document.addEventListener('keydown', async (e) => {
        // Ctrl+F shortcut when sidebar is open to focus search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            const isSidebarOpen = !mainMenu.classList.contains('hidden');
            if (isSidebarOpen) {
                e.preventDefault();
                const activeTabPane = document.querySelector('.tab-pane.active');
                if (activeTabPane) {
                    const searchInput = activeTabPane.querySelector('input[type="text"]');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }
                return;
            }
        }

        if (activeHotkeyListener) return;
        const handled = handleHotkeyAction(e.key, e);
        if (handled) {
            e.preventDefault();
        }
    });

    if (nativeApi && nativeApi.onAppHotkey) {
        nativeApi.onAppHotkey((payload) => {
            if (payload && payload.key) {
                if (activeHotkeyListener) return;
                const fakeEvent = { ctrlKey: payload.key.startsWith('Ctrl+'), metaKey: false };
                const rawKey = payload.key.startsWith('Ctrl+') ? payload.key.slice(5) : payload.key;
                handleHotkeyAction(rawKey, fakeEvent);
            }
        });
    }

    // Hotkey dynamic card UI
    let activeHotkeyListener = null;

    const KEY_DISPLAY = {
        ' ': 'Space', 'Escape': 'Esc', 'ArrowUp': '↑', 'ArrowDown': '↓',
        'ArrowLeft': '←', 'ArrowRight': '→', 'Add': '+', 'Subtract': '-',
        'Multiply': '*', 'PageUp': 'PgUp', 'PageDown': 'PgDn'
    };

    const HOTKEY_DEFS = [
        { action: 'fullscreen',  title: t('hotkey.fullscreen.title', 'Toggle Fullscreen'), desc: t('hotkey.fullscreen.desc', 'Enter or exit fullscreen mode.'),           group: 'player'  },
        { action: 'toggleHUD',   title: t('hotkey.pin.title', 'Player Pin'),               desc: t('hotkey.pin.desc', 'Show HUD and toggle pin state.'),                  group: 'player'  },
        { action: 'prevChannel', title: t('hotkey.ch_up.title', 'Channel Up'),             desc: t('hotkey.ch_up.desc', 'Zap to the previous channel.'),                  group: 'channel' },
        { action: 'nextChannel', title: t('hotkey.ch_down.title', 'Channel Down'),         desc: t('hotkey.ch_down.desc', 'Zap to the next channel.'),                    group: 'channel' },
        { action: 'volumeUp',    title: t('hotkey.vol_up.title', 'Volume Up'),             desc: t('hotkey.vol_up.desc', 'Increase the volume level.'),                   group: 'volume'  },
        { action: 'volumeDown',  title: t('hotkey.vol_down.title', 'Volume Down'),         desc: t('hotkey.vol_down.desc', 'Decrease the volume level.'),                 group: 'volume'  },
        { action: 'toggleMute',  title: t('hotkey.mute.title', 'Toggle Mute'),             desc: t('hotkey.mute.desc', 'Mute or unmute audio.'),                          group: 'misc'    },
        { action: 'escape',      title: t('hotkey.escape.title', 'Close / Go Back'),       desc: t('hotkey.escape.desc', 'Close modals or return to previous view.'),     group: 'misc'    },
    ];

    function keyToDisplay(key) {
        if (key.startsWith('Ctrl+')) return 'Ctrl+' + keyToDisplay(key.slice(5));
        return KEY_DISPLAY[key] || (key.length === 1 ? key.toUpperCase() : key);
    }

    function findConflicts(action, key) {
        for (const [a, keys] of Object.entries(state.hotkeyMap)) {
            if (a === action) continue;
            if (keys.some(k => k.toLowerCase() === key.toLowerCase())) {
                const def = HOTKEY_DEFS.find(d => d.action === a);
                return def ? def.title : a;
            }
        }
        return null;
    }

    function stopHotkeyListening() {
        if (!activeHotkeyListener) return;
        const { handler } = activeHotkeyListener;
        document.removeEventListener('keydown', handler, true);
        nativeApi.typingState(false);
        activeHotkeyListener = null;
        renderHotkeyCards();
    }

    function renderHotkeyCards() {
        const grid = document.getElementById('hotkey-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Build ordered group list preserving HOTKEY_DEFS order
        const groupMap = new Map();
        HOTKEY_DEFS.forEach(def => {
            if (!groupMap.has(def.group)) groupMap.set(def.group, []);
            groupMap.get(def.group).push(def);
        });

        groupMap.forEach(defs => {
            const row = document.createElement('div');
            row.className = 'hotkey-row';

            defs.forEach(def => {
                const card = document.createElement('div');
                card.className = 'hotkey-card';

                const header = document.createElement('div');
                header.className = 'hotkey-card-header';
                header.innerHTML = `<span class="setting-title">${def.title}</span><span class="setting-desc">${def.desc}</span>`;

                const controls = document.createElement('div');
                controls.className = 'hotkey-card-controls';

                const keys = state.hotkeyMap[def.action] || [];

                keys.forEach((key, idx) => {
                    const chip = document.createElement('div');
                    chip.className = 'hotkey-chip';
                    chip.textContent = keyToDisplay(key);

                    const conflict = findConflicts(def.action, key);
                    if (conflict) {
                        chip.classList.add('conflict');
                        chip.title = t('hotkey.conflict', 'Conflict: already used by "{action}"').replace('{action}', conflict);
                    }

                    const delBtn = document.createElement('button');
                    delBtn.className = 'hotkey-chip-delete';
                    delBtn.title = 'Delete';
                    delBtn.textContent = '×';
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        state.hotkeyMap[def.action] = keys.filter((_, i) => i !== idx);
                        saveAppState();
                        renderHotkeyCards();
                    };
                    chip.appendChild(delBtn);
                    controls.appendChild(chip);
                });

                const addBtn = document.createElement('button');
                addBtn.className = 'hotkey-add-btn';
                addBtn.title = 'Add hotkey';
                addBtn.innerHTML = '<i data-lucide="plus"></i>';
                if (keys.length >= 2) addBtn.disabled = true;
                addBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (keys.length >= 2) return;
                    stopHotkeyListening();
                    startListening(def.action, controls, addBtn);
                };
                controls.appendChild(addBtn);

                card.appendChild(header);
                card.appendChild(controls);
                row.appendChild(card);
            });

            grid.appendChild(row);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function startListening(action, controls, addBtn) {
        addBtn.disabled = true;

        const listener = document.createElement('div');
        listener.className = 'hotkey-listener';
        listener.textContent = t('hotkey.press_key', 'Press a key...');

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'hotkey-listener-cancel';
        cancelBtn.title = 'Cancel';
        cancelBtn.textContent = '×';
        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            stopHotkeyListening();
        };
        listener.appendChild(cancelBtn);

        controls.insertBefore(listener, addBtn);
        nativeApi.typingState(true);

        const handler = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            let newKey = ev.key;
            if ((ev.ctrlKey || ev.metaKey) && newKey !== 'Control' && newKey !== 'Meta') {
                newKey = 'Ctrl+' + newKey;
            }
            if (newKey === 'Control' || newKey === 'Meta' || newKey === 'Shift' || newKey === 'Alt') return;
            const keys = state.hotkeyMap[action] ? [...state.hotkeyMap[action]] : [];
            keys.push(newKey);
            state.hotkeyMap[action] = keys;
            stopHotkeyListening();
            saveAppState();
        };

        document.addEventListener('keydown', handler, true);
        activeHotkeyListener = { action, handler };
    }

    renderHotkeyCards();

    // Tuner Zapper Buttons Listeners
    tunerUpBtn.onclick = (e) => {
        e.stopPropagation();
        zapChannel('up');
    };
    tunerDownBtn.onclick = (e) => {
        e.stopPropagation();
        zapChannel('down');
    };

    // Player Bar Quick Actions Listeners
    const hudFavBtn = document.getElementById('pbar-fav-btn');
    if (hudFavBtn) {
        hudFavBtn.onclick = (e) => {
            e.stopPropagation();
            const channel = channels.find(c => String(c.id) === String(state.activeChannelId));
            if (channel) {
                channel.favorite = !channel.favorite;
                hudFavBtn.classList.toggle('active', channel.favorite);
                if (tunerFavHeart) {
                    if (channel.favorite) {
                        tunerFavHeart.style.fill = '#ff4b4b';
                        tunerFavHeart.style.color = '#ff4b4b';
                    } else {
                        tunerFavHeart.style.fill = 'transparent';
                        tunerFavHeart.style.color = 'currentColor';
                    }
                }
                renderAll(true);
                saveAppState();
            }
        };
    }

    const hudPinBtn = document.getElementById('pbar-pin-btn');
    const hudSettingsBtn = document.getElementById('pbar-settings-btn');
    const hudAutotuneToggleBtn = document.getElementById('pbar-autotune-toggle-btn');

    const devStateForHud = window.getDeveloperState ? window.getDeveloperState() : null;
    const isDevModeForHud = devStateForHud && devStateForHud.developerModeEnabled;
    if (hudSettingsBtn) hudSettingsBtn.classList.toggle('dev-visible', !!isDevModeForHud);
    if (hudAutotuneToggleBtn) hudAutotuneToggleBtn.classList.toggle('dev-visible', !!isDevModeForHud);

    if (hudPinBtn) {
        hudPinBtn.onclick = (e) => {
            e.stopPropagation();
            state.hudPinned = !state.hudPinned;
            hudPinBtn.classList.toggle('active', state.hudPinned);
            hudPinBtn.title = state.hudPinned ? 'Unpin HUD' : 'Pin HUD';
            if (state.hudPinned) {
                clearInactivityTimers();
            } else {
                startInactivityTimers();
            }
        };
    }

    if (hudSettingsBtn) {
        hudSettingsBtn.onclick = (e) => {
            e.stopPropagation();
            const channelIdx = channels.findIndex(c => String(c.id) === String(state.activeChannelId));
            if (channelIdx !== -1) {
                showModule('settings');
                const filtersTabBtn = document.getElementById('settings-tab-filters');
                if (filtersTabBtn) {
                    filtersTabBtn.click();
                }

                setTimeout(() => {
                    const asignacionBtn = document.querySelector('.settings-subnav-btn[data-filters-tab="asignacion"]');
                    if (asignacionBtn) asignacionBtn.click();
                }, 100);

                if (window.assignerSelectedFilters) {
                    window.assignerSelectedFilters.clear();
                }

                state.assignerSelectedChannelIndices = [channelIdx];
                state.lastSelectedIdx = channelIdx;

                renderAssignerChannelsList();
                selectAssignerChannelMultiple();
            }
            startInactivityTimers();
        };
    }

    const tunerMuteBtn = document.getElementById('pbar-mute');
    if (tunerMuteBtn) {
        tunerMuteBtn.onclick = async (e) => {
            e.stopPropagation();
            await toggleMute();
        };
    }

    const tunerVolUpBtn = document.getElementById('pbar-vol-up');
    if (tunerVolUpBtn) {
        tunerVolUpBtn.onclick = (e) => {
            e.stopPropagation();
            adjustVolume(1);
        };
    }

    const tunerVolDownBtn = document.getElementById('pbar-vol-down');
    if (tunerVolDownBtn) {
        tunerVolDownBtn.onclick = (e) => {
            e.stopPropagation();
            adjustVolume(-1);
        };
    }

    // Source Buttons Listeners
    const sourceBtns = document.querySelectorAll('.pbar-source-btn');
    sourceBtns.forEach(btn => {
        btn.onclick = () => {
            if (state.failoverTimeoutId) clearTimeout(state.failoverTimeoutId);
            state.failoverInProgress = false;
            stopNoSignalRetryLoop();
            showNoSignalOverlay(false);

            state.playerSource = btn.dataset.source;
            updateSourceSwitcherUI(state.playerSource);
            const channel = channels.find(c => String(c.id) === String(state.activeChannelId));
            if (channel) selectChannel(channel, false);
            saveAppState();
        };
    });

    // Toggle Source Selector button click listener
    const hudToggleSourcesBtn = document.getElementById('pbar-toggle-sources-btn');
    const hudSourcesRow = document.getElementById('pbar-sources-row');
    if (hudToggleSourcesBtn && hudSourcesRow) {
        hudToggleSourcesBtn.onclick = (e) => {
            e.stopPropagation();
            hudSourcesRow.classList.toggle('hidden');
            const isHidden = hudSourcesRow.classList.contains('hidden');
            hudToggleSourcesBtn.style.color = isHidden ? 'rgba(255, 255, 255, 0.5)' : 'var(--accent)';
        };
    }

    // JTV v2.0 Dashboard Nav Tab Switching — now uses showModule for proper routing
    document.querySelectorAll('.dash-nav-btn').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.dashTab;
            if (tab) showModule(tab);
        };
    });

    // Wallpaper option clicks
    document.querySelectorAll('.wallpaper-option').forEach(opt => {
        opt.onclick = () => {
            state.selectedWallpaper = opt.dataset.wall;
            applyWallpaper(state.selectedWallpaper);
            saveAppState();
        };
    });

    // Initialize global scrollbar auto-hide behavior
    initGlobalScrollbarAutoHide();
}

// Global scrollbar auto-hide helper logic
const scrollbarHideTimers = new WeakMap();

function showScrollbar(scrollEl) {
    if (!scrollEl) return;
    scrollEl.classList.add('scrollbar-active');

    const currentTimer = scrollbarHideTimers.get(scrollEl);
    if (currentTimer) clearTimeout(currentTimer);

    const nextTimer = setTimeout(() => {
        scrollEl.classList.remove('scrollbar-active');
        scrollbarHideTimers.delete(scrollEl);
    }, 1500);

    scrollbarHideTimers.set(scrollEl, nextTimer);
}

function hideScrollbarFast(scrollEl) {
    if (!scrollEl) return;
    const currentTimer = scrollbarHideTimers.get(scrollEl);
    if (currentTimer) clearTimeout(currentTimer);

    const nextTimer = setTimeout(() => {
        scrollEl.classList.remove('scrollbar-active');
        scrollbarHideTimers.delete(scrollEl);
    }, 300);

    scrollbarHideTimers.set(scrollEl, nextTimer);
}

function initGlobalScrollbarAutoHide() {
    const scrollSelectors = [
        '.side-scroll-area',
        '.settings-sidebar',
        '.settings-main-content',
        '.scroll-panel',
        '.crud-scroll-panel',
        '.filter-group-list',
        '.custom-select-options',
        '.api-code-block',
        '.glass-tuner-body',
        '.fbar-select-menu',
        '.compact-picker',
        '.filter-icon-dropdown',
        '#assigner-metadata-content'
    ].join(', ');

    // 1. Mouse hover activity
    document.addEventListener('mouseover', (e) => {
        const scrollEl = e.target.closest(scrollSelectors);
        if (scrollEl) {
            showScrollbar(scrollEl);
        }
    });

    // 2. Mouse leave activity
    document.addEventListener('mouseout', (e) => {
        const scrollEl = e.target.closest(scrollSelectors);
        if (scrollEl && (!e.relatedTarget || !scrollEl.contains(e.relatedTarget))) {
            hideScrollbarFast(scrollEl);
        }
    });

    // 3. Movement, scrolling and touch activity
    ['mousemove', 'wheel', 'scroll', 'touchstart'].forEach(eventName => {
        document.addEventListener(eventName, (e) => {
            const scrollEl = e.target.closest(scrollSelectors);
            if (scrollEl) {
                showScrollbar(scrollEl);
            }
        }, { passive: true, capture: eventName === 'scroll' });
    });
}


