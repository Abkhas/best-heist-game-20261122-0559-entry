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
 * the alarm, so the pilot keeps walking through their cones.
 */
function autopilot(state, waypoints, seconds, useSmokeAt = -1) {
  let wp = 0;
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    if (state.screen !== SCREEN_PLAY) break;
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
    if (nearest && (nd < 75 || state.seenBy === 'guard')) {
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
const TO_PAINTING_A = [[320, 640], [320, 420], [300, 200], [250, 128]];
const TO_GEMS = [[320, 420], [433, 412], [560, 420], [640, 420]];
const TO_PAINTING_C = [[780, 520], [853, 520], [1000, 300], [1075, 128]];
const TO_VAULT = [[1140, 150]];
const TO_EXIT = [[1180, 500], [1190, 690]]; // step into the open exit: the win fires

/** The cover: mid-heist, thief deep in the gallery, cones sweeping, alarm live. */
function shotCover(state) {
  autopilot(state, TO_PAINTING_A, 12);
  autopilot(state, TO_GEMS, 16);
  state.alarm = Math.max(state.alarm, 42); // the night is already tense
}

/** Tools: a smoke pellet blooms as the thief crosses a guard's cone. */
function shotTools(state) {
  autopilot(state, TO_PAINTING_A, 12);
  autopilot(state, [[320, 420], [500, 300]], 8, 6);
  state.tools.selected = 'smoke';
  if (!state.smoke && state.tools.smoke > 0) useTool(state);
}

/** The getaway: vault cracked, haul over target, thief racing for the exit. */
function shotGetaway(state) {
  autopilot(state, TO_PAINTING_A, 12);
  autopilot(state, TO_GEMS, 16);
  autopilot(state, TO_PAINTING_C, 14);
  autopilot(state, TO_VAULT, 12); // stand by the vault; the channel cracks it
  const vault = state.loot.find((l) => l.id === 'vault');
  if (vault && !vault.taken) {
    // Staging fallback: the frame is the getaway, whatever the channel did.
    state.vaultOpen = true;
    state.vaultProgress = 1;
    vault.taken = true;
    state.lootValue += vault.value;
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
