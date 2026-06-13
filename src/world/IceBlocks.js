import * as THREE from 'three';

const INNER_GEOS = [
  () => new THREE.OctahedronGeometry(0.72, 0),
  () => new THREE.TorusKnotGeometry(0.42, 0.15, 90, 14),
  () => new THREE.IcosahedronGeometry(0.7, 0),
];

export class IceBlocks {
  constructor(positions) {
    this.group = new THREE.Group();
    this.blocks = [];

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x9fc6da),
      roughness: 0.08,
      metalness: 0,
      transmission: 1,
      thickness: 2.2,
      ior: 1.31,
      transparent: true,
      attenuationColor: new THREE.Color(0x6fbfe0),
      attenuationDistance: 4,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
      flatShading: true,
    });

    positions.forEach((p, i) => {
      const block = new THREE.Group();
      block.position.set(p.x, p.y, p.z);

      // Faceted ice shell.
      const shellGeo = new THREE.IcosahedronGeometry(2.0, 1);
      const shell = new THREE.Mesh(shellGeo, outerMat);
      block.add(shell);

      // Cyan facet edges.
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(shellGeo, 12),
        new THREE.LineBasicMaterial({
          color: 0x8fe9ff,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      block.add(edges);

      // The object frozen inside, glowing.
      const innerGeo = INNER_GEOS[i % INNER_GEOS.length]();
      const inner = new THREE.Mesh(
        innerGeo,
        new THREE.MeshStandardMaterial({
          color: 0x0a1a24,
          emissive: new THREE.Color(0x6fd6ff),
          emissiveIntensity: 2.6,
          roughness: 0.4,
          metalness: 0.2,
        })
      );
      block.add(inner);

      this.group.add(block);
      this.blocks.push({
        group: block,
        inner,
        phase: i * 1.7,
        bob: 0.5 + i * 0.08,
        spin: (i % 2 === 0 ? 1 : -1) * 0.12,
        baseY: p.y,
        index: i,
      });
    });
  }

  update(time) {
    for (const b of this.blocks) {
      b.group.position.y = b.baseY + Math.sin(time * 0.6 + b.phase) * 0.35;
      b.group.rotation.y = time * b.spin;
      b.inner.rotation.x = time * 0.5;
      b.inner.rotation.y = time * 0.7;
      b.inner.material.emissiveIntensity = 2.2 + Math.sin(time * 1.5 + b.phase) * 0.6;
    }
  }
}
