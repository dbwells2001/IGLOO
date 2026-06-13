import * as THREE from 'three';
import { noiseGLSL } from './glsl/noise.js';

export class Igloo {
  constructor({ fogColor, fogDensity, radius = 3.2 }) {
    this.group = new THREE.Group();
    this.radius = radius;

    this.uniforms = {
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogDensity: { value: fogDensity },
      uGlow: { value: 1 },
    };

    this._buildDome();
    this._buildDoorway();
    this._buildInnerLight();
  }

  _buildDome() {
    const geo = new THREE.SphereGeometry(this.radius, 160, 100, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec3 vLocal;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vDepth;
        void main(){
          vLocal = normalize(position);
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          vec4 mv = viewMatrix * world;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${noiseGLSL}
        uniform float uTime;
        uniform float uGlow;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        varying vec3 vLocal;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vDepth;

        const float PI = 3.14159265;
        const float NUM_ROWS = 11.0;
        const float BASE_BRICKS = 36.0;

        void main(){
          vec3 d = normalize(vLocal);
          float lat = acos(clamp(d.y, -1.0, 1.0));   // 0 top -> PI/2 base
          float lon = atan(d.z, d.x);                // -PI..PI

          float latStep = (PI * 0.5) / NUM_ROWS;
          float row = floor(lat / latStep);
          float rowFrac = fract(lat / latStep);

          float latCenter = (row + 0.5) * latStep;
          float cols = max(floor(BASE_BRICKS * sin(latCenter)), 5.0);
          float lonStep = (PI * 2.0) / cols;
          float rowOffset = mod(row, 2.0) * 0.5 * lonStep;
          float colFrac = fract((lon + PI + rowOffset) / lonStep);

          // Seam mask (anti-aliased via fwidth) for mortar lines.
          float seamW = 0.052;
          float latDist = min(rowFrac, 1.0 - rowFrac);
          float lonDist = min(colFrac, 1.0 - colFrac);
          float latLine = 1.0 - smoothstep(0.0, seamW, latDist);
          float lonLine = 1.0 - smoothstep(0.0, seamW, lonDist);
          lonLine *= smoothstep(0.0, 0.16, lat);     // converge cleanly at pole
          float seam = max(latLine, lonLine);

          // Subtle per-brick tonal variation.
          float brickRnd = snoise(vec3(row * 3.1, floor((lon + PI + rowOffset) / lonStep) * 1.7, 0.0));

          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 N = normalize(vNormal);
          float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

          // Base ice block surface.
          vec3 ice = vec3(0.045, 0.075, 0.11) + brickRnd * 0.012;
          float diff = clamp(dot(N, normalize(vec3(-0.3, 0.8, 0.4))), 0.0, 1.0);
          ice += vec3(0.05, 0.08, 0.12) * diff;

          // Snow accumulation toward the crown.
          float snow = smoothstep(0.55, 0.95, d.y) * (0.6 + 0.4 * snoise(vLocal * 6.0));
          ice = mix(ice, vec3(0.16, 0.2, 0.26), clamp(snow, 0.0, 1.0));

          // Light from within: brighter near the base seams, gentle breathing.
          float pulse = 0.82 + 0.18 * sin(uTime * 0.8);
          vec3 glowCol = vec3(0.5, 0.86, 1.0);
          float inner = (0.25 + 0.75 * (1.0 - d.y));      // stronger near ground
          vec3 col = ice;
          col += glowCol * seam * (1.4 + 1.3 * (1.0 - d.y)) * pulse * uGlow;
          col += glowCol * inner * 0.10 * pulse * uGlow;   // ambient bleed
          col += vec3(0.45, 0.8, 1.0) * fres * 0.7;        // cyan rim

          // Tiny glowing oculus at the very top.
          col += glowCol * smoothstep(0.04, 0.0, lat) * 1.2 * pulse;

          float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
          col = mix(col, uFogColor, clamp(f, 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.group.add(new THREE.Mesh(geo, mat));
  }

  _buildDoorway() {
    // Glowing entrance: a small additive arch on the front (+z) of the dome.
    const geo = new THREE.PlaneGeometry(1.7, 1.9);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: this.uniforms.uTime, uGlow: this.uniforms.uGlow },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uGlow;
        varying vec2 vUv;
        void main(){
          vec2 p = vUv - vec2(0.5, 0.38);
          // Rounded-top archway field.
          float ax = abs(p.x) * 1.9;
          float top = smoothstep(0.62, 0.0, p.y);
          float body = smoothstep(0.85, 0.0, ax);
          float arch = body * (0.35 + 0.65 * top);
          arch *= smoothstep(-0.45, -0.2, p.y);   // floor cutoff
          float pulse = 0.82 + 0.18 * sin(uTime * 0.8);
          vec3 c = mix(vec3(0.4, 0.78, 1.0), vec3(0.85, 0.96, 1.0), arch);
          float a = pow(arch, 1.4) * pulse * uGlow;
          gl_FragColor = vec4(c * a * 1.6, a);
        }
      `,
    });
    const arch = new THREE.Mesh(geo, mat);
    arch.position.set(0, 0.78, this.radius * 0.99);
    this.group.add(arch);
  }

  _buildInnerLight() {
    // A real light so nearby snow & the doorway lip pick up the cyan bleed.
    const light = new THREE.PointLight(0x7fd8ff, 14, 26, 2);
    light.position.set(0, 1.0, 0);
    this.group.add(light);
    this.light = light;
  }

  update(time) {
    this.uniforms.uTime.value = time;
    if (this.light) this.light.intensity = 12 + Math.sin(time * 0.8) * 3;
  }
}
