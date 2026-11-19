// Keyboard input. One job: track which keys are held and which were just
// pressed this frame, so the game loop can react to taps (E, G, P, F) and
// holds (WASD driving) without duplicating edge logic everywhere.

export class Input {
  constructor() {
    this.down = new Set();
    this.justPressed = new Set();
    this.onKeyDown = null;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.justPressed.add(e.code);
      if (this.onKeyDown) this.onKeyDown(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.justPressed.clear();
    });
  }

  isDown(code) {
    return this.down.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  endFrame() {
    this.justPressed.clear();
  }
}
