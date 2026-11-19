// Laguna Verde: Carmen's Debt — tuning, world constants, story data.
// Everything the other modules need to agree on lives here, in one place.

export const CONFIG = {
  // World extents (x east, z south, y up). Downtown grid, lagoon south of it.
  world: {
    minX: -220,
    maxX: 240,
    minZ: -280,
    maxZ: 200,
    lagoonZ0: -260, // lagoon water spans z -260 .. -60
    lagoonZ1: -60,
    waterY: -0.35,
  },
  // Golden hour look.
  sky: {
    day: 0x87b5d6,
    golden: 0xffc98a,
    dusk: 0xe08a5a,
    night: 0x1b2340,
  },
  // Player / car tuning.
  player: {
    walkSpeed: 7,
    runSpeed: 11,
    health: 100,
    startMoney: 250,
    debtTotal: 50000,
  },
  car: {
    accel: 16,
    brake: 30,
    maxSpeed: 38,
    reverseMax: 12,
    steerMax: 0.55,
    grip: 0.92,
    health: 100,
  },
  traffic: { count: 14, speed: 11, parked: 9 },
  pedestrians: { count: 26 },
  police: { maxCars: 5, chaseSpeed: 40, heliAtWanted: 3 },
  saveKey: 'laguna-verde-save-v1',
};

// The story arc. Each mission is a list of stages the player works through
// in order. Stage types: goto (reach a point), pickup (reach + press E),
// deliver (reach a point), race (checkpoints in order), defend (defeat
// attackers), escape (reach a point while wanted). Payouts feed the debt.
export const MISSIONS = [
  {
    id: 1,
    name: 'First Fare',
    client: 'Mrs. Alvarez',
    intro: 'Take me to the market on Calle Verde, dear. My knees are not what they were.',
    payout: 400,
    stages: [
      { type: 'pickup', target: [-100, 140], text: 'Pick up Mrs. Alvarez at her house on Calle Verde.' },
      { type: 'deliver', target: [50, 20], text: 'Drive Mrs. Alvarez to the market downtown.' },
    ],
  },
  {
    id: 2,
    name: 'The Pickup',
    client: 'Rico',
    intro: 'Grab the package behind the marina warehouse. If anyone in a black jacket shows up, drive. Do not ask.',
    payout: 900,
    stages: [
      { type: 'pickup', target: [90, -170], text: 'Collect the package behind the marina warehouse.' },
      { type: 'deliver', target: [20, 120], text: 'Bring the package back to Garage del Sol. Rival crew is on the move.' },
    ],
    ambush: true,
  },
  {
    id: 3,
    name: 'Race the Tide',
    client: 'Tomas',
    intro: 'Beat the tide crew down the boardwalk. Three checkpoints, no shortcuts. Loser pays for the tacos.',
    payout: 1200,
    stages: [
      { type: 'race', target: [-120, -240], text: 'Race checkpoint 1 of 3: west end of the boardwalk.' },
      { type: 'race', target: [120, -240], text: 'Race checkpoint 2 of 3: east end of the boardwalk.' },
      { type: 'race', target: [0, -240], text: 'Race checkpoint 3 of 3: finish at the pier.' },
    ],
    race: true,
  },
  {
    id: 4,
    name: 'The Getaway',
    client: 'Lucia',
    intro: 'The job went sideways. Get me to the safehouse before the cops box us in.',
    payout: 1800,
    stages: [
      { type: 'pickup', target: [-60, 60], text: 'Pick up Lucia near the plaza.' },
      { type: 'escape', target: [-120, 100], text: 'Escape to the canal safehouse. Lose the police on the way.' },
    ],
    wanted: 3,
  },
  {
    id: 5,
    name: "Smuggler's Run",
    client: 'El Capitan',
    intro: 'Crates over the causeway before dusk turns to night. No stops, no lights off.',
    payout: 2500,
    stages: [
      { type: 'pickup', target: [0, -230], text: 'Load the crates at the pier.' },
      { type: 'deliver', target: [100, 180], text: 'Deliver the crates to the south warehouse.' },
    ],
    timeOfDay: 'dusk',
  },
  {
    id: 6,
    name: 'The Garage Job',
    client: 'Carmen',
    intro: 'Los Tiburones sent boys to smash the garage. Hold them off. This place is my father\u2019s.',
    payout: 3000,
    stages: [
      { type: 'defend', target: [20, 120], text: 'Defend Garage del Sol. Stop 5 attackers.' },
    ],
    attackers: 5,
  },
  {
    id: 7,
    name: 'Clear the Debt',
    client: 'Tomas',
    intro: 'One last run. The Tiburones\u2019 money, their own truck. We take it, the debt dies tonight.',
    payout: 50000,
    stages: [
      { type: 'pickup', target: [150, 60], text: 'Grab the cash from the Tiburones truck downtown.' },
      { type: 'escape', target: [20, 120], text: 'Bring it home to the garage. Every cop in the city is coming.' },
    ],
    wanted: 4,
  },
];

// Radio stations. Each station is a set of musical parameters the audio
// engine turns into a live procedural pattern. No audio files anywhere.
export const STATIONS = [
  { name: 'Laguna FM', genre: 'dembow', bpm: 96, root: 55 },
  { name: 'Solaris Synth', genre: 'synthwave', bpm: 104, root: 49 },
  { name: 'Marea Lo-Fi', genre: 'lofi', bpm: 72, root: 57 },
];

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine tune', desc: '+top speed, +acceleration', cost: 1500, max: 3 },
  { id: 'armor', name: 'Armor plating', desc: '+car health', cost: 1200, max: 3 },
  { id: 'handling', name: 'Sport handling', desc: '+steering grip', cost: 1000, max: 3 },
];

export const CONTROLS = [
  ['W A S D', 'Move / drive'],
  ['Mouse', 'Look around'],
  ['E', 'Enter / exit car, steal car, interact'],
  ['Space', 'Brake / handbrake'],
  ['F', 'Fire pistol (on foot)'],
  ['G', 'Garage upgrades (near Garage del Sol)'],
  ['R', 'Change radio station'],
  ['T', 'Time of day'],
  ['M', 'Mute'],
  ['P', 'Pause'],
];
