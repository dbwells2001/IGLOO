// Procedural cold-ambient bed: a detuned drone + filtered wind noise.
// Built lazily on first user gesture (autoplay policy compliant).
export class Ambient {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.on = false;
  }

  _build() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // Drone: two slightly detuned low oscillators through a gentle lowpass.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 420;
    droneFilter.Q.value = 4;
    droneFilter.connect(master);

    [55, 82.41, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.06 : 0.12;
      o.connect(g).connect(droneFilter);
      o.start();
    });

    // Slow filter sweep LFO for movement.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(droneFilter.frequency);
    lfo.start();

    // Wind: white noise through a resonant bandpass that drifts.
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 600;
    windFilter.Q.value = 0.8;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    noise.connect(windFilter).connect(windGain).connect(master);
    noise.start();

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.08;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 400;
    windLfo.connect(windLfoGain).connect(windFilter.frequency);
    windLfo.start();
  }

  async toggle() {
    if (!this.ctx) this._build();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.on = !this.on;
    const now = this.ctx.currentTime;
    const target = this.on ? 0.5 : 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(target, now + 1.2);
    return this.on;
  }
}
