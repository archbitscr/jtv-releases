import { state } from '../state/appState.js';

export function getActiveEpg(channelId) {
    const channelEvents = state.scheduleData.filter(s => String(s.id) === String(channelId));
    if (channelEvents.length === 0) return null;
    if (channelEvents.length === 1) return channelEvents[0];

    try {
        const ukTimeStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
        const currentMins = parseInt(ukTimeStr.split(':')[0]) * 60 + parseInt(ukTimeStr.split(':')[1]);
        
        let activeEpg = null;
        let minDiff = Infinity;
        
        channelEvents.forEach(e => {
            if (!e.time) return;
            const parts = e.time.split(':');
            if (parts.length !== 2) return;
            const eventMins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            
            let diff = currentMins - eventMins;
            if (diff < -720) diff += 1440; // Midnight wrap around
            
            if (diff >= 0 && diff < minDiff) {
                minDiff = diff;
                activeEpg = e;
            }
        });
        
        if (!activeEpg) {
            let upcomingDiff = Infinity;
            channelEvents.forEach(e => {
                if (!e.time) return;
                const parts = e.time.split(':');
                const eventMins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                let diff = eventMins - currentMins;
                if (diff < -720) diff += 1440;
                
                if (diff > 0 && diff < upcomingDiff) {
                    upcomingDiff = diff;
                    activeEpg = e;
                }
            });
        }
        return activeEpg || channelEvents[0];
    } catch (e) {
        return channelEvents[0];
    }
}
