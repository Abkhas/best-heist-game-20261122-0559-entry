// The Midnight Vault — the run's state: the thief, the alarm, the loot, the
// tools, and what ends the night in a win or a pair of handcuffs.
import {
  THIEF, ALARM, TOOLS, COIN, VAULT_CHANNEL_SECONDS, LOOT_TARGET, TIME_LIMIT_SECONDS,
} from './config.js';
import { LOOT, EXIT, inShadow, resolveCircle } from './levels.js';
import { makeGuards, makeCameras, updateGuard, updateCamera, detectThief, guardCaught } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

export function createState() {
  return {
    screen: SCREEN_TITLE,
    time: 0,                 // seconds since the run started
    timeLeft: TIME_LIMIT_SECONDS,
    thief: { x: THIEF.startX, y: THIEF.startY, moving: false, facing: 0 },
    guards: makeGuards(),
    cameras: makeCameras(),
    loot: LOOT.map((l) => ({ ...l, taken: false })),
    lootValue: 0,
    alarm: 0,
    seen: false,             // any watcher sees the thief this frame
    seenBy: 'none',          // 'guard' | 'camera' | 'none'
    smoke: null,             // { x, y, radius, until } or null
    coin: null,              // { x, y, until, landedAt } or null
    tools: { smoke: TOOLS.smoke.count, emp: TOOLS.emp.count, coin: TOOLS.coin.count, selected: 'smoke' },
    vaultProgress: 0,        // 0..1 channel on the vault
    vaultOpen: false,
    message: '',             // one-line toast shown over the room
    messageUntil: 0,
    caughtBy: '',            // 'alarm' | 'guard' | 'dawn'
    winHaul: 0,
    winTime: 0,
    stats: { spottedSeconds: 0, toolsUsed: 0, lootTaken: 0 },
  };
}

export function resetRun(state) {
  const fresh = createState();
  fresh.screen = SCREEN_PLAY;
  Object.assign(state, fresh);
}

function toast(state, text, seconds = 2.2) {
  state.message = text;
  state.messageUntil = state.time + seconds;
}

/** Move the thief with a normalized (dx, dy) direction for dt seconds. */
export function moveThief(state, dx, dy, dt) {
  const t = state.thief;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) { t.moving = false; return; }
  const speed = inShadow(t.x, t.y) ? THIEF.shadowSpeed : THIEF.speed;
  const nx = t.x + (dx / len) * speed * dt;
  const ny = t.y + (dy / len) * speed * dt;
  const fixed = resolveCircle(nx, ny, THIEF.radius);
  t.x = fixed.x;
  t.y = fixed.y;
  t.moving = true;
  t.facing = Math.atan2(dy, dx); // where the thief last walked: the coin flies this way
}

/** Use the selected tool where the thief stands. */
export function useTool(state) {
  if (state.screen !== SCREEN_PLAY) return;
  if (state.tools.selected === 'smoke') {
    if (state.tools.smoke <= 0) { toast(state, 'No smoke pellets left'); return; }
    state.tools.smoke -= 1;
    state.smoke = {
      x: state.thief.x, y: state.thief.y,
      radius: TOOLS.smoke.radius, until: state.time + TOOLS.smoke.seconds,
    };
    state.stats.toolsUsed += 1;
    toast(state, 'Smoke out — slip past while they cannot see');
  } else if (state.tools.selected === 'coin') {
    if (state.tools.coin <= 0) { toast(state, 'No coins left'); return; }
    state.tools.coin -= 1;
    // The coin flies ahead of the thief and clinks on the floor; the
    // nearest guard in earshot walks over to look at it.
    const land = resolveCircle(
      state.thief.x + Math.cos(state.thief.facing) * COIN.throwDistance,
      state.thief.y + Math.sin(state.thief.facing) * COIN.throwDistance,
      6,
    );
    state.coin = { x: land.x, y: land.y, until: state.time + COIN.investigateSeconds, landedAt: state.time };
    state.stats.toolsUsed += 1;
    toast(state, 'Coin tossed — a guard goes to look');
  } else {
    if (state.tools.emp <= 0) { toast(state, 'EMP charges spent'); return; }
    state.tools.emp -= 1;
    for (const cam of state.cameras) cam.disabledUntil = state.time + TOOLS.emp.seconds;
    state.stats.toolsUsed += 1;
    toast(state, 'EMP burst — cameras blind for 9 seconds');
  }
}

/** Pick up loot the thief is touching; channel the vault while standing by it. */
function collectLoot(state, dt) {
  const t = state.thief;
  for (const item of state.loot) {
    if (item.taken) continue;
    const d = Math.hypot(t.x - item.x, t.y - item.y);
    if (item.kind === 'vault') {
      if (d < 70 && !state.vaultOpen) {
        state.vaultProgress += dt / VAULT_CHANNEL_SECONDS;
        if (state.vaultProgress >= 1) {
          state.vaultOpen = true;
          item.taken = true;
          state.lootValue += item.value;
          state.stats.lootTaken += 1;
          toast(state, `Vault cracked — $${item.value.toLocaleString()}! Get to the exit`, 3);
        }
      } else {
        state.vaultProgress = Math.max(0, state.vaultProgress - dt * 2);
      }
      continue;
    }
    if (d < 46) {
      item.taken = true;
      state.lootValue += item.value;
      state.stats.lootTaken += 1;
      toast(state, `${item.label} pocketed — $${item.value}`);
    }
  }
}

/** One simulation step. Called with a fixed dt from the game loop. */
export function stepGame(state, dt) {
  if (state.screen !== SCREEN_PLAY) return;
  state.time += dt;
  state.timeLeft = Math.max(0, TIME_LIMIT_SECONDS - state.time);

  // An alarm already at the max ends the run at once, before it can decay.
  if (state.alarm >= ALARM.max) {
    state.screen = SCREEN_LOSE;
    state.caughtBy = 'alarm';
    return;
  }

  // A live coin pulls the nearest guard in earshot off patrol to look.
  // One coin, one guard: once claimed, the coin holds no one else.
  if (state.coin && state.time >= state.coin.until) state.coin = null;
  if (state.coin && !state.coin.claimed) {
    let nearest = null;
    let nd = Infinity;
    for (const g of state.guards) {
      const d = Math.hypot(g.x - state.coin.x, g.y - state.coin.y);
      if (d < nd) { nd = d; nearest = g; }
    }
    if (nearest && nd <= COIN.investigateRadius) {
      nearest.investigate = { x: state.coin.x, y: state.coin.y, until: state.coin.until };
      state.coin.claimed = true;
    }
  }
  for (const g of state.guards) updateGuard(g, dt, state);
  for (const cam of state.cameras) updateCamera(cam, dt);
  if (state.smoke && state.time >= state.smoke.until) state.smoke = null;

  const seen = detectThief(state);
  state.seen = seen.guard || seen.camera;
  state.seenBy = seen.guard ? 'guard' : seen.camera ? 'camera' : 'none';
  if (state.seen) {
    const rise = (seen.guard ? ALARM.riseGuard : 0) + (seen.camera ? ALARM.riseCamera : 0);
    state.alarm = Math.min(ALARM.max, state.alarm + rise * dt);
    state.stats.spottedSeconds += dt;
  } else {
    const fall = inShadow(state.thief.x, state.thief.y) ? ALARM.fallShadow : ALARM.fallHidden;
    state.alarm = Math.max(0, state.alarm - fall * dt);
  }

  collectLoot(state, dt);

  if (state.alarm >= ALARM.max) {
    state.screen = SCREEN_LOSE;
    state.caughtBy = 'alarm';
    return;
  }
  if (guardCaught(state)) {
    state.screen = SCREEN_LOSE;
    state.caughtBy = 'guard';
    return;
  }
  if (state.timeLeft <= 0) {
    state.screen = SCREEN_LOSE;
    state.caughtBy = 'dawn';
    return;
  }
  // The exit opens once the target haul is met.
  const t = state.thief;
  if (state.lootValue >= LOOT_TARGET
    && t.x > EXIT.x && t.x < EXIT.x + EXIT.w
    && t.y > EXIT.y && t.y < EXIT.y + EXIT.h) {
    state.screen = SCREEN_WIN;
    state.winHaul = state.lootValue;
    state.winTime = state.time;
  }
}

export function exitOpen(state) {
  return state.lootValue >= LOOT_TARGET;
}
