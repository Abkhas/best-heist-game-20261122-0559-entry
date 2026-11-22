// The Midnight Vault — guards on patrol and cameras on the wall: where they
// look, how their cones sweep, and whether they can see the thief right now.
import { GUARD, CAMERA, HIDING } from './config.js';
import { PATROLS, CAMERAS, lineBlocked, inShadow, inGrass, resolveWalls } from './levels.js';

export function makeGuards() {
  return PATROLS.map((p, i) => ({
    id: i,
    waypoints: p.waypoints,
    speed: p.speed,
    x: p.waypoints[0][0],
    y: p.waypoints[0][1],
    target: 1,            // waypoint index being walked to
    facing: 0,            // radians; follows movement, sweeps while paused
    pause: 0,             // seconds left paused at a waypoint
    sweepT: 0,            // sweep clock while paused
    alert: 0,            // 0..1, how hot this guard is (drives cone colour)
    investigate: null,   // { x, y, until, kind } while a noise holds his attention
    lastSeen: null,      // { x, y } where this guard last saw the thief
    wasHot: false,       // saw the thief hot this frame, then lost him
    seenFrames: 0,       // consecutive frames this guard has seen the thief
  }));
}

export function makeCameras() {
  return CAMERAS.map((c, i) => ({
    id: i,
    x: c.x,
    y: c.y,
    baseAngle: c.baseAngle,
    label: c.label,
    t: i * 1.7,           // offset so the two cameras sweep out of phase
    disabledUntil: 0,     // game clock; EMP sets this ahead
    angle: c.baseAngle,
  }));
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Walk toward (tx, ty) at guard speed, wall-aware: the step is pushed out of
 * the partition walls, so a guard can never phase through one on patrol or
 * on an investigate walk. Returns true on arrival.
 */
function walkToward(g, tx, ty, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  const step = g.speed * dt;
  if (dist <= step) {
    const fixed = resolveWalls(tx, ty, GUARD.radius);
    g.x = fixed.x;
    g.y = fixed.y;
    g.facing = Math.atan2(dy, dx);
    return true;
  }
  const fixed = resolveWalls(g.x + (dx / dist) * step, g.y + (dy / dist) * step, GUARD.radius);
  g.x = fixed.x;
  g.y = fixed.y;
  g.facing = Math.atan2(dy, dx);
  return false;
}

/**
 * Walk one guard along its patrol. At each waypoint it stops and looks around.
 * A guard with an investigate target walks off patrol to look at the noise
 * instead, then resumes his beat. A guard who saw the thief hot and lost him
 * walks to where he last saw him, then resumes his beat.
 */
export function updateGuard(g, dt, state) {
  if (g.investigate) {
    if (state && state.time > g.investigate.until) {
      g.investigate = null;
    } else {
      const arrived = walkToward(g, g.investigate.x, g.investigate.y, dt);
      if (arrived) {
        g.investigate = null;
        g.pause = 0.8; // look around at the spot where the noise came from
        g.sweepT = 0;
        g.baseFacing = g.facing;
      }
      return;
    }
  }
  // Lost the thief after a hot sighting: go and look where he was. The
  // sighting becomes a kind-tagged investigate, so the guard walks over,
  // looks around, then resumes his beat — the same machinery as a coin.
  if (g.wasHot && g.lastSeen && state) {
    g.wasHot = false;
    g.investigate = {
      x: g.lastSeen.x, y: g.lastSeen.y,
      until: state.time + 5, kind: 'sighting',
    };
    return;
  }
  if (g.pause > 0) {
    g.pause -= dt;
    g.sweepT += dt;
    const sweep = Math.sin((g.sweepT / GUARD.pauseSeconds) * Math.PI * 2) * GUARD.sweepArc;
    g.facing = g.baseFacing + sweep;
    if (g.pause <= 0) {
      g.target = (g.target + 1) % g.waypoints.length;
    }
    return;
  }
  const [tx, ty] = g.waypoints[g.target];
  if (walkToward(g, tx, ty, dt)) {
    g.pause = GUARD.pauseSeconds;
    g.sweepT = 0;
    g.baseFacing = g.facing;
  }
}

/** Sweep one camera's cone back and forth around its mount angle. */
export function updateCamera(cam, dt) {
  cam.t += dt;
  const phase = (cam.t % CAMERA.sweepSeconds) / CAMERA.sweepSeconds;
  const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0 -> 1 -> 0
  cam.angle = cam.baseAngle + (tri * 2 - 1) * CAMERA.sweepArc;
}

function seesTarget(ox, oy, facing, range, halfAngle, tx, ty, state) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > halfAngle) return false;
  if (lineBlocked(ox, oy, tx, ty)) return false;
  if (state.smoke && Math.hypot(tx - state.smoke.x, ty - state.smoke.y) < state.smoke.radius) {
    return false; // the thief is inside the smoke cloud
  }
  return true;
}

/**
 * Who sees the thief this frame. Returns { guard: bool, camera: bool }.
 * A thief standing in shadow is spotted only at close range.
 */
export function detectThief(state) {
  const t = state.thief;
  // Sight range follows the thief's cover, multiplicatively: deep shadow
  // and tall grass each shrink it, sneaking shrinks it further. Lamplight
  // does not widen it — the lamp is the HUD meter's business, not the
  // cones'. A thief in both shadow and grass is very hard to spot.
  const shadowed = inShadow(t.x, t.y);
  const grassed = inGrass(t.x, t.y);
  let factor = 1;
  if (shadowed) factor *= HIDING.shadow;
  if (grassed) factor *= HIDING.grass;
  if (state.sneaking) factor *= HIDING.sneak;
  let guard = false;
  let camera = false;
  for (const g of state.guards) {
    const range = GUARD.coneRange * factor;
    if (seesTarget(g.x, g.y, g.facing, range, GUARD.coneHalfAngle, t.x, t.y, state)) {
      guard = true;
      g.alert = Math.min(1, g.alert + 0.12);
      g.lastSeen = { x: t.x, y: t.y };
      g.seenFrames += 1;
    } else {
      // Hot, sustained, and then lost: walk to where he last saw the thief.
      if (g.alert > 0.5 && g.lastSeen && !g.investigate && g.seenFrames >= 45) {
        g.wasHot = true;
      }
      g.seenFrames = 0;
      g.alert = Math.max(0, g.alert - 0.05);
    }
  }
  for (const cam of state.cameras) {
    if (state.time >= cam.disabledUntil) {
      const range = CAMERA.range * factor;
      if (seesTarget(cam.x, cam.y, cam.angle, range, CAMERA.halfAngle, t.x, t.y, state)) {
        camera = true;
      }
    }
  }
  return { guard, camera };
}

/** A guard close enough to grab the thief ends the run at once. */
export function guardCaught(state) {
  const t = state.thief;
  return state.guards.some((g) => Math.hypot(g.x - t.x, g.y - t.y) < GUARD.catchRadius);
}
