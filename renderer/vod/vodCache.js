import { state } from '../state/appState.js';
import { parseSFlixHtml } from './vodContent.js';
import { moviesDbGet } from './moviesDb.js';

let ext = {};

export function initVodCache(dependencies) {
    ext = dependencies;
}

export function scheduleVodCacheSave() {
    if (ext.timeouts) {
        ext.timeouts.set('vodCacheSave', () => {
            if (ext.saveAppState) ext.saveAppState();
        }, 900);
    } else {
        setTimeout(() => {
            if (ext.saveAppState) ext.saveAppState();
        }, 900);
    }
}

export function scheduleVodCacheUpdate(type, items) {
    if (type !== 'movies' && type !== 'series') return;
    const dedup = new Map();
    (items || []).forEach(it => {
        if (!it || !it.id) return;
        dedup.set(it.id, it);
    });
    const normalized = Array.from(dedup.values()).slice(0, 100);
    state.vodCache[type] = { items: normalized, updatedAt: Date.now() };
    if (type === 'movies') state.fetchedMovies = normalized.map(it => ({ ...it, type: 'movies' }));
    if (type === 'series') state.fetchedSeries = normalized.map(it => ({ ...it, type: 'series' }));
    scheduleVodCacheSave();
}

export async function prefetchVodType(type, targetCount = 100) {
    if (type !== 'movies' && type !== 'series') return;
    const urls = [];
    for (let p = 1; p <= 8; p++) {
        urls.push(type === 'movies'
            ? `https://sflix.win/movies/page/${p}/`
            : `https://sflix.win/tv-series/page/${p}/`);
    }

    const results = [];
    for (let i = 0; i < urls.length; i += 2) {
        const batch = urls.slice(i, i + 2);
        const resList = await Promise.all(batch.map(u => ext.nativeApi.fetchSflixPage(u)));
        resList.forEach(r => {
            const parsed = parseSFlixHtml(r?.html || '');
            parsed.forEach(it => results.push({ ...it, type }));
        });
        if (results.length >= targetCount) break;
    }
    scheduleVodCacheUpdate(type, results.slice(0, targetCount));
    if ((state.currentModule === 'series' || state.currentModule === 'movies') && state.activeDashTab === type && state.isHomeActive) {
        if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
    }
}

// Performance Fix: warmupVodCache using requestIdleCallback
export function warmupVodCache() {
    const runWarmup = () => {
        prefetchVodType('series', 100);
        loadMoviesFromDb();
    };
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => runWarmup(), { timeout: 2000 });
    } else {
        setTimeout(runWarmup, 1000);
    }
}

// Load movies from the persistent disk DB instead of SFlix
export async function loadMoviesFromDb() {
    try {
        const db = await moviesDbGet();
        if (db.movies && db.movies.length > 0) {
            const items = db.movies.map(m => ({ ...m, type: 'movies' }));
            state.vodCache.movies = { items, updatedAt: db.updatedAt ? new Date(db.updatedAt).getTime() : Date.now() };
            state.fetchedMovies = items;
            state.vodTotalPages = Math.ceil(items.length / state.VOD_ITEMS_PER_PAGE);
            if (ext.renderFavoritesGrid) ext.renderFavoritesGrid();
            return items;
        }
    } catch (e) {
        console.warn('[vodCache] loadMoviesFromDb failed, falling back to SFlix:', e.message);
    }
    // Fallback: fetch from SFlix if DB is empty
    await prefetchVodType('movies', 100);
    return state.fetchedMovies;
}
