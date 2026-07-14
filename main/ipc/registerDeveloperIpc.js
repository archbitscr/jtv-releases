import { app, webContents } from 'electron';
import fs from 'fs';
import path from 'path';
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

  // AD_SCAN: inspects every live webContents frame, returns DOM snapshot of ad-relevant frames.
  // Result is also written to userData/jtv_ad_scan.json so Claude can read it directly.
  ipcMain.handle(IPC.AD_SCAN, async () => {
    const scanScript = `(function() {
      try {
        const iframes = [...document.querySelectorAll('iframe')].map(f => ({
          id: f.id, src: f.src.slice(0, 200), cls: (f.className+'').slice(0, 80),
          style: (f.getAttribute('style') || '').slice(0, 120)
        }));
        const highZ = [...document.querySelectorAll('*')].reduce((acc, el) => {
          const zi = parseInt(getComputedStyle(el).zIndex);
          if (!isNaN(zi) && zi > 1000 && el.tagName !== 'VIDEO') {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              acc.push({ tag: el.tagName, id: el.id, cls: (el.className+'').slice(0,60),
                zi, w: Math.round(rect.width), h: Math.round(rect.height),
                style: (el.getAttribute('style')||'').slice(0,120) });
            }
          }
          return acc;
        }, []).slice(0, 30);
        const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src.slice(0,200));
        const videos = document.querySelectorAll('video').length;
        return JSON.stringify({ url: location.href, videos, iframes, highZ, scripts });
      } catch(e) { return JSON.stringify({ url: location.href, error: e.message }); }
    })()`;

    const all = webContents.getAllWebContents();
    const results = [];
    for (const wc of all) {
      const url = wc.getURL() || '';
      if (!url || url.startsWith('devtools://') || url.startsWith('chrome://')) continue;
      try {
        const raw = await wc.executeJavaScript(scanScript);
        results.push(JSON.parse(raw));
      } catch (e) {
        results.push({ url, error: e.message });
      }
    }

    try {
      const outPath = path.join(app.getPath('userData'), 'jtv_ad_scan.json');
      fs.writeFileSync(outPath, JSON.stringify({ ts: new Date().toISOString(), frames: results }, null, 2));
      console.log('[AdScan] Wrote scan to', outPath);
    } catch (e) {
      console.error('[AdScan] Failed to write scan file:', e.message);
    }

    return results;
  });

  // AD_KILL: injects the structural ad-kill script into every frame on demand.
  ipcMain.handle(IPC.AD_KILL, async () => {
    const killScript = `(function() {
      const url = location.href;
      let killed = 0;
      // In cast.php: hide everything that is not #thatframe or video
      if (url.includes('cast.php')) {
        document.querySelectorAll('body *').forEach(el => {
          if (el.id === 'thatframe' || el.tagName === 'VIDEO' ||
              el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
          const tf = document.getElementById('thatframe');
          if (tf && tf.contains(el)) return;
          el.style.cssText = 'display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;width:0!important;';
          killed++;
        });
        return JSON.stringify({ url, killed });
      }
      // In any other frame: kill elements with computed z-index > 10000 that are not video/player
      document.querySelectorAll('body *').forEach(el => {
        if (el.tagName === 'VIDEO' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
        if (el.querySelector && el.querySelector('video')) return;
        const id = (el.id || '').toLowerCase();
        if (id === 'thatframe' || id.includes('player') || id.includes('clappr')) return;
        const zi = parseInt(getComputedStyle(el).zIndex);
        if (!isNaN(zi) && zi > 10000) {
          el.style.cssText = 'display:none!important;visibility:hidden!important;pointer-events:none!important;';
          killed++;
        }
      });
      return JSON.stringify({ url, killed });
    })()`;

    const all = webContents.getAllWebContents();
    const results = [];
    for (const wc of all) {
      const url = wc.getURL() || '';
      if (!url || url.startsWith('devtools://') || url.startsWith('chrome://')) continue;
      try {
        const raw = await wc.executeJavaScript(killScript);
        results.push(JSON.parse(raw));
      } catch (e) {
        results.push({ url, error: e.message });
      }
    }
    console.log('[AdKill] Kill results:', JSON.stringify(results));
    return results;
  });

  // AD_CANDIDATES: collects unknown domains seen in frame src/script attributes and logs them.
  ipcMain.on(IPC.AD_CANDIDATES, (_event, candidates) => {
    if (!Array.isArray(candidates) || candidates.length === 0) return;
    try {
      const outPath = path.join(app.getPath('userData'), 'jtv_ad_candidates.json');
      let existing = [];
      if (fs.existsSync(outPath)) {
        existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      }
      const merged = [...new Set([...existing, ...candidates])].sort();
      fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
      console.log(`[AdCandidates] Updated: ${candidates.length} new, ${merged.length} total`);
    } catch (e) {
      console.error('[AdCandidates] Write failed:', e.message);
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
