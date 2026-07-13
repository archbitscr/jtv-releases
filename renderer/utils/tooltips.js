import { state } from '../state/appState.js';
import { t } from '../i18n/i18n.js';

const SUPPRESS_IDS = new Set([
    'open-devtools-btn',
    'factory-reset-btn', 'sync-channels-btn', 'apply-domain-btn',
    'crud-save-btn', 'crud-delete-btn', 'crud-logo-delete-btn', 'crud-logo-upload-btn',
    'crud-search',
    'close-home',
]);

function shouldSuppressTooltip(el) {
    const id = el.id || '';
    const className = el.className || '';
    if (SUPPRESS_IDS.has(id)) return true;
    // Settings toggles
    if (className.includes('settings-switch') || className.includes('settings-switch-slider') || (el.tagName === 'INPUT' && el.type === 'checkbox' && el.closest('.setting-item'))) return true;
    // Settings sub-nav tabs (assignment, general, timeouts, etc.)
    if (className.includes('settings-subnav-btn') || className.includes('assigner-tab-btn') || className.includes('connectivity-subnav-btn') || className.includes('channels-subnav-btn')) return true;
    // Settings main tabs
    if (className.includes('settings-tab-btn')) return true;
    // Sidebar All/Favorites tabs
    if (className.includes('side-tab-btn') && el.closest('.channel-tabs')) return true;
    // Inputs inside CRUD or connectivity sections
    if (el.tagName === 'INPUT' && el.closest('#settings-sect-developer, #settings-sect-connectivity')) return true;
    return false;
}

export function getOrGenerateTooltip(el) {
    if (shouldSuppressTooltip(el)) {
        el.removeAttribute('title');
        el.removeAttribute('data-tooltip');
        return null;
    }

    if (el.hasAttribute('title')) {
        el.setAttribute('data-tooltip', el.getAttribute('title'));
        el.removeAttribute('title');
    }

    // Dynamic tooltips: favorite buttons and sidebar edit — never cache
    const icon = el.querySelector('[data-lucide]');
    const iconName = icon ? icon.getAttribute('data-lucide') : null;
    if (iconName === 'heart') {
        const favBtn = el.closest('.favorite, .pbar-fav-btn, [id*="fav"]');
        const isActive = (favBtn && favBtn.classList.contains('active')) || el.classList.contains('active');
        return isActive ? t('tooltip.fav.remove', 'Remove from Favorites') : t('tooltip.fav.add', 'Add to Favorites');
    }
    if (iconName === 'sliders' && el.closest('.side-channel-actions')) {
        return t('tooltip.channel.edit', 'Edit channel');
    }
    if (iconName === 'pin') {
        return el.classList.contains('active') ? t('tooltip.player.unpin', 'Unpin Player') : t('tooltip.player.pin', 'Pin Player');
    }

    let tooltip = el.getAttribute('data-tooltip');
    if (tooltip && tooltip.trim() !== '') return tooltip;

    const id = el.id || '';
    const className = el.className || '';

    if (id.includes('close-settings') || className.includes('settings-close')) {
        const tt = t('tooltip.settings.close', 'Close settings');
        el.setAttribute('data-tooltip', tt);
        return tt;
    }

    if (id === 'crud-add-new-btn') {
        const tt = t('tooltip.channel.create', 'Create a new channel');
        el.setAttribute('data-tooltip', tt);
        return tt;
    }

    if (className.includes('crud-channel-item')) {
        const nameEl = el.querySelector('.crud-channel-name');
        const channelName = nameEl ? nameEl.textContent.trim() : 'canal';
        const tooltipText = `Edit: ${channelName}`;
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
    if (icon) {
        let tooltipText = '';
        switch (iconName) {
            case 'x': tooltipText = t('tooltip.icon.close', 'Close'); break;
            case 'tv': tooltipText = t('tooltip.icon.watch', 'Watch Live'); break;
            case 'heart': tooltipText = t('tooltip.icon.favorite', 'Favorite'); break;
            case 'settings': case 'settings-2': case 'sliders': tooltipText = t('tooltip.icon.settings', 'Settings & Filters'); break;
            case 'search': tooltipText = t('tooltip.icon.search', 'Search'); break;
            case 'plus': case 'plus-circle': tooltipText = t('tooltip.icon.add', 'Add'); break;
            case 'minus': tooltipText = t('tooltip.icon.remove', 'Decrease / Remove'); break;
            case 'arrow-left': case 'chevron-left': tooltipText = t('tooltip.icon.back', 'Back / Previous'); break;
            case 'arrow-right': case 'chevron-right': tooltipText = t('tooltip.icon.next', 'Next'); break;
            case 'trash-2': tooltipText = t('tooltip.icon.delete', 'Delete'); break;
            case 'upload': tooltipText = t('tooltip.icon.upload', 'Upload file or image'); break;
            case 'volume-2': case 'volume-x': case 'volume-1': tooltipText = t('tooltip.icon.volume', 'Volume / Mute'); break;
            case 'home': tooltipText = t('tooltip.icon.home', 'Home'); break;
            case 'code-2': tooltipText = t('tooltip.icon.devmode', 'Developer Mode'); break;
            case 'user': tooltipText = t('tooltip.icon.account', 'My Account'); break;
        }
        if (tooltipText) {
            el.setAttribute('data-tooltip', tooltipText);
            return tooltipText;
        }
    }

    // Generic fallbacks based on ids / classes
    if (id.includes('close') || className.includes('close')) {
        const tt = t('tooltip.generic.close', 'Close');
        el.setAttribute('data-tooltip', tt);
        return tt;
    }
    if (id.includes('delete') || className.includes('delete') || className.includes('danger')) {
        const tt = t('tooltip.generic.delete', 'Delete');
        el.setAttribute('data-tooltip', tt);
        return tt;
    }
    if (id.includes('save') || className.includes('save')) {
        const tt = t('tooltip.generic.save', 'Save');
        el.setAttribute('data-tooltip', tt);
        return tt;
    }
    if (id.includes('back') || className.includes('back')) {
        const tt = t('tooltip.generic.back', 'Back');
        el.setAttribute('data-tooltip', tt);
        return tt;
    }

    return null;
}

export function initCustomTooltips() {
    let tooltipEl = document.getElementById('tooltip-popup');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'tooltip-popup';
        tooltipEl.className = 'tooltip-popup';
        document.body.appendChild(tooltipEl);
    }

    let tooltipTimer = null;
    let hideTimer = null;

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('button, input, select, textarea, a, .tnav-btn, .side-tab-btn, .crud-channel-item, .settings-tab-btn, .pbar-vol-icon, .settings-switch, .settings-switch-slider, [title], [data-tooltip], [onclick], [role="button"]');
        if (!target) return;

        if (state.currentModule === 'live' && target.closest('#tnav-menu')) return;
        if (state.currentModule === 'live' && target.closest('.land-filter-row')) return;

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
            let forcedPos = target.getAttribute('data-tooltip-pos');
            if (!forcedPos && target.closest('#side-menu .side-channel-actions')) {
                forcedPos = 'right';
            }

            if (forcedPos === 'left') {
                left = rect.left - tw - gap;
                top = rect.top + (rect.height - th) / 2;
            } else if (forcedPos === 'right') {
                left = rect.right + gap;
                top = rect.top + (rect.height - th) / 2;
            } else if (spaceAbove >= th + gap + margin || spaceBelow >= th + gap + margin) {
                if (spaceAbove >= th + gap + margin) {
                    top = rect.top - th - gap;
                } else {
                    top = rect.bottom + gap;
                }
                left = rect.left + (rect.width - tw) / 2;
            } else if (spaceRight >= tw + gap + margin || spaceLeft >= tw + gap + margin) {
                if (spaceRight >= tw + gap + margin) {
                    left = rect.right + gap;
                } else {
                    left = rect.left - tw - gap;
                }
                top = rect.top + (rect.height - th) / 2;
            } else {
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
        const target = e.target.closest('button, input, select, textarea, a, .tnav-btn, .side-tab-btn, .crud-channel-item, .settings-tab-btn, .pbar-vol-icon, .settings-switch, .settings-switch-slider, [data-tooltip]');
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
