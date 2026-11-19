// Wanted level and police: patrol cars that chase, ram and bust; a
// helicopter at 3 stars and up; wanted that cools off when you stay out of
// sight. One job: the heat.
import * as THREE from '../vendor/three.module.min.js';
import { makeCar } from './cars.js';

const POLICE_DEF = { name: 'LVPD interceptor', color: 0x1a2a33, top: 34, accel: 20, grip: 1.2 };
const WORLD_CLAMP = 240;
const COOL_OFF_DIST = 55;
const COOL_OFF_SECS = 14;
const BUST_SECS = 2.5;

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function createPolice(scene, rng) {
  const P = {
    wanted: 0,
    heat: 0,
    cars: [],
    heli: null,
    heliMesh: null,
    evadeTimer: 0,
    bustTimer: 0,
  };

  function spawnCar(near) {
    const a = rng() * Math.PI * 2;
    const x = Math.max(-WORLD_CLAMP, Math.min(WORLD_CLAMP, near.x + Math.cos(a) * 70));
    const z = Math.max(-WORLD_CLAMP, Math.min(WORLD_CLAMP, near.z + Math.sin(a) * 70));
    const car = makeCar(scene, POLICE_DEF, x, z, 0, true);
    car.cruise = 30;
    P.cars.push(car);
    return car;
  }

  function spawnHeli() {
    if (P.heliMesh) return;
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.4, 5),
      new THREE.MeshLambertMaterial({ color: 0x1a2a33 }),
    );
    body.castShadow = true;
    g.add(body);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.15, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    rotor.position.y = 1.1;
    g.add(rotor);
    g.userData.rotor = rotor;
    // The searchlight cone pointing down at the street.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 3.5, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
    );
    beam.position.y = -15;
    g.add(beam);
    scene.add(g);
    P.heliMesh = g;
    P.heli = { mesh: g, pos: g.position };
  }

  function removeHeli() {
    if (!P.heliMesh) return;
    scene.remove(P.heliMesh);
    P.heliMesh = null;
    P.heli = null;
  }

  function addWanted(n, reason) {
    P.wanted = Math.max(0, Math.min(5, P.wanted + n));
    P.heat = 100;
    P.evadeTimer = 0;
    return reason;
  }

  function chaseCar(car, dt, playerPos, playerCar, onFoot, time) {
    const dx = playerPos.x - car.pos.x;
    const dz = playerPos.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    const diff = wrapAngle(Math.atan2(dx, dz) - car.heading);
    car.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff * 3));
    const targetSpeed = dist > 60 ? 34 : 30;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.set(car.pos.x, 0, car.pos.z);
    car.mesh.rotation.y = car.heading;
    // The light bar flashes red and blue.
    if (car.mesh.userData.lightBar) {
      car.mesh.userData.lightBar.material.color.setHex(Math.floor(time * 4) % 2 ? 0xff2222 : 0x2244ff);
    }
    // Ram the player's car: slow it, shove it, wear it down.
    if (playerCar && dist < 4.5) {
      playerCar.speed *= 0.6;
      playerCar.pos.x += Math.sin(car.heading) * 3 * dt * 10;
      playerCar.pos.z += Math.cos(car.heading) * 3 * dt * 10;
      playerCar.hp = Math.max(0, (playerCar.hp || 100) - 8 * dt);
    }
    // A patrol car sitting on Carmen on foot starts the bust clock.
    if (onFoot && dist < 3) P.bustTimer += dt;
    else P.bustTimer = Math.max(0, P.bustTimer - dt);
    return dist;
  }

  function update(dt, playerPos, playerCar, onFoot, time) {
    // One patrol car per star, capped at five.
    const wantCount = P.wanted === 0 ? 0 : Math.min(5, P.wanted);
    while (P.cars.length < wantCount) spawnCar(playerPos);
    while (P.cars.length > wantCount) {
      const c = P.cars.pop();
      scene.remove(c.mesh);
    }
    if (P.wanted >= 3) spawnHeli();
    else removeHeli();

    let nearest = 999;
    for (const car of P.cars) {
      nearest = Math.min(nearest, chaseCar(car, dt, playerPos, playerCar, onFoot, time));
    }
    if (P.heli) {
      const t = P.heli.pos;
      t.x += (playerPos.x - t.x) * Math.min(1, dt * 0.5);
      t.z += (playerPos.z - t.z) * Math.min(1, dt * 0.5);
      t.y = 42 + Math.sin(time * 0.8) * 2;
      P.heliMesh.userData.rotor.rotation.y += dt * 30;
      P.heliMesh.position.copy(t);
    }
    // Wanted cools off if no police car is close for a while: one star per
    // 14 seconds of breathing room.
    if (P.wanted > 0) {
      if (nearest > COOL_OFF_DIST) {
        P.evadeTimer += dt;
        if (P.evadeTimer > COOL_OFF_SECS) {
          P.wanted -= 1;
          P.evadeTimer = 0;
        }
      } else {
        P.evadeTimer = 0;
      }
    }
    // Busted when a patrol car has sat on Carmen for 2.5 seconds.
    return P.bustTimer > BUST_SECS;
  }

  function reset() {
    P.wanted = 0;
    P.heat = 0;
    P.evadeTimer = 0;
    P.bustTimer = 0;
    for (const c of P.cars) scene.remove(c.mesh);
    P.cars = [];
    removeHeli();
  }

  P.addWanted = addWanted;
  P.update = update;
  P.reset = reset;
  P.spawnCar = spawnCar;
  P.spawnHeli = spawnHeli;
  return P;
}
