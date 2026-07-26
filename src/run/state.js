// The single in-run state object G + small shared helpers.
import { SpatialHash, makeRng } from '../core/util.js';
import { BAL } from '../data/balance.js';

export const G = {
  active: false,
  mode: 'pilgrimage',        // pilgrimage | chapter | endless | daily
  seed: 1, rng: null,
  time: 0,                   // run seconds (game clock)
  timeScale: 1,
  phase: 'play',             // play | levelup | reaper | deathchoice | tribunal | finalchoice | ending | results | paused | story
  areaId: 'ashfield', area: null,
  areaEnteredAt: 0,
  player: null,
  enemies: [], projs: [], eprojs: [], pickups: [], parts: [], nums: [], zones: [], obstacles: [], props: [],
  hash: new SpatialHash(88),
  kills: 0, eliteKills: 0, bossKills: 0, dmgDealt: 0, dmgTaken: 0, xpGained: 0,
  gemMerge: 0,
  levelupQueue: 0,
  boss: null,
  knellAt: Infinity, executed: false, revived: false, tribunalTried: false, tribunalWon: false,
  reaper: null,              // cutscene state
  tribunal: null,            // fight state
  obedience: 0, obedienceMax: 100, giftsRefused: 0, giftsTaken: 0,
  affixes: [], loopN: 0,
  difficulty: 'pilgrim', diff: BAL.difficulties.pilgrim,
  sinMarks: 0,
  chestPity: 0,              // artifact pity counter
  worldCores: 0, coreNames: [],
  purifiedForbidden: 0,
  runResources: { ash: 0, nail: 0, bone: 0, pollen: 0, eye: 0 },
  confessionsThisRun: [],
  secretDiffMult: 1,         // 无主钥匙 escalation
  killLedgerBonus: 0,
  bigBellT: 0, fogT: 0, tideT: 0,
  duskT: 0,                  // 瓶中黄昏 timer per area
  storyQueue: [], onStoryDone: null,
  ended: false, endingId: null,
  camTarget: null,
  freeArtifactUpgrade: 0,
  stats1min: null,           // early-run stats for docs acceptance metrics
  dailyDate: null,
  spawnHoldT: 0, surged1: false, surged2: false, areaVisits: {},
  lastSparkT: 0, lastCritJuice: 0, sinDeniedT: 0, whisperT: 0,
};

export function resetG(opts = {}) {
  const seed = opts.seed ?? ((Math.random() * 1e9) | 0);
  Object.assign(G, {
    active: true, mode: opts.mode || 'pilgrimage', seed, rng: makeRng(seed),
    time: 0, timeScale: opts.timeScale || 1, phase: 'play',
    areaId: opts.areaId || 'ashfield', area: null, areaEnteredAt: 0,
    player: null,
    enemies: [], projs: [], eprojs: [], pickups: [], parts: [], nums: [], zones: [], obstacles: [], props: [],
    kills: 0, eliteKills: 0, bossKills: 0, dmgDealt: 0, dmgTaken: 0, xpGained: 0, gemMerge: 0,
    levelupQueue: 0, boss: null,
    knellAt: Infinity, executed: false, revived: false, tribunalTried: false, tribunalWon: false,
    reaper: null, tribunal: null,
    obedience: 0, giftsRefused: 0, giftsTaken: 0,
    affixes: [], loopN: 0,
    difficulty: opts.difficulty || 'pilgrim', diff: BAL.difficulties[opts.difficulty || 'pilgrim'],
    sinMarks: opts.sinMarks || 0,
    chestPity: 0, worldCores: 0, coreNames: [], purifiedForbidden: 0,
    runResources: { ash: 0, nail: 0, bone: 0, pollen: 0, eye: 0 },
    confessionsThisRun: [],
    secretDiffMult: 1, killLedgerBonus: 0,
    bigBellT: 0, fogT: 0, tideT: 0, duskT: 0,
    storyQueue: [], onStoryDone: null,
    ended: false, endingId: null, camTarget: null,
    freeArtifactUpgrade: 0, stats1min: null,
    dailyDate: opts.dailyDate || null,
    // dynamic per-run fields that systems attach at runtime — must not leak across runs
    blackSunT: 0, ninthBellFx: 0, bloodSeaFx: false, silenceT: 0, timeStopT: 0,
    soulnetT: 0, echoAllT: 0, bleedBuffT: 0, kingRavenT: 0, reverseT: 0,
    rareTaken: 0, ledgerKills: 0, lsAcc: 0, lsWindow: 0,
    spawnAcc: 0, eliteT: 70, incenseT: 0, giftT: 0, holidayT: 0, holidayBlessN: 0,
    prayerT: 0, rainT: 0, fleshT: 0, bellWarn: false, bossSpawned: false,
    candleBuffT: 0, duskBuff: 1, tempAtkT: 0, mirrorMult: 1, pausedFrom: null,
    timers: [], purifyOffered: false, lastHitBy: null, echoFire: false,
    ledger: 0, lockedCards: null,
    spawnHoldT: 0, surged1: false, surged2: false, areaVisits: {},
    lastSparkT: 0, lastCritJuice: 0, sinDeniedT: 0, whisperT: 0,
  });
  G.hash.clear();
}

/* ---------- game-time scheduled callbacks (pause-safe) ---------- */
export function after(sec, fn) { G.timers.push({ t: sec, fn }); }
export function tickTimers(dt) {
  for (let i = G.timers.length - 1; i >= 0; i--) {
    const tm = G.timers[i];
    tm.t -= dt;
    if (tm.t <= 0) { G.timers.splice(i, 1); try { tm.fn(); } catch (e) { console.error(e); } }
  }
}

/* ---------- lightweight fx ---------- */
export function num(x, y, v, kind = 'dmg') {
  const S = window.SETTINGS;
  if (S && !S.dmgNumbers && kind === 'dmg') return;
  if (G.nums.length > 80) G.nums.shift();
  G.nums.push({ x: x + (G.rng() * 16 - 8), y, v, t: 0, kind });
}
export function burst(x, y, color, n = 6, spd = 90, life = 0.5, size = 3) {
  if (window.SETTINGS && window.SETTINGS.simpleFx) n = Math.ceil(n / 2);
  if (G.parts.length > 400) return;
  for (let i = 0; i < n; i++) {
    const a = G.rng() * Math.PI * 2, s = spd * (0.4 + G.rng() * 0.8);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: life * (0.6 + G.rng() * 0.7), color, size });
  }
}
export function zone(o) { G.zones.push(Object.assign({ t: 0 }, o)); return o; }

// enemy count helpers for perf budget
export function enemyBudget() {
  const t = G.time / 60;
  let cap = BAL.pressure(t);
  if (G.mode === 'endless') cap = Math.min(500, cap * (1 + G.loopN * BAL.endless.densityAdd));
  // boss fights stay readable: minions are throttled hard while a boss lives
  if (G.boss && !G.boss.dead) cap = Math.min(cap, 24);
  // fresh chapters ramp in over 20s instead of slamming to full density
  const at = G.time - G.areaEnteredAt;
  cap *= Math.min(1, 0.5 + at / 40);
  return Math.min(cap, 460);
}
