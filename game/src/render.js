// The renderer. One job: the Three.js renderer, the golden-hour
// lighting, the sky, and the chase camera that follows the player
// smoothly — on foot or in a car — plus the time-of-day cycle.

import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Render {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.skyHorizon);
    this.scene.fog = new THREE.Fog(CONFIG.fogColor, CONFIG.fogNear, CONFIG.fogFar);

    this.camera = new THREE.PerspectiveCamera(
      62, window.innerWidth / window.innerHeight, 0.1, 2000,
    );
    this.camera.position.set(0, 30, -60);

    // Golden-hour sun: low, warm, from the west over the lagoon.
    this.sun = new THREE.DirectionalLight(CONFIG.sunColor, CONFIG.sunIntensity);
    this.sun.position.set(-300, 180, -120);
    this.scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0x9fc8e8, 0x8a6a4a, 0.9);
    this.scene.add(this.hemi);

    // Sky dome: a big gradient sphere that never moves with the camera.
    const skyGeo = new THREE.SphereGeometry(1200, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(CONFIG.skyTop) },
        horizon: { value: new THREE.Color(CONFIG.skyHorizon) },
        sunDir: { value: new THREE.Vector3(-0.8, 0.35, -0.3).normalize() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(horizon, top, pow(h, 0.7));
          float sun = pow(max(dot(normalize(vDir), sunDir), 0.0), 24.0);
          col += vec3(1.0, 0.75, 0.4) * sun * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);

    this.timeOfDay = 0.72; // 0 = dawn, 0.5 = noon, 0.72 = golden hour, 1 = night
    this.camPos = new THREE.Vector3(0, 30, -60);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.shake = 0;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // The sun slides across the sky as timeOfDay moves; golden hour is
  // the warm default, dusk turns the headlights on.
  setTimeOfDay(t) {
    this.timeOfDay = t;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const height = Math.sin(angle);
    this.sun.position.set(Math.cos(angle) * 400, 60 + height * 260, -140);
    const warm = 1 - Math.abs(height) * 0.4;
    this.sun.color.setHSL(0.08, 0.85, 0.55 + warm * 0.15);
    this.sun.intensity = 1.2 + Math.max(0, height) * 1.4;
    this.hemi.intensity = 0.5 + Math.max(0, height) * 0.5;
    const dusk = height < 0.25;
    this.scene.fog.color.setHex(dusk ? 0x8a6a72 : CONFIG.fogColor);
    return dusk;
  }

  get isDusk() {
    const angle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    return Math.sin(angle) < 0.25;
  }

  // Chase camera: behind and above the target, smoothed, with a
  // little shake on hard impacts.
  follow(target, heading, dt, inCar) {
    const dist = inCar ? 13 : 9;
    const height = inCar ? 5.2 : 4.2;
    const back = new THREE.Vector3(
      -Math.sin(heading) * dist,
      height,
      -Math.cos(heading) * dist,
    );
    const want = new THREE.Vector3(target.x, 0, target.z).add(back);
    const k = 1 - Math.exp(-dt * 5);
    this.camPos.lerp(want, k);
    const look = new THREE.Vector3(
      target.x + Math.sin(heading) * 6,
      1.6,
      target.z + Math.cos(heading) * 6,
    );
    this.camLook.lerp(look, 1 - Math.exp(-dt * 7));
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.01) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
      this.shake *= Math.exp(-dt * 6);
    }
    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    this.camera.lookAt(this.camLook.x, this.camLook.y, this.camLook.z);
    this.sky.position.copy(this.camera.position);
  }

  // A fixed cinematic camera, for shots and the menu backdrop.
  setCamera(pos, look) {
    this.camPos.set(pos.x, pos.y, pos.z);
    this.camLook.set(look.x, look.y, look.z);
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.camera.lookAt(look.x, look.y, look.z);
    this.sky.position.copy(this.camera.position);
  }

  addShake(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
