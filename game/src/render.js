// Three.js scene, golden-hour lighting, sky and the chase camera.
// One job: own the renderer and the camera, nothing about gameplay rules.
import * as THREE from '../vendor/three.module.js';

export function createRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  // ?noshadow=1 disables the shadow pass (used by the automated playtest under
  // software rendering; the shipped game always renders shadows).
  renderer.shadowMap.enabled = !new URLSearchParams(location.search).has('noshadow');
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffc98a);
  scene.fog = new THREE.Fog(0xffc98a, 220, 620);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);

  const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
  sun.position.set(-180, 120, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x8a6a4a, 0.9));
  const dusk = new THREE.PointLight(0xff9f2e, 0, 120);
  dusk.position.set(-195, 30, 0); scene.add(dusk);

  const cam = { pos: new THREE.Vector3(0, 10, 20), look: new THREE.Vector3(), yaw: 0.6, pitch: 0.32 };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  // Time of day: 0 = noon, 1 = golden hour, 2 = dusk. Drives sun colour and headlights.
  function setTimeOfDay(t) {
    if (t < 0.5) { scene.background.set(0x87ceeb); scene.fog.color.set(0x87ceeb); sun.intensity = 2.6; sun.color.set(0xfff2cc); dusk.intensity = 0; }
    else if (t < 1.5) { scene.background.set(0xffc98a); scene.fog.color.set(0xffc98a); sun.intensity = 2.2; sun.color.set(0xffd9a0); dusk.intensity = 0; }
    else { scene.background.set(0x2a3a5e); scene.fog.color.set(0x2a3a5e); sun.intensity = 0.7; sun.color.set(0xff9f6e); dusk.intensity = 1.6; }
  }
  function updateCamera(target, yaw, pitch, dist, dt) {
    const desired = new THREE.Vector3(
      target.x - Math.sin(yaw) * Math.cos(pitch) * dist,
      target.y + Math.sin(pitch) * dist + 2,
      target.z - Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    const k = 1 - Math.pow(0.0001, dt);
    cam.pos.lerp(desired, k);
    cam.look.lerp(target, 1 - Math.pow(0.00001, dt));
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look.x, cam.look.y + 1.5, cam.look.z);
  }
  function render() { renderer.render(scene, camera); }
  return { renderer, scene, camera, sun, setTimeOfDay, updateCamera, resize, render, cam };
}
