// Combat. One job: the pistol — aim, shoot, hit, and the mission
// enemies who shoot back. Simple raycast hits, visible tracers,
// health, and a clear line between a fair fight and a dead player.

import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Combat {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.enemies = [];
    this.cooldown = 0;
    this.tracers = [];
    this.raycaster = new THREE.Raycaster();
    this.ammo = Infinity; // a mechanic's pistol, always loaded
  }

  // Spawn mission enemies around a point (the defend mission).
  spawnEnemies(center, count, onDown) {
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const shirt = new THREE.MeshLambertMaterial({ color: 0x222222 });
      const skin = new THREE.MeshLambertMaterial({ color: 0xc68e5e });
      const box = new THREE.BoxGeometry(1, 1, 1);
      const torso = new THREE.Mesh(box, shirt);
      torso.scale.set(0.6, 0.7, 0.32);
      torso.position.y = 1.15;
      const head = new THREE.Mesh(box, skin);
      head.scale.set(0.36, 0.36, 0.36);
      head.position.y = 1.68;
      const legL = new THREE.Mesh(box, shirt);
      legL.scale.set(0.2, 0.7, 0.22);
      legL.position.set(-0.14, 0.35, 0);
      const legR = legL.clone();
      legR.position.x = 0.14;
      const gun = new THREE.Mesh(box, new THREE.MeshLambertMaterial({ color: 0x111111 }));
      gun.scale.set(0.1, 0.1, 0.5);
      gun.position.set(0.3, 1.2, 0.3);
      group.add(torso, head, legL, legR, gun);
      const angle = (i / count) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * 18;
      const z = center.z + Math.sin(angle) * 18;
      group.position.set(x, 0, z);
      this.scene.add(group);
      this.enemies.push({ mesh: group, health: CONFIG.enemyHealth, shootTimer: 1 + i, onDown });
    }
  }

  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
  }

  enemyCount() {
    return this.enemies.length;
  }

  // The player fires from the camera direction. Returns the enemy hit.
  shoot(origin, direction, playerPos) {
    if (this.cooldown > 0) return null;
    this.cooldown = CONFIG.pistolRate;
    this.raycaster.set(origin, direction);
    this.raycaster.far = CONFIG.pistolRange;
    const meshes = this.enemies.map((e) => e.mesh);
    const hits = this.raycaster.intersectObjects(meshes, true);
    this.spawnTracer(origin, direction);
    if (hits.length === 0) return null;
    const hitObj = hits[0].object;
    const enemy = this.enemies.find((e) => e.mesh === hitObj || e.mesh.children.includes(hitObj));
    if (!enemy) return null;
    enemy.health -= CONFIG.pistolDamage;
    if (enemy.health <= 0) {
      this.scene.remove(enemy.mesh);
      this.enemies = this.enemies.filter((e) => e !== enemy);
      if (enemy.onDown) enemy.onDown();
      return enemy;
    }
    return enemy;
  }

  spawnTracer(origin, direction) {
    const end = origin.clone().add(direction.clone().multiplyScalar(CONFIG.pistolRange));
    const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }),
    );
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
  }

  update(dt, playerPos, onPlayerHit) {
    if (this.cooldown > 0) this.cooldown -= dt;
    for (const t of this.tracers) {
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
      }
    }
    this.tracers = this.tracers.filter((t) => t.life > 0);

    // Enemies walk toward the player and fire when close enough.
    for (const e of this.enemies) {
      const dx = playerPos.x - e.mesh.position.x;
      const dz = playerPos.z - e.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      e.mesh.rotation.y = Math.atan2(dx, dz);
      if (dist > 14) {
        e.mesh.position.x += (dx / dist) * 3.2 * dt;
        e.mesh.position.z += (dz / dist) * 3.2 * dt;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 40) {
        e.shootTimer = 1.6 + this.rng.next() * 0.8;
        // Inaccurate on purpose: most shots miss, some sting.
        if (this.rng.next() < 0.3) onPlayerHit(8);
        const from = e.mesh.position.clone().setY(1.3);
        const to = new THREE.Vector3(playerPos.x, 1.2, playerPos.z);
        const dir = to.clone().sub(from).normalize();
        this.spawnTracer(from, dir);
      }
    }
  }
}
