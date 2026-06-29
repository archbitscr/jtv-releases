import { state } from '../state/appState.js';
import { sanitizeRemoteUrl, sanitizeMediaUrl, escapeHtml } from '../utils/sanitize.js';
import { getPlaceholderHtml, TV_ICON_SVG } from '../utils/domHelpers.js';
import { getActiveVodGenres } from '../filters/filterState.js';

let ext = {};

export function initVodContent(dependencies) {
    ext = dependencies;
}

export function parseSFlixHtml(html) {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items = [];
    doc.querySelectorAll('.flw-item').forEach(elem => {
        const posterImg = elem.querySelector('.film-poster-img');
        const posterUrl = posterImg ? (posterImg.getAttribute('src') || posterImg.getAttribute('data-src') || '') : '';
        const titleLink = elem.querySelector('.film-name > a');
        const title = titleLink ? titleLink.textContent.trim() : '';
        const href = titleLink ? titleLink.getAttribute('href') : '';
        const rating = elem.querySelector('.fd-infor .fa-star') ? elem.querySelector('.fd-infor .fa-star').parentNode.textContent.trim() : 'N/A';
        const qualityEl = elem.querySelector('.fd-infor strong');
        const quality = qualityEl ? qualityEl.textContent.trim() : 'SD';
        
        const infoItems = elem.querySelectorAll('.fd-infor .fdi-item');
        let extraInfo = '';
        infoItems.forEach(item => {
            const txt = item.textContent.trim();
            if (txt && txt !== rating && txt !== quality) {
                extraInfo = txt;
            }
        });

        items.push({
            id: escapeHtml(href.split('/').filter(Boolean).pop()),
            title: title,
            url: sanitizeRemoteUrl(href.startsWith('http') ? href : `https://sflix.win${href}`),
            posterUrl: sanitizeMediaUrl(posterUrl),
            rating: rating,
            quality: quality,
            extraInfo: extraInfo
        });
    });
    return items;
}

export function getSFlixUrlForPage(type, pageNum) {
    if (state.vodSearchTerm) {
        return `https://sflix.win/search?keyword=${encodeURIComponent(state.vodSearchTerm)}&page=${pageNum}`;
    }
    if (state.selectedVodGenre !== "All") {
        return `https://sflix.win/genre/${state.selectedVodGenre.toLowerCase().replace(' & ', '-').replace(' ', '-')}/page/${pageNum}/`;
    }
    return type === 'movies' ? `https://sflix.win/movies/page/${pageNum}/` : `https://sflix.win/tv-series/page/${pageNum}/`;
}

export async function refreshVodContent() {
    const favoritesGrid = document.getElementById('land-grid');
    const gridDots = document.getElementById('land-dots');
    if (!favoritesGrid) return;

    const token = ++state.vodRequestToken;
    favoritesGrid.innerHTML = `
        <div style="grid-column: 1 / span var(--vod-cols, 5); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--accent); gap: 15px;">
            <div class="loader-spinner"></div>
            <span>Loading SFlix Content...</span>
        </div>
    `;
    if (gridDots) gridDots.innerHTML = '';

    const pageNum1 = 3 * state.vodPage + 1;
    const pageNum2 = 3 * state.vodPage + 2;
    const pageNum3 = 3 * state.vodPage + 3;

    const url1 = getSFlixUrlForPage(state.activeDashTab, pageNum1);
    const url2 = getSFlixUrlForPage(state.activeDashTab, pageNum2);
    const url3 = getSFlixUrlForPage(state.activeDashTab, pageNum3);

    try {
        const [res1, res2, res3] = await Promise.all([
            ext.nativeApi.fetchSflixPage(url1),
            ext.nativeApi.fetchSflixPage(url2),
            ext.nativeApi.fetchSflixPage(url3)
        ]);

        if (token !== state.vodRequestToken) return;

        const items1 = parseSFlixHtml(res1.html || '');
        const items2 = parseSFlixHtml(res2.html || '');
        const items3 = parseSFlixHtml(res3.html || '');

        const allItems = [...items1, ...items2, ...items3].map(it => ({ ...it, type: state.activeDashTab }));

        if (state.activeDashTab === "movies") {
            state.fetchedMovies = allItems;
        } else {
            state.fetchedSeries = allItems;
        }

        if (!state.vodSearchTerm && state.selectedVodGenre === "All" && state.vodFilterMode === "all") {
            if (ext.scheduleVodCacheUpdate) {
                ext.scheduleVodCacheUpdate(state.activeDashTab, allItems.slice(0, 100));
            }
        }

        // Parse total pages from res1 to calculate total pages in JTV paging space
        let sflixTotalPages = 1;
        if (res1.html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(res1.html, 'text/html');
            const paginationLink = doc.querySelector('.pagination li:last-child a');
            if (paginationLink) {
                const href = paginationLink.getAttribute('href');
                const match = href.match(/page\/(\d+)/) || href.match(/page=(\d+)/);
                if (match) sflixTotalPages = parseInt(match[1]);
            } else {
                const pages = doc.querySelectorAll('.pagination .page-item a');
                let maxPage = 1;
                pages.forEach(p => {
                    const pageNum = parseInt(p.textContent.trim());
                    if (!isNaN(pageNum) && pageNum > maxPage) maxPage = pageNum;
                });
                sflixTotalPages = maxPage;
            }
        }
        state.vodTotalPages = Math.ceil(sflixTotalPages / 3);

        if (ext.renderFavoritesGrid) {
            ext.renderFavoritesGrid();
        }
    } catch (e) {
        if (token !== state.vodRequestToken) return;
        favoritesGrid.innerHTML = `
            <div style="grid-column: 1 / span var(--vod-cols, 5); display: flex; align-items: center; justify-content: center; height: 300px; color: #ff4b4b;">
                Error loading SFlix content: ${e.message}
            </div>
        `;
    }
}

export async function showVodDetails(item) {
    const modal = document.getElementById('details-modal');
    const titleEl = document.getElementById('details-title');
    const yearEl = document.getElementById('details-year');
    const qualityEl = document.getElementById('details-quality');
    const ratingEl = document.getElementById('details-rating');
    const imdbRatingEl = document.getElementById('details-imdb-rating');
    const overviewEl = document.getElementById('details-overview');
    const posterEl = document.getElementById('details-poster');
    const posterPlaceholder = document.getElementById('details-poster-placeholder');
    const playBtn = document.getElementById('play-vod-btn');

    if (!modal || !titleEl || !yearEl || !qualityEl || !ratingEl || !imdbRatingEl || !overviewEl || !posterEl || !posterPlaceholder || !playBtn) return;

    // Reset details view
    titleEl.innerText = item.title;
    yearEl.innerText = item.extraInfo || "N/A";
    qualityEl.innerText = item.quality || "HD";
    ratingEl.innerText = item.rating && item.rating !== "N/A" ? `★ ${item.rating}` : "★ N/A";
    imdbRatingEl.classList.add('hidden');
    overviewEl.innerText = "Fetching details from TMDB...";
    posterEl.classList.add('hidden');
    posterPlaceholder.classList.remove('hidden');
    posterPlaceholder.innerHTML = `<div class="loader-spinner"></div>`;
    
    modal.classList.remove('hidden');

    let posterUrl = item.posterUrl;
    let overview = "No dynamic synopsis available.";
    let hasDetails = false;

    // 1. Fetch TMDB Details if Key is Set
    if (state.tmdbKey) {
        try {
            const tmdbRes = await ext.nativeApi.fetchTmdbMetadata({ 
                query: item.title, 
                apiKey: state.tmdbKey, 
                type: state.activeDashTab 
            });
            if (tmdbRes && tmdbRes.result) {
                const res = tmdbRes.result;
                overview = res.overview || overview;
                if (res.poster_path) {
                    posterUrl = `https://image.tmdb.org/t/p/w500${res.poster_path}`;
                }
                if (res.release_date || res.first_air_date) {
                    const dateStr = res.release_date || res.first_air_date;
                    yearEl.innerText = dateStr.split('-')[0];
                }
                hasDetails = true;
            }
        } catch (e) {
            console.error("TMDB fetch failed:", e);
        }
    }

    // 2. Fetch OMDb Ratings if Key is Set
    if (state.omdbKey) {
        try {
            const omdbRes = await ext.nativeApi.fetchOmdbRatings({ 
                query: item.title, 
                apiKey: state.omdbKey 
            });
            if (omdbRes && !omdbRes.error) {
                if (omdbRes.imdbRating && omdbRes.imdbRating !== "N/A") {
                    imdbRatingEl.innerText = `IMDb: ${omdbRes.imdbRating}`;
                    imdbRatingEl.classList.remove('hidden');
                }
                if (omdbRes.plot && omdbRes.plot !== "N/A" && !hasDetails) {
                    overview = omdbRes.plot;
                }
            }
        } catch (e) {
            console.error("OMDb fetch failed:", e);
        }
    }

    if (!hasDetails && !state.omdbKey) {
        overview = `SFlix Title: ${item.title}. No API Keys configured for plot metadata.`;
    }

    overviewEl.innerText = overview;
    
    // Load poster image
    const imgLoader = new Image();
    imgLoader.onload = () => {
        posterEl.src = posterUrl;
        posterEl.classList.remove('hidden');
        posterPlaceholder.classList.add('hidden');
    };
    imgLoader.onerror = () => {
        posterPlaceholder.innerHTML = `<span style="font-size:3rem; opacity:0.1;">🎬</span>`;
    };
    imgLoader.src = posterUrl;

    // Wire Play Button
    playBtn.onclick = () => {
        modal.classList.add('hidden');
        state.isHomeActive = false;
        if (ext.renderAll) ext.renderAll();
        if (ext.playVod) ext.playVod(item);
    };
}

export function renderVodGenreChips() {
    const container = document.getElementById('vod-genre-filters');
    if (!container) return;
    container.innerHTML = '';
    
    getActiveVodGenres().forEach(genre => {
        const chip = document.createElement('div');
        chip.className = `chip ${state.selectedVodGenre === genre.name ? 'active' : ''}`;
        chip.innerHTML = `<i data-lucide="${genre.icon}"></i> <span>${genre.name}</span>`;
        chip.onclick = async () => {
            container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.selectedVodGenre = genre.name;
            state.vodPage = 0;
            await refreshVodContent();
        };
        container.appendChild(chip);
    });
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
