// Midnight Gallery — laser grids: doorways strung with beams that blink
// live and dark on a fixed rhythm. Crossing a live beam trips the alarm
// at once; a beam about to go live flickers first, so a patient thief can
// learn the pattern and slip through in the dark half of the cycle.

import { LASER } from './config.js';

export function makeLaser(def) {
  return {
    name: def.name,
    beams: def.beams,
    phase: def.phase,
    live: false,
    warning: false,
    cycle: 0,
  };
}

// The cycle is deterministic: onSeconds live, offSeconds dark, repeating
// from the laser's phase offset. `time` is the game's clock in seconds.
export function updateLaser(laser, time) {
  const period = LASER.onSeconds + LASER.offSeconds;
  const t = (time + laser.phase) % period;
  laser.live = t < LASER.onSeconds;
  laser.warning = !laser.live && t > period - LASER.warnSeconds;
  laser.cycle = t / period;
}

// Did the thief's step from (x1, y1) to (x2, y2) cross any live beam?
// Beams are short segments; a step crosses one when the two segments meet.
export function crossedLiveBeam(laser, x1, y1, x2, y2) {
  if (!laser.live) return false;
  for (let i = 0; i < laser.beams.length; i += 1) {
    const b = laser.beams[i];
    if (segmentsCross(x1, y1, x2, y2, b.x1, b.y1, b.x2, b.y2)) return true;
  }
  return false;
}

function side(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

export function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = side(x3, y3, x4, y4, x1, y1);
  const d2 = side(x3, y3, x4, y4, x2, y2);
  const d3 = side(x1, y1, x2, y2, x3, y3);
  const d4 = side(x1, y1, x2, y2, x4, y4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
