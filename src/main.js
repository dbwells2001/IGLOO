import './styles/main.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';

import { App } from './app/App.js';
import { Loader } from './ui/Loader.js';
import { scrambleAll } from './ui/Scramble.js';
import { Ambient } from './audio/Ambient.js';
import { clamp } from './lib/math.js';

let app;

// Run once the DOM is ready. (The single-file build inlines this script into
// <head> as a classic script, so we can't rely on module-defer timing.)
function init() {
  const loader = new Loader();
  loader.start();

  try {
    app = new App(document.getElementById('webgl'));
    window.__IGLOO = app;
  } catch (err) {
    console.error(err);
    const status = document.querySelector('.loader__status');
    if (status) status.textContent = 'WEBGL UNAVAILABLE';
  }

  boot(loader);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function boot(loader) {
  if (!app) return;
  await app.ready;
  await wait(400);
  await loader.complete();
  revealUI();
  wireNav();
  wireSound();
}

function revealUI() {
  document.getElementById('ui').classList.add('is-ready');
  scrambleAll(document, { stagger: 2 });

  document.querySelectorAll('.nav__link, .biglink').forEach((el) => {
    el.addEventListener('mouseenter', () => el._scramble && el._scramble.play(0));
  });

  // section index + scroll hint react to progress
  const cur = document.querySelector('.index__cur');
  const hint = document.getElementById('scrollhint');
  const hero = document.querySelector('.hero');
  app.scroll.onChange((p) => {
    const idx = clamp(Math.floor(p * 5) + 1, 1, 5);
    cur.textContent = String(idx).padStart(2, '0');
    hint.classList.toggle('is-hidden', p > 0.02);
    if (hero) {
      hero.style.opacity = String(clamp(1 - p * 8));
      hero.style.transform = `translateY(${(-p * 140).toFixed(1)}px)`;
    }
  });
}

function wireNav() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('href');
      const h = document.body.scrollHeight;
      if (id === '#portfolio') app.scroll.scrollTo(h * 0.45, { duration: 2.2 });
      else app.scroll.scrollTo(h, { duration: 2.6 });
    });
  });
}

function wireSound() {
  const ambient = new Ambient();
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;
  const state = btn.querySelector('.nav__sound-state');
  btn.addEventListener('click', async () => {
    const on = await ambient.toggle();
    btn.classList.toggle('is-on', on);
    state.innerHTML = on ? '&nbsp;ON' : '&nbsp;OFF';
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
