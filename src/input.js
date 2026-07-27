// Touch virtual joystick + dodge/skill buttons + keyboard/mouse fallback
import { view } from './engine.js';
import { clamp } from './core/util.js';

export const input = {
  // normalized movement vector
  mx: 0, my: 0, moving: false,
  dodge: false,      // consumed each frame
  skill: false,      // consumed each frame
  // joystick visual state
  joyActive: false, joyBaseX: 0, joyBaseY: 0, joyKnobX: 0, joyKnobY: 0,
  // buttons layout (logical UI coords, computed per frame in hud)
  btns: {},          // {dodge:{x,y,r}, skill:{x,y,r}}
  swapHands: false,
  anyTouch: false,
  lastDir: { x: 1, y: 0 }, // last non-zero move direction
};

const keys = new Set();
let joyPointer = -1;

export function initInput() {
  const c = document.getElementById('game-canvas');

  const toUI = (e) => ({ x: e.clientX / view.scale, y: e.clientY / view.scale });

  c.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.anyTouch = true;
    const p = toUI(e);
    // buttons — nearest by normalized distance d/r, so overlapping hit zones
    // resolve to the button the thumb actually aimed at (no priority-order bias)
    let hit = null, hitQ = 1.2;
    for (const name of ['pause', 'skill', 'dodge']) {
      const b = input.btns[name];
      if (!b) continue;
      const q = Math.hypot(p.x - b.x, p.y - b.y) / b.r;
      if (q < hitQ) { hitQ = q; hit = name; }
    }
    if (hit) {
      input.pressFx = { name: hit, t: performance.now() };
      if (hit === 'dodge') input.dodge = true;
      if (hit === 'skill') input.skill = true;
      if (hit === 'pause' && input.btns.pause.cb) input.btns.pause.cb();
      return;
    }
    // joystick: left half (or right if swapped)
    const leftSide = input.swapHands ? p.x > view.w / 2 : p.x <= view.w / 2;
    if (leftSide && joyPointer === -1) {
      joyPointer = e.pointerId;
      input.joyActive = true;
      input.joyBaseX = p.x; input.joyBaseY = p.y;
      input.joyKnobX = p.x; input.joyKnobY = p.y;
    } else {
      // tap right side = also dodge shortcut when no button hit? keep as aim tap: store
      input.tapX = p.x; input.tapY = p.y; input.tapped = true;
    }
  }, { passive: false });

  c.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointer) return;
    const p = toUI(e);
    const R = 58;
    let dx = p.x - input.joyBaseX, dy = p.y - input.joyBaseY;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    input.joyKnobX = input.joyBaseX + dx; input.joyKnobY = input.joyBaseY + dy;
    const dead = 6;
    if (d > dead) {
      input.mx = dx / R; input.my = dy / R;
      const n = Math.hypot(input.mx, input.my);
      if (n > 1) { input.mx /= n; input.my /= n; }
      input.lastDir.x = input.mx / (n || 1); input.lastDir.y = input.my / (n || 1);
      input.moving = true;
    } else { input.mx = 0; input.my = 0; input.moving = false; }
  }, { passive: true });

  const release = (e) => {
    if (e.pointerId === joyPointer) {
      joyPointer = -1; input.joyActive = false;
      input.mx = 0; input.my = 0; input.moving = false;
    }
  };
  c.addEventListener('pointerup', release);
  c.addEventListener('pointercancel', release);
  c.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'ShiftLeft') { input.dodge = true; e.preventDefault(); }
    if (e.code === 'KeyQ' || e.code === 'KeyE') input.skill = true;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (input.btns.pause && input.btns.pause.cb) input.btns.pause.cb(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
}

// call each frame: merge keyboard into movement
export function pollKeyboard() {
  let kx = 0, ky = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) kx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) kx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) ky -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) ky += 1;
  if (kx || ky) {
    const n = Math.hypot(kx, ky);
    input.mx = kx / n; input.my = ky / n; input.moving = true;
    input.lastDir.x = input.mx; input.lastDir.y = input.my;
  } else if (joyPointer === -1) {
    input.mx = 0; input.my = 0; input.moving = false;
  }
}
export function consumeActions() { const d = input.dodge, s = input.skill; input.dodge = false; input.skill = false; return { dodge: d, skill: s }; }
