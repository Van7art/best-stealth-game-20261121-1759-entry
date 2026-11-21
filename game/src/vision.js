// Midnight Gallery — sight: line of sight, vision cones and spotting.
// All sight in the game is geometry: a watcher sees the thief when the
// thief is inside the watcher's cone, within range, and no wall or pedestal
// stands between them. Cones are drawn by casting rays across the cone and
// stopping each ray at the first blocker it hits.

import { GUARD, STEALTH } from './config.js';

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// Does the segment (x1,y1)-(x2,y2) cross the rect? Slab test, so a ray that
// only grazes a corner still counts as blocked.
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// Distance from (x, y) along the unit direction (dx, dy) to the first hit
// on the rect, or Infinity when the ray misses it entirely.
export function rayHitRect(x, y, dx, dy, rect) {
  let tMin = 0;
  let tMax = Infinity;
  if (dx === 0) {
    if (x < rect.x || x > rect.x + rect.w) return Infinity;
  } else {
    let t1 = (rect.x - x) / dx;
    let t2 = (rect.x + rect.w - x) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  if (dy === 0) {
    if (y < rect.y || y > rect.y + rect.h) return Infinity;
  } else {
    let t1 = (rect.y - y) / dy;
    let t2 = (rect.y + rect.h - y) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  return tMin;
}

export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  // Nudge the start a hair toward the target: a watcher standing flush
  // against a wall must still see past it, not be blinded by the wall
  // its own shoulder touches.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    x1 += (dx / len) * 1.5;
    y1 += (dy / len) * 1.5;
  }
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

// Cast rays across a cone and return the polygon of what the watcher can
// see: each ray stops at the nearest blocker or at the cone's range.
export function conePolygon(x, y, angle, range, halfAngle, blockers) {
  const rays = 26;
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    // Start a hair out from the watcher, for the same reason as in
    // hasLineOfSight: a wall the watcher leans on must not clip the cone.
    const ox = x + dx * 1.5;
    const oy = y + dy * 1.5;
    let dist = range;
    for (let b = 0; b < blockers.length; b += 1) {
      const hit = rayHitRect(ox, oy, dx, dy, blockers[b]);
      if (hit < dist) dist = hit;
    }
    points.push({ x: ox + dx * dist, y: oy + dy * dist });
  }
  return points;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function pointInShadow(x, y, shadows) {
  for (let i = 0; i < shadows.length; i += 1) {
    const s = shadows[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

// How clearly a watcher at (wx, wy) facing `angle` sees the thief:
// 0 means invisible, 1 means standing in the open right in front of them.
// Shadow shrinks the watcher's effective range; sneaking shrinks it a bit
// more; distance fades the rest.
export function visibilityFactor(wx, wy, angle, range, halfAngle, thief, blockers, shadows) {
  const dx = thief.x - wx;
  const dy = thief.y - wy;
  const dist = Math.hypot(dx, dy);
  let effectiveRange = range;
  if (thief.inShadow) effectiveRange *= STEALTH.shadowRangeFactor;
  if (thief.sneaking) effectiveRange *= STEALTH.sneakRangeFactor;
  if (dist > effectiveRange) return 0;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(toThief, angle)) > halfAngle) return 0;
  if (!hasLineOfSight(wx, wy, thief.x, thief.y, blockers)) return 0;
  // Closer and more centred in the cone reads clearer.
  const rangePart = 1 - dist / effectiveRange;
  const anglePart = 1 - Math.abs(angleDifference(toThief, angle)) / halfAngle;
  let factor = 0.35 + 0.65 * (rangePart * 0.6 + anglePart * 0.4);
  if (thief.inShadow) factor *= STEALTH.shadowSpotFactor;
  if (thief.sneaking) factor *= STEALTH.sneakSpotFactor;
  return clamp01(factor);
}

// Guard-specific wrapper: the thief object carries x, y, sneaking, inShadow.
export function guardSeesThief(guard, thief, blockers, shadows) {
  return visibilityFactor(
    guard.x, guard.y, guard.angle, GUARD.viewRange, GUARD.viewHalfAngle,
    thief, blockers, shadows,
  );
}
