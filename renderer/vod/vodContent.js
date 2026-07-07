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
}

export async function showVodDetails(item) {
    const page = document.getElementById('vod-detail-page');
    if (!page) return;

    state.vodDetailOpen = true;

    // -- Reset UI to loading state --
    const titleEl        = document.getElementById('vdp-title');
    const taglineEl      = document.getElementById('vdp-tagline');
    const yearEl         = document.getElementById('vdp-year');
    const qualityEl      = document.getElementById('vdp-quality');
    const runtimeEl      = document.getElementById('vdp-runtime');
    const countryEl      = document.getElementById('vdp-country');
    const overviewEl     = document.getElementById('vdp-overview');
    const posterEl       = document.getElementById('vdp-poster-img');
    const posterPh       = document.getElementById('vdp-poster-placeholder');
    const heroEl         = document.getElementById('vdp-hero');
    const ratingCol      = document.getElementById('vdp-rating-col');
    const imdbScore      = document.getElementById('vdp-imdb-score');
    const starsEl        = document.getElementById('vdp-stars');
    const genresEl       = document.getElementById('vdp-genres');
    const castEl         = document.getElementById('vdp-cast');
    const crewEl         = document.getElementById('vdp-crew');
    const keywordsEl     = document.getElementById('vdp-keywords');
    const castWrap       = document.getElementById('vdp-cast-wrap');
    const crewWrap       = document.getElementById('vdp-crew-wrap');
    const keywordsWrap   = document.getElementById('vdp-keywords-wrap');
    const playHeroBtn    = document.getElementById('vdp-play-hero-btn');

    titleEl.textContent  = item.title;
    yearEl.textContent   = item.extraInfo || '';
    qualityEl.textContent = item.quality || 'HD';
    overviewEl.textContent = 'Fetching details…';
    taglineEl.classList.add('hidden');
    runtimeEl.classList.add('hidden');
    countryEl.classList.add('hidden');
    ratingCol.style.display = 'none';
    castWrap.style.display = 'none';
    crewWrap.style.display = 'none';
    keywordsWrap.style.display = 'none';
    genresEl.textContent = item.extraInfo || '—';

    // Reset poster
    posterEl.classList.add('hidden');
    posterPh.style.display = 'flex';
    posterPh.innerHTML = '<div class="loader-spinner"></div>';

    // Reset hero (remove old bg image)
    const oldBg = heroEl.querySelector('.vdp-hero-bg');
    if (oldBg) oldBg.remove();

    page.classList.remove('hidden');
    page.scrollTop = 0;

    // -- Wire play button --
    playHeroBtn.onclick = () => {
        closeVodDetail();
        state.isHomeActive = false;
        if (ext.renderAll) ext.renderAll();
        if (ext.playVod) ext.playVod(item);
    };

    // -- Wire back button (once) --
    const backBtn = document.getElementById('vdp-back-btn');
    if (backBtn && !backBtn._wired) {
        backBtn._wired = true;
        backBtn.onclick = () => closeVodDetail();
    }

    let posterUrl = item.posterUrl;
    let overview = 'No synopsis available.';
    let hasDetails = false;

    // 1. TMDB
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
                    runtimeEl.textContent = `${res.runtime} min`;
                    runtimeEl.classList.remove('hidden');
                }

                if (res.production_countries && res.production_countries.length) {
                    countryEl.textContent = res.production_countries.map(c => c.name).join(', ');
                    countryEl.classList.remove('hidden');
                }

                if (res.genres && res.genres.length) {
                    genresEl.textContent = res.genres.map(g => g.name).join(', ');
                }

                if (res.credits) {
                    const cast = (res.credits.cast || []).slice(0, 8).map(a => a.name).join(', ');
                    if (cast) {
                        castEl.textContent = cast;
                        castWrap.style.display = 'flex';
                    }
                    const director = (res.credits.crew || []).filter(c => c.job === 'Director');
                    const writer   = (res.credits.crew || []).filter(c => c.job === 'Writer' || c.job === 'Screenplay');
                    const producer = (res.credits.crew || []).filter(c => c.job === 'Producer').slice(0, 2);
                    const crewParts = [];
                    director.forEach(p => crewParts.push(`${p.name} (Director)`));
                    writer.forEach(p => crewParts.push(`${p.name} (Writer)`));
                    producer.forEach(p => crewParts.push(`${p.name} (Producer)`));
                    if (crewParts.length) {
                        crewEl.textContent = crewParts.join(', ');
                        crewWrap.style.display = 'flex';
                    }
                }

                if (res.keywords) {
                    const words = (res.keywords.keywords || res.keywords.results || []).slice(0, 14);
                    if (words.length) {
                        keywordsEl.innerHTML = words.map(k => `<span class="vdp-keyword">#${k.name.replace(/ /g, '-')}</span>`).join(' ');
                        keywordsWrap.style.display = 'flex';
                    }
                }

                hasDetails = true;
            }
        } catch (e) {
            console.error('TMDB fetch failed:', e);
        }
    }

    // 2. OMDb ratings
    if (state.omdbKey) {
        try {
            const omdbRes = await ext.nativeApi.fetchOmdbRatings({ query: item.title, apiKey: state.omdbKey });
            if (omdbRes && !omdbRes.error && omdbRes.imdbRating && omdbRes.imdbRating !== 'N/A') {
                const score = parseFloat(omdbRes.imdbRating);
                imdbScore.textContent = omdbRes.imdbRating;
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
        overview = `${item.title} — No API keys configured for metadata.`;
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
