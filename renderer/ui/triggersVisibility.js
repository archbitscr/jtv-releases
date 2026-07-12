import { state } from '../state/appState.js';

export function updateTriggersVisibility() {
    const triggerLeft = document.getElementById('trigger-left');
    const triggerBottom = document.getElementById('trigger-bottom');
    const triggerRight = document.getElementById('trigger-right');

    const showTriggers = (state.currentModule === 'live' && state.activeChannelId);
    const triggers = [triggerLeft, triggerBottom, triggerRight];
    triggers.forEach(t => {
        if (t) {
            if (showTriggers) {
                t.classList.remove('hidden');
            } else {
                t.classList.add('hidden');
            }
        }
    });
}
