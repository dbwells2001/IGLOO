import * as THREE from 'three';
import { simplex, hash } from '../gfx/noise.glsl.js';

// A large inward-facing dome: vertical gradient + fbm nebula + procedural
// twinkling stars + a milky-way band. Plus a separate additive aurora curtain.
export class Sky {
  constructor(stage) {
    this.group = new THREE.Group();

    const domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vDir;
        uniform float uTime;
        ${hash}
        ${simplex}
        float fbm3(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.02;a*=0.5;} return v; }

        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);

          // base vertical gradient: deep indigo -> cold black at zenith
          vec3 low  = vec3(0.04, 0.07, 0.13);
          vec3 mid  = vec3(0.02, 0.04, 0.09);
          vec3 high = vec3(0.005, 0.01, 0.03);
          vec3 col = mix(low, mid, smoothstep(0.0, 0.45, h));
          col = mix(col, high, smoothstep(0.45, 1.0, h));

          // nebula clouds
          vec2 sp = d.xz / (abs(d.y) + 0.35) * 1.4;
          float neb = fbm3(sp * 1.1 + vec2(uTime * 0.01, 0.0));
          neb = smoothstep(0.1, 0.9, neb * 0.5 + 0.5);
          col += vec3(0.10, 0.18, 0.30) * neb * 0.5 * (0.4 + h);

          // milky-way band
          float band = exp(-pow((d.y + 0.05) * 3.2, 2.0));
          col += vec3(0.12, 0.16, 0.26) * band * (0.4 + 0.6 * fbm3(sp * 2.5));

          // stars
          vec2 g = d.xz / (abs(d.y) + 0.15) * 60.0;
          vec2 cell = floor(g);
          float star = hash21(cell);
          float bright = step(0.985, star);
          vec2 fp = fract(g) - 0.5;
          float pt = bright * smoothstep(0.42, 0.0, length(fp));
          float tw = 0.6 + 0.4 * sin(uTime * 2.0 + star * 40.0);
          col += vec3(0.8, 0.9, 1.0) * pt * tw * (0.5 + h);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 32), domeMat);
    this.group.add(this.dome);

    // aurora — a wide curved ribbon high over the plain, additive
    const auroraMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        ${hash}
        ${simplex}
        void main(){
          float t = uTime * 0.08;
          float curtain = snoise(vec2(vUv.x * 4.0 + t, vUv.x * 1.5)) * 0.5 + 0.5;
          float v = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          float ribbon = smoothstep(0.35, 0.9, curtain) * v;
          float flick = 0.7 + 0.3 * snoise(vec2(vUv.x * 12.0, t * 4.0));
          vec3 col = mix(vec3(0.2, 0.9, 0.7), vec3(0.4, 0.6, 1.0), vUv.y);
          gl_FragColor = vec4(col * ribbon * flick, ribbon * 0.5);
        }
      `,
    });
    const auroraGeo = new THREE.CylinderGeometry(150, 150, 90, 64, 1, true, -1.0, 2.0);
    this.aurora = new THREE.Mesh(auroraGeo, auroraMat);
    this.aurora.position.y = 60;
    this.group.add(this.aurora);

    this.materials = [domeMat, auroraMat];
    stage.scene.add(this.group);
  }

  update(t) {
    for (const m of this.materials) m.uniforms.uTime.value = t;
  }
}
