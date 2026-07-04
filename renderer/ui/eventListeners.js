/* global lucide */
import { state } from '../state/appState.js';
import { selectChannel, zapChannel, mountRemotePlayer, playVod, updatePlayerActiveState } from '../player/playerController.js';
import { showModule, switchTab, showLiveLanding, hideMenu, hideEditPane } from '../ui/navigation.js';
import { syncMenuScroll } from '../render/channelList.js';
import { startInactivityTimers, clearInactivityTimers, startCursorTimer } from '../ui/inactivity.js';
import { refreshVodContent, showVodDetails } from '../vod/vodContent.js';
import { warmupVodCache } from '../vod/vodCache.js';
import { hashPIN, verifyPIN, promptParentalPIN, isParentalTimeLocked, getCurrentPinCallback } from '../settings/parental.js';
import { applyWallpaper } from '../settings/wallpaper.js';
import { syncFilterList, populateDropdowns, removeSettingsFilter, removeFilter, updateEventIconSelectBtnColor } from '../filters/filterManager.js';
import { emojiToHtml } from '../filters/filterState.js';
import { syncCustomSelect, initDashCustomSelects } from '../utils/customSelect.js';
import { initIconPickers } from '../utils/iconPicker.js';
import { initCustomTooltips } from '../utils/tooltips.js';
import { attachTimePicker } from '../ui/timePicker.js';
import { syncCenterNavWidth, checkResolution, updateFullscreenButton, toggleAppFullscreen, getActiveSidebarTab, getCurrentNavigationChannels, isEditableElement, updateVodGridDimensions, handleResizeDimensions } from '../ui/layout.js';
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
import { renderVodControls, renderFavoritesGrid, toggleVodFavorite, getCurrentVodPageIndex, setCurrentVodPageIndex, getVodYear, getVodRatingNumber, getFilteredLiveChannels } from '../render/favoritesGrid.js';
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
    if (loaderLoginBtn) loaderLoginBtn.onclick = (e) => { e.preventDefault(); };

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
            window.__lastPinWasEmergency = true;
            const cb = getCurrentPinCallback();
            if (cb) cb(true);
            return;
        }

        window.__lastPinWasEmergency = false;

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
                if (parentalPinSubmitBtn) parentalPinSubmitBtn.disabled = true;
                parentalPinInput.focus();
            }
        }
    };

    // Confirm only enables when the typed value is the correct stored PIN
    // or the emergency unlock PIN (or a valid new PIN when none is stored yet).
    const updateConfirmBtnState = async () => {
        if (!parentalPinSubmitBtn) return;
        const val = parentalPinInput ? parentalPinInput.value : '';
        const storedHash = localStorage.getItem('jtv_parental_pin');
        let ok = false;
        if (val.length === 6 && !isNaN(val)) {
            if (val === "314159") {
                ok = true;
            } else if (storedHash) {
                ok = await verifyPIN(val, storedHash);
            } else {
                ok = true; // no PIN stored yet: any valid 6-digit code is acceptable
            }
        }
        parentalPinSubmitBtn.disabled = !ok;
    };

    if (parentalPinSubmitBtn) {
        parentalPinSubmitBtn.onclick = handlePinSubmit;
    }
    if (parentalPinInput) {
        parentalPinInput.oninput = updateConfirmBtnState;
        parentalPinInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !(parentalPinSubmitBtn && parentalPinSubmitBtn.disabled)) handlePinSubmit();
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

    let startTimePicker = null;
    let endTimePicker = null;

    const updateParentalTimeFields = (enabled) => {
        if (parentalStartTime) parentalStartTime.disabled = !enabled;
        if (parentalEndTime) parentalEndTime.disabled = !enabled;
        if (startTimePicker) startTimePicker.setDisabled(!enabled);
        if (endTimePicker) endTimePicker.setDisabled(!enabled);
        const timeRow = document.getElementById('parental-time-settings-row');
        if (timeRow) {
            timeRow.classList.toggle('disabled-setting-row', !enabled);
        }
    };

    if (parentalScheduleToggle) {
        const schedActive = localStorage.getItem('jtv_parental_schedule_enabled') === 'true';
        parentalScheduleToggle.checked = schedActive;
        updateParentalTimeFields(schedActive);

        // PIN already authenticated on tab entry and options are PIN-gated,
        // so toggling here applies directly without re-prompting.
        parentalScheduleToggle.onchange = (e) => {
            const active = e.target.checked;
            localStorage.setItem('jtv_parental_schedule_enabled', active ? 'true' : 'false');
            updateParentalTimeFields(active);
            renderAll();
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
        
        // PIN already authenticated on tab entry and options are PIN-gated,
        // so toggling here applies directly without re-prompting.
        parentalKidsToggle.onchange = (e) => {
            localStorage.setItem('jtv_parental_kids_mode', e.target.checked ? 'true' : 'false');
            syncParentalDependentOptions();
            renderAll();
        };
    }

    if (parentalStartTime) {
        parentalStartTime.value = localStorage.getItem('jtv_parental_start_time') || '08:00';
        startTimePicker = attachTimePicker(parentalStartTime, (value) => {
            localStorage.setItem('jtv_parental_start_time', value);
            renderAll();
        });
    }

    if (parentalEndTime) {
        parentalEndTime.value = localStorage.getItem('jtv_parental_end_time') || '20:00';
        endTimePicker = attachTimePicker(parentalEndTime, (value) => {
            localStorage.setItem('jtv_parental_end_time', value);
            renderAll();
        });
    }

    // Apply the initial disabled state now that pickers exist.
    updateParentalTimeFields(localStorage.getItem('jtv_parental_schedule_enabled') === 'true');

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
        if (parentalNewPin1) parentalNewPin1.value = '';
        if (parentalNewPin2) parentalNewPin2.value = '';

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

    // Master gate: a stored PIN unlocks every parental option (adult, kids,
    // schedule, range, allowed channels). With no PIN, after deletion, or when
    // the tab was opened with the emergency unlock PIN, all options stay
    // disabled and look inactive.
    const updateParentalPinUI = () => {
        const storedHash = localStorage.getItem('jtv_parental_pin');
        const hasPin = !!storedHash;
        const emergency = window.parentalEmergencyMode === true;
        const optionsEnabled = hasPin && !emergency;

        if (parentalChangePinBtn) {
            parentalChangePinBtn.textContent = hasPin ? "Change PIN" : "Create PIN";
        }
        if (parentalDeletePinBtn) {
            parentalDeletePinBtn.classList.toggle('hidden', !hasPin);
        }

        const gated = document.getElementById('parental-pin-gated');
        if (gated) gated.classList.toggle('disabled-setting-row', !optionsEnabled);
        const allowedItem = document.getElementById('parental-allowed-item');
        if (allowedItem) allowedItem.classList.toggle('disabled-setting-row', !optionsEnabled);

        if (parentalAdultToggle) parentalAdultToggle.disabled = !optionsEnabled;
        if (parentalKidsToggle) parentalKidsToggle.disabled = !optionsEnabled;
        if (parentalScheduleToggle) parentalScheduleToggle.disabled = !optionsEnabled;
    };
    window.updateParentalPinUI = updateParentalPinUI;

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

        // PIN already authenticated on tab entry and options are PIN-gated,
        // so toggling here applies directly without re-prompting.
        parentalAdultToggle.onchange = (e) => {
            localStorage.setItem('jtv_parental_adult_content', e.target.checked ? 'true' : 'false');
            renderAll();
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

        // A freshly created/changed PIN grants full access (not emergency).
        window.parentalEmergencyMode = false;
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

    // Parental sub-tab switching
    const parentalPane = document.getElementById('settings-sect-parental');
    if (parentalPane) {
        parentalPane.querySelectorAll('.parental-subnav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                parentalPane.querySelectorAll('.parental-subnav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                parentalPane.querySelectorAll('.parental-tab-pane').forEach(p => p.style.display = 'none');
                const target = document.getElementById(btn.dataset.parentalTab);
                if (target) target.style.display = '';
                if (btn.dataset.parentalTab === 'parental-tab-allowed' && typeof window.renderParentalChannelsList === 'function') {
                    window.renderParentalChannelsList();
                }
            });
        });
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

    // Top HUD navigation button clicks
    document.querySelectorAll('.tnav-menu .tnav-btn').forEach(btn => {
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

                if (targetTab === 'parental') {
                    if (typeof updateParentalPinUI === 'function') updateParentalPinUI();
                    if (typeof window.renderParentalChannelsList === 'function') window.renderParentalChannelsList();
                }
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

            if (targetTab === 'parental') {
                const storedHash = localStorage.getItem('jtv_parental_pin');
                if (storedHash) {
                    promptParentalPIN((confirmed) => {
                        if (confirmed) {
                            // Track whether entry used the emergency PIN: if so,
                            // management options stay locked (read-only access).
                            window.parentalEmergencyMode = (window.__lastPinWasEmergency === true);
                            activateTab();
                        }
                    }, "Enter your Parental Controls PIN to edit settings:");
                } else {
                    window.parentalEmergencyMode = false;
                    activateTab();
                }
            } else {
                activateTab();
            }
        });
    }

    document.querySelectorAll('.general-subnav-btn').forEach(btn => {
        btn.onclick = () => setGeneralTab(btn.dataset.generalTab);
    });

    document.querySelectorAll('.settings-subnav-btn[data-filter-type]').forEach(btn => {
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
                document.getElementById('land-dashboard').classList.add('hidden');
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
                    else if (type === 'series') { defaultIcon = 'tag'; selectBtnId = 'series-icon-select-btn'; }
                    else if (type === 'movies') { defaultIcon = 'tag'; selectBtnId = 'movies-icon-select-btn'; }

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

    // sync-channels-btn / apply-domain-btn live in the dev-only Channels & Connectivity
    // panes (stripped in production builds), so guard against missing elements.
    const syncChannelsBtn = document.getElementById('sync-channels-btn');
    if (syncChannelsBtn) syncChannelsBtn.onclick = () => syncChannels();
    const applyDomainBtn = document.getElementById('apply-domain-btn');
    if (applyDomainBtn) applyDomainBtn.onclick = () => {
        state.globalDomain = globalDomainInput.value;
        state.apiKey = apiKeyInput.value;
        state.apiEndpoint = apiEndpointInput.value;
        const tmdbInput = document.getElementById('tmdb-key-input');
        const omdbInput = document.getElementById('omdb-key-input');
        if (tmdbInput) state.tmdbKey = tmdbInput.value.trim();
        if (omdbInput) state.omdbKey = omdbInput.value.trim();
        if (!state.globalDomain.endsWith('/')) state.globalDomain += '/';
        window.globalDomain = state.globalDomain;
        saveAppState(); syncChannels(); alert('Settings saved. Syncing...');
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

    // Anti-Hotkeys Global Capturer (Tarea 32)
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
            const detailsModal = document.getElementById('vod-details-modal');
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

        if (matchesHotkey('fullscreen', key, e)) {
            toggleAppFullscreen();
            return true;
        }

        const isSettingsOpen = !document.getElementById('settings-screen').classList.contains('hidden');
        const isDetailsOpen = !document.getElementById('vod-details-modal').classList.contains('hidden');
        const isParentalOpen = !document.getElementById('parental-pin-modal').classList.contains('hidden');

        if (!state.isHomeActive && state.activeChannelId && !isSettingsOpen && !isDetailsOpen && !isParentalOpen) {
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
            if (!state.isHomeActive && state.activeChannelId && !state.isVodPlaying) {
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
                    pinBtn.title = state.hudPinned ? 'Unpin HUD' : 'Pin HUD';
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
        { action: 'fullscreen', title: 'Toggle Fullscreen', desc: 'Enter or exit fullscreen mode.' },
        { action: 'toggleHUD', title: 'Toggle HUD / Pin', desc: 'Show HUD and toggle pin state.' },
        { action: 'volumeUp', title: 'Volume Up', desc: 'Increase the volume level.' },
        { action: 'volumeDown', title: 'Volume Down', desc: 'Decrease the volume level.' },
        { action: 'toggleMute', title: 'Toggle Mute', desc: 'Mute or unmute audio.' },
        { action: 'prevChannel', title: 'Channel Up', desc: 'Zap to the previous channel.' },
        { action: 'nextChannel', title: 'Channel Down', desc: 'Zap to the next channel.' },
        { action: 'escape', title: 'Close / Go Back', desc: 'Close modals or return to previous view.' },
        { action: 'prevSource', title: 'Previous Source', desc: 'Switch to the previous video source.' },
        { action: 'nextSource', title: 'Next Source', desc: 'Switch to the next video source.' }
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

        HOTKEY_DEFS.forEach(def => {
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
                    chip.title = `Conflict: already used by "${conflict}"`;
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
            if (keys.length >= 2) {
                addBtn.disabled = true;
            }
            addBtn.onclick = (e) => {
                e.stopPropagation();
                if (keys.length >= 2) return;
                stopHotkeyListening();
                startListening(def.action, controls, addBtn);
            };
            controls.appendChild(addBtn);

            card.appendChild(header);
            card.appendChild(controls);
            grid.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function startListening(action, controls, addBtn) {
        addBtn.disabled = true;

        const listener = document.createElement('div');
        listener.className = 'hotkey-listener';
        listener.textContent = 'Press a key...';

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

    // HUD Quick Actions Listeners
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
            document.getElementById('vod-details-modal').classList.add('hidden');
        };
    }
    const detailsBackdrop = document.getElementById('vod-details-backdrop');
    if (detailsBackdrop) {
        detailsBackdrop.onclick = () => {
            document.getElementById('vod-details-modal').classList.add('hidden');
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
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'parental-channel-info';
            
            const numSpan = document.createElement('span');
            numSpan.className = 'parental-channel-num';
            numSpan.textContent = `#${c.id}`;
            infoDiv.appendChild(numSpan);
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'parental-channel-name';
            nameSpan.textContent = c.name;
            infoDiv.appendChild(nameSpan);

            if (isNativeKids) {
                const badge = document.createElement('span');
                badge.className = 'parental-channel-badge';
                badge.textContent = 'Kids (Auto)';
                infoDiv.appendChild(badge);
            } else if (c.categories && c.categories.length > 1) {
                const displayCat = c.categories.find(cat => cat.toLowerCase() !== 'all');
                if (displayCat) {
                    const badge = document.createElement('span');
                    badge.className = 'parental-channel-badge-secondary';
                    badge.textContent = displayCat;
                    infoDiv.appendChild(badge);
                }
            }
            
            item.appendChild(infoDiv);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isChecked;
            checkbox.disabled = isNativeKids;
            
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
        '#parental-allowed-channels-list',
        '#assigner-metadata-content',
        '#vod-details-overview'
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

// VOD Scraping, Detail and Cache functions have been moved to vodContent.js and vodCache.js

