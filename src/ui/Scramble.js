const GLYPHS = '▚▞ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\\<>#*+={}—';

// Decode-style text scramble. Each char resolves to its final glyph after a
// short randomized delay, with noise glyphs flickering in the meantime.
export class Scramble {
  constructor(el, { speed = 1 } = {}) {
    this.el = el;
    this.final = el.dataset.scramble ?? el.textContent;
    this.speed = speed;
    this.frame = 0;
    this.raf = null;
    this.queue = [];
    this.resolveDone = null;
  }

  play(delay = 0) {
    if (delay > 0) {
      clearTimeout(this._t);
      return new Promise((res) => {
        this._t = setTimeout(() => this.play(0).then(res), delay);
      });
    }
    const text = this.final;
    const old = this.el.textContent;
    const len = Math.max(old.length, text.length);
    this.queue.length = 0;
    for (let i = 0; i < len; i++) {
      const from = old[i] || '';
      const to = text[i] || '';
      const start = Math.floor(Math.random() * 22 * this.speed);
      const end = start + Math.floor(Math.random() * 26 * this.speed) + 6;
      this.queue.push({ from, to, start, end, char: '' });
    }
    cancelAnimationFrame(this.raf);
    this.frame = 0;
    return new Promise((res) => {
      this.resolveDone = res;
      this.tick();
    });
  }

  tick = () => {
    let out = '';
    let done = 0;
    for (const q of this.queue) {
      if (this.frame >= q.end) {
        done++;
        out += q.to;
      } else if (this.frame >= q.start) {
        if (!q.char || Math.random() < 0.3) {
          q.char = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        out += `<span style="opacity:.55;color:var(--cyan)">${q.char}</span>`;
      } else {
        out += q.from;
      }
    }
    this.el.innerHTML = out;
    if (done === this.queue.length) {
      this.el.textContent = this.final;
      this.resolveDone?.();
      return;
    }
    this.frame++;
    this.raf = requestAnimationFrame(this.tick);
  };
}

// Convenience: scramble every [data-scramble] inside a root, staggered.
export function scrambleAll(root = document, { stagger = 60, speed = 1 } = {}) {
  const els = [...root.querySelectorAll('[data-scramble]')];
  els.forEach((el, i) => {
    const s = new Scramble(el, { speed });
    s.play(i * stagger);
    el._scramble = s;
  });
}
