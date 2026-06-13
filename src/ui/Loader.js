import { Scramble } from './Scramble.js';
import { damp } from '../utils/math.js';

const MESSAGES = [
  'INITIALIZING SYSTEM',
  'CALIBRATING CRYOSPHERE',
  'COMPILING SHADERS',
  'SEEDING STARFIELD',
  'ENTERING',
];

export class Loader {
  constructor() {
    this.el = document.getElementById('loader');
    this.bar = this.el.querySelector('.loader__bar i');
    this.pct = this.el.querySelector('.loader__pct');
    this.status = this.el.querySelector('.loader__status');
    this.markScramble = new Scramble(this.el.querySelector('.loader__mark-text'));
    this.statusScramble = new Scramble(this.status);
    this._shown = 0;
    this._target = 0.08;
    this._done = false;
    this._msg = 0;
    this._last = performance.now();
  }

  start() {
    this.markScramble.play(80);
    this._cycleMessages();
    this._target = 0.9;
    this._raf = requestAnimationFrame(this._tick);
  }

  _cycleMessages() {
    this._msgTimer = setInterval(() => {
      if (this._done) return;
      this._msg = Math.min(this._msg + 1, MESSAGES.length - 2);
      this.status.dataset.scramble = MESSAGES[this._msg];
      this.statusScramble.final = MESSAGES[this._msg];
      this.statusScramble.play(0);
    }, 620);
  }

  _tick = () => {
    const now = performance.now();
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    this._shown = damp(this._shown, this._target, 3.2, dt);
    const v = Math.round(this._shown * 100);
    this.bar.style.width = `${this._shown * 100}%`;
    this.pct.textContent = v;
    if (this._done && this._shown > 0.997) {
      this.pct.textContent = 100;
      this.bar.style.width = '100%';
      return;
    }
    this._raf = requestAnimationFrame(this._tick);
  };

  async complete() {
    clearInterval(this._msgTimer);
    this.status.dataset.scramble = MESSAGES[MESSAGES.length - 1];
    this.statusScramble.final = MESSAGES[MESSAGES.length - 1];
    this.statusScramble.play(0);
    this._target = 1;
    this._done = true;
    await new Promise((r) => setTimeout(r, 700));
    this.el.classList.add('is-done');
    await new Promise((r) => setTimeout(r, 1000));
    this.el.style.display = 'none';
  }
}
