// Pedestrians. One job: people walking the sidewalks between waypoints so
// the streets are not empty. They stroll, pause at corners, and never walk
// on the lagoon (except the causeway).

import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { mulberry32, rand, pick } from './random.js';

const SHIRT_COLORS = [0xd96a4f, 0x5b8fb9, 0x7fb069, 0xe8b04b, 0xc98bb9, 0xf2e3c9, 0x8a6fb8, 0x3a3a40];

export class Pedestrians {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(33);
    this.walkers = [];
    for (let i = 0; i < 16; i++) this.spawn();
  }

  spawn() {
    const rng = this.rng;
    const shirt = pick(rng, SHIRT_COLORS);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.1, 8), new THREE.MeshLambertMaterial({ color: shirt }));
    body.position.y = 1.15;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a986 }));
    head.position.y = 1.95;
    head.castShadow = true;
    g.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
    legs.position.y = 0.35;
    g.add(legs);
    const x = pick(rng, CONFIG.roadsX) + 7;
    const z = rand(rng, -140, 140);
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.walkers.push({
      group: g, x, z, yaw: rng() * Math.PI * 2,
      speed: rand(rng, 1, 2.2), target: null, pause: rand(rng, 0, 3),
    });
  }

  update(dt) {
    for (const w of this.walkers) {
      if (w.pause > 0) {
        w.pause -= dt;
        continue;
      }
      if (!w.target) {
        const vertical = this.rng() < 0.5;
        if (vertical) {
          w.target = { x: pick(this.rng, CONFIG.roadsX) + 7, z: rand(this.rng, -140, 140) };
        } else {
          w.target = { x: rand(this.rng, -110, 150), z: pick(this.rng, CONFIG.roadsZ) + 7 };
        }
        // Never send a walker into the lagoon; the causeway is the only crossing.
        if (w.target.x < -115 && Math.abs(w.target.z) > 8) w.target.x = -112;
      }
      const dx = w.target.x - w.x;
      const dz = w.target.z - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        w.target = null;
        w.pause = rand(this.rng, 1, 4);
        continue;
      }
      w.yaw = Math.atan2(dx, dz);
      w.x += (dx / dist) * w.speed * dt;
      w.z += (dz / dist) * w.speed * dt;
      if (w.x < -115 && Math.abs(w.z) > 8) w.x = -112;
      w.group.position.set(w.x, 0, w.z);
      w.group.rotation.y = w.yaw;
      w.group.position.y = Math.abs(Math.sin(performance.now() / 300 + w.x)) * 0.06;
    }
  }
}
