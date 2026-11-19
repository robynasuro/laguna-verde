// Traffic. One job: cars that drive the city like they live there —
// pick a road, follow it, turn at intersections, slow for the car
// ahead, stop when the player blocks the road.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Car, carColorAt, carNameAt } from './cars.js';

export class Traffic {
  constructor(scene, layout, colliders, rng) {
    this.scene = scene;
    this.layout = layout;
    this.colliders = colliders;
    this.rng = rng;
    this.cars = [];
    this.spawn();
  }

  spawn() {
    for (let i = 0; i < CONFIG.trafficCars; i++) {
      const node = this.layout.randomRoadPoint(this.rng);
      const color = carColorAt(i + 3);
      const car = new Car(this.scene, node.x, node.z, this.rng.range(0, Math.PI * 2), color, {
        name: carNameAt(i + 3),
      });
      const next = node.links.length ? this.rng.pick(node.links) : node;
      this.cars.push({
        car,
        node,
        target: next,
        speed: CONFIG.trafficSpeed * this.rng.range(0.8, 1.15),
        wait: 0,
      });
    }
  }

  // The nearest traffic car to a point, for stealing and collisions.
  nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const t of this.cars) {
      const dx = t.car.x - x;
      const dz = t.car.z - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  update(dt, playerPos) {
    for (const t of this.cars) {
      const c = t.car;
      const dx = t.target.x - c.x;
      const dz = t.target.z - c.z;
      const dist = Math.hypot(dx, dz);

      // Arrived at the target intersection: pick the next road.
      if (dist < 3) {
        t.node = t.target;
        const onward = t.node.links.filter((n) => n !== t.node);
        t.target = onward.length ? this.rng.pick(onward) : t.node;
        continue;
      }

      // Slow down for the car ahead or the player.
      let wantSpeed = t.speed;
      const ahead = this.aheadOf(c, 14);
      if (ahead) wantSpeed = Math.min(wantSpeed, ahead.speed * 0.9);
      if (playerPos) {
        const pd = Math.hypot(playerPos.x - c.x, playerPos.z - c.z);
        if (pd < 7) wantSpeed = 0;
      }
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += THREE.MathUtils.clamp(dh, -1.6 * dt, 1.6 * dt);
      c.speed += (wantSpeed - c.speed) * Math.min(1, dt * 2);
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      for (const w of c.mesh.userData.wheels) w.rotation.x += c.speed * dt * 2.2;
    }
  }

  aheadOf(car, dist) {
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    let best = null;
    let bestD = dist;
    for (const t of this.cars) {
      if (t.car === car) continue;
      const dx = t.car.x - car.x;
      const dz = t.car.z - car.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < bestD && side < 3) {
        bestD = along;
        best = t.car;
      }
    }
    return best;
  }

  // Pull one traffic car out of the world (stolen by the player).
  remove(entry) {
    const i = this.cars.indexOf(entry);
    if (i >= 0) {
      this.cars.splice(i, 1);
      return entry.car;
    }
    return null;
  }

  // Park a car back into traffic at a random road point.
  addBack(car) {
    const node = this.layout.randomRoadPoint(this.rng);
    car.x = node.x;
    car.z = node.z;
    car.heading = this.rng.range(0, Math.PI * 2);
    car.speed = 0;
    car.mesh.position.set(car.x, 0, car.z);
    const next = node.links.length ? this.rng.pick(node.links) : node;
    this.cars.push({ car, node, target: next, speed: CONFIG.trafficSpeed, wait: 0 });
  }
}
