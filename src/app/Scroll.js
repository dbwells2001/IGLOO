import Lenis from 'lenis';
import { clamp } from '../lib/math.js';

// Wraps Lenis smooth scroll and exposes normalized progress [0..1] across the
// whole page plus a smoothed scroll velocity (used to drive FX).
export class Scroll {
  constructor() {
    this.lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
    });
    this.progress = 0;
    this.velocity = 0;
    this.listeners = new Set();

    this.lenis.on('scroll', ({ scroll, limit, velocity }) => {
      this.progress = limit > 0 ? clamp(scroll / limit) : 0;
      this.velocity = velocity || 0;
      for (const fn of this.listeners) fn(this.progress, this.velocity);
    });
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  scrollTo(target, opts) {
    this.lenis.scrollTo(target, opts);
  }

  raf(timeMs) {
    this.lenis.raf(timeMs);
  }
}
