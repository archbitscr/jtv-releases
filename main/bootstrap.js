import { app, ipcMain, session } from 'electron';
import fs from 'fs';
import path from 'path';
import { createAppContext } from './context/createAppContext.js';
import { registerIpc } from './ipc/registerIpc.js';
import { attachRequestPolicy } from './network/requestPolicy.js';
import { createMainWindow } from './windows/createMainWindow.js';
import { initCloudflareNetworkService } from './network/cloudflareNetworkService.js';

export function registerAppBootstrap({ appRootDir }) {
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

  let hwAccelEnabled = true;
  try {
    const userDataPath = path.join(app.getPath('userData'), 'jtv_data.json');
    if (fs.existsSync(userDataPath)) {
      const content = fs.readFileSync(userDataPath, 'utf8');
      const data = JSON.parse(content);
      if (data && data.hwAccelEnabled === false) {
        hwAccelEnabled = false;
      }
    }
  } catch (e) {
    console.error("Failed to read hardware acceleration setting:", e.message);
  }

  if (!hwAccelEnabled) {
    app.disableHardwareAcceleration();
  }

  app.whenReady().then(async () => {
    app.name = 'JTV';
    const playbackSession = session.fromPartition('persist:jtv-playback');
    const sessionsToHarden = [session.defaultSession, playbackSession];
    sessionsToHarden.forEach(targetSession => {
      targetSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
      });
      targetSession.setPermissionCheckHandler(() => false);
      targetSession.setDevicePermissionHandler(() => false);
    });

    const context = createAppContext({ appRootDir });

    // Initialize Cloudflare secure DNS service
    initCloudflareNetworkService(context);

    // Initialize managers (Tarea 33)
    if (context.services.trayManager) {
      context.services.trayManager.init();
    }
    if (context.services.powerManager) {
      context.services.powerManager.init();
    }

    // Load diagnostics controller in special build
    if (true) {
      try {
        const { createDiagnosticsController } = await import('./diagnostics/controller.js');
        context.diagnosticsController = createDiagnosticsController(context);
        if (context.flags.devModeAvailable && context.state.developerModeEnabled && context.state.diagnosticsEnabled) {
          context.diagnosticsController.start();
        }
      } catch (e) {
        console.warn('Diagnostics controller failed to load:', e.message);
      }
    }

    await registerIpc({ ipcMain, context });
    sessionsToHarden.forEach(targetSession => attachRequestPolicy(targetSession, context));

    createMainWindow(context);

    app.on('activate', () => {
      if (context.windowManager.getMainWindow() === null) {
        createMainWindow(context);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
