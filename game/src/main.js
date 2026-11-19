// Laguna Verde: Carmen's Debt — entry point and game loop.
// One job: own the game state and wire every system together — the
// player on foot and in the car, missions, wanted, combat, garage,
// save, menus, and the screenshot staging.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { buildWorldLayout } from './world.js';
import { buildCity } from './city.js';
import { Car, carColorAt, carNameAt, resolveCircleCollision } from './cars.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { AudioSys } from './audio.js';
import { Hud } from './hud.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { Input } from './input.js';
import { Render } from './render.js';
import { getShotParams, isShotMode, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const render = new Render(canvas);
const layout = buildWorldLayout();
const rng = makeRng(20261119);
const city = buildCity(render.scene, layout, rng);
const input = new Input();
const audio = new AudioSys();
const traffic = new Traffic(render.scene, layout, city.colliders, rng);
const pedestrians = new Pedestrians(render.scene, layout, rng);
const police = new Police(render.scene, layout, rng);
const combat = new Combat(render.scene, rng);

window.__errors = [];
window.addEventListener('error', (e) => {
  window.__errors.push(String(e.message || e.error));
});

// Player state: everything that saves.
const player = {
  x: layout.playerStart.x,
  z: layout.playerStart.z,
  heading: layout.playerStart.heading,
  health: CONFIG.startHealth,
  money: CONFIG.startMoney,
  debtPaid: 0,
  inCar: false,
  car: null,
  upgrades: {},
  lastDamageAt: -100,
  speed: 0,
};

// Carmen on foot: red jacket, dark jeans, her father's garage cap.
const playerMesh = new THREE.Group();
{
  const jacket = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc68e5e });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const torso = new THREE.Mesh(box, jacket);
  torso.scale.set(0.55, 0.65, 0.3);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(box, skin);
  head.scale.set(0.34, 0.34, 0.34);
  head.position.y = 1.68;
  const legL = new THREE.Mesh(box, jeans);
  legL.scale.set(0.2, 0.7, 0.22);
  legL.position.set(-0.14, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;
  playerMesh.add(torso, head, legL, legR);
  playerMesh.userData = { legL, legR };
}
render.scene.add(playerMesh);

// The player's own car, parked outside the garage.
player.car = new Car(
  render.scene,
  layout.carStart.x, layout.carStart.z, layout.carStart.heading,
  0xc0392b, { name: 'Carmen\'s Solano', upgrades: player.upgrades },
);
player.car.upgrades = player.upgrades;

const state = {
  mode: 'menu', // menu | playing | paused | over
  time: 0,
  timeOfDay: 0.72,
  frames: 0,
  shotMode: isShotMode(),
  shotName: getShotParams().name,
  shotCamera: 'chase',
  autosaveTimer: 0,
  missionToastShown: false,
};

const hud = new Hud(
  () => startGame(),
  (key) => buyUpgrade(key),
);

const missions = new Missions(layout, (type, data) => onMissionEvent(type, data));

function onMissionEvent(type, data) {
  if (type === 'start') {
    hud.setObjective(data.brief);
    hud.showMessage('Mission: ' + data.name + ' — ' + data.client);
    audio.blip(880);
    if (data.type === 'defend') {
      // The Sharks come to the garage: three of them, on foot.
      combat.spawnEnemies(layout.landmarks.garage, 3, () => missions.enemyDown());
      hud.showMessage('Three Sharks at the garage. Protect it, Carmen.');
    }
  } else if (type === 'dialogue') {
    hud.showDialogue(data.who, data.line);
  } else if (type === 'objective') {
    hud.setObjective(data.text);
    hud.showMessage(data.text);
  } else if (type === 'complete') {
    const payout = data.payout;
    player.money += payout;
    player.debtPaid = Math.min(CONFIG.debtTotal, player.debtPaid + payout);
    audio.blip(1320, 0.25);
    hud.showResult(
      'Mission complete: ' + data.name,
      'Paid $' + payout.toLocaleString('en-US') + '. Debt: $' +
        player.debtPaid.toLocaleString('en-US') + ' / $' + CONFIG.debtTotal.toLocaleString('en-US') + '.',
    );
    hud.setMoney(player.money);
    hud.setDebt(player.debtPaid);
    saveProgress();
    if (missions.done) {
      setTimeout(() => {
        hud.showResult(
          'Debt cleared',
          'Tomas is free. Los Tiburones got their $50,000 and Laguna Verde is yours again, Carmen.',
          'Keep driving',
        );
      }, 400);
    }
  } else if (type === 'failed') {
    hud.showResult('Mission failed', data.reason || 'Try again, Carmen.', 'Retry');
    hud.setObjective('');
  }
}

function buyUpgrade(key) {
  const up = CONFIG.upgrades[key];
  if (!up || player.upgrades[key] || player.money < up.cost) return;
  player.money -= up.cost;
  player.upgrades[key] = true;
  if (player.car) player.car.upgrades = player.upgrades;
  hud.setMoney(player.money);
  hud.showGarage(player.money, player.upgrades);
  hud.showMessage(up.name + ' installed at Garage del Sol.');
  audio.blip(1040, 0.2);
  saveProgress();
}

function saveProgress() {
  saveGame({
    money: player.money,
    debtPaid: player.debtPaid,
    missionsDone: missions.completedCount,
    upgrades: player.upgrades,
    player: { x: player.x, z: player.z, heading: player.heading },
    station: audio.station,
    muted: audio.muted,
  });
}

function loadProgress() {
  const data = loadGame();
  if (!data) return false;
  player.money = data.money;
  player.debtPaid = data.debtPaid;
  missions.index = data.missionsDone || 0;
  player.upgrades = data.upgrades || {};
  if (player.car) player.car.upgrades = player.upgrades;
  if (data.player) {
    player.x = data.player.x;
    player.z = data.player.z;
    player.heading = data.player.heading;
  }
  if (typeof data.station === 'number') audio.setStation(data.station);
  if (data.muted) audio.setMuted(true);
  return true;
}

function setPlayerCar(x, z, heading) {
  player.inCar = true;
  player.car.x = x;
  player.car.z = z;
  player.car.heading = heading;
  player.car.speed = 0;
  player.car.mesh.position.set(x, 0, z);
  player.x = x;
  player.z = z;
  player.heading = heading;
  playerMesh.visible = false;
}

function setPlayerOnFoot(x, z, heading) {
  player.inCar = false;
  player.x = x;
  player.z = z;
  player.heading = heading;
  playerMesh.visible = true;
  playerMesh.position.set(x, 0, z);
}

function startGame() {
  audio.start();
  hud.hideMenu();
  hud.hideResult();
  state.mode = 'playing';
  hud.setHealth(player.health);
  hud.setMoney(player.money);
  hud.setDebt(player.debtPaid);
  hud.setWanted(police.stars);
  hud.setStation(CONFIG.stations[audio.station].name);
  hud.setVehicle(player.inCar ? player.car.name : 'On foot');
  hud.showMessage('Laguna Verde. $50,000 to go. Press N for the next job.');
  hud.setObjective(missions.current ? 'Press N: ' + missions.current.name : 'Debt cleared. Free drive.');
  if (state.shotMode) {
    state.shotCamera = applyShot(game, state.shotName);
  }
}

function enterCar() {
  // Own car first, then the nearest traffic car.
  const ownD = Math.hypot(player.car.x - player.x, player.car.z - player.z);
  if (ownD < 6) {
    setPlayerCar(player.car.x, player.car.z, player.car.heading);
    hud.setVehicle(player.car.name);
    hud.showMessage('In the Solano. Drive, Carmen.');
    audio.blip(660);
    return;
  }
  const near = traffic.nearest(player.x, player.z, 6);
  if (near) {
    const stolen = traffic.remove(near);
    player.car = stolen;
    player.car.upgrades = player.upgrades;
    player.car.name = stolen.name;
    setPlayerCar(stolen.x, stolen.z, stolen.heading);
    hud.setVehicle(stolen.name + ' (borrowed)');
    hud.showMessage('Borrowed a ' + stolen.name + '. The owner will not be thrilled.');
    if (police.nearestDistance(player) < 60) {
      police.addHeat(40, 'car theft');
      hud.showMessage('The police saw that. Wanted level up.');
    }
    audio.blip(520);
  }
}

function exitCar() {
  const x = player.car.x - Math.sin(player.car.heading) * 3;
  const z = player.car.z - Math.cos(player.car.heading) * 3;
  setPlayerOnFoot(x, z, player.car.heading);
  hud.setVehicle('On foot');
}

function shoot() {
  if (player.inCar || state.mode !== 'playing') return;
  const dir = new THREE.Vector3(
    Math.sin(player.heading), -0.05, Math.cos(player.heading),
  ).normalize();
  const origin = new THREE.Vector3(player.x, 1.4, player.z);
  const hit = combat.shoot(origin, dir, player);
  audio.gunshot();
  render.addShake(0.25);
  pedestrians.scare(player.x, player.z, 30);
  if (hit) {
    hud.showMessage('Hit. One less Shark on the street.');
    police.addHeat(15, 'shooting');
  } else if (police.nearestDistance(player) < 80) {
    police.addHeat(10, 'gunfire heard');
  }
}

function updatePlayer(dt) {
  if (player.inCar) {
    player.car.update(dt, {
      forward: input.forward,
      back: input.back,
      left: input.left,
      right: input.right,
      brake: input.brake,
    }, city.colliders, layout.bounds);
    player.x = player.car.x;
    player.z = player.car.z;
    player.heading = player.car.heading;
    player.speed = player.car.speed;
    // Bumping a pedestrian at speed is a crime, and it feels awful.
    for (const p of pedestrians.people) {
      const d = Math.hypot(p.mesh.position.x - player.x, p.mesh.position.z - player.z);
      if (d < 2.2 && Math.abs(player.speed) > 6) {
        pedestrians.scare(player.x, player.z, 20);
        police.addHeat(20, 'hit and run');
        hud.showMessage('You hit someone. The city saw it.');
        player.speed *= 0.6;
      }
    }
    // Police cars ram the player.
    for (const pc of police.cars) {
      const d = Math.hypot(pc.x - player.x, pc.z - player.z);
      if (d < 3.2) {
        player.car.damage(6);
        render.addShake(0.5);
        if (player.car.dead) {
          hud.showMessage('The Solano gave up. Get out and find another car.');
          exitCar();
        }
      }
    }
  } else {
    const speed = input.forward || input.back || input.left || input.right
      ? CONFIG.walkSpeed : 0;
    let mx = 0;
    let mz = 0;
    if (input.forward) { mx += Math.sin(player.heading); mz += Math.cos(player.heading); }
    if (input.back) { mx -= Math.sin(player.heading); mz -= Math.cos(player.heading); }
    if (input.left) player.heading += 2.4 * dt;
    if (input.right) player.heading -= 2.4 * dt;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      player.x += (mx / len) * speed * dt;
      player.z += (mz / len) * speed * dt;
      player.speed = speed;
    } else {
      player.speed = 0;
    }
    player.x = Math.max(layout.bounds.minX + 4, Math.min(layout.bounds.maxX - 4, player.x));
    player.z = Math.max(layout.bounds.minZ + 4, Math.min(layout.bounds.maxZ - 4, player.z));
    resolveCircleCollision(player, CONFIG.playerRadius, city.colliders);
    playerMesh.position.set(player.x, 0, player.z);
    playerMesh.rotation.y = player.heading;
    const swing = Math.sin(state.time * 9) * (player.speed > 0 ? 0.5 : 0);
    playerMesh.userData.legL.rotation.x = swing;
    playerMesh.userData.legR.rotation.x = -swing;
  }
  // Slow health regen when out of trouble.
  if (state.time - player.lastDamageAt > 10 && player.health < CONFIG.startHealth) {
    player.health = Math.min(CONFIG.startHealth, player.health + 2 * dt);
  }
}

function gameOver() {
  state.mode = 'over';
  hud.showResult('Carmen is down', 'The Sharks win this round. The debt is still $50,000.', 'Try again');
  hud.onRestart = () => {
    player.health = CONFIG.startHealth;
    setPlayerOnFoot(layout.playerStart.x, layout.playerStart.z, 0);
    police.clear();
    combat.clearEnemies();
    hud.hideResult();
    state.mode = 'playing';
  };
}

// The game object the shots module and the test hooks use.
const game = {
  layout, player, car: player.car, police, missions, hud, render, state,
  setPlayerCar, setPlayerOnFoot, save: saveProgress,
};
window.__game = game;
window.__gameReady = false;
window.__shotReady = false;

// Boot: restore the save, show the menu, and start the loop.
loadProgress();
render.setTimeOfDay(state.timeOfDay);
hud.setHealth(player.health);
hud.setMoney(player.money);
hud.setDebt(player.debtPaid);
hud.setStation(CONFIG.stations[audio.station].name);
if (state.shotMode) {
  // No menu in shot mode: straight into the staged frame.
  hud.hideMenu();
  state.mode = 'playing';
  setPlayerCar(layout.carStart.x, layout.carStart.z, layout.carStart.heading);
  state.shotCamera = applyShot(game, state.shotName);
  hud.setHealth(player.health);
  hud.setMoney(player.money);
  hud.setDebt(player.debtPaid);
  hud.setVehicle(player.inCar ? player.car.name : 'On foot');
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time += dt;
  state.frames++;

  if (state.mode === 'playing') {
    // In the drive shot the car keeps rolling for the camera.
    if (state.shotMode && state.shotName === 'drive' && player.inCar) {
      input.simulate('KeyW', true);
    }
    // One-frame keys.
    if (input.enterCar) {
      if (player.inCar) exitCar();
      else enterCar();
    }
    if (input.shoot) shoot();
    if (input.garage) {
      const g = layout.landmarks.garage;
      const d = Math.hypot(player.x - g.x, player.z - g.z);
      if (d < 24) {
        if (hud.garageOpen) hud.hideGarage();
        else hud.showGarage(player.money, player.upgrades);
      } else {
        hud.showMessage('The garage is at Garage del Sol, by the lagoon.');
      }
    }
    if (input.radio) {
      const name = audio.nextStation();
      hud.setStation(name);
      hud.showToast('♪ ' + name);
    }
    if (input.mute) {
      audio.setMuted(!audio.muted);
      hud.showToast(audio.muted ? 'Sound off' : 'Sound on');
    }
    if (input.timeOfDay) {
      state.timeOfDay = state.timeOfDay > 0.9 ? 0.72 : state.timeOfDay + 0.13;
      render.setTimeOfDay(state.timeOfDay);
      hud.showToast(render.isDusk ? 'Dusk. Headlights on.' : 'Golden hour.');
    }
    if (input.pause) {
      state.mode = 'paused';
      hud.showPause();
      hud.onResume = () => { state.mode = 'playing'; };
    }
    if (input.mission && !missions.active && missions.current) {
      missions.start();
    }

    updatePlayer(dt);
    traffic.update(dt, player);
    pedestrians.update(dt, state.time, player);
    police.update(dt, state.time, player, player.speed);
    const result = missions.update(dt, player, player.inCar, police.stars);
    if (result === 'complete' && missions.active === null) {
      // handled by the mission event
    }
    combat.update(dt, player, (dmg) => {
      player.health -= dmg;
      player.lastDamageAt = state.time;
      hud.setHealth(player.health);
      render.addShake(0.4);
      if (player.health <= 0) gameOver();
    });
    city.update(dt, state.time);
    audio.setEngine(player.inCar ? player.car.speed : 0, CONFIG.carMaxSpeed);
    audio.setSiren(police.sirenOn);

    // HUD, every frame.
    hud.setHealth(player.health);
    hud.setWanted(police.stars);
    hud.setSpeed(player.inCar ? player.car.speed : 0, player.inCar);
    hud.drawMinimap(player, player.heading, player.inCar, missions.getMarker(), police.cars, layout.landmarks.garage);

    // Autosave every 30 seconds.
    state.autosaveTimer += dt;
    if (state.autosaveTimer > 30) {
      state.autosaveTimer = 0;
      saveProgress();
    }

    // Camera.
    if (state.shotMode && state.shotCamera === 'fixed') {
      // Staged camera stays put.
    } else if (state.shotMode && state.shotCamera === 'side-chase') {
      // Track the car from the side-rear: the car stays mid-frame and
      // the patrol cars chasing it stay in view behind it.
      const h = player.heading;
      const fx = Math.sin(h);
      const fz = Math.cos(h);
      const rx = Math.cos(h);
      const rz = -Math.sin(h);
      render.setCamera(
        { x: player.x + rx * 18 - fx * 26, y: 14, z: player.z + rz * 18 - fz * 26 },
        { x: player.x + fx * 14, y: 4, z: player.z + fz * 14 },
      );
    } else {
      render.follow(player, player.heading, dt, player.inCar);
    }
  } else if (state.mode === 'menu') {
    // Slow orbit over the city behind the menu.
    const a = state.time * 0.05;
    render.setCamera(
      { x: Math.cos(a) * 260, y: 120, z: Math.sin(a) * 260 },
      { x: 0, y: 0, z: 0 },
    );
    city.update(dt, state.time);
    traffic.update(dt, null);
    pedestrians.update(dt, state.time, null);
  } else if (state.mode === 'paused') {
    // Frozen frame behind the pause menu.
  }

  render.render();
  input.endFrame();

  if (!window.__gameReady) window.__gameReady = true;
  if (state.shotMode && state.frames > 40 && !window.__shotReady) {
    window.__shotReady = true;
  }
}
requestAnimationFrame(loop);
