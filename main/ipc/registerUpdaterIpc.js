import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function registerUpdaterIpc({ ipcMain, context }) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    const win = context.windowManager.getMainWindow();
    if (win) win.webContents.send(IPC.UPDATE_AVAILABLE, info);
  });

  autoUpdater.on('download-progress', (progress) => {
    const win = context.windowManager.getMainWindow();
    if (win) win.webContents.send(IPC.DOWNLOAD_PROGRESS, { percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const win = context.windowManager.getMainWindow();
    if (win) win.webContents.send(IPC.UPDATE_DOWNLOADED, info);
  });

  autoUpdater.on('update-not-available', () => {
    const win = context.windowManager.getMainWindow();
    if (win) win.webContents.send(IPC.UPDATE_NOT_AVAILABLE);
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message);
    const win = context.windowManager.getMainWindow();
    if (win) win.webContents.send(IPC.UPDATE_ERROR, { message: err.message });
  });

  ipcMain.handle(IPC.CHECK_FOR_UPDATES, async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      // In dev mode (app not packaged), electron-updater returns null silently.
      // Emit update-not-available so the button resets correctly.
      if (result === null) {
        const win = context.windowManager.getMainWindow();
        if (win) win.webContents.send(IPC.UPDATE_NOT_AVAILABLE);
      }
    } catch (e) {
      console.error('[AutoUpdater] checkForUpdates failed:', e.message);
      const win = context.windowManager.getMainWindow();
      if (win) win.webContents.send(IPC.UPDATE_ERROR, { message: e.message });
    }
  });

  ipcMain.handle(IPC.QUIT_AND_INSTALL, () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
