import { state } from '../state/appState.js';
import { sanitizeMediaUrl, escapeHtml } from '../utils/sanitize.js';
import { highlightText } from '../utils/domHelpers.js';

let ext = {};

export function initGuide(dependencies) {
    ext = dependencies;
}

export function renderGuide() {
    const guideListContainer = document.getElementById('guide-list');
    if (!guideListContainer) return;

    let allEvents = [];
    const term = state.guideSearchTerm.toLowerCase().trim();
    const ukTimeStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
    const currentMins = parseInt(ukTimeStr.split(':')[0]) * 60 + parseInt(ukTimeStr.split(':')[1]);

    state.channels.forEach(channel => {
        if (state.guideFilter === 'favorites' && !channel.favorite) return;
        
        const channelEvents = state.scheduleData.filter(s => s.id === channel.id);
        channelEvents.forEach(e => {
            if (!e.time) return;
            const parts = e.time.split(':');
            if (parts.length !== 2) return;
            const eventMins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            
            let diff = currentMins - eventMins;
            if (diff < -720) diff += 1440; 
            
            if (diff <= 120) {
                const matchesSearch = e.event.toLowerCase().includes(term) || (channel.name && channel.name.toLowerCase().includes(term));
                if (matchesSearch) {
                    allEvents.push({ ...e, channel, eventMins, diff });
                }
            }
        });
    });

    allEvents.sort((a, b) => a.eventMins - b.eventMins);

    guideListContainer.innerHTML = '';
    allEvents.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = `guide-item stagger-reveal`;
        el.style.animationDelay = `${Math.min(index * 0.015, 0.3)}s`;
        
        const isLive = item.diff >= 0 && item.diff <= 120;
        const timeHtml = isLive ? `<span class="guide-time live">LIVE</span>` : `<span class="guide-time">${item.time}</span>`;
        const logoHtml = item.channel.logo ? `<img src="${sanitizeMediaUrl(item.channel.logo, { allowDataImage: true, fallback: '' })}" alt="${escapeHtml(item.channel.name)}">` : `<i data-lucide="tv"></i>`;
        
        const highlightedEvent = highlightText(item.event, state.guideSearchTerm);
        const highlightedChannel = highlightText(item.channel.name, state.guideSearchTerm);

        el.innerHTML = `
            <div class="guide-header">
                ${timeHtml}
                <div class="guide-channel">
                    ${logoHtml}
                    <span>${highlightedChannel}</span>
                </div>
            </div>
            <div class="guide-title">${highlightedEvent}</div>
        `;
        
        el.onclick = () => {
            if (ext.selectChannel) ext.selectChannel(item.channel);
        };
        guideListContainer.appendChild(el);
    });

    if (window.lucide) {
        window.lucide.createIcons({ nodes: [guideListContainer] });
    }
}
