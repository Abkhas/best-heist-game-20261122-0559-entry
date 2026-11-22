// The Midnight Vault — staged screenshot scenes. Each one plays the real rules
// forward from a fresh run for a fixed number of steps, steered by a small
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
 * (seconds) turns the sneak on from that point in the route: slow, silent
 * on the creaky boards, half as easy to spot.
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
    // While the vault channel is running, hold the spot unless a guard is
    // about to grab you — fleeing on every sighting never cracks the vault.
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

// Routes avoid the patrol lines: the west wing is crossed low, the centre
// below the gallery guard's beat, the vault chamber through the low gap.
// The tools scene is staged, not routed: see shotTools.
const TO_PAINTING_A = [[320, 640], [320, 420], [300, 200], [250, 128]];
const TO_GEMS = [[320, 420], [433, 412], [560, 420], [640, 420]];
const TO_PAINTING_C = [[780, 520], [853, 520], [1000, 300], [1000, 128]];
const TO_VAULT = [[1140, 150]];
const TO_EXIT = [[1180, 500], [1190, 690]]; // step into the open exit: the win fires

/** The cover: mid-heist, thief deep in the gallery, cones sweeping, alarm live. */
function shotCover(state) {
  autopilot(state, TO_PAINTING_A, 12);
  autopilot(state, TO_GEMS, 16);
  // Slip into the tall grass, face north-east toward the centre guard's
  // beat, and toss a coin onto it: the guard leaves his patrol to look,
  // "What was that?" over his head, while the thief sits hidden in the
  // grass, out of the lamplight. Field notes open. (The guard is a real
  // walk from the coin here — his beat starts east of the left wall, so
  // he is ~180 px away at toss time, not on top of it.)
  autopilot(state, [[490, 380]], 5);
  state.thief.facing = -Math.PI / 4; // north-east, onto the guard's beat
  state.tools.selected = 'coin';
  if (state.tools.coin > 0) useTool(state);
  for (let i = 0; i < 21; i += 1) { // 0.35s: the guard is off to look, "?" up
    if (state.screen !== SCREEN_PLAY) break;
    stepGame(state, SAMPLE);
  }
  state.fieldNotes = true;
  state.alarm = Math.max(state.alarm, 42); // the night is already tense
}

/** Tools: the coin toss mid-action — gold rings bloom at the landing spot, the
 *  nearest guard walks over to look ("?", amber cone), the thief crouched in
 *  the shadow pool nearby. Staged like `caught`: positions are set, then the
 *  real useTool + stepGame play the toss and the divert forward.
 *  Staged against guard 1 (west wing), not guard 0: the coin is tossed
 *  across the west wall from the shadow pool, and guard 1 has a long walk
 *  to it — the "off to look" reads, instead of spawning him on top of it. */
function shotTools(state) {
  // Thief crouched in the west shadow pool (110,360,190,130), facing north
  // up the gallery toward guard 1's beat, so the coin lands in the open.
  state.thief.x = 205;
  state.thief.y = 420;
  state.thief.facing = -Math.PI / 2;
  // Guard 1 mid-beat on the west wing, walking south past the pool.
  const g1 = state.guards[1];
  g1.x = 170;
  g1.y = 420;
  g1.target = 1;
  g1.pause = 0;
  g1.facing = Math.PI / 2;
  g1.baseFacing = Math.PI / 2;
  // The real toss: the coin flies 120 px ahead and clinks down at (205, 300);
  // guard 1 is the nearest in earshot and walks over to look at it.
  state.tools.selected = 'coin';
  useTool(state);
  // Step 1.2 s: the rings are at full spread, the guard is well on his way
  // with "?" up and an amber cone on the coin, the toast is still up, and
  // the thief is still unseen in the dark.
  for (let i = 0; i < 72; i += 1) stepGame(state, SAMPLE);
}

/** The getaway: vault cracked, haul over target, thief racing for the exit. */
function shotGetaway(state) {
  autopilot(state, TO_PAINTING_A, 12);
  autopilot(state, TO_GEMS, 16);
  // Sneak through the vault chamber: guard 2's beat is tight, and the
  // creaky boards on the approach stay silent under a sneaking thief.
  autopilot(state, TO_PAINTING_C, 14, -1, 0);
  autopilot(state, TO_VAULT, 12, -1, 0); // stand by the vault; the channel cracks it
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

/** Caught: the alarm maxes out and the run ends in handcuffs. */
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
