// Pedestrians. One job: people on the sidewalks — walk, pause at
// corners, cross the street now and then, and run when a car or a
// gunshot comes too close.

import * as THREE from 'three';
import { CONFIG } from './config.js';

const SHIRTS = [0xe2725b, 0x4fa8a0, 0xf2a541, 0x7fb069, 0x6d9dc5, 0xef8354, 0xe9c46a, 0xb03a5b];
const SKINS = [0xc68e5e, 0x8d5524, 0xffdbac, 0xf1c27d, 0xe0ac69];
const PANTS = [0x2c3e50, 0x5a5a66, 0x3a3a40, 0x6b5a48];

function makePerson(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
  const skin = new THREE.MeshLambertMaterial({ color: rng.pick(SKINS) });
  const pants = new THREE.MeshLambertMaterial({ color: rng.pick(PANTS) });
  const box = new THREE.BoxGeometry(1, 1, 1);

  function part(w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(box, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  part(0.55, 0.65, 0.3, 0, 1.15, 0, shirt); // torso
  const head = part(0.34, 0.34, 0.34, 0, 1.68, 0, skin);
  head.name = 'head';
  const legL = part(0.2, 0.7, 0.22, -0.14, 0.35, 0, pants);
  const legR = part(0.2, 0.7, 0.22, 0.14, 0.35, 0, pants);
  legL.name = 'legL';
  legR.name = 'legR';
  const armL = part(0.14, 0.6, 0.16, -0.36, 1.15, 0, shirt);
  const armR = part(0.14, 0.6, 0.16, 0.36, 1.15, 0, shirt);
  armL.name = 'armL';
  armR.name = 'armR';
  group.userData = { legL, legR, armL, armR };
  return group;
}

export class Pedestrians {
  constructor(scene, layout, rng) {
    this.scene = scene;
    this.layout = layout;
    this.rng = rng;
    this.people = [];
    for (let i = 0; i < CONFIG.pedestrians; i++) {
      const path = this.rng.pick(layout.sidewalks);
      const mesh = makePerson(rng);
      const along = rng.range(0, path.len);
      const x = path.axis === 'x' ? path.x - path.len / 2 + along : path.x;
      const z = path.axis === 'z' ? path.z - path.len / 2 + along : path.z;
      mesh.position.set(x, 0, z);
      scene.add(mesh);
      this.people.push({
        mesh,
        path,
        along,
        dir: rng.chance(0.5) ? 1 : -1,
        speed: rng.range(1.2, 2.2),
        phase: rng.range(0, Math.PI * 2),
        flee: 0,
        fleeX: 0,
        fleeZ: 0,
      });
    }
  }

  // A scare at (x, z): everyone nearby runs away from it.
  scare(x, z, radius) {
    for (const p of this.people) {
      const dx = p.mesh.position.x - x;
      const dz = p.mesh.position.z - z;
      const d = Math.hypot(dx, dz);
      if (d < radius) {
        p.flee = 2.5;
        p.fleeX = dx / (d || 1);
        p.fleeZ = dz / (d || 1);
      }
    }
  }

  update(dt, t, playerPos) {
    for (const p of this.people) {
      const m = p.mesh;
      let speed = p.speed;
      if (p.flee > 0) {
        p.flee -= dt;
        speed = 5.5;
        m.position.x += p.fleeX * speed * dt;
        m.position.z += p.fleeZ * speed * dt;
        m.rotation.y = Math.atan2(p.fleeX, p.fleeZ);
      } else {
        // Walk the sidewalk; turn around at the ends.
        p.along += p.dir * speed * dt;
        if (p.along > p.path.len) { p.along = p.path.len; p.dir = -1; }
        if (p.along < 0) { p.along = 0; p.dir = 1; }
        const x = p.path.axis === 'x' ? p.path.x - p.path.len / 2 + p.along : p.path.x;
        const z = p.path.axis === 'z' ? p.path.z - p.path.len / 2 + p.along : p.path.z;
        m.position.x = x;
        m.position.z = z;
        const heading = p.path.axis === 'x' ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (p.dir > 0 ? 0 : Math.PI);
        m.rotation.y = heading;
        // A car close behind makes them hurry off the road.
        if (playerPos) {
          const d = Math.hypot(playerPos.x - x, playerPos.z - z);
          if (d < 5) this.scare(playerPos.x, playerPos.z, 8);
        }
      }
      // Simple walk cycle: legs and arms swing.
      const swing = Math.sin(t * 7 + p.phase) * 0.5 * Math.min(1, speed / 2);
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;
      p.mesh.userData.armL.rotation.x = -swing * 0.7;
      p.mesh.userData.armR.rotation.x = swing * 0.7;
    }
  }
}
