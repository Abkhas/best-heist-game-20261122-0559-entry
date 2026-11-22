// The Midnight Vault — the game loop: fixed-step simulation, input, rendering,
// and the ?shot= scenes the screenshots are taken from.
import { VIEW } from './config.js';
import {
  createState, resetRun, moveThief, useTool, stepGame,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSE,
} from './state.js';
import { render } from './render.js';
import { createInput } from './input.js';
import {
  ensureAudio, toggleMute, playPickup, playVault, playTool,
  playCaught, playWin, setAlarmPulse,
} from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const state = createState();
let lastLoot = 0;
let lastScreen = state.screen;

const input = createInput((action) => {
  ensureAudio();
  if (action === 'mute') {
    toggleMute();
    return;
  }
  if (action === 'restart') {
    if (state.screen !== SCREEN_TITLE) resetRun(state);
    return;
  }
  if (action === 'start') {
    if (state.screen === SCREEN_TITLE) state.screen = SCREEN_PLAY;
    return;
  }
  if (action === 'click') {
    if (state.screen === SCREEN_TITLE) { state.screen = SCREEN_PLAY; return; }
    if (state.screen === SCREEN_WIN || state.screen === SCREEN_LOSE) return;
    useTool(state);
    playTool();
    return;
  }
  if (action === 'use') {
    if (state.screen === SCREEN_PLAY) { useTool(state); playTool(); }
    return;
  }
  if (action === 'tool-smoke') state.tools.selected = 'smoke';
  if (action === 'tool-emp') state.tools.selected = 'emp';
  if (action === 'tool-coin') state.tools.selected = 'coin';
});

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // A screenshot scene: play the real game forward, then hold the frame.
  applyShot(state, shot);
} else {
  state.screen = SCREEN_TITLE;
}

const STEP = 1 / 60;
let acc = 0;
let last = performance.now();
let paused = false;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state.screen === SCREEN_PLAY && !shot && !paused) {
    acc += dt;
    while (acc >= STEP) {
      const dir = input.moveDirection();
      moveThief(state, dir.dx, dir.dy, STEP);
      stepGame(state, STEP);
      acc -= STEP;
    }
  }
  // Sound cues on state changes.
  if (state.lootValue > lastLoot) {
    if (state.vaultOpen) playVault(); else playPickup();
    lastLoot = state.lootValue;
  }
  if (state.screen !== lastScreen) {
    if (state.screen === SCREEN_WIN) playWin();
    if (state.screen === SCREEN_LOSE) playCaught();
    lastScreen = state.screen;
  }
  setAlarmPulse(state.screen === SCREEN_PLAY && state.seen);
  render(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test hook: the play-test drives the real game through this handle.
window.__heist = {
  state,
  start: () => { state.screen = SCREEN_PLAY; },
  reset: () => resetRun(state),
  move: (dx, dy, seconds) => {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) {
      moveThief(state, dx, dy, STEP);
      stepGame(state, STEP);
      if (state.screen !== SCREEN_PLAY) break;
    }
  },
  useTool: () => useTool(state),
  pause: (on) => { paused = !!on; },
  step: (seconds) => {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) {
      stepGame(state, STEP);
      if (state.screen !== SCREEN_PLAY) break;
    }
  },
};
