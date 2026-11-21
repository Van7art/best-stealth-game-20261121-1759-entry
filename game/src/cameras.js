// Midnight Gallery — security cameras: fixed mounts that sweep their cone
// back and forth. A camera that sees the thief feeds the shared alarm fast,
// so crossing its sweep wants timing — or a shadow to hide in.

import { CAMERA } from './config.js';
import { conePolygon, visibilityFactor } from './vision.js';

export function makeCamera(def) {
  return {
    name: def.name,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    phase: def.phase,
    angle: def.baseAngle,
    seen: 0,
  };
}

export function updateCamera(camera, time) {
  camera.angle = camera.baseAngle + Math.sin(time * CAMERA.sweepSpeed + camera.phase) * camera.sweep;
}

export function cameraSeesThief(camera, thief, blockers, shadows) {
  return visibilityFactor(
    camera.x, camera.y, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle,
    thief, blockers, shadows,
  );
}

export function cameraCone(camera, blockers) {
  return conePolygon(camera.x, camera.y, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, blockers);
}
