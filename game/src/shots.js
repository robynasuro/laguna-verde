// Screenshot scenes. Each one stages the real game (the real city, real
// cars, real HUD) into a fixed frame, so a screenshot is a render of the
// game itself, not a mockup. Used with ?shot=cover|drive|mission|city.
import * as THREE from '../vendor/three.module.min.js';

export function stageShot(name, G, sys) {
  const { missions, ctx, police, combat, playerMesh, R, WORLD, hud } = sys;

  function setCam(x, y, z, lx, ly, lz) {
    G.shotCam = {
      pos: new THREE.Vector3(x, y, z),
      look: new THREE.Vector3(lx, ly, lz),
    };
  }

  function setTime(t) {
    G.timeOfDay = t;
    R.setTimeOfDay(t);
  }

  function driveStarter(x, z, heading, speed) {
    const car = G.starterCar;
    car.pos.set(x, 0, z);
    car.heading = heading;
    car.speed = speed;
    car.mesh.position.set(x, deckY(x, z), z);
    car.mesh.rotation.y = heading;
    sys.enterCar(car);
  }

  function deckY(x, z) {
    // The causeway deck sits at 1.2; everywhere else the car sits on the ground.
    return x < -150 && Math.abs(z) < 9 && x >= -262 ? 1.2 : 0;
  }

  function stageCover() {
    // Golden hour on the causeway: Carmen driving toward the city, Ferris
    // wheel and lagoon on the left, downtown ahead, mission marker glowing.
    setTime(1);
    driveStarter(-205, 0, Math.PI / 2, 0);
    setCam(-228, 16, -18, -182, 1, 2);
    hud.setObjective('First Fare. Pick up Mrs. Alvarez at the corner of 2nd and Coral.');
    G.marker = { x: 0, z: 60 };
    ctx.setMarker(G.marker);
    const line = 'Carmen, honey, my bus never came. Drive me to the clinic on 5th, and take it slow, my knees.';
    hud.say('Mrs. Alvarez', line);
    G.shotDialog = { who: 'Mrs. Alvarez', text: line };
  }

  function stageDrive() {
    // Downtown police chase at dusk: 3 stars, two patrol cars on Carmen, the
    // helicopter overhead with its searchlight.
    setTime(2);
    driveStarter(0, -40, 0, 24);
    police.wanted = 3;
    G.wanted = 3;
    police.spawnCar({ x: 0, z: -40 });
    police.spawnCar({ x: 0, z: -40 });
    for (const pc of police.cars) {
      pc.pos.set(7, 0, -16);
      pc.mesh.position.set(7, 0, -16);
      pc.heading = Math.PI;
      pc.mesh.rotation.y = Math.PI;
      pc.speed = 26;
    }
    police.cars[1].pos.set(-7, 0, -6);
    police.cars[1].mesh.position.set(-7, 0, -6);
    police.spawnHeli();
    // Low enough to sit inside the frame, so the searchlight beam reads.
    police.heli.pos.set(2, 30, -20);
    hud.setObjective('The Getaway. Lose the police. Stay out of sight for 40 seconds.');
    hud.flash('WANTED: 3 stars. Air-1 is overhead.');
    setCam(-16, 7, -64, 2, 6, -30);
  }

  function stageMission() {
    // On foot at the garage, rivals closing in, dialogue up, marker on the minimap.
    setTime(1);
    playerMesh.position.set(-120, 0, 78);
    playerMesh.rotation.y = Math.PI;
    combat.spawnRivals(-108, 90, 3);
    hud.setObjective('The Pickup. Bring the package back to the garage. Watch your back.');
    const line = 'Sharks. Right on time. Do not let them take the package.';
    hud.say('Rico', line);
    G.shotDialog = { who: 'Rico', text: line };
    G.marker = { x: -132, z: 84 };
    ctx.setMarker(G.marker);
    setCam(-152, 7, 102, -114, 2, 74);
  }

  function stageCity() {
    // Wide view over the lagoon: pier, Ferris wheel, lighthouse, causeway, marina.
    setTime(1);
    playerMesh.position.set(-150, 0, 40);
    hud.setObjective('Laguna Verde. Seven jobs stand between Carmen and a clear debt.');
    setCam(-260, 85, -150, -120, 0, 40);
  }

  const stages = { cover: stageCover, drive: stageDrive, mission: stageMission, city: stageCity };
  const run = stages[name] || stages.cover;
  run();

  // Freeze the staged frame: stop the player from driving off while the
  // shot is taken.
  G.shotStaged = true;
}
