// The Aurelius Job — tiny synthesized sounds, no audio files: a soft chime
// for loot, a low thud for the Crown Case, a rising pulse while the alarm climbs.
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
  if (alarmGain) alarmGain.gain.value = 0;
  return muted;
}

function blip(freq, dur, type = 'sine', vol = 0.12) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + dur);
}

export function playPickup() { blip(880, 0.18); setTimeout(() => blip(1318, 0.22), 70); }
export function playVault() { blip(220, 0.4, 'triangle', 0.16); setTimeout(() => blip(330, 0.4, 'triangle', 0.16), 120); }
export function playTool() { blip(520, 0.12, 'square', 0.06); }
export function playCaught() { blip(160, 0.5, 'sawtooth', 0.14); setTimeout(() => blip(110, 0.7, 'sawtooth', 0.14), 150); }
export function playWin() {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.25), i * 110));
}

export function setAlarmPulse(on) {
  if (!ctx) return;
  if (on && !alarmOsc) {
    alarmOsc = ctx.createOscillator();
    alarmGain = ctx.createGain();
    alarmOsc.type = 'sine';
    alarmOsc.frequency.value = 440;
    alarmGain.gain.value = 0;
    alarmOsc.connect(alarmGain);
    alarmGain.connect(ctx.destination);
    alarmOsc.start();
    const pulse = () => {
      if (!alarmOsc) return;
      alarmGain.gain.linearRampToValueAtTime(muted ? 0 : 0.05, ctx.currentTime + 0.1);
      alarmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(pulse, 600);
    };
    pulse();
  } else if (!on && alarmOsc) {
    try { alarmOsc.stop(); } catch (e) { /* already stopped */ }
    alarmOsc = null;
    alarmGain = null;
  }
}
