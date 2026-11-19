// Laguna Verde: Carmen's Debt — entry point and game loop.
// Wires every system together: world, driving, traffic, police, missions,
// combat, HUD, audio, saves, and the screenshot staging.

import * as THREE from 'three';
import { CONFIG, MISSIONS } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { buildWorld, collideCircle, insideWorld } from './world.js';
import {
  createRenderer, createScene, createLights, setTimeOfDay,
  updateChaseCamera, updateWalkCamera,
} from './render.js';
import { makeCar, driveCar, randomBodyColor } from './cars.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPedestrians, updatePedestrians } from './pedestrians.js';
import { createPolice, addWanted, setWanted, updatePolice } from './police.js';
import {
  createMissions, currentMission, missionObjectiveText, startMission,
  updateMissions, failMission,
} from './missions.js';
import { createCombat, shoot, updateCombat, spawnDefenders } from './combat.js';
import { createHud, updateHud } from './hud.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame } from './save.js';
import { applyShot, shotTick } from './shots.js';

window.__errors = [];
window.addEventListener('error', (e) => {
  window.__errors.push(String(e.message || e.error));
});

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1);
const shotName = params.get('shot');
const rng = makeRng(seed);

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const scene = createScene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(20, 10, 80);
const lights = createLights(scene);

const world = buildWorld(scene, rng);
const input = createInput();
const audio = createAudio();
const traffic = createTraffic(world, scene, rng);
const pedestrians = createPedestrians(world, scene, rng);
const police = createPolice(scene);
const missions = createMissions(scene);
const combat = createCombat(scene);

// The player's car: Carmen's red coupe, parked by the garage.
const playerCar = makeCar(world, scene, world.spawn.x, world.spawn.z, world.spawn.angle, 0xd94f3d, { player: true });
playerCar.isPlayer = true;

const ctx = {
  scene,
  camera,
  renderer,
  world,
  input,
  audio,
  traffic,
  police,
  missions,
  combat,
  rng,
  time: 0,
  timeOfDay: 'golden',
  state: 'menu',
  shot: null,
  shotCam: null,
  saveTimer: 0,
  player: {
    mode: 'foot',
    x: world.spawn.x,
    z: world.spawn.z + 4,
    angle: Math.PI,
    yaw: Math.PI,
    pitch: 0.12,
    health: CONFIG.player.health,
    money: CONFIG.player.startMoney,
    debtPaid: 0,
    car: null,
    upgrades: { engine: 0, armor: 0, handling: 0 },
    mesh: null,
  },
};
ctx.player.car = null;

// On-foot mesh: Carmen, dark jacket, red bandana.
{
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.1, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2e4a3a }),
  );
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.85;
  g.add(head);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.14, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xd94f3d }),
  );
  band.position.y = 2.02;
  g.add(band);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.8, 0.26),
    new THREE.MeshLambertMaterial({ color: 0x2f3338 }),
  );
  legL.position.set(-0.16, 0.4, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  g.add(legR);
  g.position.set(ctx.player.x, 0, ctx.player.z);
  scene.add(g);
  ctx.player.mesh = g;
}

const hud = createHud(ctx);
ctx.hud = hud;
ctx.playerCar = playerCar;
ctx.missionsObjective = () => missionObjectiveText(missions);
ctx.setTimeOfDay = (mode) => {
  ctx.timeOfDay = mode;
  setTimeOfDay(lights, scene, mode);
  updateHeadlight();
};
ctx.saveGame = () => saveGame(ctx);
ctx.startGame = (useSave) => startGame(useSave);
ctx.togglePause = () => togglePause();
ctx.restartMission = () => restartMission();
ctx.onPlayerDown = () => onPlayerDown();

// Headlight: one spotlight that follows the player's car at dusk and night.
const headlight = new THREE.SpotLight(0xfff2b0, 0, 55, 0.5, 0.5, 1.2);
scene.add(headlight);
scene.add(headlight.target);
function updateHeadlight() {
  const on = ctx.timeOfDay === 'dusk' || ctx.timeOfDay === 'night';
  headlight.intensity = on ? 60 : 0;
}

function applySaveData(data) {
  const p = ctx.player;
  p.money = data.money;
  p.debtPaid = data.debtPaid;
  p.health = data.health || 100;
  p.upgrades = data.upgrades || { engine: 0, armor: 0, handling: 0 };
  missions.completed = data.missionsCompleted || [];
  missions.index = data.missionIndex || 0;
  if (data.timeOfDay) ctx.setTimeOfDay(data.timeOfDay);
  if (typeof data.station === 'number') audio.station = data.station;
  playerCar.upgrades = { ...p.upgrades };
  playerCar.x = data.x ?? world.spawn.x;
  playerCar.z = data.z ?? world.spawn.z;
  playerCar.group.position.set(playerCar.x, 0, playerCar.z);
}

function startGame(useSave) {
  const saved = useSave ? loadGame() : null;
  if (saved) applySaveData(saved);
  hud.showMenu(false);
  hud.showPause(false);
  ctx.state = 'playing';
  audio.unlock();
  if (!missions.completed.length && missions.index === 0 && !missions.active) {
    startMission(missions, ctx);
  } else if (!missions.active) {
    hud.showToast('Press N to start the next job');
  }
}

function togglePause() {
  if (ctx.state === 'playing') {
    ctx.state = 'paused';
    hud.showPause(true);
    saveGame(ctx);
  } else if (ctx.state === 'paused') {
    ctx.state = 'playing';
    hud.showPause(false);
  }
}

function restartMission() {
  const cur = currentMission(missions);
  if (!cur) return;
  missions.active = false;
  missions.stage = 0;
  missions.kills = 0;
  missions.beacon.visible = false;
  ctx.player.health = 100;
  ctx.player.x = world.spawn.x;
  ctx.player.z = world.spawn.z + 4;
  ctx.player.mode = 'foot';
  ctx.player.car = null;
  playerCar.x = world.spawn.x;
  playerCar.z = world.spawn.z;
  playerCar.health = CONFIG.car.health;
  playerCar.wrecked = false;
  playerCar.group.position.set(playerCar.x, 0, playerCar.z);
  setWanted(police, 0);
  ctx.state = 'playing';
  hud.showPause(false);
  startMission(missions, ctx);
}

function onPlayerDown() {
  const cur = currentMission(missions);
  if (missions.active && cur) {
    failMission(missions, ctx, 'Carmen went down. The job is blown.');
  }
  ctx.player.health = 100;
  ctx.player.money = Math.max(0, ctx.player.money - 100);
  ctx.player.x = world.spawn.x;
  ctx.player.z = world.spawn.z + 4;
  ctx.player.mode = 'foot';
  ctx.player.car = null;
  ctx.player.mesh.position.set(ctx.player.x, 0, ctx.player.z);
  hud.showToast('You wake up by the garage. $100 hospital bill.');
}

function nearestStealableCar() {
  const p = ctx.player;
  let best = null;
  let bestD = 4.5;
  const all = [...traffic.cars, ...traffic.parked, playerCar];
  for (const c of all) {
    if (c.wrecked) continue;
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function enterCar(car) {
  const p = ctx.player;
  car.isPlayer = true;
  car.parked = false;
  car.upgrades = { ...p.upgrades };
  // Stealing a car the player does not own, in sight of the law, is a crime.
  if (car !== playerCar) {
    traffic.cars = traffic.cars.filter((c) => c !== car);
    const ti = traffic.parked.indexOf(car);
    if (ti >= 0) traffic.parked.splice(ti, 1);
    let seen = false;
    for (const pc of police.cars) {
      if (Math.hypot(pc.x - car.x, pc.z - car.z) < 55) seen = true;
    }
    if (seen) {
      addWanted(police, 1, 'car theft');
      hud.showToast('The cops saw that. Move!');
    } else {
      hud.showToast('Borrowed. They will not miss it for a while.');
    }
    // The old coupe stays where it was left.
    if (p.car && p.car !== car) {
      p.car.isPlayer = false;
    }
  }
  p.car = car;
  p.mode = 'car';
  p.mesh.visible = false;
  audio.setEngine(0);
}

function exitCar() {
  const p = ctx.player;
  if (!p.car) return;
  const car = p.car;
  p.x = car.x - Math.sin(car.angle + Math.PI / 2) * 3;
  p.z = car.z - Math.cos(car.angle + Math.PI / 2) * 3;
  p.angle = car.angle;
  p.yaw = car.angle;
  p.mode = 'foot';
  p.car = null;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
}

function updatePlayerFoot(dt) {
  const p = ctx.player;
  const mouse = input.takeMouse();
  p.yaw -= mouse.dx * 0.0032;
  p.pitch = Math.max(-0.5, Math.min(0.6, p.pitch + mouse.dy * 0.0022));

  let fx = 0;
  let fz = 0;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) fz += 1;
  if (input.isDown('KeyS') || input.isDown('ArrowDown')) fz -= 1;
  if (input.isDown('KeyA') || input.isDown('ArrowLeft')) fx -= 1;
  if (input.isDown('KeyD') || input.isDown('ArrowRight')) fx += 1;
  const len = Math.hypot(fx, fz);
  if (len > 0) {
    fx /= len;
    fz /= len;
    const speed = (input.isDown('ShiftLeft') || input.isDown('ShiftRight'))
      ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
    const sin = Math.sin(p.yaw);
    const cos = Math.cos(p.yaw);
    const mx = (sin * fz + cos * fx) * speed * dt;
    const mz = (cos * fz - sin * fx) * speed * dt;
    const nx = p.x + mx;
    const nz = p.z + mz;
    if (insideWorld(nx, nz)) {
      const hit = collideCircle(world, nx, nz, 0.7);
      p.x = hit.x;
      p.z = hit.z;
    }
    p.angle = Math.atan2(mx, mz);
  }
  p.mesh.position.set(p.x, Math.abs(Math.sin(ctx.time * 9)) * (len > 0 ? 0.05 : 0), p.z);
  p.mesh.rotation.y = p.yaw;
  updateWalkCamera(camera, p, dt, p.yaw, p.pitch);
}

function updatePlayerCar(dt) {
  const p = ctx.player;
  const car = p.car;
  if (!car) return;
  let throttle = 0;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) throttle += 1;
  if (input.isDown('KeyS') || input.isDown('ArrowDown')) throttle -= 1;
  let steer = 0;
  if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer -= 1;
  if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer += 1;
  const handbrake = input.isDown('Space');
  if (ctx.shot && ctx.shot.autoDrive) {
    throttle = 1;
    steer = 0;
  }
  driveCar(car, world, dt, throttle, steer, handbrake);
  updateChaseCamera(camera, { x: car.x, z: car.z, angle: car.angle, speed: car.speed }, dt, 9.5, 4.2);
  audio.setEngine(Math.abs(car.speed) / 40);
  // Headlight follows the car.
  headlight.position.set(
    car.x + Math.sin(car.angle) * 2,
    1.2,
    car.z + Math.cos(car.angle) * 2,
  );
  headlight.target.position.set(
    car.x + Math.sin(car.angle) * 30,
    0,
    car.z + Math.cos(car.angle) * 30,
  );
  if (car.wrecked) {
    audio.crash();
    hud.showToast('The car is wrecked. Get out and find another.');
    exitCar();
    if (missions.active) failMission(missions, ctx, 'The car is wrecked.');
  }
}

function handleKeys() {
  if (input.consume('KeyP')) togglePause();
  if (ctx.state !== 'playing') return;
  if (input.consume('KeyM')) {
    audio.setMuted(!audio.muted);
    hud.showToast(audio.muted ? 'Muted' : `Sound on — ${audio.stationName()}`);
  }
  if (input.consume('KeyR')) {
    const name = audio.nextStation();
    hud.showToast(`Radio: ${name}`);
  }
  if (input.consume('KeyT')) {
    const order = ['golden', 'dusk', 'night', 'day'];
    const next = order[(order.indexOf(ctx.timeOfDay) + 1) % order.length];
    ctx.setTimeOfDay(next);
    hud.showToast(`Time of day: ${next}`);
  }
  if (input.consume('KeyN')) {
    if (!missions.active) startMission(missions, ctx);
  }
  if (input.consume('KeyG')) {
    const d = Math.hypot(ctx.player.x - 20, ctx.player.z - 120);
    const cd = ctx.player.car ? Math.hypot(ctx.player.car.x - 20, ctx.player.car.z - 120) : 999;
    if (Math.min(d, cd) < 25) hud.showGarage(true);
    else hud.showToast('Garage upgrades are at Garage del Sol.');
  }
  if (input.consume('KeyF') && ctx.player.mode === 'foot') {
    shoot(combat, ctx);
  }
  if (input.wasPressed('KeyE')) {
    // A mission pickup takes priority over entering/exiting a car: the
    // press stays queued for updateMissions to consume this same frame.
    const p = ctx.player;
    const cur = currentMission(missions);
    let missionPickup = false;
    if (missions.active && cur) {
      const stage = cur.stages[missions.stage];
      if (stage && stage.type === 'pickup') {
        const px = p.car ? p.car.x : p.x;
        const pz = p.car ? p.car.z : p.z;
        if (Math.hypot(stage.target[0] - px, stage.target[1] - pz) < 6) missionPickup = true;
      }
    }
    if (!missionPickup) {
      input.consume('KeyE');
      if (p.mode === 'car') {
        exitCar();
      } else {
        const car = nearestStealableCar();
        if (car) enterCar(car);
      }
    }
  }
}

function update(dt) {
  ctx.time += dt;
  // Ambient life: the wheel turns, the boats bob, the water breathes.
  world.wheel.rotation.z += dt * 0.12;
  world.water.material.opacity = 0.84 + Math.sin(ctx.time * 0.7) * 0.04;
  for (let i = 0; i < world.boats.length; i++) {
    world.boats[i].position.y = -0.1 + Math.sin(ctx.time * 0.9 + i * 1.3) * 0.18;
  }

  updateTraffic(traffic, world, dt, ctx.player.car, rng);
  updatePedestrians(pedestrians, world, dt, ctx.player.car, ctx.player, () => {
    addWanted(police, 1, 'hit a pedestrian');
    hud.showToast('You hit a pedestrian. The law is coming.');
  });
  updatePolice(police, world, scene, dt, ctx.player.car || ctx.player, rng);
  updateCombat(combat, ctx, dt);
  updateMissions(missions, ctx, dt);

  // Mission 6 defense: attackers arrive once the stage starts.
  const cur = currentMission(missions);
  if (missions.active && cur && cur.id === 6 && combat.enemies.length === 0 && missions.kills < (cur.attackers || 5)) {
    spawnDefenders(combat, ctx, cur.attackers || 5);
  }

  if (ctx.player.mode === 'car') updatePlayerCar(dt);
  else updatePlayerFoot(dt);

  audio.setSiren(police.wanted > 0);
  updateHud(hud, ctx, dt);

  ctx.saveTimer += dt;
  if (ctx.saveTimer > 30) {
    ctx.saveTimer = 0;
    saveGame(ctx);
  }
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1);
  handleKeys();
  if (ctx.state === 'playing') update(dt);
  else if (ctx.state === 'menu') {
    // Menu backdrop: slow orbit over the causeway so the title sits on the city.
    const t = ctx.time + dt;
    ctx.time = t;
    camera.position.set(Math.sin(t * 0.05) * 60, 26, -140 + Math.cos(t * 0.05) * 40);
    camera.lookAt(0, 2, -40);
    world.wheel.rotation.z += dt * 0.12;
  }
  // Fixed shot camera overrides the chase camera.
  if (ctx.shotCam && ctx.state === 'playing') {
    camera.position.set(ctx.shotCam.pos[0], ctx.shotCam.pos[1], ctx.shotCam.pos[2]);
    camera.lookAt(ctx.shotCam.look[0], ctx.shotCam.look[1], ctx.shotCam.look[2]);
  }
  renderer.render(scene, camera);
  if (ctx.shot) shotTick(ctx);
  input.endFrame();
}

// Show the continue button only when a save exists.
if (loadGame()) {
  document.getElementById('continue-btn').style.display = 'inline-block';
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Shot mode: skip the menu, stage the shot, run until the frame settles.
if (shotName) {
  hud.showMenu(false);
  applyShot(ctx, shotName);
} else {
  ctx.state = 'menu';
}

window.__game = ctx;
window.__gameReady = true;
loop();
