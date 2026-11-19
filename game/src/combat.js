// Pistol combat on foot: shooting, enemies, muzzle flash, tracers.
// Enemies appear in the ambush (mission 2) and the garage defense (mission 6).

import * as THREE from 'three';
import { addWanted } from './police.js';
import { registerKill } from './missions.js';

export function createCombat(scene) {
  const group = new THREE.Group();
  scene.add(group);
  // Muzzle flash: a small bright plane that appears for one frame.
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.7),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
  group.add(flash);
  // Tracer line from the gun to the hit point.
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(),
  ]);
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }));
  group.add(tracer);
  return {
    group,
    flash,
    tracer,
    enemies: [],
    cooldown: 0,
    flashTimer: 0,
  };
}

function makeEnemyMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x1c1c1c }),
  );
  body.position.y = 1.1;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xc98f5f }),
  );
  head.position.y = 1.95;
  g.add(head);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x111111 }),
  );
  gun.position.set(0.3, 1.3, 0.4);
  g.add(gun);
  return g;
}

export function spawnEnemy(combat, scene, x, z) {
  const mesh = makeEnemyMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const e = { mesh, x, z, health: 60, shootTimer: 1.5 + Math.random() };
  combat.enemies.push(e);
  return e;
}

export function spawnAmbush(combat, ctx, count) {
  const px = ctx.player.x;
  const pz = ctx.player.z;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.7;
    spawnEnemy(combat, ctx.scene, px + Math.cos(a) * 16, pz + Math.sin(a) * 16);
  }
}

export function spawnDefenders(combat, ctx, count) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    spawnEnemy(combat, ctx.scene, 20 + Math.cos(a) * 22, 120 + Math.sin(a) * 22);
  }
}

// Fire the pistol from the camera toward the crosshair. Returns hit info.
export function shoot(combat, ctx) {
  if (combat.cooldown > 0) return null;
  combat.cooldown = 0.35;
  combat.flashTimer = 0.06;
  const cam = ctx.camera;
  const origin = cam.position.clone();
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  // Origin slightly below the camera so the tracer reads from the gun.
  origin.y -= 0.4;
  const from = origin.clone();
  let best = null;
  let bestD = 60;
  for (const e of combat.enemies) {
    // Sphere test against the enemy torso.
    const to = new THREE.Vector3(e.x - from.x, 1.2 - from.y, e.z - from.z);
    const along = to.dot(dir);
    if (along < 0 || along > bestD) continue;
    const closest = from.clone().add(dir.clone().multiplyScalar(along));
    const d = closest.distanceTo(new THREE.Vector3(e.x, 1.2, e.z));
    if (d < 1.1) {
      best = e;
      bestD = along;
    }
  }
  const end = from.clone().add(dir.clone().multiplyScalar(best ? bestD : 60));
  const pos = combat.tracer.geometry.attributes.position;
  pos.setXYZ(0, from.x, from.y, from.z);
  pos.setXYZ(1, end.x, end.y, end.z);
  pos.needsUpdate = true;
  combat.tracer.material.opacity = 0.9;
  combat.flash.position.copy(from).add(dir.clone().multiplyScalar(1.2));
  combat.flash.lookAt(cam.position);
  combat.flash.material.opacity = 1;
  ctx.audio.gunshot();
  if (best) {
    best.health -= 34;
    ctx.hud.showToast('Hit!');
    if (best.health <= 0) {
      removeEnemy(combat, ctx, best);
      registerKill(ctx.missions, ctx);
    }
  } else {
    // A loud shot in the city draws attention.
    addWanted(ctx.police, 0, 'gunfire');
    if (ctx.police.wanted === 0 && Math.random() < 0.3) addWanted(ctx.police, 1, 'gunfire');
  }
  return best;
}

export function removeEnemy(combat, ctx, e) {
  ctx.scene.remove(e.mesh);
  const i = combat.enemies.indexOf(e);
  if (i >= 0) combat.enemies.splice(i, 1);
}

export function updateCombat(combat, ctx, dt) {
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.flashTimer -= dt;
  if (combat.flashTimer <= 0) combat.flash.material.opacity = 0;
  combat.tracer.material.opacity = Math.max(0, combat.tracer.material.opacity - dt * 6);

  // Enemies walk toward the player and shoot with bad aim.
  const px = ctx.player.x;
  const pz = ctx.player.z;
  for (const e of [...combat.enemies]) {
    const dx = px - e.x;
    const dz = pz - e.z;
    const d = Math.hypot(dx, dz);
    if (d > 2.5) {
      e.x += (dx / d) * 3.4 * dt;
      e.z += (dz / d) * 3.4 * dt;
    }
    e.mesh.position.set(e.x, 0, e.z);
    e.mesh.rotation.y = Math.atan2(dx, dz);
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 26 && ctx.player.mode === 'foot') {
      e.shootTimer = 2.2 + Math.random() * 1.8;
      if (Math.random() < 0.3) {
        ctx.player.health -= 5;
        ctx.hud.flashDamage();
        ctx.audio.hit();
        if (ctx.player.health <= 0) {
          ctx.player.health = 0;
          ctx.onPlayerDown();
        }
      }
    }
  }
}
