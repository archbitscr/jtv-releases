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
            (isFavorites ? 
                (document.getElementById('fav-filter-select-language')?.value !== 'all' || 
                 document.getElementById('fav-filter-select-genre')?.value !== 'all' || 
                 document.getElementById('fav-filter-select-event')?.value !== 'all') :
                (document.getElementById('filter-select-language')?.value !== 'all' || 
                 document.getElementById('filter-select-genre')?.value !== 'all' || 
                 document.getElementById('filter-select-event')?.value !== 'all')
            );
        if (hasActiveFiltersOrSearch) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'no-results-message';
            emptyItem.innerHTML = `
                <i data-lucide="search"></i>
                <span>No se encontraron canales</span>
            `;
            container.appendChild(emptyItem);
            if (window.lucide) window.lucide.createIcons({ nodes: [container] });
        }
        return;
    }
    
    list.forEach((channel, index) => {
        const item = document.createElement('div');
        item.className = `channel-item stagger-reveal ${String(state.activeChannelId) === String(channel.id) ? 'active' : ''}`;
        item.style.animationDelay = `${Math.min(index * 0.015, 0.3)}s`;

        const epg = ext.getActiveEpg ? ext.getActiveEpg(channel.id) : null;
        const epgText = epg ? (epg.time ? `${epg.time} - ${epg.event}` : epg.event) : "Transmisión en vivo";

        const formattedId = isNaN(channel.id) ? channel.id : String(channel.id).padStart(4, '0');
        const highlightedName = highlightText(channel.name, highlightTerm);
        const highlightedId = highlightText(formattedId, highlightTerm);

        const logoHtml = getSafeLogoHtml(channel.name, channel.logo);

        item.innerHTML = `
            <div class="channel-logo">${logoHtml}</div>
            <div class="channel-info">
                <div class="channel-name-row">
                    <h4>${highlightedName}</h4>
                </div>
                <div class="channel-meta-row">
                    <p class="epg-text">${epgText}</p>
                    <span class="hud-filter-badge">${highlightedId}</span>
                </div>
            </div>
            <div class="channel-actions">
                <button class="action-btn favorite ${channel.favorite ? 'active' : ''}" title="Favorito">
                    <i data-lucide="heart"></i>
                </button>
                <button class="action-btn edit-btn" title="Editar" data-id="${channel.id}">
                    <i data-lucide="sliders"></i>
                </button>
            </div>
        `;

        item.onclick = (e) => {
            if (e.target.closest('.action-btn')) return;
            if (ext.selectChannel) ext.selectChannel(channel);
        };

        item.querySelector('.favorite').onclick = (e) => {
            e.stopPropagation();
            channel.favorite = !channel.favorite;
            if (ext.renderAll) ext.renderAll();
            if (ext.saveAppState) ext.saveAppState();
        };

        item.querySelector('.edit-btn').onclick = (e) => {
            e.stopPropagation();
            if (ext.showEditPane) ext.showEditPane(channel);
        };

        container.appendChild(item);
    });

    if (window.lucide) {
        window.lucide.createIcons({ nodes: [container] });
    }
}
