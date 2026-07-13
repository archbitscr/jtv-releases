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
    // CSS :has() rules in style.css manage webview and trigger pointer-events reactively.
    // Clear any inline override so CSS rules take full effect.
    const webview = document.getElementById('player-webview');
    if (webview) webview.style.pointerEvents = '';
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

