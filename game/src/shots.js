// Screenshot scenes. Each one stages the real game (real city, real cars,
// real HUD) into a fixed frame, so a screenshot is a render of the game
// itself, not a mockup. Used with ?shot=cover|drive|mission|city.
import * as THREE from '../vendor/three.module.min.js';

export function stageShot(name, G, sys) {
  const { missions, ctx, police, combat, playerMesh, R, WORLD, hud } = sys;
  const setCam = (x, y, z, lx, ly, lz) => {
    G.shotCam = {
      pos: new THREE.Vector3(x, y, z),
      look: new THREE.Vector3(lx, ly, lz),
    };
  };

  if (name === 'cover') {
    // Golden hour on the causeway: Carmen driving toward the city, Ferris
    // wheel and lagoon on the left, downtown ahead, mission marker glowing.
    G.timeOfDay = 1;
    R.setTimeOfDay(1);
    const car = G.starterCar;
    car.pos.set(-205, 0, 0);
    car.heading = Math.PI / 2;
    car.speed = 0;
    car.mesh.position.set(-205, 1.2, 0);
    car.mesh.rotation.y = car.heading;
    sys.enterCar(car);
    setCam(-235, 46, -22, -172, 0, 3);
    hud.setObjective('First Fare. Pick up Mrs. Alvarez at the corner of 2nd and Coral.');
    G.marker = { x: 0, z: 60 };
    ctx.setMarker(G.marker);
    hud.say('Mrs. Alvarez', 'Carmen, honey, my bus never came. Drive me to the clinic on 5th, and take it slow, my knees.');
    G.shotDialog = {
      who: 'Mrs. Alvarez',
      text: 'Carmen, honey, my bus never came. Drive me to the clinic on 5th, and take it slow, my knees.',
    };
  } else if (name === 'drive') {
    // Downtown police chase at dusk: 3 stars, two patrol cars on Carmen, the
    // helicopter overhead with its searchlight.
    G.timeOfDay = 2;
    R.setTimeOfDay(2);
    const car = G.starterCar;
    car.pos.set(0, 0, -40);
    car.heading = 0;
    car.speed = 24;
    car.mesh.position.set(0, 0, -40);
    car.mesh.rotation.y = 0;
    sys.enterCar(car);
    police.wanted = 3;
    G.wanted = 3;
    police.spawnCar({ x: 0, z: -40 });
    police.spawnCar({ x: 0, z: -40 });
    for (const pc of police.cars) {
      pc.pos.set(-8, 0, -70);
      pc.heading = 0;
      pc.speed = 26;
    }
    police.spawnHeli();
    police.heli.pos.set(14, 44, -18);
    hud.setObjective('The Getaway. Lose the police. Stay out of sight for 40 seconds.');
    hud.flash('WANTED: 3 stars. Air-1 is overhead.');
    setCam(-16, 8, -72, 0, 2, -30);
  } else if (name === 'mission') {
    // On foot at the garage, rivals closing in, dialogue up, marker on the minimap.
    G.timeOfDay = 1;
    R.setTimeOfDay(1);
    playerMesh.position.set(-120, 0, 78);
    playerMesh.rotation.y = Math.PI;
    combat.spawnRivals(-108, 90, 3);
    hud.setObjective('The Pickup. Bring the package back to the garage. Watch your back.');
    hud.say('Rico', 'Sharks. Right on time. Do not let them take the package.');
    G.shotDialog = {
      who: 'Rico',
      text: 'Sharks. Right on time. Do not let them take the package.',
    };
    G.marker = { x: -132, z: 84 };
    ctx.setMarker(G.marker);
    setCam(-152, 7, 102, -114, 2, 74);
  } else if (name === 'city') {
    // Wide view over the lagoon: pier, Ferris wheel, lighthouse, causeway, marina.
    G.timeOfDay = 1;
    R.setTimeOfDay(1);
    playerMesh.position.set(-150, 0, 40);
    hud.setObjective('Laguna Verde. Seven jobs stand between Carmen and a clear debt.');
    setCam(-260, 85, -150, -120, 0, 40);
  } else {
    // Unknown name: fall back to the cover.
    return stageShot('cover', G, sys);
  }

  // Freeze the staged frame: stop the player from driving off while the
  // shot is taken.
  G.shotStaged = true;
}
