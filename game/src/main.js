// Laguna Verde: Carmen's Debt — entry point and game loop. One job: wire
// the modules together, run the frame loop, handle the keys and menus, and
// expose the game to the test driver (window.__game) and the shot stager.

import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, CAR } from './config.js';
import { Renderer } from './render.js';
import { buildWorld } from './world.js';
import { createCar } from './cars.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { saveGame, loadGame } from './save.js';
import { applyShot } from './shots.js';

window.__errors = [];
window.__gameReady = false;
window.__shotReady = false;
window.__shotName = '';
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));

function makeCarmenMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.05, 10), new THREE.MeshLambertMaterial({ color: 0xd94040 }));
  body.position.y = 1.1;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshLambertMaterial({ color: 0xd9a986 }));
  head.position.y = 1.92;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshLambertMaterial({ color: 0x2a1a12 }));
  hair.position.y = 1.98;
  g.add(hair);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a3a5a }));
  legs.position.y = 0.33;
  g.add(legs);
  return g;
}

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const world = buildWorld(renderer.scene);
const input = new Input();
const hud = new HUD();
const audio = new AudioSys();
const traffic = new Traffic(renderer.scene);
const pedestrians = new Pedestrians(renderer.scene);
const police = new Police(renderer.scene);
const combat = new Combat(renderer.scene);
const missions = new Missions(world.marker, world.markerGem);

const playerCar = createCar(CONFIG.carStart.x, CONFIG.carStart.z, CONFIG.carStart.yaw, CONFIG.colors.playerCar);
renderer.scene.add(playerCar.group);

const player = {
  x: CONFIG.playerStart.x,
  z: CONFIG.playerStart.z,
  yaw: CONFIG.playerStart.yaw,
  mode: 'foot',
  car: playerCar,
  money: CONFIG.startMoney,
  debtPaid: 0,
  health: CONFIG.startHealth,
  upgrades: { engine: 0, handling: 0, armor: 0 },
  mesh: makeCarmenMesh(),
};
renderer.scene.add(player.mesh);

const game = {
  state: 'menu',
  timeOfDay: 'golden',
  shotMode: false,
  shotThrottle: false,
  player,
  missions,
  police,
  combat,
  audio,
  traffic,
  pedestrians,
  world,
  renderer,
  hud,
  setTimeOfDay(name) {
    this.timeOfDay = name;
    renderer.setTimeOfDay(name);
  },
  saveGame() {
    saveGame(this);
  },
  syncPlayerMesh() {
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.yaw;
    player.mesh.visible = player.mode === 'foot';
    if (player.car) {
      playerCar.group.position.set(playerCar.x, 0, playerCar.z);
      playerCar.group.rotation.y = playerCar.yaw;
    }
  },
};
window.__game = game;

function topSpeed() {
  return CAR.topSpeed + player.upgrades.engine * 4;
}

function steerMult() {
  return 1 + player.upgrades.handling * 0.15;
}

function nearGarage() {
  const dp = Math.hypot(player.x - CONFIG.garagePos.x, player.z - CONFIG.garagePos.z);
  if (dp < CONFIG.garageRadius) return true;
  if (player.car) {
    const dc = Math.hypot(player.car.x - CONFIG.garagePos.x, player.car.z - CONFIG.garagePos.z);
    if (dc < CONFIG.garageRadius) return true;
  }
  return false;
}

function openGarage() {
  game.state = 'garage';
  refreshGarageRows();
  document.getElementById('garage-menu').style.display = 'block';
}

function closeGarage() {
  document.getElementById('garage-menu').style.display = 'none';
  if (game.state === 'garage') game.state = 'playing';
}

function refreshGarageRows() {
  const list = document.getElementById('garage-list');
  list.innerHTML = '';
  for (const key of CONFIG.upgradeNames) {
    const lvl = player.upgrades[key];
    const maxed = lvl >= 3;
    const price = maxed ? null : CONFIG.upgradePrices[key][lvl];
    const row = document.createElement('div');
    row.className = 'garage-row';
    row.innerHTML = `<span>${CONFIG.upgradeLabels[key]} — Lv ${lvl}</span><span>${maxed ? 'MAX' : '$' + price}</span>`;
    const btn = document.createElement('button');
    btn.textContent = maxed ? 'Maxed' : 'Buy';
    btn.disabled = maxed || player.money < price;
    btn.addEventListener('click', () => {
      if (player.upgrades[key] >= 3) return;
      const cost = CONFIG.upgradePrices[key][player.upgrades[key]];
      if (player.money < cost) return;
      player.money -= cost;
      player.upgrades[key] += 1;
      audio.chime();
      refreshGarageRows();
      saveGame(game);
    });
    row.appendChild(btn);
    list.appendChild(row);
  }
}

function enterCar(car) {
  player.mode = 'car';
  player.car = car;
  player.mesh.visible = false;
  player.x = car.x;
  player.z = car.z;
  player.yaw = car.yaw;
}

function exitCar() {
  const car = player.car;
  player.mode = 'foot';
  player.mesh.visible = true;
  player.x = car.x + 3;
  player.z = car.z + 1;
  player.yaw = car.yaw;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.yaw;
}

function tryEnterOrSteal() {
  if (player.mode === 'car') {
    exitCar();
    return;
  }
  const owned = player.car;
  const dOwned = owned ? Math.hypot(player.x - owned.x, player.z - owned.z) : Infinity;
  if (dOwned < 6) {
    enterCar(owned);
    return;
  }
  let best = null;
  let bestD = 5;
  for (const c of traffic.cars) {
    const d = Math.hypot(player.x - c.x, player.z - c.z);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  if (best) {
    traffic.cars.splice(traffic.cars.indexOf(best), 1);
    const nearPolice = police.cars.some((pc) => Math.hypot(player.x - pc.x, player.z - pc.z) < 80);
    if (nearPolice) police.addWanted(1);
    enterCar(best);
    hud.flashObjective('Car taken. Drive it like you own it.');
  }
}

function clampToLand(x, z) {
  if (x < -118 && Math.abs(z) > 8) x = -115;
  return { x: Math.max(-245, Math.min(245, x)), z: Math.max(-245, Math.min(245, z)) };
}

function updatePlaying(dt) {
  // Keys.
  if (input.wasPressed('KeyE')) tryEnterOrSteal();
  if (input.wasPressed('KeyG') && nearGarage()) openGarage();
  if (input.wasPressed('KeyT')) {
    const i = CONFIG.timeOfDayCycle.indexOf(game.timeOfDay);
    game.setTimeOfDay(CONFIG.timeOfDayCycle[(i + 1) % CONFIG.timeOfDayCycle.length]);
  }
  if (input.wasPressed('KeyR')) audio.next();
  if (input.wasPressed('KeyM')) audio.setMuted(!audio.muted);
  if (input.wasPressed('KeyN')) missions.start(missions.index, game);
  if (input.wasPressed('KeyF') && player.mode === 'foot') {
    const res = combat.shoot(player);
    audio.shot();
    if (res && res.killed) missions.kills += 1;
  }

  if (player.mode === 'car' && player.car) {
    const car = player.car;
    let throttle = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) throttle = 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) throttle = -1;
    if (game.shotThrottle) throttle = 1;
    const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
    const brake = input.isDown('Space');
    car.update(dt, throttle, steer, brake, topSpeed(), steerMult());
    const cl = clampToLand(car.x, car.z);
    if (cl.x !== car.x || cl.z !== car.z) {
      car.x = cl.x;
      car.z = cl.z;
      car.speed *= 0.5;
      car.group.position.set(car.x, 0, car.z);
    }
    player.x = car.x;
    player.z = car.z;
    player.yaw = car.yaw;
    audio.setEngine(car.speed, true);
  } else {
    const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = CAR.onFootSpeed * (run ? 1.5 : 1);
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) player.yaw += 2.6 * dt;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) player.yaw -= 2.6 * dt;
    let mx = 0;
    let mz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) { mx += Math.sin(player.yaw); mz += Math.cos(player.yaw); }
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) { mx -= Math.sin(player.yaw); mz -= Math.cos(player.yaw); }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      player.x += (mx / len) * speed * dt;
      player.z += (mz / len) * speed * dt;
    }
    const cl = clampToLand(player.x, player.z);
    player.x = cl.x;
    player.z = cl.z;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.yaw;
    player.mesh.position.y = len > 0 ? Math.abs(Math.sin(performance.now() / 150)) * 0.08 : 0;
    audio.setEngine(0, false);
  }

  const focus = player.mode === 'car' && player.car ? player.car : player;
  const speed = player.mode === 'car' && player.car ? player.car.speed : 0;
  traffic.update(dt, { x: player.x, z: player.z });
  pedestrians.update(dt);
  police.update(dt, { x: player.x, z: player.z }, player.mode === 'car' ? player.car : null);
  missions.update(dt, game);
  combat.update(dt, player);
  world.ferrisWheel.rotation.z += dt * 0.15;
  renderer.updateCamera(dt, focus, speed);
  hud.update(game);

  if (player.health <= 0 && game.state === 'playing') {
    game.state = 'dead';
    missions.fail(game, 'Carmen is down. The Sharks will not wait forever.');
    document.getElementById('end-restart').style.display = 'inline-block';
  }
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // Pause toggles in both directions, even while paused: updatePlaying does
  // not run in the paused state, so this cannot live there.
  if (input.wasPressed('KeyP')) {
    if (game.state === 'playing') {
      game.state = 'paused';
      document.getElementById('pause-menu').style.display = 'block';
    } else if (game.state === 'paused') {
      game.state = 'playing';
      document.getElementById('pause-menu').style.display = 'none';
    }
  }
  if (game.state === 'playing') {
    updatePlaying(dt);
  } else if (game.state === 'menu') {
    const t = now / 1000;
    renderer.setCameraMode('cover');
    renderer.coverPos.set(Math.sin(t * 0.04) * 130, 34, Math.cos(t * 0.04) * 130);
    renderer.coverTarget.set(-20, 4, 20);
    renderer.updateCamera(dt, { x: 0, z: 0, yaw: 0 }, 0);
    world.ferrisWheel.rotation.z += dt * 0.15;
    traffic.update(dt, null);
    pedestrians.update(dt);
  } else {
    renderer.render();
  }
  if (game.state === 'playing' || game.state === 'menu') renderer.render();
  input.endFrame();
}

// Menus.
document.getElementById('start-btn').addEventListener('click', () => {
  audio.init();
  document.getElementById('start-menu').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  game.state = 'playing';
  missions.start(0, game);
});
const save = loadGame();
if (save) {
  const cont = document.getElementById('continue-btn');
  cont.style.display = 'inline-block';
  cont.addEventListener('click', () => {
    audio.init();
    player.money = save.money;
    player.debtPaid = save.debtPaid;
    missions.completed = save.completed;
    missions.index = save.index;
    player.upgrades = { ...player.upgrades, ...save.upgrades };
    player.health = save.health || 100;
    player.x = save.x;
    player.z = save.z;
    player.yaw = save.yaw;
    if (save.carX !== null && save.carX !== undefined) {
      playerCar.x = save.carX;
      playerCar.z = save.carZ;
      playerCar.yaw = save.carYaw;
      playerCar.group.position.set(playerCar.x, 0, playerCar.z);
      playerCar.group.rotation.y = playerCar.yaw;
    }
    game.setTimeOfDay(save.timeOfDay || 'golden');
    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    game.state = 'playing';
    missions.start(Math.min(save.index, missions.list.length - 1), game);
  });
}
document.getElementById('resume-btn').addEventListener('click', () => {
  document.getElementById('pause-menu').style.display = 'none';
  game.state = 'playing';
});
document.getElementById('garage-close').addEventListener('click', closeGarage);
document.getElementById('end-restart').addEventListener('click', () => {
  document.getElementById('mission-end').style.display = 'none';
  document.getElementById('end-restart').style.display = 'none';
  if (game.state === 'dead') {
    player.health = CONFIG.startHealth;
    police.wanted = 0;
    combat.clearEnemies();
    player.x = CONFIG.playerStart.x;
    player.z = CONFIG.playerStart.z;
    player.yaw = CONFIG.playerStart.yaw;
    player.mode = 'foot';
    player.mesh.visible = true;
    game.state = 'playing';
  }
});

// Shot mode: stage the scene from the URL and tell the driver when ready.
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
if (shotName) {
  window.__shotName = shotName;
  audio.init();
  applyShot(game, shotName);
  setTimeout(() => {
    window.__shotReady = true;
  }, 2000);
}

game.syncPlayerMesh();
requestAnimationFrame(loop);
renderer.render();
window.__gameReady = true;
