// Cars: the low-poly car model and arcade driving physics. One job: build
// a car mesh and move it. Who owns a car (player, traffic, police) lives in
// main.js, traffic.js and police.js.
import * as THREE from '../vendor/three.module.min.js';

export const CAR_DEFS = [
  { name: 'Sol hatchback', color: 0x3ec6ff, top: 26, accel: 14, grip: 1.0 },
  { name: 'Verde sedan', color: 0xff5d5d, top: 30, accel: 16, grip: 1.05 },
  { name: 'Tiburon coupe', color: 0xffd23e, top: 36, accel: 19, grip: 1.15 },
  { name: 'Laguna pickup', color: 0x7dff8a, top: 28, accel: 15, grip: 0.95 },
  { name: 'Marina van', color: 0xf2f2f2, top: 22, accel: 11, grip: 0.9 },
];

function lambertBox(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export function buildCarMesh(def, isPolice) {
  const g = new THREE.Group();
  const paint = isPolice ? 0x1a2a33 : def.color;
  g.add(lambertBox(2.1, 0.75, 4.4, paint, 0, 0.65, 0));
  g.add(lambertBox(1.8, 0.65, 2.2, isPolice ? 0xffffff : 0x223344, 0, 1.3, -0.2));
  if (isPolice) {
    g.add(lambertBox(2.14, 0.2, 4.44, 0xffffff, 0, 0.85, 0));
    const bar = lambertBox(1.2, 0.25, 0.5, 0xff2222, 0, 1.75, -0.2);
    g.add(bar);
    g.userData.lightBar = bar;
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    g.add(wheel);
    wheels.push(wheel);
  }
  g.userData.wheels = wheels;
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0 });
  for (const x of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    lamp.position.set(x, 0.7, 2.22);
    g.add(lamp);
  }
  const beam = new THREE.SpotLight(0xfff2a0, 0, 40, 0.5, 0.5);
  beam.position.set(0, 1, 2.2);
  beam.target.position.set(0, 0, 12);
  g.add(beam);
  g.add(beam.target);
  g.userData.headlight = beam;
  return g;
}

function accelStep(car, input, dt, top, accel) {
  if (input.forward) {
    car.speed += accel * dt;
  } else if (input.back) {
    // Reversing from speed is braking; from a stop it is just slow.
    car.speed -= (car.speed > 0.5 ? accel * 1.4 : accel * 0.6) * dt;
  } else {
    car.speed *= Math.pow(0.4, dt);
  }
  if (input.brake) car.speed *= Math.pow(0.05, dt);
  car.speed = Math.max(-top * 0.4, Math.min(top, car.speed));
}

function steerStep(car, input, dt, grip) {
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const spd = Math.abs(car.speed);
  if (spd > 0.2) {
    car.heading += steer * 1.9 * grip * dt * Math.sign(car.speed) * Math.min(1, spd / 8);
  }
  return steer;
}

// Arcade driving: speed runs along the heading, steering bites harder the
// faster you go, upgrades lift the top speed and the grip.
export function driveCar(car, input, dt, upgrades) {
  const def = car.def;
  const engineLvl = upgrades.engine || 0;
  const top = def.top * (1 + 0.18 * engineLvl);
  const accel = def.accel * (1 + 0.15 * engineLvl);
  accelStep(car, input, dt, top, accel);
  const grip = def.grip * (1 + 0.12 * (upgrades.handling || 0));
  const steer = steerStep(car, input, dt, grip);
  const spd = Math.abs(car.speed);
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.set(car.pos.x, 0, car.pos.z);
  car.mesh.rotation.y = car.heading;
  // A little body roll and spinning wheels, for feel.
  car.mesh.rotation.z = -steer * 0.03 * Math.min(1, spd / 15);
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 1.4;
  return car.speed;
}

export function makeCar(scene, def, x, z, heading, isPolice) {
  const mesh = buildCarMesh(def, isPolice);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    def,
    mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    isPolice: !!isPolice,
    hp: 100,
  };
}
