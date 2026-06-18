import * as THREE from 'three';
import { easeInOutCubic, damp } from '../lib/math.js';

// Drives the camera along a keyframed flight as scroll progress advances.
// Each beat has a camera position + look-at target; we ease between adjacent
// beats and add a small mouse-parallax offset on top.
const BEATS = [
  { pos: new THREE.Vector3(0, 4.2, 30), look: new THREE.Vector3(0, 2.4, 0) },   // 0 hero — wide
  { pos: new THREE.Vector3(-9, 3.0, 16), look: new THREE.Vector3(0, 2.0, 0) },  // 1 approach igloo
  { pos: new THREE.Vector3(7, 2.2, 9), look: new THREE.Vector3(-2, 2.4, -4) },  // 2 ice monoliths
  { pos: new THREE.Vector3(-3, 7.5, 16), look: new THREE.Vector3(0, 4.0, -4) }, // 3 rise & pull back
  { pos: new THREE.Vector3(0, 14.0, 16), look: new THREE.Vector3(0, 13.0, -6) },// 4 ascend into the cryosphere
];

export class CameraRig {
  constructor(stage) {
    this.stage = stage;
    this.camera = stage.camera;
    this.progress = 0;
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);

    this._pos = new THREE.Vector3().copy(BEATS[0].pos);
    this._look = new THREE.Vector3().copy(BEATS[0].look);
    this._tmpPos = new THREE.Vector3();
    this._tmpLook = new THREE.Vector3();

    window.addEventListener('pointermove', (e) => {
      this.mouseTarget.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1
      );
    });
  }

  setProgress(p) {
    this.progress = p;
  }

  update(t, dt) {
    // locate the segment between two beats
    const n = BEATS.length - 1;
    const f = this.progress * n;
    const i = Math.min(Math.floor(f), n - 1);
    const local = easeInOutCubic(f - i);
    const a = BEATS[i];
    const b = BEATS[i + 1];

    this._tmpPos.lerpVectors(a.pos, b.pos, local);
    this._tmpLook.lerpVectors(a.look, b.look, local);

    // smoothed mouse parallax
    this.mouse.x = damp(this.mouse.x, this.mouseTarget.x, 4, dt);
    this.mouse.y = damp(this.mouse.y, this.mouseTarget.y, 4, dt);
    this._tmpPos.x += this.mouse.x * 1.6;
    this._tmpPos.y += -this.mouse.y * 0.9;

    // gentle idle drift so it never feels frozen
    this._tmpPos.y += Math.sin(t * 0.4) * 0.12;

    this._pos.lerp(this._tmpPos, 1 - Math.exp(-6 * dt));
    this._look.lerp(this._tmpLook, 1 - Math.exp(-6 * dt));

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
  }
}
