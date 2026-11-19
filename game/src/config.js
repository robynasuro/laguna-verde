// Laguna Verde: shared constants. One job: the numbers every module agrees on.
// World units are metres. The city grid is axis-aligned; roads run at fixed x/z lines.

export const CONFIG = {
  worldSize: 500,
  halfWorld: 250,
  roadsX: [-100, -50, 0, 50, 100, 150],
  roadsZ: [-150, -100, -50, 0, 50, 100, 150],
  roadWidth: 10,
  debtTotal: 50000,
  startMoney: 0,
  startHealth: 100,
  garagePos: { x: 20, z: 100 },
  garageRadius: 40,
  playerStart: { x: 2, z: 102, yaw: 0 },
  carStart: { x: 0, z: 100, yaw: 0 },
  markerRadius: 22,
  maxWanted: 5,
  saveKey: 'laguna-verde-save-v1',
  timeOfDayCycle: ['golden', 'dusk', 'night'],
  stations: ['Sol Del Mar', 'Tiburon Rock', 'Laguna FM'],
  upgradePrices: {
    engine: [1500, 2600, 4200],
    handling: [1200, 2200, 3600],
    armor: [1000, 1800, 3000],
  },
  upgradeNames: ['engine', 'handling', 'armor'],
  upgradeLabels: { engine: 'Engine', handling: 'Handling', armor: 'Armor' },
  colors: {
    ground: 0x8a9a5b,
    sand: 0xd9c28a,
    road: 0x3a3a40,
    roadLine: 0xd8d8d8,
    sidewalk: 0x9a9a94,
    water: 0x2fa8b8,
    lagoonDeep: 0x1e7f96,
    buildingPalette: [0xe8b04b, 0xd96a4f, 0x7fb069, 0x5b8fb9, 0xc98bb9, 0xf2e3c9, 0x8a6fb8, 0xe07a5f],
    roofPalette: [0x8a4b3a, 0x5b6b7a, 0x7a6a4b, 0x4b5b6b],
    palmTrunk: 0x7a5a3a,
    palmLeaf: 0x3f8f4f,
    ferris: 0xe85d75,
    lighthouse: 0xf2f2f2,
    lighthouseTop: 0xd94040,
    garage: 0xe8b04b,
    playerCar: 0xd94040,
    policeCar: 0x2a4d8f,
    heli: 0x2a4d8f,
    enemy: 0x3a3a3a,
  },
};

// The player car's top speed in units per second (x3.6 = km/h on the HUD).
export const CAR = {
  accel: 18,
  brake: 30,
  drag: 0.35,
  reverseTop: 8,
  topSpeed: 28,
  steerRate: 1.9,
  onFootSpeed: 6,
};

export const ENEMY = {
  health: 100,
  shotDamage: 40,
  range: 45,
  aimCone: 0.3,
  fireInterval: 3.5,
  fireDamage: 3,
  fireHitChance: 0.5,
  fireRange: 60,
};
