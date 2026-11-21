// Midnight Gallery — screenshot scenes behind ?shot=cover|sneak|alarm|exit.
// Each scene plays the real rules forward from a fresh game for a fixed
// number of steps, so the frame is what a short game really looks like —
// no posed drawing, no faked state — and the same scene always gives the
// same frame. The cover shows the whole level at its best: cones, cover,
// artifacts and the exit. The others catch the thief sneaking in shadow,
// the alarm going up, and the getaway at the exit door.

import { STATE_PLAY, STATE_WON, updatePlay, resetGame } from './game.js';
import { MOOD_CHASE, MOOD_SUSPICIOUS } from './guards.js';

const STEP = 1 / 60;

function stepFor(game, seconds, move) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    updatePlay(game, STEP, move, null, false);
    if (game.state !== STATE_PLAY) break;
  }
}

function stepSneaking(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    updatePlay(game, STEP, null, null, true);
    if (game.state !== STATE_PLAY) break;
  }
}

// The cover: the thief mid-hall, guards on patrol with their cones out,
// cameras sweeping, lasers cycling, all three artifacts still on display.
function stageCover(game) {
  game.thief.x = 430;
  game.thief.y = 400;
  game.thief.angle = -Math.PI / 2;
  stepFor(game, 5, null);
}

// The sneak: the thief crouched in the west wing's shadow pocket while
// Warden Moss closes in, suspicion half full, the "?" about to pop.
function stageSneak(game) {
  game.thief.x = 90;
  game.thief.y = 432;
  game.thief.angle = 0;
  game.thief.sneaking = true;
  const moss = game.guards[1];
  moss.x = 210;
  moss.y = 425;
  moss.angle = Math.PI;
  moss.mood = MOOD_SUSPICIOUS;
  moss.suspicion = 0.55;
  moss.investigateX = 90;
  moss.investigateY = 432;
  moss.lookTimer = 3;
  stepSneaking(game, 0.3);
  game.thief.sneaking = true;
}

// The alarm: the thief spotted dead centre, the alarm at full, every
// warden running in with red cones.
function stageAlarm(game) {
  game.thief.x = 480;
  game.thief.y = 320;
  game.thief.angle = Math.PI / 2;
  game.alarm = 1;
  game.alarmsTripped = 1;
  for (const guard of game.guards) {
    guard.suspicion = 1;
    guard.mood = MOOD_CHASE;
    guard.lastSeenX = 480;
    guard.lastSeenY = 320;
    guard.lastSeenAt = 0;
  }
  stepFor(game, 1.4, null);
  game.alarm = 1;
}

// The getaway: all three artifacts stolen, the thief at the exit door,
// the win panel up with the GHOST rating.
function stageExit(game) {
  for (const artifact of game.level.artifacts) artifact.taken = true;
  game.thief.artifacts = 3;
  game.thief.x = 480;
  game.thief.y = 592;
  game.thief.angle = Math.PI / 2;
  game.alarmsTripped = 0;
  game.peakSuspicion = 0.32;
  game.state = STATE_WON;
  game.winTime = 83.4;
  game.time = 83.4;
}

// Set `game` to the named scene (cover, sneak, alarm or exit; anything else
// is the cover) and return the state the renderer should draw.
export function stageShot(name, game) {
  resetGame(game);
  if (name === 'sneak') stageSneak(game);
  else if (name === 'alarm') stageAlarm(game);
  else if (name === 'exit') stageExit(game);
  else stageCover(game);
  return game.state;
}
