// City generation. One job: build Laguna Verde as Three.js meshes — lagoon,
// causeway, road grid, buildings, palms, marina, boardwalk Ferris wheel,
// lighthouse, canal houses, hillside villas and the Garage del Sol — and hand
// back the landmarks the game logic needs (garage spot, wheel, water).

import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { mulberry32, rand, randInt, pick } from './random.js';

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ color, ...opts });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = !!opts.castShadow;
  m.receiveShadow = true;
  return m;
}

function canvasTexture(draw, w = 256, h = 64) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld(scene) {
  const rng = mulberry32(7);
  const C = CONFIG.colors;
  const group = new THREE.Group();
  scene.add(group);
  const out = { group, water: null, garage: null, ferrisWheel: null, lighthouse: null, boats: [], palms: [] };

  // Ground: big grass-sand base.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.worldSize, CONFIG.worldSize),
    new THREE.MeshLambertMaterial({ color: C.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Lagoon: turquoise water on the west side, with a deeper patch.
  const waterMat = new THREE.MeshLambertMaterial({ color: C.water, transparent: true, opacity: 0.92 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(130, CONFIG.worldSize), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-185, 0.12, 0);
  water.receiveShadow = true;
  group.add(water);
  out.water = water;
  const deep = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 200),
    new THREE.MeshLambertMaterial({ color: C.lagoonDeep, transparent: true, opacity: 0.9 }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(-220, 0.14, -40);
  group.add(deep);

  // Causeway: the road across the lagoon at z = 0, slightly raised, with rails.
  const causeway = box(150, 0.6, 12, C.road, -175, 0.3, 0, { castShadow: true });
  group.add(causeway);
  group.add(box(150, 0.8, 0.8, 0xd8d8d8, -175, 0.9, -6.4));
  group.add(box(150, 0.8, 0.8, 0xd8d8d8, -175, 0.9, 6.4));
  for (let x = -245; x <= -110; x += 15) {
    group.add(box(0.6, 1.6, 0.6, 0xcccccc, x, 1.2, -6.4));
    group.add(box(0.6, 1.6, 0.6, 0xcccccc, x, 1.2, 6.4));
  }

  // Road grid: asphalt strips with a pale centre line.
  for (const x of CONFIG.roadsX) {
    group.add(box(CONFIG.roadWidth, 0.1, 300, C.road, x, 0.06, 0));
    group.add(box(0.4, 0.12, 300, C.roadLine, x, 0.07, 0));
  }
  for (const z of CONFIG.roadsZ) {
    group.add(box(250, 0.1, CONFIG.roadWidth, C.road, 25, 0.06, z));
    group.add(box(250, 0.12, 0.4, C.roadLine, 25, 0.07, z));
  }

  // Downtown buildings, one or two per block, skipping the garage block.
  const xs = CONFIG.roadsX;
  const zs = CONFIG.roadsZ;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cz = (zs[j] + zs[j + 1]) / 2;
      if (Math.abs(cx - 20) < 30 && Math.abs(cz - 100) < 30) continue; // garage block
      if (cx > 120 && cz < -80) continue; // canal houses go here instead
      if (cx > 110 && cz > 90) continue; // hillside villas go here instead
      const downtown = cx > -50 && cx < 100 && cz > -60 && cz < 60;
      const count = downtown ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = rand(rng, 12, 22);
        const d = rand(rng, 12, 22);
        const h = downtown ? rand(rng, 14, 34) : rand(rng, 7, 16);
        const bx = cx + (k === 0 ? -8 : 9) + rand(rng, -3, 3);
        const bz = cz + rand(rng, -6, 6);
        const color = pick(rng, C.buildingPalette);
        const b = box(w, h, d, color, bx, h / 2, bz, { castShadow: true });
        group.add(b);
        group.add(box(w + 1, 0.8, d + 1, pick(rng, C.roofPalette), bx, h + 0.4, bz));
        if (chance(rng, 0.5)) {
          group.add(box(2, 2, 2, 0xffe9a8, bx + w / 4, h + 1.4, bz, { emissive: 0x664411 }));
        }
      }
    }
  }

  // Canal district: small bright houses with pitched roofs.
  for (let i = 0; i < 10; i++) {
    const hx = rand(rng, 118, 148);
    const hz = rand(rng, -140, -95);
    const h = rand(rng, 5, 8);
    const color = pick(rng, [0xe85d75, 0x2fa8b8, 0xf2b134, 0x7fb069, 0xc98bb9, 0xe07a5f]);
    group.add(box(9, h, 8, color, hx, h / 2, hz, { castShadow: true }));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 3.5, 4), new THREE.MeshLambertMaterial({ color: 0x8a4b3a }));
    roof.position.set(hx, h + 1.7, hz);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
  }

  // Hillside villas: white boxes with red roofs.
  for (let i = 0; i < 8; i++) {
    const vx = rand(rng, 118, 152);
    const vz = rand(rng, 100, 145);
    const h = rand(rng, 6, 9);
    group.add(box(11, h, 9, 0xf2e3c9, vx, h / 2, vz, { castShadow: true }));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 3, 4), new THREE.MeshLambertMaterial({ color: 0xb04030 }));
    roof.position.set(vx, h + 1.5, vz);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  }

  // Palm trees along the roads and the boardwalk.
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), new THREE.MeshLambertMaterial({ color: C.palmTrunk }));
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    g.add(trunk);
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 4), new THREE.MeshLambertMaterial({ color: C.palmLeaf }));
      const a = (k / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6, 7.6, Math.sin(a) * 1.6);
      leaf.rotation.z = Math.cos(a) * 0.9;
      leaf.rotation.x = -Math.sin(a) * 0.9;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    group.add(g);
    out.palms.push(g);
  }
  for (const x of CONFIG.roadsX) {
    for (const z of [-140, -60, 20, 110]) palm(x + 7, z);
  }
  for (let z = -120; z <= 120; z += 30) palm(-112, z);

  // Boardwalk pier + Ferris wheel on the lagoon edge.
  const pier = box(34, 1, 16, 0x8a6a4b, -137, 0.6, 60, { castShadow: true });
  group.add(pier);
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.7, 8, 32), new THREE.MeshLambertMaterial({ color: C.ferris }));
  wheel.add(rim);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.5, 26, 0.5), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    spoke.position.set(Math.cos(a) * 0, 0, 0);
    spoke.rotation.z = a;
    wheel.add(spoke);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), new THREE.MeshLambertMaterial({ color: pick(rng, [0xe85d75, 0x2fa8b8, 0xf2b134, 0x7fb069]) }));
    cabin.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0);
    wheel.add(cabin);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3, 10), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  wheel.position.set(-137, 17, 60);
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);
  out.ferrisWheel = wheel;
  group.add(box(3, 17, 3, 0x6a5a4b, -137, 8.5, 60));

  // Lighthouse on a small island in the lagoon.
  const island = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 1.5, 20), new THREE.MeshLambertMaterial({ color: C.sand }));
  island.position.set(-185, 0.4, -175);
  island.receiveShadow = true;
  group.add(island);
  const light = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 22, 12), new THREE.MeshLambertMaterial({ color: C.lighthouse }));
  tower.position.y = 11;
  tower.castShadow = true;
  light.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 3, 12), new THREE.MeshLambertMaterial({ color: C.lighthouseTop }));
  band.position.y = 17;
  light.add(band);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xaa8822 }));
  lamp.position.y = 23;
  light.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.5, 10), new THREE.MeshLambertMaterial({ color: C.lighthouseTop }));
  cap.position.y = 25;
  light.add(cap);
  light.position.set(-185, 0.7, -175);
  group.add(light);
  out.lighthouse = light;

  // Marina: a few boats moored near the lagoon edge.
  const boatSpots = [[-128, -20], [-132, 10], [-126, 40], [-134, 80]];
  for (const [bx, bz] of boatSpots) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 8), new THREE.MeshLambertMaterial({ color: pick(rng, [0xf2f2f2, 0xd96a4f, 0x5b8fb9]) }));
    hull.position.y = 0.5;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), new THREE.MeshLambertMaterial({ color: 0x6a5a4b }));
    mast.position.y = 4;
    boat.add(mast);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 4), new THREE.MeshLambertMaterial({ color: 0xf2e3c9 }));
    sail.position.set(0, 4.5, 1.5);
    sail.scale.z = 0.4;
    boat.add(sail);
    boat.position.set(bx, 0.2, bz);
    boat.rotation.y = rand(rng, -0.3, 0.3);
    group.add(boat);
    out.boats.push(boat);
  }

  // Garage del Sol: yellow workshop with a painted sign, forecourt and a tyre stack.
  const garage = new THREE.Group();
  const shed = box(26, 9, 16, C.garage, 0, 4.5, 0, { castShadow: true });
  garage.add(shed);
  const roofG = box(27, 0.8, 17, 0x8a4b3a, 0, 9.4, 0);
  garage.add(roofG);
  const signTex = canvasTexture((g, w, h) => {
    g.fillStyle = '#202020';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23f';
    g.font = 'bold 30px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('GARAGE DEL SOL', w / 2, h / 2);
  }, 512, 64);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.8), new THREE.MeshLambertMaterial({ map: signTex }));
  sign.position.set(0, 7, 8.1);
  garage.add(sign);
  const door = box(8, 6, 0.4, 0x3a3a40, -5, 3, 8.1);
  garage.add(door);
  const slab = box(34, 0.2, 24, 0x9a9a94, 0, 0.1, 12);
  garage.add(slab);
  for (let i = 0; i < 3; i++) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(1, 0.45, 8, 16), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    tyre.position.set(11, 0.5 + i * 0.9, -4);
    tyre.rotation.x = Math.PI / 2;
    garage.add(tyre);
  }
  garage.position.set(CONFIG.garagePos.x, 0, CONFIG.garagePos.z);
  group.add(garage);
  out.garage = garage;

  // Mission marker: a light beam + a floating diamond, moved by missions.js.
  const marker = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 40, 12, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  );
  beam.position.y = 20;
  marker.add(beam);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x664411 }));
  gem.position.y = 6;
  marker.add(gem);
  marker.visible = false;
  group.add(marker);
  out.marker = marker;
  out.markerGem = gem;

  return out;
}

function chance(rng, p) {
  return rng() < p;
}
