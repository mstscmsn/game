// Run flow: pilgrimage timeline, the Reaper execution, tribunal, hell revival,
// fake-heaven obedience ending, final choice, endless loops, results.
import { G, num, burst } from './state.js';
import { BAL } from '../data/balance.js';
import { AREAS, PILGRIMAGE, ENDLESS_AFFIXES } from '../data/areas.js';
import { STORY } from '../data/story.js';
import { META, saveMeta } from '../meta/save.js';
import { spawnBoss } from './bosses.js';
import { setupArea } from './spawner.js';
import { recomputeStats } from './player.js';
import { playMusic, stopMusic, sfx } from '../audio.js';
import { addShake, addFlash, view } from '../engine.js';
import { showDeathChoice, showResults, showEnding, showFinalChoice, showAreaTitle, showTribunalIntro, showPurifyChoice, toastLines } from '../ui/screens.js';

export function enterArea(areaId, opts = {}) {
  G.areaId = areaId;
  G.area = AREAS[areaId];
  G.areaEnteredAt = G.time;
  G.bossSpawned = false;
  setupArea(areaId);
  playMusic(G.area.music);
  const intro = STORY.areaIntro[areaId];
  if (intro && !opts.silent) showAreaTitle(intro.title, intro.sub, intro.lines);
  // fake heaven UI skin
  document.body.classList.toggle('heaven-skin', areaId === 'fakeheaven');
  if (areaId === 'fakeheaven') G.obedience = 0;
  if (areaId === 'hell' && (META.nodes['d_freeup'] || 0) > 0) G.freeArtifactUpgrade = 1;
  if (areaId === 'trueheaven') setTimeout(() => { if (G.active && !G.ended) showPurifyChoice(); }, 4500);
}

/* ============== per-frame timeline check ============== */
export function updateFlow(dt) {
  if (G.phase === 'tribunal') { updateTribunal(dt); return; }
  if (G.phase !== 'play') return;
  const t = G.time;
  if (G.mode === 'pilgrimage' || G.mode === 'daily') {
    // knell (delayed by 死神怀表)
    const knell = G.knellAt + (G.player.relics.includes('deathwatch') ? 60 : 0);
    if (!G.executed && t >= knell) { startReaper(); return; }
    // area transitions per schedule (skip corridor entry — reaper handles it)
    if (!G.executed) {
      for (const [at, id] of PILGRIMAGE) {
        if (id === 'corridor' || id === 'hell') continue;
        if (t >= at && G.areaId !== id && ['ashfield', 'cathedral', 'bells'].includes(id) && orderOf(id) > orderOf(G.areaId)) enterArea(id);
      }
    } else if (G.revived) {
      if (t >= 1800 && G.areaId === 'hell') enterArea('fakeheaven');
      if (t >= 2280 && G.areaId === 'fakeheaven' && !G.boss) maybeLeaveFakeHeaven();
    }
    // boss spawns
    const area = AREAS[G.areaId];
    if (area && area.boss && area.bossAt && !G.bossSpawned && t >= area.bossAt && !G.boss) {
      G.bossSpawned = true;
      spawnBoss(area.boss);
    }
    // true heaven final boss when arriving late enough
    if (G.areaId === 'trueheaven' && !G.bossSpawned && t >= BAL.timeline.motherAt) {
      G.bossSpawned = true;
      spawnBoss('mother');
    }
  } else if (G.mode === 'chapter') {
    // 12-minute chapter hunt, boss at 10min
    if (t >= 600 && !G.bossSpawned && AREAS[G.areaId].boss) { G.bossSpawned = true; spawnBoss(AREAS[G.areaId].boss); }
    if (t >= 720 && !G.boss) endRun(true, '章节完成');
  } else if (G.mode === 'endless') {
    // 8-minute world layers
    const loop = Math.floor(t / 480);
    if (loop > G.loopN) {
      G.loopN = loop;
      const affix = ENDLESS_AFFIXES[(G.rng() * ENDLESS_AFFIXES.length) | 0];
      if (!G.affixes.includes(affix.id)) G.affixes.push(affix.id);
      num(G.player.x, G.player.y - 40, `世界层 ${loop + 1}：${affix.name}`, 'warn');
      toastLines('腐化词缀', `${affix.name}——${affix.desc}`);
      G.runResources.eye += 1;
      // 永恒抉择: strong boon
      import('../ui/levelup.js').then(m => m.openEternalChoice());
    }
  }
}
function orderOf(id) { return ['ashfield', 'cathedral', 'bells', 'corridor', 'hell', 'fakeheaven', 'trueheaven', 'corpsesea'].indexOf(id); }

/* ============== the Reaper (终末钟声) ============== */
export function startReaper() {
  G.executed = true;
  G.phase = 'reaper';
  stopMusic(true);                       // all tracks stop instantly, no fade (docs §17)
  sfx.bigbell();
  // all enemies become ash
  for (const e of G.enemies) {
    burst(e.x, e.y, 'rgba(143,133,112,0.6)', 3, 40, 0.8);
  }
  G.enemies.length = 0; G.eprojs.length = 0; G.projs.length = 0; G.boss = null;
  G.areaId = 'corridor'; G.area = AREAS.corridor;
  document.body.classList.remove('heaven-skin');
  const p = G.player;
  G.reaper = { t: 0, x: p.x, y: p.y - 620, phase: 'walk', stepT: 0 };
  toastLines(STORY.bosses.finalis.name, STORY.reaper.appear.join('\n'));
}

export function updateReaper(dt) {
  const r = G.reaper;
  if (!r) return;
  const p = G.player;
  r.t += dt;
  if (r.phase === 'walk') {
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    r.x += (p.x - r.x) / (d || 1) * 90 * dt;
    r.y += (p.y - r.y) / (d || 1) * 90 * dt;
    r.stepT -= dt;
    if (r.stepT <= 0) { r.stepT = 0.8; sfx.reaperStep(); addShake(2); }
    if (d < 90) { r.phase = 'raise'; r.t = 0; }
  } else if (r.phase === 'raise') {
    // 0.8s clear windup so the player reads it as scripted (docs §12.4)
    if (r.t >= 0.8) {
      r.phase = 'done';
      sfx.execute(); addFlash('#EEEBDD', 1); addShake(14);
      import('./player.js').then(m => m.playerHurt(p, 999999999, { execution: true }));
    }
  }
}

export function onPlayerDeath(opts = {}) {
  const p = G.player;
  if (opts.execution) {
    // scripted death → death choice screen
    G.phase = 'deathchoice';
    setTimeout(() => {
      showDeathChoice({
        onAccept: () => endRun(false, '接受遗忘'),
        onChallenge: () => startTribunal(),
        canChallenge: !G.tribunalTried,
      });
    }, 900);
  } else if (G.phase === 'tribunal') {
    // lost the tribunal → normal settlement, resources kept
    tribunalFail();
  } else {
    // ordinary death
    META.lastDeathBy = G.lastHitBy || '未知';
    endRun(false, '死亡');
  }
}

/* ============== 堕翼审判 tribunal ============== */
export function startTribunal() {
  G.tribunalTried = true;
  G.phase = 'tribunal';
  const p = G.player;
  p.hp = Math.max(1, Math.round(p.S.maxHp * 0.6));
  // meta shields
  let shield = 0, extraTime = 0;
  for (const [id, r] of Object.entries(META.nodes)) {
    if (id === 'd_shield') shield += 30 * r;
    if (id === 'd_time') extraTime += 5 * r;
  }
  p.shield = shield;
  let tt = BAL.tribunalTime + extraTime;
  if (p.relics.includes('deathwatch')) tt -= 20;
  G.tribunal = { timeLeft: tt, healPenalty: 0.5 };
  G.enemies.length = 0; G.eprojs.length = 0; G.projs.length = 0;
  G.areaId = 'tribunal'; G.area = AREAS.tribunal;
  setupArea('tribunal');
  playMusic('tribunal');
  spawnBoss('rahshiel');
  showTribunalIntro(STORY.rahshiel.offer);
}
function updateTribunal(dt) {
  const tr = G.tribunal;
  if (!tr) return;
  tr.timeLeft -= dt;
  if (tr.timeLeft <= 0) {
    tribunalFail();
    return;
  }
  if (!G.boss || G.boss.dead) tribunalWin();
}
function tribunalWin() {
  G.tribunalWon = true;
  META.stats.tribunalWins = (META.stats.tribunalWins || 0) + 1;
  G.runResources.bone += 6;
  G.worldCores++; G.coreNames.push('堕翼骨');
  saveMeta();
  toastLines(STORY.rahshiel && STORY.bosses.rahshiel.name, STORY.rahshiel.win.join('\n'));
  // revive in hell
  const p = G.player;
  let reviveHp = 0.35;
  for (const [id, r] of Object.entries(META.nodes)) if (id === 'd_revive') reviveHp += 0.05 * r;
  p.hp = Math.round(p.S.maxHp * Math.min(0.95, reviveHp));
  p.shield = 0;
  G.revived = true;
  G.phase = 'play';
  G.tribunal = null;
  G.time = Math.max(G.time, 1275);
  enterArea('hell');
}
function tribunalFail() {
  toastLines(STORY.bosses.rahshiel.name, STORY.rahshiel.lose.join('\n'));
  endRun(false, '审判失败');
}

/* ============== boss-kill continuations ============== */
export function onBossKilled(id) {
  if (id === 'rahshiel') {
    if (G.phase === 'tribunal') { G.killedRahshiel = true; /* defeated = won; kill flag for dawn check */ }
    return;
  }
  if (id === 'margola') {
    // 地狱新王 choice: sit the iron throne
    setTimeout(() => {
      if (!G.active || G.ended) return;
      import('../ui/screens.js').then(m => m.showThroneChoice({
        onSit: () => triggerEnding('hellking'),
        onLeave: () => { toastLines('', '你背过王座。前方是伪造的光。'); },
      }));
    }, 1500);
  }
  if (id === 'lambking') {
    setTimeout(() => { if (G.active && !G.ended && G.areaId === 'fakeheaven') maybeLeaveFakeHeaven(); }, 2000);
  }
  if (id === 'mother') {
    G.phase = 'finalchoice';
    setTimeout(() => {
      showFinalChoice({
        canDawn: dawnConditionsMet(),
        onChoice: (choice) => {
          if (choice === 'destroy') {
            if (dawnConditionsMet()) triggerEnding('dawn');
            else {
              toastLines('', '输送器碎裂。但七份圣徒告解仍未齐全，\n黑暗降下，星星没有出现。');
              META.firstClear = true; saveMeta();
              setTimeout(() => endRun(true, '摧毁祈祷输送器'), 2600);
            }
          }
          else if (choice === 'inherit') triggerEnding('blackcrown');
          else if (choice === 'purify') {
            toastLines('', '你以自己的心灯为她引路。\n圣母沉眠。天空第一次没有声音。');
            META.firstClear = true; saveMeta();
            setTimeout(() => endRun(true, '净化圣母'), 2600);
          }
          else if (choice === 'enter') triggerEnding('eighthday');
        },
      });
    }, 1600);
  }
}
function maybeLeaveFakeHeaven() {
  enterArea('trueheaven');
}
function dawnConditionsMet() {
  // docs §13 真结局: 7 saint confessions + tribunal won without "killing" + refused all gifts + ≥1 purified forbidden
  return META.saintConfessions.length >= 7 &&
    G.tribunalWon &&
    G.giftsTaken === 0 &&
    G.purifiedForbidden >= 1;
}

/* ============== endings & results ============== */
export function triggerEnding(id) {
  if (G.ended) return;
  G.ended = true;
  G.endingId = id;
  G.phase = 'ending';
  if (!META.endings.includes(id)) META.endings.push(id);
  if (id === 'hellking') META.hellThrone = true;
  if (id === 'blackcrown') META.blackCrown = true;
  if (['dawn', 'blackcrown', 'eighthday'].includes(id)) META.firstClear = true;
  saveMeta();
  const e = STORY.endings[id];
  showEnding(e, () => endRun(true, e.title));
}

export function endRun(victory, reason) {
  if (!G.active) return;
  G.active = false;
  document.body.classList.remove('heaven-skin');
  stopMusic();
  // settle resources
  const R = G.runResources;
  META.res.ash += Math.round(R.ash);
  META.res.nail += R.nail;
  META.res.bone += R.bone;
  META.res.pollen += R.pollen;
  META.res.eye += R.eye;
  META.runs++;
  if (!victory) META.deaths++;
  META.totalKills += G.kills;
  if (G.time > META.bestTime) META.bestTime = G.time;
  // first-run guarantee (docs §11.4)
  if (META.runs === 1) META.res.ash = Math.max(META.res.ash, 400);
  // difficulty ladder: clearing the pilgrimage unlocks the next tier
  if (victory && (G.mode === 'pilgrimage' || G.mode === 'daily')) {
    const order = ['murmur', 'pilgrim', 'penance', 'blaspheme'];
    const idx = order.indexOf(G.difficulty);
    META.unlockedDifficulty = Math.max(META.unlockedDifficulty, Math.min(4, idx + 2));
  }
  // 棺中慈悲: died before 12min → mercy stack
  if (!victory && G.time < 720 && !G.executed) META.mercy = Math.min(2, META.mercy + 1);
  if (G.executed || victory) META.mercy = 0;
  if (META.mercyOff) META.res.ash = Math.round(META.res.ash * 1.0 + R.ash * 0.1);
  // cursed clear stat (vielna unlock)
  const p = G.player;
  if (p && p.relics.filter(r => ['closedeye', 'umbilical', 'hourglass', 'invitation', 'sindice', 'strayKey', 'skinmap', 'holidaycrown'].includes(r)).length >= 3 && (victory || G.bossKills > 0)) {
    META.stats.cursedClear = (META.stats.cursedClear || 0) + 1;
  }
  // noin inherit
  if (p && p.weapons.length > 1) {
    const cand = p.weapons[1 + ((G.rng() * (p.weapons.length - 1)) | 0)];
    META.noinInherit = { kind: 'weapon', id: cand.id };
  }
  META.lastRunSummary = {
    reason, victory, time: G.time, kills: G.kills, elite: G.eliteKills, boss: G.bossKills,
    dmg: G.dmgDealt, taken: G.dmgTaken, level: p ? p.level : 1,
    char: p ? p.char.id : 'adric', mode: G.mode,
    gains: { ...R, ash: Math.round(R.ash) },
    artifacts: p ? p.weapons.filter(w => w.evolved).length : 0,
    forbidden: p ? p.forbidden.length : 0,
    confessions: G.confessionsThisRun.length,
    ending: G.endingId,
  };
  saveMeta();
  showResults(META.lastRunSummary);
}
