// Three.js scene, golden-hour lighting, sky and the chase camera.
// One job: own the renderer and the camera. Nothing about gameplay rules.
import * as THREE from '../vendor/three.module.min.js';

export function createRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  // ?noshadow=1 turns the shadow pass off. The automated playtest runs under
  // software rendering, where shadows are slow; the shipped game always has
  // shadows on.
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
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x8a6a4a, 0.9));
  const dusk = new THREE.PointLight(0xff9f2e, 0, 120);
  dusk.position.set(-195, 30, 0);
  scene.add(dusk);

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

  // Time of day: 0 is noon, 1 is golden hour, 2 is dusk. It drives the sky,
  // the sun colour and the pier lights.
  function setTimeOfDay(t) {
    if (t < 0.5) {
      scene.background.set(0x87ceeb);
      scene.fog.color.set(0x87ceeb);
      sun.intensity = 2.6;
      sun.color.set(0xfff2cc);
      dusk.intensity = 0;
    } else if (t < 1.5) {
      scene.background.set(0xffc98a);
      scene.fog.color.set(0xffc98a);
      sun.intensity = 2.2;
      sun.color.set(0xffd9a0);
      dusk.intensity = 0;
    } else {
      scene.background.set(0x2a3a5e);
      scene.fog.color.set(0x2a3a5e);
      sun.intensity = 0.7;
      sun.color.set(0xff9f6e);
      dusk.intensity = 1.6;
    }
  }

  // Chase camera: ease toward a point behind the target and look slightly
  // above it, so turns feel smooth instead of snapping.
  function updateCamera(target, yaw, pitch, dist, dt) {
    const desired = new THREE.Vector3(
      target.x - Math.sin(yaw) * Math.cos(pitch) * dist,
      target.y + Math.sin(pitch) * dist + 2,
      target.z - Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    cam.pos.lerp(desired, 1 - Math.pow(0.0001, dt));
    cam.look.lerp(target, 1 - Math.pow(0.00001, dt));
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look.x, cam.look.y + 1.5, cam.look.z);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, sun, setTimeOfDay, updateCamera, resize, render, cam };
}
