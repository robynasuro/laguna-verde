// Laguna Verde: Carmen's Debt. Entry point and game loop.
// One job: own the game state and wire every system together.
import * as THREE from '../vendor/three.module.min.js';
import { buildCity, collide, clampToLand, deckHeight, mulberry32, WORLD } from './city.js';
import { createRender } from './render.js';
import { createInput, pressed } from './input.js';
import { makeCar, driveCar, CAR_DEFS } from './cars.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissionEngine, MISSIONS, DEBT_TOTAL } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const rng = mulberry32(20261119);
const R = createRender(canvas);
const scene = R.scene;
const city = buildCity(scene, rng);
const input = createInput(canvas);
const hud = createHud();
const audio = createAudio();
const traffic = createTraffic(scene, city.nodes, rng);
const peds = createPedestrians(scene, city.nodes, rng);
const police = createPolice(scene, rng);
const combat = createCombat(scene, rng);
const missions = createMissionEngine();

// ---- Carmen on foot: orange jacket, dark hair. ----
const playerMesh = new THREE.Group();
{
  const jacket = new THREE.MeshLambertMaterial({ color: 0xff9f2e });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.05, 8), jacket);
  body.position.y = 1.0;
  body.castShadow = true;
  playerMesh.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.8;
  playerMesh.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a1a12 }),
  );
  hair.position.y = 1.88;
  hair.scale.set(1, 0.8, 1);
  playerMesh.add(hair);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a3f5f });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.6, 0.17), legMat);
  legL.position.set(-0.15, 0.3, 0);
  playerMesh.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.15;
  playerMesh.add(legR);
  playerMesh.userData.legs = [legL, legR];
}
playerMesh.position.set(WORLD.garage.x + 4, 0, WORLD.garage.z + 12);
scene.add(playerMesh);

// ---- The game state, one object the whole loop reads. ----
const G = {
  state: 'menu', // menu | playing | paused | garage | over
  money: 400,
  debtPaid: 0,
  missionsDone: 0,
  health: 100,
  upgrades: { engine: 0, handling: 0, armor: 0 },
  wanted: 0,
  inCar: false,
  car: null,
  armed: true,
  timeOfDay: 1,
  marker: null,
  heading: 0.6,
  audio,
  police,
  traffic,
  peds,
  combat,
  playerPos: () => (G.inCar ? G.car.pos : playerMesh.position),
};
G.player = { pos: playerMesh.position };

// ---- Parked cars: the starter car outside the garage, plus a few around town. ----
const parked = [];
function parkCar(defIdx, x, z, heading) {
  const car = makeCar(scene, CAR_DEFS[defIdx], x, z, heading, false);
  car.parked = true;
  parked.push(car);
  return car;
}
G.starterCar = parkCar(0, WORLD.garage.x + 2, WORLD.garage.z + 18, 0);
parkCar(1, 62, -52, 0);
parkCar(2, -58, 122, Math.PI / 2);
parkCar(3, 118, 62, -Math.PI / 2);
parkCar(4, 2, -178, 0);
parkCar(1, 182, -58, Math.PI);
parkCar(2, -118, -118, Math.PI / 2);
G.parked = parked;

function nextMission() {
  return MISSIONS[G.missionsDone] || null;
}

function refreshMarker() {
  if (missions.M.active) return;
  const nm = nextMission();
  G.marker = nm ? { x: WORLD.garageFront.x, z: WORLD.garageFront.z, startMission: nm } : null;
  if (nm) {
    hud.setObjective('New job at Garage del Sol: "' + nm.name + '" (' + nm.client + '). Go to the garage marker.');
  } else {
    hud.setObjective('Debt cleared. Laguna Verde is yours. Drive, race, and enjoy the city.');
  }
}

// ---- The yellow beacon that marks where to go next. ----
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 1.6, 14, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
);
beacon.position.set(WORLD.garageFront.x, 7, WORLD.garageFront.z);
scene.add(beacon);
const beaconBase = new THREE.Mesh(
  new THREE.TorusGeometry(2.2, 0.3, 8, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd23e }),
);
beaconBase.rotation.x = Math.PI / 2;
beaconBase.position.set(WORLD.garageFront.x, 0.3, WORLD.garageFront.z);
scene.add(beaconBase);

// ---- Dust and impact particles: a small reusable pool. ----
const particles = [];
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xd8c9a0, transparent: true, opacity: 0 }),
  );
  scene.add(m);
  particles.push({ mesh: m, life: 0 });
}
function puff(x, z, color) {
  const p = particles.find((q) => q.life <= 0);
  if (!p) return;
  p.mesh.position.set(x, 0.8, z);
  p.mesh.material.color.setHex(color || 0xd8c9a0);
  p.mesh.material.opacity = 0.8;
  p.life = 0.6;
}

// ---- The context missions use to talk to the rest of the game. ----
const ctx = {
  playerPos: () => G.playerPos(),
  say: (who, text) => hud.say(who, text),
  setObjective: (t) => hud.setObjective(t),
  setMarker: (m) => {
    G.marker = m;
    if (m) {
      beacon.position.set(m.x, 7, m.z);
      beaconBase.position.set(m.x, 0.3, m.z);
    }
  },
  setWanted: (n) => {
    G.wanted = n;
    police.wanted = n;
  },
  wanted: () => police.wanted,
  debtPaid: 0,
  spawnRivals: (x, z, n) => combat.spawnRivals(x, z, n),
  rivalsLeft: () => combat.enemies.length,
  setTimeOfDay: (t) => {
    G.timeOfDay = t;
    R.setTimeOfDay(t);
  },
  pay: (amount, mission) => {
    G.money += amount;
    G.debtPaid = Math.min(DEBT_TOTAL, G.debtPaid + amount);
    ctx.debtPaid = G.debtPaid;
    G.missionsDone += 1;
    audio.cash();
    hud.flash('Job done: ' + mission.name + '  +$' + amount.toLocaleString());
    saveGame(G);
    showEnd(
      'Mission complete: ' + mission.name,
      mission.done + ' You earned $' + amount.toLocaleString() + '. Debt paid so far: $' + G.debtPaid.toLocaleString() + ' of $50,000.',
    );
    refreshMarker();
  },
  failMission: (reason) => missions.fail(ctx, reason),
  onFail: (mission, reason) => showEnd(
    'Job failed: ' + (mission ? mission.name : ''),
    reason + ' The job is still open at the garage. Go back and try again.',
  ),
};

// ---- Menus, garage, save, end screens ----
const $ = (id) => document.getElementById(id);
function showScreen(id) {
  for (const s of ['menu', 'pause', 'garage', 'endscreen']) {
    $(s).style.display = s === id ? 'flex' : 'none';
  }
  if (!id) {
    for (const s of ['menu', 'pause', 'garage', 'endscreen']) $(s).style.display = 'none';
  }
}

function startGame(fresh) {
  audio.ensure();
  if (fresh) {
    G.money = 400;
    G.debtPaid = 0;
    G.missionsDone = 0;
    G.health = 100;
    G.upgrades = { engine: 0, handling: 0, armor: 0 };
    playerMesh.position.set(WORLD.garage.x + 4, 0, WORLD.garage.z + 12);
    police.reset();
    combat.clearEnemies();
  }
  G.state = 'playing';
  showScreen(null);
  hud.show();
  R.setTimeOfDay(G.timeOfDay);
  hud.say('Carmen', 'Okay. One job at a time. Tomas owes fifty grand, and I am the one paying it.');
  refreshMarker();
  if (missions.M.active) ctx.setMarker(missions.currentTarget());
  else if (G.marker) {
    beacon.position.set(G.marker.x, 7, G.marker.z);
    beaconBase.position.set(G.marker.x, 0.3, G.marker.z);
  }
}

function showEnd(title, text) {
  G.state = 'over';
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  showScreen('endscreen');
  hud.show();
}

$('btn-start').onclick = () => startGame(true);
$('btn-continue').onclick = () => {
  const d = loadGame();
  if (!d) {
    hud.toast('No saved game yet. Start a new one.');
    return;
  }
  G.money = d.money;
  G.debtPaid = d.debtPaid;
  G.missionsDone = d.missionsDone;
  G.upgrades = d.upgrades || G.upgrades;
  G.health = d.health ?? 100;
  if (d.pos) playerMesh.position.set(d.pos[0], 0, d.pos[1]);
  if (typeof d.time === 'number') G.timeOfDay = d.time;
  ctx.debtPaid = G.debtPaid;
  startGame(false);
};
$('btn-continue').style.opacity = hasSave() ? '1' : '0.45';
$('btn-resume').onclick = () => {
  G.state = 'playing';
  showScreen(null);
};
$('btn-save').onclick = () => {
  saveGame(G);
  hud.toast('Saved.');
};
$('btn-quit').onclick = () => {
  saveGame(G);
  G.state = 'menu';
  hud.hide();
  showScreen('menu');
  $('btn-continue').style.opacity = '1';
};
$('btn-end-ok').onclick = () => {
  G.state = 'playing';
  showScreen(null);
};
$('btn-garage-close').onclick = () => {
  G.state = 'playing';
  showScreen(null);
};

const UPGRADE_DEFS = [
  { key: 'engine', name: 'Engine tune', desc: 'More power, higher top speed', price: 1500 },
  { key: 'handling', name: 'Suspension and grip', desc: 'Tighter steering at speed', price: 1200 },
  { key: 'armor', name: 'Armor plating', desc: 'Your car takes less damage from rams', price: 1500 },
];

function openGarage() {
  G.state = 'garage';
  const list = $('upgrades');
  list.innerHTML = '';
  for (const u of UPGRADE_DEFS) {
    const lvl = G.upgrades[u.key];
    const row = document.createElement('div');
    row.className = 'upg';
    row.innerHTML = '<span><b>' + u.name + ' (level ' + lvl + '/3)</b><br><small>' + u.desc + '</small></span>';
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = lvl >= 3 ? 'Maxed out' : 'Buy $' + u.price.toLocaleString();
    btn.disabled = lvl >= 3 || G.money < u.price;
    btn.onclick = () => {
      if (G.money < u.price || G.upgrades[u.key] >= 3) return;
      G.money -= u.price;
      G.upgrades[u.key] += 1;
      audio.cash();
      saveGame(G);
      openGarage();
    };
    row.appendChild(btn);
    list.appendChild(row);
  }
  $('garage-money').textContent = 'Your money: $' + G.money.toLocaleString();
  showScreen('garage');
}

// ---- Entering and stealing cars ----
function nearestCar(maxDist) {
  const p = G.playerPos();
  let best = null;
  let bestD = maxDist;
  for (const c of [...parked, ...traffic.cars]) {
    const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

function enterCar(car) {
  G.inCar = true;
  G.car = car;
  car.parked = false;
  const pi = parked.indexOf(car);
  if (pi >= 0) parked.splice(pi, 1);
  const ti = traffic.cars.indexOf(car);
  if (ti >= 0) traffic.cars.splice(ti, 1);
  playerMesh.visible = false;
  G.heading = car.heading;
  input.yaw = car.heading + Math.PI;
  if (car.stolen !== true && car !== G.starterCar && !car.wasDriven) {
    car.stolen = true;
    car.wasDriven = true;
    const policeNear = police.cars.some((pc) => Math.hypot(pc.pos.x - car.pos.x, pc.pos.z - car.pos.z) < 45);
    const pedNear = peds.peds.some((pd) => Math.hypot(pd.pos.x - car.pos.x, pd.pos.z - car.pos.z) < 15);
    if (policeNear || pedNear) {
      police.addWanted(1, 'stolen in view');
      hud.flash('You stole that car in plain sight. The police are coming.');
    } else {
      hud.flash('Nice ride. It is yours now.');
    }
  }
  hud.toast('Driving: ' + car.def.name);
}

function exitCar() {
  if (!G.car) return;
  const car = G.car;
  playerMesh.position.set(
    car.pos.x + Math.cos(car.heading) * 3,
    0,
    car.pos.z - Math.sin(car.heading) * 3,
  );
  playerMesh.visible = true;
  car.speed = 0;
  car.parked = true;
  parked.push(car);
  G.inCar = false;
  G.car = null;
}

// ---- Shooting ----
function tryShoot() {
  if (G.inCar || G.state !== 'playing') return;
  const dir = { x: Math.sin(G.heading), z: Math.cos(G.heading) };
  const res = combat.shoot(playerMesh.position, dir, audio);
  if (res === 'kill') hud.flash('Target down.');
  else if (res === 'hit') hud.flash('Hit.');
  else if (res === 'miss' && combat.ammo <= 0) hud.toast('Out of ammo. Find a new pistol at the garage.');
  if (res) {
    // A gunshot in the open draws the police, hit or not.
    if (police.wanted < 1) police.addWanted(1, 'shots fired');
  }
  if (combat.ammo === 0) {
    combat.ammo = 24;
    hud.toast('Carmen reloads from her spare box.');
  }
}

// ---- Main loop ----
let last = performance.now();
let eWasDown = false;
let fWasDown = false;
let gWasDown = false;
let rWasDown = false;
let pWasDown = false;
let mWasDown = false;
let tWasDown = false;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  // The city stays alive even on the menu, so the title screen moves.
  city.wheel.rotation.z += dt * 0.25;
  for (const b of city.boats) b.position.y = 0.4 + Math.sin(time * 0.7 + b.position.z) * 0.15;
  for (const p of particles) {
    if (p.life > 0) {
      p.life -= dt;
      p.mesh.material.opacity = Math.max(0, p.life);
      p.mesh.scale.setScalar(1 + (0.6 - p.life) * 3);
    }
  }
  beacon.rotation.y += dt;
  beacon.material.opacity = 0.28 + Math.sin(time * 3) * 0.1;
  if (G.state !== 'playing') {
    R.render();
    return;
  }
  // Screenshot staging: hold the staged frame still (the city still animates above).
  if (G.shotStaged) {
    if (G.shotCam) {
      R.camera.position.copy(G.shotCam.pos);
      R.camera.lookAt(G.shotCam.look);
    }
    if (G.shotDialog) {
      const d = document.getElementById('dialog');
      if (d.style.display !== 'block') hud.say(G.shotDialog.who, G.shotDialog.text);
    }
    hud.update(G);
    hud.drawMinimap(G);
    R.render();
    return;
  }

  // One-shot keys: fire once per press, not once per frame.
  const edge = (code, wasDown) => !!input.keys[code] && !wasDown;
  if (edge('KeyE', eWasDown)) {
    if (G.inCar) exitCar();
    else {
      const c = nearestCar(4.5);
      if (c) enterCar(c);
    }
  }
  eWasDown = !!input.keys['KeyE'];
  if (edge('KeyF', fWasDown)) tryShoot();
  fWasDown = !!input.keys['KeyF'];
  input.clicked = false;
  if (edge('KeyG', gWasDown)) {
    const d = Math.hypot(playerMesh.position.x - WORLD.garageFront.x, playerMesh.position.z - WORLD.garageFront.z);
    if (d < 14 && !G.inCar) openGarage();
  }
  gWasDown = !!input.keys['KeyG'];
  if (edge('KeyR', rWasDown)) {
    const st = audio.cycleStation();
    hud.toast('Radio: ' + st.name);
  }
  rWasDown = !!input.keys['KeyR'];
  if (edge('KeyP', pWasDown) || edge('Escape', pWasDown)) {
    G.state = 'paused';
    $('pause-stats').textContent = 'Money $' + G.money.toLocaleString() + ' - debt paid $' + G.debtPaid.toLocaleString() + ' of $50,000 - jobs done ' + G.missionsDone + ' of 7 - wanted ' + police.wanted + ' stars.';
    showScreen('pause');
  }
  pWasDown = !!input.keys['KeyP'] || !!input.keys['Escape'];
  if (edge('KeyM', mWasDown)) hud.toast(audio.toggleMute() ? 'Sound off' : 'Sound on');
  mWasDown = !!input.keys['KeyM'];
  if (edge('KeyT', tWasDown)) {
    G.timeOfDay = (G.timeOfDay + 1) % 3;
    R.setTimeOfDay(G.timeOfDay);
    hud.toast(G.timeOfDay === 2 ? 'Dusk over the lagoon' : G.timeOfDay === 1 ? 'Golden hour' : 'Midday sun');
  }
  tWasDown = !!input.keys['KeyT'];

  // The camera yaw follows the mouse drag; while driving it trails the car.
  if (G.inCar) input.yaw += ((G.car.heading + Math.PI) - input.yaw) * Math.min(1, dt * 0.8);
  G.heading = G.inCar ? G.car.heading : input.yaw + Math.PI;

  if (G.inCar) {
    const car = G.car;
    const drv = {
      forward: pressed(input, 'KeyW', 'ArrowUp'),
      back: pressed(input, 'KeyS', 'ArrowDown'),
      left: pressed(input, 'KeyA', 'ArrowLeft'),
      right: pressed(input, 'KeyD', 'ArrowRight'),
      brake: pressed(input, 'Space'),
    };
    const before = { x: car.pos.x, z: car.pos.z };
    driveCar(car, drv, dt, G.upgrades);
    car.mesh.position.y = deckHeight(car.pos.x, car.pos.z);
    collide(car.pos, 2.2, city.colliders);
    clampToLand(car.pos, 2.2);
    // Stuck against a wall at speed: scrape off speed and kick up dust.
    if (Math.abs(car.pos.x - before.x) < 0.001 && Math.abs(car.pos.z - before.z) < 0.001 && Math.abs(car.speed) > 4) {
      car.speed *= 0.4;
      puff(car.pos.x, car.pos.z);
    }
    if (Math.abs(car.speed) > 18 && Math.random() < dt * 2) {
      puff(car.pos.x - Math.sin(car.heading) * 2, car.pos.z - Math.cos(car.heading) * 2);
    }
    // Hitting a pedestrian is a crime.
    for (const pd of peds.peds) {
      if (Math.hypot(pd.pos.x - car.pos.x, pd.pos.z - car.pos.z) < 2.4) {
        pd.pos.x += Math.sin(car.heading) * 6;
        pd.pos.z += Math.cos(car.heading) * 6;
        if (police.wanted < 2) police.addWanted(1, 'hit a pedestrian');
        hud.flash('You hit someone. The city saw that.');
      }
    }
    car.mesh.userData.headlight.intensity = G.timeOfDay === 2 ? 2.2 : 0;
    audio.setEngine(Math.abs(car.speed) / 36, true);
    // A wrecked car strands you: climb out, it stays as a wreck.
    if ((car.hp || 100) <= 0 && G.upgrades.armor < 99) {
      hud.flash('The car is wrecked. Get out.');
      exitCar();
    }
  } else {
    // On foot.
    const sprint = pressed(input, 'ShiftLeft', 'ShiftRight') ? 1.5 : 1;
    const f = (pressed(input, 'KeyW', 'ArrowUp') ? 1 : 0) - (pressed(input, 'KeyS', 'ArrowDown') ? 1 : 0);
    const s = (pressed(input, 'KeyD', 'ArrowRight') ? 1 : 0) - (pressed(input, 'KeyA', 'ArrowLeft') ? 1 : 0);
    const yaw = input.yaw;
    const mx = Math.sin(yaw) * f + Math.cos(yaw) * s;
    const mz = Math.cos(yaw) * f - Math.sin(yaw) * s;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      const sp = 6 * sprint;
      playerMesh.position.x += (mx / len) * sp * dt;
      playerMesh.position.z += (mz / len) * sp * dt;
      playerMesh.rotation.y = Math.atan2(mx, mz);
      const ph = time * 10;
      playerMesh.userData.legs[0].rotation.x = Math.sin(ph) * 0.6;
      playerMesh.userData.legs[1].rotation.x = -Math.sin(ph) * 0.6;
    } else {
      playerMesh.userData.legs[0].rotation.x = 0;
      playerMesh.userData.legs[1].rotation.x = 0;
    }
    collide(playerMesh.position, 0.7, city.colliders);
    clampToLand(playerMesh.position, 0.7);
    playerMesh.position.y = deckHeight(playerMesh.position.x, playerMesh.position.z);
    audio.setEngine(0, false);
  }

  // Mission start: walk or drive into the garage marker.
  if (!missions.M.active && G.marker && G.marker.startMission) {
    const p = G.playerPos();
    if (Math.hypot(p.x - G.marker.x, p.z - G.marker.z) < 8) {
      const m = G.marker.startMission;
      G.marker = null;
      missions.start(m, ctx);
      ctx.setMarker(missions.currentTarget());
    }
  }
  missions.update(dt, ctx);
  traffic.update(dt, G.car, police.cars);
  const danger = G.inCar ? G.car.pos : playerMesh.position;
  peds.update(dt, time, danger, G.inCar ? Math.abs(G.car.speed) * 2 + 4 : 0);
  combat.update(dt, playerMesh.position, (dmg) => {
    const armor = G.upgrades.armor;
    G.health = Math.max(0, G.health - dmg * (1 - 0.12 * armor));
    if (G.health <= 0) {
      G.health = 100;
      G.money = Math.max(0, G.money - 200);
      playerMesh.position.set(WORLD.garage.x + 4, 0, WORLD.garage.z + 12);
      if (G.inCar) exitCar();
      showEnd('You got hurt bad', 'The crew patched you up at the garage. Hospital bill: $200. The debt is still waiting.');
    }
  });
  const busted = police.update(dt, G.playerPos(), G.car, !G.inCar, time);
  G.wanted = police.wanted;
  audio.siren(police.wanted > 0);
  if (busted) {
    police.reset();
    G.wanted = 0;
    G.money = Math.max(0, G.money - 300);
    playerMesh.position.set(WORLD.garage.x + 4, 0, WORLD.garage.z + 12);
    if (G.inCar) exitCar();
    showEnd('Busted', 'The police took you in. Fine: $300. Carmen walks out of the station and straight back to work.');
  }
  // Slow health regen when nothing is shooting at you.
  if (combat.enemies.length === 0 && G.health < 100) G.health = Math.min(100, G.health + 2 * dt);

  // Camera.
  const target = G.inCar ? G.car.pos : playerMesh.position;
  if (G.shotCam) {
    R.camera.position.copy(G.shotCam.pos);
    R.camera.lookAt(G.shotCam.look);
  } else {
    R.updateCamera(target, input.yaw, input.pitch, G.inCar ? 13 : 9, dt);
  }
  hud.update(G);
  hud.drawMinimap(G);
  R.render();
}
requestAnimationFrame(frame);

// ---- Screenshot staging (?shot=cover|drive|mission|city) ----
window.__game = G;
window.__sys = { missions, ctx, police, combat, traffic, peds, playerMesh, R, WORLD, enterCar, exitCar, hud, city };
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  document.title = 'Laguna Verde - shot ' + shot;
  startGame(true);
  stageShot(shot, G, { missions, ctx, police, combat, traffic, peds, parked, playerMesh, R, WORLD, enterCar, hud });
  window.__shotReady = true;
}
