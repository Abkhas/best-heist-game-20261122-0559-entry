// The Midnight Vault — tiny synthesized sounds, no audio files: a soft blip
// for loot, a low thud for the vault, a rising pulse while the alarm climbs.
// The context is created on the first player input, never before.
let ctx = null;
let muted = false;
let alarmOsc = null;
let alarmGain = null;

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function blip(freq, seconds, type, volume, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.02);
}

export function playPickup() {
  blip(880, 0.12, 'sine', 0.12);
  blip(1320, 0.16, 'sine', 0.1, 0.07);
}

export function playVault() {
  blip(220, 0.3, 'triangle', 0.16);
  blip(330, 0.3, 'triangle', 0.14, 0.1);
  blip(440, 0.4, 'triangle', 0.12, 0.2);
}

export function playTool() {
  blip(520, 0.1, 'square', 0.06);
  blip(380, 0.14, 'square', 0.05, 0.06);
}

export function playCaught() {
  blip(196, 0.5, 'sawtooth', 0.14);
  blip(147, 0.7, 'sawtooth', 0.14, 0.18);
}

export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.25, 'sine', 0.12, i * 0.12));
}

/** A quiet two-note pulse while the thief is seen; silent otherwise. */
export function setAlarmPulse(on) {
  if (!ctx || muted) on = false;
  if (on && !alarmOsc) {
    alarmOsc = ctx.createOscillator();
    alarmGain = ctx.createGain();
    alarmOsc.type = 'sine';
    alarmOsc.frequency.setValueAtTime(440, ctx.currentTime);
    alarmGain.gain.setValueAtTime(0.0, ctx.currentTime);
    alarmOsc.connect(alarmGain).connect(ctx.destination);
    alarmOsc.start();
  }
  if (alarmOsc) {
    alarmGain.gain.setTargetAtTime(on ? 0.045 : 0.0, ctx.currentTime, 0.1);
    alarmOsc.frequency.setTargetAtTime(on ? 660 : 440, ctx.currentTime, 0.2);
  }
}
