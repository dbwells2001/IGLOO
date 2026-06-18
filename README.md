# IGLOO INC — WebGL recreation

A real-time, scroll-driven WebGL homage to [igloo.inc](https://www.igloo.inc/):
a glowing ice igloo on a frozen interstellar plain, a cinematic flight past
faceted frosted-glass blocks wrapped in a sci-fi HUD, and a finale where a
particle field morphs into a slowly turning "cryosphere".

Like the original, this is a pure real-time **WebGL2** experience — there are
**no image, video or audio assets**. The aurora, nebula, starfield, the
procedural glowing igloo, the displaced snow plain, the snow and the particle
sphere are all generated on the GPU with custom GLSL. Even the ambient
soundscape is synthesized with the Web Audio API.

## Highlights

- **Procedural glowing igloo** — a hemisphere shader builds running-bond brick
  seams that bleed cyan-white light from within, with snow on the crown, a
  fresnel rim, a glowing entrance and an interior light.
- **Interstellar sky** — gradient space dome, fbm nebula, a milky-way band,
  procedural twinkling stars and a drifting aurora curtain.
- **Cinematic scroll** — a keyframed camera flight (Lenis smooth scroll) eased
  through five beats, from the hero to an ascent into the particle cryosphere.
- **Frosted ice monoliths** — three faceted blocks with real
  transmission/refraction, each encasing a glowing core.
- **Tracking HUD** — telemetry tags and SVG leader lines that follow each
  monolith by projecting its 3D position to screen space, fading in around the
  monolith beat.
- **Particle finale** — a ~22k-point field that morphs into a sphere, drifts on
  organic noise and repels from the cursor.
- **Post-processing** — Unreal bloom + a custom grade pass (chromatic
  aberration that spikes on fast scroll, vignette, film grain).
- **Decode UI** — every label resolves with a glitch/scramble effect; monospace
  HUD, premium loading screen, synthesized ambient audio.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
```

Production build / preview:

```bash
npm run build
npm run preview
```

### Single-file build (open with no server)

```bash
npm run build:single   # outputs dist-single/, then inlines to igloo-standalone.html
```

`igloo-standalone.html` is one self-contained file (JS, CSS and fonts inlined)
that runs straight from `file://` — just open it in a browser. Requires WebGL2.

## Controls

- **Scroll** — drive the cinematic camera through the five beats.
- **SOUND** — toggle the synthesized ambient bed (needs a click first, per
  browser autoplay rules).
- **Move the mouse** — parallax on the camera; repels the finale particles.
- **PORTFOLIO / CONNECT** — smooth-scroll to the monoliths / finale.

## Architecture

A small "Stage" engine owns the renderer, scene, camera, post pipeline and the
render loop; actors register per-frame updates with it. Scroll progress fans out
to the camera rig, the world and the HUD.

```
index.html                 UI chrome (loader, nav, corners, hero, finale, HUD roots)
src/
  main.js                  Boot sequence, UI reveal, scroll + sound wiring
  app/
    App.js                 Top-level orchestrator
    Stage.js               Renderer + scene + camera + render loop
    Scroll.js              Lenis smooth-scroll wrapper (progress + velocity)
    CameraRig.js           Keyframed, scroll-driven camera flight
  world/
    World.js               Assembles all actors + scene lighting
    Sky.js                 Space dome + nebula + stars + aurora
    Terrain.js             Displaced snow plain w/ sparkle + glow pool
    Igloo.js               Procedural glowing brick-seam igloo
    Monoliths.js           Frosted-glass blocks (transmission) with cores
    Snow.js                Drifting snow particles
    Finale.js              Morphing, mouse-reactive particle sphere
  fx/
    Post.js                Bloom + chromatic aberration / vignette / grain
  gfx/
    noise.glsl.js          Shared simplex / fbm / hash GLSL
  ui/
    Loader.js              Loading screen controller
    Scramble.js            Text decode/scramble effect
    Hud.js                 Projected telemetry + leader lines
  audio/Ambient.js         Web Audio synthesized ambient bed
  lib/math.js              lerp / clamp / smoothstep / damp / easing
  styles/main.css          Cold monospace / sci-fi HUD styling
```

## Notes

Built as a technical/portfolio homage to the craft of the original igloo.inc
(Studio Abeto + Bureaux). All code and shaders here are original.
