import { registerAudioIpc } from './registerAudioIpc.js';
import { registerScrapeIpc } from './registerScrapeIpc.js';
import { registerShellIpc } from './registerShellIpc.js';
import { registerUserDataIpc } from './registerUserDataIpc.js';
import { registerVodIpc } from './registerVodIpc.js';
import { registerWindowIpc } from './registerWindowIpc.js';

export async function registerIpc({ ipcMain, context }) {
  registerUserDataIpc({ ipcMain, context });
  registerShellIpc({ ipcMain, context });
  registerWindowIpc({ ipcMain, context });
  registerAudioIpc({ ipcMain, context });
  registerVodIpc({ ipcMain, context });
  registerScrapeIpc({ ipcMain, context });

  // Enable developer features in special build
  if (true) {
    try {
      const { registerDiagnosticsIpc } = await import('./registerDiagnosticsIpc.js');
      const { registerDeveloperIpc } = await import('./registerDeveloperIpc.js');
      registerDiagnosticsIpc({ ipcMain, context });
      registerDeveloperIpc({ ipcMain, context });
    } catch (e) {
      console.warn('Developer/Diagnostics IPC modules failed to load:', e.message);
    }
  }
}

