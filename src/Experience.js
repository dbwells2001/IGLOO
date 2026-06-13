import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import Lenis from 'lenis';

import { Sky } from './world/Sky.js';
import { Snowfield } from './world/Snowfield.js';
import { Igloo } from './world/Igloo.js';
import { IceBlocks } from './world/IceBlocks.js';
import { Particles } from './world/Particles.js';
import { PostFX } from './postprocessing/PostFX.js';
import { HUD } from './ui/HUD.js';
import { clamp, lerp, smoothstep } from './utils/math.js';

const FOG_COLOR = 0x070b12;
const FOG_DENSITY = 0.011;

// Cinematic flight: position + look-at per scroll keyframe.
const KF = [
  { pos: [0, 3.2, 17], tgt: [0, 2.2, 0] },
  { pos: [-6, 2.6, 8], tgt: [0, 2.0, -3] },
  { pos: [5, 2.6, -30], tgt: [3, 2.2, -45] },
  { pos: [-5, 2.6, -66], tgt: [-3, 2.2, -80] },
  { pos: [5, 2.8, -101], tgt: [3, 2.6, -115] },
  { pos: [0, 4.0, -138], tgt: [0, 3.6, -158] },
];

const BLOCK_POS = [
  { x: 3, y: 2.2, z: -45 },
  { x: -3, y: 2.2, z: -80 },
  { x: 3, y: 2.6, z: -115 },
];

const PARTICLE_POS = new THREE.Vector3(0, 4, -160);

export class Experience {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.progress = 0;
    this.velocity = 0;
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this._firstFrame = false;

    this._initRenderer();
    this._initScene();
    this._initWorld();
    this._initScroll();
    this._initInput();

    this.post = new PostFX(this.renderer, this.scene, this.camera);
    this.post.setSize(this.size.w, this.size.h);
    this.hud = new HUD(this.iceBlocks.blocks);

    this.ready = new Promise((res) => (this._resolveReady = res));
    window.addEventListener('resize', () => this._resize());
    this.renderer.setAnimationLoop(this._loop);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.size = { w: window.innerWidth, h: window.innerHeight };
    this.renderer.setSize(this.size.w, this.size.h);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x05070d, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);

    this.camera = new THREE.PerspectiveCamera(
      46,
      this.size.w / this.size.h,
      0.1,
      1200
    );
    this.camera.position.set(...KF[0].pos);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const hemi = new THREE.HemisphereLight(0x9fc6ff, 0x0a0f18, 0.55);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xbfe6ff, 0.5);
    key.position.set(-8, 14, 6);
    this.scene.add(key);
  }

  _initWorld() {
    this.sky = new Sky();
    this.sky.setPixelRatio(this.pixelRatio);
    this.scene.add(this.sky.group);

    this.snow = new Snowfield({ fogColor: FOG_COLOR, fogDensity: FOG_DENSITY });
    this.scene.add(this.snow.mesh);

    this.igloo = new Igloo({ fogColor: FOG_COLOR, fogDensity: FOG_DENSITY });
    this.scene.add(this.igloo.group);

    this.iceBlocks = new IceBlocks(BLOCK_POS);
    this.scene.add(this.iceBlocks.group);

    this.particles = new Particles({ position: PARTICLE_POS });
    this.particles.group.rotation.x = Math.PI / 2; // face the camera
    this.particles.setPixelRatio(this.pixelRatio);
    this.scene.add(this.particles.group);

    // For mouse->galaxy projection.
    this._galaxyPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PARTICLE_POS.z);
    this._raycaster = new THREE.Raycaster();
    this._hit = new THREE.Vector3();
  }

  _initScroll() {
    this.lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, touchMultiplier: 1.4 });
    this.lenis.on('scroll', (e) => {
      this.progress = clamp(e.progress || 0);
      this.velocity = e.velocity || 0;
    });
  }

  _initInput() {
    window.addEventListener('pointermove', (e) => {
      this.mouseTarget.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1)
      );
    });
  }

  _resize() {
    this.size = { w: window.innerWidth, h: window.innerHeight };
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.camera.aspect = this.size.w / this.size.h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.size.w, this.size.h);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.post.setSize(this.size.w, this.size.h);
    this.sky.setPixelRatio(this.pixelRatio);
    this.particles.setPixelRatio(this.pixelRatio);
  }

  _updateCamera(time) {
    const span = KF.length - 1;
    const seg = this.progress * span;
    const i = clamp(Math.floor(seg), 0, span - 1);
    const f = smoothstep(0, 1, seg - i);
    const a = KF[i];
    const b = KF[i + 1];

    // Mouse parallax + gentle idle sway.
    this.mouse.x = lerp(this.mouse.x, this.mouseTarget.x, 0.04);
    this.mouse.y = lerp(this.mouse.y, this.mouseTarget.y, 0.04);
    const swayX = Math.sin(time * 0.25) * 0.35 + this.mouse.x * 1.4;
    const swayY = Math.cos(time * 0.2) * 0.2 + this.mouse.y * 0.8;

    this.camera.position.set(
      lerp(a.pos[0], b.pos[0], f) + swayX,
      lerp(a.pos[1], b.pos[1], f) + swayY,
      lerp(a.pos[2], b.pos[2], f)
    );
    this._tgt = this._tgt || new THREE.Vector3();
    this._tgt.set(
      lerp(a.tgt[0], b.tgt[0], f) + swayX * 0.3,
      lerp(a.tgt[1], b.tgt[1], f) + swayY * 0.3,
      lerp(a.tgt[2], b.tgt[2], f)
    );
    this.camera.lookAt(this._tgt);
  }

  _updateParticles(time) {
    const reveal = smoothstep(0.72, 0.92, this.progress);
    this.particles.uniforms.uReveal.value = reveal;
    this.particles.uniforms.uMorph.value =
      (0.5 + 0.5 * Math.sin(time * 0.13)) * 0.45 * reveal;
    this.particles.update(time);

    // Project mouse onto the galaxy plane for repulsion.
    if (reveal > 0.05) {
      this._raycaster.setFromCamera(this.mouseTarget, this.camera);
      if (this._raycaster.ray.intersectPlane(this._galaxyPlane, this._hit)) {
        this.particles.uniforms.uMouse.value.copy(this._hit);
      }
    } else {
      this.particles.uniforms.uMouse.value.set(999, 999, 999);
    }
  }

  _loop = () => {
    const time = this.clock.getElapsedTime();
    this.lenis.raf(performance.now());

    this._updateCamera(time);
    this.sky.group.position.copy(this.camera.position);
    this.sky.update(time);
    this.snow.update(time);
    this.igloo.update(time);
    this.iceBlocks.update(time);
    this._updateParticles(time);
    this.hud.update(this.camera, time);

    this.post.setTransition(this.velocity);
    this.post.render(time);

    if (!this._firstFrame) {
      this._firstFrame = true;
      this._resolveReady();
    }
  };
}
