// Midnight Gallery — entry point: canvas, game loop, screenshot scenes.
// The game starts on its title screen and plays at 60Hz with a clamped
// delta. With ?shot=cover|sneak|alarm|exit in the URL it instead stages
// that scripted scene from shots.js and freezes on it, so a screenshot
// always catches the same frame. Game events are turned into sounds here.

import { VIEW } from './config.js';
import {
  makeGame, resetGame, updatePlay, STATE_TITLE, STATE_PLAY,
  STATE_PAUSED, STATE_CAUGHT, STATE_WON,
} from './game.js';
import { makeInput, moveDirection, isSneaking, takeClick, takePressed } from './input.js';
import { makeAudio, playSound, toggleMute } from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');

const game = makeGame();
const input = makeInput(canvas);
const audio = makeAudio();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
let frozen = false;

if (shotName) {
  // Screenshot mode: stage the scene once and hold the frame still.
  stageShot(shotName, game);
  frozen = true;
}

function drainEvents() {
  const events = game.events.splice(0, game.events.length);
  for (const event of events) playSound(audio, event.type, event);
}

function describeState() {
  if (!statusLine) return;
  const thief = game.thief;
  const text = game.state === STATE_TITLE
    ? 'Midnight Gallery: title screen. Press Enter to start the heist.'
    : game.state === STATE_WON
      ? `Clean getaway! All 3 artifacts stolen in ${game.winTime.toFixed(0)} seconds.`
      : game.state === STATE_CAUGHT
        ? `Caught with ${thief.artifacts} of 3 artifacts stolen. Press R to try again.`
        : `Playing. ${thief.artifacts} of 3 artifacts stolen. Alarm ${Math.round(game.alarm * 100)} percent.`;
  if (statusLine.textContent !== text) statusLine.textContent = text;
}

function handlePressed(pressed) {
  if (pressed.has('mute')) {
    const muted = toggleMute(audio);
    game.message = muted ? 'Sound off' : 'Sound on';
    game.messageUntil = game.time + 1.2;
  }
  if (pressed.has('restart') && (game.state === STATE_CAUGHT || game.state === STATE_WON || game.state === STATE_PLAY)) {
    resetGame(game);
  }
  if (pressed.has('pause')) {
    if (game.state === STATE_PLAY) game.state = STATE_PAUSED;
    else if (game.state === STATE_PAUSED) game.state = STATE_PLAY;
  }
  if (pressed.has('confirm')) {
    if (game.state === STATE_TITLE) resetGame(game);
    else if (game.state === STATE_CAUGHT || game.state === STATE_WON) resetGame(game);
  }
}

function tick(dt) {
  const pressed = takePressed(input);
  handlePressed(pressed);
  if (game.state === STATE_PLAY) {
    const click = takeClick(input);
    updatePlay(game, dt, moveDirection(input), click, isSneaking(input));
  } else {
    takeClick(input);
  }
  drainEvents();
  render(ctx, game);
  describeState();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!frozen) tick(dt);
  requestAnimationFrame(frame);
}

if (frozen) {
  // One frozen render of the staged scene; the loop keeps repainting the
  // same frame so the screenshot is stable whenever it is taken.
  render(ctx, game);
  describeState();
  requestAnimationFrame(function hold() {
    render(ctx, game);
    requestAnimationFrame(hold);
  });
} else {
  requestAnimationFrame(frame);
}
