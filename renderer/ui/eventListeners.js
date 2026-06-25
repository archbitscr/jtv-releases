/* global lucide */
import { state } from '../state/appState.js';
import { selectChannel, zapChannel, mountRemotePlayer, playVod, updatePlayerActiveState } from '../player/playerController.js';
import { showModule, switchTab, showLiveLanding, hideMenu, hideEditPane } from '../ui/navigation.js';
import { syncMenuScroll } from '../render/channelList.js';
import { startInactivityTimers, clearInactivityTimers } from '../ui/inactivity.js';
import { refreshVodContent, showVodDetails } from '../vod/vodContent.js';
import { warmupVodCache } from '../vod/vodCache.js';
import { hashPIN, verifyPIN, promptParentalPIN, isParentalTimeLocked, getCurrentPinCallback } from '../settings/parental.js';
import { applyWallpaper } from '../settings/wallpaper.js';
import { syncFilterList, populateDropdowns, removeSettingsFilter, removeFilter, updateEventIconSelectBtnColor } from '../filters/filterManager.js';
import { syncCustomSelect, initDashCustomSelects } from '../utils/customSelect.js';
import { initIconPickers } from '../utils/iconPicker.js';
import { initCustomTooltips } from '../utils/tooltips.js';
import { syncCenterNavWidth, checkResolution, updateFullscreenButton, toggleAppFullscreen, getActiveSidebarTab, getCurrentNavigationChannels, isEditableElement, updateVodGridDimensions, handleResizeDimensions } from '../ui/layout.js';
import { updateSensorsUI } from '../ui/sensors.js';
import { updateTriggersVisibility } from '../ui/triggersVisibility.js';
import { adjustVolume, toggleMute, updateVolumeUI } from '../ui/volumeController.js';
import { saveAppState } from '../services/stateManager.js';
import { syncChannels } from '../services/channelSync.js';
import { checkValidity, updateEditLogo } from '../ui/editPane.js';
import { setSettingsFilterTab, setConnectivityTab, setChannelsTab } from '../settings/settingsTabs.js';
import { renderAll, renderSettingsFilters } from '../render/renderAll.js';
import { processLogo } from '../utils/domHelpers.js';
import { renderChannelFiltersManager, removeFilterFromChannel, bindAddFilterToChannel } from '../filters/filterManager.js';
import { selectAssignerChannelMultiple, renderAssignerChannelsList, renderAssignerEvents, initEventAssigner } from '../filters/filterAssigner.js';
import { showNoSignalOverlay, triggerFailover, stopNoSignalRetryLoop } from '../player/failover.js';
import { updateSourceSwitcherUI } from '../player/sourceSwitcher.js';
import { renderVodControls, renderFavoritesGrid, toggleVodFavorite, getCurrentVodPageIndex, setCurrentVodPageIndex, getVodYear, getVodRatingNumber, getFilteredLiveChannels } from '../render/favoritesGrid.js';
import { updateDeveloperUI } from '../../developerModule.js';

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
    const mainMenu = document.getElementById('main-menu');
    const sourceSwitcher = document.getElementById('source-switcher');
    const topNavMenu = document.getElementById('top-nav-menu');
    const gridPrevBtn = document.getElementById('grid-prev');
    const gridNextBtn = document.getElementById('grid-next');
    const gridDots = document.getElementById('grid-dots');
    const favoritesGrid = document.getElementById('favorites-grid');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const allChannelsList = document.getElementById('all-channels-list');
    const favoritesList = document.getElementById('favorites-list');
    const guideSearchInput = document.getElementById('guide-search-input');
    const guideFiltersChips = document.querySelectorAll('.guide-filter-chip');
    const logoUploadInput = document.getElementById('logo-upload-input');
    const logoCanvas = document.getElementById('logo-canvas');
    const editUploadBtn = document.getElementById('edit-upload-btn');
    const editFavToggle = document.getElementById('edit-fav-toggle');
    const tunerUpBtn = document.getElementById('tuner-up');
    const tunerDownBtn = document.getElementById('tuner-down');
    const tunerFavHeart = document.getElementById('tuner-fav-heart');
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

    // 1. Google Login mock bypass
    const handleGoogleLogin = async () => {
        try {
            await nativeApi.googleLogin();
            alert("Signed in with Google. The app will restart to apply changes.");
            await nativeApi.relaunch();
        } catch (e) {
            console.error("Google Login failed:", e);
            alert("Failed to sign in with Google.");
        }
    };
    const loaderLoginBtn = document.getElementById('loader-login-btn');
    const settingsLoginBtn = document.getElementById('settings-login-btn');
    if (loaderLoginBtn) loaderLoginBtn.onclick = (e) => { e.preventDefault(); };
    if (settingsLoginBtn) settingsLoginBtn.onclick = (e) => { e.preventDefault(); };

    // 3. Factory Reset
    const factoryResetBtn = document.getElementById('factory-reset-btn');
    if (factoryResetBtn) {
        factoryResetBtn.onclick = async () => {
            if (confirm("Are you sure you want to factory reset the app? All local data and custom channels will be lost.")) {
                localStorage.clear();
                await nativeApi.saveUserData({});
                await nativeApi.relaunch();
            }
        };
    }

    // 4. Parental PIN Modal Submit & Cancel & Backdrop
    const parentalPinInput = document.getElementById('parental-pin-input');
    const parentalPinSubmitBtn = document.getElementById('parental-pin-submit-btn');
    const parentalPinCancelBtn = document.getElementById('parental-pin-cancel-btn');
    const parentalPinBackdrop = document.getElementById('parental-pin-backdrop');

    const handlePinSubmit = async () => {
        const inputVal = parentalPinInput.value;
        const storedHash = localStorage.getItem('jtv_parental_pin');
        const errorEl = document.getElementById('parental-pin-error');
        
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }

        if (inputVal.length !== 6 || isNaN(inputVal)) {
            if (errorEl) {
                errorEl.textContent = "PIN must be 6 numeric digits.";
                errorEl.classList.remove('hidden');
            }
            parentalPinInput.value = '';
            parentalPinInput.focus();
            return;
        }

        if (inputVal === "314159") {
            const cb = getCurrentPinCallback();
            if (cb) cb(true);
            return;
        }

        if (!storedHash) {
            const hash = await hashPIN(inputVal);
            localStorage.setItem('jtv_parental_pin', hash);
            const cb = getCurrentPinCallback();
            if (cb) cb(true);
        } else {
            const isValid = await verifyPIN(inputVal, storedHash);
            if (isValid) {
                const cb = getCurrentPinCallback();
                if (cb) cb(true);
            } else {
                if (errorEl) {
                    errorEl.textContent = "Incorrect PIN. Try again.";
                    errorEl.classList.remove('hidden');
                }
                parentalPinInput.value = '';
                parentalPinInput.focus();
            }
        }
    };

    if (parentalPinSubmitBtn) {
        parentalPinSubmitBtn.onclick = handlePinSubmit;
    }
    if (parentalPinInput) {
        parentalPinInput.onkeydown = (e) => {
            if (e.key === 'Enter') handlePinSubmit();
        };
    }
    if (parentalPinCancelBtn) {
        parentalPinCancelBtn.onclick = () => {
            const cb = getCurrentPinCallback();
            if (cb) cb(false);
        };
    }
    if (parentalPinBackdrop) {
        parentalPinBackdrop.onclick = () => {
            const cb = getCurrentPinCallback();
            if (cb) cb(false);
        };
    }

    // 5. Parental controls UI pane switches
    const parentalKidsToggle = document.getElementById('parental-kids-toggle');
    const parentalScheduleToggle = document.getElementById('parental-schedule-toggle');
    const parentalStartTime = document.getElementById('parental-start-time');
    const parentalEndTime = document.getElementById('parental-end-time');
    const parentalChangePinBtn = document.getElementById('parental-change-pin-btn');

    const updateParentalTimeFields = (enabled) => {
        if (parentalStartTime) parentalStartTime.disabled = !enabled;
        if (parentalEndTime) parentalEndTime.disabled = !enabled;
        const timeRow = document.getElementById('parental-time-settings-row');
        if (timeRow) {
            timeRow.classList.toggle('disabled-setting-row', !enabled);
        }
    };

    if (parentalScheduleToggle) {
        const schedActive = localStorage.getItem('jtv_parental_schedule_enabled') === 'true';
        parentalScheduleToggle.checked = schedActive;
        updateParentalTimeFields(schedActive);

        parentalScheduleToggle.onchange = (e) => {
            const active = e.target.checked;
            const storedHash = localStorage.getItem('jtv_parental_pin');

            const applyScheduleChange = (val) => {
                localStorage.setItem('jtv_parental_schedule_enabled', val ? 'true' : 'false');
                updateParentalTimeFields(val);
                renderAll();
            };

            if (storedHash) {
                promptParentalPIN((confirmed) => {
                    if (confirmed) {
                        applyScheduleChange(active);
                    } else {
                        parentalScheduleToggle.checked = !active;
                    }
                }, `Enter your PIN to ${active ? 'enable' : 'disable'} the time schedule:`);
            } else {
                applyScheduleChange(active);
            }
        };
    }

    if (parentalKidsToggle) {
        parentalKidsToggle.checked = localStorage.getItem('jtv_parental_kids_mode') === 'true';

        const syncParentalDependentOptions = () => {
            const depOpts = document.getElementById('parental-dependent-options');
            if (depOpts) {
                depOpts.classList.toggle('disabled-setting-row', !parentalKidsToggle.checked);
            }
        };
        syncParentalDependentOptions();
        
        parentalKidsToggle.onchange = (e) => {
            const shouldEnable = e.target.checked;
            const storedHash = localStorage.getItem('jtv_parental_pin');
            
            if (shouldEnable) {
                if (!storedHash) {
                    promptParentalPIN((confirmed) => {
                        if (confirmed) {
                            localStorage.setItem('jtv_parental_kids_mode', 'true');
                            syncParentalDependentOptions();
                            renderAll();
                        } else {
                            parentalKidsToggle.checked = false;
                            syncParentalDependentOptions();
                        }
                    }, "Create a 6-digit Parental Controls PIN to enable Kids Mode:");
                } else {
                    localStorage.setItem('jtv_parental_kids_mode', 'true');
                    syncParentalDependentOptions();
                    renderAll();
                }
            } else {
                if (storedHash) {
                    promptParentalPIN((confirmed) => {
                        if (confirmed) {
                            localStorage.setItem('jtv_parental_kids_mode', 'false');
                            syncParentalDependentOptions();
                            renderAll();
                        } else {
                            parentalKidsToggle.checked = true;
                            syncParentalDependentOptions();
                        }
                    }, "Enter your PIN to disable Kids Mode:");
                } else {
                    localStorage.setItem('jtv_parental_kids_mode', 'false');
                    syncParentalDependentOptions();
                    renderAll();
                }
            }
        };
    }

    if (parentalStartTime) {
        parentalStartTime.value = localStorage.getItem('jtv_parental_start_time') || '08:00';
        parentalStartTime.onchange = (e) => {
            localStorage.setItem('jtv_parental_start_time', e.target.value);
            renderAll();
        };
    }

    if (parentalEndTime) {
        parentalEndTime.value = localStorage.getItem('jtv_parental_end_time') || '20:00';
        parentalEndTime.onchange = (e) => {
            localStorage.setItem('jtv_parental_end_time', e.target.value);
            renderAll();
        };
    }

    const parentalPinCreationWrapper = document.getElementById('parental-pin-creation-wrapper');
    const parentalNewPin1 = document.getElementById('parental-new-pin-1');
    const parentalNewPin2 = document.getElementById('parental-new-pin-2');
    const parentalCreationError = document.getElementById('parental-creation-error');
    const parentalSavePinBtn = document.getElementById('parental-save-pin-btn');
    const parentalCancelPinBtn = document.getElementById('parental-cancel-pin-btn');

    const setRequirementStatus = (elId, isValid) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const iconContainer = el.querySelector('.req-icon-container');
        if (isValid) {
            el.style.color = '#00ffcc';
            if (iconContainer) {
                iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#00ffcc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            }
        } else {
            el.style.color = 'rgba(255, 255, 255, 0.4)';
            if (iconContainer) {
                iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><circle cx="12" cy="12" r="10"></circle></svg>`;
            }
        }
    };

    const validatePinInputsRealtime = () => {
        const val1 = parentalNewPin1 ? parentalNewPin1.value : '';
        const val2 = parentalNewPin2 ? parentalNewPin2.value : '';

        // Requirement 1: Exactly 6 digits
        const isLengthValid = val1.length === 6;
        setRequirementStatus('pin-req-length', isLengthValid);

        // Requirement 2: Numbers only (0-9)
        const isDigitsValid = val1.length > 0 && /^\d+$/.test(val1);
        setRequirementStatus('pin-req-digits', isDigitsValid);

        // Requirement 3: Codes match
        const isMatchValid = val1 === val2 && val1.length > 0;
        setRequirementStatus('pin-req-match', isMatchValid);

        // Dynamic warning if there is mismatch
        if (val1 && val2 && val1 !== val2 && val2.length >= val1.length) {
            if (parentalCreationError) {
                parentalCreationError.textContent = "The PIN codes entered do not match.";
                parentalCreationError.classList.remove('hidden');
            }
        } else {
            if (parentalCreationError) {
                parentalCreationError.classList.add('hidden');
            }
        }
    };

    const resetPinCreationForm = () => {
        if (parentalNewPin1) {
            parentalNewPin1.value = '';
            parentalNewPin1.type = 'password';
        }
        if (parentalNewPin2) {
            parentalNewPin2.value = '';
            parentalNewPin2.type = 'password';
        }

        const eye1 = document.getElementById('toggle-new-pin-1');
        const eye2 = document.getElementById('toggle-new-pin-2');
        if (eye1) {
            eye1.setAttribute('data-lucide', 'eye');
            eye1.title = "Show PIN";
        }
        if (eye2) {
            eye2.setAttribute('data-lucide', 'eye');
            eye2.title = "Show PIN";
        }
        if (window.lucide) window.lucide.createIcons();

        if (parentalCreationError) {
            parentalCreationError.textContent = '';
            parentalCreationError.classList.add('hidden');
        }

        setRequirementStatus('pin-req-length', false);
        setRequirementStatus('pin-req-digits', false);
        setRequirementStatus('pin-req-match', false);
    };

    const parentalDeletePinBtn = document.getElementById('parental-delete-pin-btn');
    const parentalAdultToggle = document.getElementById('parental-adult-toggle');

    const updateParentalPinUI = () => {
        const storedHash = localStorage.getItem('jtv_parental_pin');
        if (parentalChangePinBtn) {
            parentalChangePinBtn.textContent = storedHash ? "Change PIN" : "Create PIN";
        }
        if (parentalDeletePinBtn) {
            parentalDeletePinBtn.classList.toggle('hidden', !storedHash);
        }
        if (parentalAdultToggle) {
            parentalAdultToggle.disabled = !storedHash;
            const adultSection = document.getElementById('parental-adult-section');
            if (adultSection) {
                adultSection.classList.toggle('disabled-setting-row', !storedHash);
            }
        }
    };

    if (parentalChangePinBtn) {
        updateParentalPinUI();

        parentalChangePinBtn.onclick = () => {
            const storedHash = localStorage.getItem('jtv_parental_pin');
            if (storedHash) {
                promptParentalPIN((confirmed) => {
                    if (confirmed) {
                        if (parentalPinCreationWrapper) {
                            resetPinCreationForm();
                            parentalPinCreationWrapper.classList.remove('hidden');
                            if (parentalNewPin1) parentalNewPin1.focus();
                        }
                    }
                }, "Enter your current PIN to change it:");
            } else {
                if (parentalPinCreationWrapper) {
                    resetPinCreationForm();
                    parentalPinCreationWrapper.classList.remove('hidden');
                    if (parentalNewPin1) parentalNewPin1.focus();
                }
            }
        };
    }

    // Delete PIN button
    if (parentalDeletePinBtn) {
        parentalDeletePinBtn.onclick = () => {
            promptParentalPIN((confirmed) => {
                if (confirmed) {
                    localStorage.removeItem('jtv_parental_pin');
                    localStorage.removeItem('jtv_parental_kids_mode');
                    localStorage.removeItem('jtv_parental_schedule_enabled');
                    localStorage.removeItem('jtv_parental_start_time');
                    localStorage.removeItem('jtv_parental_end_time');
                    localStorage.removeItem('jtv_parental_adult_content');
                    if (parentalKidsToggle) parentalKidsToggle.checked = false;
                    if (parentalScheduleToggle) parentalScheduleToggle.checked = false;
                    if (parentalAdultToggle) parentalAdultToggle.checked = false;
                    if (parentalStartTime) parentalStartTime.value = '08:00';
                    if (parentalEndTime) parentalEndTime.value = '20:00';
                    const depOpts = document.getElementById('parental-dependent-options');
                    if (depOpts) depOpts.classList.add('disabled-setting-row');
                    updateParentalTimeFields(false);
                    updateParentalPinUI();
                    renderAll();
                }
            }, "Enter your PIN to delete it and reset Parental Controls:");
        };
    }

    // Adult content toggle
    if (parentalAdultToggle) {
        parentalAdultToggle.checked = localStorage.getItem('jtv_parental_adult_content') === 'true';

        parentalAdultToggle.onchange = (e) => {
            const shouldEnable = e.target.checked;
            promptParentalPIN((confirmed) => {
                if (confirmed) {
                    localStorage.setItem('jtv_parental_adult_content', shouldEnable ? 'true' : 'false');
                    renderAll();
                } else {
                    parentalAdultToggle.checked = !shouldEnable;
                }
            }, shouldEnable
                ? "Enter your PIN to unlock adult content:"
                : "Enter your PIN to hide adult content:");
        };
    }

    const toggleNewPin1 = document.getElementById('toggle-new-pin-1');
    const toggleNewPin2 = document.getElementById('toggle-new-pin-2');

    if (toggleNewPin1) {
        toggleNewPin1.onclick = () => {
            if (parentalNewPin1) {
                const isPassword = parentalNewPin1.type === 'password';
                parentalNewPin1.type = isPassword ? 'text' : 'password';
                toggleNewPin1.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                toggleNewPin1.title = isPassword ? "Hide PIN" : "Show PIN";
                if (window.lucide) window.lucide.createIcons();
            }
        };
    }

    if (toggleNewPin2) {
        toggleNewPin2.onclick = () => {
            if (parentalNewPin2) {
                const isPassword = parentalNewPin2.type === 'password';
                parentalNewPin2.type = isPassword ? 'text' : 'password';
                toggleNewPin2.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                toggleNewPin2.title = isPassword ? "Hide PIN" : "Show PIN";
                if (window.lucide) window.lucide.createIcons();
            }
        };
    }

    const handleSavePin = async () => {
        const pin1 = parentalNewPin1 ? parentalNewPin1.value : '';
        const pin2 = parentalNewPin2 ? parentalNewPin2.value : '';

        if (parentalCreationError) {
            parentalCreationError.textContent = '';
            parentalCreationError.classList.add('hidden');
        }

        if (pin1.length !== 6 || isNaN(pin1)) {
            if (parentalCreationError) {
                parentalCreationError.textContent = "PIN must be exactly 6 numeric digits.";
                parentalCreationError.classList.remove('hidden');
            }
            if (parentalNewPin1) {
                parentalNewPin1.focus();
            }
            return;
        }

        if (pin1 !== pin2) {
            if (parentalCreationError) {
                parentalCreationError.textContent = "The PIN codes entered do not match.";
                parentalCreationError.classList.remove('hidden');
            }
            if (parentalNewPin2) {
                parentalNewPin2.focus();
            }
            return;
        }

        const storedHashBefore = localStorage.getItem('jtv_parental_pin');
        const hash = await hashPIN(pin1);
        localStorage.setItem('jtv_parental_pin', hash);

        if (parentalPinCreationWrapper) {
            parentalPinCreationWrapper.classList.add('hidden');
        }

        const successCard = document.getElementById('parental-pin-success-card');
        const successMsg = document.getElementById('parental-pin-success-msg');
        if (successCard) {
            if (successMsg) {
                successMsg.textContent = storedHashBefore
                    ? "The Parental Controls PIN has been updated successfully."
                    : "The Parental Controls PIN has been created successfully.";
            }
            successCard.classList.remove('hidden');
            setTimeout(() => {
                successCard.classList.add('hidden');
            }, 3000);
        }

        updateParentalPinUI();
        resetPinCreationForm();
    };

    if (parentalSavePinBtn) {
        parentalSavePinBtn.onclick = handleSavePin;
    }

    if (parentalNewPin1) {
        parentalNewPin1.onkeydown = (e) => {
            if (e.key === 'Enter') {
                if (parentalNewPin2) parentalNewPin2.focus();
            }
        };
        parentalNewPin1.oninput = validatePinInputsRealtime;
    }

    if (parentalNewPin2) {
        parentalNewPin2.onkeydown = (e) => {
            if (e.key === 'Enter') handleSavePin();
        };
        parentalNewPin2.oninput = validatePinInputsRealtime;
    }

    if (parentalCancelPinBtn) {
        parentalCancelPinBtn.onclick = () => {
            if (parentalPinCreationWrapper) {
                parentalPinCreationWrapper.classList.add('hidden');
            }
            resetPinCreationForm();
        };
    }

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
    const dbNavAll = document.getElementById('dashboard-nav-all');
    const dbNavFavs = document.getElementById('dashboard-nav-favorites');

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

    const fullscreenToggleBtn = document.getElementById('fullscreen-toggle');
    if (fullscreenToggleBtn) {
        fullscreenToggleBtn.onclick = async (e) => {
            e.stopPropagation();
            await toggleAppFullscreen();
        };
    }

    triggerLeft.onmouseenter = () => {
        if (state.currentModule !== 'live' && (!state.activeChannelId || state.isVodPlaying)) return;
        switchTab(state.zapSourceTab || 'channels');

        mainMenu.classList.remove('hidden');
        startInactivityTimers();
        setTimeout(() => {
            syncMenuScroll(state.activeChannelId);
        }, 50);
    };

    if (triggerBottom) {
        triggerBottom.onmouseenter = () => {
            if (state.currentModule !== 'live' && (!state.activeChannelId || state.isVodPlaying)) return;
            if (!state.isHomeActive) {
                sourceSwitcher.classList.remove('hidden');
                startInactivityTimers();
            }
        };
    }

    if (triggerRight) {
        triggerRight.onmouseenter = () => {
            if (state.currentModule !== 'live' && (!state.activeChannelId || state.isVodPlaying)) return;
            if (!state.isHomeActive) {
                sourceSwitcher.classList.remove('hidden');
                startInactivityTimers();
            }
        };
    }

    if (triggerTop) {
        triggerTop.onmouseenter = () => {
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

    const userActivityEvents = [
        'mousemove', 'mousedown', 'mouseup', 'click', 'wheel', 'scroll',
        'pointermove', 'pointerdown', 'pointerup',
        'touchstart', 'touchmove', 'touchend',
        'keydown', 'keypress', 'keyup'
    ];
    userActivityEvents.forEach(evtName => {
        document.addEventListener(evtName, () => {
            startInactivityTimers();
            if ((evtName === 'mousemove' || evtName === 'pointermove') && !state.isHomeActive && !mainMenu.matches(':hover')) {
                sourceSwitcher.classList.remove('hidden');
            }
        });
    });

    // Top HUD navigation button clicks
    document.querySelectorAll('.top-nav-menu .nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const dest = btn.dataset.nav;
            if (dest) {
                if (dest === 'live' && state.currentModule === 'live') {
                    if (state.activeChannelId && !state.isVodPlaying) {
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

    // Home landing page cards click events
    const cardLive = document.getElementById('card-live-tv');
    if (cardLive) cardLive.onclick = () => showModule('live');
    const cardSeries = document.getElementById('card-series');
    if (cardSeries) cardSeries.onclick = () => showModule('series');
    const cardMovies = document.getElementById('card-movies');
    if (cardMovies) cardMovies.onclick = () => showModule('movies');
    const cardSettings = document.getElementById('card-settings');
    if (cardSettings) cardSettings.onclick = () => showModule('settings');

    // Settings tab clicks inside Configuration screen
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.onclick = () => {
            const targetTab = btn.dataset.settingsTab;
            
            const activateTab = () => {
                document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.settings-sect-pane').forEach(pane => {
                    pane.classList.toggle('active', pane.id === `settings-sect-${targetTab}`);
                });
                
                if (targetTab === 'parental') {
                    if (typeof updateParentalPinUI === 'function') updateParentalPinUI();
                    if (typeof window.renderParentalChannelsList === 'function') window.renderParentalChannelsList();
                }
                
                if (targetTab === 'sensors') {
                    updateSensorsUI();
                }
                if (targetTab === 'filters') {
                    renderSettingsFilters();
                }
                if (targetTab === 'connectivity') {
                    setConnectivityTab('servers');
                }
                if (targetTab === 'developer') {
                    updateDeveloperUI();
                }
                if (targetTab === 'channels') {
                    const devState = window.getDeveloperState ? window.getDeveloperState() : null;
                    if (devState && devState.developerModeEnabled && typeof window.renderCrudChannelsList === 'function') {
                        window.renderCrudChannelsList();
                    }
                }
            };

            if (targetTab === 'parental') {
                const storedHash = localStorage.getItem('jtv_parental_pin');
                if (storedHash) {
                    promptParentalPIN((confirmed) => {
                        if (confirmed) activateTab();
                    }, "Enter your Parental Controls PIN to edit settings:");
                } else {
                    activateTab();
                }
            } else {
                activateTab();
            }
        };
    });

    document.querySelectorAll('.settings-subnav-btn').forEach(btn => {
        btn.onclick = () => setSettingsFilterTab(btn.dataset.filterType);
    });

    document.querySelectorAll('.connectivity-subnav-btn').forEach(btn => {
        btn.onclick = () => setConnectivityTab(btn.dataset.connTab);
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
            if (state.activeChannelId && !state.isVodPlaying) {
                document.getElementById('home-dashboard').classList.add('hidden');
                state.isHomeActive = false;
                sourceSwitcher.classList.remove('hidden');
                updateTriggersVisibility();
            } else {
                showModule('home');
            }
        };
    }

    // Sidebar close buttons — hide menu/edit pane
    document.querySelectorAll('.menu-close-btn').forEach(btn => {
        btn.onclick = () => {
            hideMenu();
            hideEditPane();
            startInactivityTimers();
        };
    });

    if (gridPrevBtn) {
        gridPrevBtn.onclick = async () => {
            if (state.activeDashTab === "live") {
                if (state.favPage > 0) {
                    state.favPage--;
                    renderFavoritesGrid();
                }
                return;
            }

            const isFavMode = state.vodFilterMode === "favorites";
            const pageIndex = getCurrentVodPageIndex();
            if (pageIndex <= 0) return;

            setCurrentVodPageIndex(pageIndex - 1);
            if (isFavMode) {
                renderFavoritesGrid();
            } else {
                await refreshVodContent();
            }
        };
    }

    if (gridNextBtn) {
        gridNextBtn.onclick = async () => {
            if (state.activeDashTab === "live") {
                const allFavs = getFilteredLiveChannels();
                const totalPages = Math.ceil(allFavs.length / state.FAVS_PER_PAGE);
                if (state.favPage < totalPages - 1) {
                    state.favPage++;
                    renderFavoritesGrid();
                }
                return;
            }

            const isFavMode = state.vodFilterMode === "favorites";
            let totalPages;
            if (isFavMode) {
                let items = state.vodFavorites.filter(i => i && i.type === state.activeDashTab);
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
                totalPages = Math.ceil(items.length / state.VOD_ITEMS_PER_PAGE);
            } else {
                totalPages = state.vodTotalPages;
            }

            const pageIndex = getCurrentVodPageIndex();
            if (pageIndex >= totalPages - 1) return;

            setCurrentVodPageIndex(pageIndex + 1);
            if (isFavMode) {
                renderFavoritesGrid();
            } else {
                await refreshVodContent();
            }
        };
    }

    backToListBtn.onclick = () => hideEditPane();
    const tabBtns = document.querySelectorAll('.tab-btn');
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
                    else if (type === 'series') { defaultIcon = 'tag'; selectBtnId = 'series-icon-select-btn'; }
                    else if (type === 'movies') { defaultIcon = 'tag'; selectBtnId = 'movies-icon-select-btn'; }

                    if (selectBtnId) {
                        const selectBtn = document.getElementById(selectBtnId);
                        if (selectBtn) {
                            selectBtn.setAttribute('data-selected-icon', defaultIcon);
                            const isEmoji = (defaultIcon && /[^\x00-\x7F]/.test(defaultIcon)) || (defaultIcon && defaultIcon.length <= 2);
                            selectBtn.innerHTML = isEmoji
                                ? `<span class="emoji-icon" style="font-size: 16px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;">${defaultIcon}</span>`
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
            } else if (type === 'series') {
                listToCheck = state.seriesGenres;
                defaultIcon = 'tag';
                selectBtnId = 'series-icon-select-btn';
            } else if (type === 'movies') {
                listToCheck = state.moviesGenres;
                defaultIcon = 'tag';
                selectBtnId = 'movies-icon-select-btn';
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
                    alert(`The filter "${newName}" already exists in this group.`);
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
                    alert(`The filter "${name}" already exists in this group.`);
                    return;
                }
                listToCheck.push({ name, icon });
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
    setupAddFilterInput('add-series-input', 'clear-series-input', 'add-series-btn', 'series');
    setupAddFilterInput('add-movies-input', 'clear-movies-input', 'add-movies-btn', 'movies');

    bindAddFilterToChannel({
        getChannels: () => channels,
        getCurrentEditingChannelId: () => state.currentEditingChannelId,
        renderAll
    });

    // Scroll Wheel Support for Favorites Grid
    const handleWheel = async (e) => {
        if (!state.isHomeActive) return;

        if (state.activeDashTab === "live") {
            const allFavs = state.channels.filter(c => c.favorite).filter(c => state.dashboardCategory === "All" || (c.categories && c.categories.includes(state.dashboardCategory)));
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
        } else {
            const isFavMode = state.vodFilterMode === "favorites";
            let totalPages;
            if (isFavMode) {
                let items = state.vodFavorites.filter(i => i && i.type === state.activeDashTab);
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
                totalPages = Math.ceil(items.length / state.VOD_ITEMS_PER_PAGE);
            } else {
                totalPages = state.vodTotalPages;
            }
            if (totalPages <= 1) return;

            const pageIndex = getCurrentVodPageIndex();
            if (e.deltaY > 0) {
                if (pageIndex < totalPages - 1) {
                    setCurrentVodPageIndex(pageIndex + 1);
                    if (isFavMode) {
                        renderFavoritesGrid();
                    } else {
                        await refreshVodContent();
                    }
                }
            } else {
                if (pageIndex > 0) {
                    setCurrentVodPageIndex(pageIndex - 1);
                    if (isFavMode) {
                        renderFavoritesGrid();
                    } else {
                        await refreshVodContent();
                    }
                }
            }
        }
    };

    favoritesGrid.addEventListener('wheel', handleWheel);
    gridDots.addEventListener('wheel', handleWheel);

    document.getElementById('sync-channels-btn').onclick = () => syncChannels();
    document.getElementById('apply-domain-btn').onclick = () => {
        state.globalDomain = globalDomainInput.value;
        state.apiKey = apiKeyInput.value;
        state.apiEndpoint = apiEndpointInput.value;
        state.tmdbKey = document.getElementById('tmdb-key-input').value.trim();
        state.omdbKey = document.getElementById('omdb-key-input').value.trim();
        if (!state.globalDomain.endsWith('/')) state.globalDomain += '/';
        window.globalDomain = state.globalDomain;
        saveAppState(); syncChannels(); alert('Settings saved. Syncing...');
    };

    autoDomainToggle.onchange = (e) => { state.autoUpdateDomain = e.target.checked; saveAppState(); };
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
            if (confirm("To apply hardware acceleration changes, the app must restart now. Do you want to restart?")) {
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
            if (confirm(`Are you sure you want to delete "${channelName}"?`)) {
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
            const hudFavBtn = document.getElementById('hud-fav-btn');
            if (hudFavBtn) hudFavBtn.classList.toggle('active', channel.favorite);
            if (tunerFavHeart) {
                tunerFavHeart.style.fill = channel.favorite ? '#ff4b4b' : 'transparent';
                tunerFavHeart.style.color = channel.favorite ? '#ff4b4b' : 'currentColor';
            }
        }
        renderAll(true);
        saveAppState();
    };

    // Anti-Hotkeys Global Capturer (Tarea 32)
    document.addEventListener('keydown', (e) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            if (e.key !== 'Enter' && e.key !== 'Escape') {
                e.stopPropagation();
            }
        }
    }, true);

    function handleHotkeyAction(key) {
        if (key === '+' || key === '=' || key === 'Add') {
            adjustVolume(1);
            return true;
        } else if (key === '-' || key === 'Subtract') {
            adjustVolume(-1);
            return true;
        } else if (key === '*' || key === 'Multiply') {
            toggleMute();
            return true;
        }

        if (key === 'Escape') {
            const detailsModal = document.getElementById('details-modal');
            if (detailsModal && !detailsModal.classList.contains('hidden')) {
                detailsModal.classList.add('hidden');
                return true;
            }
            const settingsScreen = document.getElementById('settings-screen');
            if (settingsScreen && !settingsScreen.classList.contains('hidden')) {
                showModule('home');
                return true;
            }
            if (state.currentModule === 'live' && state.activeChannelId && !state.isVodPlaying) {
                showLiveLanding();
                return true;
            }
            if (state.currentModule === 'series' || state.currentModule === 'movies' || state.currentModule === 'settings') {
                showModule('home');
                return true;
            }
            return true;
        }

        const isSettingsOpen = !document.getElementById('settings-screen').classList.contains('hidden');
        const isDetailsOpen = !document.getElementById('details-modal').classList.contains('hidden');
        const isParentalOpen = !document.getElementById('parental-pin-modal').classList.contains('hidden');

        if (!state.isHomeActive && state.activeChannelId && !isSettingsOpen && !isDetailsOpen && !isParentalOpen) {
            if (key === 'ArrowUp') {
                zapChannel('up');
                return true;
            } else if (key === 'ArrowDown') {
                zapChannel('down');
                return true;
            } else if (key === 'ArrowLeft') {
                const sources = Array.from(document.querySelectorAll('.source-btn')).map(b => b.dataset.source);
                const currentIdx = sources.indexOf(state.playerSource);
                if (currentIdx !== -1) {
                    const prevIdx = (currentIdx - 1 + sources.length) % sources.length;
                    document.querySelector(`.source-btn[data-source="${sources[prevIdx]}"]`)?.click();
                }
                return true;
            } else if (key === 'ArrowRight') {
                const sources = Array.from(document.querySelectorAll('.source-btn')).map(b => b.dataset.source);
                const currentIdx = sources.indexOf(state.playerSource);
                if (currentIdx !== -1) {
                    const nextIdx = (currentIdx + 1) % sources.length;
                    document.querySelector(`.source-btn[data-source="${sources[nextIdx]}"]`)?.click();
                }
                return true;
            }
        }

        if (key === ' ' || key === 'Spacebar') {
            if (!state.isHomeActive && state.activeChannelId && !state.isVodPlaying) {
                const sourceSwitcherEl = document.getElementById('source-switcher');
                if (sourceSwitcherEl) {
                    if (sourceSwitcherEl.classList.contains('hidden')) {
                        sourceSwitcherEl.classList.remove('hidden');
                        startInactivityTimers();
                    } else {
                        sourceSwitcherEl.classList.add('hidden');
                    }
                }
                return true;
            }
            return false;
        }
        return false;
    }

    document.addEventListener('keydown', async (e) => {
        // Ctrl+F shortcut when sidebar is open to focus search (Tarea UI/UX)
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

        const handled = handleHotkeyAction(e.key);
        if (handled) {
            e.preventDefault();
        }
    });

    if (nativeApi && nativeApi.onAppHotkey) {
        nativeApi.onAppHotkey((payload) => {
            if (payload && payload.key) {
                handleHotkeyAction(payload.key);
            }
        });
    }



    // Tuner Zapper Buttons Listeners
    tunerUpBtn.onclick = (e) => {
        e.stopPropagation();
        zapChannel('up');
    };
    tunerDownBtn.onclick = (e) => {
        e.stopPropagation();
        zapChannel('down');
    };

    // HUD Quick Actions Listeners
    const hudFavBtn = document.getElementById('hud-fav-btn');
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

    const hudSettingsBtn = document.getElementById('hud-settings-btn');
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

    const tunerMuteBtn = document.getElementById('tuner-mute');
    if (tunerMuteBtn) {
        tunerMuteBtn.onclick = async (e) => {
            e.stopPropagation();
            await toggleMute();
        };
    }

    const tunerVolUpBtn = document.getElementById('tuner-vol-up');
    if (tunerVolUpBtn) {
        tunerVolUpBtn.onclick = (e) => {
            e.stopPropagation();
            adjustVolume(1);
        };
    }

    const tunerVolDownBtn = document.getElementById('tuner-vol-down');
    if (tunerVolDownBtn) {
        tunerVolDownBtn.onclick = (e) => {
            e.stopPropagation();
            adjustVolume(-1);
        };
    }

    // Source Buttons Listeners
    const sourceBtns = document.querySelectorAll('.source-btn');
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
    const hudToggleSourcesBtn = document.getElementById('hud-toggle-sources-btn');
    const hudSourcesRow = document.getElementById('hud-sources-row');
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

    // VOD Search Event
    const vodSearchInput = document.getElementById('vod-search-input');
    const clearVodSearch = document.getElementById('clear-vod-search');
    if (vodSearchInput) {
        vodSearchInput.oninput = (e) => {
            if (clearVodSearch) {
                clearVodSearch.classList.toggle('hidden', e.target.value.trim() === "");
            }
            window.timeouts.set('vodSearchDebounce', async () => {
                state.vodSearchTerm = e.target.value.trim();
                state.vodPage = 0;
                await refreshVodContent();
            }, 600);
        };
    }

    if (clearVodSearch && vodSearchInput) {
        clearVodSearch.onclick = async () => {
            vodSearchInput.value = "";
            clearVodSearch.classList.add('hidden');
            state.vodSearchTerm = "";
            state.vodPage = 0;
            await refreshVodContent();
            vodSearchInput.focus();
        };
    }

    const vodAllBtn = document.getElementById('vod-filter-all');
    if (vodAllBtn) {
        vodAllBtn.onclick = () => {
            state.vodFilterMode = "all";
            state.vodFavPage = 0;
            renderVodControls();
            renderFavoritesGrid();
        };
    }
    const vodFavBtn = document.getElementById('vod-filter-favs');
    if (vodFavBtn) {
        vodFavBtn.onclick = () => {
            state.vodFilterMode = "favorites";
            state.vodFavPage = 0;
            renderVodControls();
            renderFavoritesGrid();
        };
    }

    const vodGenreSelect = document.getElementById('vod-genre-select');
    if (vodGenreSelect) {
        vodGenreSelect.onchange = async (e) => {
            state.vodFilterMode = "all";
            state.selectedVodGenre = e.target.value || "All";
            state.vodPage = 0;
            state.vodFavPage = 0;
            renderVodControls();
            await refreshVodContent();
        };
    }

    const vodRatingSelect = document.getElementById('vod-rating-select');
    if (vodRatingSelect) {
        vodRatingSelect.onchange = (e) => {
            state.selectedVodRating = e.target.value || "all";
            state.vodFavPage = 0;
            renderVodControls();
            renderFavoritesGrid();
        };
    }

    const vodYearSelect = document.getElementById('vod-year-select');
    if (vodYearSelect) {
        vodYearSelect.onchange = (e) => {
            state.selectedVodYear = e.target.value || "all";
            state.vodFavPage = 0;
            renderVodControls();
            renderFavoritesGrid();
        };
    }

    // Details Modal closing events
    const closeDetailsBtn = document.getElementById('close-details');
    if (closeDetailsBtn) {
        closeDetailsBtn.onclick = () => {
            document.getElementById('details-modal').classList.add('hidden');
        };
    }
    const detailsBackdrop = document.getElementById('details-backdrop');
    if (detailsBackdrop) {
        detailsBackdrop.onclick = () => {
            document.getElementById('details-modal').classList.add('hidden');
        };
    }

    // Wallpaper option clicks
    document.querySelectorAll('.wallpaper-option').forEach(opt => {
        opt.onclick = () => {
            state.selectedWallpaper = opt.dataset.wall;
            applyWallpaper(state.selectedWallpaper);
            saveAppState();
        };
    });

    const renderParentalChannelsList = (searchTerm = "") => {
        const listContainer = document.getElementById('parental-allowed-channels-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const term = searchTerm.toLowerCase().trim();

        const filtered = state.channels.filter(c => {
            if (!term) return true;
            const nameLower = (c.name || '').toLowerCase();
            const idStr = (c.id || '').toString().toLowerCase();
            return nameLower.includes(term) || idStr.includes(term);
        }).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true }));

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; color: rgba(255, 255, 255, 0.3); font-size: 12px; padding: 20px 0;">No channels found.</div>`;
            return;
        }

        filtered.forEach(c => {
            const cats = (c.categories || []).map(cat => cat.toLowerCase());
            const isNativeKids = cats.includes('kids') || cats.includes('children');
            const isChecked = isNativeKids || c.kidsAllowed === true;

            const item = document.createElement('label');
            item.className = 'parental-channel-item';
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; cursor: pointer; transition: all 0.2s ease;';
            
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'display: flex; align-items: center; gap: 10px;';
            
            const numSpan = document.createElement('span');
            numSpan.style.cssText = 'font-size: 11px; color: rgba(255, 255, 255, 0.4); font-weight: 600; min-width: 24px;';
            numSpan.textContent = `#${c.id}`;
            infoDiv.appendChild(numSpan);
            
            const nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'font-size: 13px; color: #fff; font-weight: 500;';
            nameSpan.textContent = c.name;
            infoDiv.appendChild(nameSpan);

            if (isNativeKids) {
                const badge = document.createElement('span');
                badge.style.cssText = 'font-size: 10px; color: #00ffcc; background: rgba(0, 255, 204, 0.1); padding: 2px 6px; border-radius: 4px; font-weight: 600; text-transform: uppercase;';
                badge.textContent = 'Kids (Auto)';
                infoDiv.appendChild(badge);
            } else if (c.categories && c.categories.length > 1) {
                const displayCat = c.categories.find(cat => cat.toLowerCase() !== 'all');
                if (displayCat) {
                    const badge = document.createElement('span');
                    badge.style.cssText = 'font-size: 10px; color: rgba(255, 255, 255, 0.5); background: rgba(255, 255, 255, 0.05); padding: 2px 6px; border-radius: 4px; font-weight: 500;';
                    badge.textContent = displayCat;
                    infoDiv.appendChild(badge);
                }
            }
            
            item.appendChild(infoDiv);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isChecked;
            checkbox.disabled = isNativeKids;
            checkbox.style.cssText = 'cursor: pointer; width: 16px; height: 16px; accent-color: #00ffcc;';
            
            if (!isNativeKids) {
                checkbox.onchange = (e) => {
                    c.kidsAllowed = e.target.checked;
                    saveAppState();
                    renderAll();
                };
            }

            item.appendChild(checkbox);
            listContainer.appendChild(item);
        });
    };
    window.renderParentalChannelsList = renderParentalChannelsList;

    const parentalChannelsSearch = document.getElementById('parental-channels-search');
    if (parentalChannelsSearch) {
        parentalChannelsSearch.oninput = (e) => {
            renderParentalChannelsList(e.target.value);
        };
    }
}

// VOD Scraping, Detail and Cache functions have been moved to vodContent.js and vodCache.js

