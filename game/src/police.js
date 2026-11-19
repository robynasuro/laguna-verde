// Wanted and police. One job: the heat — stars go up when the player
// commits a crime in sight, patrol cars chase and ram, a helicopter
// with a searchlight joins at three stars, and laying low cools it off.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Car, makeCarMesh } from './cars.js';

export class Police {
  constructor(scene, layout, rng) {
    this.scene = scene;
    this.layout = layout;
    this.rng = rng;
    this.stars = 0;
    this.heat = 0; // 0..100 inside the current star level
    this.coolTimer = 0;
    this.cars = [];
    this.heli = null;
    this.heliBeam = null;
    this.sirenOn = false;
    this.lastCrime = '';
  }

  addHeat(amount, crime) {
    this.heat += amount;
    this.lastCrime = crime;
    while (this.heat >= 100 && this.stars < CONFIG.wantedMax) {
      this.heat -= 100;
      this.stars++;
    }
    if (this.stars >= CONFIG.wantedMax) this.heat = Math.min(this.heat, 99);
    this.coolTimer = CONFIG.wantedDecaySeconds;
    this.syncUnits();
  }

  setStars(n) {
    this.stars = Math.max(0, Math.min(CONFIG.wantedMax, n));
    this.heat = 0;
    this.coolTimer = CONFIG.wantedDecaySeconds;
    this.syncUnits();
  }

  // Spawn or remove units to match the star level.
  syncUnits() {
    const want = this.stars * CONFIG.policePerStar;
    while (this.cars.length < want) this.spawnCar();
    while (this.cars.length > want) {
      const c = this.cars.pop();
      c.remove();
    }
    if (this.stars >= CONFIG.heliAtStars && !this.heli) this.spawnHeli();
    if (this.stars < CONFIG.heliAtStars && this.heli) {
      this.scene.remove(this.heli);
      this.scene.remove(this.heliBeam);
      this.heli = null;
      this.heliBeam = null;
    }
    this.sirenOn = this.stars > 0;
  }

  spawnCar() {
    const node = this.layout.randomRoadPoint(this.rng);
    const car = new Car(this.scene, node.x, node.z, 0, 0x111111, {
      police: true, name: 'Patrol',
    });
    car.topSpeedOverride = CONFIG.policeTopSpeed;
    this.cars.push(car);
  }

  spawnHeli() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf2f2ee });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const body = new THREE.Mesh(box, bodyMat);
    body.scale.set(2.2, 1.4, 4.5);
    const cabin = new THREE.Mesh(box, whiteMat);
    cabin.scale.set(1.8, 1.0, 2.0);
    cabin.position.set(0, 0.1, 1.2);
    const tail = new THREE.Mesh(box, bodyMat);
    tail.scale.set(0.5, 0.5, 4);
    tail.position.set(0, 0.2, -3.8);
    const rotor = new THREE.Mesh(box, new THREE.MeshLambertMaterial({ color: 0x333333 }));
    rotor.scale.set(9, 0.12, 0.5);
    rotor.position.y = 1.1;
    rotor.name = 'rotor';
    const spot = new THREE.SpotLight(0xfff2b0, 60, 90, 0.32, 0.5, 1.2);
    spot.position.set(0, -0.8, 0);
    group.add(body, cabin, tail, rotor, spot);
    group.userData.spot = spot;
    group.userData.rotor = rotor;
    this.scene.add(group);
    this.heli = group;

    // The searchlight cone the screenshots show.
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(7, 55, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2b0, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
      }),
    );
    beam.rotation.x = Math.PI;
    beam.position.y = -27;
    group.add(beam);
    this.heliBeam = beam;
  }

  // Police cars chase the player's position; the helicopter circles
  // above it and keeps the spotlight on.
  update(dt, t, playerPos, playerSpeed) {
    // Cooling off: no crime for a while sheds a star.
    if (this.stars > 0) {
      this.coolTimer -= dt;
      if (this.coolTimer <= 0) {
        this.stars--;
        this.heat = 0;
        this.coolTimer = CONFIG.wantedDecaySeconds;
        this.syncUnits();
      }
    }

    for (const car of this.cars) {
      const dx = playerPos.x - car.x;
      const dz = playerPos.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 220) {
        // Too far behind: respawn ahead of the player on a nearby road.
        const node = this.layout.nearestRoadPoint(playerPos.x, playerPos.z);
        car.x = node.x + 20;
        car.z = node.z + 20;
        car.speed = 0;
      }
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += THREE.MathUtils.clamp(dh, -2.2 * dt, 2.2 * dt);
      const top = Math.min(CONFIG.policeTopSpeed, 20 + dist * 0.12);
      const wantSpeed = dist < 6 ? 0 : top;
      car.speed += (wantSpeed - car.speed) * Math.min(1, dt * 1.5);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.2;
      // Light bar flashes red and blue.
      const bar = car.mesh.getObjectByName('lightbar');
      const barB = car.mesh.getObjectByName('lightbarB');
      const on = Math.sin(t * 10) > 0;
      if (bar) bar.material.color.setHex(on ? 0xff2222 : 0x550000);
      if (barB) barB.material.color.setHex(on ? 0x000055 : 0x2244ff);
    }

    if (this.heli) {
      const angle = t * 0.45;
      const hx = playerPos.x + Math.cos(angle) * 26;
      const hz = playerPos.z + Math.sin(angle) * 26;
      this.heli.position.set(hx, 52 + Math.sin(t * 0.9) * 2, hz);
      this.heli.rotation.y = Math.atan2(playerPos.x - hx, playerPos.z - hz);
      this.heli.userData.rotor.rotation.y = t * 22;
      const spot = this.heli.userData.spot;
      spot.target.position.set(playerPos.x, 0, playerPos.z);
      this.scene.add(spot.target);
      // The beam follows the player.
      this.heli.lookAt(playerPos.x, 0, playerPos.z);
    }
  }

  // How close the nearest unit is, for the HUD's danger feel.
  nearestDistance(playerPos) {
    let best = Infinity;
    for (const car of this.cars) {
      best = Math.min(best, Math.hypot(car.x - playerPos.x, car.z - playerPos.z));
    }
    return best;
  }

  clear() {
    this.stars = 0;
    this.heat = 0;
    this.syncUnits();
  }
}
