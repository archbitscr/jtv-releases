import { BrowserWindow, webContents } from 'electron';

export function createWindowManager() {
  let mainWindow = null;
  let isTypingInRenderer = false;

  function getAllTargets() {
    const windows = BrowserWindow.getAllWindows();
    const guests = webContents.getAllWebContents();
    return { windows, guests };
  }

  return {
    setMainWindow(win) {
      mainWindow = win;
    },
    getMainWindow() {
      return mainWindow;
    },
    setTypingState(isTyping) {
      isTypingInRenderer = !!isTyping;
    },
    getTypingState() {
      return isTypingInRenderer;
    },
    sendToMain(channel, payload) {
      const win = mainWindow || BrowserWindow.getAllWindows()[0];
      if (!win) return false;
      try {
        win.webContents.send(channel, payload);
        return true;
      } catch (e) {
        return false;
      }
    },
    broadcast(channel, payload) {
      const { windows, guests } = getAllTargets();

      windows.forEach(win => {
        try {
          win.webContents.send(channel, payload);
          win.webContents.forEachRenderFrame(frame => {
            try {
              frame.send(channel, payload);
            } catch (e) {}
          });
        } catch (e) {}
      });

      guests.forEach(wc => {
        try {
          wc.send(channel, payload);
          wc.forEachRenderFrame(frame => {
            try {
              frame.send(channel, payload);
            } catch (e) {}
          });
        } catch (e) {}
      });
    }
  };
}

