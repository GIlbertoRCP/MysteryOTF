// Audio utilities disabled per configuration
class SoundManager {
  toggleSound() { return false; }
  isSoundEnabled() { return false; }
  playPinDrop() {}
  playRadioChirp() {}
  playTypewriterTick() {}
  playStringConnect() {}
  playPaperRustle() {}
  toggleRainAmbient() { return false; }
  startRainAmbient() {}
  stopRainAmbient() {}
  toggleJazzAmbient() { return false; }
  startJazzAmbient() {}
  stopJazzAmbient() {}
  playAccusationGong() {}
}

export const soundFx = new SoundManager();
