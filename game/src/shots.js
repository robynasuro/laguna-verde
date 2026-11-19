// Screenshot staging. One job: when the page loads with ?shot=<name>,
// put the game into the exact scene that shot needs (positions, mission,
// wanted level, camera, time of day) and let the driver know it is ready.
// In shot mode the player's car gets synthetic throttle so the shot catches
// it moving instead of coasting to a stop.

export function applyShot(game, name) {
  const p = game.player;
  const car = p.car;
  game.state = 'playing';
  game.shotMode = true;
  game.shotThrottle = false;
  game.setTimeOfDay('golden');
  document.getElementById('start-menu').style.display = 'none';
  document.getElementById('hud').style.display = 'block';

  if (name === '1-cover') {
    // Cover: Carmen on foot beside her red car in the foreground, Garage
    // del Sol and the Ferris wheel behind, First Fare banner up.
    game.missions.start(0, game);
    p.mode = 'foot';
    p.x = 17;
    p.z = 125;
    p.yaw = Math.PI * 0.85;
    car.x = 14;
    car.z = 122;
    car.yaw = 0;
    car.speed = 0;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.yaw;
    game.renderer.setCameraMode('cover');
    game.renderer.coverPos.set(38, 12, 142);
    game.renderer.coverTarget.set(-55, 5, 72);
  } else if (name === '2-drive') {
    // Drive: the car at speed down road x=0, front camera looking back so
    // the street and the city fill the frame.
    game.missions.start(0, game);
    p.mode = 'car';
    car.x = 0;
    car.z = 60;
    car.yaw = 0;
    car.speed = 18;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.yaw;
    p.x = car.x;
    p.z = car.z;
    p.yaw = 0;
    game.shotThrottle = true;
    game.renderer.setCameraMode('front');
  } else if (name === '3-mission') {
    // Mission: The Getaway in progress, two cruisers on the tail, three
    // wanted stars, golden hour so the scene stays readable.
    game.missions.start(3, game);
    game.missions.stage = 1;
    game.missions.timer = 30;
    game.missions.placeMarker();
    game.police.wanted = 3;
    game.police.spawnTimer = 0;
    p.mode = 'car';
    car.x = 0;
    car.z = 40;
    car.yaw = 0;
    car.speed = 20;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.yaw;
    p.x = car.x;
    p.z = car.z;
    p.yaw = 0;
    game.shotThrottle = true;
    game.renderer.setCameraMode('front');
    const c1 = game.police.spawnCar({ x: car.x, z: car.z });
    c1.x = 6;
    c1.z = 32;
    c1.yaw = 0;
    const c2 = game.police.spawnCar({ x: car.x, z: car.z });
    c2.x = -6;
    c2.z = 30;
    c2.yaw = 0;
  } else if (name === '4-city') {
    // City: aerial view of the grid, lagoon and lighthouse, First Fare up
    // so the banner and objective show.
    game.missions.start(0, game);
    p.mode = 'foot';
    p.x = 10;
    p.z = 90;
    p.yaw = Math.PI * 0.85;
    car.x = 0;
    car.z = 100;
    car.yaw = 0;
    car.speed = 0;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.yaw;
    game.renderer.setCameraMode('aerial');
    game.renderer.aerialPos.set(60, 190, 190);
    game.renderer.aerialTarget.set(-20, 0, 0);
  }
  game.syncPlayerMesh();
  game.hud.update(game);
}
