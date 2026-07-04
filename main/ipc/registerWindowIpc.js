import IPC from '../../shared/ipcChannels.json' with { type: 'json' };

export function registerWindowIpc({ ipcMain, context }) {
  ipcMain.on(IPC.ESCAPE_PRESSED, () => {
    context.windowManager.sendToMain(IPC.APP_HOTKEY, { key: 'Escape' });
  });

  ipcMain.on(IPC.TYPING_STATE, (_event, isTyping) => {
    context.windowManager.setTypingState(!!isTyping);
  });

  ipcMain.handle(IPC.TOGGLE_FULLSCREEN, () => {
    const win = context.windowManager.getMainWindow();
    if (!win) return false;
    const nextState = !win.isFullScreen();
    win.setFullScreen(nextState);
    return nextState;
  });

  ipcMain.handle(IPC.GET_FULLSCREEN_STATE, () => {
    const win = context.windowManager.getMainWindow();
    return win ? win.isFullScreen() : false;
  });

  ipcMain.handle(IPC.RESET_WINDOW_SIZE, () => {
    const win = context.windowManager.getMainWindow();
    if (!win) return;
    if (win.isFullScreen()) win.setFullScreen(false);
    win.setContentSize(1080, 720);
    win.center();
  });
}
