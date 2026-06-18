import * as THREE from 'three';
import { TAU } from '../lib/math.js';

// Three faceted frosted-ice slabs floating over the plain, each encasing a
// glowing core. Real transmission/refraction via MeshPhysicalMaterial.
const SPECS = [
  { pos: [-6, 3.2, -3], rot: 0.4, core: 0x7fe9ff, label: 'CRYO·01' },
  { pos: [-1.5, 4.4, -7], rot: -0.7, core: 0xa9b8ff, label: 'CRYO·02' },
  { pos: [4.5, 3.6, -4], rot: 1.1, core: 0x8affd6, label: 'CRYO·03' },
];

export class Monoliths {
  constructor(stage) {
    this.group = new THREE.Group();
    this.items = [];

    // a faceted shape reads more "ice crystal" than a plain box
    const geo = new THREE.IcosahedronGeometry(1.6, 0);
    geo.scale(1.0, 1.7, 1.0);

    for (const spec of SPECS) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xcfe9ff,
        roughness: 0.18,
        metalness: 0,
        transmission: 1.0,
        thickness: 2.2,
        ior: 1.31, // ice
        attenuationColor: new THREE.Color(spec.core),
        attenuationDistance: 4.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.2,
      });
      const shell = new THREE.Mesh(geo, mat);
      shell.position.set(...spec.pos);
      shell.rotation.y = spec.rot;

      // glowing core inside
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55, 1),
        new THREE.MeshBasicMaterial({ color: spec.core })
      );
      shell.add(core);

      const light = new THREE.PointLight(spec.core, 6, 12, 2);
      shell.add(light);

      this.group.add(shell);
      this.items.push({ shell, core, base: shell.position.clone(), spec });
    }

    stage.scene.add(this.group);
  }

  // world positions of each monolith (consumed by the HUD layer)
  get anchors() {
    return this.items.map((it) => ({ object: it.shell, label: it.spec.label }));
  }

  update(t) {
    this.items.forEach((it, i) => {
      it.shell.rotation.y += 0.0025 + i * 0.0004;
      it.shell.rotation.x = Math.sin(t * 0.3 + i) * 0.08;
      it.shell.position.y = it.base.y + Math.sin(t * 0.6 + i * TAU * 0.33) * 0.35;
      it.core.rotation.y -= 0.01;
    });
  }
}
