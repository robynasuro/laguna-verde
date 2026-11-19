// Car model and driving physics. One job: build a boxy low-poly car mesh
// and move it like an arcade car — throttle, brake, reverse, steering that
// bites harder the faster you go, and a top speed the garage can raise.

import * as THREE from '../vendor/three.module.min.js';
import { CAR } from './config.js';

export function makeCarMesh(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fc8d8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.4, -0.3);
  cabin.castShadow = true;
  group.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.7), bodyMat);
  nose.position.set(0, 0.6, 2.4);
  group.add(nose);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.3, 0.3), darkMat);
  bumperF.position.set(0, 0.45, 2.75);
  group.add(bumperF);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.3, 0.3), darkMat);
  bumperR.position.set(0, 0.45, -2.75);
  group.add(bumperR);
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x554411 });
  for (const sx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    hl.position.set(sx, 0.75, 2.78);
    group.add(hl);
  }
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
  }
  return { group, wheels };
}

export function createCar(x, z, yaw, color) {
  const { group, wheels } = makeCarMesh(color);
  const car = {
    x, z, yaw, speed: 0, color, group, wheels,
    update(dt, throttle, steer, brake, topSpeed = CAR.topSpeed, steerMult = 1) {
      const accel = CAR.accel * (throttle > 0 ? throttle : 0);
      const rev = throttle < 0 ? CAR.accel * 0.6 : 0;
      this.speed += (accel - rev) * dt;
      if (brake) this.speed -= CAR.brake * dt * Math.sign(this.speed || 1);
      this.speed -= this.speed * CAR.drag * dt;
      if (this.speed > topSpeed) this.speed = topSpeed;
      if (this.speed < -CAR.reverseTop) this.speed = -CAR.reverseTop;
      if (Math.abs(this.speed) < 0.05 && throttle === 0 && !brake) this.speed = 0;
      const steerAuthority = Math.min(1, Math.abs(this.speed) / 8);
      this.yaw += steer * CAR.steerRate * steerMult * steerAuthority * dt * (this.speed >= 0 ? 1 : -1);
      this.x += Math.sin(this.yaw) * this.speed * dt;
      this.z += Math.cos(this.yaw) * this.speed * dt;
      this.group.position.set(this.x, 0, this.z);
      this.group.rotation.y = this.yaw;
      const spin = (this.speed * dt) / 0.42;
      for (const w of this.wheels) w.rotation.x += spin;
    },
  };
  car.group.position.set(x, 0, z);
  car.group.rotation.y = yaw;
  return car;
}
