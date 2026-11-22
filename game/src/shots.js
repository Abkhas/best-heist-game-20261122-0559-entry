// The Aurelius Job — staged screenshot scenes. Each one plays the real rules
// forward from a fresh visit for a fixed number of steps, steered by a small
// autopilot (walk a waypoint route, flee any guard that gets close, keep moving
// through camera cones), so every screenshot is a real render of the game's own
// code and the same scene always gives the same frame. ?shot=cover|tools|getaway|caught
import { SCREEN_PLAY } from './state.js';
import { moveThief, useTool, stepGame } from './state.js';
import { EXIT } from './levels.js';

const SAMPLE = 1 / 60;

/**
 * Walk `waypoints` in order for up to `seconds`. A guard closer than 75 px is
 * fled from outright (it could grab the thief); being seen by a guard also
 * breaks off toward safety instead of freezing in the cone. Cameras only raise
 * the alarm, so the pilot keeps walking through their cones. `sneakAt`
 * (seconds) turns the stroll on from that point in the route: slow, silent
 * on the marble, half as easy to spot.
 */
function autopilot(state, waypoints, seconds, useSmokeAt = -1, sneakAt = -1) {
  let wp = 0;
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    if (state.screen !== SCREEN_PLAY) break;
    if (sneakAt >= 0 && state.time >= sneakAt) state.sneaking = true;
    if (useSmokeAt >= 0 && state.time >= useSmokeAt && state.tools.smoke > 0 && !state.smoke) {
      state.tools.selected = 'smoke';
      useTool(state);
    }
    const t = state.thief;
    let nearest = null;
    let nd = Infinity;
    for (const g of state.guards) {
      const d = Math.hypot(g.x - t.x, g.y - t.y);
      if (d < nd) { nd = d; nearest = g; }
    }
    let mx = 0;
    let my = 0;
    // While the case channel is running, hold the spot unless a guard is
    // about to grab you — fleeing on every sighting never cracks the case.
    const channeling = state.vaultProgress > 0;
    if (nearest && ((nd < 75 && (!channeling || nd < 45))
      || (state.seenBy === 'guard' && !channeling))) {
      // Run from the guard: straight away from it, out of its cone.
      mx = t.x - nearest.x;
      my = t.y - nearest.y;
    } else {
      const [tx, ty] = waypoints[Math.min(wp, waypoints.length - 1)];
      const dx = tx - t.x;
      const dy = ty - t.y;
      if (Math.hypot(dx, dy) < 16 && wp < waypoints.length - 1) {
        wp += 1;
      } else {
        mx = dx;
        my = dy;
      }
    }
    moveThief(state, mx, my, SAMPLE);
    stepGame(state, SAMPLE);
  }
}

// Routes avoid the patrol lines: the West Wing is crossed low, the centre
// below the atrium guard's beat, the Crown Gallery through the low gap.
// The tools scene is staged, not routed: see shotTools.
const TO_PAINTING_A = [[320, 640], [320, 420], [300, 200], [250, 128]];
const TO_GEMS = [[320, 420], [433, 412], [560, 420], [640, 420]];
const TO_PAINTING_C = [[780, 520], [853, 520], [1000, 300], [1000, 128]];
const TO_VAULT = [[1140, 150]];
const TO_EXIT = [[1180, 500], [1190, 690]]; // step into the open exit: the win fires

/** The cover: mid-visit, thief deep in the galleries, cones sweeping, alarm live.
 *  The guide stays CLOSED here — the cover must read at a glance. */
function shotCover(state) {
  autopilot(state, TO_PAINTING_A, 12);
  autopilot(state, TO_GEMS, 16);
  // Slip into the tour group, face north-east toward the centre guard's
  // beat, and drop a ticket onto it: the guard leaves his patrol to look,
  // "?" over his head, while the thief sits blending in with the visitors,
  // out of the skylight. (The guard is a real walk from the ticket here —
  // his beat starts east of the west partition, so he is ~180 px away at
  // drop time, not on top of it.)
  autopilot(state, [[490, 380]], 5);
  state.thief.facing = -Math.PI / 4; // north-east, onto the guard's beat
  state.tools.selected = 'coin';
  if (state.tools.coin > 0) useTool(state);
  for (let i = 0; i < 21; i += 1) { // 0.35s: the guard is off to look, "?" up
    if (state.screen !== SCREEN_PLAY) break;
    stepGame(state, SAMPLE);
  }
  state.fieldNotes = false;
  state.alarm = Math.max(state.alarm, 42); // the afternoon is already tense
}

/** Tools: the ticket drop mid-action — gold rings bloom at the landing spot,
 *  the nearest guard walks over to look ("?", amber cone), the thief crouched
 *  in the quiet corner nearby. Staged like `caught`: positions are set, then
 *  the real useTool + stepGame play the drop and the divert forward.
 *  Staged against guard 1 (West Wing), not guard 0: the ticket is dropped
 *  across the west partition from the quiet corner, and guard 1 has a long
 *  walk to it — the "off to look" reads, instead of spawning him on top of it. */
function shotTools(state) {
  // Thief crouched in the west quiet corner (110,360,190,130), facing north
  // up the gallery toward guard 1's beat, so the ticket lands in the open.
  state.thief.x = 205;
  state.thief.y = 420;
  state.thief.facing = -Math.PI / 2;
  // Guard 1 mid-beat on the West Wing, walking south past the corner.
  const g1 = state.guards[1];
  g1.x = 170;
  g1.y = 420;
  g1.target = 1;
  g1.pause = 0;
  g1.facing = Math.PI / 2;
  g1.baseFacing = Math.PI / 2;
  // The real drop: the ticket flutters 120 px ahead and lands at (205, 300);
  // guard 1 is the nearest in earshot and walks over to look at it.
  state.tools.selected = 'coin';
  useTool(state);
  // Step 1.2 s: the rings are at full spread, the guard is well on his way
  // with "?" up and an amber cone on the ticket, the toast is still up, and
  // the thief is still unseen in the shade.
  for (let i = 0; i < 72; i += 1) stepGame(state, SAMPLE);
}

/** The getaway: case cracked, haul over target, thief racing for the exit. */
function shotGetaway(state) {
  autopilot(state, TO_PAINTING_A, 12);
  autopilot(state, TO_GEMS, 16);
  // Stroll through the Crown Gallery: guard 2's beat is tight, and the
  // marble bands on the approach stay silent under a strolling thief.
  autopilot(state, TO_PAINTING_C, 14, -1, 0);
  autopilot(state, TO_VAULT, 12, -1, 0); // stand by the case; the channel cracks it
  const vault = state.loot.find((l) => l.id === 'vault');
  if (vault && !vault.taken) {
    // Staging fallback: the frame is the getaway, whatever the channel did.
    state.vaultOpen = true;
    state.vaultProgress = 1;
    vault.taken = true;
    state.lootValue += vault.value;
    state.stats.lootTaken += 1;
  }
  autopilot(state, TO_EXIT, 10);
}

/** Caught: the alarm maxes out and the visit ends in handcuffs. */
function shotCaught(state) {
  autopilot(state, [[320, 640], [500, 300]], 8);
  state.thief.x = 640;
  state.thief.y = 300;
  state.alarm = 100;
  stepGame(state, SAMPLE);
}

/** Run a named scene on a fresh play state; returns the state to render. */
export function applyShot(state, name) {
  state.screen = SCREEN_PLAY;
  const shots = { cover: shotCover, tools: shotTools, getaway: shotGetaway, caught: shotCaught };
  const fn = shots[name] || shots.cover;
  fn(state);
  return state;
}
