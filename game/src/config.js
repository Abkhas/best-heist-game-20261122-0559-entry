// The Aurelius Job — shared constants for the whole game.
// One museum, one afternoon: a bright gallery the thief crosses in a docent's
// uniform to lift the Aurelius Diamond, while guards, cameras and the closing
// bell decide whether the visit ends clean or in handcuffs.
export const VIEW = { width: 1280, height: 720 };
export const HUD_H = 64;
export const PLAY = { x: 0, y: HUD_H, width: 1280, height: 720 - HUD_H };

export const THIEF = {
  radius: 13,
  speed: 175,          // px per second on open floor
  shadowSpeed: 205,    // faster slipping through the quiet corners
  sneakSpeed: 95,      // the docent stroll: slow, silent on marble, half as easy to spot
  startX: 84,
  startY: 664,
};

// How much each kind of cover shrinks a watcher's sight range.
export const HIDING = {
  shadow: 0.55,        // a quiet corner under the mezzanine
  grass: 0.45,         // inside a tour group: hidden unless a watcher is close
  sneak: 0.6,          // strolling in uniform, on top of the above
  lamplight: 1.0,      // standing in a skylight pool: seen from across the room
};

// Marble echo: strolling over polished marble (not sneaking) is loud enough
// to pull the nearest guard over to look. Noise carries this far.
export const CREAKY = {
  hearRadius: 380,
  investigateSeconds: 4,
  cooldownSeconds: 0.9, // at most one echo pulse this often
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
  fallShadow: 22,      // per second while unseen inside a quiet corner
  max: 100,
};

export const TOOLS = {
  smoke: { count: 3, radius: 95, seconds: 6, key: '1', label: 'FLASH' },
  emp: { count: 2, seconds: 9, key: '2', label: 'JAMMER' },
  coin: { count: 3, key: '3', label: 'TICKET' },
};

// A dropped ticket: how far it flutters, how far away a guard hears it land,
// and how long the nearest guard walks over to look at it.
export const COIN = {
  throwDistance: 120,
  investigateRadius: 420,
  investigateSeconds: 6,
};

export const VAULT_CHANNEL_SECONDS = 3;
export const LOOT_TARGET = 1000;   // dollars needed before the staff exit opens
export const TIME_LIMIT_SECONDS = 180;

export const COLORS = {
  floor: '#e8dcc0',
  floorAlt: '#dfd2ae',
  floorWest: '#e3d3b4',
  floorCentre: '#ead9b8',
  floorCrown: '#e6cf9e',
  wall: '#8a6f4d',
  wallTop: '#a98f68',
  gold: '#b8860b',
  goldBright: '#e6a817',
  danger: '#c62f2f',
  dangerSoft: 'rgba(198,47,47,0.30)',
  cameraCone: 'rgba(255,176,32,0.22)',
  safe: '#1e7d46',
  shadow: 'rgba(70,52,28,0.28)',
  hud: '#2b2118',
  hudBar: '#3d2f22',
  text: '#241a10',
  textLight: '#f7efdd',
  muted: '#7a6a52',
  skylight: 'rgba(255,244,200,0.75)',
  marble: '#f2ead6',
  tour: '#4a7a5c',
};
