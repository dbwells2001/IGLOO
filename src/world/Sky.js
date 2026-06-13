import * as THREE from 'three';
import { noiseGLSL } from './glsl/noise.js';

export class Sky {
  constructor() {
    this.group = new THREE.Group();
    this.uniforms = { uTime: { value: 0 } };
    this._buildDome();
    this._buildStars();
    this._buildAurora();
  }

  _buildDome() {
    const geo = new THREE.SphereGeometry(420, 64, 64);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${noiseGLSL}
        varying vec3 vDir;
        uniform float uTime;

        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);

          // Deep-space vertical gradient: near-black zenith -> cold navy horizon.
          vec3 horizon = vec3(0.035, 0.06, 0.10);
          vec3 zenith  = vec3(0.005, 0.012, 0.03);
          vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.7, h));

          // Milky-way band: a diagonal great-circle streak of dusty light.
          vec3 axis = normalize(vec3(0.6, 0.35, 0.7));
          float band = 1.0 - abs(dot(d, axis));
          float milky = smoothstep(0.86, 1.0, band);
          float dust = fbm(d * 3.5 + vec3(0.0, 0.0, uTime * 0.01));
          milky *= 0.5 + 0.5 * dust;
          col += vec3(0.18, 0.24, 0.34) * milky * 0.6;

          // Faint cyan/violet nebula clouds.
          float n = fbm(d * 1.8 + vec3(uTime * 0.008, 0.0, 0.0));
          n = smoothstep(0.1, 0.9, n);
          col += vec3(0.05, 0.14, 0.20) * n * 0.5;
          col += vec3(0.10, 0.05, 0.16) * pow(n, 2.0) * 0.4;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.group.add(new THREE.Mesh(geo, mat));
  }

  _buildStars() {
    const count = 2600;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const tint = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribute on a sphere shell, biased upward (sky).
      const u = Math.random();
      const v = Math.random() * 0.9 + 0.05;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 360;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9 - 10;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      size[i] = Math.pow(Math.random(), 3.0) * 4.0 + 0.6;
      phase[i] = Math.random() * Math.PI * 2;
      tint[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: this.uniforms.uTime, uPixelRatio: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        attribute float aTint;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vTwinkle;
        varying float vTint;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vTwinkle = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase);
          vTint = aTint;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (0.7 + 0.6 * vTwinkle);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vTwinkle;
        varying float vTint;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d);
          a *= 0.35 + 0.65 * vTwinkle;
          vec3 cool = vec3(0.75, 0.86, 1.0);
          vec3 warm = vec3(1.0, 0.96, 0.9);
          vec3 c = mix(cool, warm, vTint * 0.6);
          gl_FragColor = vec4(c, a);
        }
      `,
    });
    this.starMat = mat;
    this.group.add(new THREE.Points(geo, mat));
  }

  _buildAurora() {
    // A tall curved curtain low on the horizon, additive.
    const geo = new THREE.CylinderGeometry(300, 300, 170, 96, 1, true);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${noiseGLSL}
        varying vec2 vUv;
        uniform float uTime;
        void main(){
          float t = uTime * 0.05;
          // Vertical curtains drifting horizontally.
          float curtain = fbm(vec3(vUv.x * 7.0 + t, vUv.y * 1.5, t * 0.5));
          curtain += 0.5 * fbm(vec3(vUv.x * 16.0 - t * 1.4, vUv.y * 2.0, 0.0));
          float v = smoothstep(0.0, 1.0, vUv.y);
          // Fade top & bottom; concentrate glow in lower-mid band.
          float vmask = smoothstep(0.0, 0.35, v) * (1.0 - smoothstep(0.55, 1.0, v));
          float intensity = max(curtain, 0.0) * vmask;
          intensity = pow(intensity, 1.6) * 1.4;
          vec3 teal = vec3(0.2, 0.95, 0.85);
          vec3 green = vec3(0.35, 1.0, 0.55);
          vec3 violet = vec3(0.5, 0.45, 1.0);
          vec3 c = mix(teal, green, vUv.x);
          c = mix(c, violet, smoothstep(0.5, 1.0, curtain) * 0.5);
          gl_FragColor = vec4(c * intensity, intensity * 0.9);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 55;
    this.group.add(mesh);
  }

  setPixelRatio(pr) {
    this.starMat.uniforms.uPixelRatio.value = pr;
  }

  update(time) {
    this.uniforms.uTime.value = time;
  }
}
