// The Midnight Vault — the room itself: walls, cover, shadows, loot, patrols.
// Every route through the gallery is drawn from this one layout, so the thief
// can always pick a loud route past the guards, a dark route through the
// shadows, or a middle route behind the display cases.
import { PLAY } from './config.js';

// Solid walls (movement + line of sight). The outer walls are the play bounds.
export const WALLS = [
  // Left partition: a doorway gap between y 364 and y 460.
  { x: 420, y: 64, w: 26, h: 300 },
  { x: 420, y: 460, w: 26, h: 260 },
  // Right partition around the vault chamber: gap between y 480 and y 560.
  { x: 840, y: 180, w: 26, h: 300 },
  { x: 840, y: 560, w: 26, h: 160 },
  // A short mid-gallery wall that splits the centre floor.
  { x: 600, y: 480, w: 190, h: 26 },
];

// Cover furniture: blocks movement and sight, hides the thief behind it.
export const COVER = [
  { x: 170, y: 180, w: 130, h: 52, label: 'display case' },
  { x: 170, y: 520, w: 130, h: 52, label: 'display case' },
  { x: 540, y: 190, w: 150, h: 52, label: 'display case' },
  { x: 540, y: 580, w: 150, h: 52, label: 'display case' },
  { x: 950, y: 330, w: 120, h: 52, label: 'velvet sofa' },
];

// Pillars: round cover the thief can circle behind.
export const PILLARS = [
  { x: 640, y: 330, r: 26 },
  { x: 300, y: 400, r: 24 },
  { x: 1060, y: 470, r: 26 },
];

// Shadow pools: dark floor where the alarm falls fast and the thief is harder to see.
export const SHADOWS = [
  { x: 110, y: 360, w: 190, h: 130 },
  { x: 900, y: 570, w: 200, h: 130 },
  { x: 470, y: 90, w: 180, h: 90 },
];

// Tall grass: the thief crouching in it is hidden unless a watcher is close.
// One patch per region, each sitting just off a patrol beat so a route can
// run through it: west wing, centre gallery, vault chamber.
export const GRASS = [
  { x: 280, y: 440, w: 120, h: 80 },
  { x: 470, y: 340, w: 120, h: 80 },
  { x: 1030, y: 520, w: 130, h: 90 },
];

// Creaky boards: worn floorboards that betray a walking thief. Sneak over
// them (hold SHIFT) and they stay silent. Each strip lies across a route the
// thief wants: the run from the gems to the vault chamber, and the vault
// approach itself.
export const CREAKY = [
  { x: 430, y: 440, w: 380, h: 28 },
  { x: 900, y: 300, w: 260, h: 28 },
];

// Loot. Paintings and the gem case are grab-and-go; the vault needs a channel.
export const LOOT = [
  { id: 'painting-a', kind: 'painting', x: 250, y: 128, value: 200, label: 'Moonlit Harbour' },
  { id: 'painting-b', kind: 'painting', x: 640, y: 122, value: 200, label: 'The Gilded Fox' },
  { id: 'painting-c', kind: 'painting', x: 1000, y: 128, value: 200, label: 'Duchess in Blue' },
  { id: 'gems', kind: 'gems', x: 640, y: 420, value: 500, label: 'Starlight Gems' },
  { id: 'vault', kind: 'vault', x: 1140, y: 150, value: 1500, label: 'THE MIDNIGHT VAULT' },
];

// Guard patrols: waypoints each guard walks, back and forth.
export const PATROLS = [
  { waypoints: [[300, 300], [770, 300]], speed: 56 },   // centre gallery
  { waypoints: [[170, 180], [170, 620]], speed: 50 },   // west wing
  { waypoints: [[970, 250], [970, 640]], speed: 62 },   // vault chamber
];

// Wall cameras: mounted on a wall, sweeping a cone.
export const CAMERAS = [
  { x: 640, y: 70, baseAngle: Math.PI / 2, label: 'CAM 1' },
  { x: 1272, y: 380, baseAngle: Math.PI, label: 'CAM 2' },
];

// The getaway door. It opens only once the loot target is met.
export const EXIT = { x: 1150, y: 664, w: 118, h: 48 };

// Vent the thief slips in through, bottom-left.
export const ENTRANCE = { x: 40, y: 640, w: 70, h: 60 };

export function allBlockers() {
  return [...WALLS, ...COVER];
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Wall lamps: pure light, no gameplay on their own — but standing in one's
// pool is the most exposed place in the room. Each hangs over something the
// thief wants, so loot is always lit.
export const LAMPS = [
  { x: 250, y: 128 },   // over painting A
  { x: 640, y: 122 },   // over painting B
  { x: 1000, y: 128 },  // over painting C
  { x: 640, y: 420 },   // over the Starlight Gems
  { x: 1140, y: 150 },  // over the vault
  { x: 640, y: 330 },   // centre gallery
  { x: 1180, y: 600 },  // over the exit approach
];

export function inLamplight(x, y) {
  return LAMPS.some((l) => Math.hypot(x - l.x, y - l.y) < 130);
}

export function inShadow(x, y) {
  return SHADOWS.some((s) => pointInRect(x, y, s));
}

export function inGrass(x, y) {
  return GRASS.some((g) => pointInRect(x, y, g));
}

export function onCreaky(x, y) {
  return CREAKY.some((c) => pointInRect(x, y, c));
}

/**
 * Patrol legs with readable timings: for each guard, the seconds each leg
 * of the beat takes at patrol speed, so the thief can read before moving
 * when a guard will be where. Deterministic: pure geometry.
 */
export function patrolLegs() {
  return PATROLS.map((p) => {
    const legs = [];
    for (let i = 0; i < p.waypoints.length; i += 1) {
      const [x1, y1] = p.waypoints[i];
      const [x2, y2] = p.waypoints[(i + 1) % p.waypoints.length];
      legs.push({ from: [x1, y1], to: [x2, y2], seconds: Math.hypot(x2 - x1, y2 - y1) / p.speed });
    }
    return legs;
  });
}

/** True when the straight line from (x1,y1) to (x2,y2) is blocked by a wall, cover or pillar. */
export function lineBlocked(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    if (allBlockers().some((r) => pointInRect(px, py, r))) return true;
    if (PILLARS.some((p) => Math.hypot(px - p.x, py - p.y) < p.r)) return true;
  }
  return false;
}

/** Push a circle (x, y, radius) out of every solid rect, pillar and the play bounds. */
export function resolveCircle(x, y, radius) {
  let nx = Math.max(PLAY.x + radius, Math.min(PLAY.x + PLAY.width - radius, x));
  let ny = Math.max(PLAY.y + radius, Math.min(PLAY.y + PLAY.height - radius, y));
  for (const r of allBlockers()) {
    const cx = Math.max(r.x, Math.min(nx, r.x + r.w));
    const cy = Math.max(r.y, Math.min(ny, r.y + r.h));
    const dx = nx - cx;
    const dy = ny - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) { ny = r.y - radius; continue; }
      const d = Math.sqrt(d2);
      nx = cx + (dx / d) * radius;
      ny = cy + (dy / d) * radius;
    }
  }
  for (const p of PILLARS) {
    const dx = nx - p.x;
    const dy = ny - p.y;
    const d = Math.hypot(dx, dy);
    const min = p.r + radius;
    if (d < min && d > 0) {
      nx = p.x + (dx / d) * min;
      ny = p.y + (dy / d) * min;
    }
  }
  return { x: nx, y: ny };
}
