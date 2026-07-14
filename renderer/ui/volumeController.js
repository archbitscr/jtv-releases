import { state } from '../state/appState.js';
import { saveAppState } from '../services/stateManager.js';
import { t } from '../i18n/i18n.js';

export function showVolumeHUD(level, isMuted) {
    const isChannelPlaying = !!state.activeChannelId;
    if (!isChannelPlaying) return;

    const hud = document.getElementById('volosd-indicator');
    const bar = document.getElementById('volosd-bar');
    const text = document.getElementById('volosd-text');
    const icon = document.getElementById('volosd-icon');
    
    if (!hud || !bar || !text || !icon) return;
    
    if (window.timeouts) {
        window.timeouts.clear('volumeIndicator');
    }
    
    if (isMuted) {
        text.textContent = t('player.muted', 'Muted');
        bar.style.width = "0%";
        icon.setAttribute('data-lucide', 'volume-x');
    } else {
        text.textContent = `${level * 10}%`;
        bar.style.width = `${level * 10}%`;
        if (level === 0) {
            icon.setAttribute('data-lucide', 'volume-x');
        } else if (level < 4) {
            icon.setAttribute('data-lucide', 'volume');
        } else if (level < 8) {
            icon.setAttribute('data-lucide', 'volume-1');
        } else {
            icon.setAttribute('data-lucide', 'volume-2');
        }
    }
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
    hud.classList.remove('hidden');
    
    if (window.timeouts) {
        window.timeouts.set('volumeIndicator', () => {
            hud.classList.add('hidden');
        }, 1500);
    }
}

export async function adjustVolume(change) {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    const currentlyMuted = await nativeApi.isAudioMuted();
    let newVolume = state.currentVolumeLevel + change;
    newVolume = Math.max(0, Math.min(10, newVolume));
    
    if (newVolume === 0) {
        state.currentVolumeLevel = 0;
        await nativeApi.setAudioMuted(true);
    } else {
        if (currentlyMuted) {
            await nativeApi.setAudioMuted(false);
        }
        state.currentVolumeLevel = newVolume;
        state.lastVolumeLevelBeforeMute = state.currentVolumeLevel;
    }
    
    updateVolumeUI();
    nativeApi.broadcastVolume(state.currentVolumeLevel);
    saveAppState();
}

export async function toggleMute() {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    const currentlyMuted = await nativeApi.isAudioMuted();
    if (currentlyMuted) {
        if (state.currentVolumeLevel === 0) {
            state.currentVolumeLevel = 10;
        } else if (state.lastVolumeLevelBeforeMute > 0) {
            state.currentVolumeLevel = state.lastVolumeLevelBeforeMute;
        } else {
            state.currentVolumeLevel = 10;
        }
        await nativeApi.setAudioMuted(false);
        nativeApi.broadcastVolume(state.currentVolumeLevel);
    } else {
        if (state.currentVolumeLevel > 0) {
            state.lastVolumeLevelBeforeMute = state.currentVolumeLevel;
        }
        await nativeApi.setAudioMuted(true);
    }
    updateVolumeUI();
    saveAppState();
}

export function updateVolumeUI() {
    const nativeApi = window.jtvAPI;
    if (!nativeApi) return;
    const tunerMuteBtn = document.getElementById('pbar-mute');
    const tunerMuteIcon = document.getElementById('pbar-mute-icon');
    
    nativeApi.isAudioMuted().then(isMuted => {
        if (tunerMuteBtn) {
            tunerMuteBtn.classList.toggle('active', isMuted);
        }
        if (tunerMuteIcon) {
            if (state.currentVolumeLevel === 0) {
                tunerMuteIcon.setAttribute('data-lucide', 'volume-x');
            } else {
                tunerMuteIcon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
            }
            if (window.lucide) window.lucide.createIcons();
        }
        showVolumeHUD(state.currentVolumeLevel, isMuted);
    });
}
