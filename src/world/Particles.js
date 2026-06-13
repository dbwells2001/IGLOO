import * as THREE from 'three';

export class Particles {
  constructor({ count = 26000, position = new THREE.Vector3() } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);

    const home = new Float32Array(count * 3); // galaxy
    const alt = new Float32Array(count * 3); // sphere
    const seed = new Float32Array(count);
    const cmix = new Float32Array(count);

    const ARMS = 4;
    const MAXR = 26;
    for (let i = 0; i < count; i++) {
      // --- galaxy spiral ---
      const t = Math.pow(Math.random(), 0.6);
      const r = t * MAXR;
      const arm = (i % ARMS) * ((Math.PI * 2) / ARMS);
      const spin = r * 0.16;
      const spread = (1 - t) * 1.6 + 0.15;
      const ang = arm + spin + (Math.random() - 0.5) * spread;
      const thick = (Math.random() - 0.5) * (2.2 * Math.exp(-r * 0.05));
      home[i * 3] = Math.cos(ang) * r + (Math.random() - 0.5) * 0.6;
      home[i * 3 + 1] = thick;
      home[i * 3 + 2] = Math.sin(ang) * r + (Math.random() - 0.5) * 0.6;

      // --- sphere shell ---
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const sr = MAXR * 0.62;
      alt[i * 3] = sr * Math.sin(phi) * Math.cos(theta);
      alt[i * 3 + 1] = sr * Math.cos(phi);
      alt[i * 3 + 2] = sr * Math.sin(phi) * Math.sin(theta);

      seed[i] = Math.random() * Math.PI * 2;
      cmix[i] = t; // 0 core .. 1 rim
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
    geo.setAttribute('aAlt', new THREE.BufferAttribute(alt, 3));
    geo.setAttribute('position', new THREE.BufferAttribute(home.slice(), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aMix', new THREE.BufferAttribute(cmix, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uReveal: { value: 0 },
      uMouse: { value: new THREE.Vector3(999, 999, 999) },
      uPixelRatio: { value: 1 },
    };

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute vec3 aHome;
        attribute vec3 aAlt;
        attribute float aSeed;
        attribute float aMix;
        uniform float uTime;
        uniform float uMorph;
        uniform float uReveal;
        uniform vec3 uMouse;
        uniform float uPixelRatio;
        varying float vMix;
        varying float vAlpha;

        void main(){
          vec3 p = mix(aHome, aAlt, uMorph);

          // Slow galactic rotation (only affects the spiral state).
          float ang = uTime * 0.04 * (1.0 - uMorph);
          float c = cos(ang), s = sin(ang);
          p.xz = mat2(c, -s, s, c) * p.xz;

          // Organic drift.
          p.x += sin(uTime * 0.4 + aSeed) * 0.4;
          p.y += cos(uTime * 0.3 + aSeed * 1.3) * 0.4;
          p.z += sin(uTime * 0.35 + aSeed * 0.7) * 0.4;

          // Mouse repulsion in world space.
          vec3 world = (modelMatrix * vec4(p, 1.0)).xyz;
          vec3 toM = world - uMouse;
          float dM = length(toM);
          float push = smoothstep(9.0, 0.0, dM) * 6.0;
          p += normalize(toM + 0.001) * push;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          float size = mix(2.6, 1.4, aMix);
          gl_PointSize = size * uPixelRatio * (120.0 / max(-mv.z, 1.0));
          vMix = aMix;
          vAlpha = uReveal * (0.5 + 0.5 * sin(uTime * 1.5 + aSeed));
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vMix;
        varying float vAlpha;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d);
          vec3 core = vec3(0.7, 0.95, 1.0);
          vec3 mid = vec3(0.3, 0.7, 1.0);
          vec3 rim = vec3(0.55, 0.4, 1.0);
          vec3 col = mix(core, mid, smoothstep(0.0, 0.5, vMix));
          col = mix(col, rim, smoothstep(0.5, 1.0, vMix));
          gl_FragColor = vec4(col, a * (0.35 + 0.65 * vAlpha));
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  setPixelRatio(pr) {
    this.uniforms.uPixelRatio.value = pr;
  }

  update(time) {
    this.uniforms.uTime.value = time;
  }
}
