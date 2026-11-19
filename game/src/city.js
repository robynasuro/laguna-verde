// Laguna Verde, the city itself: lagoon, causeway, pier, boardwalk, marina,
// downtown grid, canal houses, hillside villas, lighthouse, palms. This file
// only builds the static city. It returns the colliders, the road graph and
// the animated pieces (Ferris wheel, boats) that the main loop moves.
import * as THREE from '../vendor/three.module.min.js';

// Seeded random, so every player gets the same city.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The world layout. Everything else in the game reads these numbers, so
// missions, traffic and the minimap all agree on where things are.
export const WORLD = {
  bound: 260,
  lagoonX: -150,
  roadsX: [-120, -60, 0, 60, 120, 180],
  roadsZ: [-180, -120, -60, 0, 60, 120, 180],
  roadW: 12,
  garage: { x: -132, z: 66 },
  garageFront: { x: -132, z: 84 },
  pier: { x: -195, z: 0 },
  lighthouse: { x: -228, z: -185 },
  marina: { x: -185, z: 100 },
};

const PASTELS = [
  0xffd9a0, 0xffb37a, 0xf28b82, 0x8ecae6, 0x90be6d,
  0xf9c74f, 0xe07a5f, 0xfff3b0, 0xa8dadc, 0xe5989b,
];

export function buildCity(scene, rng) {
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  const hitbox = (x, z, hw, hd) =>
    colliders.push({ x0: x - hw, z0: z - hd, x1: x + hw, z1: z + hd });

  // A plain Lambert box that casts and receives shadows. Nearly everything
  // in the city is one of these, just in different sizes and colours.
  function block(w, h, d, color, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function flat(w, d, color, x, y, z, opacity = 1) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    return mesh;
  }

  // --- Ground: land east, sand strip, open water west and north. ---
  group.add(flat(420, 540, 0x8a7a5a, 60, 0, 0));
  group.add(flat(24, 540, 0xe8d49a, -138, 0.05, 0));
  group.add(flat(220, 560, 0x1fa8b8, -260, 0.1, 0, 0.92));
  group.add(flat(420, 60, 0x1fa8b8, 60, 0.1, -280, 0.92));

  // --- Roads: the downtown grid, laid over the land. ---
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  for (const x of WORLD.roadsX) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadW, 520), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.08, 0);
    road.receiveShadow = true;
    group.add(road);
  }
  for (const z of WORLD.roadsZ) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(420, WORLD.roadW), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(50, 0.08, z);
    road.receiveShadow = true;
    group.add(road);
  }

  // --- Causeway bridge across the lagoon at z = 0, with low rails. ---
  group.add(block(120, 1.2, 16, 0x9a8f7a, -205, 0.6, 0));
  group.add(block(120, 1, 1, 0xd8d0c0, -205, 1.6, -8));
  group.add(block(120, 1, 1, 0xd8d0c0, -205, 1.6, 8));
  // --- Pier deck out into the water, and the boardwalk along the shore. ---
  group.add(block(70, 1, 18, 0xb98a5a, -182, 0.7, 0));
  group.add(block(16, 0.6, 300, 0xc9a06a, -146, 0.4, 0));

  // --- Downtown: one or two pastel buildings per block, varied heights. ---
  const pick = () => PASTELS[Math.floor(rng() * PASTELS.length)];
  for (const rx of WORLD.roadsX) {
    for (const rz of WORLD.roadsZ) {
      const cx = rx + 30;
      const cz = rz + 30;
      if (cx > 200 || cz > 210 || cx < -140) continue;
      const count = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < count; i++) {
        const bx = cx + (rng() - 0.5) * 26;
        const bz = cz + (rng() - 0.5) * 26;
        const w = 12 + rng() * 12;
        const d = 12 + rng() * 12;
        const h = 8 + rng() * rng() * 42;
        group.add(block(w, h, d, pick(), bx, h / 2, bz));
        group.add(block(w + 0.6, 0.8, d + 0.6, 0xffffff, bx, h + 0.3, bz));
        hitbox(bx, bz, w / 2 + 0.5, d / 2 + 0.5);
      }
    }
  }

  // --- Canal district: low colourful houses along the south edge. ---
  for (let i = 0; i < 26; i++) {
    const x = -120 + rng() * 300;
    const z = 200 + rng() * 40;
    const w = 10 + rng() * 8;
    const h = 6 + rng() * 6;
    const d = 9 + rng() * 6;
    group.add(block(w, h, d, pick(), x, h / 2, z));
    group.add(block(w + 1, 1, d + 1, 0x8b2e2e, x, h + 0.5, z));
    hitbox(x, z, w / 2 + 0.5, d / 2 + 0.5);
  }

  // --- Hillside villas in the north east, cream walls, terracotta roofs. ---
  for (let i = 0; i < 14; i++) {
    const x = 150 + rng() * 80;
    const z = -230 + rng() * 70;
    const w = 14 + rng() * 8;
    const h = 7 + rng() * 5;
    const d = 12 + rng() * 6;
    group.add(block(w, h, d, 0xfff1cf, x, h / 2, z));
    group.add(block(w + 1, 1.2, d + 1, 0xc96f4a, x, h + 0.6, z));
    hitbox(x, z, w / 2 + 0.5, d / 2 + 0.5);
  }

  // --- Garage del Sol, Carmen's garage, with a painted sign on the front. ---
  const gx = WORLD.garage.x;
  const gz = WORLD.garage.z;
  group.add(block(26, 9, 18, 0xff9f2e, gx, 4.5, gz));
  group.add(block(26.5, 2, 18.5, 0x1a2a33, gx, 9.5, gz));
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 96;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#1a2a33';
  sctx.fillRect(0, 0, 512, 96);
  sctx.fillStyle = '#ffd23e';
  sctx.font = 'bold 52px Verdana, sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('GARAGE DEL SOL', 256, 52);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 4.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) }),
  );
  sign.position.set(gx, 7.2, gz + 9.2);
  group.add(sign);
  hitbox(gx, gz, 13.5, 9.5);

  // --- Ferris wheel on the pier. It spins in the main loop. ---
  const wheel = new THREE.Group();
  wheel.position.set(WORLD.pier.x, 22, WORLD.pier.z);
  group.add(wheel);
  wheel.add(new THREE.Mesh(
    new THREE.TorusGeometry(16, 0.7, 8, 40),
    new THREE.MeshLambertMaterial({ color: 0xff5d8f }),
  ));
  const cabinColors = [0xffd23e, 0x3ec6ff, 0xff7a3e, 0x7dff8a];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 16, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    spoke.rotation.z = a;
    spoke.translateY(8);
    wheel.add(spoke);
    wheel.add(block(3, 2.4, 2.4, cabinColors[i % 4], Math.cos(a) * 16, Math.sin(a) * 16, 0));
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 2, 12),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  const legL = block(1.2, 24, 1.2, 0xffffff, WORLD.pier.x - 6, 11, WORLD.pier.z);
  const legR = block(1.2, 24, 1.2, 0xffffff, WORLD.pier.x + 6, 11, WORLD.pier.z);
  legL.rotation.z = 0.35;
  legR.rotation.z = -0.35;
  group.add(legL);
  group.add(legR);

  // --- Lighthouse on the point: striped tower on a rock, glowing lamp. ---
  const lx = WORLD.lighthouse.x;
  const lz = WORLD.lighthouse.z;
  const rock = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 18, 4, 10),
    new THREE.MeshLambertMaterial({ color: 0x6b7c85 }),
  );
  rock.position.set(lx, 2, lz);
  group.add(rock);
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4 - i * 0.25, 3.8 - i * 0.25, 5, 12),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xe63946 : 0xffffff }),
    );
    seg.position.set(lx, 6 + i * 5, lz);
    seg.castShadow = true;
    group.add(seg);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2a0 }),
  );
  lamp.position.set(lx, 32, lz);
  group.add(lamp);

  // --- Marina boats, bobbing in the lagoon. ---
  const boats = [];
  for (let i = 0; i < 7; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.6, 12),
      new THREE.MeshLambertMaterial({ color: [0xffffff, 0xffd23e, 0x3ec6ff][i % 3] }),
    );
    hull.position.y = 0.4;
    boat.add(hull);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
    );
    mast.position.y = 4.5;
    boat.add(mast);
    boat.position.set(-175 - rng() * 45, 0.4, 55 + i * 14);
    boat.rotation.y = rng() * 0.6;
    group.add(boat);
    boats.push(boat);
  }

  // --- Palm trees along the boardwalk, the causeway edge and the roads. ---
  function palmAt(x, z) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.55, 7, 7),
      new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
    );
    trunk.position.y = 3.5;
    trunk.rotation.z = (rng() - 0.5) * 0.15;
    palm.add(trunk);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 4.5, 4),
        new THREE.MeshLambertMaterial({ color: 0x2e9e5b }),
      );
      leaf.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      palm.add(leaf);
    }
    palm.position.set(x, 0, z);
    group.add(palm);
  }
  for (let z = -200; z <= 200; z += 40) {
    palmAt(-143, z);
    palmAt(-158, z + 20);
  }
  for (const x of WORLD.roadsX) {
    for (const z of [-150, -30, 90, 210]) palmAt(x + 9, z);
  }
  for (let i = 0; i < 10; i++) palmAt(-120 + rng() * 320, -240 + rng() * 20);

  // --- Street lights on the main intersections, glowing heads. ---
  const lampPosts = [];
  for (const x of WORLD.roadsX) {
    for (const z of WORLD.roadsZ) {
      if ((x + z) % 120 !== 0) continue;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 7, 6),
        new THREE.MeshLambertMaterial({ color: 0x2a2f33 }),
      );
      pole.position.set(x + 7, 3.5, z + 7);
      group.add(pole);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe9a0 }),
      );
      head.position.set(x + 7, 7.1, z + 7);
      group.add(head);
      lampPosts.push(head);
    }
  }

  // Road graph: every intersection, for traffic and pedestrians.
  const nodes = [];
  for (const x of WORLD.roadsX) {
    for (const z of WORLD.roadsZ) nodes.push({ x, z });
  }
  return { group, colliders, wheel, boats, lampPosts, nodes, water: null };
}

// Push a circle out of any building box it overlaps. Used by the player,
// cars and anything else that walks the streets.
export function collide(pos, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(pos.x, c.x1));
    const nz = Math.max(c.z0, Math.min(pos.z, c.z1));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = nx + (dx / d) * radius;
      pos.z = nz + (dz / d) * radius;
    } else {
      pos.x = c.x1 + radius;
    }
  }
  return pos;
}

// Height of the raised decks under a point: 1.2 on the causeway and pier,
// 0 everywhere else.
export function deckHeight(x, z) {
  if (x < WORLD.lagoonX && Math.abs(z) < 9 && x >= -262) return 1.2;
  return 0;
}

// Is this point on walkable land? The causeway, the pier and the lighthouse
// rock count as land; open lagoon water does not.
export function onLand(x, z) {
  if (x >= WORLD.lagoonX) return true;
  if (Math.abs(z) < 8 && x >= -262) return true;
  const dx = x - WORLD.lighthouse.x;
  const dz = z - WORLD.lighthouse.z;
  return dx * dx + dz * dz < 20 * 20;
}

export function clampToLand(pos, radius) {
  if (!onLand(pos.x, pos.z)) {
    if (Math.abs(pos.z) < 30) {
      pos.z = Math.max(-7 + radius, Math.min(7 - radius, pos.z));
    } else {
      pos.x = Math.max(WORLD.lagoonX + radius, pos.x);
    }
  }
  pos.x = Math.max(-258, Math.min(258, pos.x));
  pos.z = Math.max(-258, Math.min(258, pos.z));
  return pos;
}
