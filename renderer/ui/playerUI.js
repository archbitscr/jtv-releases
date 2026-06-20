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
    const onboardingOpen = !document.getElementById('onboarding-modal').classList.contains('hidden');
    const parentalOpen = !document.getElementById('parental-pin-modal').classList.contains('hidden');
    const detailsOpen = !document.getElementById('details-modal').classList.contains('hidden');
    const resolutionOpen = !document.getElementById('resolution-blocker').classList.contains('hidden');
    const trialExpiredOpen = !document.getElementById('trial-expired-blocker').classList.contains('hidden');

    if (settingsOpen || onboardingOpen || parentalOpen || detailsOpen || resolutionOpen || trialExpiredOpen) {
        webview.style.pointerEvents = 'none';
    } else {
        webview.style.pointerEvents = 'auto';
    }
}

export function initWebviewPointerEventsObserver() {
    const targets = [
        'settings-screen',
        'onboarding-modal',
        'parental-pin-modal',
        'details-modal',
        'resolution-blocker',
        'trial-expired-blocker'
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
    const container = document.getElementById('hud-channel-filters');
    if (!container) return;

    container.innerHTML = '';

    const categories = channel.categories || [];
    categories.forEach(cat => {
        if (cat.toLowerCase() === 'all') return;
        const badge = document.createElement('span');
        badge.className = 'hud-filter-badge';
        badge.textContent = cat;
        container.appendChild(badge);
    });
}

