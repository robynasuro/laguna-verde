// Pistol combat. One job: the enemies in the garage job, the player's
// hitscan pistol, and the tracer that shows where a shot went. Enemies walk
// toward the player and shoot back, but they are bad shots on purpose.

import * as THREE from '../vendor/three.module.min.js';
import { ENEMY } from './config.js';
import { mulberry32, rand } from './random.js';

export class Combat {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(77);
    this.enemies = [];
    this.tracers = [];
  }

  spawnEnemies(x, z, n) {
    this.clearEnemies();
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0x3a3a3a }));
      body.position.y = 1.2;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc9a186 }));
      head.position.y = 2.05;
      g.add(head);
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x5a2a2a }));
      vest.position.y = 1.3;
      g.add(vest);
      const ex = x + rand(this.rng, -14, 14);
      const ez = z + rand(this.rng, -14, 14);
      g.position.set(ex, 0, ez);
      this.scene.add(g);
      this.enemies.push({ group: g, x: ex, z: ez, yaw: 0, health: ENEMY.health, fireTimer: rand(this.rng, 1, 3) });
    }
  }

  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.group);
    this.enemies = [];
  }

  update(dt, player) {
    for (const e of this.enemies) {
      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 14) {
        e.x += (dx / dist) * 2.5 * dt;
        e.z += (dz / dist) * 2.5 * dt;
        e.yaw = Math.atan2(dx, dz);
      }
      e.group.position.set(e.x, 0, e.z);
      e.group.rotation.y = e.yaw;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && dist < ENEMY.fireRange && player.health > 0) {
        e.fireTimer = ENEMY.fireInterval;
        if (this.rng() < ENEMY.fireHitChance) {
          const armor = (player.upgrades && player.upgrades.armor) || 0;
          const dmg = ENEMY.fireDamage * (1 - armor * 0.15);
          player.health = Math.max(0, player.health - dmg);
        }
      }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / 0.12);
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }
  }

  // Hitscan shot from the player's facing. Returns the enemy hit, or null.
  shoot(player) {
    const fx = Math.sin(player.yaw);
    const fz = Math.cos(player.yaw);
    let best = null;
    let bestDist = Infinity;
    for (const e of this.enemies) {
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const dist = Math.hypot(dx, dz);
      if (dist > ENEMY.range) continue;
      const dot = (dx * fx + dz * fz) / dist;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (angle < ENEMY.aimCone && dist < bestDist) {
        best = e;
        bestDist = dist;
      }
    }
    const endX = player.x + fx * (best ? bestDist : ENEMY.range);
    const endZ = player.z + fz * (best ? bestDist : ENEMY.range);
    const len = Math.hypot(endX - player.x, endZ - player.z);
    const tracer = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, len),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 1 }),
    );
    tracer.position.set((player.x + endX) / 2, 1.4, (player.z + endZ) / 2);
    tracer.lookAt(endX, 1.4, endZ);
    this.scene.add(tracer);
    this.tracers.push({ mesh: tracer, life: 0.12 });
    if (best) {
      best.health -= ENEMY.shotDamage;
      if (best.health <= 0) {
        this.scene.remove(best.group);
        this.enemies.splice(this.enemies.indexOf(best), 1);
        return { killed: best, dist: bestDist };
      }
      return { hit: best, dist: bestDist };
    }
    return null;
  }
}
