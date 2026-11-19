// Cars: the low-poly car model and arcade driving physics.
// One job: build a car mesh and move it. Ownership (player / traffic / police)
// lives in main.js, traffic.js and police.js.
import * as THREE from '../vendor/three.module.js';

export const CAR_DEFS = [
  { name: 'Sol hatchback', color: 0x3ec6ff, top: 26, accel: 14, grip: 1.0 },
  { name: 'Verde sedan', color: 0xff5d5d, top: 30, accel: 16, grip: 1.05 },
  { name: 'Tiburon coupe', color: 0xffd23e, top: 36, accel: 19, grip: 1.15 },
  { name: 'Laguna pickup', color: 0x7dff8a, top: 28, accel: 15, grip: 0.95 },
  { name: 'Marina van', color: 0xf2f2f2, top: 22, accel: 11, grip: 0.9 },
];

export function buildCarMesh(def, isPolice) {
  const g = new THREE.Group();
  const bodyColor = isPolice ? 0x1a2a33 : def.color;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), new THREE.MeshLambertMaterial({ color: bodyColor }));
  body.position.y = 0.65; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), new THREE.MeshLambertMaterial({ color: isPolice ? 0xffffff : 0x223344 }));
  cabin.position.set(0, 1.3, -0.2); cabin.castShadow = true; g.add(cabin);
  if (isPolice) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.2, 4.44), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    stripe.position.y = 0.85; g.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.75, -0.2); g.add(bar);
    g.userData.lightBar = bar;
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  g.userData.wheels = [];
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); g.userData.wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    h.position.set(x, 0.7, 2.22); g.add(h);
  }
  const light = new THREE.SpotLight(0xfff2a0, 0, 40, 0.5, 0.5);
  light.position.set(0, 1, 2.2);
  light.target.position.set(0, 0, 12);
  g.add(light); g.add(light.target);
  g.userData.headlight = light;
  return g;
}

// Arcade driving: speed along heading, steering scales with speed, upgrades boost it.
export function driveCar(car, input, dt, upgrades) {
  const def = car.def;
  const top = def.top * (1 + 0.18 * (upgrades.engine || 0));
  const accel = def.accel * (1 + 0.15 * (upgrades.engine || 0));
  const fwd = input.forward ? 1 : 0, back = input.back ? 1 : 0;
  if (fwd) car.speed += accel * dt;
  else if (back) car.speed -= (car.speed > 0.5 ? accel * 1.4 : accel * 0.6) * dt;
  else car.speed *= Math.pow(0.4, dt); // coast
  if (input.brake) car.speed *= Math.pow(0.05, dt);
  car.speed = Math.max(-top * 0.4, Math.min(top, car.speed));
  const grip = def.grip * (1 + 0.12 * (upgrades.handling || 0));
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const spd = Math.abs(car.speed);
  if (spd > 0.2) car.heading += steer * 1.9 * grip * dt * Math.sign(car.speed) * Math.min(1, spd / 8);
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.set(car.pos.x, 0, car.pos.z);
  car.mesh.rotation.y = car.heading;
  // Body roll and wheel spin for feel.
  car.mesh.rotation.z = -steer * 0.03 * Math.min(1, spd / 15);
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 1.4;
  return car.speed;
}

export function makeCar(scene, def, x, z, heading, isPolice) {
  const mesh = buildCarMesh(def, isPolice);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  scene.add(mesh);
  return { def, mesh, pos: new THREE.Vector3(x, 0, z), heading, speed: 0, isPolice: !!isPolice, hp: 100 };
}
