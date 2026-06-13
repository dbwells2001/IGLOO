import './style.css';
import { Experience } from './Experience.js';
import { Loader } from './ui/Loader.js';
import { scrambleAll } from './ui/Scramble.js';
import { Ambient } from './audio/Ambient.js';
import { clamp } from './utils/math.js';

const loader = new Loader();
loader.start();

let exp;
try {
  exp = new Experience(document.getElementById('webgl'));
} catch (err) {
  console.error(err);
  document.querySelector('.loader__status').textContent = 'WEBGL UNAVAILABLE';
}

if (exp) window.__IGLOO = exp;

boot();

async function boot() {
  if (!exp) return;
  await exp.ready;
  await wait(500);
  await loader.complete();
  revealUI();
  wireScroll();
  wireSound();
}

function revealUI() {
  const ui = document.getElementById('ui');
  ui.classList.add('is-ready');
  // Decode every label across chrome, hero and finale.
  scrambleAll(document, { stagger: 45, speed: 1 });

  // Hover re-decode for links.
  document.querySelectorAll('.nav__link, .biglink').forEach((el) => {
    el.addEventListener('mouseenter', () => el._scramble && el._scramble.play(0));
  });
}

function wireScroll() {
  const cur = document.querySelector('.index__cur');
  const hint = document.getElementById('scrollhint');
  const hero = document.querySelector('.hero');

  const onScroll = ({ progress = 0 } = {}) => {
    const p = clamp(progress);
    const idx = clamp(Math.floor(p * 5) + 1, 1, 5);
    cur.textContent = String(idx).padStart(2, '0');
    hint.classList.toggle('is-hidden', p > 0.015);
    if (hero) {
      hero.style.opacity = String(clamp(1 - p * 7));
      hero.style.transform = `translateY(${(-p * 120).toFixed(1)}px)`;
    }
  };
  exp.lenis.on('scroll', onScroll);
  onScroll({ progress: 0 });

  // Nav anchors via smooth scroll.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#portfolio') {
        e.preventDefault();
        exp.lenis.scrollTo(document.body.scrollHeight * 0.42, { duration: 2.2 });
      } else if (id === '#connect' || id === '#') {
        e.preventDefault();
        exp.lenis.scrollTo(document.body.scrollHeight, { duration: 2.6 });
      }
    });
  });
}

function wireSound() {
  const ambient = new Ambient();
  const btn = document.getElementById('sound-toggle');
  const state = btn.querySelector('.nav__sound-state');
  btn.addEventListener('click', async () => {
    const on = await ambient.toggle();
    btn.classList.toggle('is-on', on);
    state.textContent = on ? 'ON' : 'OFF';
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
