import * as THREE from 'three';
import { simplex, hash } from '../gfx/noise.glsl.js';

// A large displaced plane that reads as a wind-sculpted snow plain. Vertex
// displacement carves dunes; the fragment shader adds sparkle and a cyan glow
// pool radiating from the igloo at the origin.
export class Terrain {
  constructor(stage) {
    const geo = new THREE.PlaneGeometry(400, 400, 256, 256);
    geo.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uGlow: { value: new THREE.Color(0x7fe9ff) },
        uFogColor: { value: stage.scene.fog.color },
        uFogDensity: { value: stage.scene.fog.density },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying float vH;
        uniform float uTime;
        ${hash}
        ${simplex}
        float dunes(vec2 p){
          float v = 0.0, a = 1.0;
          for(int i=0;i<4;i++){ v += a*snoise(p); p*=2.07; a*=0.5; }
          return v;
        }
        void main(){
          vec3 pos = position;
          float d = dunes(pos.xz * 0.012);
          float ripple = snoise(pos.xz * 0.12) * 0.08;
          // flatten a clearing around the igloo at the origin
          float clearing = smoothstep(6.0, 22.0, length(pos.xz));
          pos.y += (d * 3.4 + ripple) * clearing;
          vH = pos.y;
          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorld;
        varying float vH;
        uniform float uTime;
        uniform vec3 uGlow, uFogColor;
        uniform float uFogDensity;
        ${hash}
        void main(){
          // base snow shading, slightly bluer in the hollows
          vec3 snowHi = vec3(0.42, 0.48, 0.62);
          vec3 snowLo = vec3(0.10, 0.14, 0.24);
          vec3 col = mix(snowLo, snowHi, clamp(vH * 0.18 + 0.5, 0.0, 1.0));

          // glittering sparkle
          vec2 g = floor(vWorld.xz * 9.0);
          float s = hash21(g);
          float sparkle = step(0.992, s) * (0.5 + 0.5 * sin(uTime * 3.0 + s * 60.0));
          col += sparkle * vec3(0.7, 0.85, 1.0);

          // cyan glow pool from the igloo at origin
          float dist = length(vWorld.xz);
          float pool = exp(-dist * 0.10) * 0.9 + exp(-dist * 0.03) * 0.25;
          col += uGlow * pool * 0.7;

          // exp2 fog blend to match the scene
          float fogDepth = length(vWorld - cameraPosition);
          float fog = 1.0 - exp(-uFogDensity * uFogDensity * fogDepth * fogDepth);
          col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.y = -0.2;
    stage.scene.add(this.mesh);
  }

  update(t) {
    this.material.uniforms.uTime.value = t;
  }
}
