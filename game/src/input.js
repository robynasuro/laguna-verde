// Keyboard and mouse. One job: turn raw DOM events into a clean
// per-frame input state — held keys, pressed-this-frame edges — so
// the game logic never touches an event listener directly.

import { KEYS } from './config.js';

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.anyKey = false;
    this.enabled = true;
    this.onKeyDown = (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space') e.preventDefault();
      if (!e.repeat) {
        this.pressed.add(e.code);
        this.anyKey = true;
      }
      this.held.add(e.code);
    };
    this.onKeyUp = (e) => {
      this.held.delete(e.code);
    };
    this.onMouseMove = (e) => {
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    };
    this.onBlur = () => {
      this.held.clear();
      this.pressed.clear();
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('blur', this.onBlur);
  }

  isDown(codes) {
    for (const c of codes) if (this.held.has(c)) return true;
    return false;
  }

  wasPressed(codes) {
    for (const c of codes) if (this.pressed.has(c)) return true;
    return false;
  }

  get forward() { return this.isDown(KEYS.forward); }
  get back() { return this.isDown(KEYS.back); }
  get left() { return this.isDown(KEYS.left); }
  get right() { return this.isDown(KEYS.right); }
  get brake() { return this.isDown(KEYS.brake); }
  get enterCar() { return this.wasPressed(KEYS.enterCar); }
  get shoot() { return this.wasPressed(KEYS.shoot); }
  get garage() { return this.wasPressed(KEYS.garage); }
  get radio() { return this.wasPressed(KEYS.radio); }
  get pause() { return this.wasPressed(KEYS.pause); }
  get timeOfDay() { return this.wasPressed(KEYS.timeOfDay); }
  get mute() { return this.wasPressed(KEYS.mute); }
  get mission() { return this.wasPressed(KEYS.mission); }

  // Call once at the end of each frame: edges live for one frame only.
  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.anyKey = false;
  }

  // Feed a key from outside (tests, shots, touch): same as a real press.
  simulate(code, down) {
    if (down) {
      this.held.add(code);
      this.pressed.add(code);
    } else {
      this.held.delete(code);
    }
  }
}
