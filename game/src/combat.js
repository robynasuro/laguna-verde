// Combat: the pistol, rival crew enemies, shooting and health.
// One job: fighting on foot.
import * as THREE from '../vendor/three.module.js';

export function createCombat(scene, rng) {
  const C = { enemies: [], bullets: [], ammo: 24, lastShot: 0 };
  function spawnRivals(x, z, count) {
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.05, 8), new THREE.MeshLambertMaterial({ color: 0x223344 }));
      body.position.y = 1.0; body.castShadow = true; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
      head.position.y = 1.78; g.add(head);
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.3), new THREE.MeshLambertMaterial({ color: 0x8b2e2e }));
      vest.position.set(0, 1.15, 0.2); g.add(vest);
      g.position.set(x + (rng() - 0.5) * 14, 0, z + (rng() - 0.5) * 14);
      scene.add(g);
      C.enemies.push({ mesh: g, pos: g.position, hp: 3, shootTimer: 1 + rng() * 2 });
    }
  }
  function shoot(from, dir, audio) {
    const now = performance.now() / 1000;
    if (now - C.lastShot < 0.28 || C.ammo <= 0) return false;
    C.lastShot = now; C.ammo -= 1;
    audio.shot();
    // Hitscan: nearest enemy within a cone of the aim direction.
    let best = null, bestD = 999;
    for (const e of C.enemies) {
      const dx = e.pos.x - from.x, dz = e.pos.z - from.z;
      const d = Math.hypot(dx, dz);
      if (d > 60) continue;
      const dot = (dx * dir.x + dz * dir.z) / d;
      if (dot > 0.94 && d < bestD) { best = e; bestD = d; }
    }
    if (best) {
      best.hp -= 1;
      best.mesh.position.x += dir.x * 0.4; best.mesh.position.z += dir.z * 0.4;
      if (best.hp <= 0) {
        scene.remove(best.mesh);
        C.enemies.splice(C.enemies.indexOf(best), 1);
        return 'kill';
      }
      return 'hit';
    }
    return 'miss';
  }
  function update(dt, playerPos, onPlayerHit) {
    for (const e of [...C.enemies]) {
      const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.5) {
        e.pos.x += (dx / d) * 3.2 * dt; e.pos.z += (dz / d) * 3.2 * dt;
        e.mesh.rotation.y = Math.atan2(dx, dz);
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 45) {
        e.shootTimer = 2.2 + rng() * 1.5;
        if (rng() < 0.45) onPlayerHit(6 + Math.floor(rng() * 8));
      }
    }
  }
  function clearEnemies() { for (const e of C.enemies) scene.remove(e.mesh); C.enemies = []; }
  C.spawnRivals = spawnRivals; C.shoot = shoot; C.update = update; C.clearEnemies = clearEnemies;
  return C;
}
