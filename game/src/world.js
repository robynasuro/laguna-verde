// Laguna Verde's layout: pure data, no meshes. One job: describe where
// everything is — districts, the road graph, the lagoon, the causeway,
// landmarks and spawn points — so city.js can build it and the AI can
// drive and walk on it.

import { CONFIG } from './config.js';

const S = CONFIG.halfSize;

export function buildWorldLayout() {
  // Downtown grid: streets every 80 m from -240 to +240.
  const grid = [];
  for (let c = -240; c <= 240; c += CONFIG.roadSpacing) grid.push(c);

  // Road graph: nodes at every grid crossing, edges along the streets.
  const nodes = new Map();
  const key = (x, z) => x + ',' + z;
  for (const x of grid) {
    for (const z of grid) {
      nodes.set(key(x, z), { x, z, links: [] });
    }
  }
  for (const x of grid) {
    for (const z of grid) {
      const n = nodes.get(key(x, z));
      for (const [dx, dz] of [[80, 0], [-80, 0], [0, 80], [0, -80]]) {
        const m = nodes.get(key(x + dx, z + dz));
        if (m) n.links.push(m);
      }
    }
  }

  // The causeway: a straight road west across the lagoon to the point.
  const causeway = {
    from: { x: -240, z: -80 },
    to: { x: -390, z: -80 },
    width: 10,
  };

  // The boardwalk runs along the east beach, north to south.
  const boardwalk = { x: 300, zFrom: -280, zTo: 280 };

  const districts = [
    { name: 'Downtown', x: 0, z: 0, r: 220, kind: 'downtown' },
    { name: 'Canal District', x: -80, z: 220, r: 130, kind: 'canal' },
    { name: 'Marina', x: -260, z: 140, r: 110, kind: 'marina' },
    { name: 'Boardwalk', x: 300, z: 0, r: 150, kind: 'boardwalk' },
    { name: 'Villa Hill', x: 80, z: -300, r: 120, kind: 'villas' },
    { name: 'Lighthouse Point', x: -390, z: -80, r: 40, kind: 'point' },
  ];

  const landmarks = {
    garage: { name: 'Garage del Sol', x: -160, z: 80, heading: Math.PI / 2 },
    ferrisWheel: { name: 'Rueda del Mar', x: 312, z: 40 },
    lighthouse: { name: 'Faro Verde', x: -392, z: -80 },
    marina: { name: 'Marina Verde', x: -280, z: 160 },
    hotel: { name: 'Hotel Brisa', x: 160, z: -160 },
    market: { name: 'Mercado Verde', x: 80, z: 160 },
    canalHouse: { name: 'Casa Azul', x: -120, z: 240 },
    villa: { name: 'Villa Miramar', x: 120, z: -320 },
    sharksDen: { name: 'Los Tiburones den', x: 240, z: 240 },
    pier: { name: 'Muelle Viejo', x: 300, z: -120 },
  };

  // The lagoon: everything west of x = -260 is water, except the
  // causeway strip and the lighthouse point.
  function isWater(x, z) {
    if (x < -260) {
      const onCauseway = Math.abs(z - -80) < 8 && x > -392;
      const onPoint = Math.hypot(x - -392, z - -80) < 42;
      if (onCauseway || onPoint) return false;
      return true;
    }
    // A small cove bites into the marina shore.
    if (x < -200 && z > 100 && z < 220) return x < -200 - (z - 100) * 0.15;
    return false;
  }

  function nearestRoadPoint(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const n of nodes.values()) {
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  function randomRoadPoint(rng) {
    const arr = [...nodes.values()];
    return arr[Math.floor(rng.next() * arr.length)];
  }

  // Pedestrian paths: sidewalk loops around each downtown block.
  const sidewalks = [];
  for (let x = -240; x < 240; x += 80) {
    for (let z = -240; z < 240; z += 80) {
      sidewalks.push({ x: x + 44, z: z + 44, axis: 'x', len: 72 });
      sidewalks.push({ x: x + 44, z: z + 44, axis: 'z', len: 72 });
    }
  }

  return {
    grid,
    nodes,
    causeway,
    boardwalk,
    districts,
    landmarks,
    isWater,
    nearestRoadPoint,
    randomRoadPoint,
    sidewalks,
    bounds: { minX: -S, maxX: S, minZ: -S, maxZ: S },
    // Where the player starts: beside her car outside the garage.
    playerStart: { x: -152, z: 100, heading: 0 },
    carStart: { x: -148, z: 100, heading: Math.PI / 2 },
  };
}
