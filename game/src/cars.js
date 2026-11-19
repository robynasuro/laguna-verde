// Cars: the mesh, arcade driving physics, entering/exiting, stealing.
// A car is a plain object with a THREE.Group; the game loop moves it.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { collideCircle, insideWorld } from './world.js';

const BODY_COLORS = [
  0xd94f3d, 0x2e6f8e, 0xf2c14e, 0x7fb069, 0xe8e8e8, 0x2f3338,
  0x9b5de5, 0xff9f45, 0x4d96ff, 0x6bcb77,
];

export function randomBodyColor(rng) {
  return rng.pick(BODY_COLORS);
}

// Build a low-poly car: body, cabin, wheels, headlights, tail lights.
export function makeCarMesh(color, opts = {}) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.75;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), darkMat);
  cabin.position.set(0, 1.4, -0.2);
  g.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 0.6), bodyMat);
  nose.position.set(0, 0.65, 2.3);
  g.add(nose);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  // Headlights (emissive so they read at dusk) and tail lights.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xccaa44 });
  for (const hx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.1), headMat);
    h.position.set(hx, 0.8, 2.62);
    g.add(h);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xaa2222, emissive: 0x661111 });
  for (const hx of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), tailMat);
    t.position.set(hx, 0.85, -2.22);
    g.add(t);
  }
  if (opts.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.5), chromeMat);
    bar.position.set(0, 1.85, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    red.position.set(-0.3, 1.85, -0.2);
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
    blue.position.set(0.3, 1.85, -0.2);
    g.add(blue);
  }
  return { group: g, wheels };
}

export function makeCar(world, scene, x, z, angle, color, opts = {}) {
  const { group, wheels } = makeCarMesh(color, opts);
  group.position.set(x, 0, z);
  group.rotation.y = angle;
  scene.add(group);
  return {
    group,
    wheels,
    x,
    z,
    angle,
    speed: 0,
    steer: 0,
    color,
    health: CONFIG.car.health,
    isPlayer: !!opts.player,
    isPolice: !!opts.police,
    isTraffic: !!opts.traffic,
    parked: !!opts.parked,
    wrecked: false,
    upgrades: { engine: 0, armor: 0, handling: 0 },
  };
}

export function carMaxSpeed(car) {
  return CONFIG.car.maxSpeed * (1 + 0.12 * car.upgrades.engine);
}

export function carAccel(car) {
  return CONFIG.car.accel * (1 + 0.15 * car.upgrades.engine);
}

// One physics step for a driven car. throttle -1..1, steerInput -1..1.
export function driveCar(car, world, dt, throttle, steerInput, handbrake) {
  if (car.wrecked) return;
  const max = carMaxSpeed(car);
  const grip = CONFIG.car.grip + 0.02 * car.upgrades.handling;
  const targetSteer = steerInput * CONFIG.car.steerMax;
  car.steer += (targetSteer - car.steer) * Math.min(1, dt * 8);

  if (throttle > 0) car.speed += carAccel(car) * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= CONFIG.car.brake * dt;
    else car.speed += carAccel(car) * 0.5 * throttle * dt;
  } else {
    car.speed -= car.speed * 0.6 * dt;
  }
  if (handbrake) car.speed -= car.speed * 2.2 * dt;
  car.speed = Math.max(-CONFIG.car.reverseMax, Math.min(max, car.speed));

  // Steering only bites while moving; faster = less turn.
  const speedFactor = Math.min(Math.abs(car.speed) / 12, 1);
  car.angle += car.steer * speedFactor * (car.speed >= 0 ? 1 : -1) * dt * 1.9;
  car.angle = ((car.angle + Math.PI) % (Math.PI * 2)) - Math.PI;

  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  if (!insideWorld(nx, nz)) {
    car.speed *= -0.3;
  } else {
    const hit = collideCircle(world, nx, nz, 1.7);
    if (hit.hit) {
      const impact = Math.abs(car.speed);
      car.x = hit.x;
      car.z = hit.z;
      if (impact > 6) {
        car.health -= impact * 1.2;
        car.speed *= -0.25;
      } else {
        car.speed *= 0.4;
      }
      if (car.health <= 0) {
        car.health = 0;
        car.wrecked = true;
      }
    } else {
      car.x = nx;
      car.z = nz;
    }
  }
  car.speed *= grip ** (dt * 60 * 0.016);
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.angle;
  const spin = car.speed * dt * 2.4;
  for (const w of car.wheels) w.rotation.x += spin;
  // Body lean into the turn, just enough to feel alive.
  car.group.rotation.z = -car.steer * Math.min(Math.abs(car.speed) / 20, 1) * 0.12;
}

export function removeCar(scene, car) {
  scene.remove(car.group);
}
