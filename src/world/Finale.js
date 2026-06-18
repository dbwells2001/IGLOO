import * as THREE from 'three';
import * as math from '../lib/math.js';

// A point cloud that begins as a flat scattered field and, as scroll nears the
// end, morphs into a slowly turning sphere ("the cryosphere"). Reacts to the
// cursor with a soft repulsion. Fades in over the final stretch of the page.
export class Finale {
  constructor(stage, count = 22000) {
    this.stage = stage;
    const scatter = new Float32Array(count * 3);
    const sphere = new Float32Array(count * 3);
    const seed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // scattered start — a wide thin disc out in front of the camera path
      scatter[i * 3 + 0] = (Math.random() - 0.5) * 60;
      scatter[i * 3 + 1] = (Math.random() - 0.5) * 30 + 4;
      scatter[i * 3 + 2] = -10 - Math.random() * 40;

      // target — fibonacci sphere
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * k;
      const r = 7.0;
      sphere[i * 3 + 0] = Math.cos(theta) * Math.sin(phi) * r;
      sphere[i * 3 + 1] = Math.cos(phi) * r + 13.0;
      sphere[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r - 6.0;

      seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aSphere', new THREE.BufferAttribute(sphere, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('position', new THREE.BufferAttribute(scatter.slice(), 3));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uOpacity: { value: 0 },
        uMouse: { value: new THREE.Vector3() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aScatter;
        attribute vec3 aSphere;
        attribute float aSeed;
        uniform float uTime, uMorph, uPixelRatio;
        uniform vec3 uMouse;
        varying float vGlow;
        void main(){
          float m = smoothstep(0.0, 1.0, uMorph);
          vec3 p = mix(aScatter, aSphere, m);
          // organic drift
          p.x += sin(uTime * 0.5 + aSeed * 40.0) * 0.4;
          p.y += cos(uTime * 0.4 + aSeed * 33.0) * 0.4;

          // soft cursor repulsion
          vec3 toM = p - uMouse;
          float d = length(toM);
          p += normalize(toM + 1e-4) * (1.5 / (d * d + 1.0)) * m;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.5 + aSeed * 2.5) * uPixelRatio * (40.0 / -mv.z);
          vGlow = 0.4 + aSeed * 0.6;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uOpacity;
        varying float vGlow;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          vec3 col = mix(vec3(0.3, 0.7, 1.0), vec3(0.7, 0.95, 1.0), vGlow);
          gl_FragColor = vec4(col, a * uOpacity * vGlow);
        }
      `,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    stage.scene.add(this.points);

    this._mouseTarget = new THREE.Vector3();
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      this._mouseTarget.set(nx * 8, ny * 5 + 3, -10);
    });
  }

  setProgress(p) {
    // morph + fade in across the final third of the page
    const m = math.invLerp(0.62, 1.0, p);
    this.material.uniforms.uMorph.value = m;
    this.material.uniforms.uOpacity.value = math.smoothstep(0.5, 0.78, p);
  }

  update(t, dt) {
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uMouse.value.lerp(this._mouseTarget, 1 - Math.exp(-5 * dt));
    this.points.rotation.y += 0.0006;
  }
}
