import * as THREE from 'three';
import { Sky } from './Sky.js';
import { Terrain } from './Terrain.js';
import { Igloo } from './Igloo.js';
import { Monoliths } from './Monoliths.js';
import { Snow } from './Snow.js';
import { Finale } from './Finale.js';

// Assembles every actor and fans scroll/tick updates out to them.
export class World {
  constructor(stage) {
    this.stage = stage;

    // cold key + cool fill so the physical-material monoliths read properly
    const ambient = new THREE.AmbientLight(0x33415e, 1.4);
    const key = new THREE.DirectionalLight(0xbfd4ff, 1.1);
    key.position.set(-8, 14, 6);
    const fill = new THREE.DirectionalLight(0x4060a0, 0.5);
    fill.position.set(10, 6, -8);
    stage.scene.add(ambient, key, fill);

    this.sky = new Sky(stage);
    this.terrain = new Terrain(stage);
    this.igloo = new Igloo(stage);
    this.monoliths = new Monoliths(stage);
    this.snow = new Snow(stage);
    this.finale = new Finale(stage);
  }

  get anchors() {
    return this.monoliths.anchors;
  }

  setProgress(p) {
    this.finale.setProgress(p);
  }

  update(t, dt) {
    this.sky.update(t);
    this.terrain.update(t);
    this.igloo.update(t);
    this.monoliths.update(t);
    this.snow.update(t);
    this.finale.update(t, dt);
  }
}
