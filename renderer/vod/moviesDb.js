// Renderer-side movies DB API — wraps IPC calls to main process
// The DB lives at userData/movies/movies-db.json, posters at userData/movies/posters/

const api = () => window.jtvAPI?.moviesDb;

export async function moviesDbGet() {
    const result = await api().get();
    return result || { movies: [], updatedAt: null };
}

export async function moviesDbSave(movies) {
    if (!movies || !movies.length) return { ok: true, total: 0, added: 0, updated: 0 };
    return api().save({ movies });
}

export async function moviesDbDelete() {
    return api().delete();
}

export async function moviesDbSavePoster(id, dataUrl) {
    return api().savePoster({ id, data: dataUrl });
}

export async function moviesDbGetPoster(id) {
    return api().getPoster({ id });
}

// ─── TMDB enrichment ────────────────────────────────────────────────────────

export async function enrichMovie(movie, tmdbKey) {
    if (!tmdbKey || movie._enriched) return movie;
    try {
        const result = await window.jtvAPI.fetchTmdbMetadata({
            query: movie.title,
            apiKey: tmdbKey,
            type: 'movie'
        });
        if (!result || result.error) return movie;

        const enriched = {
            ...movie,
            tmdbId: result.id || movie.tmdbId,
            overview: result.overview || movie.overview,
            genreList: result.genres?.map(g => g.name) || movie.genreList,
            runtime: result.runtime || movie.runtime,
            imdbRating: result.vote_average ? result.vote_average.toFixed(1) : movie.imdbRating,
            _enriched: true
        };

        // Prefer TMDB poster if not already local
        if (result.poster_path && !enriched.posterLocal) {
            enriched.posterHD = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
        }

        return enriched;
    } catch (e) {
        console.warn('[moviesDb] enrichMovie error:', e.message);
        return movie;
    }
}

// ─── Poster download + resize to 185×314 ────────────────────────────────────

export async function downloadAndSavePoster(movie) {
    const src = movie.posterHD || movie.posterUrl;
    if (!src || movie.posterLocal) return movie;

    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            const TARGET_W = 185, TARGET_H = 314;
            const canvas = document.createElement('canvas');
            canvas.width = TARGET_W;
            canvas.height = TARGET_H;
            const ctx = canvas.getContext('2d');

            const scale = Math.max(TARGET_W / img.naturalWidth, TARGET_H / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            const dx = (TARGET_W - dw) / 2;
            const dy = (TARGET_H - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            const result = await moviesDbSavePoster(movie.id, dataUrl);
            resolve(result?.ok ? { ...movie, posterLocal: result.posterLocal } : movie);
        };
        img.onerror = () => resolve(movie);
        img.src = src;
    });
}

// ─── Poster src resolver ─────────────────────────────────────────────────────
// posterLocal is a jtv-poster:// URI; we resolve it to a base64 data URL on demand.
// For the grid we use a lazy approach: the img src is set to posterHD/posterUrl initially,
// and the poster cache is updated in background.

export function getPosterSrc(movie) {
    return movie.posterHD || movie.posterUrl || '';
}
