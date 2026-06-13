import * as THREE from 'three';
import { noiseGLSL } from './glsl/noise.js';

export class Snowfield {
  constructor({ fogColor, fogDensity }) {
    const geo = new THREE.PlaneGeometry(900, 900, 320, 320);
    geo.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogDensity: { value: fogDensity },
      uIglooPos: { value: new THREE.Vector3(0, 0, 0) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        ${noiseGLSL}
        uniform vec3 uIglooPos;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vDepth;

        float height(vec2 p){
          float h = fbm(vec3(p * 0.02, 0.0)) * 6.0;
          h += fbm(vec3(p * 0.08, 10.0)) * 1.4;
          // Flatten a soft pad around the igloo.
          float d = length(p - uIglooPos.xz);
          float pad = smoothstep(6.0, 20.0, d);
          return h * pad;
        }

        void main(){
          vec3 pos = position;
          float e = 1.2;
          float h = height(pos.xz);
          pos.y += h;
          float hx = height(pos.xz + vec2(e, 0.0));
          float hz = height(pos.xz + vec2(0.0, e));
          vNormal = normalize(vec3(h - hx, e, h - hz));

          vec4 world = modelMatrix * vec4(pos, 1.0);
          vWorldPos = world.xyz;
          vec4 mv = viewMatrix * world;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uIglooPos;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vDepth;

        float hash(vec2 p){
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main(){
          vec3 N = normalize(vNormal);
          vec3 V = normalize(cameraPosition - vWorldPos);

          // Cold key light from upper-back.
          vec3 L = normalize(vec3(-0.3, 0.7, -0.5));
          float diff = clamp(dot(N, L), 0.0, 1.0);

          vec3 base = vec3(0.05, 0.075, 0.11);
          vec3 lit = base + vec3(0.06, 0.085, 0.12) * diff;

          // Fresnel sheen brightens grazing snow + distance.
          float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
          lit += vec3(0.10, 0.16, 0.22) * fres;

          // Glow pool cast by the igloo.
          float gd = length(vWorldPos.xz - uIglooPos.xz);
          float pool = exp(-gd * 0.10) * 0.9;
          lit += vec3(0.18, 0.55, 0.7) * pool;

          // Frost sparkle: sparse twinkling specks.
          vec2 cell = floor(vWorldPos.xz * 6.0);
          float s = hash(cell);
          float tw = 0.5 + 0.5 * sin(uTime * 3.0 + s * 80.0);
          float spark = step(0.992, s) * tw * fres * 2.0;
          lit += vec3(spark);

          // Exponential-squared fog to match scene.
          float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
          vec3 col = mix(lit, uFogColor, clamp(f, 0.0, 1.0));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  update(time) {
    this.uniforms.uTime.value = time;
  }
}
