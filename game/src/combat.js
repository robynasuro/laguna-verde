// Combat: the pistol, rival crew enemies, shooting and getting shot. One
// job: fighting on foot.
import * as THREE from '../vendor/three.module.min.js';

const AIM_RANGE = 60;
const AIM_COS = 0.94;
const FIRE_INTERVAL = 0.28;
const ENEMY_HP = 3;

function makeRivalMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 1.05, 8),
    new THREE.MeshLambertMaterial({ color: 0x223344 }),
  );
  body.position.y = 1.0;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 1.78;
  g.add(head);
  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x8b2e2e }),
  );
  vest.position.set(0, 1.15, 0.2);
  g.add(vest);
  return g;
}

export function createCombat(scene, rng) {
  const C = { enemies: [], bullets: [], ammo: 24, lastShot: 0 };

  function spawnRivals(x, z, count) {
    for (let i = 0; i < count; i++) {
      const g = makeRivalMesh();
      g.position.set(x + (rng() - 0.5) * 14, 0, z + (rng() - 0.5) * 14);
      scene.add(g);
      C.enemies.push({ mesh: g, pos: g.position, hp: ENEMY_HP, shootTimer: 1 + rng() * 2 });
    }
  }

  // Nearest enemy inside a narrow cone of the aim direction, if any.
  function aimTarget(from, dir) {
    let best = null;
    let bestD = AIM_RANGE + 1;
    for (const e of C.enemies) {
      const dx = e.pos.x - from.x;
      const dz = e.pos.z - from.z;
      const d = Math.hypot(dx, dz);
      if (d > AIM_RANGE) continue;
      const dot = (dx * dir.x + dz * dir.z) / d;
      if (dot > AIM_COS && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  function shoot(from, dir, audio) {
    const now = performance.now() / 1000;
    // Fire rate cap, and an empty gun does nothing.
    if (now - C.lastShot < FIRE_INTERVAL || C.ammo <= 0) return false;
    C.lastShot = now;
    C.ammo -= 1;
    audio.shot();
    const target = aimTarget(from, dir);
    if (!target) return 'miss';
    target.hp -= 1;
    // The hit shoves the rival back a step.
    target.mesh.position.x += dir.x * 0.4;
    target.mesh.position.z += dir.z * 0.4;
    if (target.hp <= 0) {
      scene.remove(target.mesh);
      C.enemies.splice(C.enemies.indexOf(target), 1);
      return 'kill';
    }
    return 'hit';
  }

  function update(dt, playerPos, onPlayerHit) {
    for (const e of [...C.enemies]) {
      const dx = playerPos.x - e.pos.x;
      const dz = playerPos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.5) {
        e.pos.x += (dx / d) * 3.2 * dt;
        e.pos.z += (dz / d) * 3.2 * dt;
        e.mesh.rotation.y = Math.atan2(dx, dz);
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 45) {
        e.shootTimer = 2.2 + rng() * 1.5;
        // Rivals miss more often than they hit.
        if (rng() < 0.45) onPlayerHit(6 + Math.floor(rng() * 8));
      }
    }
  }

  function clearEnemies() {
    for (const e of C.enemies) scene.remove(e.mesh);
    C.enemies = [];
  }

  C.spawnRivals = spawnRivals;
  C.shoot = shoot;
  C.update = update;
  C.clearEnemies = clearEnemies;
  return C;
}
