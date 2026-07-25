import path from 'path';
import { app } from 'electron';
import { createUserDataStore } from '../services/userDataStore.js';
import { createAudioState } from '../services/audioState.js';
import { createWindowManager } from '../windows/windowManager.js';
import { createTrayManager } from '../services/trayManager.js';
import { createPowerManager } from '../services/powerManager.js';

export function createAppContext({ appRootDir }) {
  if (!appRootDir || typeof appRootDir !== 'string') {
    throw new Error('appRootDir is required');
  }
  const __dirname = appRootDir;
  const userDataPath = path.join(app.getPath('userData'), 'jtv_data.json');

  const userDataStore = createUserDataStore(userDataPath);
  const persisted = userDataStore.load();

  // Task 23: dev mode is available only when running unpackaged (npm run start / vite dev).
  // In the packaged .exe (app.isPackaged === true) it is false, so all dev IPC handlers
  // (registerDeveloperIpc, registerDiagnosticsIpc, main/diagnostics watchers) stay inert.
  const devModeAvailable = !app.isPackaged;
  const developerModeEnabled = persisted?.developerModeEnabled !== undefined ? !!persisted.developerModeEnabled : true;
  const diagnosticsEnabled = developerModeEnabled && !!persisted?.diagnosticsEnabled;
  const globalDomain = persisted?.globalDomain || "https://dlhd.st/";
  const cloudflareProtectionEnabled = persisted?.cloudflareProtectionEnabled !== undefined ? !!persisted.cloudflareProtectionEnabled : false;

  const audioState = createAudioState({
    volumeLevel: typeof persisted?.currentVolumeLevel === 'number' ? persisted.currentVolumeLevel : 10,
    audioLevelerEnabled: !!persisted?.audioLevelerEnabled
  });

  const windowManager = createWindowManager();

  const context = {
    __dirname,
    paths: {
      userDataPath
    },
    flags: {
      devModeAvailable,
      isPackaged: app.isPackaged
    },
    state: {
      developerModeEnabled,
      diagnosticsEnabled,
      globalDomain,
      cloudflareProtectionEnabled
    },
    services: {
      userDataStore,
      audioState
    },
    windowManager
  };

  context.services.trayManager = createTrayManager(context);
  context.services.powerManager = createPowerManager(context);

  return context;
}
