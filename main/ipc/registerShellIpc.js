import { shell } from 'electron';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

const ALLOWED_EXTERNAL_HOSTS = new Set([
  'archbits.xyz',
  'www.archbits.xyz',
  'paypal.com',
  'www.paypal.com'
]);

export function registerShellIpc({ ipcMain }) {
  ipcMain.handle(IPC.OPEN_EXTERNAL, async (_event, url) => {
    try {
      if (typeof url !== 'string') return { error: 'Invalid URL' };
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return { error: 'Invalid protocol' };
      if (!ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname)) return { error: 'Blocked host' };
      await shell.openExternal(parsed.toString());
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  });
}
