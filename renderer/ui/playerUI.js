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
    const parentalOpen = !document.getElementById('parental-pin-modal').classList.contains('hidden');
    const detailsOpen = !document.getElementById('vod-details-modal').classList.contains('hidden');
    const noSignalOpen = !document.getElementById('no-signal-overlay').classList.contains('hidden');
    if (settingsOpen || parentalOpen || detailsOpen || noSignalOpen) {
        webview.style.pointerEvents = 'none';
    } else {
        webview.style.pointerEvents = 'auto';
    }
}

export function initWebviewPointerEventsObserver() {
    const targets = [
        'settings-screen',
        'parental-pin-modal',
        'vod-details-modal',
        'no-signal-overlay'
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

