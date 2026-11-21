// Midnight Gallery — input: keyboard movement and mouse pebble tosses.
// WASD or arrows move, Shift sneaks, M mutes, R restarts, P pauses.
// A mouse click tosses a pebble toward the clicked floor tile (or starts
// the game from the title screen). The canvas reports clicks in logical
// coordinates, so the game never has to know the window size.

export function makeInput(canvas) {
  const input = {
    keys: new Set(),
    // A click waiting to be consumed by the game loop: {x, y} in logical px.
    click: null,
    // One-shot key presses the game consumes each frame.
    pressed: new Set(),
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const action = KEYMAP[event.code];
    if (action) {
      input.keys.add(action);
      event.preventDefault();
    }
    if (event.code === 'KeyM') input.pressed.add('mute');
    if (event.code === 'KeyR') input.pressed.add('restart');
    if (event.code === 'KeyP' || event.code === 'Escape') input.pressed.add('pause');
    if (event.code === 'Enter' || event.code === 'Space') {
      input.pressed.add('confirm');
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });
  // A click anywhere also counts as a confirm, so the title screen starts
  // on a mouse click as well as on Enter.
  canvas.addEventListener('mousedown', () => input.pressed.add('confirm'));

  return input;
}

// The movement direction from the keys held, normalised, or null when idle.
export function moveDirection(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('left')) x -= 1;
  if (input.keys.has('right')) x += 1;
  if (input.keys.has('up')) y -= 1;
  if (input.keys.has('down')) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

export function isSneaking(input) {
  return input.keys.has('sneak');
}

// Take and clear the pending click, if any.
export function takeClick(input) {
  const click = input.click;
  input.click = null;
  return click;
}

// Take and clear one-shot presses (mute, restart, pause, confirm).
export function takePressed(input) {
  const pressed = input.pressed;
  input.pressed = new Set();
  return pressed;
}
