import { escapeHtml, escapeRegex, sanitizeMediaUrl } from './sanitize.js';

export const TV_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`;

const GRADIENTS = [
    'linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)',
    'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
    'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
    'linear-gradient(135deg, #06beb6 0%, #48b1bf 100%)',
    'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
    'linear-gradient(135deg, #dd2476 0%, #ff512f 100%)',
    'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)',
    'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)'
];

export function getPlaceholderHtml(name) {
    const letter = name ? name.charAt(0).toUpperCase() : '?';
    const hash = name ? name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const gradient = GRADIENTS[hash % GRADIENTS.length];
    return `<div class="placeholder-circle" style="background: ${gradient}">${escapeHtml(letter)}</div>`;
}

export function getSafeLogoHtml(name, logoUrl) {
    const safeName = escapeHtml(name || '');
    const safeLogoUrl = sanitizeMediaUrl(logoUrl, { allowDataImage: true, fallback: '' });
    if (!safeLogoUrl) {
        return getPlaceholderHtml(name);
    }
    return `<img src="${safeLogoUrl}" alt="${safeName}" data-name="${safeName}" data-fallback-logo="1">`;
}

export function highlightText(text, term) {
    const safeText = escapeHtml(text);
    const safeTerm = escapeHtml(term);
    if (!safeTerm) return safeText;
    const regex = new RegExp(`(${escapeRegex(safeTerm)})`, 'gi');
    return safeText.replace(regex, '<span class="highlight">$1</span>');
}

export function processLogo(file, { logoCanvas, getChannels, getCurrentEditingChannelId, updateEditLogo, renderAll }) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const ctx = logoCanvas.getContext('2d');
            const size = 256;
            let srcSize = Math.min(img.width, img.height);
            let srcX = (img.width - srcSize) / 2;
            let srcY = (img.height - srcSize) / 2;
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);
            const croppedDataUrl = logoCanvas.toDataURL('image/png');
            const channelsList = getChannels();
            const editingChannelId = getCurrentEditingChannelId();
            const channel = channelsList.find(c => c.id === editingChannelId);
            if (channel) {
                channel.logo = croppedDataUrl;
                updateEditLogo(croppedDataUrl);
                renderAll();
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
