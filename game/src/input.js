// Input for Laguna Verde. One job: remember which keys are down and turn
// mouse drags (and touch drags) into camera yaw and pitch.
export function createInput(canvas) {
  const keys = {};
  const input = {
    keys,
    yaw: 0.6,
    pitch: 0.32,
    dragging: false,
    clicked: false,
    mouseDX: 0,
    mouseDY: 0,
    lastX: 0,
    lastY: 0,
  };

  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Keep the page from scrolling when the game uses these keys.
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => {
    // Losing focus must not leave a key stuck down.
    for (const code of Object.keys(keys)) keys[code] = false;
  });

  function dragBy(dx, dy) {
    input.yaw -= dx * 0.005;
    input.pitch = Math.max(-0.1, Math.min(0.9, input.pitch + dy * 0.004));
  }

  canvas.addEventListener('mousedown', (e) => {
    input.dragging = true;
    input.clicked = true;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
  });
  addEventListener('mouseup', () => { input.dragging = false; });
  addEventListener('mousemove', (e) => {
    if (!input.dragging) return;
    dragBy(e.clientX - input.lastX, e.clientY - input.lastY);
    input.lastX = e.clientX;
    input.lastY = e.clientY;
  });

  canvas.addEventListener('touchstart', (e) => {
    input.dragging = true;
    input.lastX = e.touches[0].clientX;
    input.lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!input.dragging) return;
    dragBy((e.touches[0].clientX - input.lastX) * 1.2, (e.touches[0].clientY - input.lastY) * 1.25);
    input.lastX = e.touches[0].clientX;
    input.lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', () => { input.dragging = false; });

  return input;
}

// True when any of the given key codes is currently held down.
export function pressed(input, ...codes) {
  return codes.some((code) => input.keys[code]);
}
