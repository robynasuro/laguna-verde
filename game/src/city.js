// City generation for Laguna Verde: roads, buildings, lagoon, causeway, pier,
// Ferris wheel, lighthouse, marina, palms, canal houses, villas. One job: build the
// static city and hand back its colliders, road graph and landmark positions.
import * as THREE from '../vendor/three.module.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const WORLD = {
  bound: 260, lagoonX: -150,
  roadsX: [-120, -60, 0, 60, 120, 180],
  roadsZ: [-180, -120, -60, 0, 60, 120, 180],
  roadW: 12,
  garage: { x: -132, z: 66 },
  garageFront: { x: -132, z: 84 }, // open ground just south of the garage, where jobs start
  pier: { x: -195, z: 0 },
  lighthouse: { x: -228, z: -185 },
  marina: { x: -185, z: 100 },
};

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}

export function buildCity(scene, rng) {
  const colliders = []; // {x0,z0,x1,z1}
  const group = new THREE.Group(); scene.add(group);
  const addCollider = (x, z, hw, hd) => colliders.push({ x0: x - hw, z0: z - hd, x1: x + hw, z1: z + hd });

  // Ground: land slab east of the lagoon, sand beach strip, lagoon water west.
  const land = new THREE.Mesh(new THREE.PlaneGeometry(420, 540), new THREE.MeshLambertMaterial({ color: 0x8a7a5a }));
  land.rotation.x = -Math.PI / 2; land.position.set(60, 0, 0); land.receiveShadow = true; group.add(land);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(24, 540), new THREE.MeshLambertMaterial({ color: 0xe8d49a }));
  beach.rotation.x = -Math.PI / 2; beach.position.set(-138, 0.05, 0); beach.receiveShadow = true; group.add(beach);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 560), new THREE.MeshLambertMaterial({ color: 0x1fa8b8, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(-260, 0.1, 0); group.add(water);
  const water2 = new THREE.Mesh(new THREE.PlaneGeometry(420, 60), new THREE.MeshLambertMaterial({ color: 0x1fa8b8, transparent: true, opacity: 0.92 }));
  water2.rotation.x = -Math.PI / 2; water2.position.set(60, 0.1, -280); group.add(water2);

  // Roads: asphalt strips on the grid, plus the causeway bridge over the lagoon.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  for (const x of WORLD.roadsX) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadW, 520), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.08, 0); r.receiveShadow = true; group.add(r);
  }
  for (const z of WORLD.roadsZ) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(420, WORLD.roadW), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(50, 0.08, z); r.receiveShadow = true; group.add(r);
  }
  // Causeway: bridge deck across the lagoon at z=0, with rails.
  const deck = box(120, 1.2, 16, 0x9a8f7a, -205, 0.6, 0);
  group.add(deck);
  group.add(box(120, 1, 1, 0xd8d0c0, -205, 1.6, -8));
  group.add(box(120, 1, 1, 0xd8d0c0, -205, 1.6, 8));
  // Pier deck into the lagoon at z=0, boardwalk along the shore.
  const pier = box(70, 1, 18, 0xb98a5a, -182, 0.7, 0); group.add(pier);
  const walk = box(16, 0.6, 300, 0xc9a06a, -146, 0.4, 0); group.add(walk);

  // Buildings: downtown blocks between roads. Warm pastel palette, varied heights.
  const palette = [0xffd9a0, 0xffb37a, 0xf28b82, 0x8ecae6, 0x90be6d, 0xf9c74f, 0xe07a5f, 0xfff3b0, 0xa8dadc, 0xe5989b];
  const blocks = [];
  for (const x of WORLD.roadsX) for (const z of WORLD.roadsZ) {
    const cx = x + 30, cz = z + 30;
    if (cx > 200 || cz > 210 || cx < -140) continue;
    blocks.push([cx, cz]);
  }
  for (const [cx, cz] of blocks) {
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const bx = cx + (rng() - 0.5) * 26, bz = cz + (rng() - 0.5) * 26;
      const w = 12 + rng() * 12, d = 12 + rng() * 12;
      const h = 8 + rng() * rng() * 42;
      const color = palette[Math.floor(rng() * palette.length)];
      const b = box(w, h, d, color, bx, h / 2, bz);
      group.add(b);
      // Roof trim + lit windows strip near the top.
      group.add(box(w + 0.6, 0.8, d + 0.6, 0xffffff, bx, h + 0.3, bz));
      addCollider(bx, bz, w / 2 + 0.5, d / 2 + 0.5);
    }
  }
  // Canal district: low colorful houses south, z 140..230.
  for (let i = 0; i < 26; i++) {
    const x = -120 + rng() * 300, z = 200 + rng() * 40;
    const w = 10 + rng() * 8, h = 6 + rng() * 6, d = 9 + rng() * 6;
    const c = palette[Math.floor(rng() * palette.length)];
    group.add(box(w, h, d, c, x, h / 2, z));
    group.add(box(w + 1, 1, d + 1, 0x8b2e2e, x, h + 0.5, z));
    addCollider(x, z, w / 2 + 0.5, d / 2 + 0.5);
  }
  // Hillside villas north-east.
  for (let i = 0; i < 14; i++) {
    const x = 150 + rng() * 80, z = -230 + rng() * 70;
    const w = 14 + rng() * 8, h = 7 + rng() * 5, d = 12 + rng() * 6;
    group.add(box(w, h, d, 0xfff1cf, x, h / 2, z));
    group.add(box(w + 1, 1.2, d + 1, 0xc96f4a, x, h + 0.6, z));
    addCollider(x, z, w / 2 + 0.5, d / 2 + 0.5);
  }

  // Garage del Sol: Carmen's garage, big sign, open front, two parked cars outside.
  const gx = WORLD.garage.x, gz = WORLD.garage.z;
  group.add(box(26, 9, 18, 0xff9f2e, gx, 4.5, gz));
  group.add(box(26.5, 2, 18.5, 0x1a2a33, gx, 9.5, gz));
  const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 96;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#1a2a33'; sctx.fillRect(0, 0, 512, 96);
  sctx.fillStyle = '#ffd23e'; sctx.font = 'bold 52px Verdana, sans-serif'; sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
  sctx.fillText('GARAGE DEL SOL', 256, 52);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(22, 4.1), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(gx, 7.2, gz + 9.2); group.add(sign);
  addCollider(gx, gz, 13.5, 9.5);

  // Ferris wheel on the pier: rim, spokes, cabins, support legs. Rotates in render.
  const wheel = new THREE.Group(); wheel.position.set(WORLD.pier.x, 22, WORLD.pier.z); group.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 0.7, 8, 40), new THREE.MeshLambertMaterial({ color: 0xff5d8f }));
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 16, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    spoke.rotation.z = a + Math.PI / 2; spoke.position.set(Math.cos(a) * 0, Math.sin(a) * 0, 0);
    spoke.position.set(0, 0, 0); spoke.rotation.z = a; spoke.translateY(8);
    wheel.add(spoke);
    const cab = box(3, 2.4, 2.4, [0xffd23e, 0x3ec6ff, 0xff7a3e, 0x7dff8a][i % 4], Math.cos(a) * 16, Math.sin(a) * 16, 0);
    wheel.add(cab);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  hub.rotation.x = Math.PI / 2; wheel.add(hub);
  const legL = box(1.2, 24, 1.2, 0xffffff, WORLD.pier.x - 6, 11, WORLD.pier.z);
  const legR = box(1.2, 24, 1.2, 0xffffff, WORLD.pier.x + 6, 11, WORLD.pier.z);
  legL.rotation.z = 0.35; legR.rotation.z = -0.35; group.add(legL); group.add(legR);

  // Lighthouse on the point, striped tower with a light room.
  const lx = WORLD.lighthouse.x, lz = WORLD.lighthouse.z;
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 4, 10), new THREE.MeshLambertMaterial({ color: 0x6b7c85 }));
  rock.position.set(lx, 2, lz); group.add(rock);
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(3.4 - i * 0.25, 3.8 - i * 0.25, 5, 12),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xe63946 : 0xffffff }));
    seg.position.set(lx, 6 + i * 5, lz); seg.castShadow = true; group.add(seg);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff2a0 }));
  lamp.position.set(lx, 32, lz); group.add(lamp);

  // Marina boats: hulls bobbing in the lagoon.
  const boats = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 12), new THREE.MeshLambertMaterial({ color: [0xffffff, 0xffd23e, 0x3ec6ff][i % 3] }));
    hull.position.y = 0.4; b.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 6), new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
    mast.position.y = 4.5; b.add(mast);
    b.position.set(-175 - rng() * 45, 0.4, 55 + i * 14);
    b.rotation.y = rng() * 0.6;
    group.add(b); boats.push(b);
  }

  // Palm trees along the boardwalk, the causeway and the roads.
  const palms = [];
  const palmAt = (x, z) => {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 7), new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
    trunk.position.y = 3.5; trunk.rotation.z = (rng() - 0.5) * 0.15; p.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 4), new THREE.MeshLambertMaterial({ color: 0x2e9e5b }));
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      leaf.rotation.z = Math.cos(a) * 1.1; leaf.rotation.x = -Math.sin(a) * 1.1;
      p.add(leaf);
    }
    p.position.set(x, 0, z); group.add(p); palms.push(p);
  };
  for (let z = -200; z <= 200; z += 40) { palmAt(-143, z); palmAt(-158, z + 20); }
  for (const x of WORLD.roadsX) for (const z of [-150, -30, 90, 210]) palmAt(x + 9, z);
  for (let i = 0; i < 10; i++) palmAt(-120 + rng() * 320, -240 + rng() * 20);

  // Street lights along main roads (poles only; glow sprites added by render).
  const lampPosts = [];
  for (const x of WORLD.roadsX) for (const z of WORLD.roadsZ) {
    if ((x + z) % 120 !== 0) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), new THREE.MeshLambertMaterial({ color: 0x2a2f33 }));
    pole.position.set(x + 7, 3.5, z + 7); group.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    head.position.set(x + 7, 7.1, z + 7); group.add(head); lampPosts.push(head);
  }

  // Road graph: intersections, for traffic and pedestrians.
  const nodes = [];
  for (const x of WORLD.roadsX) for (const z of WORLD.roadsZ) nodes.push({ x, z });
  return { group, colliders, wheel, boats, lampPosts, nodes, water };
}

// Circle vs building colliders. Returns corrected position.
export function collide(pos, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(pos.x, c.x1));
    const nz = Math.max(c.z0, Math.min(pos.z, c.z1));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius; pos.z = nz + (dz / d) * radius;
      } else {
        pos.x = c.x1 + radius;
      }
    }
  }
  return pos;
}
// Is this point on land (not lagoon water)? Causeway, pier and lighthouse rock count as land.
// Height of the raised causeway / pier deck under a point (1.2 on the decks, else 0).
export function deckHeight(x, z) {
  if (x < WORLD.lagoonX && Math.abs(z) < 9 && x >= -262) return 1.2;
  return 0;
}
export function onLand(x, z) {
  if (x >= WORLD.lagoonX) return true;
  if (Math.abs(z) < 8 && x >= -262) return true; // causeway + pier
  const dx = x - WORLD.lighthouse.x, dz = z - WORLD.lighthouse.z;
  if (dx * dx + dz * dz < 20 * 20) return true;
  return false;
}
export function clampToLand(pos, radius) {
  if (!onLand(pos.x, pos.z)) {
    // Push back toward land: east if in open water, or toward the causeway strip.
    if (Math.abs(pos.z) < 30) pos.z = Math.max(-7 + radius, Math.min(7 - radius, pos.z));
    else pos.x = Math.max(WORLD.lagoonX + radius, pos.x);
  }
  pos.x = Math.max(-258, Math.min(258, pos.x));
  pos.z = Math.max(-258, Math.min(258, pos.z));
  return pos;
}
