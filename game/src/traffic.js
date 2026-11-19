// Traffic: AI cars that drive the road grid in loops and stop for the car ahead.
// One job: keep the streets busy and believable.
import { makeCar, CAR_DEFS } from './cars.js';

export function createTraffic(scene, nodes, rng) {
  const cars = [];
  // Each loop is a rectangle around a pair of roads. Six loops cover the grid.
  const loops = [];
  for (let i = 0; i < 6; i++) {
    const x1 = [-120, -60, 0, 60, 120][i % 5];
    const x2 = x1 + 60;
    const z1 = [-180, -120, -60, 0, 60, 120][(i * 2) % 6];
    const z2 = z1 + 60;
    loops.push([
      { x: x1, z: z1 },
      { x: x2, z: z1 },
      { x: x2, z: z2 },
      { x: x1, z: z2 },
    ]);
  }
  for (let i = 0; i < 14; i++) {
    const def = CAR_DEFS[Math.floor(rng() * CAR_DEFS.length)];
    const loop = loops[i % loops.length];
    const wp = loop[i % 4];
    const car = makeCar(scene, def, wp.x, wp.z, 0, false);
    car.loop = loop;
    car.wp = (i % 4 + 1) % 4;
    car.cruise = 7 + rng() * 4;
    cars.push(car);
  }

  function update(dt, playerCar, policeCars) {
    // Traffic stops for anything in front of it, including the player.
    const all = [...cars, ...(playerCar ? [playerCar] : []), ...policeCars];
    for (const car of cars) {
      const target = car.loop[car.wp];
      const dx = target.x - car.pos.x;
      const dz = target.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4) {
        car.wp = (car.wp + 1) % car.loop.length;
        continue;
      }
      const want = Math.atan2(dx, dz);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff * 2));
      // Stop for the car ahead: check the wedge in front of the nose.
      let blocked = false;
      for (const o of all) {
        if (o === car) continue;
        const ox = o.pos.x - car.pos.x;
        const oz = o.pos.z - car.pos.z;
        const ahead = ox * Math.sin(car.heading) + oz * Math.cos(car.heading);
        const side = Math.abs(ox * Math.cos(car.heading) - oz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 9 && side < 2.6) {
          blocked = true;
          break;
        }
      }
      const wantSpeed = blocked ? 0 : car.cruise;
      car.speed += (wantSpeed - car.speed) * Math.min(1, dt * 2);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.mesh.position.set(car.pos.x, 0, car.pos.z);
      car.mesh.rotation.y = car.heading;
    }
  }

  return { cars, update };
}
