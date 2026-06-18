import * as THREE from 'three';

// Projects each monolith's 3D position to screen space every frame and draws a
// telemetry tag joined to it by an SVG leader line. Tags fade with distance and
// hide when the anchor is behind the camera.
export class Hud {
  constructor(stage, anchors) {
    this.stage = stage;
    this.svg = document.getElementById('hud-lines');
    this.layer = document.getElementById('hud-layer');
    this._v = new THREE.Vector3();
    this.alpha = 0; // global fade, driven by scroll so tags peak at the monolith beat

    this.items = anchors.map((a, i) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('class', 'hud-line');
      this.svg.appendChild(line);

      const tag = document.createElement('div');
      tag.className = 'hud-tag';
      tag.innerHTML = `
        <span class="hud-tag__id">${a.label}</span>
        <span class="hud-tag__row"><i>STATUS</i><b>FROZEN</b></span>
        <span class="hud-tag__row"><i>INTEGRITY</i><b>100%</b></span>
      `;
      this.layer.appendChild(tag);

      return { object: a.object, line, tag, side: i % 2 === 0 ? -1 : 1 };
    });
  }

  // peak around the monolith beat (~0.25–0.65 of the page), fade out either side
  setProgress(p) {
    const up = Math.min(1, Math.max(0, (p - 0.12) / 0.18));
    const down = Math.min(1, Math.max(0, (0.72 - p) / 0.14));
    this.alpha = Math.min(up, down);
  }

  update() {
    const { camera, size } = this.stage;
    for (const it of this.items) {
      it.object.getWorldPosition(this._v);
      this._v.project(camera);
      const behind = this._v.z > 1;
      const x = (this._v.x * 0.5 + 0.5) * size.x;
      const y = (-this._v.y * 0.5 + 0.5) * size.y;

      if (this.alpha <= 0.01 || behind || x < 0 || x > size.x || y < 0 || y > size.y) {
        it.tag.style.opacity = '0';
        it.line.style.opacity = '0';
        continue;
      }

      const off = 150 * it.side;
      const tx = x + off;
      const ty = y - 60;
      it.line.setAttribute('points', `${x},${y} ${x + off * 0.4},${y - 30} ${tx},${ty}`);
      it.line.style.opacity = String(this.alpha);
      it.tag.style.transform = `translate(${tx - (it.side < 0 ? 130 : 0)}px, ${ty - 20}px)`;
      it.tag.style.opacity = String(0.92 * this.alpha);
    }
  }
}
