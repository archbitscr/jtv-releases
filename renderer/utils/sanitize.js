export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function escapeRegex(value) {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeIconName(value, fallback = 'tag') {
    const icon = String(value ?? '').trim().toLowerCase();
    return /^[a-z0-9-]+$/.test(icon) ? icon : fallback;
}

export function sanitizeMediaUrl(url, { allowDataImage = false, fallback = '' } = {}) {
    const raw = String(url ?? '').trim();
    if (!raw) return fallback;
    if (allowDataImage && raw.startsWith('data:image/')) return raw;
    if (raw.startsWith('assets/')) return raw;

    try {
        const parsed = new URL(raw, window.location.href);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'file:') {
            return parsed.toString();
        }
    } catch (e) {}

    return fallback;
}

export function sanitizeRemoteUrl(url, fallback = 'about:blank') {
    try {
        const parsed = new URL(String(url ?? ''));
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            return parsed.toString();
        }
    } catch (e) {}
    return fallback;
}
