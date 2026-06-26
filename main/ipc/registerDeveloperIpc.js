import { app } from 'electron';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function registerDeveloperIpc({ ipcMain, context }) {
  ipcMain.handle(IPC.GET_APP_FLAGS, () => {
    return {
      isPackaged: app.isPackaged,
      devModeAvailable: context.flags.devModeAvailable
    };
  });

  ipcMain.handle(IPC.GET_DEVELOPER_STATE, () => {
    return {
      devModeAvailable: context.flags.devModeAvailable,
      developerModeEnabled: context.state.developerModeEnabled,
      diagnosticsEnabled: context.state.diagnosticsEnabled,
      diagnosticsRunning: context.diagnosticsController?.isRunning?.() || false
    };
  });

  ipcMain.handle(IPC.SET_DEVELOPER_MODE, (_event, enabled) => {
    if (!context.flags.devModeAvailable) {
      return { error: 'Developer mode not available' };
    }

    context.state.developerModeEnabled = !!enabled;
    if (!context.state.developerModeEnabled) {
      context.state.diagnosticsEnabled = false;
      context.diagnosticsController?.stop?.();
    }

    return {
      developerModeEnabled: context.state.developerModeEnabled,
      diagnosticsEnabled: context.state.diagnosticsEnabled,
      diagnosticsRunning: context.diagnosticsController?.isRunning?.() || false
    };
  });

  ipcMain.handle(IPC.GET_DIAGNOSTICS_ENABLED, () => {
    return context.state.diagnosticsEnabled;
  });

  ipcMain.handle(IPC.SET_DIAGNOSTICS_ENABLED, (_event, enabled) => {
    if (!context.flags.devModeAvailable || !context.state.developerModeEnabled) {
      return { error: 'Developer mode disabled' };
    }

    context.state.diagnosticsEnabled = !!enabled;
    if (context.state.diagnosticsEnabled) {
      context.diagnosticsController?.start?.();
    } else {
      context.diagnosticsController?.stop?.();
    }

    return {
      diagnosticsEnabled: context.state.diagnosticsEnabled,
      diagnosticsRunning: context.diagnosticsController?.isRunning?.() || false
    };
  });

  ipcMain.handle(IPC.OPEN_DEVTOOLS, () => {
    console.log('[Main] Received request to open DevTools');
    if (!context.flags.devModeAvailable || !context.state.developerModeEnabled) {
      console.warn('[Main] DevTools request denied: developer mode not active or available');
      return { error: 'Developer mode disabled' };
    }
    const win = context.windowManager.getMainWindow();
    if (!win) {
      console.error('[Main] DevTools request denied: Main window is null');
      return { error: 'No window' };
    }
    try {
      console.log('[Main] Opening DevTools (mode: detach)...');
      win.webContents.openDevTools({ mode: 'detach' });
      return { success: true };
    } catch (e) {
      console.error('[Main] Failed to open DevTools:', e.message);
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.RELOAD_WINDOW, () => {
    console.log('[Main] Received request to reload window');
    if (!context.flags.devModeAvailable || !context.state.developerModeEnabled) {
      console.warn('[Main] Reload request denied: developer mode not active or available');
      return { error: 'Developer mode disabled' };
    }
    const win = context.windowManager.getMainWindow();
    if (!win) {
      console.error('[Main] Reload request denied: Main window is null');
      return { error: 'No window' };
    }
    try {
      console.log('[Main] Reloading window (ignoring cache)...');
      win.webContents.reloadIgnoringCache();
      return { success: true };
    } catch (e) {
      console.error('[Main] Failed to reload window:', e.message);
      return { error: e.message };
    }
  });

}
