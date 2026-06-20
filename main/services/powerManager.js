import { powerSaveBlocker } from 'electron';

export function createPowerManager(context) {
  let blockerId = null;
  let preventSleepEnabled = false;

  return {
    init() {
      const persisted = context.services.userDataStore.load();
      preventSleepEnabled = !!persisted?.preventSleep;
      this.updateBlocker();
    },

    isPreventSleepEnabled() {
      return preventSleepEnabled;
    },

    setPreventSleep(enabled) {
      preventSleepEnabled = !!enabled;
      this.updateBlocker();
    },

    updateBlocker() {
      if (preventSleepEnabled) {
        if (blockerId === null) {
          try {
            // 'prevent-display-sleep' blocks screen and system sleep
            blockerId = powerSaveBlocker.start('prevent-display-sleep');
          } catch (e) {
            console.error('Failed to start powerSaveBlocker:', e);
          }
        }
      } else {
        if (blockerId !== null) {
          try {
            powerSaveBlocker.stop(blockerId);
          } catch (e) {
            console.error('Failed to stop powerSaveBlocker:', e);
          }
          blockerId = null;
        }
      }
    }
  };
}
