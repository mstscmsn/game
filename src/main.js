// ANATHEMA — TESTAMENT OF THE BLACK SUN — entry point
import { initCanvas, startLoop, view } from './engine.js';
import { initInput, input, consumeActions } from './input.js';
import { initAudio, playMusic, sfx } from './audio.js';
import { buildSprites } from './art/sprites.js';
import { buildBackgrounds } from './art/backgrounds.js';
import { loadMeta, saveMeta, META } from './meta/save.js';
import { G, resetG, tickTimers, after as gAfter } from './run/state.js';
import { createPlayer, updatePlayer, recomputeStats } from './run/player.js';
import { updateSin } from './run/sins.js';
import { updateWeapons, updateProjectiles } from './run/weapons_impl.js';
import { updateSpawner, updateEnemies, updateEnemyProjs, updateZones, updatePickups } from './run/spawner.js';
import { updateBoss } from './run/bosses.js';
import { updateFlow, updateReaper, enterArea, endRun } from './run/flow.js';
import { render } from './run/render.js';
import { openLevelUp, openStartBless } from './ui/levelup.js';
import { mainMenu, bindStart, pauseMenu, applySettings } from './ui/screens.js';
import { makeRng } from './core/util.js';

function boot() {
  loadMeta();
  applySettings();
  initCanvas();
  initInput();
  initAudio();
  buildSprites();
  buildBackgrounds();
  bindStart(startRun);
  window.__PAUSE = doPause;
  mainMenu();
  startLoop(update, draw);
  // dev hooks for automated testing
  window.__G = G;
  window.__META = META;
  window.__startRun = startRun;
  window.__INPUT = input;
  window.__enterArea = enterArea;
}

function startRun(opts) {
  resetG({
    mode: opts.mode, areaId: opts.areaId, difficulty: opts.difficulty,
    sinMarks: opts.sinMarks, seed: opts.seed, dailyDate: opts.dailyDate,
  });
  const p = createPlayer(opts.charId);
  G.player = p;
  // 1.25x pilgrimage acceleration after first clear (docs §5.1)
  G.timeScale = (META.firstClear && META.settings.speed125) ? 1.25 : 1;
  // hourglass applied later on pickup
  if (opts.mode !== 'pilgrimage' && opts.mode !== 'daily') G.executed = true; // no reaper outside pilgrimage
  // noin: inherit one lv-1 item from last run
  if (opts.charId === 'noin' && META.noinInherit && META.noinInherit.kind === 'weapon' && META.noinInherit.id !== p.weapons[0].id) {
    p.weapons.push({ id: META.noinInherit.id, lv: 1, evolved: false, cd: 0, st: {} });
  }
  recomputeStats(p);
  p.hp = p.S.maxHp;
  G.phase = 'play';
  enterArea(opts.areaId || 'ashfield');
  // 初始赐福 (memory tree) — retry until a safe moment
  if (META.nodes['m_bless']) {
    const tryBless = () => {
      if (!G.active || G.time > 30) return;
      if (G.phase !== 'play') { gAfter(0.5, tryBless); return; }
      openStartBless();
    };
    gAfter(0.6, tryBless);
  }
}

function doPause() {
  if (!G.active) return;
  if (G.phase === 'play' || G.phase === 'tribunal') {
    G.pausedFrom = G.phase;
    G.phase = 'paused';
    pauseMenu(
      () => { G.phase = G.pausedFrom || 'play'; },
      () => { endRun(false, '中途放弃'); },
    );
  }
}

let acc = 0;
function update(dt) {
  if (!G.active) return;
  const phase = G.phase;
  window.__ACTS = consumeActions();
  if (phase === 'reaper') {
    updateReaper(dt);
    tickFx(dt);
    return;
  }
  if (phase !== 'play' && phase !== 'tribunal') { tickFx(dt * 0.2); return; }
  const gdt = dt * G.timeScale;
  G.time += gdt;
  // global timers
  tickTimers(gdt);
  if (G.timeStopT > 0) G.timeStopT -= dt;
  if (G.reverseT > 0) G.reverseT -= dt;
  if (G.soulnetT > 0) G.soulnetT -= dt;
  if (G.tempAtkT > 0) G.tempAtkT -= dt;
  if (G.blackSunT > 0) G.blackSunT -= gdt;
  if (G.ninthBellFx > 0) G.ninthBellFx -= gdt;
  if (G.silenceT > 0) G.silenceT -= gdt;
  if (G.sinDeniedT > 0) G.sinDeniedT -= dt;
  G.lsWindow = (G.lsWindow || 0) + dt;
  if (G.lsWindow >= 1) { G.lsWindow = 0; G.lsAcc = 0; }
  updatePlayer(G.player, gdt);
  updateSin(G.player, gdt);
  updateWeapons(gdt);
  updateProjectiles(gdt);
  updateEnemies(gdt);
  updateEnemyProjs(gdt);
  updateZones(gdt);
  updatePickups(gdt);
  updateSpawner(gdt);
  updateBoss(gdt);
  updateFlow(gdt);
  tickFx(dt);
  // level-up queue
  if (G.phase === 'play' && G.levelupQueue > 0) {
    G.levelupQueue--;
    openLevelUp();
  }
}

function tickFx(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.t += dt;
    if (p.t > p.life) { G.parts.splice(i, 1); continue; }
    if (!p.ring && !p.beam && !p.chainArc && !p.corpse) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
  }
  for (let i = G.nums.length - 1; i >= 0; i--) {
    G.nums[i].t += dt;
    if (G.nums[i].t > 0.8) G.nums.splice(i, 1);
  }
}

function draw(ctx) {
  if (G.active || G.phase === 'reaper') render(ctx);
  else {
    ctx.fillStyle = '#0B0A0C';
    ctx.fillRect(0, 0, view.canvas.width, view.canvas.height);
  }
}

boot();
