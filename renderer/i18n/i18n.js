const SUPPORTED = ['en', 'es', 'pt', 'fr', 'de'];
const DEFAULT_LANG = 'en';

let activeLocale = {};
let fallbackLocale = {};
let currentLang = DEFAULT_LANG;

export async function loadLocale(langCode) {
    const code = SUPPORTED.includes(langCode) ? langCode : DEFAULT_LANG;
    try {
        const raw = await window.jtvAPI.readLocaleFile(code);
        const data = JSON.parse(raw);
        activeLocale = data;
        currentLang = code;

        if (code !== DEFAULT_LANG && Object.keys(fallbackLocale).length === 0) {
            const enRaw = await window.jtvAPI.readLocaleFile(DEFAULT_LANG);
            fallbackLocale = JSON.parse(enRaw);
        } else if (code === DEFAULT_LANG) {
            fallbackLocale = data;
        }
    } catch (e) {
        console.warn(`[i18n] Failed to load locale "${langCode}", falling back to en`);
        if (Object.keys(fallbackLocale).length === 0) {
            try {
                const enRaw = await window.jtvAPI.readLocaleFile(DEFAULT_LANG);
                fallbackLocale = JSON.parse(enRaw);
            } catch (_) { /* silent */ }
        }
        activeLocale = fallbackLocale;
        currentLang = DEFAULT_LANG;
    }
}

export function t(key, fallback) {
    return activeLocale[key] ?? fallbackLocale[key] ?? fallback ?? key;
}

export function getCurrentLang() {
    return currentLang;
}

export function applyLocale(langCode) {
    if (langCode && langCode !== currentLang) {
        return loadLocale(langCode).then(() => _applyDOM());
    }
    return Promise.resolve(_applyDOM());
}

function _applyDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val !== key) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        const val = t(key);
        if (val !== key) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = t(key);
        if (val !== key) el.placeholder = val;
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = t(key);
        if (val !== key) el.title = val;
    });
}
