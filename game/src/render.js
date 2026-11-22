// The Midnight Vault — everything the eye sees, lamplight-noir edition.
// One grand gallery at night, lit by warm lamps: gold pools of lamplight are
// where you are seen, deep shadow is where you vanish, and loot glints warm
// in the light. No labels say "hidden" — the light itself says it.
import { VIEW, HUD_H, COLORS, ALARM, LOOT_TARGET, TOOLS } from './config.js';
import {
  WALLS, COVER, PILLARS, SHADOWS, CAMERAS, EXIT, ENTRANCE, PATROLS, inShadow,
} from './levels.js';
import { GUARD, CAMERA } from './config.js';
import { SCREEN_TITLE, SCREEN_WIN, SCREEN_LOSE, exitOpen } from './state.js';

// Wall lamps: pure light, no gameplay. Each one hangs over something the
// thief wants — a painting, the gems, the vault — so loot is always lit.
const LAMPS = [
  { x: 250, y: 128 },   // over painting A
  { x: 640, y: 122 },   // over painting B
  { x: 1075, y: 128 },  // over painting C
  { x: 640, y: 420 },   // over the Starlight Gems
  { x: 1140, y: 150 },  // over the vault
  { x: 640, y: 330 },   // centre gallery
  { x: 1180, y: 600 },  // over the exit approach
];

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

function drawFloor(ctx) {
  // Near-black warm floor: dark plum-brown, not navy. Faint large tiles.
  ctx.fillStyle = '#171019';
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  const tile = 80;
  for (let y = HUD_H; y < VIEW.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) {
        ctx.fillStyle = '#1b141d';
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }
  // Thin warm grout lines, barely there.
  ctx.strokeStyle = 'rgba(255,190,110,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= VIEW.width; x += tile) {
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, VIEW.height);
  }
  for (let y = HUD_H; y <= VIEW.height; y += tile) {
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y);
  }
  ctx.stroke();
}

// Dotted patrol routes on the floor: each guard's beat, drawn so the player
// reads where the cones will sweep before they arrive. Dots, not a solid
// line — the floor stays floor, the beat stays a hint.
function drawPatrols(ctx) {
  ctx.save();
  ctx.setLineDash([1, 11]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(216,180,112,0.34)';
  ctx.lineWidth = 3;
  for (const p of PATROLS) {
    ctx.beginPath();
    p.waypoints.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

// Warm pools of lamplight, laid over the floor before anything else.
function drawLampPools(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of LAMPS) {
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 10, lamp.x, lamp.y, 200);
    g.addColorStop(0, 'rgba(255,178,72,0.30)');
    g.addColorStop(0.45, 'rgba(255,160,60,0.14)');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 200, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The lamp fixtures themselves: small brass sconces with a hot core.
  for (const lamp of LAMPS) {
    ctx.fillStyle = '#8a6a2a';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Shadow pools: pools of near-black with a soft feathered edge and a faint
// cool rim, so the eye reads "dark you can stand in" without any text.
function drawShadows(ctx) {
  for (const s of SHADOWS) {
    ctx.save();
    ctx.shadowColor = 'rgba(2,3,8,0.9)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = 'rgba(3,4,10,0.88)';
    roundRect(ctx, s.x, s.y, s.w, s.h, 20);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(140,165,255,0.14)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, s.x, s.y, s.w, s.h, 20);
    ctx.stroke();
    // A couple of faint dust motes inside the dark, so the pool has texture.
    ctx.fillStyle = 'rgba(160,180,255,0.10)';
    ctx.beginPath();
    ctx.arc(s.x + s.w * 0.3, s.y + s.h * 0.4, 2, 0, Math.PI * 2);
    ctx.arc(s.x + s.w * 0.65, s.y + s.h * 0.6, 1.6, 0, Math.PI * 2);
    ctx.arc(s.x + s.w * 0.5, s.y + s.h * 0.25, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWallsAndCover(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = '#2c1f2e';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    // Brass trim along the top edge, catching the lamplight.
    ctx.fillStyle = '#7a5c2e';
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.fillStyle = 'rgba(255,200,110,0.25)';
    ctx.fillRect(w.x, w.y, w.w, 1.5);
  }
  for (const c of COVER) {
    // Tall display case, a second cover layer distinct from the flat shadow
    // pools: a plinth shadow on the floor, a raised lid catching the light,
    // brass corner posts, and a warm glass glint — furniture you hide behind.
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    roundRect(ctx, c.x + 5, c.y + 7, c.w, c.h, 6);
    ctx.fill();
    // Raised lid: a lighter top band, as if the case stands taller than the floor.
    ctx.fillStyle = '#3a2b22';
    roundRect(ctx, c.x, c.y, c.w, 14, 6);
    ctx.fill();
    ctx.fillStyle = '#241a16';
    roundRect(ctx, c.x, c.y + 10, c.w, c.h - 10, 6);
    ctx.fill();
    ctx.strokeStyle = '#8a6a2a';
    ctx.lineWidth = 2;
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.stroke();
    // Brass corner posts at the front edge.
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(c.x + 2, c.y + 2, 4, c.h - 4);
    ctx.fillRect(c.x + c.w - 6, c.y + 2, 4, c.h - 4);
    ctx.strokeStyle = 'rgba(255,205,120,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x + 10, c.y + c.h - 8);
    ctx.lineTo(c.x + c.w - 26, c.y + 8);
    ctx.stroke();
  }
  for (const p of PILLARS) {
    ctx.fillStyle = '#241c2b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#332740';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r - 8, 0, Math.PI * 2);
    ctx.fill();
    // Warm rim on the lamp side of the pillar.
    ctx.strokeStyle = 'rgba(255,190,100,0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r - 2, -2.4, -0.6);
    ctx.stroke();
  }
}

// A warm halo behind something precious, so it glints at a glance.
function halo(ctx, x, y, radius, alpha) {
  const g = ctx.createRadialGradient(x, y, 4, x, y, radius);
  g.addColorStop(0, `rgba(255,196,90,${alpha})`);
  g.addColorStop(1, 'rgba(255,196,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    const pulse = 0.55 + 0.25 * Math.sin(state.time * 3 + item.x);
    if (item.kind === 'painting') {
      halo(ctx, item.x, item.y, 70, 0.30 * pulse + 0.12);
      ctx.save();
      ctx.translate(item.x, item.y);
      // Gilt frame, canvas, a warm sun in the painting itself.
      ctx.fillStyle = '#a8842f';
      ctx.fillRect(-37, -27, 74, 54);
      ctx.fillStyle = '#7a5c1e';
      ctx.fillRect(-34, -24, 68, 48);
      ctx.fillStyle = '#2c4a5e';
      ctx.fillRect(-28, -18, 56, 36);
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(-6, -4, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b34a';
      ctx.fillRect(-28, 8, 56, 10);
      ctx.restore();
      ctx.fillStyle = `rgba(242,193,78,${pulse})`;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${item.value}`, item.x, item.y + 44);
    } else if (item.kind === 'gems') {
      halo(ctx, item.x, item.y, 80, 0.30 * pulse + 0.12);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.shadowColor = '#8fe9ff';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#aef2ff';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#c8f4ff';
      ctx.beginPath();
      ctx.arc(item.x - 5, item.y - 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(174,242,255,${pulse})`;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`GEMS $${item.value}`, item.x, item.y + 38);
    } else if (item.kind === 'vault') {
      halo(ctx, item.x, item.y, 110, 0.28 * pulse + 0.10);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = '#1d1508';
      roundRect(ctx, -46, -40, 92, 80, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#8a6a2a';
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d1508';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VAULT', item.x, item.y - 52);
      ctx.fillStyle = '#f4efe4';
      ctx.font = 'bold 11px sans-serif';
      if (!state.vaultOpen) {
        ctx.fillText(state.vaultProgress > 0
          ? `CRACKING… ${Math.round(state.vaultProgress * 100)}%`
          : 'STAND CLOSE TO CRACK', item.x, item.y + 58);
      } else {
        ctx.fillText('OPEN — $1,500', item.x, item.y + 58);
      }
      if (state.vaultProgress > 0 && !state.vaultOpen) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(item.x - 40, item.y + 64, 80, 8);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(item.x - 40, item.y + 64, 80 * state.vaultProgress, 8);
      }
    }
  }
}

function drawExit(ctx, state) {
  const open = exitOpen(state);
  if (open) halo(ctx, EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2, 90, 0.30);
  ctx.save();
  ctx.translate(EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2);
  ctx.fillStyle = open ? '#0e2b1a' : '#1d1214';
  roundRect(ctx, -EXIT.w / 2, -EXIT.h / 2, EXIT.w, EXIT.h, 8);
  ctx.fill();
  ctx.strokeStyle = open ? COLORS.safe : '#6b4a4a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = open ? COLORS.safe : '#a08a8a';
  ctx.font = open ? 'bold 16px sans-serif' : 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT — GO!' : 'EXIT · NEED $1,000', 0, 6);
  ctx.restore();
  // The vent the thief slipped in through, a dark grate low on the wall.
  ctx.fillStyle = '#0c0a12';
  ctx.fillRect(ENTRANCE.x, ENTRANCE.y, ENTRANCE.w, ENTRANCE.h);
  ctx.strokeStyle = '#5c4a26';
  ctx.lineWidth = 2;
  ctx.strokeRect(ENTRANCE.x, ENTRANCE.y, ENTRANCE.w, ENTRANCE.h);
  ctx.strokeStyle = 'rgba(92,74,38,0.7)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(ENTRANCE.x + 6, ENTRANCE.y + i * 14);
    ctx.lineTo(ENTRANCE.x + ENTRANCE.w - 6, ENTRANCE.y + i * 14);
    ctx.stroke();
  }
}

// Vision cones, two layers: a soft wash plus a hotter core, so the sweep
// reads as danger even shrunk to a thumbnail. Guards are red, cameras amber.
function drawCones(ctx, state) {
  for (const cam of state.cameras) {
    if (state.time < cam.disabledUntil) continue;
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, 'rgba(255,186,64,0.16)');
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range * 0.8, CAMERA.halfAngle * 0.7, 'rgba(255,196,90,0.20)');
  }
  for (const g of state.guards) {
    const hot = g.alert > 0.3;
    const investigating = !!g.investigate;
    const outer = investigating ? 'rgba(242,163,60,0.24)'
      : hot ? 'rgba(229,72,77,0.26)' : 'rgba(229,72,77,0.18)';
    const inner = investigating ? 'rgba(242,163,60,0.30)'
      : hot ? 'rgba(229,72,77,0.34)' : 'rgba(229,72,77,0.24)';
    drawCone(ctx, g.x, g.y, g.facing, GUARD.coneRange, GUARD.coneHalfAngle, outer);
    drawCone(ctx, g.x, g.y, g.facing, GUARD.coneRange * 0.8, GUARD.coneHalfAngle * 0.65, inner);
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    const disabled = state.time < cam.disabledUntil;
    ctx.save();
    ctx.translate(cam.x, cam.y);
    // Brass housing, amber lens when live.
    ctx.fillStyle = disabled ? '#3a3f55' : '#8a6a2a';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = disabled ? '#555b73' : '#e8c96a';
    ctx.rotate(cam.angle);
    ctx.fillRect(0, -4, 20, 8);
    ctx.fillStyle = disabled ? '#555b73' : '#ff5a4d';
    ctx.beginPath();
    ctx.arc(20, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = disabled ? '#8a90a8' : '#f4efe4';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(disabled ? 'CAM OFF' : cam.label, Math.max(30, Math.min(1250, cam.x)), cam.y + 28);
  }
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    // Each guard carries a lantern: a small warm pool that marks him in the dark.
    const lg = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, 46);
    lg.addColorStop(0, 'rgba(255,178,72,0.20)');
    lg.addColorStop(1, 'rgba(255,178,72,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(g.x, g.y);
    // Body: dark uniform with a gold cap band; brim points where he faces.
    ctx.fillStyle = '#232c4e';
    ctx.beginPath();
    ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.alert > 0.3 ? COLORS.danger : g.investigate ? '#f2a33c' : '#8a94c4';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.rotate(g.facing);
    ctx.fillStyle = '#e8c96a';
    ctx.fillRect(-GUARD.radius + 2, -3, 6, 6);
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.moveTo(GUARD.radius + 8, 0);
    ctx.lineTo(GUARD.radius - 2, -6);
    ctx.lineTo(GUARD.radius - 2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (g.alert > 0.3) {
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - GUARD.radius - 8);
    } else if (g.investigate) {
      ctx.fillStyle = '#f2a33c';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - GUARD.radius - 8);
    }
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  const hidden = inShadow(t.x, t.y);
  ctx.save();
  ctx.translate(t.x, t.y);
  // In lamplight the cloak is teal with a pale face and a gold clasp; in
  // shadow the whole figure sinks to near-black — the light says "hidden".
  ctx.fillStyle = hidden ? '#0a0f14' : '#123f38';
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(12, 10);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = hidden ? '#1c2b33' : '#1f7a6d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hidden ? '#3a4550' : '#f4efe4';
  ctx.beginPath();
  ctx.arc(0, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  if (!hidden) {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(0, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Visibility badge over the thief: what the light says about him right
  // now — HIDDEN in the cool dark, IN LIGHT where the lamps can see him.
  // Small, and it rides with the thief, so the concealment reads in any frame.
  const label = hidden ? 'HIDDEN' : 'IN LIGHT';
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  const w = ctx.measureText(label).width + 18;
  const bx = t.x - w / 2;
  const by = t.y - 34;
  ctx.fillStyle = hidden ? 'rgba(16,24,54,0.88)' : 'rgba(54,38,12,0.88)';
  roundRect(ctx, bx, by, w, 17, 8);
  ctx.fill();
  ctx.strokeStyle = hidden ? '#7fa0e0' : '#f2a33c';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = hidden ? '#a9c2ff' : '#f2c14e';
  ctx.textAlign = 'center';
  ctx.fillText(label, t.x, by + 12.5);
  ctx.restore();
}

// The tossed coin: a gold disc and the noise rings that pulled a guard over.
function drawCoin(ctx, state) {
  if (!state.coin) return;
  const c = state.coin;
  const age = state.time - c.landedAt;
  const ringR = 14 + Math.min(1, age / 0.7) * 52;
  const ringAlpha = Math.max(0, 0.75 - age * 0.14);
  ctx.strokeStyle = `rgba(242,193,78,${ringAlpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(242,193,78,${ringAlpha * 0.5})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, ringR * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6a2a';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmoke(ctx, state) {
  if (!state.smoke) return;
  const s = state.smoke;
  const left = Math.max(0, s.until - state.time);
  const alpha = Math.min(0.75, left / 2);
  ctx.fillStyle = `rgba(190,185,175,${alpha})`;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,185,175,0.5)';
  ctx.beginPath();
  ctx.arc(s.x - 40, s.y + 20, s.radius * 0.5, 0, Math.PI * 2);
  ctx.arc(s.x + 45, s.y - 15, s.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(0, 0, VIEW.width, HUD_H);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE MIDNIGHT VAULT', 18, 28);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '12px sans-serif';
  ctx.fillText('grab the loot · dodge the cones · slip out the exit', 18, 50);

  // Loot tally.
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  const lootText = `LOOT $${state.lootValue.toLocaleString()} / $${LOOT_TARGET.toLocaleString()}`;
  ctx.fillText(lootText, 430, 28);
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(430, 36, 260, 10);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(430, 36, 260 * Math.min(1, state.lootValue / LOOT_TARGET), 10);

  // Alarm meter.
  const ax = 730;
  ctx.fillStyle = state.alarm > 60 ? COLORS.danger : COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ALARM', ax, 28);
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(ax, 36, 200, 10);
  const alarmColor = state.alarm > 60 ? COLORS.danger : state.alarm > 30 ? '#f2a33c' : COLORS.safe;
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax, 36, 200 * (state.alarm / ALARM.max), 10);
  if (state.seen) {
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(state.seenBy === 'guard' ? 'SPOTTED BY GUARD!' : 'ON CAMERA!', ax + 210, 46);
  }

  // Tools.
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  const sel = state.tools.selected;
  ctx.fillStyle = sel === 'smoke' ? COLORS.gold : COLORS.muted;
  ctx.fillText(`[1] SMOKE ×${state.tools.smoke}`, 990, 20);
  ctx.fillStyle = sel === 'emp' ? COLORS.gold : COLORS.muted;
  ctx.fillText(`[2] EMP ×${state.tools.emp}`, 990, 38);
  ctx.fillStyle = sel === 'coin' ? COLORS.gold : COLORS.muted;
  ctx.fillText(`[3] COIN ×${state.tools.coin}`, 990, 56);

  // Timer.
  const mins = Math.floor(state.timeLeft / 60);
  const secs = Math.floor(state.timeLeft % 60);
  ctx.fillStyle = state.timeLeft < 30 ? COLORS.danger : COLORS.text;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 1262, 32);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '11px sans-serif';
  ctx.fillText('TO DAWN', 1262, 50);
  ctx.textAlign = 'left';
}

function drawToast(ctx, state) {
  if (!state.message || state.time > state.messageUntil) return;
  ctx.save();
  ctx.font = 'bold 16px sans-serif';
  const w = ctx.measureText(state.message).width + 28;
  const x = (VIEW.width - w) / 2;
  ctx.fillStyle = 'rgba(13,10,20,0.88)';
  roundRect(ctx, x, HUD_H + 12, w, 34, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText(state.message, VIEW.width / 2, HUD_H + 35);
  ctx.restore();
}

// A faint vignette over the room only, so the eye sits in the middle of the
// gallery. Subtle: loot near the edges must stay legible.
function drawVignette(ctx) {
  const g = ctx.createRadialGradient(640, 392, 300, 640, 392, 780);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,6,16,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 310 + i * 34));
}

export function render(ctx, state) {
  drawFloor(ctx);
  drawLampPools(ctx);
  drawShadows(ctx);
  drawPatrols(ctx);
  drawWallsAndCover(ctx);
  drawExit(ctx, state);
  drawLoot(ctx, state);
  if (state.screen !== SCREEN_TITLE) {
    drawCones(ctx, state);
    drawCameras(ctx, state);
    drawGuards(ctx, state);
    drawThief(ctx, state);
    drawCoin(ctx, state);
    drawSmoke(ctx, state);
  }
  drawVignette(ctx);
  drawHud(ctx, state);
  drawToast(ctx, state);

  if (state.screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'THE MIDNIGHT VAULT', [
      'One gallery. Three guards. Two cameras. One vault.',
      'WASD / arrows to move · 1 / 2 / 3 pick a tool · SPACE uses it',
      '3 tosses a coin — the clink pulls the nearest guard off patrol.',
      'Grab $1,000 of loot, then slip out the exit before dawn.',
      'Warm lamplight is danger. Deep shadow is safety. Smoke buys seconds.',
      '',
      'Press ENTER or click to begin the heist',
    ], COLORS.gold);
  } else if (state.screen === SCREEN_WIN) {
    drawOverlay(ctx, 'CLEAN GETAWAY', [
      `Haul: $${state.winHaul.toLocaleString()} in ${Math.round(state.winTime)} seconds`,
      `Loot taken: ${state.stats.lootTaken} pieces · tools used: ${state.stats.toolsUsed}`,
      '',
      'Press R to run it back',
    ], COLORS.safe);
  } else if (state.screen === SCREEN_LOSE) {
    const why = state.caughtBy === 'alarm'
      ? 'The alarm hit 100% — the gallery locked down around you.'
      : state.caughtBy === 'guard'
        ? 'A guard grabbed you in the open. The cones were telling the truth.'
        : 'Dawn broke over the gallery. The vault keeps its secrets.';
    drawOverlay(ctx, 'CAUGHT', [why, '', 'Press R to run it back'], COLORS.danger);
  }
}
