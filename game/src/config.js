// Laguna Verde: Carmen's Debt — tuning and shared constants.
// One job: every number the rest of the game reads lives here, so a
// balance change is a one-line edit and never a hunt through the code.

export const CONFIG = {
  title: 'Laguna Verde: Carmen\'s Debt',
  debtTotal: 50000,
  startMoney: 250,
  startHealth: 100,

  // World: a square city, 800 by 800 metres, lagoon on the west side.
  worldSize: 800,
  halfSize: 400,
  roadSpacing: 80,
  roadWidth: 12,
  sidewalkWidth: 4,

  // Golden hour: low warm sun, turquoise water, warm haze.
  sunColor: 0xffb36b,
  sunIntensity: 2.4,
  skyTop: 0x7fb4d8,
  skyHorizon: 0xffc98a,
  fogColor: 0xf2b27a,
  fogNear: 260,
  fogFar: 900,
  waterColor: 0x2fb3a6,
  waterColorDeep: 0x1a7f8e,

  // Player on foot.
  walkSpeed: 7,
  runSpeed: 11,
  playerRadius: 0.6,
  playerHeight: 1.8,

  // Driving: arcade, forgiving, quick to feel right.
  carAccel: 22,
  carBrake: 34,
  carReverseAccel: 12,
  carMaxSpeed: 46,
  carMaxReverse: 12,
  carTurn: 1.9,
  carGrip: 6.5,
  carDrag: 0.35,

  // Wanted: 0 to 5 stars. Crimes add heat, hiding sheds it.
  wantedMax: 5,
  wantedDecaySeconds: 14,
  heliAtStars: 3,
  policePerStar: 1,
  policeTopSpeed: 44,

  // Traffic and crowds.
  trafficCars: 14,
  pedestrians: 26,
  trafficSpeed: 11,

  // Combat.
  pistolDamage: 34,
  pistolRange: 60,
  pistolRate: 0.22,
  enemyHealth: 60,

  // Garage upgrades, bought with mission money.
  upgrades: {
    engine: { name: 'Engine tune', cost: 900, desc: '+25% top speed' },
    handling: { name: 'Sport suspension', cost: 700, desc: 'Sharper steering' },
    armor: { name: 'Armored panels', cost: 800, desc: 'Car takes half damage' },
  },

  // Radio: three procedural stations, no audio files.
  stations: [
    { name: 'Laguna FM', tag: 'sunset synth', bpm: 96, root: 57, mode: 'minor' },
    { name: 'Tiburon Rock', tag: 'street guitar', bpm: 132, root: 52, mode: 'minor' },
    { name: 'Marina Nights', tag: 'late jazz', bpm: 76, root: 60, mode: 'major' },
  ],

  // Missions pay; the debt meter is the progression.
  missionPayouts: [400, 900, 1400, 2200, 3000, 4200, 50000],

  // Screenshot shots, matched by shots.json.
  shots: ['cover', 'drive', 'mission', 'city'],
};

export const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  brake: ['Space'],
  enterCar: ['KeyE'],
  shoot: ['KeyF'],
  garage: ['KeyG'],
  radio: ['KeyR'],
  pause: ['KeyP'],
  timeOfDay: ['KeyT'],
  mute: ['KeyM'],
  mission: ['KeyN'],
};
