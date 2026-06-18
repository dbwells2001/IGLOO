// Premium loading screen. There are no real assets to load, so it animates a
// believable boot progress and resolves once the experience signals ready.
export class Loader {
  constructor() {
    this.el = document.getElementById('loader');
    this.bar = this.el.querySelector('.loader__bar > i');
    this.pct = this.el.querySelector('.loader__pct');
    this.value = 0;
    this.target = 0;
    this.raf = 0;
  }

  start() {
    // creep toward 90% while the scene warms up
    const tick = () => {
      this.target = Math.min(90, this.target + Math.random() * 6);
      this.value += (this.target - this.value) * 0.12;
      this._paint();
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  _paint() {
    const v = Math.round(this.value);
    this.bar.style.transform = `scaleX(${this.value / 100})`;
    if (this.pct) this.pct.textContent = String(v).padStart(3, '0');
  }

  async complete() {
    cancelAnimationFrame(this.raf);
    // run to 100
    await new Promise((res) => {
      const finish = () => {
        this.value += (100 - this.value) * 0.2;
        this._paint();
        if (100 - this.value < 0.5) {
          this.value = 100;
          this._paint();
          res();
        } else requestAnimationFrame(finish);
      };
      finish();
    });
    await new Promise((r) => setTimeout(r, 350));
    this.el.classList.add('is-done');
    await new Promise((r) => setTimeout(r, 900));
    this.el.style.display = 'none';
  }
}
