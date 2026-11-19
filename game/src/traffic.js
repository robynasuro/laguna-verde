// Traffic AI. One job: keep a dozen cars circulating on the road grid so
// the city feels alive, turning at intersections without ever teleporting.
// A car drives along one axis; when it reaches a cross street it may turn,
// which only ever changes the axis it moves on, never its position.

import { createCar } from './cars.js';
import { CONFIG } from './config.js';
import { mulberry32, rand, randInt, pick } from './random.js';

const TRAFFIC_COLORS = [0x3a6ea5, 0xd9a441, 0x7a7a7a, 0x4f8f5f, 0x8a5a9a, 0xc9c9c9, 0x5b8fb9, 0xb85450];

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(21);
    this.cars = [];
    for (let i = 0; i < 12; i++) this.spawnCar(true);
  }

  spawnCar(anywhere = false) {
    const rng = this.rng;
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, CONFIG.roadsX) : pick(rng, CONFIG.roadsZ);
    const along = rand(rng, -140, 140);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = (rng() < 0.5 ? -2.5 : 2.5) * dir;
    const car = createCar(
      vertical ? road + lane : along,
      vertical ? along : road + lane,
      vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      pick(rng, TRAFFIC_COLORS),
    );
    car.traffic = {
      axis: vertical ? 'z' : 'x',
      dir,
      speed: rand(rng, 7, 12),
      lane,
      turnAt: rand(rng, -140, 140),
    };
    this.scene.add(car.group);
    this.cars.push(car);
    return car;
  }

  update(dt, playerPos) {
    for (const car of this.cars) {
      const t = car.traffic;
      // Keep a little distance from the player's car so traffic does not pile up.
      if (playerPos) {
        const dx = car.x - playerPos.x;
        const dz = car.z - playerPos.z;
        if (dx * dx + dz * dz < 36) {
          car.speed = Math.max(0, car.speed - 20 * dt);
        }
      }
      if (t.axis === 'z') {
        car.z += t.dir * t.speed * dt;
        car.yaw = t.dir > 0 ? 0 : Math.PI;
        const crossed = t.dir > 0 ? car.z >= t.turnAt : car.z <= t.turnAt;
        if (crossed) this.maybeTurn(car);
        if (car.z > 155 || car.z < -155) this.respawn(car);
      } else {
        car.x += t.dir * t.speed * dt;
        car.yaw = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        const crossed = t.dir > 0 ? car.x >= t.turnAt : car.x <= t.turnAt;
        if (crossed) this.maybeTurn(car);
        if (car.x > 165 || car.x < -115) this.respawn(car);
      }
      // No traffic on the water except the causeway: push stray cars back.
      if (car.x < -118 && Math.abs(car.z) > 8) {
        car.x = -115;
        t.axis = 'z';
        t.dir = car.z >= 0 ? -1 : 1;
        t.turnAt = car.z + t.dir * 40;
      }
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.yaw;
    }
  }

  maybeTurn(car) {
    const rng = this.rng;
    const t = car.traffic;
    if (rng() < 0.45) {
      // Turn: switch axis, keep the position exactly where it is. The new
      // turn point is the next cross street along the new axis.
      if (t.axis === 'z') {
        t.axis = 'x';
        const roads = CONFIG.roadsZ.filter((z) => Math.abs(z - car.z) < 6);
        if (roads.length) car.z = roads[0];
        t.dir = rng() < 0.5 ? 1 : -1;
        t.turnAt = car.x + t.dir * rand(rng, 30, 90);
      } else {
        t.axis = 'z';
        const roads = CONFIG.roadsX.filter((x) => Math.abs(x - car.x) < 6);
        if (roads.length) car.x = roads[0];
        t.dir = rng() < 0.5 ? 1 : -1;
        t.turnAt = car.z + t.dir * rand(rng, 30, 90);
      }
    } else {
      t.turnAt = (t.axis === 'z' ? car.z : car.x) + t.dir * rand(rng, 30, 90);
    }
  }

  respawn(car) {
    const idx = this.cars.indexOf(car);
    this.scene.remove(car.group);
    if (idx >= 0) this.cars.splice(idx, 1);
    this.spawnCar();
  }
}
