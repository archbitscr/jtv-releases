import { startDiagnosticsWatchers } from './watchers.js';

export function createDiagnosticsController(context) {
  let stopWatchers = null;

  function start() {
    if (stopWatchers) return;
    stopWatchers = startDiagnosticsWatchers(context);
  }

  function stop() {
    if (!stopWatchers) return;
    stopWatchers();
    stopWatchers = null;
  }

  function isRunning() {
    return !!stopWatchers;
  }

  return { start, stop, isRunning };
}

