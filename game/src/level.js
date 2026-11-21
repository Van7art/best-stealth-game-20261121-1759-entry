// Midnight Gallery — the museum floor plan.
// One fixed, hand-designed level: outer walls, room dividers with doorways,
// pedestals to hide behind, shadow pockets to vanish in, three artifacts,
// two sweeping cameras, two laser doorways and the exit door.
// Coordinates are in the 960x640 logical view; every rect is {x, y, w, h}.

export const WALL_THICKNESS = 16;

// Rects that block movement and block line of sight.
export function buildWalls() {
  const walls = [];
  const add = (x, y, w, h) => walls.push({ x, y, w, h });
  // Outer shell.
  add(0, 0, 960, WALL_THICKNESS); // north
  add(0, 624, 960, WALL_THICKNESS); // south (exit gap is a zone, not a hole)
  add(0, 0, WALL_THICKNESS, 640); // west
  add(944, 0, WALL_THICKNESS, 640); // east
  // West wing divider (x 200..216) with a doorway at y 240..300.
  add(200, 16, 16, 224);
  add(200, 300, 16, 180);
  // East wing divider (x 744..760) with a doorway at y 240..300.
  add(744, 16, 16, 224);
  add(744, 300, 16, 180);
  // North gallery divider (y 164..180) with doorways at x 300..360 and 600..660.
  add(216, 164, 84, 16);
  add(360, 164, 240, 16);
  add(660, 164, 84, 16);
  // A freestanding wall in the central hall, splitting sight lines.
  add(440, 300, 80, 16);
  add(440, 380, 16, 84);
  return walls;
}

// Pedestals: low display blocks. They block movement and sight, so the
// thief can duck behind them — they are the cover the level is built on.
export function buildPedestals() {
  return [
    { x: 296, y: 340, w: 46, h: 46 },
    { x: 618, y: 340, w: 46, h: 46 },
    { x: 296, y: 396, w: 46, h: 46 },
    { x: 618, y: 396, w: 46, h: 46 },
    { x: 96, y: 330, w: 44, h: 44 },
    { x: 150, y: 430, w: 44, h: 44 },
    { x: 820, y: 330, w: 44, h: 44 },
    { x: 766, y: 430, w: 44, h: 44 },
    { x: 240, y: 84, w: 44, h: 44 },
    { x: 676, y: 84, w: 44, h: 44 },
  ];
}

// Shadow pockets: dark, unlit floor. Standing in one shrinks every cone
// that could catch the thief and slows suspicion to a crawl.
export function buildShadows() {
  return [
    { x: 24, y: 396, w: 116, h: 76, label: 'SHADOW' },
    { x: 820, y: 396, w: 116, h: 76, label: 'SHADOW' },
    { x: 224, y: 24, w: 96, h: 56, label: 'SHADOW' },
    { x: 640, y: 24, w: 96, h: 56, label: 'SHADOW' },
    { x: 700, y: 500, w: 120, h: 64, label: 'SHADOW' },
    { x: 140, y: 500, w: 120, h: 64, label: 'SHADOW' },
  ];
}

// The three artifacts, each on its own pedestal in a different wing.
export function buildArtifacts() {
  return [
    { id: 'idol', name: 'Sunken Idol', x: 108, y: 132, taken: false },
    { id: 'vase', name: 'Crimson Vase', x: 480, y: 92, taken: false },
    { id: 'mask', name: 'Gilded Mask', x: 852, y: 132, taken: false },
  ];
}

// The exit: a green door in the south wall. It only opens once all three
// artifacts are stolen; until then it is just a door.
export const EXIT_ZONE = { x: 440, y: 576, w: 80, h: 48 };

// Guard patrol loops. Each guard walks its waypoints in order, pausing
// briefly at each one to look around.
export function buildGuards() {
  return [
    {
      name: 'Warden Hale',
      waypoints: [
        { x: 260, y: 220 },
        { x: 700, y: 220 },
        { x: 700, y: 440 },
        { x: 260, y: 440 },
      ],
      startIndex: 0,
    },
    {
      name: 'Warden Moss',
      waypoints: [
        { x: 104, y: 120 },
        { x: 104, y: 268 },
        { x: 280, y: 268 },
        { x: 280, y: 120 },
      ],
      startIndex: 1,
    },
    {
      name: 'Warden Pike',
      waypoints: [
        { x: 856, y: 120 },
        { x: 856, y: 268 },
        { x: 680, y: 268 },
        { x: 680, y: 120 },
      ],
      startIndex: 2,
    },
  ];
}

// Fixed security cameras: a mount point, the direction they face at rest,
// and how far they sweep each way. Their cones are drawn in cyan.
export function buildCameras() {
  return [
    { name: 'Cam North', x: 480, y: 182, baseAngle: Math.PI / 2, sweep: 0.85, phase: 0 },
    { name: 'Cam South', x: 480, y: 470, baseAngle: -Math.PI / 2, sweep: 0.7, phase: 1.6 },
  ];
}

// Laser doorways: a set of parallel beams across a gap. Beams share one
// timer, so the whole doorway blinks live and dark together.
export function buildLasers() {
  return [
    {
      name: 'West Door Lasers',
      // Three vertical beams across the west doorway (x 206, y 240..300).
      beams: [
        { x1: 206, y1: 242, x2: 206, y2: 262 },
        { x1: 206, y1: 264, x2: 206, y2: 284 },
        { x1: 206, y1: 286, x2: 206, y2: 298 },
      ],
      phase: 0,
    },
    {
      name: 'North Door Lasers',
      // One horizontal curtain across the middle north doorway (y 172,
      // x 380..580): walking north through the gap crosses the beam line.
      beams: [
        { x1: 380, y1: 172, x2: 430, y2: 172 },
        { x1: 432, y1: 172, x2: 482, y2: 172 },
        { x1: 484, y1: 172, x2: 534, y2: 172 },
        { x1: 536, y1: 172, x2: 580, y2: 172 },
      ],
      phase: 1.9,
    },
  ];
}

// Where the thief starts: just inside the exit hall, at the south door.
export const PLAYER_START = { x: 480, y: 540 };

export function buildLevel() {
  return {
    walls: buildWalls(),
    pedestals: buildPedestals(),
    shadows: buildShadows(),
    artifacts: buildArtifacts(),
    exit: EXIT_ZONE,
    guards: buildGuards(),
    cameras: buildCameras(),
    lasers: buildLasers(),
    playerStart: PLAYER_START,
  };
}
