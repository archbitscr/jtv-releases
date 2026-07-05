import { BrowserWindow, app } from 'electron';
import path from 'path';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function createMainWindow(context) {
  const appPreloadPath = path.join(context.__dirname, 'app-preload.cjs');
  const guestPreloadPath = path.join(context.__dirname, 'guest-preload.cjs');

  const win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    useContentSize: true,
    frame: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#080808',
    icon: context.flags.isPackaged
      ? path.join(context.__dirname, 'dist', 'assets', 'images', 'JTV.ico')
      : path.join(context.__dirname, 'public', 'assets', 'images', 'JTV.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      webviewTag: true,
      preload: appPreloadPath
    }
  });

  context.windowManager.setMainWindow(win);

  if (context.flags.isPackaged) {
    win.loadFile(path.join(context.__dirname, 'dist', 'index.html'));
  } else if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(context.__dirname, 'index.html'));
  }

  win.on('close', (event) => {
    const trayManager = context.services.trayManager;
    if (trayManager && trayManager.isMinimizeToTrayEnabled() && !app.isQuiting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on('minimize', (event) => {
    const trayManager = context.services.trayManager;
    if (trayManager && trayManager.isMinimizeToTrayEnabled()) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => {
    context.windowManager.setMainWindow(null);
  });

  win.once('ready-to-show', () => {
    console.log('[Main] ready-to-show event fired!');
    win.center();
    win.show();
    win.focus();
    try {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch (e) {
      console.warn("Failed to set visible on all workspaces:", e.message);
    }
    console.log('[Main] win.show() called, visible:', win.isVisible());
  });

  win.on('enter-full-screen', () => {
    win.webContents.send(IPC.FULLSCREEN_STATE_CHANGED, true);
  });

  win.on('leave-full-screen', () => {
    win.webContents.send(IPC.FULLSCREEN_STATE_CHANGED, false);
  });

  win.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    try {
      console.log(`[Console] ${message} (Source: ${sourceId}:${line})`);
    } catch (e) {
      console.error("Error logging console-message:", e);
    }
  });

  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });

  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    try {
      const target = new URL(params.src);
      if (!['https:', 'http:'].includes(target.protocol)) {
        event.preventDefault();
        return;
      }
    } catch (e) {
      event.preventDefault();
      return;
    }

    delete webPreferences.preloadURL;
    webPreferences.preload = guestPreloadPath;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = true;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = false;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;

    params.partition = 'persist:jtv-playback';
    params.allowpopups = 'false';
  });

  win.webContents.on('did-attach-webview', (_event, guestContents) => {
    guestContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    
    // Mute guest webview immediately if main window is currently muted
    try {
      const isMuted = win.webContents.isAudioMuted();
      guestContents.setAudioMuted(isMuted);
    } catch (e) {
      console.error('Failed to set guest webview mute state:', e);
    }

    guestContents.on('did-frame-navigate', (event, url, httpResponseCode, httpStatusText, isMainFrame) => {
      try {
        const lowerUrl = url.toLowerCase();
        const isCriticalFrame = isMainFrame || 
          lowerUrl.includes('daddyhd.php') || 
          lowerUrl.includes('premiumtv') || 
          lowerUrl.includes('embed') || 
          lowerUrl.includes('stream') || 
          lowerUrl.includes('cast') || 
          lowerUrl.includes('player') || 
          lowerUrl.includes('watch.php');
        
        if (isCriticalFrame && httpResponseCode >= 400) {
          console.warn(`[Main Webview Monitor] HTTP Error ${httpResponseCode} in frame: ${url}`);
          win.webContents.send('webview-http-error', { url, statusCode: httpResponseCode });
        }
      } catch (e) {
        console.error('Error in did-frame-navigate monitor:', e);
      }
    });

    guestContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      try {
        if (errorCode === -3) return; // Ignore aborts
        const lowerUrl = validatedURL.toLowerCase();
        const isCriticalFrame = isMainFrame || 
          lowerUrl.includes('daddyhd.php') || 
          lowerUrl.includes('premiumtv') || 
          lowerUrl.includes('embed') || 
          lowerUrl.includes('stream') || 
          lowerUrl.includes('cast') || 
          lowerUrl.includes('player') || 
          lowerUrl.includes('watch.php');
        
        if (isCriticalFrame) {
          console.warn(`[Main Webview Monitor] Fail load error ${errorCode} (${errorDescription}) in frame: ${validatedURL}`);
          win.webContents.send('webview-load-failed', { url: validatedURL, errorCode, errorDescription });
        }
      } catch (e) {
        console.error('Error in did-fail-load monitor:', e);
      }
    });

    guestContents.on('will-navigate', (navEvent, navigationUrl) => {
      try {
        const target = new URL(navigationUrl);
        if (!['https:', 'http:'].includes(target.protocol)) {
          navEvent.preventDefault();
        }
      } catch (e) {
        navEvent.preventDefault();
      }
    });
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (context.flags.isPackaged) {
      const isDevTools =
        input.key === 'F12' ||
        (input.control && input.shift && (input.key === 'I' || input.key === 'i')) ||
        (input.control && input.shift && (input.key === 'J' || input.key === 'j')) ||
        (input.control && input.shift && (input.key === 'C' || input.key === 'c'));
      if (isDevTools) { event.preventDefault(); return; }
    }

    if (context.windowManager.getTypingState()) return;

    const k = input.key;
    if (k === 'f' || k === 'F') {
      if (input.isAutoRepeat) return;
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
      return;
    }

    if (
      k === 'Escape' ||
      k === 'ArrowUp' ||
      k === 'ArrowDown' ||
      k === 'ArrowLeft' ||
      k === 'ArrowRight' ||
      k === '+' ||
      k === '=' ||
      k === '-' ||
      k === '*' ||
      k === 'Add' ||
      k === 'Subtract' ||
      k === 'Multiply' ||
      k === ' ' ||
      k === 'm' || k === 'M' ||
      k === 'PageUp' ||
      k === 'PageDown'
    ) {
      win.webContents.send(IPC.APP_HOTKEY, { key: k, repeat: !!input.isAutoRepeat });
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  return win;
}
