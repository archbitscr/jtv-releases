import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function registerAudioIpc({ ipcMain, context }) {
  ipcMain.handle(IPC.GET_CURRENT_VOLUME, () => context.services.audioState.getVolumeLevel());
  ipcMain.handle(IPC.GET_AUDIO_LEVELER, () => context.services.audioState.getAudioLevelerEnabled());

  ipcMain.on(IPC.BROADCAST_VOLUME, (_event, level) => {
    context.services.audioState.setVolumeLevel(level);
    context.windowManager.broadcast(IPC.SET_VOLUME_LEVEL, level);
  });

  ipcMain.on(IPC.BROADCAST_AUDIO_LEVELER, (_event, enabled) => {
    context.services.audioState.setAudioLevelerEnabled(enabled);
    context.windowManager.broadcast(IPC.SET_AUDIO_LEVELER, enabled);
  });
}
