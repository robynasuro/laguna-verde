// Traffic: AI cars that follow the road graph, plus parked cars the player
// can steal. Traffic slows for the car ahead and for the player.

import { makeCar, driveCar, randomBodyColor } from './cars.js';
import { CONFIG } from './config.js';

export function createTraffic(world, scene, rng) {
  const cars = [];
  const used = new Set();

  for (let i = 0; i < CONFIG.traffic.count; i++) {
    const node = world.nodes[Math.floor(rng.next() * world.nodes.length)];
    const key = `${node.id}`;
    if (used.has(key)) continue;
    used.add(key);
    const nextId = node.links[Math.floor(rng.next() * node.links.length)];
    const next = world.nodes[nextId];
    const angle = Math.atan2(next.x - node.x, next.z - node.z);
    const car = makeCar(world, scene, node.x, node.z, angle, randomBodyColor(rng), { traffic: true });
    car.speed = CONFIG.traffic.speed * rng.range(0.8, 1.15);
    car.node = node.id;
    car.nextNode = nextId;
    cars.push(car);
  }

  // Parked cars along downtown roads, doors unlocked, waiting to be borrowed.
  const parked = [];
  const parkSpots = [
    [-100, -14], [-50, 26], [50, -14], [100, 66], [-50, 106], [0, 146],
    [150, 26], [-100, 66], [50, 146],
  ];
  for (const [x, z] of parkSpots) {
    const car = makeCar(world, scene, x, z, rng.range(0, Math.PI * 2), randomBodyColor(rng), { parked: true });
    parked.push(car);
  }
  return { cars, parked };
}

function steerToward(car, tx, tz, dt) {
  const want = Math.atan2(tx - car.x, tz - car.z);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  return steer;
}

export function updateTraffic(traffic, world, dt, playerCar, rng) {
  for (const car of traffic.cars) {
    if (car.wrecked) continue;
    const target = world.nodes[car.nextNode];
    if (!target) continue;
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);

    // Slow down if something is right in front of us.
    let desired = CONFIG.traffic.speed;
    if (playerCar && !playerCar.wrecked) {
      const pd = Math.hypot(playerCar.x - car.x, playerCar.z - car.z);
      if (pd < 10) desired = Math.min(desired, 4);
    }
    for (const other of traffic.cars) {
      if (other === car || other.wrecked) continue;
      const od = Math.hypot(other.x - car.x, other.z - car.z);
      if (od < 8) desired = Math.min(desired, 3);
    }

    const steer = steerToward(car, target.x, target.z, dt);
    const throttle = car.speed < desired ? 0.6 : 0;
    driveCar(car, world, dt, throttle, steer, false);
    car.speed = Math.max(0, Math.min(car.speed, desired + 2));

    if (dist < 4) {
      const node = world.nodes[car.nextNode];
      car.node = node.id;
      const choices = node.links.filter((id) => id !== car.node || node.links.length === 1);
      const pickFrom = choices.length ? choices : node.links;
      car.nextNode = pickFrom[Math.floor(rng.next() * pickFrom.length)];
    }
  }
}
