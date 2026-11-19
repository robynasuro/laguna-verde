// Cars: the model and the driving. One job: build a low-poly car out
// of boxes, and move it like an arcade car — accelerate, brake,
// steer, drift a little, collide with the city, never flip over.

import * as THREE from 'three';
import { CONFIG } from './config.js';

const CAR_COLORS = [
  0xc0392b, 0x2e5f7a, 0xf2a541, 0x3f8f4f, 0xe8e2d0, 0x5a5a66,
  0x7d3c98, 0x16a085, 0xd35400, 0x2c3e50, 0xb03a5b, 0x8899aa,
];
const CAR_NAMES = [
  'Solano', 'Brisa GT', 'Tiburon', 'Marlin', 'Cayo', 'Palmera',
  'Verde Coupe', 'Laguna Van', 'Costa', 'Arena', 'Faro', 'Muelle',
];

export function carColorAt(i) {
  return CAR_COLORS[i % CAR_COLORS.length];
}

export function carNameAt(i) {
  return CAR_NAMES[i % CAR_NAMES.length];
}

// Build a car mesh. `police` gets a black-and-white body and a light bar.
export function makeCarMesh(color, opts = {}) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fc8d8 });
  const box = new THREE.BoxGeometry(1, 1, 1);

  function part(w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(box, mat || bodyMat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  part(2.0, 0.55, 4.4, 0, 0.55, 0); // body
  part(1.7, 0.5, 2.2, 0, 1.05, -0.2, glassMat); // cabin
  part(1.75, 0.28, 2.3, 0, 0.95, -0.2, bodyMat); // roof frame
  part(2.02, 0.25, 0.5, 0, 0.62, 2.1, darkMat); // front bumper
  part(2.02, 0.25, 0.5, 0, 0.62, -2.1, darkMat); // rear bumper
  // Headlights: two pale boxes that glow at dusk.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const hlL = part(0.4, 0.18, 0.1, -0.65, 0.7, 2.22, lightMat);
  const hlR = part(0.4, 0.18, 0.1, 0.65, 0.7, 2.22, lightMat);
  hlL.name = 'headlightL';
  hlR.name = 'headlightR';
  // Tail lights.
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  part(0.4, 0.18, 0.1, -0.65, 0.7, -2.22, tailMat);
  part(0.4, 0.18, 0.1, 0.65, 0.7, -2.22, tailMat);

  // Wheels: dark cylinders that spin with speed.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    group.add(w);
    wheels.push(w);
  }

  if (opts.police) {
    // Black and white: white doors, black hood and roof, light bar.
    part(2.02, 0.3, 1.6, 0, 0.72, 0.2, new THREE.MeshLambertMaterial({ color: 0xf2f2ee }));
    const barMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const bar = part(1.2, 0.22, 0.5, 0, 1.45, -0.2, barMat);
    bar.name = 'lightbar';
    const barB = part(0.5, 0.22, 0.5, 0.35, 1.45, -0.2, new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    barB.name = 'lightbarB';
  }

  group.userData.wheels = wheels;
  return group;
}

// Arcade driving state for one car.
export class Car {
  constructor(scene, x, z, heading, color, opts = {}) {
    this.scene = scene;
    this.mesh = makeCarMesh(color, opts);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.health = 100;
    this.color = color;
    this.name = opts.name || 'Car';
    this.police = !!opts.police;
    this.upgrades = opts.upgrades || {};
    this.stolen = false;
    this.dead = false;
  }

  get pos() {
    return { x: this.x, z: this.z };
  }

  topSpeed() {
    let top = CONFIG.carMaxSpeed;
    if (this.upgrades.engine) top *= 1.25;
    return top;
  }

  turnRate() {
    return CONFIG.carTurn * (this.upgrades.handling ? 1.3 : 1);
  }

  // input: {forward, back, left, right, brake} booleans.
  // colliders: [{x, z, hw, hd}] AABBs. bounds: {minX, maxX, minZ, maxZ}.
  update(dt, input, colliders, bounds) {
    const top = this.topSpeed();
    if (input.forward) this.speed += CONFIG.carAccel * dt;
    if (input.back) {
      this.speed -= this.speed > 0.5 ? CONFIG.carBrake * dt : CONFIG.carReverseAccel * dt;
    }
    if (input.brake) {
      this.speed -= Math.sign(this.speed) * CONFIG.carBrake * dt;
      if (Math.abs(this.speed) < 0.5) this.speed = 0;
    }
    // Drag and rolling resistance.
    this.speed -= this.speed * CONFIG.carDrag * dt;
    if (this.speed > top) this.speed = top;
    if (this.speed < -CONFIG.carMaxReverse) this.speed = -CONFIG.carMaxReverse;

    // Steering: sharper at low speed, gentle at full speed.
    const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const speedFactor = Math.min(1, Math.abs(this.speed) / 12);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    this.heading += this.steer * this.turnRate() * speedFactor * Math.sign(this.speed) * dt * 0.9;

    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const hit = this.collides(nx, nz, colliders);
    if (hit) {
      // Slide along the wall instead of stopping dead.
      const hx = this.collides(nx, this.z, colliders);
      const hz = this.collides(this.x, nz, colliders);
      if (!hx) this.x = nx;
      if (!hz) this.z = nz;
      if (hx && hz) this.speed *= 0.4;
      else this.speed *= 0.85;
    } else {
      this.x = nx;
      this.z = nz;
    }
    // Stay inside the city.
    this.x = Math.max(bounds.minX + 6, Math.min(bounds.maxX - 6, this.x));
    this.z = Math.max(bounds.minZ + 6, Math.min(bounds.maxZ - 6, this.z));

    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    for (const w of this.mesh.userData.wheels) {
      w.rotation.x += this.speed * dt * 2.2;
    }
    // Brake lights flare when braking.
    const flare = input.brake ? 1 : 0;
    this.mesh.traverse((o) => {
      if (o.material && o.material.color && o.name === 'taillight') {
        o.material.color.setHex(flare ? 0xff6666 : 0xff2a2a);
      }
    });
  }

  collides(x, z, colliders) {
    const r = 1.6;
    for (const c of colliders) {
      if (Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r) return true;
    }
    return false;
  }

  damage(amount) {
    const mult = this.upgrades.armor ? 0.5 : 1;
    this.health -= amount * mult;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  remove() {
    this.scene.remove(this.mesh);
  }
}

// Circle vs AABB push-out, shared by the player on foot and the AI.
export function resolveCircleCollision(pos, radius, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.x - c.hw, Math.min(pos.x, c.x + c.hw));
    const cz = Math.max(c.z - c.hd, Math.min(pos.z, c.z + c.hd));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        pos.x = c.x + c.hw + radius;
      }
    }
  }
  return pos;
}
