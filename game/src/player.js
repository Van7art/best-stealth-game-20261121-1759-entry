// Midnight Gallery — the thief: movement, sneaking, pebble tosses and
// artifact pickups. Movement collides with walls and pedestals as a circle
// sliding along rects; sneaking is slower and quieter; a pebble thrown with
// the mouse lands with a clink that pulls the nearest guard over to look.

import { PLAYER, STEALTH } from './config.js';
import { pointInShadow } from './vision.js';

export function makeThief(start) {
  return {
    x: start.x,
    y: start.y,
    angle: -Math.PI / 2,
    sneaking: false,
    moving: false,
    inShadow: false,
    artifacts: 0,
    pebbles: 4,
    stepPhase: 0,
  };
}

// Circle-vs-rect collision: try the move on one axis at a time so the thief
// slides along a wall instead of sticking to it. Returns the allowed spot.
export function collideCircle(x, y, radius, solids) {
  let px = x;
  let py = y;
  for (let i = 0; i < solids.length; i += 1) {
    const r = solids[i];
    const cx = Math.max(r.x, Math.min(px, r.x + r.w));
    const cy = Math.max(r.y, Math.min(py, r.y + r.h));
    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) {
        px = r.x - radius;
      } else {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * radius;
        py = cy + (dy / d) * radius;
      }
    }
  }
  return { x: px, y: py };
}

// Move the thief by a direction vector (already normalised) for dt seconds.
// `solids` is walls plus pedestals. Returns the events this step caused.
export function moveThief(thief, dx, dy, dt, solids, shadows) {
  const events = [];
  const speed = thief.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const stepX = dx * speed * dt;
  const stepY = dy * speed * dt;
  const afterX = collideCircle(thief.x + stepX, thief.y, PLAYER.radius, solids);
  const afterY = collideCircle(afterX.x, thief.y + stepY, PLAYER.radius, solids);
  const moved = Math.hypot(afterY.x - thief.x, afterY.y - thief.y);
  thief.x = afterY.x;
  thief.y = afterY.y;
  thief.moving = moved > 0.5;
  if (thief.moving) {
    thief.angle = Math.atan2(stepY, stepX);
    thief.stepPhase += dt * (thief.sneaking ? 4 : 7);
    if (thief.stepPhase > Math.PI * 2) {
      thief.stepPhase -= Math.PI * 2;
      events.push({ type: 'thiefStep', sneaking: thief.sneaking });
    }
  }
  thief.inShadow = pointInShadow(thief.x, thief.y, shadows);
  return events;
}

// The noise radius of the thief's footsteps: walking is heard across a
// room, sneaking barely past the next pedestal.
export function thiefNoiseRadius(thief) {
  if (!thief.moving) return 0;
  return thief.sneaking ? STEALTH.noiseRadiusSneak : STEALTH.noiseRadiusWalk;
}

// Toss a pebble toward (tx, ty), clamped to throw range. Returns the landing
// point or null when the thief is out of pebbles.
export function throwPebble(thief, tx, ty) {
  if (thief.pebbles <= 0) return null;
  const dx = tx - thief.x;
  const dy = ty - thief.y;
  const dist = Math.hypot(dx, dy);
  const reach = Math.min(dist, PLAYER.throwRange);
  thief.pebbles -= 1;
  if (dist === 0) return { x: thief.x, y: thief.y };
  return {
    x: thief.x + (dx / dist) * reach,
    y: thief.y + (dy / dist) * reach,
  };
}

// Lift any artifact within reach. Returns the ones just taken.
export function collectArtifacts(thief, artifacts) {
  const taken = [];
  for (let i = 0; i < artifacts.length; i += 1) {
    const a = artifacts[i];
    if (a.taken) continue;
    if (Math.hypot(a.x - thief.x, a.y - thief.y) < PLAYER.pickupRadius) {
      a.taken = true;
      thief.artifacts += 1;
      taken.push(a);
    }
  }
  return taken;
}

export function thiefInExit(thief, exit) {
  return thief.x >= exit.x && thief.x <= exit.x + exit.w
    && thief.y >= exit.y && thief.y <= exit.y + exit.h;
}
