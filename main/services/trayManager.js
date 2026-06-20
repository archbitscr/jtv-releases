import { Tray, Menu, app } from 'electron';
import path from 'path';

export function createTrayManager(context) {
  let tray = null;
  let minimizeToTrayEnabled = false;

  return {
    init() {
      // Load initial config
      const persisted = context.services.userDataStore.load();
      minimizeToTrayEnabled = !!persisted?.minimizeToTray;

      // Icon path
      const iconPath = path.join(context.__dirname, 'assets', 'images', 'JTV.ico');
      try {
        tray = new Tray(iconPath);
        tray.setToolTip('JTV');

        const contextMenu = Menu.buildFromTemplate([
          {
            label: 'Mostrar JTV',
            click: () => {
              const win = context.windowManager.getMainWindow();
              if (win) {
                win.show();
                win.focus();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Salir',
            click: () => {
              app.isQuiting = true;
              app.quit();
            }
          }
        ]);

        tray.setContextMenu(contextMenu);

        tray.on('double-click', () => {
          const win = context.windowManager.getMainWindow();
          if (win) {
            win.show();
            win.focus();
          }
        });
      } catch (e) {
        console.error('Failed to create tray:', e);
      }
    },

    isMinimizeToTrayEnabled() {
      return minimizeToTrayEnabled;
    },

    setMinimizeToTray(enabled) {
      minimizeToTrayEnabled = !!enabled;
    },

    destroy() {
      if (tray) {
        tray.destroy();
        tray = null;
      }
    }
  };
}
