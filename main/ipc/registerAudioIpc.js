import { webContents } from 'electron';
import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function registerAudioIpc({ ipcMain, context }) {
  ipcMain.handle(IPC.GET_CURRENT_VOLUME, () => context.services.audioState.getVolumeLevel());
  ipcMain.handle(IPC.GET_AUDIO_LEVELER, () => context.services.audioState.getAudioLevelerEnabled());
  ipcMain.handle(IPC.IS_CURRENTLY_AUDIBLE, (event) => {
    try {
      return event.sender.isCurrentlyAudible();
    } catch (e) {
      return false;
    }
  });

  // IS_AUDIO_MUTED and SET_AUDIO_MUTED must live here (always-registered) and NOT in
  // registerDiagnosticsIpc — that module is gated behind devModeAvailable and is absent
  // in production builds, which causes adjustVolume/toggleMute to silently fail.
  ipcMain.handle(IPC.IS_AUDIO_MUTED, () => {
    const win = context.windowManager.getMainWindow();
    return win ? win.webContents.isAudioMuted() : false;
  });

  ipcMain.handle(IPC.SET_AUDIO_MUTED, (_event, muted) => {
    const win = context.windowManager.getMainWindow();
    if (!win) return false;
    win.webContents.setAudioMuted(muted);
    // Also propagate to all guest webviews
    try {
      webContents.getAllWebContents().forEach(wc => {
        if (wc !== win.webContents) {
          try { wc.setAudioMuted(muted); } catch (e) {}
        }
      });
    } catch (e) {}
    return win.webContents.isAudioMuted();
  });

  ipcMain.on(IPC.BROADCAST_VOLUME, (_event, level) => {
    context.services.audioState.setVolumeLevel(level);
    context.windowManager.broadcast(IPC.SET_VOLUME_LEVEL, level);
  });

  ipcMain.on(IPC.BROADCAST_AUDIO_LEVELER, (_event, enabled) => {
    context.services.audioState.setAudioLevelerEnabled(enabled);
    context.windowManager.broadcast(IPC.SET_AUDIO_LEVELER, enabled);
  });
}
