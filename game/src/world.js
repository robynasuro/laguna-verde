// Laguna Verde itself: the road graph, the lagoon, the causeway, the
// boardwalk, downtown, the canal houses, the villas, the marina, the
// Ferris wheel and the lighthouse. Everything is placed from the seeded
// RNG, so the city is the same every time a seed is given.

import * as THREE from 'three';

const PALETTE = [
  0xf2e3c6, 0xe8b4a0, 0xf7d774, 0x9fc5d8, 0xd98a7a, 0x8fb8a4,
  0xe5c07b, 0xc9a0dc, 0x7fb069, 0xe07a5f, 0x81b29a, 0xf4a261,
];
const CANAL_COLORS = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff9f45, 0x9b5de5];

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

function cyl(rt, rb, h, color, x, y, z, seg = 10) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

export function buildWorld(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);

  // --- Ground: sand and grass. The mainland only: the lagoon stays open
  // water, so the turquoise shows beside the causeway and under the boats.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 260),
    new THREE.MeshLambertMaterial({ color: 0x9db98a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(10, -0.05, 70);
  group.add(ground);
  // Boardwalk shore strip and the lighthouse point, so the pier and the
  // lighthouse stand on land instead of floating on the water.
  const sandMat = new THREE.MeshLambertMaterial({ color: 0xd8c49a });
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(220, 26), sandMat);
  shore.rotation.x = -Math.PI / 2;
  shore.position.set(0, -0.05, -240);
  group.add(shore);
  const point = new THREE.Mesh(new THREE.CircleGeometry(17, 20), sandMat);
  point.rotation.x = -Math.PI / 2;
  point.position.set(150, -0.05, -245);
  group.add(point);

  // --- Lagoon water: turquoise plane south of downtown. ---
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 205),
    new THREE.MeshLambertMaterial({
      color: 0x2fb3c9,
      transparent: true,
      opacity: 0.88,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(10, -0.35, -160);
  water.name = 'lagoon';
  group.add(water);

  // --- Road graph. Nodes are intersections; edges are drivable streets. ---
  const nodes = [];
  const nodeByKey = new Map();
  const edges = [];
  function addNode(x, z) {
    const key = `${x},${z}`;
    if (nodeByKey.has(key)) return nodeByKey.get(key);
    const n = { id: nodes.length, x, z, links: [] };
    nodes.push(n);
    nodeByKey.set(key, n);
    return n;
  }
  function link(a, b) {
    if (a === b) return;
    if (!a.links.includes(b.id)) a.links.push(b.id);
    if (!b.links.includes(a.id)) b.links.push(a.id);
    edges.push([a, b]);
  }

  const gridX = [-150, -100, -50, 0, 50, 100, 150];
  const gridZ = [-60, -20, 20, 60, 100, 140, 180];
  for (const x of gridX) {
    for (const z of gridZ) addNode(x, z);
  }
  for (const x of gridX) {
    for (let i = 0; i < gridZ.length - 1; i++) {
      link(addNode(x, gridZ[i]), addNode(x, gridZ[i + 1]));
    }
  }
  for (const z of gridZ) {
    for (let i = 0; i < gridX.length - 1; i++) {
      link(addNode(gridX[i], z), addNode(gridX[i + 1], z));
    }
  }
  // Causeway spine across the lagoon (x = 0) and the boardwalk (z = -240).
  let prev = addNode(0, -60);
  for (const z of [-100, -140, -180, -220, -240]) {
    const n = addNode(0, z);
    link(prev, n);
    prev = n;
  }
  const bwX = [-120, -60, 0, 60, 120, 150];
  prev = null;
  for (const x of bwX) {
    const n = addNode(x, -240);
    if (prev) link(prev, n);
    prev = n;
  }
  // West and east shore roads down to downtown.
  link(addNode(-120, -240), addNode(-120, -140));
  link(addNode(-120, -140), addNode(-120, -60));
  link(addNode(-120, -60), addNode(-100, -60));
  link(addNode(-120, -60), addNode(-150, -60));
  link(addNode(120, -240), addNode(120, -140));
  link(addNode(120, -140), addNode(120, -60));
  link(addNode(120, -60), addNode(100, -60));
  link(addNode(120, -60), addNode(150, -60));
  // Hillside villas road.
  link(addNode(150, 60), addNode(200, 60));
  link(addNode(150, 120), addNode(200, 120));
  link(addNode(150, 180), addNode(200, 180));
  link(addNode(200, 60), addNode(200, 120));
  link(addNode(200, 120), addNode(200, 180));

  // --- Road surfaces: dark strips along every edge, with a pale center. ---
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xd8d2c0 });
  for (const [a, b] of edges) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const angle = Math.atan2(dx, dz);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(9, len), roadMat);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = angle;
    strip.position.set(midX, 0.02, midZ);
    group.add(strip);
    // Dashed center line, one dash every 8 units.
    const dashes = Math.floor(len / 8);
    for (let i = 0; i < dashes; i++) {
      if (i % 2 === 0) continue;
      const t = (i + 0.5) / dashes;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.4), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = angle;
      dash.position.set(a.x + dx * t, 0.04, a.z + dz * t);
      group.add(dash);
    }
  }

  // --- Buildings. Downtown blocks get towers; canal houses get color;
  // villas sit on the hill road. Every building registers a collider. ---
  const colliders = [];
  function addBuilding(x, z, w, d, h, color) {
    const m = box(w, h, d, color, x, h / 2, z);
    group.add(m);
    // A lighter roof cap so blocks read at a distance.
    const cap = box(w * 0.7, 0.6, d * 0.7, 0xf5efe0, x, h + 0.3, z);
    group.add(cap);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return m;
  }

  // Downtown blocks: between the grid lines, one or two buildings each.
  for (let gx = 0; gx < gridX.length - 1; gx++) {
    for (let gz = 0; gz < gridZ.length - 1; gz++) {
      const cx = (gridX[gx] + gridX[gx + 1]) / 2;
      const cz = (gridZ[gz] + gridZ[gz + 1]) / 2;
      // Keep the garage lot and the plaza clear.
      if (Math.hypot(cx - 20, cz - 120) < 26) continue;
      if (Math.hypot(cx + 60, cz - 60) < 22) continue;
      const n = rng.int(1, 2);
      for (let i = 0; i < n; i++) {
        const w = rng.range(10, 18);
        const d = rng.range(10, 16);
        const h = rng.range(7, 34);
        const x = cx + rng.range(-8, 8) + (i === 1 ? 12 : -6);
        const z = cz + rng.range(-6, 6) + (i === 1 ? -6 : 6);
        addBuilding(x, z, w, d, h, rng.pick(PALETTE));
      }
    }
  }
  // Canal district: small bright houses west of downtown.
  for (let i = 0; i < 10; i++) {
    const x = rng.range(-148, -105);
    const z = rng.range(-40, 170);
    if (Math.hypot(x - 20, z - 120) < 26) continue;
    addBuilding(x, z, rng.range(7, 10), rng.range(7, 10), rng.range(5, 9), rng.pick(CANAL_COLORS));
  }
  // Hillside villas: bigger pale houses on the east hill road.
  for (let i = 0; i < 8; i++) {
    const x = rng.range(185, 215);
    const z = rng.range(50, 185);
    addBuilding(x, z, rng.range(11, 15), rng.range(11, 15), rng.range(6, 11), 0xf5efe0);
  }

  // --- Garage del Sol: Carmen's garage, the home base. ---
  const garage = new THREE.Group();
  const gBase = box(22, 7, 14, 0xe8b04b, 20, 3.5, 120);
  garage.add(gBase);
  const gDoor = box(14, 5, 0.6, 0x5a6b7a, 20, 2.5, 112.8);
  garage.add(gDoor);
  const gSign = box(20, 2, 0.6, 0x2e4a3a, 20, 8, 112.8);
  garage.add(gSign);
  const gRoof = box(24, 0.8, 16, 0x8a5a2b, 20, 7.4, 120);
  garage.add(gRoof);
  group.add(garage);
  colliders.push({ minX: 9, maxX: 31, minZ: 113, maxZ: 127 });

  // --- Marina: boats on the lagoon east of the causeway. ---
  const boats = [];
  for (let i = 0; i < 6; i++) {
    const bx = 45 + i * 14;
    const bz = -175 - (i % 2) * 22;
    const boat = new THREE.Group();
    const hull = box(4, 1.4, 9, rng.pick([0xffffff, 0x2e6f8e, 0xd94f3d]), 0, 0.4, 0);
    boat.add(hull);
    const mast = cyl(0.12, 0.12, 7, 0x6b4a2b, 0, 4, 0);
    boat.add(mast);
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 5),
      new THREE.MeshLambertMaterial({ color: 0xfff2cc, side: THREE.DoubleSide }),
    );
    sail.position.set(0, 4, 1.2);
    boat.add(sail);
    boat.position.set(bx, -0.1, bz);
    boat.rotation.y = rng.range(-0.4, 0.4);
    group.add(boat);
    boats.push(boat);
  }

  // --- Boardwalk pier + Ferris wheel. ---
  const pier = box(150, 1.2, 12, 0x8a6a44, 0, 0.4, -240);
  group.add(pier);
  const wheel = new THREE.Group();
  wheel.position.set(-60, 16, -244);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(13, 0.5, 8, 28),
    new THREE.MeshLambertMaterial({ color: 0xff5d8f }),
  );
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 26, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xfff2cc }),
    );
    spoke.position.set(0, 0, 0);
    spoke.rotation.z = a;
    wheel.add(spoke);
    const cabin = box(2.6, 2.2, 2.2, rng.pick([0xffd93d, 0x6bcb77, 0x4d96ff, 0xff6b6b]), Math.cos(a) * 13, Math.sin(a) * 13, 0);
    wheel.add(cabin);
  }
  const legL = box(1, 16, 1, 0x5a4a3a, -66, 8, -244);
  const legR = box(1, 16, 1, 0x5a4a3a, -54, 8, -244);
  group.add(legL);
  group.add(legR);
  group.add(wheel);

  // --- Lighthouse on the point, east end of the boardwalk. ---
  const lighthouse = new THREE.Group();
  lighthouse.position.set(150, 0, -245);
  const lhBase = cyl(4.5, 5.5, 3, 0x8a8a8a, 0, 1.5, 0, 12);
  lighthouse.add(lhBase);
  for (let i = 0; i < 4; i++) {
    const seg = cyl(3.4 - i * 0.25, 3.6 - i * 0.25, 6, i % 2 === 0 ? 0xffffff : 0xd94f3d, 0, 6 + i * 6, 0, 12);
    lighthouse.add(seg);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffd76a }),
  );
  lamp.position.set(0, 28, 0);
  lighthouse.add(lamp);
  group.add(lighthouse);
  colliders.push({ minX: 144, maxX: 156, minZ: -251, maxZ: -239 });

  // --- Palm trees along the roads and the boardwalk. ---
  const palms = [];
  for (let i = 0; i < 70; i++) {
    const onBoardwalk = rng.chance(0.35);
    let x;
    let z;
    if (onBoardwalk) {
      x = rng.range(-115, 145);
      z = -240 + rng.range(-4, 4);
    } else {
      const gx = rng.pick(gridX);
      const gz = rng.pick(gridZ);
      x = gx + rng.range(-16, 16);
      z = gz + rng.range(-14, 14);
    }
    if (z < -60 && z > -260 && Math.abs(x) < 8) continue; // keep the causeway clear
    const palm = new THREE.Group();
    const trunk = cyl(0.25, 0.4, 6, 0x8a6a44, 0, 3, 0, 7);
    palm.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.2, 0),
      new THREE.MeshLambertMaterial({ color: 0x3f9e4d }),
    );
    crown.scale.y = 0.55;
    crown.position.set(0, 6.4, 0);
    palm.add(crown);
    palm.position.set(x, 0, z);
    group.add(palm);
    palms.push(palm);
  }

  // --- Street props: lamps along downtown roads. ---
  for (const x of gridX) {
    for (const z of gridZ) {
      if (rng.chance(0.5)) continue;
      const lampPost = cyl(0.12, 0.12, 5, 0x2f3338, x + 6, 2.5, z + 6, 6);
      group.add(lampPost);
      const lampHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xcc9933 }),
      );
      lampHead.position.set(x + 6, 5.1, z + 6);
      group.add(lampHead);
    }
  }

  return {
    group,
    nodes,
    nodeByKey,
    edges,
    colliders,
    water,
    wheel,
    lighthouse,
    boats,
    palms,
    garagePos: { x: 20, z: 120 },
    spawn: { x: 20, z: 96, angle: Math.PI },
    plaza: { x: -60, z: 60 },
  };
}

// Nearest road node to a point (for traffic and police spawning).
export function nearestNode(world, x, z) {
  let best = world.nodes[0];
  let bestD = Infinity;
  for (const n of world.nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

// Circle vs building colliders: push the circle out. Returns true on hit.
export function collideCircle(world, x, z, radius) {
  let hit = false;
  for (const c of world.colliders) {
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = radius - d;
        // Caller reads the corrected position from the returned vector.
        collideCircle.outX = x + (dx / d) * push;
        collideCircle.outZ = z + (dz / d) * push;
      } else {
        collideCircle.outX = x + radius;
        collideCircle.outZ = z;
      }
      return { hit: true, x: collideCircle.outX, z: collideCircle.outZ };
    }
  }
  return { hit: false, x, z };
}

export function insideWorld(x, z) {
  return x > -220 && x < 240 && z > -280 && z < 200;
}
