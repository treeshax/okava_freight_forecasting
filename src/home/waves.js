/**
 * Shared Gerstner wave configuration.
 *
 * The ocean shader (Ocean.jsx) and the ship buoyancy logic (Ship.jsx) both
 * evaluate the *same* wave set so the vessel sits physically in the water
 * instead of floating above a plane.
 *
 * Each wave: direction (x,z) on the water plane, amplitude (world units),
 * wavelength (world units), and phase speed multiplier.
 */
export const WAVES = [
  { dir: [1.0, 0.15], amp: 0.42, length: 26.0, speed: 0.9, steep: 0.9 },
  { dir: [0.65, 0.75], amp: 0.24, length: 14.0, speed: 1.1, steep: 0.7 },
  { dir: [-0.4, 0.92], amp: 0.13, length: 7.5, speed: 1.35, steep: 0.5 },
  { dir: [0.15, -0.98], amp: 0.06, length: 4.2, speed: 1.7, steep: 0.35 },
];

const GRAVITY = 9.81;

function norm2([x, y]) {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

/**
 * Sample the Gerstner surface at world (x, z) and time t.
 * Returns the displaced height plus an approximate surface normal,
 * used to bob and tilt (roll / pitch) the ship.
 */
export function sampleWater(x, z, t) {
  let height = 0;
  let nx = 0;
  let nz = 0;

  for (const w of WAVES) {
    const [dx, dz] = norm2(w.dir);
    const k = (2 * Math.PI) / w.length;
    const c = Math.sqrt(GRAVITY / k) * w.speed;
    const f = k * (dx * x + dz * z) - c * t;
    const a = w.amp;

    height += a * Math.sin(f);

    const wa = k * a;
    nx -= dx * wa * Math.cos(f);
    nz -= dz * wa * Math.cos(f);
  }

  return { height, normal: [nx, 1, nz] };
}
