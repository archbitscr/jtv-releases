import { registerAudioIpc } from './registerAudioIpc.js';
import { registerScrapeIpc } from './registerScrapeIpc.js';
import { registerShellIpc } from './registerShellIpc.js';
import { registerUserDataIpc } from './registerUserDataIpc.js';
import { registerWindowIpc } from './registerWindowIpc.js';
import { registerUpdaterIpc } from './registerUpdaterIpc.js';

export async function registerIpc({ ipcMain, context }) {
  registerUserDataIpc({ ipcMain, context });
  registerShellIpc({ ipcMain, context });
  registerWindowIpc({ ipcMain, context });
  registerAudioIpc({ ipcMain, context });
  registerScrapeIpc({ ipcMain, context });
  registerUpdaterIpc({ ipcMain, context });

  // Developer/Diagnostics IPC: loaded only in dev (Task 23). In the packaged .exe
  // devModeAvailable is false, so these modules are never imported — and they are
  // excluded from the electron-builder package (see package.json "files"), so the
  // dynamic import would not resolve there anyway.
  if (context.flags.devModeAvailable) {
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

