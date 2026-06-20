export function createAudioState(initial = {}) {
  let volumeLevel = typeof initial.volumeLevel === 'number' ? initial.volumeLevel : 10;
  let audioLevelerEnabled = !!initial.audioLevelerEnabled;

  return {
    getVolumeLevel() {
      return volumeLevel;
    },
    setVolumeLevel(level) {
      volumeLevel = level;
    },
    getAudioLevelerEnabled() {
      return audioLevelerEnabled;
    },
    setAudioLevelerEnabled(enabled) {
      audioLevelerEnabled = !!enabled;
    }
  };
}

