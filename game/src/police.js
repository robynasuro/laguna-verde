// Wanted level and police response. One job: turn a wanted level into
// patrol cars that chase the player, a helicopter at three stars and up,
// and a wanted level that cools off when the player slips away. A ram only
// ever slows the player once per car per 1.5 seconds, so chases stay dynamic
// instead of pinning the car to zero.

import * as THREE from '../vendor/three.module.min.js';
import { makeCarMesh } from './cars.js';
import { CONFIG } from './config.js';
import { mulberry32, rand } from './random.js';

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(55);
    this.wanted = 0;
    this.cars = [];
    this.spawnTimer = 0;
    this.evadeTimer = 0;
    this.heli = this.buildHeli();
    this.heli.visible = false;
    this.scene.add(this.heli);
    this.rotor = this.heli.userData.rotor;
  }

  buildHeli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6), new THREE.MeshLambertMaterial({ color: CONFIG.colors.heli }));
    body.castShadow = true;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 5), new THREE.MeshLambertMaterial({ color: CONFIG.colors.heli }));
    tail.position.set(0, 0.3, -5);
    g.add(tail);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 1.6), new THREE.MeshLambertMaterial({ color: 0x9fc8d8 }));
    glass.position.set(0, 0.4, 2.6);
    g.add(glass);
    const rotor = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.5), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    rotor.add(blade);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 11), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    rotor.add(blade2);
    rotor.position.y = 1.2;
    g.add(rotor);
    g.userData.rotor = rotor;
    const skid = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 4.5), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    skid.position.y = -1.1;
    g.add(skid);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x888888 }));
    lamp.position.y = -1.4;
    g.add(lamp);
    return g;
  }

  addWanted(n) {
    this.wanted = Math.max(0, Math.min(CONFIG.maxWanted, this.wanted + n));
    this.evadeTimer = 0;
  }

  spawnCar(playerPos) {
    const { group } = makeCarMesh(CONFIG.colors.policeCar);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x550000 }));
    bar.position.set(0, 1.85, -0.3);
    group.add(bar);
    const a = this.rng() * Math.PI * 2;
    const x = playerPos.x + Math.cos(a) * rand(this.rng, 35, 55);
    const z = playerPos.z + Math.sin(a) * rand(this.rng, 35, 55);
    group.position.set(x, 0, z);
    this.scene.add(group);
    const car = { group, x, z, yaw: 0, speed: 0, ramCooldown: 0 };
    this.cars.push(car);
    return car;
  }

  update(dt, playerPos, playerCar) {
    const target = playerCar || playerPos;
    // Spawn up to one car per second until the count matches the wanted level.
    if (this.wanted > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.cars.length < Math.min(this.wanted, 5)) {
        this.spawnCar(target);
        this.spawnTimer = 1;
      }
    }
    let nearest = Infinity;
    for (const car of this.cars) {
      const dx = target.x - car.x;
      const dz = target.z - car.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);
      const wantYaw = Math.atan2(dx, dz);
      let dyaw = wantYaw - car.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      car.yaw += Math.max(-2.2 * dt, Math.min(2.2 * dt, dyaw));
      const speed = this.wanted >= 3 ? 22 : 18;
      car.speed += (speed - car.speed) * Math.min(1, dt * 0.8);
      car.x += Math.sin(car.yaw) * car.speed * dt;
      car.z += Math.cos(car.yaw) * car.speed * dt;
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.yaw;
      car.ramCooldown -= dt;
      if (dist < 4.5 && car.ramCooldown <= 0 && playerCar) {
        playerCar.speed *= 0.85;
        car.ramCooldown = 1.5;
      }
    }
    // Wanted cools off when no patrol car is close for a while.
    if (this.wanted > 0) {
      if (nearest > 45) {
        this.evadeTimer += dt;
        if (this.evadeTimer > 12) {
          this.wanted -= 1;
          this.evadeTimer = 0;
        }
      } else {
        this.evadeTimer = 0;
      }
    }
    // Trim extra cars when the wanted level drops.
    while (this.cars.length > this.wanted) {
      const car = this.cars.pop();
      this.scene.remove(car.group);
    }
    // Helicopter at three stars and up, hovering above the player.
    if (this.wanted >= 3) {
      this.heli.visible = true;
      this.heli.position.x += (target.x - this.heli.position.x) * Math.min(1, dt * 1.2);
      this.heli.position.z += (target.z - this.heli.position.z) * Math.min(1, dt * 1.2);
      this.heli.position.y = 40;
      this.heli.rotation.y += dt * 0.4;
      this.rotor.rotation.y += dt * 18;
    } else {
      this.heli.visible = false;
    }
  }
}
