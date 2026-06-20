import IPC from '../../shared/ipcChannels.json' with { type: 'json' };
import { fetchOmdbRatings, fetchSflixPage, fetchTmdbMetadata } from '../services/vodClient.js';

export function registerVodIpc({ ipcMain }) {
  ipcMain.handle(IPC.FETCH_SFLIX_PAGE, async (_event, url) => {
    try {
      const html = await fetchSflixPage(url);
      return { html };
    } catch (e) {
      console.error(`Error fetching SFlix page (${url}):`, e);
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.FETCH_TMDB_METADATA, async (_event, { query, apiKey, type }) => {
    try {
      return await fetchTmdbMetadata({ query, apiKey, type });
    } catch (e) {
      console.error(`Error calling TMDB API for query (${query}):`, e);
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.FETCH_OMDB_RATINGS, async (_event, { query, apiKey, year }) => {
    try {
      return await fetchOmdbRatings({ query, apiKey, year });
    } catch (e) {
      console.error(`Error calling OMDb API for query (${query}):`, e);
      return { error: e.message };
    }
  });
}
