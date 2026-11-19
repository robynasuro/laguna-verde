// Keyboard and mouse input. One job: remember which keys are down and turn
// drags into camera yaw and pitch. Nothing here knows what the keys do.
const DRAG_YAW = 0.005;
const DRAG_PITCH = 0.004;
const SCROLL_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(canvas) {
  const keys = {};
  const input = {
    keys,
    yaw: 0.6,
    pitch: 0.32,
    dragging: false,
    clicked: false,
    lastX: 0,
    lastY: 0,
  };

  function clearKeys() {
    for (const code of Object.keys(keys)) keys[code] = false;
  }

  function dragBy(dx, dy) {
    input.yaw -= dx * DRAG_YAW;
    input.pitch = Math.max(-0.1, Math.min(0.9, input.pitch + dy * DRAG_PITCH));
  }

  function pointerDown(x, y) {
    input.dragging = true;
    input.clicked = true;
    input.lastX = x;
    input.lastY = y;
  }

  function pointerMove(x, y) {
    if (!input.dragging) return;
    dragBy(x - input.lastX, y - input.lastY);
    input.lastX = x;
    input.lastY = y;
  }

  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Stop the page scrolling when the game uses these keys.
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  // Losing focus must never leave a key stuck down.
  addEventListener('blur', clearKeys);

  canvas.addEventListener('mousedown', (e) => pointerDown(e.clientX, e.clientY));
  addEventListener('mouseup', () => { input.dragging = false; });
  addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY));

  canvas.addEventListener('touchstart', (e) => {
    pointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!input.dragging) return;
    dragBy(
      (e.touches[0].clientX - input.lastX) * 1.2,
      (e.touches[0].clientY - input.lastY) * 1.25,
    );
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
