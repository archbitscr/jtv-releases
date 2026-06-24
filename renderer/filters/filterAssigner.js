import { state } from '../state/appState.js';
import { escapeHtml } from '../utils/sanitize.js';
import { highlightText } from '../utils/domHelpers.js';
import { sanitizeIconName } from '../utils/sanitize.js';
import { sortCategories } from './filterManager.js';
import { saveChannelsAndFilters } from '../services/stateManager.js';
import { renderSettingsFilters } from '../render/renderAll.js';

window.assignerActiveTab = 'events';
window.assignerSelectedFilters = new Set();

window.setAssignerActiveTab = function(tab) {
    window.assignerActiveTab = tab;
    
    // Update active tab buttons visual status
    document.querySelectorAll('.assigner-tab-btn').forEach(btn => {
        if (btn.dataset.assignerTab === tab) {
            btn.classList.add('active');
            btn.style.background = 'var(--accent)';
            btn.style.color = '#000';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'none';
            btn.style.color = 'rgba(255,255,255,0.6)';
        }
    });
    
    renderAssignerEvents();
};

export function initEventAssigner() {
    const searchInput = document.getElementById('assigner-search');
    if (searchInput) {
        searchInput.oninput = () => {
            renderAssignerChannelsList();
            updateAssignerBulkSelectBtn();
        };
    }

    const bulkBtn = document.getElementById('assigner-bulk-select');
    if (bulkBtn) {
        bulkBtn.onclick = () => {
            const filterVal = (document.getElementById('assigner-search')?.value || '').toLowerCase();
            const chList = window.getChannels ? window.getChannels() : [];
            const visibleIndices = [];
            chList.forEach((c, index) => {
                const num = c.id || (index + 1);
                const name = c.name || '';
                if (filterVal && !name.toLowerCase().includes(filterVal) && !String(num).includes(filterVal)) {
                    return;
                }
                visibleIndices.push(index);
            });

            const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every(idx => state.assignerSelectedChannelIndices.includes(idx));

            if (allVisibleSelected) {
                // Deselect all visible channels
                state.assignerSelectedChannelIndices = state.assignerSelectedChannelIndices.filter(idx => !visibleIndices.includes(idx));
            } else {
                // Select all visible channels
                visibleIndices.forEach(idx => {
                    if (!state.assignerSelectedChannelIndices.includes(idx)) {
                        state.assignerSelectedChannelIndices.push(idx);
                    }
                });
            }

            // Update channels highlights & checkmarks
            const items = document.querySelectorAll('#assigner-channels-list .crud-channel-item');
            items.forEach(item => {
                const itemIdx = parseInt(item.dataset.channelIndex, 10);
                const isSelected = state.assignerSelectedChannelIndices.includes(itemIdx);
                item.classList.toggle('active', isSelected);
                const iconEl = item.querySelector('.assigner-channel-checkmark i');
                if (iconEl) {
                    iconEl.setAttribute('data-lucide', isSelected ? 'check-square' : 'square');
                    iconEl.style.color = isSelected ? '#00ffcc' : 'rgba(255,255,255,0.2)';
                }
            });

            if (window.lucide) {
                window.lucide.createIcons();
            }

            selectAssignerChannelMultiple();
            updateAssignerBulkSelectBtn();
        };
    }

    // Set up tab switching buttons click handlers
    document.querySelectorAll('.assigner-tab-btn').forEach(btn => {
        btn.onclick = () => {
            window.setAssignerActiveTab(btn.dataset.assignerTab);
        };
    });

    const applyBtn = document.getElementById('assigner-apply-btn');
    if (applyBtn) {
        applyBtn.onclick = async () => {
            if (state.assignerSelectedChannelIndices.length === 0) return;
            const channels = window.getChannels ? window.getChannels() : [];

            // Get selected items from Col 2 checkboxes
            const selectedItems = [];
            const unselectedItems = [];
            const checkboxes = document.querySelectorAll('#assigner-events-list .assigner-event-checkbox');
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    selectedItems.push(cb.dataset.eventName);
                } else if (!cb.indeterminate) {
                    unselectedItems.push(cb.dataset.eventName);
                }
            });

            state.assignerSelectedChannelIndices.forEach(idx => {
                const channel = channels[idx];
                if (!channel) return;

                let categories = channel.categories || [];
                
                // Add the checked ones
                selectedItems.forEach(item => {
                    if (!categories.includes(item)) {
                        categories.push(item);
                    }
                });

                // Remove the unchecked ones (excluding indeterminate)
                categories = categories.filter(cat => !unselectedItems.includes(cat));

                channel.categories = categories;
            });

            // Save and refresh
            if (window.setChannels) {
                window.setChannels(channels);
            }
            await saveChannelsAndFilters();
            renderSettingsFilters();

            // Update HUD chips if the active channel was modified
            const activeId = state.activeChannelId;
            if (activeId) {
                const activeChannel = channels.find(c => String(c.id) === String(activeId));
                if (activeChannel && state.assignerSelectedChannelIndices.includes(channels.indexOf(activeChannel))) {
                    if (window.updateHudChannelFilters) window.updateHudChannelFilters(activeChannel);
                }
            }

            // Refresh selection view
            selectAssignerChannelMultiple();
        };
    }
}

export function renderAssignerChannelsList() {
    const listContainer = document.getElementById('assigner-channels-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const filterVal = (document.getElementById('assigner-search')?.value || '').toLowerCase();
    const rawList = window.getChannels ? window.getChannels() : [];
    const chList = [...rawList].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
    );

    chList.forEach((c, index) => {
        const originalIndex = rawList.indexOf(c);
        const num = c.id || (originalIndex + 1);
        const name = c.name || '';
        if (filterVal && !name.toLowerCase().includes(filterVal) && !String(num).includes(filterVal)) {
            return;
        }

        const formattedNum = isNaN(num) ? num : String(num).padStart(4, '0');
        const displayNum = highlightText(formattedNum, filterVal);
        const displayName = highlightText(name, filterVal);

        const item = document.createElement('div');
        item.className = 'crud-channel-item';
        item.dataset.channelIndex = String(originalIndex);
        const isSelected = state.assignerSelectedChannelIndices.includes(originalIndex);
        if (isSelected) {
            item.classList.add('active');
        }
        item.innerHTML = `
            <span class="crud-channel-label" style="flex: 1; min-width: 0;"><span class="crud-channel-number">${displayNum}</span><span class="crud-channel-name">${displayName}</span></span>
            <span class="assigner-channel-checkmark" style="flex-shrink: 0; margin-left: 8px; display: flex; align-items: center; cursor: pointer; padding: 4px;">
                <i data-lucide="${isSelected ? 'check-square' : 'square'}" style="width: 14px; height: 14px; color: ${isSelected ? '#00ffcc' : 'rgba(255,255,255,0.2)'};"></i>
            </span>
        `;

        item.onclick = (e) => {
            handleAssignerChannelClick(originalIndex, e);
        };

        const checkmark = item.querySelector('.assigner-channel-checkmark');
        if (checkmark) {
            checkmark.onclick = (e) => {
                e.stopPropagation();
                handleAssignerChannelClick(originalIndex, e, true);
            };
        }
        listContainer.appendChild(item);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }

    if (state.assignerSelectedChannelIndices.length > 0) {
        const firstSelectedIdx = state.assignerSelectedChannelIndices[0];
        const activeItem = listContainer.querySelector(`.crud-channel-item[data-channel-index="${firstSelectedIdx}"]`);
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    bindAssignerScrollbarActivity();
}

export function handleAssignerChannelClick(index, e, isCheckmarkClick = false) {
    if (window.assignerSelectedFilters) {
        window.assignerSelectedFilters.clear();
    }
    if (e.shiftKey && state.lastSelectedIdx !== -1) {
        // Range selection
        const start = Math.min(state.lastSelectedIdx, index);
        const end = Math.max(state.lastSelectedIdx, index);
        for (let i = start; i <= end; i++) {
            if (!state.assignerSelectedChannelIndices.includes(i)) {
                state.assignerSelectedChannelIndices.push(i);
            }
        }
        state.lastSelectedIdx = index;
    } else {
        // Normal click or checkmark click: Toggle single index (always, preserving others)
        const pos = state.assignerSelectedChannelIndices.indexOf(index);
        if (pos > -1) {
            state.assignerSelectedChannelIndices.splice(pos, 1);
        } else {
            state.assignerSelectedChannelIndices.push(index);
        }
        state.lastSelectedIdx = index;
    }
    
    // Refresh channels list highlights and checkmark icons
    const items = document.querySelectorAll('#assigner-channels-list .crud-channel-item');
    items.forEach(item => {
        const itemIdx = parseInt(item.dataset.channelIndex, 10);
        const isSelected = state.assignerSelectedChannelIndices.includes(itemIdx);
        item.classList.toggle('active', isSelected);
        
        const iconEl = item.querySelector('.assigner-channel-checkmark i');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', isSelected ? 'check-square' : 'square');
            iconEl.style.color = isSelected ? '#00ffcc' : 'rgba(255,255,255,0.2)';
        }
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }

    selectAssignerChannelMultiple();
}

export function updateAssignerBulkSelectBtn() {
    const bulkBtn = document.getElementById('assigner-bulk-select');
    if (!bulkBtn) return;

    if (state.assignerSelectedChannelIndices.length === 0) {
        bulkBtn.style.display = 'none';
    } else {
        bulkBtn.style.display = 'flex';

        // Check if all visible channels are selected
        const filterVal = (document.getElementById('assigner-search')?.value || '').toLowerCase();
        const chList = window.getChannels ? window.getChannels() : [];
        const visibleIndices = [];
        chList.forEach((c, index) => {
            const num = c.id || (index + 1);
            const name = c.name || '';
            if (filterVal && !name.toLowerCase().includes(filterVal) && !String(num).includes(filterVal)) {
                return;
            }
            visibleIndices.push(index);
        });

        const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every(idx => state.assignerSelectedChannelIndices.includes(idx));

        const iconEl = bulkBtn.querySelector('i');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', allVisibleSelected ? 'check-square' : 'square');
            iconEl.style.color = allVisibleSelected ? '#00ffcc' : 'rgba(255,255,255,0.6)';
        }
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}

export function renderAssignerEvents() {
    const container = document.getElementById('assigner-events-list');
    if (!container) return;
    container.innerHTML = '';

    let activeList = [];
    if (window.assignerActiveTab === 'languages') {
        activeList = state.filterLanguages;
    } else if (window.assignerActiveTab === 'genres') {
        activeList = state.filterGenres;
    } else {
        activeList = state.filterEvents;
    }

    if (activeList.length === 0) {
        container.innerHTML = `<div class="empty-list-msg" style="color: rgba(255,255,255,0.4); text-align: center; margin-top: 20px; font-size: 12px;">No hay filtros definidos</div>`;
        return;
    }

    const channels = window.getChannels ? window.getChannels() : [];
    const N = state.assignerSelectedChannelIndices.length;

    activeList.forEach(filter => {
        let count = 0;
        state.assignerSelectedChannelIndices.forEach(idx => {
            const ch = channels[idx];
            if (ch && (ch.categories || []).includes(filter.name)) {
                count++;
            }
        });

        const isChecked = (N > 0 && count === N) || (window.assignerSelectedFilters && window.assignerSelectedFilters.has(filter.name));
        const isIndeterminate = N > 0 && count > 0 && count < N && !(window.assignerSelectedFilters && window.assignerSelectedFilters.has(filter.name));

        const label = document.createElement('label');
        label.className = 'assigner-event-item';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.padding = '8px 12px';
        label.style.background = 'rgba(255,255,255,0.02)';
        label.style.border = '1px solid rgba(255,255,255,0.06)';
        label.style.borderRadius = '6px';
        label.style.cursor = 'pointer';
        label.style.transition = 'all 0.15s ease';

        const isEmoji = (filter.icon && /[^\x00-\x7F]/.test(filter.icon)) || (filter.icon && filter.icon.length <= 2);
        label.innerHTML = `
            <input type="checkbox" class="assigner-event-checkbox" data-event-name="${escapeHtml(filter.name)}" style="margin: 0; width: 15px; height: 15px; cursor: pointer;" ${isChecked ? 'checked' : ''}>
            <span style="font-size: 13px; color: #fff; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                ${isEmoji 
                    ? `<span class="emoji-icon" style="font-size: 14px; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px;">${filter.icon}</span>`
                    : `<i data-lucide="${sanitizeIconName(filter.icon)}" style="width: 14px; height: 14px; color: #a5b4fc;"></i>`}
                ${escapeHtml(filter.name)}
            </span>
        `;

        const checkbox = label.querySelector('input');
        if (isIndeterminate) {
            checkbox.indeterminate = true;
        }

        checkbox.onchange = async () => {
            const isFilterDriven = (window.assignerSelectedFilters && window.assignerSelectedFilters.size > 0) || state.assignerSelectedChannelIndices.length === 0;

            if (isFilterDriven) {
                if (!window.assignerSelectedFilters) {
                    window.assignerSelectedFilters = new Set();
                }
                if (checkbox.checked) {
                    window.assignerSelectedFilters.add(filter.name);
                } else {
                    window.assignerSelectedFilters.delete(filter.name);
                }

                // Recalculate assignerSelectedChannelIndices based on active filters
                if (window.assignerSelectedFilters.size === 0) {
                    state.assignerSelectedChannelIndices = [];
                } else {
                    const chList = window.getChannels ? window.getChannels() : [];
                    state.assignerSelectedChannelIndices = [];
                    chList.forEach((ch, idx) => {
                        const cats = ch.categories || [];
                        const hasAll = Array.from(window.assignerSelectedFilters).every(fName => cats.includes(fName));
                        if (hasAll) {
                            state.assignerSelectedChannelIndices.push(idx);
                        }
                    });
                }

                // Refresh channel list selection highlights & checkmarks
                const items = document.querySelectorAll('#assigner-channels-list .crud-channel-item');
                items.forEach(item => {
                    const itemIdx = parseInt(item.dataset.channelIndex, 10);
                    const isSelected = state.assignerSelectedChannelIndices.includes(itemIdx);
                    item.classList.toggle('active', isSelected);
                    const iconEl = item.querySelector('.assigner-channel-checkmark i');
                    if (iconEl) {
                        iconEl.setAttribute('data-lucide', isSelected ? 'check-square' : 'square');
                        iconEl.style.color = isSelected ? '#00ffcc' : 'rgba(255,255,255,0.2)';
                    }
                });

                if (window.lucide) {
                    window.lucide.createIcons();
                }

                selectAssignerChannelMultiple();
            } else {
                const targetState = checkbox.checked;

                state.assignerSelectedChannelIndices.forEach(idx => {
                    const ch = channels[idx];
                    if (!ch) return;

                    let cats = ch.categories || [];
                    if (targetState) {
                        if (!cats.includes(filter.name)) cats.push(filter.name);
                    } else {
                        cats = cats.filter(c => c !== filter.name);
                    }
                    ch.categories = cats;
                });

                if (window.setChannels) {
                    window.setChannels(channels);
                }
                await saveChannelsAndFilters();
                renderSettingsFilters();

                selectAssignerChannelMultiple();
            }
        };

        container.appendChild(label);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }

    bindAssignerScrollbarActivity();
}

export function renderAssignerMetaChips(channel) {
    const chipsContainer = document.getElementById('assigner-meta-categories');
    if (!chipsContainer) return;
    chipsContainer.innerHTML = '';
    
    const cats = channel.categories || [];
    if (cats.length === 0) {
        chipsContainer.innerHTML = `<span style="font-size: 12px; color: rgba(255,255,255,0.4);">Ninguna</span>`;
        return;
    }

    const sortedCats = sortCategories(cats);

    sortedCats.forEach(c => {
        if (c.toLowerCase() === 'all') return;
        const chip = document.createElement('span');
        chip.style.display = 'inline-block';
        chip.style.padding = '3px 8px';
        chip.style.background = 'rgba(255,255,255,0.06)';
        chip.style.border = '1px solid rgba(255,255,255,0.1)';
        chip.style.borderRadius = '4px';
        chip.style.fontSize = '11px';
        chip.style.color = '#a5b4fc';
        chip.textContent = c;
        chipsContainer.appendChild(chip);
    });
}

export function renderAssignerMetaChipsMultiple() {
    const chipsContainer = document.getElementById('assigner-meta-categories');
    if (!chipsContainer) return;
    chipsContainer.innerHTML = '';

    const channels = window.getChannels ? window.getChannels() : [];
    const catCounts = {};

    state.assignerSelectedChannelIndices.forEach(idx => {
        const ch = channels[idx];
        if (!ch) return;
        const cats = ch.categories || [];
        cats.forEach(c => {
            catCounts[c] = (catCounts[c] || 0) + 1;
        });
    });

    const uniqueCats = Object.keys(catCounts);
    if (uniqueCats.length === 0) {
        chipsContainer.innerHTML = `<span style="font-size: 12px; color: rgba(255,255,255,0.4);">Ninguna</span>`;
        return;
    }

    const sortedCats = sortCategories(uniqueCats);
    const N = state.assignerSelectedChannelIndices.length;

    sortedCats.forEach(c => {
        if (c.toLowerCase() === 'all') return;
        const count = catCounts[c];
        const chip = document.createElement('span');
        chip.style.display = 'inline-block';
        chip.style.padding = '3px 8px';
        chip.style.borderRadius = '4px';
        chip.style.fontSize = '11px';
        
        if (count === N) {
            chip.style.background = 'rgba(255,255,255,0.06)';
            chip.style.border = '1px solid rgba(255,255,255,0.1)';
            chip.style.color = '#a5b4fc';
            chip.textContent = c;
        } else {
            chip.style.background = 'rgba(255,255,255,0.02)';
            chip.style.border = '1px dashed rgba(255,255,255,0.05)';
            chip.style.color = 'rgba(165,180,252,0.6)';
            chip.textContent = `${c} (${count}/${N})`;
        }
        chipsContainer.appendChild(chip);
    });
}

export function selectAssignerChannelMultiple() {
    const emptyMsg = document.getElementById('assigner-metadata-empty');
    const content = document.getElementById('assigner-metadata-content');
    if (!emptyMsg || !content) return;

    if (state.assignerSelectedChannelIndices.length === 0) {
        emptyMsg.style.display = 'block';
        content.classList.add('hidden');
        updateAssignerBulkSelectBtn();
        return;
    }

    emptyMsg.style.display = 'none';
    content.classList.remove('hidden');

    const channels = window.getChannels ? window.getChannels() : [];
    const nameText = document.getElementById('assigner-meta-name');
    const idText = document.getElementById('assigner-meta-id');
    const logoContainer = document.getElementById('assigner-meta-logo-container');

    if (state.assignerSelectedChannelIndices.length === 1) {
        const channel = channels[state.assignerSelectedChannelIndices[0]];
        if (channel) {
            nameText.textContent = channel.name || 'Sin nombre';
            idText.textContent = `Num: ${channel.id || (state.assignerSelectedChannelIndices[0] + 1)}`;
            
            logoContainer.innerHTML = `<img id="assigner-meta-logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            const newLogoImg = document.getElementById('assigner-meta-logo');
            if (channel.logo && channel.logo.trim()) {
                newLogoImg.src = channel.logo.trim();
                newLogoImg.style.display = 'block';
            } else {
                newLogoImg.style.display = 'none';
            }
            renderAssignerMetaChips(channel);
        }
    } else {
        nameText.textContent = "Selección Múltiple";
        idText.textContent = `${state.assignerSelectedChannelIndices.length} canales seleccionados`;
        
        logoContainer.innerHTML = `<i data-lucide="layers" style="width: 28px; height: 28px; color: #00ffcc;"></i>`;
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        renderAssignerMetaChipsMultiple();
    }

    renderAssignerEvents();
    updateAssignerBulkSelectBtn();
}

export function selectAssignerChannel(index) {
    if (index < 0) {
        state.assignerSelectedChannelIndices = [];
    } else {
        state.assignerSelectedChannelIndices = [index];
    }
    selectAssignerChannelMultiple();
}

export function bindAssignerScrollbarActivity() {
    const scrollPanels = document.querySelectorAll('.event-assigner-container .crud-scroll-panel');
    const scrollbarHideTimers = new WeakMap();

    const showScrollbar = (scrollEl) => {
        if (!scrollEl) return;
        scrollEl.classList.add('scrollbar-active');

        const currentTimer = scrollbarHideTimers.get(scrollEl);
        if (currentTimer) clearTimeout(currentTimer);

        const nextTimer = setTimeout(() => {
            scrollEl.classList.remove('scrollbar-active');
            scrollbarHideTimers.delete(scrollEl);
        }, 1500);

        scrollbarHideTimers.set(scrollEl, nextTimer);
    };

    scrollPanels.forEach((scrollPanel) => {
        if (scrollPanel.dataset.scrollbarBound === 'true') return;
        scrollPanel.dataset.scrollbarBound = 'true';

        const handleActivity = () => showScrollbar(scrollPanel);
        ['mouseenter', 'mousemove', 'wheel', 'scroll', 'touchstart'].forEach((eventName) => {
            scrollPanel.addEventListener(eventName, handleActivity, { passive: true });
        });
        scrollPanel.addEventListener('mouseleave', () => {
            const currentTimer = scrollbarHideTimers.get(scrollPanel);
            if (currentTimer) clearTimeout(currentTimer);
            const nextTimer = setTimeout(() => {
                scrollPanel.classList.remove('scrollbar-active');
                scrollbarHideTimers.delete(scrollPanel);
            }, 300);
            scrollbarHideTimers.set(scrollPanel, nextTimer);
        });

        showScrollbar(scrollPanel);
    });
}
