import { state } from '../state/appState.js';

export function getOrGenerateTooltip(el) {
    if (el.hasAttribute('title')) {
        el.setAttribute('data-tooltip', el.getAttribute('title'));
        el.removeAttribute('title');
    }
    
    let tooltip = el.getAttribute('data-tooltip');
    if (tooltip && tooltip.trim() !== '') return tooltip;
    
    const id = el.id || '';
    const className = el.className || '';

    // Check specifically labeled containers/elements first
    if (className.includes('settings-switch') || className.includes('settings-switch-slider') || (el.tagName === 'INPUT' && el.type === 'checkbox')) {
        const settingItem = el.closest('.setting-item');
        if (settingItem) {
            const titleEl = settingItem.querySelector('.setting-title');
            if (titleEl) {
                const tooltipText = `Toggle: ${titleEl.textContent.trim()}`;
                el.setAttribute('data-tooltip', tooltipText);
                return tooltipText;
            }
        }
    }

    if (id.includes('close-settings') || className.includes('settings-close')) {
        el.setAttribute('data-tooltip', 'Close settings');
        return 'Close settings';
    }

    if (id === 'crud-add-new-btn') {
        el.setAttribute('data-tooltip', 'Create a new channel');
        return 'Create a new channel';
    }

    if (id === 'crud-save-btn') {
        el.setAttribute('data-tooltip', 'Save channel changes');
        return 'Save channel changes';
    }

    if (id === 'crud-delete-btn') {
        el.setAttribute('data-tooltip', 'Delete this channel permanently');
        return 'Delete this channel permanently';
    }

    if (id === 'crud-logo-upload-btn') {
        el.setAttribute('data-tooltip', 'Upload a local image as logo');
        return 'Upload a local image as logo';
    }

    if (id === 'crud-logo-delete-btn') {
        el.setAttribute('data-tooltip', 'Delete current logo');
        return 'Delete current logo';
    }

    if (className.includes('crud-channel-item')) {
        const nameEl = el.querySelector('.crud-channel-name');
        const channelName = nameEl ? nameEl.textContent.trim() : 'canal';
        const tooltipText = `Edit: ${channelName}`;
        el.setAttribute('data-tooltip', tooltipText);
        return tooltipText;
    }

    if (className.includes('settings-tab-btn')) {
        const text = el.textContent.trim();
        const tooltipText = `Section ${text}`;
        el.setAttribute('data-tooltip', tooltipText);
        return tooltipText;
    }

    // Check inputs with placeholders
    if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
        const placeholder = el.getAttribute('placeholder');
        el.setAttribute('data-tooltip', placeholder);
        return placeholder;
    }

    // Check select dropdowns
    if (el.tagName === 'SELECT') {
        const label = el.getAttribute('aria-label') || (el.options && el.options[0] ? el.options[0].text : 'Select');
        const tooltipText = `Filter by: ${label}`;
        el.setAttribute('data-tooltip', tooltipText);
        return tooltipText;
    }

    // If it's a standard text button / tag with readable short text
    let text = (el.textContent || el.innerText || '').trim();
    text = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
    if (text.length > 0 && text.length < 25) {
        el.setAttribute('data-tooltip', text);
        return text;
    }

    // Check nested icons
    const icon = el.querySelector('[data-lucide]');
    if (icon) {
        const iconName = icon.getAttribute('data-lucide');
        let tooltipText = '';
        switch (iconName) {
            case 'x': tooltipText = 'Close'; break;
            case 'tv': tooltipText = 'Watch Live'; break;
            case 'film': tooltipText = 'Movies'; break;
            case 'clapperboard': tooltipText = 'Series'; break;
            case 'heart': tooltipText = el.classList.contains('active') || id.includes('fav') ? 'Remove from Favorites' : 'Add to Favorites'; break;
            case 'settings': case 'settings-2': case 'sliders': tooltipText = 'Settings & Filters'; break;
            case 'search': tooltipText = 'Search'; break;
            case 'plus': case 'plus-circle': tooltipText = 'Add'; break;
            case 'minus': tooltipText = 'Decrease / Remove'; break;
            case 'arrow-left': case 'chevron-left': tooltipText = 'Back / Previous'; break;
            case 'arrow-right': case 'chevron-right': tooltipText = 'Next'; break;
            case 'trash-2': tooltipText = 'Delete'; break;
            case 'upload': tooltipText = 'Upload file or image'; break;
            case 'volume-2': case 'volume-x': case 'volume-1': tooltipText = 'Volume / Mute'; break;
            case 'home': tooltipText = 'Home'; break;
            case 'code-2': tooltipText = 'Developer Mode'; break;
            case 'user': tooltipText = 'My Account'; break;
        }
        if (tooltipText) {
            el.setAttribute('data-tooltip', tooltipText);
            return tooltipText;
        }
    }

    // Generic fallbacks based on ids / classes
    if (id.includes('close') || className.includes('close')) {
        el.setAttribute('data-tooltip', 'Close');
        return 'Close';
    }
    if (id.includes('delete') || className.includes('delete') || className.includes('danger')) {
        el.setAttribute('data-tooltip', 'Delete');
        return 'Delete';
    }
    if (id.includes('save') || className.includes('save')) {
        el.setAttribute('data-tooltip', 'Save');
        return 'Save';
    }
    if (id.includes('back') || className.includes('back')) {
        el.setAttribute('data-tooltip', 'Back');
        return 'Back';
    }

    return null;
}

export function initCustomTooltips() {
    let tooltipEl = document.getElementById('app-custom-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'app-custom-tooltip';
        tooltipEl.className = 'custom-tooltip';
        document.body.appendChild(tooltipEl);
    }

    let tooltipTimer = null;
    let hideTimer = null;

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('button, input, select, textarea, a, .nav-btn, .tab-btn, .vod-filter-btn, .crud-channel-item, .settings-tab-btn, .vol-icon, .settings-switch, .settings-switch-slider, [title], [data-tooltip], [onclick], [role="button"]');
        if (!target) return;

        if (state.currentModule === 'live' && target.closest('#top-nav-menu')) return;
        if (state.currentModule === 'live' && target.closest('.dashboard-landing-nav')) return;

        const text = getOrGenerateTooltip(target);
        if (!text || text.trim() === '') return;

        clearTimeout(tooltipTimer);
        clearTimeout(hideTimer);
        tooltipTimer = setTimeout(() => {
            tooltipEl.textContent = text;

            const rect = target.getBoundingClientRect();
            tooltipEl.style.left = '-9999px';
            tooltipEl.style.top = '-9999px';
            tooltipEl.classList.add('show');
            const tooltipRect = tooltipEl.getBoundingClientRect();
            const tw = tooltipRect.width;
            const th = tooltipRect.height;
            const gap = 8;
            const margin = 5;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            const spaceAbove = rect.top;
            const spaceBelow = vh - rect.bottom;
            const spaceLeft = rect.left;
            const spaceRight = vw - rect.right;

            let top, left;

            // Vertical vs horizontal placement: prefer top/bottom, fall back to sides
            if (spaceAbove >= th + gap + margin || spaceBelow >= th + gap + margin) {
                // Place above or below
                if (spaceAbove >= th + gap + margin) {
                    top = rect.top - th - gap;
                } else {
                    top = rect.bottom + gap;
                }
                left = rect.left + (rect.width - tw) / 2;
            } else if (spaceRight >= tw + gap + margin || spaceLeft >= tw + gap + margin) {
                // Place to the side
                if (spaceRight >= tw + gap + margin) {
                    left = rect.right + gap;
                } else {
                    left = rect.left - tw - gap;
                }
                top = rect.top + (rect.height - th) / 2;
            } else {
                // Fallback: below
                top = rect.bottom + gap;
                left = rect.left + (rect.width - tw) / 2;
            }

            // Shift to keep within viewport
            if (left < margin) left = margin;
            if (left + tw > vw - margin) left = vw - tw - margin;
            if (top < margin) top = margin;
            if (top + th > vh - margin) top = vh - th - margin;

            tooltipEl.style.left = `${left}px`;
            tooltipEl.style.top = `${top}px`;

            hideTimer = setTimeout(() => {
                tooltipEl.classList.remove('show');
            }, 2000);
        }, 1200);
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('button, input, select, textarea, a, .nav-btn, .tab-btn, .vod-filter-btn, .crud-channel-item, .settings-tab-btn, .vol-icon, .settings-switch, .settings-switch-slider, [data-tooltip]');
        if (target) {
            clearTimeout(tooltipTimer);
            clearTimeout(hideTimer);
            tooltipEl.classList.remove('show');
        }
    });

    document.addEventListener('click', () => {
        clearTimeout(tooltipTimer);
        clearTimeout(hideTimer);
        tooltipEl.classList.remove('show');
    });
}
