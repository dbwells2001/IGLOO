import { Stage } from './Stage.js';
import { Scroll } from './Scroll.js';
import { CameraRig } from './CameraRig.js';
import { World } from '../world/World.js';
import { Hud } from '../ui/Hud.js';
import { clamp } from '../lib/math.js';

// Top-level orchestrator: builds the stage, world, camera rig, scroll and HUD,
// then wires per-frame updates together.
export class App {
  constructor(canvas) {
    this.stage = new Stage(canvas);
    this.scroll = new Scroll();
    this.rig = new CameraRig(this.stage);
    this.world = new World(this.stage);
    this.hud = new Hud(this.stage, this.world.anchors);

    this.scroll.onChange((p, v) => {
      this.rig.setProgress(p);
      this.world.setProgress(p);
      this.hud.setProgress(p);
      // fast scroll spikes chromatic aberration for a warp feel
      this.stage.post.aberrationBoost += clamp(Math.abs(v) * 0.00004, 0, 0.01);
    });

    this.stage.onTick((t, dt) => {
      this.scroll.raf(performance.now());
      this.rig.update(t, dt);
      this.world.update(t, dt);
      this.hud.update();
    });

    // resolves once the first frame has been rendered
    this.ready = new Promise((res) => {
      const off = this.stage.onTick(() => {
        off();
        res();
      });
    });

    this.stage.start();
  }
}
