import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };
import { enableCloudflareProtection, disableCloudflareProtection } from '../network/cloudflareNetworkService.js';

export function registerUserDataIpc({ ipcMain, context }) {
  ipcMain.handle(IPC.SAVE_USER_DATA, async (_event, data) => {
    if (data && data.globalDomain) {
      context.state.globalDomain = data.globalDomain;
    }
    if (data && data.developerModeEnabled !== undefined) {
      context.state.developerModeEnabled = !!data.developerModeEnabled;
    }
    if (data && data.diagnosticsEnabled !== undefined) {
      context.state.diagnosticsEnabled = !!data.diagnosticsEnabled;
    }
    if (data && data.cloudflareProtectionEnabled !== undefined) {
      context.state.cloudflareProtectionEnabled = data.cloudflareProtectionEnabled;
      if (data.cloudflareProtectionEnabled) {
        enableCloudflareProtection();
      } else {
        disableCloudflareProtection();
      }
    }
    const result = context.services.userDataStore.save(data);

    // Update tray and power managers immediately
    if (context.services.trayManager) {
      context.services.trayManager.setMinimizeToTray(data?.minimizeToTray);
    }
    if (context.services.powerManager) {
      context.services.powerManager.setPreventSleep(data?.preventSleep);
    }

    return result;
  });

  ipcMain.handle(IPC.LOAD_USER_DATA, async () => {
    return context.services.userDataStore.load();
  });

  // Relaunch the application (Danger Zone)
  ipcMain.handle('relaunch', async () => {
    app.relaunch();
    app.exit(0);
  });

  // Read a locale file from the bundled locales/ directory
  ipcMain.handle('read-locale-file', async (_event, langCode) => {
    const safe = langCode.replace(/[^a-z]/g, '');
    // app.getAppPath() returns the app root in dev and the app.asar path when packaged.
    // Electron patches fs to read inside .asar, so this works in both cases.
    const filePath = path.join(app.getAppPath(), 'locales', `${safe}.json`);
    return fs.readFileSync(filePath, 'utf8');
  });

}
