// Run flow: pilgrimage timeline, the Reaper execution, tribunal, hell revival,
// fake-heaven obedience ending, final choice, endless loops, results.
import { G, num, burst, after } from './state.js';
import { BAL } from '../data/balance.js';
import { AREAS, ENDLESS_AFFIXES } from '../data/areas.js';
import { STORY } from '../data/story.js';
import { META, saveMeta } from '../meta/save.js';
import { spawnBoss } from './bosses.js';
import { setupArea } from './spawner.js';
import { recomputeStats } from './player.js';
import { playMusic, stopMusic, sfx } from '../audio.js';
import { addShake, addFlash, view } from '../engine.js';
import { showDeathChoice, showResults, showEnding, showFinalChoice, showAreaTitle, showPurifyChoice, toastLines, storyRoll } from '../ui/screens.js';

export function enterArea(areaId, opts = {}) {
  G.areaId = areaId;
  G.area = AREAS[areaId];
  G.areaEnteredAt = G.time;
  G.bossSpawned = false;
  G.bossWarned = false;           // 每章一次的 boss 预警 banner
  G.chapterDone = false;          // 章节狩猎结算闩
  G.surged1 = false; G.surged2 = false;
  G.eliteT = 45;                  // each chapter's elite lands on a fixed beat
  G.areaVisits = G.areaVisits || {};
  G.areaVisits[areaId] = (G.areaVisits[areaId] || 0) + 1;
  setupArea(areaId);
  playMusic(G.area.music);
  const intro = STORY.areaIntro[areaId];
  if (intro && !opts.silent) showAreaTitle(intro.title, intro.sub, intro.lines);
  // fake heaven UI skin
  document.body.classList.toggle('heaven-skin', areaId === 'fakeheaven');
  if (areaId === 'fakeheaven') G.obedience = 0;
  if (areaId === 'hell' && (META.nodes['d_freeup'] || 0) > 0) G.freeArtifactUpgrade = 1;
}

/* ============== per-frame progression check ==============
 * Boss-gated pacing: each area's boss appears BAL.bossAfter seconds after
 * entering; the next area opens only once that boss is dead (章节≈3分钟). */
export function updateFlow(dt) {
  if (G.phase === 'tribunal') { updateTribunal(dt); return; }
  if (G.phase !== 'play') return;
  const t = G.time;
  if (G.mode === 'pilgrimage' || G.mode === 'daily') {
    // knell — armed by the whale's death (延迟 by 死神怀表)
    const knell = G.knellAt + (G.player.relics.includes('deathwatch') ? 60 : 0);
    if (!G.executed && t >= knell) { startReaper(); return; }
    // area boss: spawns on a per-area clock, must be defeated to advance
    const area = AREAS[G.areaId];
    // one-shot 10s heads-up so the arrival never reads as an ambush
    if (area && area.boss && !G.bossSpawned && !G.boss && !G.bossWarned && G.areaId !== 'corridor' && t - G.areaEnteredAt >= BAL.bossAfter - 10) {
      G.bossWarned = true;
      window.__BANNER && window.__BANNER('', '钟声渐近——强敌将至');
    }
    if (area && area.boss && !G.bossSpawned && !G.boss && t - G.areaEnteredAt >= BAL.bossAfter && G.areaId !== 'corridor') {
      G.bossSpawned = true;
      spawnBoss(area.boss);
    }
    // 净化祭坛：等待一个安全时机（play 且持有禁器）
    if (G.revived && G.areaId === 'trueheaven' && !G.purifyOffered && G.player.forbidden.length > 0 && t - G.areaEnteredAt > 4) {
      G.purifyOffered = true;
      showPurifyChoice();
    }
  } else if (G.mode === 'chapter') {
    // 6-minute chapter hunt: boss at 5min, ends once it falls
    if (t >= 290 && !G.bossWarned && !G.bossSpawned && AREAS[G.areaId].boss) { G.bossWarned = true; window.__BANNER && window.__BANNER('', '钟声渐近——强敌将至'); }
    if (t >= 300 && !G.bossSpawned && AREAS[G.areaId].boss) { G.bossSpawned = true; spawnBoss(AREAS[G.areaId].boss); }
    // boss down → settle after a 3s buffer (no more idling out the clock)
    if (G.bossSpawned && !G.boss && !G.chapterDone) {
      G.chapterDone = true;
      toastLines('', '狩猎完成。');
      after(3, () => endRun(true, '章节完成'));
    }
    if (t >= 360 && !AREAS[G.areaId].boss) endRun(true, '章节完成');
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
      // 永恒抉择: strong boon — waits for a safe moment (phase re-checked
      // at import resolution to survive same-frame level-up races)
      const tryEternal = () => {
        if (!G.active || G.ended) return;
        if (G.phase !== 'play') { after(1, tryEternal); return; }
        import('../ui/levelup.js').then(m => {
          if (!G.active || G.ended) return;
          if (G.phase !== 'play') { after(1, tryEternal); return; }
          m.openEternalChoice();
        });
      };
      after(0.5, tryEternal);
    }
  }
}

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
  G.reaper = { t: 0, x: p.x, y: p.y - 620, phase: 'walk', stepT: 0, held: false };
  // veterans may hold to fast-forward the walk (the very first death keeps full ceremony)
  if ((META.deaths || 0) > 0) {
    G.reaper.canRush = true;
    const down = () => { if (G.reaper) G.reaper.held = true; };
    const up = () => { if (G.reaper) G.reaper.held = false; };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    G.reaper.unbind = () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    };
    window.__BANNER && window.__BANNER('', '长按屏幕加速');
  }
  // the most-repeated scripted moment in the game rotates its script:
  // veterans who beat the tribunal get a colder greeting
  const alts = STORY.reaper.appearAlt || [];
  let lines = STORY.reaper.appear;
  if ((META.stats.tribunalWins || 0) > 0 && alts[1]) lines = alts[1];
  else if ((META.deaths || 0) % 2 === 1 && alts[0]) lines = alts[0];
  toastLines(STORY.bosses.finalis.name, lines.join('\n'));
  // the corridor gets its intro — the reaper's slow walk is exactly reading time
  const ci = STORY.areaIntro.corridor;
  G.areaVisits = G.areaVisits || {};
  G.areaVisits.corridor = ((META.deaths || 0) % ci.lines.length) + 1;
  showAreaTitle(ci.title, ci.sub, ci.lines);
}

export function updateReaper(dt) {
  const r = G.reaper;
  if (!r) return;
  const p = G.player;
  r.t += dt;
  if (r.phase === 'walk') {
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    const spd = r.held ? 360 : 90;                     // long-press fast-forward
    r.x += (p.x - r.x) / (d || 1) * spd * dt;
    r.y += (p.y - r.y) / (d || 1) * spd * dt;
    r.stepT -= dt;
    if (r.stepT <= 0) { r.stepT = 0.8; sfx.reaperStep(); addShake(2); }
    if (d < 90) { r.phase = 'raise'; r.t = 0; }
  } else if (r.phase === 'raise') {
    // 0.8s clear windup so the player reads it as scripted (docs §12.4)
    if (r.t >= (r.held ? 0.3 : 0.8)) {
      r.phase = 'done';
      r.unbind && r.unbind();
      sfx.execute(); addFlash('#EEEBDD', 1); addShake(14);
      import('./player.js').then(m => m.playerHurt(p, 999999999, { execution: true }));
    }
  }
}

export function onPlayerDeath(opts = {}) {
  const p = G.player;
  if (opts.execution) {
    // scripted death → death choice screen
    META.lastDeathBy = '终末钟声';
    META.deathsBy[META.lastDeathBy] = (META.deathsBy[META.lastDeathBy] || 0) + 1;
    G.phase = 'deathchoice';
    const rushed = G.reaper && G.reaper.held;
    setTimeout(() => {
      showDeathChoice({
        onAccept: () => endRun(false, '接受遗忘'),
        onChallenge: () => startTribunal(),
        canChallenge: !G.tribunalTried,
      });
    }, rushed ? 200 : 900);
  } else if (G.phase === 'tribunal') {
    // lost the tribunal → normal settlement, resources kept
    tribunalFail();
  } else {
    // ordinary death
    META.lastDeathBy = G.lastHitBy || '未知';
    META.deathsBy[META.lastDeathBy] = (META.deathsBy[META.lastDeathBy] || 0) + 1;
    endRun(false, '死亡');
  }
}

/* ============== 堕翼审判 tribunal ============== */
export function startTribunal() {
  G.tribunalTried = true;
  // the offer is the thematic center of the game — it gets a full staging,
  // and the 75s timer only starts once the player has read (or skipped) it
  G.phase = 'story';
  playMusic('tribunal');
  const rematch = (META.stats.tribunalWins || 0) + (META.stats.tribunalLosses || 0) > 0;
  const offer = rematch ? [STORY.rahshiel.offer[0], '「又是你。」他的锁链轻轻响了一声。', ...STORY.rahshiel.offer.slice(3)] : STORY.rahshiel.offer;
  storyRoll(offer, () => {
    document.getElementById('ui-root').innerHTML = '';
    beginTribunalFight();
  });
}
function beginTribunalFight() {
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
  G.enemies.length = 0; G.eprojs.length = 0; G.projs.length = 0; G.pickups.length = 0; G.zones.length = 0;
  G.areaId = 'tribunal'; G.area = AREAS.tribunal;
  setupArea('tribunal');
  spawnBoss('rahshiel');
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
  G.tribunal = null;
  G.phase = 'story';
  const lines = META.stats.tribunalWins > 1 && STORY.rahshiel.win2 ? STORY.rahshiel.win2 : STORY.rahshiel.win;
  storyRoll(lines, () => {
    document.getElementById('ui-root').innerHTML = '';
    // revive in hell
    const p = G.player;
    let reviveHp = 0.35;
    for (const [id, r] of Object.entries(META.nodes)) if (id === 'd_revive') reviveHp += 0.05 * r;
    p.hp = Math.round(p.S.maxHp * Math.min(0.95, reviveHp));
    p.shield = 0;
    G.revived = true;
    G.phase = 'play';
    enterArea('hell');
  }, STORY.bosses.rahshiel.name);
}
function tribunalFail() {
  const again = (META.stats.tribunalWins || 0) + (META.stats.tribunalLosses || 0) > 0;
  META.stats.tribunalLosses = (META.stats.tribunalLosses || 0) + 1;
  saveMeta();
  G.tribunal = null;
  // 败者参与奖：连败也在攒堕翼树的骨片，失败本身在变强
  G.runResources.bone += 2;
  G.phase = 'story';
  const base = again && STORY.rahshiel.lose2 ? STORY.rahshiel.lose2 : STORY.rahshiel.lose;
  const lines = [...base, '拉赫希尔折下一根黑羽，扔在你脚边。（骨片+2）'];
  storyRoll(lines, () => endRun(false, '审判失败'), STORY.bosses.rahshiel.name);
}

/* ============== boss-kill continuations ==============
 * Boss-gated progression: each boss death opens the next chapter. */
function scheduleNextArea(nextId, banner) {
  if (banner) toastLines('', banner);
  const go = () => {
    if (!G.active || G.ended) return;
    if (G.phase !== 'play') { after(1.5, go); return; }
    enterArea(nextId);
  };
  after(BAL.areaGap, go);
}
export function onBossKilled(id) {
  if (id === 'rahshiel') {
    // 设定：审判获胜=使拉赫希尔屈服而非杀死（见 STORY.rahshiel.win），
    // 故真结局条件"没有杀死拉赫希尔"由 tribunalWon 本身承载。
    return;
  }
  // 朝圣推进只属于朝圣/每日模式——章节狩猎与无尽击杀Boss不改变世界线
  if (G.mode !== 'pilgrimage' && G.mode !== 'daily') return;
  if (id === 'anlo') scheduleNextArea('cathedral', '原野的祷文烧尽了。腐香从东面飘来。');
  if (id === 'mimi') scheduleNextArea('bells', '香炉熄灭。远处传来沉在水底的钟声。');
  if (id === 'whale') {
    // the whale's fall arms the death knell — the reaper is coming
    G.knellAt = G.time + BAL.knellDelay;
    toastLines('', '鲸尸沉底。七座钟同时静止——\n第八声，不属于这座城。');
  }
  if (id === 'margola') {
    // 地狱新王 choice: sit the iron throne — retries until a safe moment.
    // phase is re-checked when the dynamic import resolves (a microtask later
    // the same frame may have opened a level-up card) and retried if needed.
    const tryShow = () => {
      if (!G.active || G.ended) return;
      if (G.phase !== 'play') { after(1.5, tryShow); return; }
      import('../ui/screens.js').then(m => {
        if (!G.active || G.ended) return;
        if (G.phase !== 'play') { after(1.5, tryShow); return; }
        m.showThroneChoice({
          onSit: () => triggerEnding('hellking'),
          onLeave: () => { toastLines('', '你背过王座。前方是伪造的光。'); },
        });
      });
    };
    after(1.5, tryShow);
    // advance unless the player took the throne
    after(BAL.areaGap + 6, () => {
      if (G.active && !G.ended && G.areaId === 'hell') {
        const go = () => { if (!G.active || G.ended) return; if (G.phase !== 'play') { after(1.5, go); return; } enterArea('fakeheaven'); };
        go();
      }
    });
  }
  if (id === 'lambking') {
    after(BAL.areaGap, () => {
      const go = () => { if (!G.active || G.ended) return; if (G.phase !== 'play') { after(1.5, go); return; } if (G.areaId === 'fakeheaven') maybeLeaveFakeHeaven(); };
      go();
    });
  }
  if (id === 'mother') {
    // wait for a clean 'play' moment before freezing into the final choice —
    // never stomp an open level-up (its close would un-pause the world)
    const tryFinal = () => {
      if (!G.active || G.ended) return;
      if (G.phase !== 'play') { after(1, tryFinal); return; }
      G.phase = 'finalchoice';
      showFinalChoice({
        canDawn: dawnConditionsMet(),
        onChoice: (choice) => {
          if (choice === 'destroy') triggerEnding(dawnConditionsMet() ? 'dawn' : 'starless');
          else if (choice === 'inherit') triggerEnding('blackcrown');
          else if (choice === 'purify') triggerEnding('silence');
          else if (choice === 'enter') triggerEnding('eighthday');
        },
      });
    };
    after(1.6, tryFinal);
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
  if (['dawn', 'blackcrown', 'eighthday', 'silence', 'starless'].includes(id)) META.firstClear = true;
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
  // levels themselves pay out ash — dying at Lv6 still funded the notary
  R.ash += (G.player ? G.player.level : 1) * 8;
  // early-account floor: the first few runs never come home empty-handed
  if (META.runs <= 3) R.ash = Math.max(R.ash, 150);
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
  // 棺中慈悲: died before 5min (300s) → mercy stack (pilgrimage runs only)
  const pilgrimish = G.mode === 'pilgrimage' || G.mode === 'daily';
  if (pilgrimish && !victory && G.time < 300 && !G.executed) META.mercy = Math.min(2, META.mercy + 1);
  if (pilgrimish && (G.executed || victory)) META.mercy = 0;
  // 关闭棺中慈悲＝无条件 +25% 灰烬（与设置页文案一致，不再暗改条件）
  if (META.mercyOff) META.res.ash = Math.round(META.res.ash + R.ash * 0.25);
  // cursed clear stat (vielna unlock)
  const p = G.player;
  if (p && p.relics.filter(r => ['closedeye', 'umbilical', 'hourglass', 'invitation', 'sindice', 'strayKey', 'skinmap', 'holidaycrown'].includes(r)).length >= 3 && (victory || G.bossKills > 0)) {
    META.stats.cursedClear = (META.stats.cursedClear || 0) + 1;
  }
  // noin inherit — always reflects the run that just ended (docs: 继承上一局)
  if (p && p.weapons.length > 1) {
    const cand = p.weapons[1 + ((G.rng() * (p.weapons.length - 1)) | 0)];
    META.noinInherit = { kind: 'weapon', id: cand.id };
  } else META.noinInherit = null;
  META.lastRunSummary = {
    reason, victory, time: G.time, kills: G.kills, elite: G.eliteKills, boss: G.bossKills,
    dmg: G.dmgDealt, taken: G.dmgTaken, level: p ? p.level : 1,
    char: p ? p.char.id : 'adric', mode: G.mode,
    area: G.areaId,
    deathBy: victory ? null
      : reason === '死亡' ? (G.lastHitBy || '未知')
      : reason === '审判失败' ? STORY.bosses.rahshiel.name
      : reason === '接受遗忘' ? '终末钟声' : null,
    gains: { ...R, ash: Math.round(R.ash) },
    artifacts: p ? p.weapons.filter(w => w.evolved).length : 0,
    forbidden: p ? p.forbidden.length : 0,
    confessions: G.confessionsThisRun.length,
    ending: G.endingId,
  };
  saveMeta();
  showResults(META.lastRunSummary);
}
