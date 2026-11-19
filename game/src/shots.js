// Screenshot staging: each named shot puts the city, the player, the
// police and the mission into a fixed, readable frame, then lets the game
// run a few frames so the render settles. The driver waits for
// window.__shotReady before capturing.

import { startMission } from './missions.js';
import { setWanted } from './police.js';

// Fixed camera for a shot: { pos: [x, y, z], look: [x, y, z] }.
const FRAMES = {
  cover: { pos: [45, 26, -190], look: [0, 0, -80] },
  mission: { pos: [-100, 12, 104], look: [-100, 1, 140] },
  city: { pos: [0, 120, 90], look: [0, 0, -130] },
};

export function applyShot(ctx, name) {
  const p = ctx.player;
  // The player starts on foot; shots need the coupe. Put Carmen in her car.
  const car = ctx.playerCar;
  p.car = car;
  p.mesh.visible = false;
  ctx.shot = { name, frames: 0, startTime: performance.now(), autoDrive: false };
  ctx.setTimeOfDay('golden');
  ctx.hud.showMenu(false);

  if (name === 'cover') {
    // Red coupe on the causeway, lagoon both sides, downtown ahead.
    car.x = 0;
    car.z = -150;
    car.angle = 0;
    car.speed = 0;
    car.group.position.set(0, 0, -150);
    car.group.rotation.y = 0;
    p.mode = 'car';
    startMission(ctx.missions, ctx);
    ctx.shotCam = FRAMES.cover;
  } else if (name === 'drive') {
    // Mid-chase on the causeway: player ahead, patrol car behind, heli above.
    car.x = 0;
    car.z = -200;
    car.angle = 0;
    car.speed = 26;
    car.group.position.set(0, 0, -200);
    car.group.rotation.y = 0;
    p.mode = 'car';
    setWanted(ctx.police, 3);
    ctx.shot.autoDrive = true;
    ctx.shotCam = null; // chase camera follows the car
  } else if (name === 'mission') {
    // Mission 1 live: the coupe on the road by Mrs. Alvarez's house, beacon
    // on the marker, dialogue on screen. Camera looks down the clear street
    // at the car and the house, so no building hides either of them.
    car.x = -100;
    car.z = 128;
    car.angle = 0;
    car.speed = 0;
    car.group.position.set(-100, 0, 128);
    car.group.rotation.y = 0;
    p.mode = 'car';
    startMission(ctx.missions, ctx);
    ctx.shotCam = FRAMES.mission;
  } else if (name === 'city') {
    // Aerial over downtown: the grid, the lagoon, the causeway, the boardwalk.
    car.x = 20;
    car.z = 96;
    car.angle = Math.PI;
    car.speed = 0;
    car.group.position.set(20, 0, 96);
    car.group.rotation.y = Math.PI;
    p.mode = 'car';
    ctx.shotCam = FRAMES.city;
  } else {
    ctx.shotCam = null;
  }
  ctx.state = 'playing';
  window.__shotName = name;
}

// Called every frame while a shot is staged. Returns true once the frame
// has settled enough to capture: at least 10 frames rendered and at least
// 5 seconds of wall time, so SwiftShader has actually drawn the scene.
export function shotTick(ctx) {
  if (!ctx.shot) return false;
  ctx.shot.frames += 1;
  const elapsed = performance.now() - ctx.shot.startTime;
  if (ctx.shot.frames >= 10 && elapsed > 5000) {
    window.__shotReady = true;
    return true;
  }
  return false;
}
