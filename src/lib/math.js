// Small math toolkit shared across the engine.

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export const lerp = (a, b, t) => a + (b - a) * t;

export const invLerp = (a, b, v) => (b - a === 0 ? 0 : clamp((v - a) / (b - a)));

export const remap = (v, inA, inB, outA, outB) => lerp(outA, outB, invLerp(inA, inB, v));

export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Frame-rate independent damping toward a target (Game Programming Gems 4).
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const TAU = Math.PI * 2;
