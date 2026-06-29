import { state } from '../state/appState.js';
import { highlightText, getSafeLogoHtml } from '../utils/domHelpers.js';

let ext = {};

export function initChannelList(dependencies) {
    ext = dependencies;
}

export function renderList(container, list, highlightTerm = "") {
    if (!container) return;
    container.innerHTML = '';
    
    if (list.length === 0) {
        const isFavorites = container.id === 'favorites-list';
        const hasActiveFiltersOrSearch = highlightTerm.trim() !== "" ||
            document.getElementById('filter-select-language')?.value !== 'all' ||
            document.getElementById('filter-select-genre')?.value !== 'all' ||
            document.getElementById('filter-select-event')?.value !== 'all';
        if (hasActiveFiltersOrSearch) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'no-results-message';
            emptyItem.innerHTML = `
                <i data-lucide="search"></i>
                <span>No channels found</span>
            `;
            container.appendChild(emptyItem);
            if (window.lucide) window.lucide.createIcons({ nodes: [container] });
        }
        return;
    }
    
    list.forEach((channel, index) => {
        const item = document.createElement('div');
        item.className = `side-channel-item stagger-reveal ${String(state.activeChannelId) === String(channel.id) ? 'active' : ''}`;
        item.style.animationDelay = `${Math.min(index * 0.015, 0.3)}s`;
        item.setAttribute('data-id', channel.id);

        const epg = ext.getActiveEpg ? ext.getActiveEpg(channel.id) : null;
        const epgText = epg ? (epg.time ? `${epg.time} - ${epg.event}` : epg.event) : "Live broadcast";

        const formattedId = isNaN(channel.id) ? channel.id : String(channel.id).padStart(4, '0');
        const highlightedName = highlightText(channel.name, highlightTerm);
        const highlightedId = highlightText(formattedId, highlightTerm);

        const logoHtml = getSafeLogoHtml(channel.name, channel.logo);

        item.innerHTML = `
            <div class="side-channel-logo">${logoHtml}</div>
            <div class="side-channel-info">
                <div class="side-channel-name-row">
                    <h4>${highlightedName}</h4>
                </div>
                <div class="side-channel-meta-row">
                    <p class="side-epg-text">${epgText}</p>
                    <span class="side-channel-id">${highlightedId}</span>
                </div>
            </div>
            <div class="side-channel-actions">
                <button class="side-action-btn favorite ${channel.favorite ? 'active' : ''}" title="Favorite">
                    <i data-lucide="heart" style="${channel.favorite ? 'fill:#ff4b4b;color:#ff4b4b;' : 'fill:transparent;color:currentColor;'}"></i>
                </button>
                <button class="side-action-btn edit-btn" title="Edit" data-id="${channel.id}">
                    <i data-lucide="sliders"></i>
                </button>
            </div>
        `;

        item.onclick = (e) => {
            if (e.target.closest('.side-action-btn')) return;
            const clickedTab = container.id === 'favorites-list' ? 'favorites' : 'channels';
            if (ext.selectChannel) ext.selectChannel(channel, true, clickedTab);
        };

        item.querySelector('.favorite').onclick = (e) => {
            e.stopPropagation();
            channel.favorite = !channel.favorite;
            const btn = e.currentTarget;
            const icon = btn.querySelector('i, svg');
            if (icon) {
                icon.style.fill = channel.favorite ? '#ff4b4b' : 'transparent';
                icon.style.color = channel.favorite ? '#ff4b4b' : 'currentColor';
            }
            btn.classList.toggle('active', channel.favorite);
            if (String(state.activeChannelId) === String(channel.id)) {
                const hudFavBtn = document.getElementById('pbar-fav-btn');
                if (hudFavBtn) hudFavBtn.classList.toggle('active', channel.favorite);
                const tunerHeart = document.getElementById('pbar-fav-heart');
                if (tunerHeart) {
                    tunerHeart.style.fill = channel.favorite ? '#ff4b4b' : 'transparent';
                    tunerHeart.style.color = channel.favorite ? '#ff4b4b' : 'currentColor';
                }
            }
            if (ext.renderAll) ext.renderAll(true);
            if (ext.saveAppState) ext.saveAppState();
        };

        item.querySelector('.edit-btn').onclick = (e) => {
            e.stopPropagation();
            const allChannels = window.getChannels ? window.getChannels() : [];
            const channelIdx = allChannels.findIndex(c => String(c.id) === String(channel.id));
            if (window.showModule) window.showModule('settings');
            const filtersTabBtn = document.getElementById('settings-tab-filters');
            if (filtersTabBtn) filtersTabBtn.click();
            setTimeout(() => {
                const asignacionBtn = document.querySelector('.settings-subnav-btn[data-filters-tab="asignacion"]');
                if (asignacionBtn) asignacionBtn.click();
                if (channelIdx !== -1) {
                    if (window.assignerSelectedFilters) window.assignerSelectedFilters.clear();
                    if (window.state) {
                        window.state.assignerSelectedChannelIndices = [channelIdx];
                        window.state.lastSelectedIdx = channelIdx;
                    }
                    if (window.renderAssignerChannelsList) window.renderAssignerChannelsList();
                    if (window.selectAssignerChannelMultiple) window.selectAssignerChannelMultiple();
                }
            }, 100);
        };

        container.appendChild(item);
    });

    if (window.lucide) {
        window.lucide.createIcons({ nodes: [container] });
    }
}

export function syncMenuScroll(channelId) {
    const id = channelId || state.activeChannelId;
    if (!id) return;
    
    const mainMenu = document.getElementById('side-menu');
    if (!mainMenu || mainMenu.classList.contains('hidden')) return;

    mainMenu.querySelectorAll('.side-channel-item').forEach(item => {
        item.classList.remove('active');
    });

    const items = document.querySelectorAll(`.side-channel-item[data-id="${id}"]`);
    items.forEach(item => {
        item.classList.add('active');
        const pane = item.closest('.tab-pane');
        if (pane && pane.classList.contains('active')) {
            item.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    });
}

