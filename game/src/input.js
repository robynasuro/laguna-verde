// Keyboard and mouse input. One job: track keys and camera drag.
export function createInput(canvas) {
  const keys = {};
  const input = { keys, yaw: 0.6, pitch: 0.32, dragging: false, clicked: false, mouseDX: 0, mouseDY: 0 };
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
  canvas.addEventListener('mousedown', (e) => { input.dragging = true; input.clicked = true; input.lastX = e.clientX; input.lastY = e.clientY; });
  addEventListener('mouseup', () => { input.dragging = false; });
  addEventListener('mousemove', (e) => {
    if (!input.dragging) return;
    const dx = e.clientX - (input.lastX ?? e.clientX);
    const dy = e.clientY - (input.lastY ?? e.clientY);
    input.lastX = e.clientX; input.lastY = e.clientY;
    input.yaw -= dx * 0.005;
    input.pitch = Math.max(-0.1, Math.min(0.9, input.pitch + dy * 0.004));
  });
  canvas.addEventListener('touchstart', (e) => { input.dragging = true; input.lastX = e.touches[0].clientX; input.lastY = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!input.dragging) return;
    const dx = e.touches[0].clientX - input.lastX; const dy = e.touches[0].clientY - input.lastY;
    input.lastX = e.touches[0].clientX; input.lastY = e.touches[0].clientY;
    input.yaw -= dx * 0.006; input.pitch = Math.max(-0.1, Math.min(0.9, input.pitch + dy * 0.005));
  }, { passive: true });
  canvas.addEventListener('touchend', () => { input.dragging = false; });
  return input;
}
export function pressed(input, ...codes) { return codes.some((c) => input.keys[c]); }
