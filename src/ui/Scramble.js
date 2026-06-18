// Glitch/decode effect: scrambles through random glyphs before resolving to
// the target text. Attaches a controller to each element as `el._scramble`.
const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';

class Scramble {
  constructor(el) {
    this.el = el;
    this.text = el.dataset.scramble ?? el.textContent;
    this.frame = 0;
    this.raf = 0;
  }

  play(delay = 0) {
    cancelAnimationFrame(this.raf);
    const text = this.text;
    const queue = [];
    for (let i = 0; i < text.length; i++) {
      const start = delay + Math.floor(Math.random() * 18) + i * 1.2;
      const end = start + Math.floor(Math.random() * 18) + 8;
      queue.push({ char: text[i], start, end, rnd: '' });
    }
    this.frame = 0;
    const tick = () => {
      let out = '';
      let done = 0;
      for (const q of queue) {
        if (this.frame >= q.end) {
          done++;
          out += q.char;
        } else if (this.frame >= q.start) {
          if (!q.rnd || Math.random() < 0.28) {
            q.rnd = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          out += `<span class="scramble__g">${q.rnd}</span>`;
        } else {
          out += q.char === ' ' ? ' ' : '';
        }
      }
      this.el.innerHTML = out;
      this.frame++;
      if (done < queue.length) this.raf = requestAnimationFrame(tick);
      else this.el.textContent = text;
    };
    tick();
  }
}

export function scrambleAll(root = document, { stagger = 3 } = {}) {
  const els = [...root.querySelectorAll('[data-scramble]')];
  els.forEach((el, i) => {
    const s = new Scramble(el);
    el._scramble = s;
    s.play(i * stagger);
  });
}
