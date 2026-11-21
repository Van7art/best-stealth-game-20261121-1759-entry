// Midnight Gallery — the game itself: state machine, detection, alarm,
// pickups and win/lose. One tick updates the thief, every guard, every
// camera and every laser, then resolves what the tick caused: a stolen
// artifact, a tripped laser, a guard close enough to grab the thief, or
// the thief slipping out the exit with all three artifacts.

import { ALARM, CAMERA, GUARD, PLAYER } from './config.js';
import { buildLevel } from './level.js';
import { makeGuard, updateGuard, guardCaughtThief, hearNoise, MOOD_CHASE } from './guards.js';
import { makeCamera, updateCamera, cameraSeesThief } from './cameras.js';
import { makeLaser, updateLaser, crossedLiveBeam } from './lasers.js';
import {
  makeThief, moveThief, throwPebble, collectArtifacts, thiefInExit,
  thiefNoiseRadius, collideCircle,
} from './player.js';
import { pointInShadow } from './vision.js';

export const STATE_TITLE = 'title';
export const STATE_PLAY = 'play';
export const STATE_PAUSED = 'paused';
export const STATE_CAUGHT = 'caught';
export const STATE_WON = 'won';

export function makeGame() {
  const level = buildLevel();
  const game = {
    state: STATE_TITLE,
    level,
    thief: makeThief(level.playerStart),
    guards: level.guards.map((def, i) => makeGuard(def, i)),
    cameras: level.cameras.map(makeCamera),
    lasers: level.lasers.map(makeLaser),
    blockers: [...level.walls, ...level.pedestals],
    time: 0,
    alarm: 0,
    alarmsTripped: 0,
    peakSuspicion: 0,
    message: '',
    messageUntil: 0,
    winTime: 0,
    events: [],
  };
  game.collide = (x, y, entity) => collideCircle(x, y, GUARD.radius, game.blockers);
  return game;
}

export function resetGame(game) {
  const fresh = makeGame();
  Object.assign(game, fresh);
  game.state = STATE_PLAY;
  game.events.push({ type: 'start' });
}

function showMessage(game, text, seconds = 2.5) {
  game.message = text;
  game.messageUntil = game.time + seconds;
}

function tripAlarm(game, reason) {
  if (game.alarm < 1) game.alarmsTripped += 1;
  game.alarm = 1;
  for (const guard of game.guards) {
    guard.lastSeenX = game.thief.x;
    guard.lastSeenY = game.thief.y;
    guard.lastSeenAt = game.time;
    guard.mood = MOOD_CHASE;
  }
  game.events.push({ type: 'alarm', reason });
  showMessage(game, reason === 'laser' ? 'LASER TRIPPED — RUN!' : 'SPOTTED — THE GALLERY IS HUNTING YOU', 2.5);
}

// One tick of play. `move` is a normalised {x, y} or null; `click` is a
// logical {x, y} or null; `sneaking` is the Shift state.
export function updatePlay(game, dt, move, click, sneaking) {
  const { thief } = game;
  game.time += dt;

  thief.sneaking = sneaking;
  const prevX = thief.x;
  const prevY = thief.y;
  if (move) {
    const stepEvents = moveThief(thief, move.x, move.y, dt, game.blockers, game.level.shadows);
    for (const e of stepEvents) game.events.push(e);
    if (thief.moving && !thief.sneaking) {
      const radius = thiefNoiseRadius(thief);
      for (const guard of game.guards) hearNoise(guard, thief.x, thief.y, radius);
    }
  } else {
    thief.moving = false;
    thief.inShadow = pointInShadow(thief.x, thief.y, game.level.shadows);
  }

  if (click) {
    const landing = throwPebble(thief, click.x, click.y);
    if (landing) {
      game.events.push({ type: 'pebble', x: landing.x, y: landing.y });
      for (const guard of game.guards) hearNoise(guard, landing.x, landing.y, 320);
    } else {
      showMessage(game, 'Out of pebbles', 1.2);
    }
  }

  // Lasers: crossing a live beam trips the alarm at once.
  for (const laser of game.lasers) {
    updateLaser(laser, game.time);
    if (crossedLiveBeam(laser, prevX, prevY, thief.x, thief.y)) {
      tripAlarm(game, 'laser');
      game.events.push({ type: 'laser', x: thief.x, y: thief.y });
    }
  }

  // Cameras feed the shared alarm while they see the thief.
  let cameraSees = false;
  for (const camera of game.cameras) {
    updateCamera(camera, game.time);
    const seen = cameraSeesThief(camera, thief, game.blockers, game.level.shadows);
    camera.seen = seen;
    if (seen > 0) {
      cameraSees = true;
      game.alarm = Math.min(1, game.alarm + seen * CAMERA.spotRate * dt);
      for (const guard of game.guards) {
        guard.lastSeenX = thief.x;
        guard.lastSeenY = thief.y;
        guard.lastSeenAt = game.time;
      }
    }
  }
  if (game.alarm >= 1 && game.alarmsTripped === 0) game.alarmsTripped = 1;

  // Guards: sight, suspicion, patrol and chase.
  let anyoneSees = cameraSees;
  for (const guard of game.guards) {
    const before = guard.suspicion;
    updateGuard(guard, game, dt, game.events);
    game.peakSuspicion = Math.max(game.peakSuspicion, guard.suspicion);
    if (guard.suspicion >= 0.55 && before < 0.55) {
      game.events.push({ type: 'suspicious', x: guard.x, y: guard.y });
    }
    if (guard.suspicion > 0) anyoneSees = true;
  }

  // The alarm drains while nobody can see the thief.
  if (!anyoneSees && game.alarm > 0) {
    game.alarm = Math.max(0, game.alarm - ALARM.decayRate * dt);
  }

  // Artifacts.
  const taken = collectArtifacts(thief, game.level.artifacts);
  for (const artifact of taken) {
    game.events.push({ type: 'pickup', name: artifact.name });
    showMessage(game, `Stole the ${artifact.name}  (${thief.artifacts}/3)`, 2.5);
  }

  // Caught: a chasing guard within touching distance.
  for (const guard of game.guards) {
    if (guardCaughtThief(guard, thief)) {
      game.state = STATE_CAUGHT;
      game.events.push({ type: 'caught' });
      return;
    }
  }

  // Exit: only open with all three artifacts.
  if (thiefInExit(thief, game.level.exit)) {
    if (thief.artifacts >= 3) {
      game.state = STATE_WON;
      game.winTime = game.time;
      game.events.push({ type: 'win' });
    } else if (game.time > game.messageUntil) {
      showMessage(game, `The exit is locked — steal all 3 artifacts first (${thief.artifacts}/3)`, 2);
    }
  }
}

export function thiefRating(game) {
  if (game.alarmsTripped === 0) return 'GHOST';
  if (game.alarmsTripped === 1) return 'SHADOW';
  return 'SPOTTED';
}

export function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// The remaining artifacts, for the HUD and the win check.
export function artifactsLeft(game) {
  return game.level.artifacts.filter((a) => !a.taken).length;
}

export function guardMoodLabel(guard) {
  if (guard.mood === MOOD_CHASE) return '!';
  if (guard.suspicion >= 0.55) return '?';
  return '';
}
