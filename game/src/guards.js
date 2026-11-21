// Midnight Gallery — guards: patrol, suspicion, investigation and chase.
// A guard has four moods. PATROL walks its loop and pauses at each stop.
// SUSPICIOUS walks to the last place it glimpsed the thief and looks around.
// CHASE runs at the thief's last known position while the alarm is up.
// INVESTIGATE walks to a noise (a footstep heard, a pebble landing) and
// looks around. Suspicion is the fuel: seeing the thief raises it, losing
// sight lets it drain, and at full it trips the alarm for everyone.

import { GUARD, ALARM } from './config.js';
import { angleDifference, guardSeesThief } from './vision.js';

export const MOOD_PATROL = 'patrol';
export const MOOD_SUSPICIOUS = 'suspicious';
export const MOOD_CHASE = 'chase';
export const MOOD_INVESTIGATE = 'investigate';

export function makeGuard(def, index) {
  const start = def.waypoints[def.startIndex] || def.waypoints[0];
  const next = def.waypoints[(def.startIndex + 1) % def.waypoints.length];
  return {
    name: def.name,
    index,
    x: start.x,
    y: start.y,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    waypoints: def.waypoints,
    waypointIndex: (def.startIndex + 1) % def.waypoints.length,
    mood: MOOD_PATROL,
    suspicion: 0,
    pauseLeft: 0.8,
    lookTimer: 0,
    lookAngle: 0,
    investigateX: start.x,
    investigateY: start.y,
    lastSeenX: start.x,
    lastSeenY: start.y,
    lastSeenAt: -999,
    stepPhase: index * 1.7,
  };
}

// Steer toward (tx, ty) at `speed`, sliding along walls instead of sticking.
// Returns true when the guard arrived (within 6px).
export function moveToward(guard, tx, ty, speed, dt, collide) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return true;
  const step = Math.min(dist, speed * dt);
  const nx = (dx / dist) * step;
  const ny = (dy / dist) * step;
  const afterX = collide(guard.x + nx, guard.y, guard);
  const afterY = collide(afterX.x, guard.y + ny, guard);
  guard.x = afterY.x;
  guard.y = afterY.y;
  guard.angle = Math.atan2(ny, nx);
  return dist - step < 6;
}

function turnToward(guard, targetAngle, rate, dt) {
  const diff = angleDifference(targetAngle, guard.angle);
  const turn = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.angle += turn;
}

export function hearNoise(guard, x, y, radius) {
  if (guard.mood === MOOD_CHASE) return;
  const dist = Math.hypot(x - guard.x, y - guard.y);
  if (dist > radius) return;
  guard.mood = MOOD_INVESTIGATE;
  guard.investigateX = x;
  guard.investigateY = y;
  guard.suspicion = Math.max(guard.suspicion, 0.35);
}

// One guard, one tick. `world` carries the thief, blockers, shadows, the
// shared alarm and the clock; `events` collects sounds and alerts to play.
export function updateGuard(guard, world, dt, events) {
  const { thief, blockers, shadows } = world;
  const seen = guardSeesThief(guard, thief, blockers, shadows);
  const now = world.time;

  if (seen > 0) {
    guard.suspicion = Math.min(1, guard.suspicion + seen * GUARD.spotRate * dt);
    guard.lastSeenX = thief.x;
    guard.lastSeenY = thief.y;
    guard.lastSeenAt = now;
    if (guard.suspicion >= GUARD.alarmAt && world.alarm < 1) {
      world.alarm = 1;
      events.push({ type: 'alarm', x: guard.x, y: guard.y });
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.calmRate * dt);
  }

  const alarmUp = world.alarm >= 1;
  const recentSeen = now - guard.lastSeenAt < ALARM.chaseMemory;

  if (alarmUp && (seen > 0 || recentSeen)) {
    guard.mood = MOOD_CHASE;
  } else if (guard.mood === MOOD_CHASE && !alarmUp && !recentSeen) {
    guard.mood = MOOD_SUSPICIOUS;
    guard.investigateX = guard.lastSeenX;
    guard.investigateY = guard.lastSeenY;
    guard.lookTimer = GUARD.investigateSeconds;
  } else if (guard.mood === MOOD_SUSPICIOUS && guard.suspicion < 0.2) {
    guard.mood = MOOD_PATROL;
  } else if (guard.mood === MOOD_PATROL && guard.suspicion >= GUARD.suspiciousAt) {
    guard.mood = MOOD_SUSPICIOUS;
    guard.investigateX = guard.lastSeenX;
    guard.investigateY = guard.lastSeenY;
    guard.lookTimer = GUARD.investigateSeconds;
  }

  if (guard.mood === MOOD_PATROL) {
    updatePatrol(guard, dt, world.collide);
  } else if (guard.mood === MOOD_CHASE) {
    const arrived = moveToward(guard, thief.x, thief.y, GUARD.chaseSpeed, dt, world.collide);
    if (arrived) {
      guard.mood = MOOD_SUSPICIOUS;
      guard.lookTimer = 1.2;
    }
  } else {
    // SUSPICIOUS and INVESTIGATE both walk to a point, then look around.
    const arrived = moveToward(
      guard, guard.investigateX, guard.investigateY,
      guard.mood === MOOD_INVESTIGATE ? GUARD.suspiciousSpeed : GUARD.suspiciousSpeed,
      dt, world.collide,
    );
    if (arrived) {
      guard.lookTimer -= dt;
      turnToward(guard, guard.lookAngle, 2.2, dt);
      if (guard.lookTimer <= 0) {
        guard.lookAngle = guard.angle + (guard.index % 2 === 0 ? 2.4 : -2.4);
        guard.lookTimer = GUARD.investigateSeconds * 0.5;
        if (guard.suspicion < 0.2) {
          guard.mood = MOOD_PATROL;
          guard.pauseLeft = 0.5;
        }
      }
    } else {
      guard.lookAngle = guard.angle;
      guard.lookTimer = GUARD.investigateSeconds;
    }
  }

  // Footstep ticks so the player can hear a guard coming around a corner.
  guard.stepPhase += dt * (guard.mood === MOOD_CHASE ? 5.2 : 3.1);
  if (guard.stepPhase > Math.PI * 2) {
    guard.stepPhase -= Math.PI * 2;
    const d = Math.hypot(thief.x - guard.x, thief.y - guard.y);
    if (d < 260) events.push({ type: 'guardStep', distance: d });
  }
}

function updatePatrol(guard, dt, collide) {
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    // While paused the guard slowly scans the room.
    guard.angle += Math.sin(guard.pauseLeft * 2.2) * 0.35 * dt;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, collide);
  if (arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = 1.1;
  }
}

// Caught means a chasing guard got within touching distance of the thief.
export function guardCaughtThief(guard, thief) {
  return guard.mood === MOOD_CHASE
    && Math.hypot(thief.x - guard.x, thief.y - guard.y) < GUARD.touchRadius;
}
