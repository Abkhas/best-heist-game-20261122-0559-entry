// The Aurelius Job — everything the eye sees, daylight-museum edition.
// One bright museum at noon, drawn like a visitor's floor plan: pale parquet
// floors and cream partitions, gold pools of skylight where you are seen,
// shaded quiet corners where you vanish, tour groups to blend into, marble
// bands that echo, saturated red danger cones, glass cases with treasure
// visible inside, and a gallery guide that says what the light means.
// Safe, danger, hidden and noise must read at a glance.
import { VIEW, HUD_H, COLORS, ALARM, LOOT_TARGET, TOOLS } from './config.js';
import {
  WALLS, COVER, PILLARS, SHADOWS, GRASS, CREAKY, LAMPS, CAMERAS, EXIT, ENTRANCE,
  inShadow, inGrass, patrolLegs,
} from './levels.js';
import { GUARD, CAMERA } from './config.js';
import { SCREEN_TITLE, SCREEN_WIN, SCREEN_LOSE, exitOpen } from './state.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The three galleries: pale parquet, each zone its own tint + a big name. */
function drawFloor(ctx) {
  ctx.fillStyle = COLORS.floorWest;
  ctx.fillRect(0, HUD_H, 446, VIEW.height - HUD_H);
  ctx.fillStyle = COLORS.floorCentre;
  ctx.fillRect(446, HUD_H, 420, VIEW.height - HUD_H);
  ctx.fillStyle = COLORS.floorCrown;
  ctx.fillRect(866, HUD_H, 414, VIEW.height - HUD_H);
  // Parquet seams: thin lines every 64 px, faint.
  ctx.strokeStyle = 'rgba(120,90,40,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 64; x < VIEW.width; x += 64) {
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, VIEW.height);
  }
  for (let y = HUD_H + 64; y < VIEW.height; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y);
  }
  ctx.stroke();
  // Gallery names, big and quiet, along the top of each zone.
  ctx.fillStyle = 'rgba(90,66,32,0.55)';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('WEST WING', 24, HUD_H + 34);
  ctx.fillText('CENTRE ATRIUM', 470, HUD_H + 34);
  ctx.fillText('CROWN GALLERY', 890, HUD_H + 34);
  // The ticket desk where the thief slips in.
  ctx.fillStyle = '#6b4e2e';
  roundRect(ctx, ENTRANCE.x, ENTRANCE.y, ENTRANCE.w, ENTRANCE.h, 6);
  ctx.fill();
  ctx.fillStyle = COLORS.textLight;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('TICKETS', ENTRANCE.x + ENTRANCE.w / 2, ENTRANCE.y + 24);
  ctx.fillText('DESK', ENTRANCE.x + ENTRANCE.w / 2, ENTRANCE.y + 42);
}

/** Dotted patrol rings with the seconds each leg takes, so the thief reads
 *  the beat before moving. */
function drawPatrols(ctx, state) {
  const legs = patrolLegs();
  ctx.save();
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 2;
  state.guards.forEach((g, gi) => {
    ctx.strokeStyle = 'rgba(140,90,20,0.75)';
    ctx.beginPath();
    const wps = g.waypoints;
    ctx.moveTo(wps[0][0], wps[0][1]);
    for (let i = 1; i < wps.length; i += 1) ctx.lineTo(wps[i][0], wps[i][1]);
    ctx.stroke();
    legs[gi].forEach((leg) => {
      const mx = (leg.from[0] + leg.to[0]) / 2;
      const my = (leg.from[1] + leg.to[1]) / 2;
      // Keep the label off the beat line so it never sits on a zone name:
      // vertical legs shift right, horizontal legs shift up.
      const vertical = Math.abs(leg.to[0] - leg.from[0]) < Math.abs(leg.to[1] - leg.from[1]);
      const lx = vertical ? mx + 46 : mx;
      const ly = vertical ? my : my - 22;
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff8e6';
      ctx.strokeStyle = '#8a5a14';
      ctx.lineWidth = 1.5;
      roundRect(ctx, lx - 26, ly - 13, 52, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5a3a08';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${leg.seconds.toFixed(1)}s`, lx, ly + 5);
      ctx.setLineDash([2, 7]);
    });
  });
  ctx.restore();
}

/** Skylight pools: bright sun on the floor. Standing in one is the most
 *  exposed place in the museum. */
function drawSkylightPools(ctx) {
  for (const l of LAMPS) {
    ctx.save();
    ctx.fillStyle = COLORS.skylight;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, 118, 84, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,150,60,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, 118, 84, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Quiet corners: shaded alcoves under the mezzanine. The alarm falls fast
 *  here and the thief is hard to see. */
function drawQuietCorners(ctx) {
  for (const s of SHADOWS) {
    ctx.fillStyle = COLORS.shadow;
    roundRect(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,52,28,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    roundRect(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(60,44,22,0.8)';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUIET CORNER', s.x + s.w / 2, s.y + 24);
  }
}

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Tour groups: a guide with a flag and visitors in a cluster. The thief
 *  inside one blends in. Drawn twice: behind the actors, then in front. */
function drawTourGroups(ctx, foreground, state) {
  for (const g of GRASS) {
    if (!foreground) {
      ctx.fillStyle = 'rgba(74,122,92,0.14)';
      roundRect(ctx, g.x, g.y, g.w, g.h, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(74,122,92,0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      roundRect(ctx, g.x, g.y, g.w, g.h, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(40,80,55,0.85)';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('TOUR GROUP', g.x + g.w / 2, g.y + 20);
      // The guide: tall, flag up.
      const gx = g.x + 24;
      const gy = g.y + g.h / 2 + 6;
      ctx.strokeStyle = '#2c4a38';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx, gy - 26);
      ctx.lineTo(gx, gy + 8);
      ctx.stroke();
      ctx.fillStyle = '#c62f2f';
      ctx.beginPath();
      ctx.moveTo(gx, gy - 26);
      ctx.lineTo(gx + 16, gy - 21);
      ctx.lineTo(gx, gy - 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c4a38';
      ctx.beginPath();
      ctx.arc(gx, gy - 2, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Visitors: small heads and shoulders, deterministic pseudo-random.
      for (let i = 0; i < 5; i += 1) {
        const vx = g.x + 48 + hash2(g.x, i) * (g.w - 60);
        const vy = g.y + 26 + hash2(g.y, i) * (g.h - 44);
        const shirt = ['#7a5a9e', '#3f6d8e', '#a8542e', '#5c7a3a', '#96507a'][i];
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.arc(vx, vy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8c39a';
        ctx.beginPath();
        ctx.arc(vx, vy - 3, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Marble echo bands: polished strips that betray a strolling thief. */
function drawMarbleEcho(ctx) {
  for (const c of CREAKY) {
    ctx.fillStyle = COLORS.marble;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(140,110,60,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(110,84,40,0.75)';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('M A R B L E   ·   E C H O', c.x + c.w / 2, c.y + 19);
  }
}

/** The expanding ring where an echo pulse fired. */
function drawNoise(ctx, state) {
  if (!state.noise) return;
  const age = state.time - (state.noise.until - 0.9);
  const r = 12 + age * 90;
  ctx.save();
  ctx.strokeStyle = `rgba(198,47,47,${Math.max(0, 0.8 - age)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(state.noise.x, state.noise.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The gallery guide: the legend panel. H toggles; OFF in live play. */
function drawGuide(ctx, state) {
  if (!state.fieldNotes) return;
  const x = 24;
  const y = HUD_H + 12;
  const w = 330;
  const h = 250;
  ctx.fillStyle = 'rgba(247,239,221,0.97)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#8a6f4d';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 19px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('GALLERY GUIDE', x + 16, y + 30);
  ctx.font = '15px Georgia, serif';
  const lines = [
    'Red cone — a guard is looking',
    'Amber cone — a camera is sweeping',
    'Sun pool — you are fully seen',
    'Quiet corner — alarm falls fast',
    'Tour group — blend in, hard to spot',
    'Marble band — echoes unless you stroll',
    'SHIFT — docent stroll (slow, silent)',
    '1 / 2 / 3 — FLASH · JAMMER · TICKET',
    'SPACE — use the tool in hand',
    'Goal: $1,000, then the STAFF EXIT',
  ];
  lines.forEach((line, i) => {
    ctx.fillText('· ' + line, x + 16, y + 58 + i * 19);
  });
}

/** Partitions, benches, plinths and columns. */
function drawWallsAndCover(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 6);
    ctx.strokeStyle = 'rgba(60,42,20,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
  for (const c of COVER) {
    const isBench = c.label.includes('bench');
    ctx.fillStyle = isBench ? '#7a2e2e' : '#d8c9a3';
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,42,20,0.55)';
    ctx.lineWidth = 2;
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.stroke();
    if (!isBench) {
      // A plinth carries a small sculpture.
      ctx.fillStyle = '#8a7a5a';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 4, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const p of PILLARS) {
    ctx.fillStyle = '#cbb98e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6f4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a98f68';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r - 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function halo(ctx, x, y, radius, alpha) {
  const g = ctx.createRadialGradient(x, y, 4, x, y, radius);
  g.addColorStop(0, `rgba(230,168,23,${alpha})`);
  g.addColorStop(1, 'rgba(230,168,23,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Loot: framed paintings on the walls, the diamond on its plinth, and the
 *  Crown Case with its crack progress. */
function drawLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    if (item.kind === 'painting') {
      halo(ctx, item.x, item.y, 54, 0.5);
      ctx.fillStyle = '#f7efdd';
      ctx.fillRect(item.x - 34, item.y - 24, 68, 48);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 4;
      ctx.strokeRect(item.x - 34, item.y - 24, 68, 48);
      ctx.fillStyle = item.id === 'painting-a' ? '#3f6d8e' : item.id === 'painting-b' ? '#a8542e' : '#4a7a5c';
      ctx.fillRect(item.x - 28, item.y - 18, 56, 36);
      ctx.fillStyle = '#f7efdd';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${item.value}`, item.x, item.y + 38);
    } else if (item.kind === 'gems') {
      halo(ctx, item.x, item.y, 64, 0.7);
      ctx.fillStyle = '#d8c9a3';
      ctx.fillRect(item.x - 26, item.y - 8, 52, 16);
      ctx.fillStyle = '#7fd4ff';
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 26);
      ctx.lineTo(item.x + 16, item.y - 8);
      ctx.lineTo(item.x, item.y + 6);
      ctx.lineTo(item.x - 16, item.y - 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${item.value}`, item.x, item.y + 34);
    } else {
      // The Crown Case: a tall glass case, gold inside, with the crack bar.
      halo(ctx, item.x, item.y, 76, 0.7);
      ctx.fillStyle = 'rgba(247,239,221,0.9)';
      roundRect(ctx, item.x - 44, item.y - 52, 88, 104, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 4;
      roundRect(ctx, item.x - 44, item.y - 52, 88, 104, 8);
      ctx.stroke();
      ctx.fillStyle = COLORS.goldBright;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 34);
      ctx.lineTo(item.x + 20, item.y - 6);
      ctx.lineTo(item.x, item.y + 18);
      ctx.lineTo(item.x - 20, item.y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE CROWN CASE', item.x, item.y - 64);
      ctx.fillText(`$${item.value}`, item.x, item.y + 70);
      if (state.vaultProgress > 0 && !state.vaultOpen) {
        ctx.fillStyle = '#e0d4b4';
        ctx.fillRect(item.x - 40, item.y + 78, 80, 10);
        ctx.fillStyle = COLORS.goldBright;
        ctx.fillRect(item.x - 40, item.y + 78, 80 * state.vaultProgress, 10);
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 13px Georgia, serif';
        ctx.fillText('CRACKING…', item.x, item.y + 104);
      }
    }
  }
}

/** The staff exit: shut until the haul target is met. */
function drawExit(ctx, state) {
  const open = exitOpen(state);
  ctx.fillStyle = open ? COLORS.safe : '#8a2f2f';
  roundRect(ctx, EXIT.x, EXIT.y, EXIT.w, EXIT.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#f7efdd';
  ctx.lineWidth = 3;
  roundRect(ctx, EXIT.x, EXIT.y, EXIT.w, EXIT.h, 8);
  ctx.stroke();
  ctx.fillStyle = '#f7efdd';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('STAFF EXIT', EXIT.x + EXIT.w / 2, EXIT.y + 21);
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(open ? 'OPEN — GO!' : 'LOCKED · $1,000', EXIT.x + EXIT.w / 2, EXIT.y + 40);
}

function coneFill(ctx, x, y, range, hot, mid) {
  return hot > 0.5 ? 'rgba(198,47,47,0.42)' : mid ? 'rgba(230,140,30,0.34)' : COLORS.dangerSoft;
}

/** Guard cones (red, amber when investigating) and camera cones (amber). */
function drawCones(ctx, state) {
  for (const g of state.guards) {
    drawCone(ctx, g.x, g.y, g.facing, GUARD.coneRange, GUARD.coneHalfAngle,
      coneFill(ctx, g.x, g.y, GUARD.coneRange, g.alert, !!g.investigate));
  }
  for (const cam of state.cameras) {
    if (state.time < cam.disabledUntil) continue;
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, COLORS.cameraCone);
  }
}

/** Wall cameras: small mounts with a sweeping eye. */
function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    const off = state.time < cam.disabledUntil;
    ctx.fillStyle = off ? '#9a8a6a' : '#3a3230';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = off ? '#6a5a42' : COLORS.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = off ? '#6a5a42' : COLORS.danger;
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 6, cam.y + Math.sin(cam.angle) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    // Clamp the label inside the canvas: CAM 2 mounts at the right edge.
    ctx.fillText(cam.label, Math.min(cam.x, 1230), cam.y - 20);
  }
}

/** Guards: navy uniforms, a "?" when they go to look, and a dotted thread
 *  to the spot they are walking to. */
function drawGuards(ctx, state) {
  for (const g of state.guards) {
    if (g.investigate) {
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(198,47,47,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.investigate.x, g.investigate.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#1f2a44';
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f7efdd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Cap brim in the facing direction.
    ctx.fillStyle = '#f7efdd';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.facing) * 9, g.y + Math.sin(g.facing) * 9, 4, 0, Math.PI * 2);
    ctx.fill();
    if (g.investigate) {
      ctx.fillStyle = '#fff8e6';
      ctx.strokeStyle = '#8a5a14';
      ctx.lineWidth = 1.5;
      roundRect(ctx, g.x - 11, g.y - 34, 22, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5a3a08';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 18);
    }
    if (g.alert > 0.5) {
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 22);
    }
  }
}

/** The thief: a docent in a navy blazer with a name badge, strolling. */
function drawThief(ctx, state) {
  const t = state.thief;
  const inTour = inGrass(t.x, t.y);
  ctx.fillStyle = '#2e4a7a';
  ctx.beginPath();
  ctx.arc(t.x, t.y, THIEF_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f7efdd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(t.x, t.y, THIEF_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  // Badge: a small gold square on the chest.
  ctx.fillStyle = COLORS.goldBright;
  ctx.fillRect(t.x - 3, t.y - 2, 6, 5);
  // Facing tick.
  ctx.fillStyle = '#f7efdd';
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.facing) * 9, t.y + Math.sin(t.facing) * 9, 3, 0, Math.PI * 2);
  ctx.fill();
  if (state.sneaking) {
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('STROLLING', t.x, t.y - 20);
  }
  if (inTour) {
    ctx.fillStyle = 'rgba(40,80,55,0.9)';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('BLENDING IN', t.x, t.y + 26);
  }
}

const THIEF_RADIUS = 13;

/** The dropped ticket: a small white slip with gold rings blooming. */
function drawCoin(ctx, state) {
  if (!state.coin) return;
  const age = state.time - state.coin.landedAt;
  const r = Math.min(46, 8 + age * 60);
  ctx.save();
  ctx.strokeStyle = `rgba(180,134,11,${Math.max(0, 0.9 - age * 0.4)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(state.coin.x, state.coin.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(state.coin.x, state.coin.y, r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fffdf4';
  ctx.fillRect(state.coin.x - 7, state.coin.y - 4, 14, 8);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(state.coin.x - 7, state.coin.y - 4, 14, 8);
}

/** The flash burst: a white-gold bloom where the thief stands. */
function drawSmoke(ctx, state) {
  if (!state.smoke) return;
  const left = state.smoke.until - state.time;
  const alpha = Math.max(0, Math.min(0.85, left / 2));
  const g = ctx.createRadialGradient(
    state.smoke.x, state.smoke.y, 6,
    state.smoke.x, state.smoke.y, state.smoke.radius,
  );
  g.addColorStop(0, `rgba(255,250,220,${alpha})`);
  g.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(state.smoke.x, state.smoke.y, state.smoke.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(90,66,32,${alpha})`;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('FLASH!', state.smoke.x, state.smoke.y - state.smoke.radius - 8);
}

/** The HUD: title, loot, SUSPICION meter, alarm bar, tools, closing bell. */
function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 0, VIEW.width, HUD_H);
  ctx.fillStyle = COLORS.textLight;
  ctx.font = 'bold 21px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE AURELIUS JOB', 16, 28);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = '#c9b896';
  ctx.fillText('a museum heist in daylight', 16, 48);

  // Loot.
  ctx.fillStyle = COLORS.goldBright;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(`LOOT $${state.lootValue.toLocaleString()}`, 300, 30);
  ctx.fillStyle = '#c9b896';
  ctx.font = '13px Georgia, serif';
  ctx.fillText(`target $${LOOT_TARGET.toLocaleString()}`, 300, 50);

  // SUSPICION meter.
  const mx = 520;
  const mw = 200;
  ctx.fillStyle = '#c9b896';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('SUSPICION', mx, 18);
  ctx.fillStyle = COLORS.hudBar;
  roundRect(ctx, mx, 24, mw, 16, 5);
  ctx.fill();
  const vis = state.visibility;
  ctx.fillStyle = vis >= 0.8 ? COLORS.danger : vis >= 0.4 ? '#d98a1f' : COLORS.safe;
  roundRect(ctx, mx, 24, mw * vis, 16, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.textLight;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'left';
  const label = vis >= 0.8 ? 'EXPOSED' : vis >= 0.4 ? 'NOTICED' : 'BLENDING IN';
  ctx.fillText(label + (state.sneaking ? ' · STROLLING' : ''), mx, 56);

  // Alarm bar.
  const ax = 760;
  const aw = 200;
  ctx.fillStyle = '#c9b896';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('ALARM', ax, 18);
  ctx.fillStyle = COLORS.hudBar;
  roundRect(ctx, ax, 24, aw, 16, 5);
  ctx.fill();
  ctx.fillStyle = state.alarm >= 70 ? COLORS.danger : state.alarm >= 35 ? '#d98a1f' : COLORS.safe;
  roundRect(ctx, ax, 24, aw * (state.alarm / ALARM.max), 16, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.textLight;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(`${Math.round(state.alarm)} / 100`, ax, 56);

  // Tools. (The closing bell lives under the alarm bar, not up here —
  // three tool boxes and a timer do not fit in one row.)
  const tools = [
    ['1', 'FLASH', state.tools.smoke],
    ['2', 'JAMMER', state.tools.emp],
    ['3', 'TICKET', state.tools.coin],
  ];
  tools.forEach(([key, label, count], i) => {
    const tx = 975 + i * 93;
    const selected = state.tools.selected === ['smoke', 'emp', 'coin'][i];
    ctx.fillStyle = selected ? COLORS.goldBright : COLORS.hudBar;
    roundRect(ctx, tx, 12, 88, 40, 6);
    ctx.fill();
    ctx.fillStyle = selected ? COLORS.text : COLORS.textLight;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${key} ${label} ×${count}`, tx + 44, 30);
    ctx.font = '11px Georgia, serif';
    ctx.fillText(selected ? 'IN HAND' : '', tx + 44, 46);
  });

  // Closing bell, under the alarm bar.
  const mins = Math.floor(state.timeLeft / 60);
  const secs = Math.floor(state.timeLeft % 60);
  ctx.fillStyle = state.timeLeft <= 30 ? COLORS.danger : COLORS.textLight;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`CLOSES ${mins}:${String(secs).padStart(2, '0')}`, ax + aw, 56);
  ctx.textAlign = 'left';
}

/** The toast line over the gallery. */
function drawToast(ctx, state) {
  if (!state.message || state.time > state.messageUntil) return;
  ctx.fillStyle = 'rgba(43,33,24,0.92)';
  const w = Math.min(760, ctx.measureText(state.message).width + 48);
  roundRect(ctx, (VIEW.width - w) / 2, HUD_H + 10, w, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#f7efdd';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, VIEW.width / 2, HUD_H + 33);
  ctx.textAlign = 'left';
}

/** A warm daylight wash over the whole frame. */
function drawDaylight(ctx) {
  const g = ctx.createLinearGradient(0, HUD_H, 0, VIEW.height);
  g.addColorStop(0, 'rgba(255,244,200,0.10)');
  g.addColorStop(1, 'rgba(255,244,200,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
}

/** Full-screen overlay for title, win and lose. */
function drawOverlay(ctx, title, lines, accent, big) {
  ctx.fillStyle = 'rgba(43,33,24,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f7efdd';
  ctx.font = `bold ${big ? 54 : 44}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.fillStyle = accent;
  ctx.font = 'bold 24px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, 310 + i * 36);
  });
  ctx.fillStyle = '#c9b896';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Press ENTER to start · R to run it back · H for the guide', VIEW.width / 2, 310 + lines.length * 36 + 24);
  ctx.textAlign = 'left';
}

function drawMarginNotes(ctx) {
  ctx.fillStyle = 'rgba(90,66,32,0.6)';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('sun is the danger — shade is the friend', 24, VIEW.height - 16);
  ctx.textAlign = 'right';
  ctx.fillText('blend in with the tour groups', VIEW.width - 24, VIEW.height - 16);
  ctx.textAlign = 'left';
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (state.screen === SCREEN_TITLE) {
    drawFloor(ctx);
    drawSkylightPools(ctx);
    drawQuietCorners(ctx);
    drawTourGroups(ctx, false, state);
    drawMarbleEcho(ctx);
    drawWallsAndCover(ctx);
    drawLoot(ctx, state);
    drawExit(ctx, state);
    drawTourGroups(ctx, true, state);
    drawOverlay(ctx, 'THE AURELIUS JOB', [
      'A museum heist in daylight.',
      'Wear the docent uniform. Lift $1,000.',
      'Slip out the staff exit before closing.',
    ], COLORS.goldBright, true);
    drawHud(ctx, state);
    return;
  }
  drawFloor(ctx);
  drawPatrols(ctx, state);
  drawSkylightPools(ctx);
  drawQuietCorners(ctx);
  drawTourGroups(ctx, false, state);
  drawMarbleEcho(ctx);
  drawNoise(ctx, state);
  drawGuide(ctx, state);
  drawWallsAndCover(ctx);
  drawLoot(ctx, state);
  drawExit(ctx, state);
  drawCones(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawThief(ctx, state);
  drawTourGroups(ctx, true, state);
  drawCoin(ctx, state);
  drawSmoke(ctx, state);
  drawDaylight(ctx);
  drawMarginNotes(ctx);
  drawHud(ctx, state);
  drawToast(ctx, state);
  if (state.screen === SCREEN_WIN) {
    const ghost = state.ghost ? ' · CLEAN VISIT +$250' : '';
    const secs = Math.round(state.winTime);
    drawOverlay(ctx, 'CLEAN GETAWAY', [
      `HAUL $${state.winHaul.toLocaleString()} · ${secs} SECONDS${ghost}`,
      `${state.stats.lootTaken} pieces lifted · ${state.stats.toolsUsed} tools used`,
      'The museum never knew you were there.',
    ], COLORS.safe, false);
  } else if (state.screen === SCREEN_LOSE) {
    const why = state.caughtBy === 'alarm'
      ? 'The alarm hit 100 — security swept the galleries.'
      : state.caughtBy === 'guard'
        ? 'A guard grabbed your arm in front of the visitors.'
        : 'Closing time — the doors locked with you inside.';
    drawOverlay(ctx, 'CAUGHT', [why, `Loot kept: $${state.lootValue.toLocaleString()}`, 'Press R to try the visit again.'], COLORS.danger, false);
  }
}
