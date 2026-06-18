import * as THREE from 'three';
import { Post } from '../fx/Post.js';

// Stage owns the renderer, scene, camera, post pipeline and the render loop.
// Actors register an update(time, dt) callback via stage.onTick().
export class Stage {
  constructor(mount) {
    // `mount` may be a <canvas> or a container element to create one inside.
    if (mount instanceof HTMLCanvasElement) {
      this.canvas = mount;
    } else {
      this.canvas = document.createElement('canvas');
      mount.appendChild(this.canvas);
    }
    const canvas = this.canvas;
    this.clock = new THREE.Clock();
    this.ticks = new Set();
    this.size = new THREE.Vector2();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.FogExp2(0x070b14, 0.018);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 600);
    this.camera.position.set(0, 4, 26);

    this.post = new Post(this);

    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  onTick(fn) {
    this.ticks.add(fn);
    return () => this.ticks.delete(fn);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.size.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h, this.dpr);
  }

  start() {
    this.renderer.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    const t = this.clock.elapsedTime;
    for (const fn of this.ticks) fn(t, dt);
    this.post.render(dt);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}
