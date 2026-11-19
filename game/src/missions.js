// Story missions: Carmen pays off Tomas's $50,000 debt, one job at a time.
// One job: the mission list and the step engine that runs them.
export const DEBT_TOTAL = 50000;

export const MISSIONS = [
  {
    id: 1,
    name: 'First Fare',
    client: 'Mrs. Alvarez',
    pay: 1200,
    intro: 'Mrs. Alvarez: "Carmen, honey, my bus never came. Drive me to the clinic on 5th, and take it slow, my knees."',
    steps: [
      { type: 'goto', label: 'Pick up Mrs. Alvarez at the corner of 2nd and Coral', x: 0, z: 60 },
      { type: 'goto', label: 'Drive Mrs. Alvarez to the clinic downtown', x: 120, z: -120 },
    ],
    done: 'Mrs. Alvarez: "You drive like your father did. Steady hands. Tell Tomas I said hello."',
  },
  {
    id: 2,
    name: 'The Pickup',
    client: 'Rico',
    pay: 2500,
    intro: 'Rico: "A package is waiting behind the market on Coral. Grab it fast. The Sharks have eyes on that street."',
    steps: [
      { type: 'goto', label: 'Collect the package behind the market', x: 60, z: 120 },
      { type: 'goto', label: 'Bring the package back to the garage. Watch your back.', x: -132, z: 84 },
    ],
    ambushAt: 0,
    wantedOnPickup: 2,
    rivals: 3,
    done: 'Rico: "Clean. The Sharks showed up late and left empty handed. That is how you do it."',
  },
  {
    id: 3,
    name: 'Race the Tide',
    client: 'Tomas',
    pay: 4000,
    intro: 'Tomas: "Come on, sis. One race down the boardwalk. Beat my time and I will stop borrowing your tools. Probably."',
    steps: [
      {
        type: 'race',
        label: 'Race the boardwalk checkpoints. You need a car.',
        points: [[-150, -120], [-150, 120], [0, 120], [120, 120], [120, -60]],
        timeLimit: 100,
      },
    ],
    done: 'Tomas: "Fine, you win. You always win. Dad taught you too well."',
  },
  {
    id: 4,
    name: 'The Getaway',
    client: 'Lena',
    pay: 6000,
    intro: 'Lena: "The job went sideways. I am at the old depot and the police are already on the radio. Get me out of here."',
    steps: [
      { type: 'goto', label: 'Pick up Lena at the old depot', x: -60, z: -120 },
      { type: 'evade', label: 'Lose the police. Stay out of sight for 40 seconds.', seconds: 40, wanted: 3 },
      { type: 'goto', label: 'Drop Lena at the safe house by the canal', x: 180, z: 180 },
    ],
    done: 'Lena: "You drive like the city owes you something. Maybe it does."',
  },
  {
    id: 5,
    name: "Smuggler's Run",
    client: 'Captain Miro',
    pay: 8000,
    intro: 'Captain Miro: "The goods are on my boat at the marina. Take them over the causeway before dark, and do not stop for anyone."',
    dusk: true,
    steps: [
      { type: 'goto', label: 'Collect the goods from the marina', x: -185, z: 100 },
      { type: 'goto', label: 'Carry the goods over the causeway to the point', x: -250, z: 0 },
      { type: 'goto', label: 'Deliver to the lighthouse keeper', x: -228, z: -185 },
    ],
    done: 'Captain Miro: "Dusk suits this city. You did good, Carmen. The sea keeps your secrets."',
  },
  {
    id: 6,
    name: 'The Garage Job',
    client: 'Garage del Sol',
    pay: 10000,
    intro: 'Tomas: "Carmen, they are at the garage. The Sharks came to collect and they brought friends. Get back here now."',
    steps: [
      { type: 'defend', label: 'Defend the garage. Stop the Sharks crew.', x: -132, z: 84, count: 5 },
      { type: 'goto', label: 'Deliver the spare parts to the workshop downtown', x: 0, z: 180 },
    ],
    rivals: 5,
    done: 'Tomas: "The garage is still ours. Dad built this place with his own hands, and nobody takes it."',
  },
  {
    id: 7,
    name: 'Clear the Debt',
    client: 'Los Tiburones',
    pay: 0,
    intro: 'El Tiburon: "One last job, mechanic. Move my shipment across town and your brother walks free. Fail, and the debt doubles."',
    steps: [
      { type: 'goto', label: 'Pick up the shipment at the hillside villas', x: 180, z: -180 },
      { type: 'evade', label: 'The police are on you. Lose them for 30 seconds.', seconds: 30, wanted: 4 },
      { type: 'goto', label: 'Bring the shipment to the garage and end this.', x: -132, z: 84 },
    ],
    finale: true,
    done: 'Carmen: "Fifty thousand. Paid in full. Tomas, you are free. And you are never racing again."',
  },
];

export function createMissionEngine() {
  const M = { active: null, stepIdx: 0, timer: 0, cpIdx: 0, startedAt: 0 };

  function start(mission, ctx) {
    M.active = mission;
    M.stepIdx = 0;
    M.timer = 0;
    M.cpIdx = 0;
    ctx.say(mission.client, mission.intro);
    if (mission.dusk) ctx.setTimeOfDay(2);
    if (mission.id === 3) ctx.say('Tomas', 'First checkpoint is at the north end of the boardwalk. Go.');
    ctx.setObjective(mission.steps[0].label);
    ctx.setMarker(targetOf(mission, 0));
  }

  function targetOf(mission, stepIdx) {
    const s = mission.steps[stepIdx];
    if (!s) return null;
    if (s.type === 'race') return { x: s.points[M.cpIdx][0], z: s.points[M.cpIdx][1] };
    return { x: s.x, z: s.z };
  }

  function currentTarget() {
    return M.active ? targetOf(M.active, M.stepIdx) : null;
  }

  function advance(ctx) {
    const mission = M.active;
    M.stepIdx += 1;
    M.timer = 0;
    if (M.stepIdx >= mission.steps.length) {
      complete(ctx);
      return;
    }
    const s = mission.steps[M.stepIdx];
    ctx.setObjective(s.label);
    ctx.setMarker(targetOf(mission, M.stepIdx));
    if (s.type === 'evade') {
      ctx.setWanted(s.wanted);
      ctx.say('Radio', 'Police dispatch: suspect vehicle spotted. All units respond.');
    }
    if (s.type === 'defend') ctx.spawnRivals(s.x, s.z, s.count);
  }

  function complete(ctx) {
    const mission = M.active;
    // The finale pays whatever is left of the debt, not a fixed amount.
    const pay = mission.finale ? Math.max(0, DEBT_TOTAL - ctx.debtPaid) : mission.pay;
    ctx.pay(pay, mission);
    ctx.say(mission.client, mission.done);
    M.active = null;
    M.stepIdx = 0;
    M.timer = 0;
    M.cpIdx = 0;
    ctx.setObjective('Debt paid: $' + ctx.debtPaid.toLocaleString() + ' of $50,000. Visit the next mission marker when you are ready.');
    ctx.setMarker(null);
  }

  function update(dt, ctx) {
    if (!M.active) return;
    const mission = M.active;
    const s = mission.steps[M.stepIdx];
    const p = ctx.playerPos();
    if (s.type === 'goto') {
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < 7) {
        // Mission 2: picking the package up triggers the ambush.
        if (M.stepIdx === 0 && mission.ambushAt === 0) {
          ctx.setWanted(mission.wantedOnPickup || 0);
          ctx.spawnRivals(p.x + 12, p.z + 8, mission.rivals || 0);
          ctx.say('Rico', 'Sharks. Right on time. Do not let them take the package.');
        }
        advance(ctx);
      }
    } else if (s.type === 'race') {
      M.timer += dt;
      const pt = s.points[M.cpIdx];
      const d = Math.hypot(p.x - pt[0], p.z - pt[1]);
      if (d < 10) {
        M.cpIdx += 1;
        if (M.cpIdx >= s.points.length) {
          advance(ctx);
          return;
        }
        ctx.setMarker(targetOf(mission, M.stepIdx));
        ctx.say('Tomas', 'Checkpoint ' + (M.cpIdx + 1) + ' of ' + s.points.length + '. Keep it flat out.');
      }
      if (M.timer > s.timeLimit) ctx.failMission('Out of time. Tomas is already laughing at you.');
    } else if (s.type === 'evade') {
      M.timer += dt;
      // The step ends the moment the heat is gone.
      if (ctx.wanted() === 0) {
        advance(ctx);
        return;
      }
      // A minute past the target time with the police still on you is a fail.
      if (M.timer > s.seconds + 60) ctx.failMission('The police never lost you. The job is blown.');
    } else if (s.type === 'defend') {
      if (ctx.rivalsLeft() === 0) advance(ctx);
    }
  }

  function fail(ctx, reason) {
    const mission = M.active;
    M.active = null;
    M.stepIdx = 0;
    M.timer = 0;
    M.cpIdx = 0;
    ctx.setMarker(null);
    ctx.onFail(mission, reason);
  }

  return { M, start, update, complete, fail, currentTarget, targetOf };
}
