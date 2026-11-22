// The Midnight Vault — keyboard and mouse: WASD/arrows to move, 1/2 to pick a
// tool, Space (or click) to use it, Enter to start, R to run it back.
export function createInput(onAction) {
  const keys = new Set();
  const state = { mouseX: 0, mouseY: 0, mouseDown: false };

  function key(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = key(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    keys.add(k);
    if (k === ' ' || k === 'Enter') onAction(k === ' ' ? 'use' : 'start');
    if (k === '1') onAction('tool-smoke');
    if (k === '2') onAction('tool-emp');
    if (k === 'r') onAction('restart');
    if (k === 'm') onAction('mute');
  });
  window.addEventListener('keyup', (e) => keys.delete(key(e)));
  window.addEventListener('blur', () => keys.clear());

  window.addEventListener('mousemove', (e) => {
    const rect = document.getElementById('game').getBoundingClientRect();
    state.mouseX = ((e.clientX - rect.left) / rect.width) * 1280;
    state.mouseY = ((e.clientY - rect.top) / rect.height) * 720;
  });
  window.addEventListener('mousedown', (e) => {
    state.mouseDown = true;
    const rect = document.getElementById('game').getBoundingClientRect();
    state.mouseX = ((e.clientX - rect.left) / rect.width) * 1280;
    state.mouseY = ((e.clientY - rect.top) / rect.height) * 720;
    onAction('click');
  });
  window.addEventListener('mouseup', () => { state.mouseDown = false; });

  /** Normalized movement direction from the keys held down right now. */
  function moveDirection() {
    let dx = 0;
    let dy = 0;
    if (keys.has('a') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('w') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) dy += 1;
    return { dx, dy };
  }

  return { keys, state, moveDirection };
}
