// Synthesized cold ambient bed (no audio files). Layered low drones + a slow
// filtered noise "wind" sweep, built with the Web Audio API. Toggled on first
// user gesture per browser autoplay policy.
export class Ambient {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.on = false;
  }

  _build() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const master = (this.master = ctx.createGain());
    master.gain.value = 0;
    master.connect(ctx.destination);

    // two detuned drones a fifth apart
    [55, 82.4].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.18 : 0.12;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(g).connect(master);
      osc.start();
      lfo.start();
    });

    // wind: white noise through a slowly sweeping bandpass
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 480;
    bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.value = 0.06;
    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.05;
    const sweepGain = ctx.createGain();
    sweepGain.gain.value = 300;
    sweep.connect(sweepGain).connect(bp.frequency);
    noise.connect(bp).connect(ng).connect(master);
    noise.start();
    sweep.start();
  }

  async toggle() {
    if (!this.ctx) this._build();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.on = !this.on;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(this.on ? 0.6 : 0.0001, now + 1.2);
    return this.on;
  }
}
