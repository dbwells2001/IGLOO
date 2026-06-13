# IGLOO INC — WebGL recreation

A real-time, scroll-driven WebGL experience inspired by [igloo.inc](https://www.igloo.inc/):
a glowing ice igloo on a frozen interstellar plain, a cinematic flight past
faceted ice blocks wrapped in a sci-fi HUD, and a finale of morphing,
mouse-reactive particles.

The original site is a pure **WebGL2** experience (no video) — so this rebuild is
also real-time 3D rather than pre-rendered clips. Everything you see is generated
on the GPU with custom GLSL: the aurora, nebula and starfield, the procedural
igloo with light bleeding through its brick seams, the displaced snowfield, the
glass ice blocks, and the particle galaxy. There are **no image, video or audio
assets** — even the ambient soundscape is synthesized with the Web Audio API.

## Highlights

- **Procedural glowing igloo** — a hemisphere shader builds running-bond brick
  seams that emit cyan-white light from within, with snow accumulation, a fresnel
  rim, a glowing entrance and a soft glow pool cast onto the snow.
- **Interstellar sky** — gradient space dome, fbm nebula, a milky-way band, 2.6k
  twinkling stars and a drifting aurora curtain.
- **Cinematic scroll** — a keyframed camera flight (Lenis smooth scroll) travels
  from the hero, past three floating **frosted glass ice blocks** (real
  transmission/refraction) each holding a glowing object, to a particle finale.
- **Tracking HUD** — telemetry tags, crosshairs and SVG leader lines that follow
  each ice block by projecting its 3D position to screen space every frame.
- **Particle finale** — a 26k-point galaxy that morphs toward a sphere, drifts on
  organic noise, and repels from the cursor.
- **Post-processing** — Unreal bloom + a custom grade pass (chromatic aberration
  that spikes on fast scroll, vignette, film grain) over an HDR pipeline.
- **Decode UI** — every label resolves with a glitch/scramble effect; monospace
  HUD, rounded display logo, premium loading screen, synthesized ambient audio.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
```

Build / preview a production bundle:

```bash
npm run build
npm run preview
```

Requires a browser with WebGL2 (all modern browsers).

## Controls

- **Scroll** — drive the cinematic camera through the five sections.
- **SOUND: OFF/ON** — toggle the synthesized ambient bed (needs a click first,
  per browser autoplay rules).
- **Move the mouse** — parallax on the camera; repels the finale particles.
- **PORTFOLIO / CONNECT** — smooth-scroll to the project blocks / finale.

## Project structure

```
index.html                 UI chrome (loader, nav, corners, hero, finale, HUD roots)
src/
  main.js                  Boot sequence, UI reveal, scroll + sound wiring
  Experience.js            Renderer, scene, camera flight, render loop
  style.css                Cold monospace / sci-fi HUD styling
  world/
    Sky.js                 Space dome + nebula + starfield + aurora
    Snowfield.js           Displaced dune terrain w/ sparkle + glow pool
    Igloo.js               Procedural glowing brick-seam igloo
    IceBlocks.js           Faceted glass blocks with frozen objects
    Particles.js           Morphing, mouse-reactive particle galaxy
    glsl/noise.js          Shared simplex/fbm GLSL
  postprocessing/PostFX.js Bloom + chromatic aberration / vignette / grain
  ui/
    Loader.js              Loading screen controller
    Scramble.js            Text decode/scramble effect
    HUD.js                 Projected telemetry + leader lines
  audio/Ambient.js         Web Audio synthesized ambient bed
  utils/math.js            lerp / clamp / smoothstep / damp
```

## Notes

Built as a technical/portfolio homage to the craft of the original igloo.inc
(Studio Abeto + Bureaux). All code and shaders here are original.
