// Midnight Gallery — shared tuning constants for the whole game.
// Every number the game balances on lives here so a single file can be read
// to understand how the thief, the guards, the cameras and the lasers behave.

export const VIEW = { width: 960, height: 640 };

export const PLAYER = {
  radius: 11,
  walkSpeed: 152,
  sneakSpeed: 84,
  // A pebble can be tossed this far; guards investigate where it lands.
  throwRange: 230,
  // How close the thief must be to lift an artifact off its pedestal.
  pickupRadius: 30,
};

export const GUARD = {
  radius: 12,
  patrolSpeed: 62,
  suspiciousSpeed: 88,
  chaseSpeed: 122,
  // Vision cone shape.
  viewRange: 178,
  viewHalfAngle: 0.58,
  // A guard standing this close to the thief always notices, cone or not.
  touchRadius: 26,
  // Suspicion 0..1; how fast it grows while the thief is clearly seen.
  spotRate: 0.85,
  // How fast suspicion fades while the thief is unseen.
  calmRate: 0.22,
  // Suspicion at which a guard stops patrolling and goes to look.
  suspiciousAt: 0.55,
  // Suspicion at which the alarm sounds and every guard gives chase.
  alarmAt: 1.0,
  // How long a guard stares at a spot before giving up and patrolling again.
  investigateSeconds: 4.5,
};

export const CAMERA = {
  viewRange: 205,
  viewHalfAngle: 0.34,
  // Degrees per second the camera head sweeps.
  sweepSpeed: 0.55,
  // Suspicion a camera feeds into the shared alarm while it sees the thief.
  spotRate: 1.15,
};

// A thief in shadow is much harder to spot: vision range shrinks and
// suspicion grows slower. Sneaking has the same kind of effect.
export const STEALTH = {
  shadowRangeFactor: 0.55,
  shadowSpotFactor: 0.35,
  sneakRangeFactor: 0.8,
  sneakSpotFactor: 0.6,
  // Moving at full speed is noisy: guards this close hear the footsteps.
  noiseRadiusWalk: 70,
  noiseRadiusSneak: 26,
};

// Global alarm 0..1: raised by cameras and lasers, decays while nobody sees
// the thief. At 1 the whole gallery is hunting.
export const ALARM = {
  laserTrip: 1.0,
  decayRate: 0.12,
  // Seconds the alarm keeps guards chasing after the thief breaks sight.
  chaseMemory: 3.0,
};

export const LASER = {
  // Seconds a beam stays live, then dark, then live again.
  onSeconds: 2.6,
  offSeconds: 1.7,
  // The last half-second before a beam goes live it flickers as a warning.
  warnSeconds: 0.5,
};

export const COLORS = {
  floorA: '#2a2f45',
  floorB: '#262b40',
  floorLine: '#333a55',
  wall: '#171a26',
  wallTrim: '#c9a227',
  pedestal: '#3d3a55',
  pedestalTop: '#4d4870',
  shadow: 'rgba(8, 12, 30, 0.55)',
  shadowEdge: 'rgba(120, 150, 255, 0.35)',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneCalmEdge: 'rgba(255, 214, 90, 0.55)',
  coneSuspicious: 'rgba(255, 150, 50, 0.28)',
  coneAlarm: 'rgba(255, 60, 60, 0.30)',
  coneCamera: 'rgba(120, 220, 255, 0.20)',
  coneCameraEdge: 'rgba(120, 220, 255, 0.55)',
  laser: 'rgba(255, 45, 85, 0.9)',
  laserOff: 'rgba(255, 45, 85, 0.18)',
  player: '#7fe7ff',
  playerDark: '#1b6f8a',
  guard: '#ff7a45',
  guardDark: '#8a2f16',
  artifact: '#ffd94d',
  exit: '#39d98a',
  exitDark: '#0f5c34',
  hudText: '#f2ead8',
  hudDim: '#a89f86',
};
