// Canvas management, main loop, camera, screen shake, hit-stop
export const view = {
  canvas: null, ctx: null,
  w: 540, h: 1170,          // logical size (portrait); recomputed on resize
  dpr: 1, scale: 1,
  camX: 0, camY: 0,
  shake: 0, shakeX: 0, shakeY: 0,
  flash: 0, flashColor: '#fff',
  slowmo: 0,               // seconds of slow motion remaining
  landscape: false,
};

export function initCanvas() {
  view.canvas = document.getElementById('game-canvas');
  view.ctx = view.canvas.getContext('2d', { alpha: false });
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));
}

function resize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.landscape = cw > ch;
  // logical width fixed 540 portrait / height fixed 640 landscape-ish view
  if (view.landscape) { view.h = 640; view.w = Math.round(640 * cw / ch); }
  else { view.w = 540; view.h = Math.round(540 * ch / cw); }
  view.scale = cw / view.w;
  view.canvas.width = Math.round(cw * view.dpr);
  view.canvas.height = Math.round(ch * view.dpr);
  view.canvas.style.width = cw + 'px';
  view.canvas.style.height = ch + 'px';
  view.ctx.imageSmoothingEnabled = false;
}

// world → screen transform helpers (call within render with ctx already scaled)
export function beginWorld(ctx) {
  ctx.save();
  ctx.translate(view.shakeX * view.dpr * view.scale, view.shakeY * view.dpr * view.scale);
  ctx.scale(view.dpr * view.scale, view.dpr * view.scale);
  ctx.translate(view.w / 2 - view.camX, view.h / 2 - view.camY);
}
export function endWorld(ctx) { ctx.restore(); }
export function beginUI(ctx) { ctx.save(); ctx.scale(view.dpr * view.scale, view.dpr * view.scale); }
export function endUI(ctx) { ctx.restore(); }

export function addShake(amount) { const s = window.SETTINGS ? window.SETTINGS.shake : 1; view.shake = Math.min(14, view.shake + amount * s); }
export function addFlash(color, amount = 0.5) { const s = window.SETTINGS ? window.SETTINGS.flash : 1; view.flash = Math.max(view.flash, amount * s); view.flashColor = color; }
export function hitStop(sec) { view.slowmo = Math.max(view.slowmo, sec); }

// Main loop with fixed-ish dt clamp
let rafId = 0;
export function startLoop(update, render) {
  let last = performance.now();
  const frame = (now) => {
    rafId = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    // hit-stop slowmo
    if (view.slowmo > 0) { view.slowmo -= dt; dt *= 0.18; }
    // shake decay
    if (view.shake > 0.01) {
      view.shake *= Math.pow(0.001, dt * 2.2);
      view.shakeX = (Math.random() * 2 - 1) * view.shake;
      view.shakeY = (Math.random() * 2 - 1) * view.shake;
    } else { view.shakeX = view.shakeY = 0; }
    if (view.flash > 0) view.flash = Math.max(0, view.flash - dt * 2.4);
    update(dt, now / 1000);
    render(view.ctx);
  };
  rafId = requestAnimationFrame(frame);
}
export function stopLoop() { cancelAnimationFrame(rafId); }
