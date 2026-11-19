// Renderer, lights, sky and the chase camera. One job: own the Three.js
// scene and put the camera where it belongs. No gameplay rules live here.
import * as THREE from '../vendor/three.module.min.js';

// Sky, fog, sun and pier light for each time of day: 0 noon, 1 golden hour,
// 2 dusk. One table drives setTimeOfDay, so the look stays consistent.
const DAY_PHASES = [
  { sky: 0x87ceeb, sun: 0xfff2cc, sunPower: 2.6, pier: 0 },
  { sky: 0xffc98a, sun: 0xffd9a0, sunPower: 2.2, pier: 0 },
  { sky: 0x2a3a5e, sun: 0xff9f6e, sunPower: 0.7, pier: 1.6 },
];

export function createRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  // ?noshadow=1 switches the shadow pass off. Headless playtests run under
  // software rendering where shadows are slow; the shipped game keeps them.
  renderer.shadowMap.enabled = !new URLSearchParams(location.search).has('noshadow');
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DAY_PHASES[1].sky);
  scene.fog = new THREE.Fog(DAY_PHASES[1].sky, 220, 620);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);

  // Low golden sun from the west, so the lagoon side catches the light.
  const sun = new THREE.DirectionalLight(DAY_PHASES[1].sun, DAY_PHASES[1].sunPower);
  sun.position.set(-180, 120, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, far: 700 });
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x8a6a4a, 0.9));
  // Warm point light over the pier that only matters at dusk.
  const pierGlow = new THREE.PointLight(0xff9f2e, 0, 120);
  pierGlow.position.set(-195, 30, 0);
  scene.add(pierGlow);

  // Smoothed camera state, so the view eases instead of snapping.
  const cam = {
    pos: new THREE.Vector3(0, 10, 20),
    look: new THREE.Vector3(),
    yaw: 0.6,
    pitch: 0.32,
  };

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  function setTimeOfDay(t) {
    const phase = DAY_PHASES[Math.max(0, Math.min(2, t))];
    scene.background.set(phase.sky);
    scene.fog.color.set(phase.sky);
    sun.intensity = phase.sunPower;
    sun.color.set(phase.sun);
    pierGlow.intensity = phase.pier;
  }

  // Chase camera: ease toward a point behind the target, look a little
  // above it. Turns feel smooth because the camera lags the heading.
  function updateCamera(target, yaw, pitch, dist, dt) {
    const desired = new THREE.Vector3(
      target.x - Math.sin(yaw) * Math.cos(pitch) * dist,
      target.y + Math.sin(pitch) * dist + 2,
      target.z - Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    const ease = 1 - Math.exp(-6 * dt);
    const lookEase = 1 - Math.exp(-8 * dt);
    cam.pos.lerp(desired, ease);
    cam.look.lerp(target, lookEase);
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look.x, cam.look.y + 1.5, cam.look.z);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, sun, setTimeOfDay, updateCamera, resize, render, cam };
}
