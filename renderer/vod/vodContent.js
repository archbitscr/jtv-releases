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
        <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--accent); gap: 15px;">
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
            <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; height: 300px; color: #ff4b4b;">
                Error loading SFlix content: ${e.message}
            </div>
        `;
    }
}

export function closeVodDetail() {
    const page = document.getElementById('vod-detail-page');
    if (page) page.classList.add('hidden');
    state.vodDetailOpen = false;
    // tnav visibility is managed by its own inactivity/hover logic — no restore needed
}

export async function showVodDetails(item) {
    const page = document.getElementById('vod-detail-page');
    if (!page) return;

    state.vodDetailOpen = true;

    const get = (id) => document.getElementById(id);
    const titleEl      = get('vdp-title');
    const taglineEl    = get('vdp-tagline');
    const yearEl       = get('vdp-year');
    const qualityEl    = get('vdp-quality');
    const overviewEl   = get('vdp-overview');
    const posterEl     = get('vdp-poster-img');
    const posterPh     = get('vdp-poster-placeholder');
    const heroEl       = get('vdp-hero');
    const ratingCol    = get('vdp-rating-col');
    const ratingScore  = get('vdp-rating-score');
    const starsEl      = get('vdp-stars');
    const genresEl     = get('vdp-genres');
    const castEl       = get('vdp-cast');
    const keywordsEl   = get('vdp-keywords');
    const castWrap     = get('vdp-cast-wrap');
    const keywordsWrap = get('vdp-keywords-wrap');
    const countryEl    = get('vdp-country');
    const countryWrap  = get('vdp-country-wrap');
    const runtimeEl    = get('vdp-runtime');
    const runtimeWrap  = get('vdp-runtime-wrap');
    const imdbField    = get('vdp-imdb-field');
    const imdbScore    = get('vdp-imdb-score');
    const playHeroBtn  = get('vdp-play-hero-btn');

    // Reset
    titleEl.textContent   = item.title;
    yearEl.textContent    = item.extraInfo || '';
    qualityEl.textContent = item.quality || 'HD';
    overviewEl.textContent = 'Fetching details…';
    taglineEl.classList.add('hidden');
    genresEl.textContent  = '—';
    ratingCol.style.display = 'none';
    castWrap.style.display = 'none';
    keywordsWrap.style.display = 'none';
    countryWrap.style.display = 'none';
    runtimeWrap.style.display = 'none';
    if (imdbField) imdbField.style.display = 'none';

    posterEl.classList.add('hidden');
    posterPh.style.display = 'flex';
    posterPh.innerHTML = '<div class="loader-spinner"></div>';

    const oldBg = heroEl.querySelector('.vdp-hero-bg');
    if (oldBg) oldBg.remove();



    page.classList.remove('hidden');
    page.scrollTop = 0;

    playHeroBtn.onclick = () => {
        closeVodDetail();
        state.isHomeActive = false;
        if (ext.renderAll) ext.renderAll();
        if (ext.playVod) ext.playVod(item);
    };

    const backBtn = get('vdp-back-btn');
    if (backBtn && !backBtn._wired) {
        backBtn._wired = true;
        backBtn.onclick = () => closeVodDetail();
    }

    let posterUrl = item.posterUrl;
    let overview = 'No synopsis available.';
    let hasDetails = false;

    // 1. TMDB detail (search + detail with credits/keywords)
    if (state.tmdbKey) {
        try {
            const tmdbRes = await ext.nativeApi.fetchTmdbDetail({
                query: item.title,
                apiKey: state.tmdbKey,
                type: state.activeDashTab
            });
            if (tmdbRes && tmdbRes.result) {
                const res = tmdbRes.result;
                overview = res.overview || overview;

                if (res.poster_path) posterUrl = `https://image.tmdb.org/t/p/w342${res.poster_path}`;

                if (res.backdrop_path) {
                    const bg = new Image();
                    bg.className = 'vdp-hero-bg';
                    bg.src = `https://image.tmdb.org/t/p/w1280${res.backdrop_path}`;
                    heroEl.insertBefore(bg, heroEl.firstChild);
                }

                const dateStr = res.release_date || res.first_air_date || '';
                if (dateStr) yearEl.textContent = dateStr.split('-')[0];

                if (res.tagline) {
                    taglineEl.textContent = res.tagline;
                    taglineEl.classList.remove('hidden');
                }

                if (res.runtime) {
                    runtimeEl.textContent = `${res.runtime} minutes`;
                    runtimeWrap.style.display = 'flex';
                }

                if (res.production_countries && res.production_countries.length) {
                    countryEl.textContent = res.production_countries.map(c => c.name).join(', ');
                    countryWrap.style.display = 'flex';
                }

                if (res.genres && res.genres.length) {
                    genresEl.textContent = res.genres.map(g => g.name).join(', ');
                }

                if (res.credits) {
                    const cast = (res.credits.cast || []).slice(0, 10).map(a => a.name).join(', ');
                    if (cast) {
                        castEl.textContent = cast;
                        castWrap.style.display = 'flex';
                    }
                }

                if (res.keywords) {
                    const words = (res.keywords.keywords || res.keywords.results || []).slice(0, 20);
                    if (words.length) {
                        keywordsEl.innerHTML = words.map(k => `<span class="vdp-keyword">#${k.name.replace(/ /g, '-')}</span>`).join(' ');
                        keywordsWrap.style.display = 'flex';
                    }
                }

                // TMDB vote_average as fallback IMDb display
                if (res.vote_average && res.vote_average > 0 && imdbField) {
                    imdbScore.textContent = res.vote_average.toFixed(1);
                    imdbField.style.display = 'flex';
                    const filled = Math.round(res.vote_average / 2);
                    starsEl.textContent = '★'.repeat(filled) + '☆'.repeat(5 - filled);
                    if (ratingScore) ratingScore.textContent = res.vote_average.toFixed(3);
                    ratingCol.style.display = 'flex';
                }

                hasDetails = true;
            }
        } catch (e) {
            console.error('TMDB fetch failed:', e);
        }
    }

    // 2. OMDb — overrides rating with actual IMDb score
    if (state.omdbKey) {
        try {
            const omdbRes = await ext.nativeApi.fetchOmdbRatings({ query: item.title, apiKey: state.omdbKey });
            if (omdbRes && !omdbRes.error && omdbRes.imdbRating && omdbRes.imdbRating !== 'N/A') {
                const score = parseFloat(omdbRes.imdbRating);
                if (imdbField) { imdbScore.textContent = omdbRes.imdbRating; imdbField.style.display = 'flex'; }
                if (ratingScore) ratingScore.textContent = omdbRes.imdbRating;
                const filled = Math.round(score / 2);
                starsEl.textContent = '★'.repeat(filled) + '☆'.repeat(5 - filled);
                ratingCol.style.display = 'flex';
            }
            if (omdbRes && omdbRes.plot && omdbRes.plot !== 'N/A' && !hasDetails) {
                overview = omdbRes.plot;
            }
        } catch (e) {
            console.error('OMDb fetch failed:', e);
        }
    }

    if (!hasDetails && !state.omdbKey) {
        overview = `${item.title}`;
    }

    overviewEl.textContent = overview;

    // Load poster
    const imgLoader = new Image();
    imgLoader.onload = () => {
        posterEl.src = posterUrl;
        posterEl.classList.remove('hidden');
        posterPh.style.display = 'none';
    };
    imgLoader.onerror = () => {
        posterPh.innerHTML = '<span style="font-size:2rem;opacity:0.15;">🎬</span>';
    };
    imgLoader.src = posterUrl;
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
