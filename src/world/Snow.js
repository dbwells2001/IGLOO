import * as THREE from 'three';

// Drifting snow: a points field in a box that falls, sways and wraps around.
// Centered on the world so it surrounds the whole flight.
export class Snow {
  constructor(stage, count = 3500) {
    this.box = new THREE.Vector3(80, 50, 80);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * this.box.x;
      pos[i * 3 + 1] = Math.random() * this.box.y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * this.box.z;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBoxY: { value: this.box.y },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uBoxY, uPixelRatio;
        varying float vA;
        void main(){
          vec3 p = position;
          float fall = uTime * (1.2 + aSeed * 1.6);
          p.y = mod(p.y - fall, uBoxY);
          p.x += sin(uTime * 0.5 + aSeed * 30.0) * 1.2;
          p.z += cos(uTime * 0.4 + aSeed * 22.0) * 1.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float size = mix(2.0, 6.0, aSeed) * uPixelRatio;
          gl_PointSize = size * (30.0 / -mv.z);
          vA = 0.35 + 0.5 * aSeed;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), a);
        }
      `,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    stage.scene.add(this.points);
  }

  update(t) {
    this.material.uniforms.uTime.value = t;
  }
}
