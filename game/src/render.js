// Three.js scene, lighting, sky and the chase camera. One place owns the
// renderer so the rest of the game never touches WebGL directly.

import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.sky.golden);
  scene.fog = new THREE.Fog(0xffd9a0, 130, 460);
  return scene;
}

// Golden-hour sun + a soft sky fill. setTimeOfDay re-aims and re-colors them.
export function createLights(scene) {
  const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
  sun.position.set(-80, 60, -120);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffe0b3, 0x4a6b5a, 0.9);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);
  return { sun, hemi, ambient };
}

export function setTimeOfDay(lights, scene, mode) {
  const sky = CONFIG.sky;
  if (mode === 'golden') {
    scene.background.setHex(sky.golden);
    scene.fog.color.setHex(0xffd9a0);
    lights.sun.color.setHex(0xffb36b);
    lights.sun.intensity = 2.4;
    lights.sun.position.set(-80, 60, -120);
    lights.hemi.intensity = 0.9;
  } else if (mode === 'dusk') {
    scene.background.setHex(sky.dusk);
    scene.fog.color.setHex(0xe08a5a);
    lights.sun.color.setHex(0xff7a3c);
    lights.sun.intensity = 1.5;
    lights.sun.position.set(-140, 22, -60);
    lights.hemi.intensity = 0.55;
  } else if (mode === 'night') {
    scene.background.setHex(sky.night);
    scene.fog.color.setHex(0x1b2340);
    lights.sun.color.setHex(0x8fa8ff);
    lights.sun.intensity = 0.5;
    lights.sun.position.set(60, 90, 40);
    lights.hemi.intensity = 0.3;
  } else {
    scene.background.setHex(sky.day);
    scene.fog.color.setHex(0xbfd9e8);
    lights.sun.color.setHex(0xfff2d8);
    lights.sun.intensity = 2.2;
    lights.sun.position.set(40, 120, 60);
    lights.hemi.intensity = 1.0;
  }
}

// Smooth chase camera: sits behind and above a moving target, lerps into
// place so it never snaps. target = { x, z, angle, speed }.
export function updateChaseCamera(camera, target, dt, distance, height) {
  const backX = -Math.sin(target.angle) * distance;
  const backZ = -Math.cos(target.angle) * distance;
  const wantX = target.x + backX;
  const wantZ = target.z + backZ;
  const wantY = height + Math.min(target.speed * 0.04, 1.2);
  const k = 1 - Math.exp(-dt * 5);
  camera.position.x += (wantX - camera.position.x) * k;
  camera.position.y += (wantY - camera.position.y) * k;
  camera.position.z += (wantZ - camera.position.z) * k;
  camera.lookAt(target.x, 1.6, target.z);
}

// Third-person camera for walking: orbits the player with the mouse.
export function updateWalkCamera(camera, player, dt, yaw, pitch) {
  const dist = 7;
  const cx = player.x - Math.sin(yaw) * Math.cos(pitch) * dist;
  const cz = player.z - Math.cos(yaw) * Math.cos(pitch) * dist;
  const cy = 2.4 + Math.sin(pitch) * dist;
  const k = 1 - Math.exp(-dt * 10);
  camera.position.x += (cx - camera.position.x) * k;
  camera.position.y += (cy - camera.position.y) * k;
  camera.position.z += (cz - camera.position.z) * k;
  camera.lookAt(player.x, 1.7, player.z);
}
