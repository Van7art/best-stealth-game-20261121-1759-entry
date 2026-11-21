// Midnight Gallery — sound: tiny synthesised effects on WebAudio, no
// audio files. Everything is an oscillator blip through a gain envelope,
// built lazily on the first user gesture (browsers block audio before one)
// and silent while muted. The game plays fine with sound off entirely.

export function makeAudio() {
  return {
    context: null,
    muted: false,
    lastStepAt: 0,
  };
}

function ensureContext(audio) {
  if (audio.context) return audio.context;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audio.context = new Ctor();
  } catch {
    return null;
  }
  return audio.context;
}

function blip(audio, frequency, seconds, type, volume, when = 0) {
  if (audio.muted) return;
  const ctx = ensureContext(audio);
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + when;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  } catch {
    // Sound is garnish; a failure here must never break the game.
  }
}

// One named effect per game event. Volumes stay low: footsteps are a
// whisper, the alarm is the loudest thing in the game.
export function playSound(audio, name, data = {}) {
  if (audio.muted) return;
  const now = performance.now();
  switch (name) {
    case 'thiefStep':
      if (now - audio.lastStepAt < 240) return;
      audio.lastStepAt = now;
      blip(audio, data.sneaking ? 150 : 190, 0.05, 'sine', 0.03);
      break;
    case 'guardStep': {
      const volume = Math.max(0.008, 0.05 - (data.distance || 200) / 6000);
      blip(audio, 110, 0.06, 'triangle', volume);
      break;
    }
    case 'pickup':
      blip(audio, 660, 0.12, 'sine', 0.08);
      blip(audio, 990, 0.18, 'sine', 0.08, 0.09);
      break;
    case 'pebble':
      blip(audio, 1400, 0.05, 'square', 0.05);
      blip(audio, 900, 0.07, 'square', 0.04, 0.12);
      break;
    case 'alarm':
      blip(audio, 520, 0.22, 'sawtooth', 0.09);
      blip(audio, 780, 0.22, 'sawtooth', 0.09, 0.2);
      blip(audio, 520, 0.3, 'sawtooth', 0.09, 0.4);
      break;
    case 'laser':
      blip(audio, 1800, 0.1, 'square', 0.07);
      blip(audio, 300, 0.25, 'sawtooth', 0.07, 0.08);
      break;
    case 'suspicious':
      blip(audio, 440, 0.12, 'triangle', 0.06);
      break;
    case 'caught':
      blip(audio, 392, 0.2, 'sawtooth', 0.1);
      blip(audio, 311, 0.2, 'sawtooth', 0.1, 0.18);
      blip(audio, 233, 0.4, 'sawtooth', 0.1, 0.36);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((freq, i) => blip(audio, freq, 0.22, 'sine', 0.08, i * 0.13));
      break;
    case 'start':
      blip(audio, 330, 0.1, 'sine', 0.06);
      blip(audio, 494, 0.16, 'sine', 0.06, 0.09);
      break;
    default:
      break;
  }
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
