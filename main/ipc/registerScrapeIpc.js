import IPC from '../../shared/ipcChannels.json' with { type: 'json' };
import { checkDomain, fetchChannels, fetchSchedule, checkChannelStatus } from '../services/scrapeClient.js';

export function registerScrapeIpc({ ipcMain }) {
  ipcMain.handle(IPC.FETCH_CHANNELS, async (_event, domain) => {
    try {
      return await fetchChannels(domain);
    } catch (e) {
      console.error('Fetch channels error:', e);
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.FETCH_SCHEDULE, async (_event, domain) => {
    try {
      return await fetchSchedule(domain);
    } catch (e) {
      console.error('Fetch schedule error:', e);
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.CHECK_DOMAIN, async () => {
    try {
      return await checkDomain();
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('check-channel-status', async (_event, url) => {
    try {
      return await checkChannelStatus(url);
    } catch (e) {
      console.error('Check channel status IPC error:', e);
      return { error: e.message };
    }
  });
}
