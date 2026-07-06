import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function registerDiagnosticsIpc({ ipcMain, context }) {
  function dangerousDiagnosticsAllowed() {
    if (!context.flags.devModeAvailable) return false;
    if (!context.state.developerModeEnabled) return false;
    if (!context.state.diagnosticsEnabled) return false;
    if (app.isPackaged && process.env.JTV_ALLOW_PROD_DIAGNOSTICS !== '1') return false;
    return true;
  }

  function ensureDiagnosticsEnabled() {
    return dangerousDiagnosticsAllowed() ? null : { error: 'Diagnostics disabled' };
  }

  function normalizePoint(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.floor(n));
  }

  ipcMain.handle(IPC.LOG_RENDERER, (_event, message) => {
    console.log(`[Renderer] ${message}`);
    return null;
  });

  ipcMain.handle(IPC.LOG_DIAGNOSTIC, (_event, message) => {
    console.log(`[Diagnostic] ${message}`);
    return null;
  });

  ipcMain.handle(IPC.SIMULATE_MOVE, async (_event, { x, y }) => {
    const denied = ensureDiagnosticsEnabled();
    if (denied) return denied;
    const win = context.windowManager.getMainWindow();
    if (!win) return null;
    win.focus();
    win.webContents.sendInputEvent({ type: 'mouseMove', x: normalizePoint(x), y: normalizePoint(y) });
    return null;
  });

  ipcMain.handle(IPC.CAPTURE_SCREEN, async () => {
    const denied = ensureDiagnosticsEnabled();
    if (denied) return denied;
    const win = context.windowManager.getMainWindow();
    if (!win) return null;
    try {
      const nativeImage = await win.webContents.capturePage();
      return nativeImage.toDataURL();
    } catch (e) {
      console.error("Capture screen error:", e);
      return null;
    }
  });

  ipcMain.handle(IPC.SAVE_SCREENSHOT, async (_event, filename = 'debug-screenshot.png') => {
    const denied = ensureDiagnosticsEnabled();
    if (denied) return denied;
    const win = context.windowManager.getMainWindow();
    if (!win) return { error: "No window" };
    try {
      const nativeImage = await win.webContents.capturePage();
      const buffer = nativeImage.toPNG();
      const safeName = path.basename(typeof filename === 'string' ? filename : 'debug-screenshot.png');
      const filePath = path.join(context.__dirname, safeName);
      fs.writeFileSync(filePath, buffer);
      console.log(`[Diagnostic] Saved screenshot to ${filePath}`);
      return { success: true, path: filePath };
    } catch (e) {
      console.error("Save screenshot error:", e);
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.GET_AUDIO_STATE, () => {
    const win = context.windowManager.getMainWindow();
    return win ? win.webContents.isCurrentlyAudible() : false;
  });

  ipcMain.handle(IPC.REPORT_SPEAKER_COORDS, (_event, coords) => {
    const denied = ensureDiagnosticsEnabled();
    if (denied) return denied;
    context.windowManager.sendToMain(IPC.SPEAKER_COORDS_DETECTED, {
      x: normalizePoint(coords?.x),
      y: normalizePoint(coords?.y),
      isMuted: !!coords?.isMuted
    });
    return null;
  });

  ipcMain.handle(IPC.SIMULATE_SWEEP, async (_event, { fromX, fromY, toX, toY, steps = 15 }) => {
    const denied = ensureDiagnosticsEnabled();
    if (denied) return denied;
    const win = context.windowManager.getMainWindow();
    if (!win) return null;
    win.focus();

    const safeSteps = Math.max(1, Math.min(100, normalizePoint(steps, 15)));
    const safeFromX = normalizePoint(fromX);
    const safeFromY = normalizePoint(fromY);
    const safeToX = normalizePoint(toX);
    const safeToY = normalizePoint(toY);

    for (let i = 0; i <= safeSteps; i++) {
      const t = i / safeSteps;
      const x = Math.floor(safeFromX + (safeToX - safeFromX) * t);
      const y = Math.floor(safeFromY + (safeToY - safeFromY) * t);
      win.webContents.sendInputEvent({ type: 'mouseMove', x, y });
      await new Promise(r => setTimeout(r, 15));
    }

    return null;
  });

  ipcMain.handle(IPC.SIMULATE_CLICK, async (_event, { x, y }) => {
    const denied = ensureDiagnosticsEnabled();
    if (denied) return denied;
    const win = context.windowManager.getMainWindow();
    if (!win) return null;

    const safeX = normalizePoint(x);
    const safeY = normalizePoint(y);
    win.focus();
    win.webContents.sendInputEvent({ type: 'mouseMove', x: safeX, y: safeY });
    await new Promise(r => setTimeout(r, 30));
    win.webContents.sendInputEvent({ type: 'mouseDown', x: safeX, y: safeY, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 50));
    win.webContents.sendInputEvent({ type: 'mouseUp', x: safeX, y: safeY, button: 'left', clickCount: 1 });
    return null;
  });

  ipcMain.handle(IPC.SIMULATE_KEY, async (_event, { keyCode }) => {
    const denied = ensureDiagnosticsEnabled();
    if (denied) return denied;
    const win = context.windowManager.getMainWindow();
    if (!win) return null;

    if (typeof keyCode !== 'string' || keyCode.length > 32) {
      return { error: 'Invalid keyCode' };
    }
    win.focus();
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
    win.webContents.sendInputEvent({ type: 'char', keyCode });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
    return null;
  });
}
