// Pedestrians: people walking the sidewalks. They stroll, wait at corners,
// and run when a car comes at them too fast. Hitting one is a crime.

import * as THREE from 'three';
import { CONFIG } from './config.js';

const SHIRT_COLORS = [0xe07a5f, 0x81b29a, 0xf2c14e, 0x4d96ff, 0xff9f45, 0x9b5de5, 0xe8e8e8, 0x6bcb77];

function makePersonMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.1, 0.4),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.85;
  g.add(head);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.8, 0.26),
    new THREE.MeshLambertMaterial({ color: 0x2f3338 }),
  );
  legL.position.set(-0.16, 0.4, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  g.add(legR);
  return g;
}

export function createPedestrians(world, scene, rng) {
  const people = [];
  for (let i = 0; i < CONFIG.pedestrians.count; i++) {
    const node = world.nodes[Math.floor(rng.next() * world.nodes.length)];
    const x = node.x + rng.range(-14, 14);
    const z = node.z + rng.range(-14, 14);
    if (z < -60) continue; // nobody strolls on the water
    const mesh = makePersonMesh(rng.pick(SHIRT_COLORS));
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    people.push({
      mesh,
      x,
      z,
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(0.8, 1.6),
      wait: rng.range(0, 4),
      down: false,
      downTimer: 0,
      walkPhase: rng.range(0, Math.PI * 2),
    });
  }
  return people;
}

export function updatePedestrians(people, world, dt, playerCar, playerPos, onHit) {
  for (const p of people) {
    if (p.down) {
      p.downTimer -= dt;
      if (p.downTimer <= 0) {
        p.down = false;
        p.mesh.rotation.z = 0;
        p.mesh.position.y = 0;
      }
      continue;
    }
    // Flee from a fast car heading our way.
    let fleeX = 0;
    let fleeZ = 0;
    if (playerCar && !playerCar.wrecked && Math.abs(playerCar.speed) > 8) {
      const dx = p.x - playerCar.x;
      const dz = p.z - playerCar.z;
      const d = Math.hypot(dx, dz);
      if (d < 9) {
        fleeX = dx / (d || 1);
        fleeZ = dz / (d || 1);
      }
    }
    if (p.wait > 0) {
      p.wait -= dt;
    } else {
      if (fleeX !== 0 || fleeZ !== 0) {
        p.angle = Math.atan2(fleeX, fleeZ);
        p.speed = 3.2;
      } else {
        p.speed = 1.2;
        if (Math.random() < dt * 0.15) p.angle += (Math.random() - 0.5) * 1.6;
      }
      const nx = p.x + Math.sin(p.angle) * p.speed * dt;
      const nz = p.z + Math.cos(p.angle) * p.speed * dt;
      if (nx > -215 && nx < 235 && nz > -275 && nz < 195 && nz > -58) {
        p.x = nx;
        p.z = nz;
      } else {
        p.angle += Math.PI / 2;
      }
      if (Math.random() < dt * 0.05) p.wait = Math.random() * 3;
    }
    // Hit by the player's car: down they go, and the law notices.
    if (playerCar && !playerCar.wrecked) {
      const d = Math.hypot(playerCar.x - p.x, playerCar.z - p.z);
      if (d < 2.1 && Math.abs(playerCar.speed) > 2) {
        p.down = true;
        p.downTimer = 6;
        p.mesh.rotation.z = Math.PI / 2;
        p.mesh.position.y = 0.3;
        if (onHit) onHit(p);
      }
    }
    p.walkPhase += dt * p.speed * 4;
    p.mesh.position.set(p.x, p.down ? 0.3 : Math.abs(Math.sin(p.walkPhase)) * 0.06, p.z);
    p.mesh.rotation.y = p.angle;
  }
}
