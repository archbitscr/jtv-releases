import { state } from '../state/appState.js';
import { renderSettingsFilters } from '../render/renderAll.js';
import { emojiToHtml } from '../filters/filterState.js';

export function setSettingsFilterTab(tab) {
    state.activeSettingsFilterTab = tab;
    window.activeSettingsFilterTab = tab;
    // Reset editing state on tab change
    if (state.editingFilter) {
        const addBtn = document.getElementById(state.editingFilter.addBtnId);
        if (addBtn) {
            addBtn.innerHTML = `<i data-lucide="plus"></i>`;
            addBtn.setAttribute('title', 'Add Filter');
            addBtn.setAttribute('data-tooltip', 'Add Filter');
        }
        const input = document.getElementById(state.editingFilter.inputId);
        if (input) {
            input.value = "";
            const clearBtnId = state.editingFilter.inputId.replace('add-', 'clear-');
            const clearBtn = document.getElementById(clearBtnId);
            if (clearBtn) clearBtn.classList.add('hidden');
        }
        if (state.editingFilter.selectBtnId) {
            const selectBtn = document.getElementById(state.editingFilter.selectBtnId);
            if (selectBtn) {
                let defIcon = 'tag';
                if (state.editingFilter.type === 'event') defIcon = '🏁';
                selectBtn.setAttribute('data-selected-icon', defIcon);
                const isEmoji = (defIcon && /[^\x00-\x7F]/.test(defIcon)) || (defIcon && defIcon.length <= 2);
                selectBtn.innerHTML = isEmoji
                    ? `<span class="emoji-icon" style="font-size: 16px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;">${emojiToHtml(defIcon, 16)}</span>`
                    : `<i data-lucide="${defIcon}"></i>`;
            }
        }
        state.editingFilter = null;
    }

    document.querySelectorAll('.settings-subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filterType === tab);
    });
    document.querySelectorAll('.filters-subsect-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `filters-content-${tab}`);
    });
    renderSettingsFilters();
}

export function setGeneralTab(tab) {
    document.querySelectorAll('.general-subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.generalTab === tab);
    });
    document.querySelectorAll('.general-tab-pane').forEach(pane => {
        pane.style.display = pane.id === tab ? '' : 'none';
    });
}

export function setConnectivityTab(tab) {
    document.querySelectorAll('.connectivity-subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.connTab === tab);
    });
    document.querySelectorAll('.connectivity-subsect-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `conn-subsect-${tab}`);
    });
}

export function setChannelsTab(tab) {
    document.querySelectorAll('.channels-subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.channelsTab === tab);
    });
    document.querySelectorAll('.channels-subsect-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `channels-subsect-${tab}`);
    });
}
