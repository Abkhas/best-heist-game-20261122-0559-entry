// The Aurelius Job — the museum itself: partitions, benches, quiet corners,
// tour groups, marble that echoes, skylights, loot, patrols.
// Every route through the galleries is drawn from this one layout, so the
// thief can always pick a loud route past the guards, a shaded route through
// the quiet corners, or a middle route behind the benches and the tour groups.
import { PLAY } from './config.js';

// Solid partitions (movement + line of sight). The outer walls are the play bounds.
export const WALLS = [
  // West partition: a doorway gap between y 364 and y 460.
  { x: 420, y: 64, w: 26, h: 300 },
  { x: 420, y: 460, w: 26, h: 260 },
  // Crown Gallery partition: gap between y 480 and y 560.
  { x: 840, y: 180, w: 26, h: 300 },
  { x: 840, y: 560, w: 26, h: 160 },
  // A short mid-atrium partition that splits the centre floor.
  { x: 600, y: 480, w: 190, h: 26 },
];

// Benches and plinths: block movement and sight, hide the thief behind them.
export const COVER = [
  { x: 170, y: 180, w: 130, h: 52, label: 'bench' },
  { x: 170, y: 520, w: 130, h: 52, label: 'bench' },
  { x: 540, y: 190, w: 150, h: 52, label: 'plinth' },
  { x: 540, y: 580, w: 150, h: 52, label: 'plinth' },
  { x: 950, y: 330, w: 120, h: 52, label: 'velvet bench' },
];

// Columns: round cover the thief can circle behind.
export const PILLARS = [
  { x: 640, y: 330, r: 26 },
  { x: 300, y: 400, r: 24 },
  { x: 1060, y: 470, r: 26 },
];

// Quiet corners: shaded floor under the mezzanine where the alarm falls fast
// and the thief is harder to see.
export const SHADOWS = [
  { x: 110, y: 360, w: 190, h: 130 },
  { x: 900, y: 570, w: 200, h: 130 },
  { x: 470, y: 90, w: 180, h: 90 },
];

// Tour groups: a guide and visitors standing in a cluster. The thief inside
// one blends in and is hidden unless a watcher is close. One cluster per
// region, each sitting just off a patrol beat so a route can run through it:
// West Wing, Centre Atrium, Crown Gallery.
export const GRASS = [
  { x: 280, y: 440, w: 120, h: 80 },
  { x: 470, y: 340, w: 120, h: 80 },
  { x: 1030, y: 520, w: 130, h: 90 },
];

// Marble echo: polished bands that betray a strolling thief. The docent
// stroll (SHIFT) stays silent. Each band lies across a route the thief
// wants: the run from the paintings to the Crown Gallery, and the approach
// to the diamond case itself.
export const CREAKY = [
  { x: 430, y: 440, w: 380, h: 28 },
  { x: 900, y: 300, w: 260, h: 28 },
];

// Loot. Paintings and the diamond are grab-and-go; the Crown Case needs a
// channel to crack its glass.
export const LOOT = [
  { id: 'painting-a', kind: 'painting', x: 250, y: 128, value: 200, label: 'Harbour at Noon' },
  { id: 'painting-b', kind: 'painting', x: 640, y: 122, value: 200, label: 'The Gilded Fox' },
  { id: 'painting-c', kind: 'painting', x: 1000, y: 128, value: 200, label: 'Duchess in Gold' },
  { id: 'gems', kind: 'gems', x: 640, y: 420, value: 500, label: 'Aurelius Diamond' },
  { id: 'vault', kind: 'vault', x: 1140, y: 150, value: 1500, label: 'THE CROWN CASE' },
];

// Guard patrols: waypoints each guard walks, back and forth.
export const PATROLS = [
  { waypoints: [[470, 300], [770, 300]], speed: 56 },   // centre atrium, east of the west partition — the beat never crosses it
  { waypoints: [[170, 180], [170, 620]], speed: 50 },   // West Wing
  { waypoints: [[970, 250], [970, 640]], speed: 62 },   // Crown Gallery
];

// Wall cameras: mounted on a wall, sweeping a cone.
export const CAMERAS = [
  { x: 640, y: 70, baseAngle: Math.PI / 2, label: 'CAM 1' },
  { x: 1272, y: 380, baseAngle: Math.PI, label: 'CAM 2' },
];

// The staff exit. It opens only once the loot target is met.
export const EXIT = { x: 1150, y: 664, w: 118, h: 48 };

// The ticket desk the thief slips in through, bottom-left.
export const ENTRANCE = { x: 40, y: 640, w: 70, h: 60 };

export function allBlockers() {
  return [...WALLS, ...COVER];
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function inShadow(x, y) {
  return SHADOWS.some((s) => pointInRect(x, y, s));
}

// Skylights: pure sun, no gameplay on their own — but standing in one's pool
// is the most exposed place in the museum. Each hangs over something the
// thief wants, so loot is always lit.
export const LAMPS = [
  { x: 250, y: 128 },   // over painting A
  { x: 640, y: 122 },   // over painting B
  { x: 1000, y: 128 },  // over painting C
  { x: 640, y: 420 },   // over the Aurelius Diamond
  { x: 1140, y: 150 },  // over the Crown Case
  { x: 640, y: 330 },   // centre atrium
  { x: 1180, y: 600 },  // over the exit approach
];

export function inLamplight(x, y) {
  return LAMPS.some((l) => Math.hypot(x - l.x, y - l.y) < 130);
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

/** True when the straight line from (x1,y1) to (x2,y2) is blocked by a wall, bench or column. */
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

/** Push a circle (x, y, radius) out of every solid rect, column and the play bounds. */
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

/** Push a circle (x, y, radius) out of the partitions only, so a guard can
 *  never phase through a wall on patrol or on an investigate walk.
 *  (Benches and columns are furniture — a guard may brush them; walls are not.)
 *  A guard whose target lies across a wall slides along it and gives up when
 *  the investigate expires, then resumes his beat. */
export function resolveWalls(x, y, radius) {
  let nx = x;
  let ny = y;
  for (const r of WALLS) {
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
  return { x: nx, y: ny };
}
