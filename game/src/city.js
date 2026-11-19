// Laguna Verde in 3D. One job: turn the layout from world.js into
// meshes — ground, lagoon, roads, buildings, palms, the Ferris wheel,
// the lighthouse, the causeway, the marina — and hand back the
// colliders the physics needs and the landmarks the missions need.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng } from './random.js';

const PALETTE = {
  downtown: [0xe8dcc8, 0xd9c4a5, 0xc9b18c, 0xbfae9e, 0xe0cfa8],
  canal: [0xe2725b, 0xf2a541, 0x4fa8a0, 0x7fb069, 0xe9c46a, 0xef8354, 0x6d9dc5],
  villas: [0xf5e6c8, 0xffe8d6, 0xfff1e0, 0xf3d9b0],
  marina: [0xdfe9e6, 0xcfe0d8, 0xe8e2d0],
};

function windowTexture(base, lit) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  const rng = makeRng(7);
  for (let y = 8; y < 120; y += 14) {
    for (let x = 6; x < 58; x += 12) {
      g.fillStyle = rng.next() < lit ? '#ffd98a' : '#2c3e50';
      g.fillRect(x, y, 8, 9);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, layout, rng) {
  const colliders = [];
  const animated = { wheel: null, beacon: null, water: null, boats: [] };
  const addCollider = (x, z, hw, hd) => colliders.push({ x, z, hw, hd });

  const lambert = (color) => new THREE.MeshLambertMaterial({ color });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);

  function box(x, y, z, w, h, d, mat, parent) {
    const m = new THREE.Mesh(boxGeo, mat);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    (parent || scene).add(m);
    return m;
  }

  // Ground: warm sand-toned land; the lagoon is a separate water plane.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(820, 820),
    lambert(0xcdb98a),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Lagoon water, west of the city, turquoise and slightly transparent.
  const waterMat = new THREE.MeshLambertMaterial({
    color: CONFIG.waterColor,
    transparent: true,
    opacity: 0.92,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 820), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-330, 0.15, 0);
  scene.add(water);
  animated.water = water;
  // The marina cove.
  const cove = new THREE.Mesh(new THREE.PlaneGeometry(90, 130), waterMat);
  cove.rotation.x = -Math.PI / 2;
  cove.position.set(-235, 0.15, 160);
  scene.add(cove);

  // Beach strip along the lagoon shore and the east coast.
  const sandMat = lambert(0xe8d9a8);
  box(-258, 0.15, 0, 8, 0.3, 820, sandMat);
  box(396, 0.15, 0, 8, 0.3, 820, sandMat);

  // Roads: dark asphalt strips over the grid, plus the causeway deck.
  const roadMat = lambert(0x3a3a40);
  for (const c of layout.grid) {
    box(c, 0.2, 0, CONFIG.roadWidth, 0.1, 500, roadMat);
    box(0, 0.2, c, 500, 0.1, CONFIG.roadWidth, roadMat);
  }
  // Centre dashes, cheap and cheerful.
  const dashMat = lambert(0xd8d8c8);
  for (const c of layout.grid) {
    for (let t = -240; t <= 240; t += 16) {
      box(c, 0.28, t, 0.5, 0.05, 5, dashMat);
      box(t, 0.28, c, 5, 0.05, 0.5, dashMat);
    }
  }
  // Causeway deck across the lagoon: a low strip just above the water,
  // so a car driving it sits on the deck, not inside it.
  box(-315, 0.05, -80, 155, 0.3, layout.causeway.width, lambert(0x8a7f70));
  for (let x = -380; x < -240; x += 12) {
    box(x, 1.1, -86, 0.6, 2.0, 0.6, lambert(0x5a5248));
    box(x, 1.1, -74, 0.6, 2.0, 0.6, lambert(0x5a5248));
  }

  // Buildings, one block at a time. Downtown towers get lit windows.
  // No tower on a block a named landmark stands on: the garage, the
  // hotel, the market, Casa Azul and the Sharks' den need clear ground.
  const keepClear = [
    layout.landmarks.garage, layout.landmarks.hotel, layout.landmarks.market,
    layout.landmarks.canalHouse, layout.landmarks.sharksDen,
  ];
  const downtownTex = windowTexture('#cbb894', 0.45);
  const towerMat = new THREE.MeshLambertMaterial({ map: downtownTex });
  const roofMat = lambert(0x6b5a48);
  let placed = 0;
  for (let x = -240; x <= 240; x += 80) {
    for (let z = -240; z <= 240; z += 80) {
      if (Math.abs(x) < 40 && Math.abs(z) < 40) continue; // the plaza
      if (keepClear.some((lm) => Math.hypot(x - lm.x, z - lm.z) < 42)) continue;
      if (rng.next() < 0.18) continue; // a park or a parking lot
      const w = rng.range(22, 34);
      const d = rng.range(22, 34);
      const h = rng.range(18, 64);
      const bx = x + rng.range(-8, 8);
      const bz = z + rng.range(-8, 8);
      const b = box(bx, h / 2, bz, w, h, d, towerMat);
      b.material = towerMat;
      box(bx, h + 0.4, bz, w * 0.7, 0.8, d * 0.7, roofMat);
      addCollider(bx, bz, w / 2 + 1, d / 2 + 1);
      placed++;
    }
  }

  // The plaza: a fountain and benches in the middle of downtown.
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 2, 16), lambert(0x9fc8d8));
  fountain.position.set(0, 1, 0);
  scene.add(fountain);

  // Canal district: small colourful houses in rows.
  for (let i = 0; i < 26; i++) {
    const x = rng.range(-200, 40);
    const z = rng.range(150, 290);
    if (layout.isWater(x, z)) continue;
    const color = rng.pick(PALETTE.canal);
    const w = rng.range(10, 16);
    const d = rng.range(10, 16);
    const h = rng.range(7, 13);
    box(x, h / 2, z, w, h, d, lambert(color));
    box(x, h + 1, z, w * 0.6, 2, d * 0.6, lambert(0x8a4b3a)); // roof
    addCollider(x, z, w / 2 + 1, d / 2 + 1);
  }

  // Villa hill: pale villas with red roofs.
  for (let i = 0; i < 16; i++) {
    const x = rng.range(-40, 220);
    const z = rng.range(-380, -240);
    const color = rng.pick(PALETTE.villas);
    const w = rng.range(14, 22);
    const d = rng.range(12, 18);
    const h = rng.range(8, 12);
    box(x, h / 2, z, w, h, d, lambert(color));
    box(x, h + 1.2, z, w * 0.7, 2.4, d * 0.7, lambert(0xb4552d));
    addCollider(x, z, w / 2 + 1, d / 2 + 1);
  }

  // Marina: low white sheds and docks, boats bobbing in the cove.
  for (let i = 0; i < 8; i++) {
    const x = -260 + rng.range(0, 50);
    const z = 110 + i * 14;
    box(x, 3, z, 16, 6, 10, lambert(rng.pick(PALETTE.marina)));
    addCollider(x, z, 9, 6);
  }
  const boatMat = lambert(0xf2f2ee);
  const hullMat = lambert(0x2e5f7a);
  for (let i = 0; i < 6; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(boxGeo, hullMat);
    hull.scale.set(3, 1.2, 9);
    const deck = new THREE.Mesh(boxGeo, boatMat);
    deck.scale.set(2.4, 0.8, 7);
    deck.position.y = 0.9;
    const mast = new THREE.Mesh(cylGeo, lambert(0x8a7a5a));
    mast.scale.set(0.15, 7, 0.15);
    mast.position.y = 4;
    boat.add(hull, deck, mast);
    boat.position.set(-222 - i * 6, 0.6, 120 + i * 16);
    boat.rotation.y = rng.range(-0.3, 0.3);
    scene.add(boat);
    animated.boats.push(boat);
  }

  // Boardwalk: wooden deck along the east beach, with the Ferris wheel.
  const boardMat = lambert(0x9a7a52);
  box(300, 0.5, 0, 14, 0.6, 560, boardMat);
  // The Ferris wheel: rim, spokes, gondolas, two support legs.
  const wheel = new THREE.Group();
  const rimMat = lambert(0xe2725b);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(22, 0.9, 8, 32), rimMat);
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(boxGeo, rimMat);
    spoke.scale.set(0.7, 43, 0.7);
    spoke.position.set(Math.cos(a) * 10.5, Math.sin(a) * 10.5, 0);
    spoke.rotation.z = a + Math.PI / 2;
    wheel.add(spoke);
    const gondola = new THREE.Mesh(boxGeo, lambert(0xf2a541));
    gondola.scale.set(3, 3, 3);
    gondola.position.set(Math.cos(a) * 22, Math.sin(a) * 22, 0);
    wheel.add(gondola);
  }
  wheel.position.set(312, 26, 40);
  scene.add(wheel);
  animated.wheel = wheel;
  const legMat = lambert(0x5a5248);
  const legL = new THREE.Mesh(cylGeo, legMat);
  legL.scale.set(1, 26, 1);
  legL.position.set(306, 13, 40);
  legL.rotation.z = 0.3;
  const legR = legL.clone();
  legR.position.set(318, 13, 40);
  legR.rotation.z = -0.3;
  scene.add(legL, legR);
  addCollider(312, 40, 6, 6);

  // The lighthouse on the point: white tower, red top, rotating beam.
  const lh = layout.landmarks.lighthouse;
  const tower = new THREE.Mesh(cylGeo, lambert(0xf5f2e8));
  tower.scale.set(5, 34, 5);
  tower.position.set(lh.x, 17, lh.z);
  scene.add(tower);
  const top = new THREE.Mesh(cylGeo, lambert(0xc0392b));
  top.scale.set(5.6, 4, 5.6);
  top.position.set(lh.x, 35, lh.z);
  scene.add(top);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  lamp.position.set(lh.x, 38, lh.z);
  scene.add(lamp);
  const beam = new THREE.Group();
  const beamMesh = new THREE.Mesh(
    new THREE.ConeGeometry(6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    }),
  );
  beamMesh.rotation.z = Math.PI / 2;
  beamMesh.position.x = 30;
  beam.add(beamMesh);
  beam.position.set(lh.x, 38, lh.z);
  scene.add(beam);
  animated.beacon = beam;
  addCollider(lh.x, lh.z, 7, 7);

  // Garage del Sol: the player's home base, a big yellow workshop.
  const g = layout.landmarks.garage;
  box(g.x, 5, g.z, 30, 10, 20, lambert(0xf2a541));
  box(g.x, 10.6, g.z, 32, 1.2, 22, lambert(0x8a4b3a));
  addCollider(g.x, g.z, 16, 11);

  // Hotel Brisa, Mercado Verde, Casa Azul, Villa Miramar, the Sharks' den.
  const named = [
    [layout.landmarks.hotel, 0xe8dcc8, 26, 22, 16],
    [layout.landmarks.market, 0xd9a05b, 24, 10, 18],
    [layout.landmarks.canalHouse, 0x4fa8a0, 14, 9, 12],
    [layout.landmarks.villa, 0xfff1e0, 20, 10, 16],
    [layout.landmarks.sharksDen, 0x5a5a66, 22, 12, 16],
  ];
  for (const [lm, color, w, h, d] of named) {
    box(lm.x, h / 2, lm.z, w, h, d, lambert(color));
    addCollider(lm.x, lm.z, w / 2 + 1, d / 2 + 1);
  }

  // Palms along the roads and the boardwalk.
  const trunkMat = lambert(0x7a5a38);
  const leafMat = lambert(0x3f8f4f);
  for (let i = 0; i < 44; i++) {
    const onBoardwalk = i % 2 === 0;
    const x = onBoardwalk ? 296 + rng.range(-3, 3) : rng.range(-240, 240);
    const z = onBoardwalk ? rng.range(-270, 270) : rng.pick(layout.grid) + rng.range(-16, 16);
    if (layout.isWater(x, z)) continue;
    const trunk = new THREE.Mesh(cylGeo, trunkMat);
    trunk.scale.set(0.35, 7, 0.35);
    trunk.position.set(x, 3.5, z);
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 4.5, 7),
      leafMat,
    );
    leaves.position.set(x, 8.4, z);
    scene.add(trunk, leaves);
  }

  // Street lamps along the main streets.
  const lampMat = lambert(0x3a3a40);
  for (const c of [-160, 0, 160]) {
    for (let t = -200; t <= 200; t += 80) {
      const pole = new THREE.Mesh(cylGeo, lampMat);
      pole.scale.set(0.2, 6, 0.2);
      pole.position.set(c + 7, 3, t);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
      );
      head.position.set(c + 7, 6.2, t);
      scene.add(pole, head);
    }
  }

  function update(dt, t) {
    if (animated.wheel) animated.wheel.rotation.z = t * 0.12;
    if (animated.beacon) animated.beacon.rotation.y = t * 0.5;
    if (animated.water) {
      animated.water.material.opacity = 0.88 + Math.sin(t * 0.6) * 0.04;
    }
    for (let i = 0; i < animated.boats.length; i++) {
      animated.boats[i].position.y = 0.6 + Math.sin(t * 0.8 + i) * 0.25;
      animated.boats[i].rotation.z = Math.sin(t * 0.5 + i * 2) * 0.03;
    }
  }

  return { colliders, update, placed };
}
