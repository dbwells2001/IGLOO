import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Bloom + a custom grade pass (chromatic aberration, vignette, film grain).
// Chromatic aberration tightens to a hard spike on fast scroll for a "warp" feel.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0015 },
    uVignette: { value: 1.1 },
    uGrain: { value: 0.06 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uVignette, uGrain;

    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }

    void main(){
      vec2 dir = vUv - 0.5;
      float d = dot(dir, dir);
      float a = uAberration * (0.4 + d * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv - dir * a).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv + dir * a).b;

      // vignette
      float vig = smoothstep(0.95, 0.18, d * uVignette);
      col *= mix(0.55, 1.0, vig);

      // film grain
      float g = rand(vUv * vec2(uTime * 60.0 + 1.0, uTime * 60.0 + 2.0));
      col += (g - 0.5) * uGrain;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Post {
  constructor(stage) {
    this.stage = stage;
    const { renderer, scene, camera } = stage;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.72, 0.62, 0.72);
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.composer.addPass(new OutputPass());

    this.aberrationBoost = 0; // driven by scroll velocity
  }

  setSize(w, h, dpr) {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  render(dt) {
    const g = this.grade.uniforms;
    g.uTime.value += dt;
    // ease the aberration boost back toward the resting value each frame
    this.aberrationBoost *= 0.9;
    g.uAberration.value = 0.0015 + this.aberrationBoost;
    this.composer.render();
  }
}
