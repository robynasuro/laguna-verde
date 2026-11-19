// Wanted level, police patrol cars, and the helicopter. Crimes raise heat;
// heat decays when the player stays out of sight. The helicopter shows up
// at three stars with a searchlight that follows the player.

import * as THREE from 'three';
import { makeCar, driveCar } from './cars.js';
import { CONFIG } from './config.js';
import { nearestNode } from './world.js';

export function createPolice(scene) {
  const heli = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.4, 5),
    new THREE.MeshLambertMaterial({ color: 0x2f4a6b }),
  );
  heli.add(body);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 4.5),
    new THREE.MeshLambertMaterial({ color: 0x2f4a6b }),
  );
  tail.position.set(0, 0.2, -4);
  heli.add(tail);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.12, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x181818 }),
  );
  rotor.position.y = 1;
  heli.add(rotor);
  // Searchlight cone, pointing down.
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 34, 12, 1, true), beamMat);
  beam.position.y = -17;
  beam.rotation.x = Math.PI;
  heli.add(beam);
  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.y = -33;
  heli.add(spot);
  heli.visible = false;
  scene.add(heli);
  return {
    cars: [],
    heli,
    rotor,
    wanted: 0,
    heat: 0,
    quietTimer: 0,
    spawnTimer: 0,
  };
}

export function addWanted(police, n, reason) {
  police.wanted = Math.max(0, Math.min(5, police.wanted + n));
  police.heat = Math.min(100, police.heat + n * 22);
  police.quietTimer = 0;
  if (reason) police.lastReason = reason;
}

export function setWanted(police, n) {
  police.wanted = Math.max(0, Math.min(5, n));
  police.heat = n * 22;
  police.quietTimer = 0;
}

export function updatePolice(police, world, scene, dt, player, rng) {
  const px = player.x;
  const pz = player.z;
  const moving = player.car ? Math.abs(player.car.speed) : 0;

  // Heat decays when no police car is close and the player is not committing
  // crimes. Wanted drops a star each time heat empties.
  let nearest = Infinity;
  for (const c of police.cars) {
    nearest = Math.min(nearest, Math.hypot(c.x - px, c.z - pz));
  }
  if (police.wanted > 0) {
    if (nearest > 110 && moving < 25) police.quietTimer += dt;
    else police.quietTimer = 0;
    if (police.quietTimer > 10) {
      police.wanted -= 1;
      police.heat = police.wanted * 22;
      police.quietTimer = 0;
    }
  }

  // Spawn patrol cars up to the wanted level.
  police.spawnTimer -= dt;
  const wantCars = Math.min(police.wanted, CONFIG.police.maxCars);
  if (police.cars.length < wantCars && police.spawnTimer <= 0) {
    police.spawnTimer = 2.5;
    const node = nearestNode(world, px + (rng.next() - 0.5) * 160, pz + (rng.next() - 0.5) * 160);
    const car = makeCar(world, scene, node.x, node.z, 0, 0x1c2733, { police: true });
    car.speed = 12;
    car.targetNode = node.id;
    police.cars.push(car);
  }
  // Despawn cars that fell far behind when wanted is gone.
  if (police.wanted === 0) {
    for (const c of [...police.cars]) {
      const d = Math.hypot(c.x - px, c.z - pz);
      if (d > 160) {
        scene.remove(c.group);
        police.cars.splice(police.cars.indexOf(c), 1);
      }
    }
  }

  // Chase: steer toward the player, ram to slow them down.
  for (const car of police.cars) {
    if (car.wrecked) continue;
    const dx = px - car.x;
    const dz = pz - car.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.4));
    const throttle = dist > 6 ? 1 : 0.4;
    driveCar(car, world, dt, throttle, steer, false);
    if (car.speed > CONFIG.police.chaseSpeed) car.speed = CONFIG.police.chaseSpeed;
    // Ramming the player's car damages it.
    if (player.car && !player.car.wrecked && dist < 3.4) {
      player.car.health -= 14 * dt;
      player.car.speed *= 0.985;
      if (player.car.health <= 0) {
        player.car.health = 0;
        player.car.wrecked = true;
      }
    }
  }

  // Helicopter at three stars and up.
  const heliOn = police.wanted >= CONFIG.police.heliAtWanted;
  police.heli.visible = heliOn;
  if (heliOn) {
    const t = performance.now() / 1000;
    const hx = px + Math.sin(t * 0.5) * 14;
    const hz = pz + Math.cos(t * 0.4) * 14;
    police.heli.position.x += (hx - police.heli.position.x) * Math.min(1, dt * 1.5);
    police.heli.position.z += (hz - police.heli.position.z) * Math.min(1, dt * 1.5);
    police.heli.position.y = 34 + Math.sin(t * 0.8) * 1.5;
    police.heli.rotation.y = Math.atan2(px - police.heli.position.x, pz - police.heli.position.z);
    police.rotor.rotation.y += dt * 18;
  }
}
