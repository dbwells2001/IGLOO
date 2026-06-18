import * as THREE from 'three';
import { hash, simplex } from '../gfx/noise.glsl.js';

// Procedural glowing igloo: a hemisphere whose running-bond brick seams emit
// cyan-white light from within, with snow on the crown, a fresnel rim and a
// glowing entrance arch. No textures — all seams/snow are computed in GLSL.
export class Igloo {
  constructor(stage) {
    this.group = new THREE.Group();
    const R = 5.0;

    const geo = new THREE.SphereGeometry(R, 160, 120, 0, Math.PI * 2, 0, Math.PI * 0.5);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uGlow: { value: new THREE.Color(0x9ff0ff) },
        uIce: { value: new THREE.Color(0x6a86a8) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vLocal;
        void main(){
          vLocal = position;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vView;
        varying vec3 vLocal;
        uniform float uTime;
        uniform vec3 uGlow, uIce;
        ${hash}
        ${simplex}

        void main(){
          vec3 p = normalize(vLocal);
          float lat = acos(clamp(p.y, -1.0, 1.0));        // 0 at top -> PI/2 at base
          float lon = atan(p.z, p.x);                      // -PI..PI

          // running-bond brick layout
          float rows = 14.0;
          float row = lat / (3.14159 * 0.5) * rows;
          float ri = floor(row);
          float rowFrac = fract(row);
          // shrink columns near the top so bricks stay roughly square
          float cols = max(4.0, floor(46.0 * sin(lat) + 2.0));
          float offset = mod(ri, 2.0) * 0.5;               // alternate-row offset
          float colPos = (lon / 6.28318 + 0.5) * cols + offset;
          float colFrac = fract(colPos);

          // distance to nearest seam (row + column)
          float seam = min(
            min(rowFrac, 1.0 - rowFrac),
            min(colFrac, 1.0 - colFrac)
          );
          float mortar = smoothstep(0.10, 0.0, seam);      // 1 inside seam

          // per-brick tint variation
          float brickId = hash21(vec2(ri, floor(colPos)));
          vec3 ice = uIce * (0.7 + brickId * 0.5);

          // light bleeding through the mortar from within
          float pulse = 0.85 + 0.15 * sin(uTime * 1.5 + brickId * 30.0);
          vec3 glow = uGlow * mortar * 2.4 * pulse;

          // snow accumulation toward the crown
          float snow = smoothstep(0.55, 0.05, lat);
          float snowN = snoise(p.xz * 6.0) * 0.5 + 0.5;
          snow *= 0.6 + 0.4 * snowN;
          vec3 base = mix(ice, vec3(0.7, 0.78, 0.9), snow);

          // fresnel rim
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vView);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 rim = uGlow * fres * 0.8;

          // faint translucency through the whole shell
          float trans = (1.0 - mortar) * 0.18;

          vec3 col = base * (0.35 + trans) + glow + rim;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.shell = new THREE.Mesh(geo, this.material);
    this.group.add(this.shell);

    // entrance tunnel — a short glowing arch poking out the front (+Z)
    const archMat = new THREE.MeshBasicMaterial({ color: 0x0a0f18 });
    const tunnel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 3.2, 32, 1, true, 0, Math.PI),
      archMat
    );
    tunnel.rotation.z = Math.PI / 2;
    tunnel.rotation.y = Math.PI / 2;
    tunnel.position.set(0, 1.5, R - 0.4);
    this.group.add(tunnel);

    // glowing doorway disc set just inside the tunnel mouth
    const doorMat = new THREE.MeshBasicMaterial({
      color: 0x9ff0ff,
      transparent: true,
      opacity: 0.9,
    });
    const door = new THREE.Mesh(new THREE.CircleGeometry(1.45, 32, 0, Math.PI), doorMat);
    door.rotation.x = Math.PI; // flat semicircle standing up
    door.position.set(0, 1.5, R + 1.4);
    door.rotation.y = Math.PI;
    this.door = door;
    this.group.add(door);

    // an interior light source so the whole structure feels lit from within
    this.coreLight = new THREE.PointLight(0x9ff0ff, 40, 40, 2);
    this.coreLight.position.set(0, 2.2, 0);
    this.group.add(this.coreLight);

    stage.scene.add(this.group);
  }

  update(t) {
    this.material.uniforms.uTime.value = t;
    this.coreLight.intensity = 40 + Math.sin(t * 1.5) * 6;
    this.door.material.opacity = 0.8 + Math.sin(t * 2.0) * 0.15;
  }
}
