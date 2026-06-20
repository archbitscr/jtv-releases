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
                const tooltipText = `Activar/Desactivar: ${titleEl.textContent.trim()}`;
                el.setAttribute('data-tooltip', tooltipText);
                return tooltipText;
            }
        }
    }

    if (id.includes('close-settings') || className.includes('settings-close')) {
        el.setAttribute('data-tooltip', 'Cerrar ajustes');
        return 'Cerrar ajustes';
    }

    if (id === 'crud-add-new-btn') {
        el.setAttribute('data-tooltip', 'Crear un nuevo canal');
        return 'Crear un nuevo canal';
    }

    if (id === 'crud-save-btn') {
        el.setAttribute('data-tooltip', 'Guardar cambios del canal');
        return 'Guardar cambios del canal';
    }

    if (id === 'crud-delete-btn') {
        el.setAttribute('data-tooltip', 'Eliminar este canal permanentemente');
        return 'Eliminar este canal permanentemente';
    }

    if (id === 'crud-logo-scraper-btn') {
        el.setAttribute('data-tooltip', 'Buscar y optimizar logo en internet');
        return 'Buscar y optimizar logo en internet';
    }

    if (id === 'crud-logo-upload-btn') {
        el.setAttribute('data-tooltip', 'Subir una imagen local como logo');
        return 'Subir una imagen local como logo';
    }

    if (id === 'crud-logo-delete-btn') {
        el.setAttribute('data-tooltip', 'Eliminar el logo actual');
        return 'Eliminar el logo actual';
    }

    if (className.includes('crud-channel-item')) {
        const nameEl = el.querySelector('.crud-channel-name');
        const channelName = nameEl ? nameEl.textContent.trim() : 'canal';
        const tooltipText = `Editar: ${channelName}`;
        el.setAttribute('data-tooltip', tooltipText);
        return tooltipText;
    }

    if (className.includes('settings-tab-btn')) {
        const text = el.textContent.trim();
        const tooltipText = `Sección ${text}`;
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
        const label = el.getAttribute('aria-label') || (el.options && el.options[0] ? el.options[0].text : 'Seleccionar');
        const tooltipText = `Filtrar por: ${label}`;
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
            case 'x': tooltipText = 'Cerrar'; break;
            case 'tv': tooltipText = 'Ver En Vivo'; break;
            case 'film': tooltipText = 'Películas'; break;
            case 'clapperboard': tooltipText = 'Series'; break;
            case 'heart': tooltipText = el.classList.contains('active') || id.includes('fav') ? 'Quitar de Favoritos' : 'Agregar a Favoritos'; break;
            case 'settings': case 'settings-2': case 'sliders': tooltipText = 'Ajustes y Filtros'; break;
            case 'search': tooltipText = 'Buscar'; break;
            case 'plus': case 'plus-circle': tooltipText = 'Agregar'; break;
            case 'minus': tooltipText = 'Disminuir / Quitar'; break;
            case 'arrow-left': case 'chevron-left': tooltipText = 'Volver / Anterior'; break;
            case 'arrow-right': case 'chevron-right': tooltipText = 'Siguiente'; break;
            case 'trash-2': tooltipText = 'Eliminar'; break;
            case 'upload': tooltipText = 'Subir archivo o imagen'; break;
            case 'volume-2': case 'volume-x': case 'volume-1': tooltipText = 'Volumen / Silencio'; break;
            case 'home': tooltipText = 'Inicio'; break;
            case 'code-2': tooltipText = 'Modo Desarrollador'; break;
            case 'user': tooltipText = 'Mi Cuenta'; break;
        }
        if (tooltipText) {
            el.setAttribute('data-tooltip', tooltipText);
            return tooltipText;
        }
    }

    // Generic fallbacks based on ids / classes
    if (id.includes('close') || className.includes('close')) {
        el.setAttribute('data-tooltip', 'Cerrar');
        return 'Cerrar';
    }
    if (id.includes('delete') || className.includes('delete') || className.includes('danger')) {
        el.setAttribute('data-tooltip', 'Eliminar');
        return 'Eliminar';
    }
    if (id.includes('save') || className.includes('save')) {
        el.setAttribute('data-tooltip', 'Guardar');
        return 'Guardar';
    }
    if (id.includes('back') || className.includes('back')) {
        el.setAttribute('data-tooltip', 'Volver');
        return 'Volver';
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

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('button, input, select, textarea, a, .nav-btn, .tab-btn, .vod-filter-btn, .crud-channel-item, .settings-tab-btn, .vol-icon, .settings-switch, .settings-switch-slider, [title], [data-tooltip], [onclick], [role="button"]');
        if (!target) return;

        // Disable tooltips for top nav menu buttons when in the live module ("En vivo" section)
        if (state.currentModule === 'live' && target.closest('#top-nav-menu')) return;

        // Disable tooltips for filter buttons in the live section landing
        if (state.currentModule === 'live' && target.closest('.dashboard-landing-nav')) return;

        const text = getOrGenerateTooltip(target);
        if (!text || text.trim() === '') return;

        tooltipEl.textContent = text;
        tooltipEl.classList.add('show');

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();
        
        let left = rect.left + (rect.width - tooltipRect.width) / 2;
        let top = rect.top - tooltipRect.height - 6;

        if (left < 5) left = 5;
        if (left + tooltipRect.width > window.innerWidth - 5) {
            left = window.innerWidth - tooltipRect.width - 5;
        }
        if (top < 5) {
            top = rect.bottom + 6;
        }

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('button, input, select, textarea, a, .nav-btn, .tab-btn, .vod-filter-btn, .crud-channel-item, .settings-tab-btn, .vol-icon, .settings-switch, .settings-switch-slider, [data-tooltip]');
        if (target) {
            tooltipEl.classList.remove('show');
        }
    });

    document.addEventListener('click', () => {
        tooltipEl.classList.remove('show');
    });
}
