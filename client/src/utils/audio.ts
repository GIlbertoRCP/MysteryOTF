// Small synthesized sound effects. No audio files; everything is generated with WebAudio.

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    try {
      this.enabled = localStorage.getItem('dbs-sound') !== 'off';
    } catch {
      /* storage unavailable */
    }
  }

  private audio(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      localStorage.setItem('dbs-sound', on ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
  }

  private tone(freq: number, duration: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}) {
    const ctx = this.audio();
    if (!ctx) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
    gain.gain.setValueAtTime(opts.gain ?? 0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(duration: number, opts: { gain?: number; freq?: number; q?: number; delay?: number } = {}) {
    const ctx = this.audio();
    if (!ctx) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = opts.freq ?? 2000;
    filter.Q.value = opts.q ?? 0.8;
    const gain = ctx.createGain();
    gain.gain.value = opts.gain ?? 0.2;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);
  }

  pin() {
    this.tone(180, 0.09, { type: 'triangle', gain: 0.25, slideTo: 90 });
    this.noise(0.05, { gain: 0.15, freq: 3500 });
  }

  string() {
    this.tone(330, 0.35, { type: 'triangle', gain: 0.12, slideTo: 310 });
    this.tone(660, 0.2, { type: 'sine', gain: 0.05 });
  }

  paper() {
    this.noise(0.18, { gain: 0.12, freq: 4500, q: 0.5 });
  }

  radio() {
    this.tone(1400, 0.05, { type: 'square', gain: 0.03 });
    this.tone(1800, 0.05, { type: 'square', gain: 0.03, delay: 0.06 });
  }

  tick() {
    this.noise(0.02, { gain: 0.05, freq: 5000 });
  }

  wrong() {
    this.tone(160, 0.5, { type: 'sawtooth', gain: 0.07, slideTo: 110 });
  }

  solved() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.6, { type: 'triangle', gain: 0.1, delay: i * 0.12 }));
  }
}

export const soundFx = new SoundManager();
