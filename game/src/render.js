// Renderer, lights and camera. One job: own the Three.js scene, the
// golden-hour / dusk / night lighting, and the chase, front, aerial and
// cover cameras the game and the screenshots use.

import * as THREE from '../vendor/three.module.min.js';

const SKIES = {
  golden: { bg: 0xffd9a0, fog: 0xffd9a0, sun: 0xffc46a, sunI: 1.5, amb: 0.55, ambColor: 0xffe0b8 },
  dusk: { bg: 0xe8906a, fog: 0xe8906a, sun: 0xff7a40, sunI: 1.1, amb: 0.48, ambColor: 0xffb090 },
  night: { bg: 0x1a2340, fog: 0x1a2340, sun: 0x8aa0ff, sunI: 0.5, amb: 0.22, ambColor: 0x8090b8 },
};

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(1280, 720, false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKIES.golden.bg);
    this.scene.fog = new THREE.Fog(SKIES.golden.fog, 180, 520);
    this.camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 900);
    this.camera.position.set(0, 10, 20);
    this.sun = new THREE.DirectionalLight(SKIES.golden.sun, SKIES.golden.sunI);
    this.sun.position.set(120, 140, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -260;
    this.sun.shadow.camera.right = 260;
    this.sun.shadow.camera.top = 260;
    this.sun.shadow.camera.bottom = -260;
    this.sun.shadow.camera.far = 600;
    this.scene.add(this.sun);
    this.ambient = new THREE.AmbientLight(SKIES.golden.ambColor, SKIES.golden.amb);
    this.scene.add(this.ambient);
    this.mode = 'chase';
    this.coverPos = new THREE.Vector3(35, 12, 145);
    this.coverTarget = new THREE.Vector3(-40, 4, 70);
    this.aerialPos = new THREE.Vector3(60, 190, 190);
    this.aerialTarget = new THREE.Vector3(-20, 0, 0);
    this.smoothPos = new THREE.Vector3(0, 10, 20);
    this.smoothLook = new THREE.Vector3(0, 2, 0);
    this.timeOfDay = 'golden';
  }

  setTimeOfDay(name) {
    const s = SKIES[name] || SKIES.golden;
    this.timeOfDay = name;
    this.scene.background.setHex(s.bg);
    this.scene.fog.color.setHex(s.fog);
    this.sun.color.setHex(s.sun);
    this.sun.intensity = s.sunI;
    this.ambient.color.setHex(s.ambColor);
    this.ambient.intensity = s.amb;
  }

  setCameraMode(mode) {
    this.mode = mode;
  }

  // focus: {x, z, yaw} of the thing the camera follows; front: chase from ahead.
  updateCamera(dt, focus, speed) {
    const cam = this.camera;
    const fwd = { x: Math.sin(focus.yaw), z: Math.cos(focus.yaw) };
    let wantPos, wantLook;
    if (this.mode === 'aerial') {
      wantPos = this.aerialPos;
      wantLook = this.aerialTarget;
    } else if (this.mode === 'cover') {
      wantPos = this.coverPos;
      wantLook = this.coverTarget;
    } else if (this.mode === 'front') {
      wantPos = new THREE.Vector3(focus.x + fwd.x * 15, 4.2, focus.z + fwd.z * 15);
      wantLook = new THREE.Vector3(focus.x - fwd.x * 4, 2, focus.z - fwd.z * 4);
    } else {
      const dist = 10 + Math.min(4, Math.abs(speed || 0) * 0.08);
      wantPos = new THREE.Vector3(focus.x - fwd.x * dist, 4.6, focus.z - fwd.z * dist);
      wantLook = new THREE.Vector3(focus.x + fwd.x * 8, 2, focus.z + fwd.z * 8);
    }
    const k = this.mode === 'chase' || this.mode === 'front' ? Math.min(1, dt * 5) : 1;
    this.smoothPos.lerp(wantPos, k);
    this.smoothLook.lerp(wantLook, k);
    cam.position.copy(this.smoothPos);
    cam.lookAt(this.smoothLook);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
