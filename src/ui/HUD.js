import * as THREE from 'three';
import { clamp } from '../utils/math.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DATA = [
  { id: 'PORTFOLIO_CO_01', title: 'CRYO VAULT', coord: 'D 01.02.2026', temp: 28.42 },
  { id: 'PORTFOLIO_CO_02', title: 'GLACIER NODE', coord: 'D 02.14.2026', temp: -12.08 },
  { id: 'PORTFOLIO_CO_03', title: 'AURORA MINT', coord: 'D 03.30.2026', temp: 41.77 },
];

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

export class HUD {
  constructor(blocks) {
    this.blocks = blocks;
    this.layer = document.getElementById('hud-layer');
    this.svg = document.getElementById('hud-lines');
    this._v = new THREE.Vector3();
    this.items = [];
    this._size();
    window.addEventListener('resize', () => this._size());
    this._build();
  }

  _size() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.svg.setAttribute('width', this.W);
    this.svg.setAttribute('height', this.H);
    this.svg.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
  }

  _build() {
    this.blocks.forEach((b, i) => {
      const d = DATA[i % DATA.length];
      const side = i % 2 === 0 ? 1 : -1;

      const cross = svg('g');
      cross.appendChild(svg('circle', { r: 5 }));
      cross.appendChild(svg('line', { x1: -11, y1: 0, x2: -5, y2: 0 }));
      cross.appendChild(svg('line', { x1: 5, y1: 0, x2: 11, y2: 0 }));
      cross.appendChild(svg('line', { x1: 0, y1: -11, x2: 0, y2: -5 }));
      cross.appendChild(svg('line', { x1: 0, y1: 5, x2: 0, y2: 11 }));
      const leader = svg('polyline');
      this.svg.appendChild(leader);
      this.svg.appendChild(cross);

      const readout = document.createElement('div');
      readout.className = 'tag tag--readout';
      readout.innerHTML = `
        <span><b>${d.id}</b></span>
        <span>TEMP <b class="t">${d.temp.toFixed(2)}</b>°</span>
        <span>${d.coord}</span>`;

      const label = document.createElement('div');
      label.className = 'tag tag--label';
      label.textContent = d.title;

      const cta = document.createElement('div');
      cta.className = 'tag tag--cta';
      cta.textContent = `CLICK TO EXPLORE [0${i + 1}]`;

      this.layer.append(readout, label, cta);

      this.items.push({ b, cross, leader, readout, label, cta, side, temp: d.temp });
    });
  }

  update(camera, time) {
    const W = this.W;
    const H = this.H;
    for (const it of this.items) {
      this._v.copy(it.b.group.position);
      this._v.y += 1.2;
      this._v.project(camera);

      const behind = this._v.z > 1;
      const x = (this._v.x * 0.5 + 0.5) * W;
      const y = (-this._v.y * 0.5 + 0.5) * H;

      const dist = camera.position.distanceTo(it.b.group.position);
      let vis = clamp((70 - dist) / 26) * clamp((dist - 6) / 8);
      if (behind || x < -80 || x > W + 80) vis = 0;

      const op = vis.toFixed(3);
      it.cross.style.opacity = op;
      it.leader.style.opacity = op;
      it.readout.style.opacity = op;
      it.label.style.opacity = op;
      it.cta.style.opacity = op;
      if (vis < 0.01) continue;

      it.cross.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      it.cross.style.transform = `rotate(${(time * 12).toFixed(1)}deg)`;
      it.cross.style.transformOrigin = `${x}px ${y}px`;

      const dx = it.side * Math.min(W * 0.18, 230);
      const bx = x + dx;
      const by = y - 70;
      this._place(it.readout, bx, by);
      this._place(it.label, bx, by + 56);
      this._place(it.cta, bx, by + 92);

      const elbowX = x + dx * 0.4;
      it.leader.setAttribute(
        'points',
        `${x},${y} ${elbowX},${y} ${bx - it.side * 4},${by}`
      );

      const tEl = it.readout.querySelector('.t');
      if (tEl) tEl.textContent = (it.temp + Math.sin(time * 1.3 + it.b.index) * 0.6).toFixed(2);
    }
  }

  _place(el, x, y) {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
}
