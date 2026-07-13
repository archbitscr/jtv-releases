export function ensurePlayerCurtain() {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) return null;
    let curtain = playerContainer.querySelector('.player-loading-curtain');
    if (!curtain) {
        curtain = document.createElement('div');
        curtain.className = 'player-loading-curtain';
        curtain.innerHTML = '';
        playerContainer.appendChild(curtain);
    }
    return curtain;
}

export function showPlayerCurtain() {
    const curtain = ensurePlayerCurtain();
    if (!curtain) return;
    curtain.classList.remove('hidden');
}

export function hidePlayerCurtain() {
    const curtain = ensurePlayerCurtain();
    if (!curtain) return;
    curtain.classList.add('hidden');
}

export function updateWebviewPointerEvents() {
    const webview = document.getElementById('player-webview');
    if (!webview) return;

    const settingsOpen = !document.getElementById('settings-screen').classList.contains('hidden');
    const noSignalOpen = !document.getElementById('no-signal-overlay').classList.contains('hidden');
    const pbarOpen = !document.getElementById('pbar').classList.contains('hidden');
    const sideMenuOpen = !document.getElementById('side-menu').classList.contains('hidden');
    if (settingsOpen || noSignalOpen || pbarOpen || sideMenuOpen) {
        webview.style.pointerEvents = 'none';
    } else {
        webview.style.pointerEvents = 'auto';
    }

    const triggerBottom = document.getElementById('trigger-bottom');
    if (triggerBottom) {
        triggerBottom.style.pointerEvents = pbarOpen ? 'none' : '';
    }
}

export function initWebviewPointerEventsObserver() {
    const targets = [
        'settings-screen',
        'no-signal-overlay',
        'pbar',
        'side-menu'
    ];
    
    const observer = new MutationObserver(() => {
        updateWebviewPointerEvents();
    });
    
    targets.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        }
    });
    
    updateWebviewPointerEvents();
}

export function updateHudChannelFilters(channel) {
    const container = document.getElementById('pbar-channel-filters');
    if (!container) return;

    container.innerHTML = '';

    const categories = channel.categories || [];
    categories.forEach(cat => {
        if (cat.toLowerCase() === 'all') return;
        const badge = document.createElement('span');
        badge.className = 'pbar-filter-badge';
        badge.textContent = cat;
        container.appendChild(badge);
    });
}

