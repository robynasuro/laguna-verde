// Screenshot shots. One job: given ?shot=<name>&seed=<n> in the URL,
// stage a deterministic, readable frame — the right camera, the right
// cars, the right mission state — and say when the frame is ready.
// The four shots are the entry's four screenshots.

export function getShotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    name: q.get('shot') || '',
    seed: parseInt(q.get('seed') || '1', 10) || 1,
  };
}

export function isShotMode() {
  return getShotParams().name !== '';
}

// Each shot stages the world, then hands the camera to render.js.
export const SHOT_DEFS = {
  cover: {
    desc: 'The cover: Carmen\'s car on the causeway, lagoon on both sides, downtown and the Ferris wheel ahead.',
    carAt: { x: -300, z: -80, heading: Math.PI / 2 },
    playerAt: null,
    cam: { pos: { x: -340, y: 14, z: -100 }, look: { x: -200, y: 10, z: -40 } },
    police: 0,
    heli: false,
    mission: 0,
  },
  drive: {
    desc: 'A chase across the causeway: two patrol cars behind, helicopter overhead, beam on.',
    carAt: { x: -370, z: -80, heading: Math.PI / 2 },
    playerAt: null,
    cam: 'side-chase', // camera tracks from over the lagoon, nothing to clip
    police: 2,
    heli: true,
    mission: 0,
    speed: 30,
  },
  mission: {
    desc: 'Mission one in progress: Mrs. Alvarez\'s fare, the hotel ahead, dialogue on screen.',
    carAt: { x: 120, z: -80, heading: 2.68 },
    playerAt: null,
    cam: null,
    police: 0,
    heli: false,
    mission: 1,
  },
  city: {
    desc: 'The whole city at golden hour: downtown grid, causeway, lagoon, lighthouse, boardwalk.',
    carAt: null,
    playerAt: { x: 40, z: 200, heading: 0 },
    cam: { pos: { x: 200, y: 170, z: 280 }, look: { x: -60, y: 0, z: -40 } },
    police: 0,
    heli: false,
    mission: 0,
  },
};

// Stage one shot. `game` is the object main.js owns: {layout, player,
// car, police, missions, hud, render, state}. Returns the camera mode
// main.js should use: 'fixed' or 'chase'.
export function applyShot(game, name) {
  const def = SHOT_DEFS[name];
  if (!def) return 'chase';
  const { layout } = game;

  if (def.carAt) {
    game.setPlayerCar(def.carAt.x, def.carAt.z, def.carAt.heading);
    if (def.speed) game.car.speed = def.speed;
  } else if (def.playerAt) {
    game.setPlayerOnFoot(def.playerAt.x, def.playerAt.z, def.playerAt.heading);
  }

  if (def.police > 0) {
    game.police.setStars(def.police);
    // Put the patrol cars right behind the player for the frame.
    const px = game.player.x;
    const pz = game.player.z;
    game.police.cars.forEach((c, i) => {
      c.x = px - Math.sin(game.player.heading) * (14 + i * 9);
      c.z = pz - Math.cos(game.player.heading) * (14 + i * 9);
      c.heading = game.player.heading;
      c.speed = 24;
    });
  }
  if (def.heli) {
    game.police.setStars(3);
  }
  if (def.mission) {
    game.missions.index = def.mission - 1;
    game.missions.start();
    game.hud.setObjective(game.missions.current.brief);
    // Long-lived in shot mode: the wall clock runs far slower than the
    // frame count under software rendering, so a short timer would lapse.
    game.hud.showDialogue(
      game.missions.current.client,
      game.missions.current.dialogue,
      300000,
    );
  }
  if (def.cam === 'side-chase') return 'side-chase';
  if (def.cam) {
    game.render.setCamera(def.cam.pos, def.cam.look);
    return 'fixed';
  }
  return 'chase';
}
