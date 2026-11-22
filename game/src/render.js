// The Midnight Vault — everything the eye sees: the gallery at night, the
// sweeping cones, the loot glowing gold, the HUD, and the title/win/lose
// screens. Danger is red, safety is dark, loot is gold — readable at a glance.
import { VIEW, HUD_H, COLORS, ALARM, LOOT_TARGET, TOOLS } from './config.js';
import {
  WALLS, COVER, PILLARS, SHADOWS, CAMERAS, EXIT, ENTRANCE, inShadow,
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

function drawFloor(ctx) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
  // Checkerboard marble, faint, so the room reads as one grand floor.
  const tile = 80;
  ctx.fillStyle = COLORS.floorAlt;
  for (let y = HUD_H; y < VIEW.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
  // Moonlight through the skylight: a soft pale wash across the centre.
  const g = ctx.createRadialGradient(640, 380, 60, 640, 380, 520);
  g.addColorStop(0, 'rgba(190,205,255,0.10)');
  g.addColorStop(1, 'rgba(190,205,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, HUD_H, VIEW.width, VIEW.height - HUD_H);
}

function drawShadows(ctx) {
  for (const s of SHADOWS) {
    ctx.fillStyle = COLORS.shadow;
    roundRect(ctx, s.x, s.y, s.w, s.h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(57,217,138,0.35)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    roundRect(ctx, s.x, s.y, s.w, s.h, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(57,217,138,0.8)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOW — HIDDEN', s.x + s.w / 2, s.y + 16);
  }
}

function drawWallsAndCover(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 5);
  }
  for (const c of COVER) {
    ctx.fillStyle = '#2c3550';
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#4a5878';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(244,239,228,0.55)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.label.toUpperCase(), c.x + c.w / 2, c.y + c.h / 2 + 3);
  }
  for (const p of PILLARS) {
    ctx.fillStyle = '#3a4260';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#565f86';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r - 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    const pulse = 0.55 + 0.25 * Math.sin(state.time * 3 + item.x);
    if (item.kind === 'painting') {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = '#6b4f1d';
      ctx.fillRect(-34, -24, 68, 48);
      ctx.fillStyle = '#274b63';
      ctx.fillRect(-28, -18, 56, 36);
      ctx.fillStyle = '#e8c96a';
      ctx.beginPath();
      ctx.arc(-6, -4, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7fb3d5';
      ctx.fillRect(-28, 8, 56, 10);
      ctx.restore();
      ctx.fillStyle = `rgba(242,193,78,${pulse})`;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${item.value}`, item.x, item.y + 42);
    } else if (item.kind === 'gems') {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.shadowColor = '#7fe7ff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#7fe7ff';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = `rgba(127,231,255,${pulse})`;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`GEMS $${item.value}`, item.x, item.y + 36);
    } else if (item.kind === 'vault') {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.fillStyle = '#20263f';
      roundRect(ctx, -46, -40, 92, 80, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20263f';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
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
  ctx.save();
  ctx.translate(EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2);
  ctx.fillStyle = open ? '#123524' : '#241a1a';
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
  // The vent the thief slipped in through.
  ctx.fillStyle = '#151a2e';
  ctx.fillRect(ENTRANCE.x, ENTRANCE.y, ENTRANCE.w, ENTRANCE.h);
  ctx.strokeStyle = '#4a5878';
  ctx.lineWidth = 2;
  ctx.strokeRect(ENTRANCE.x, ENTRANCE.y, ENTRANCE.w, ENTRANCE.h);
  ctx.fillStyle = '#9aa3c0';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VENT IN', ENTRANCE.x + ENTRANCE.w / 2, ENTRANCE.y + ENTRANCE.h / 2 + 3);
}

function drawCones(ctx, state) {
  for (const cam of state.cameras) {
    if (state.time < cam.disabledUntil) continue;
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.range, CAMERA.halfAngle, COLORS.cameraCone);
  }
  for (const g of state.guards) {
    const hot = g.alert > 0.3;
    const fill = hot ? 'rgba(229,72,77,0.42)' : COLORS.dangerSoft;
    drawCone(ctx, g.x, g.y, g.facing, GUARD.coneRange, GUARD.coneHalfAngle, fill);
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    const disabled = state.time < cam.disabledUntil;
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.fillStyle = disabled ? '#3a3f55' : '#c9a227';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(cam.angle);
    ctx.fillStyle = disabled ? '#555b73' : '#e8c96a';
    ctx.fillRect(0, -4, 20, 8);
    ctx.restore();
    ctx.fillStyle = disabled ? '#8a90a8' : '#f4efe4';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(disabled ? 'CAM OFF' : cam.label, Math.max(30, Math.min(1250, cam.x)), cam.y + 26);
  }
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    // Body: navy uniform, cap brim points where the guard faces.
    ctx.fillStyle = '#2b3a67';
    ctx.beginPath();
    ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.alert > 0.3 ? COLORS.danger : '#7c8bc4';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.rotate(g.facing);
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
    }
  }
}

function drawThief(ctx, state) {
  const t = state.thief;
  ctx.save();
  ctx.translate(t.x, t.y);
  // Hooded cloak: dark teal, gold clasp, a pale face in the dark.
  ctx.fillStyle = '#123f38';
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(12, 10);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1f7a6d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath();
  ctx.arc(0, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(0, 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (inShadow(t.x, t.y)) {
    ctx.fillStyle = 'rgba(57,217,138,0.9)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', t.x, t.y - 22);
  }
}

function drawSmoke(ctx, state) {
  if (!state.smoke) return;
  const s = state.smoke;
  const left = Math.max(0, s.until - state.time);
  const alpha = Math.min(0.75, left / 2);
  ctx.fillStyle = `rgba(180,190,210,${alpha})`;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,190,210,0.5)';
  ctx.beginPath();
  ctx.arc(s.x - 40, s.y + 20, s.radius * 0.5, 0, Math.PI * 2);
  ctx.arc(s.x + 45, s.y - 15, s.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hud;
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
  ctx.fillStyle = '#2a3350';
  ctx.fillRect(430, 36, 260, 10);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(430, 36, 260 * Math.min(1, state.lootValue / LOOT_TARGET), 10);

  // Alarm meter.
  const ax = 730;
  ctx.fillStyle = state.alarm > 60 ? COLORS.danger : COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ALARM', ax, 28);
  ctx.fillStyle = '#2a3350';
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
  ctx.fillText(`[1] SMOKE ×${state.tools.smoke}`, 990, 28);
  ctx.fillStyle = sel === 'emp' ? COLORS.gold : COLORS.muted;
  ctx.fillText(`[2] EMP ×${state.tools.emp}`, 990, 50);

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
  ctx.fillStyle = 'rgba(13,16,32,0.88)';
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

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,24,0.78)';
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
  drawShadows(ctx);
  drawWallsAndCover(ctx);
  drawExit(ctx, state);
  drawLoot(ctx, state);
  if (state.screen !== SCREEN_TITLE) {
    drawCones(ctx, state);
    drawCameras(ctx, state);
    drawGuards(ctx, state);
    drawThief(ctx, state);
    drawSmoke(ctx, state);
  }
  drawHud(ctx, state);
  drawToast(ctx, state);

  if (state.screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'THE MIDNIGHT VAULT', [
      'One gallery. Three guards. Two cameras. One vault.',
      'WASD / arrows to move · 1 / 2 pick a tool · SPACE uses it',
      'Grab $1,000 of loot, then slip out the exit before dawn.',
      'Cones are danger. Shadows are safety. Smoke buys you seconds.',
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
