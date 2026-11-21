// Midnight Gallery — render: everything the player sees, drawn on one
// 2D canvas. Floor tiles and gold-trimmed walls, shadow pockets, pedestals
// and glowing artifacts, raycast vision cones for guards and cameras,
// laser curtains, the thief and the guards, then the HUD and the title /
// caught / won overlays. Nothing here loads an image: every shape is
// drawn, so the game needs no asset files at all.

import { VIEW, COLORS, GUARD, CAMERA } from './config.js';
import { conePolygon } from './vision.js';
import { guardMoodLabel, formatTime, thiefRating, STATE_TITLE, STATE_PAUSED, STATE_CAUGHT, STATE_WON } from './game.js';
import { MOOD_CHASE } from './guards.js';

const TILE = 40;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx) {
  for (let ty = 0; ty < VIEW.height / TILE; ty += 1) {
    for (let tx = 0; tx < VIEW.width / TILE; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW.width; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.height); ctx.stroke();
  }
  for (let y = 0; y <= VIEW.height; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.width, y); ctx.stroke();
  }
}

function drawShadows(ctx, shadows) {
  for (const s of shadows) {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = COLORS.shadowEdge;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(150, 175, 255, 0.5)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.label, s.x + s.w / 2, s.y + s.h / 2 + 3);
  }
}

function drawExit(ctx, exit, open) {
  ctx.fillStyle = open ? 'rgba(57, 217, 138, 0.25)' : 'rgba(57, 217, 138, 0.10)';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = COLORS.exit;
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x + 1, exit.y + 1, exit.w - 2, exit.h - 2);
  // The door itself, set into the south wall.
  ctx.fillStyle = open ? COLORS.exit : COLORS.exitDark;
  ctx.fillRect(exit.x + 8, 610, exit.w - 16, 14);
  ctx.fillStyle = open ? '#062b1a' : '#9fe8c3';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT — OPEN' : 'EXIT', exit.x + exit.w / 2, 606);
}

function drawArtifacts(ctx, artifacts, time) {
  for (const a of artifacts) {
    if (a.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(time * 3 + a.x);
    // Plinth.
    ctx.fillStyle = '#241f33';
    ctx.fillRect(a.x - 14, a.y - 10, 28, 22);
    ctx.strokeStyle = '#6b6390';
    ctx.lineWidth = 1;
    ctx.strokeRect(a.x - 14.5, a.y - 10.5, 29, 23);
    // Glowing artifact: a spinning diamond.
    ctx.save();
    ctx.translate(a.x, a.y - 16);
    ctx.rotate(Math.sin(time * 1.4 + a.x) * 0.25);
    ctx.shadowColor = COLORS.artifact;
    ctx.shadowBlur = 12 * pulse;
    ctx.fillStyle = COLORS.artifact;
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(8, 0); ctx.lineTo(0, 11); ctx.lineTo(-8, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.name.toUpperCase(), a.x, a.y + 24);
  }
}

function drawPedestals(ctx, pedestals) {
  for (const p of pedestals) {
    ctx.fillStyle = COLORS.pedestal;
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.pedestalTop;
    roundRect(ctx, p.x + 5, p.y + 5, p.w - 10, p.h - 10, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1, 6);
    ctx.stroke();
  }
}

function drawWalls(ctx, walls) {
  for (const w of walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = COLORS.wallTrim;
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
}

function drawLasers(ctx, lasers) {
  for (const laser of lasers) {
    for (const b of laser.beams) {
      ctx.strokeStyle = laser.live ? COLORS.laser : COLORS.laserOff;
      ctx.lineWidth = laser.live ? 3 : 1.5;
      ctx.setLineDash(laser.live ? [] : [4, 6]);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.setLineDash([]);
      if (laser.live) {
        ctx.fillStyle = '#ff5c7a';
        ctx.beginPath(); ctx.arc(b.x1, b.y1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(b.x2, b.y2, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (laser.warning) {
      const b = laser.beams[0];
      ctx.fillStyle = 'rgba(255, 45, 85, 0.8)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LASERS ARMING…', (b.x1 + b.x2) / 2, Math.min(b.y1, b.y2) - 10);
    }
  }
}

function drawCone(ctx, polygon, fill, edge) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i += 1) ctx.lineTo(polygon[i].x, polygon[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuards(ctx, guards, blockers, time) {
  for (const guard of guards) {
    const alarm = guard.mood === MOOD_CHASE;
    const suspicious = guard.suspicion >= 0.55;
    const fill = alarm ? COLORS.coneAlarm : suspicious ? COLORS.coneSuspicious : COLORS.coneCalm;
    const edge = alarm ? 'rgba(255, 60, 60, 0.7)' : suspicious ? 'rgba(255, 150, 50, 0.7)' : COLORS.coneCalmEdge;
    const cone = conePolygon(guard.x, guard.y, guard.angle, GUARD.viewRange, GUARD.viewHalfAngle, blockers);
    drawCone(ctx, cone, fill, edge);

    // Body: a watchman with a torch, facing the cone.
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, GUARD.radius + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd9c2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD.radius + 6), guard.y + Math.sin(guard.angle) * (GUARD.radius + 6));
    ctx.stroke();
    // Eyes.
    const ex = Math.cos(guard.angle + Math.PI / 2) * 4.5;
    const ey = Math.sin(guard.angle + Math.PI / 2) * 4.5;
    ctx.fillStyle = '#1a0d08';
    ctx.beginPath(); ctx.arc(guard.x + Math.cos(guard.angle) * 4 + ex, guard.y + Math.sin(guard.angle) * 4 + ey, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(guard.x + Math.cos(guard.angle) * 4 - ex, guard.y + Math.sin(guard.angle) * 4 - ey, 1.8, 0, Math.PI * 2); ctx.fill();

    // Suspicion ring above the guard, plus ? / ! when alerted.
    if (guard.suspicion > 0.05) {
      const pct = guard.suspicion;
      ctx.strokeStyle = pct >= 1 ? '#ff3c3c' : pct >= 0.55 ? '#ff9632' : '#ffd65a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 22, 8, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
    }
    const label = guardMoodLabel(guard);
    if (label) {
      ctx.fillStyle = alarm ? '#ff3c3c' : '#ff9632';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, guard.x, guard.y - 26);
    }
    ctx.fillStyle = 'rgba(242, 234, 216, 0.75)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y + GUARD.radius + 13);
  }
}

function drawCameras(ctx, cameras, blockers) {
  for (const camera of cameras) {
    const cone = conePolygon(camera.x, camera.y, camera.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, blockers);
    drawCone(ctx, cone, COLORS.coneCamera, COLORS.coneCameraEdge);
    // Mount and lens.
    ctx.fillStyle = '#20242f';
    ctx.beginPath(); ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = camera.seen > 0 ? '#ff3c3c' : '#7de3ff';
    ctx.beginPath(); ctx.arc(camera.x, camera.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7de3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.lineTo(camera.x + Math.cos(camera.angle) * 13, camera.y + Math.sin(camera.angle) * 13);
    ctx.stroke();
    if (camera.seen > 0) {
      ctx.fillStyle = '#ff3c3c';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED', camera.x, camera.y - 14);
    }
  }
}

function drawThief(ctx, thief, time) {
  // A faint ring while walking shows how far the footsteps carry.
  if (thief.moving && !thief.sneaking) {
    ctx.strokeStyle = 'rgba(127, 231, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(thief.x, thief.y, 34, 0, Math.PI * 2); ctx.stroke();
  }
  if (thief.inShadow) {
    ctx.strokeStyle = 'rgba(120, 150, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(thief.x, thief.y, 17, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = COLORS.playerDark;
  ctx.beginPath(); ctx.arc(thief.x, thief.y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath(); ctx.arc(thief.x, thief.y, 11, 0, Math.PI * 2); ctx.fill();
  // Hood point in the facing direction.
  ctx.fillStyle = COLORS.playerDark;
  ctx.beginPath();
  ctx.moveTo(thief.x + Math.cos(thief.angle) * 15, thief.y + Math.sin(thief.angle) * 15);
  ctx.lineTo(thief.x + Math.cos(thief.angle + 2.5) * 8, thief.y + Math.sin(thief.angle + 2.5) * 8);
  ctx.lineTo(thief.x + Math.cos(thief.angle - 2.5) * 8, thief.y + Math.sin(thief.angle - 2.5) * 8);
  ctx.closePath(); ctx.fill();
  // Eyes.
  const ex = Math.cos(thief.angle + Math.PI / 2) * 4;
  const ey = Math.sin(thief.angle + Math.PI / 2) * 4;
  ctx.fillStyle = '#06222e';
  ctx.beginPath(); ctx.arc(thief.x + Math.cos(thief.angle) * 4 + ex, thief.y + Math.sin(thief.angle) * 4 + ey, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(thief.x + Math.cos(thief.angle) * 4 - ex, thief.y + Math.sin(thief.angle) * 4 - ey, 1.7, 0, Math.PI * 2); ctx.fill();
  if (thief.sneaking) {
    ctx.fillStyle = 'rgba(242, 234, 216, 0.85)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAKING', thief.x, thief.y - 20);
  }
  if (thief.inShadow) {
    ctx.fillStyle = 'rgba(150, 175, 255, 0.9)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', thief.x, thief.y + 24);
  }
}

function drawHud(ctx, game) {
  const { thief } = game;
  ctx.save();
  // Top strip.
  ctx.fillStyle = 'rgba(10, 12, 22, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, 36);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ARTIFACTS  ${thief.artifacts}/3`, 14, 23);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`PEBBLES ${thief.pebbles}`, 170, 23);
  // Alarm meter, centre, with its label to the left of the bar.
  const mw = 220;
  const mx = VIEW.width / 2 - mw / 2;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(game.alarm >= 1 ? 'ALARM!' : 'ALARM', mx - 10, 23);
  ctx.fillStyle = '#3a2b2b';
  ctx.fillRect(mx, 11, mw, 14);
  ctx.fillStyle = game.alarm >= 1 ? '#ff3c3c' : game.alarm > 0.4 ? '#ff9632' : '#ffd65a';
  ctx.fillRect(mx, 11, mw * game.alarm, 14);
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, 11.5, mw - 1, 13);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatTime(game.time), VIEW.width - 14, 23);
  // Transient message, bottom centre.
  if (game.message && game.time < game.messageUntil) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(game.message).width + 28;
    ctx.fillStyle = 'rgba(10, 12, 22, 0.78)';
    ctx.fillRect(VIEW.width / 2 - tw / 2, VIEW.height - 52, tw, 30);
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(game.message, VIEW.width / 2, VIEW.height - 31);
  }
  // Controls hint, bottom left.
  ctx.fillStyle = 'rgba(242, 234, 216, 0.55)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD / arrows move · Shift sneak · Click toss a pebble · M mute · P pause', 12, VIEW.height - 12);
  ctx.restore();
}

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(6, 8, 16, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function overlayPanel(ctx, title, lines, accent) {
  dimScreen(ctx, 0.72);
  ctx.fillStyle = 'rgba(16, 19, 32, 0.92)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  const pw = 640;
  const ph = 110 + lines.length * 30;
  const px = VIEW.width / 2 - pw / 2;
  const py = VIEW.height / 2 - ph / 2;
  roundRect(ctx, px, py, pw, ph, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, py + 52);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '15px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, py + 92 + i * 30);
  });
}

export function render(ctx, game) {
  const { level } = game;
  drawFloor(ctx);
  drawShadows(ctx, level.shadows);
  drawExit(ctx, level.exit, game.thief.artifacts >= 3);
  drawArtifacts(ctx, level.artifacts, game.time);
  drawPedestals(ctx, level.pedestals);
  drawWalls(ctx, level.walls);
  drawLasers(ctx, game.lasers);
  drawCameras(ctx, game.cameras, game.blockers);
  drawGuards(ctx, game.guards, game.blockers, game.time);
  drawThief(ctx, game.thief, game.time);
  drawHud(ctx, game);

  if (game.state === STATE_TITLE) {
    overlayPanel(ctx, 'MIDNIGHT GALLERY', [
      'A top-down museum heist. Steal all 3 artifacts, then slip out the exit unseen.',
      'Guards patrol with vision cones — stay out of the yellow, or hide in shadow.',
      'Cameras sweep the halls. Lasers blink on a rhythm: cross only while dark.',
      'Sneak with Shift. Click to toss a pebble and lure a guard away.',
      'Press Enter or click to begin.',
    ], '#ffd94d');
  } else if (game.state === STATE_PAUSED) {
    overlayPanel(ctx, 'PAUSED', ['Press P to keep sneaking.'], '#7fe7ff');
  } else if (game.state === STATE_CAUGHT) {
    overlayPanel(ctx, 'CAUGHT!', [
      `The wardens caught you with ${game.thief.artifacts}/3 artifacts stolen.`,
      `Time in the gallery: ${formatTime(game.time)} · Alarms tripped: ${game.alarmsTripped}`,
      'Press R to try again.',
    ], '#ff3c3c');
  } else if (game.state === STATE_WON) {
    overlayPanel(ctx, 'CLEAN GETAWAY', [
      `All 3 artifacts stolen in ${formatTime(game.winTime)} — rating: ${thiefRating(game)}.`,
      `Alarms tripped: ${game.alarmsTripped} · Peak suspicion: ${Math.round(game.peakSuspicion * 100)}%`,
      'Press R to run the heist again.',
    ], '#39d98a');
  }
}
