// Pedestrians: people walking the sidewalks, who run when something fast
// or loud comes at them. One job: make the sidewalks feel lived in.
import * as THREE from '../vendor/three.module.min.js';

const SHIRTS = [0xff8fa3, 0x8ecae6, 0xffd23e, 0x90be6d, 0xf28b82, 0xbdb2ff, 0xffffff, 0xff9f2e];
const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a3b];

function makePedMesh(shirt, skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  body.position.y = 1.0;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: skin }),
  );
  head.position.y = 1.75;
  g.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f33 });
  for (const sx of [-0.14, 0.14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), legMat);
    leg.position.set(sx, 0.3, 0);
    g.add(leg);
  }
  return g;
}

export function createPedestrians(scene, nodes, rng) {
  const peds = [];

  function randomSpot() {
    const n = nodes[Math.floor(rng() * nodes.length)];
    return { x: n.x + (rng() - 0.5) * 10, z: n.z + (rng() - 0.5) * 10 };
  }

  for (let i = 0; i < 24; i++) {
    const shirt = SHIRTS[Math.floor(rng() * SHIRTS.length)];
    const g = makePedMesh(shirt, SKINS[i % SKINS.length]);
    const spot = randomSpot();
    g.position.set(spot.x, 0, spot.z);
    scene.add(g);
    peds.push({
      mesh: g,
      pos: g.position,
      target: randomSpot(),
      speed: 1.2 + rng() * 0.9,
      scared: 0,
      phase: rng() * 6,
    });
  }

  function update(dt, time, dangerPos, dangerRadius) {
    for (const p of peds) {
      let tx = p.target.x;
      let tz = p.target.z;
      let spd = p.speed;
      if (dangerPos) {
        const d = Math.hypot(p.pos.x - dangerPos.x, p.pos.z - dangerPos.z);
        if (d < dangerRadius) {
          // Run straight away from whatever scared them.
          p.scared = 2;
          tx = p.pos.x + (p.pos.x - dangerPos.x);
          tz = p.pos.z + (p.pos.z - dangerPos.z);
          spd = 4.5;
        }
      }
      if (p.scared > 0) p.scared -= dt;
      const dx = tx - p.pos.x;
      const dz = tz - p.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        p.target = randomSpot();
        continue;
      }
      p.pos.x += (dx / dist) * spd * dt;
      p.pos.z += (dz / dist) * spd * dt;
      p.mesh.rotation.y = Math.atan2(dx, dz);
      // Walk bob and swinging legs.
      p.phase += dt * spd * 3;
      p.mesh.position.y = Math.abs(Math.sin(p.phase)) * 0.06;
      p.mesh.children[2].rotation.x = Math.sin(p.phase) * 0.5;
      p.mesh.children[3].rotation.x = -Math.sin(p.phase) * 0.5;
    }
  }

  return { peds, update };
}
