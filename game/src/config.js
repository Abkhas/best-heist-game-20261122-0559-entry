// The Midnight Vault — shared constants for the whole game.
// One room, one night: a grand gallery the thief crosses to reach the vault.
export const VIEW = { width: 1280, height: 720 };
export const HUD_H = 64;
export const PLAY = { x: 0, y: HUD_H, width: 1280, height: 720 - HUD_H };

export const THIEF = {
  radius: 13,
  speed: 175,          // px per second on open floor
  shadowSpeed: 205,    // faster when slipping through the dark
  startX: 84,
  startY: 664,
};

export const GUARD = {
  radius: 14,
  speed: 56,
  coneRange: 235,
  coneHalfAngle: 0.62, // radians either side of facing
  pauseSeconds: 1.6,   // how long a guard looks around at each waypoint
  sweepArc: 1.15,       // radians swept while paused
  catchRadius: 26,
};

export const CAMERA = {
  range: 250,
  halfAngle: 0.5,
  sweepArc: 0.95,      // radians either side of its mount angle
  sweepSeconds: 4.2,   // one full sweep out and back
};

export const ALARM = {
  riseGuard: 30,       // per second while a guard sees the thief
  riseCamera: 20,      // per second while a camera sees the thief
  fallHidden: 9,       // per second while unseen
  fallShadow: 22,      // per second while unseen inside a shadow
  max: 100,
};

export const TOOLS = {
  smoke: { count: 3, radius: 95, seconds: 6, key: '1', label: 'SMOKE' },
  emp: { count: 2, seconds: 9, key: '2', label: 'EMP' },
};

export const VAULT_CHANNEL_SECONDS = 3;
export const LOOT_TARGET = 1000;   // dollars needed before the exit opens
export const TIME_LIMIT_SECONDS = 180;

export const COLORS = {
  floor: '#1c2138',
  floorAlt: '#20263f',
  wall: '#3a2f4a',
  wallTop: '#54486b',
  gold: '#f2c14e',
  goldDim: '#b98f2e',
  danger: '#e5484d',
  dangerSoft: 'rgba(229,72,77,0.28)',
  cameraCone: 'rgba(255,176,32,0.20)',
  safe: '#39d98a',
  shadow: 'rgba(8,10,24,0.55)',
  hud: '#0d1020',
  text: '#f4efe4',
  muted: '#9aa3c0',
};
