// Keyboard + mouse input. Tracks held keys and one-shot presses so the game
// loop can ask "is W down" and "was E just pressed" without event soup.

export function createInput() {
  const down = new Set();
  const pressed = new Set();
  let mouseDX = 0;
  let mouseDY = 0;
  let locked = false;

  function onKeyDown(e) {
    if (e.repeat) return;
    down.add(e.code);
    pressed.add(e.code);
  }
  function onKeyUp(e) {
    down.delete(e.code);
  }
  function onMouseMove(e) {
    if (!locked) return;
    mouseDX += e.movementX || 0;
    mouseDY += e.movementY || 0;
  }
  function onMouseDown() {
    // Clicking the canvas grabs the pointer for mouse look.
    const canvas = document.getElementById('game');
    if (canvas && canvas.requestPointerLock) {
      try {
        canvas.requestPointerLock();
      } catch (err) {
        /* pointer lock is optional */
      }
    }
  }
  function onLockChange() {
    locked = document.pointerLockElement != null;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  document.addEventListener('pointerlockchange', onLockChange);

  return {
    isDown(code) {
      return down.has(code);
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    consume(code) {
      const had = pressed.has(code);
      pressed.delete(code);
      return had;
    },
    takeMouse() {
      const dx = mouseDX;
      const dy = mouseDY;
      mouseDX = 0;
      mouseDY = 0;
      return { dx, dy };
    },
    // Test / automation hook: pretend a key is held or pressed.
    inject(code, kind) {
      if (kind === 'down') down.add(code);
      else if (kind === 'up') down.delete(code);
      else if (kind === 'press') pressed.add(code);
    },
    endFrame() {
      pressed.clear();
    },
  };
}
