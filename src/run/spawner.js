// Enemy spawning, AI behaviors, enemy projectiles, zones, pickups, area events.
import { G, num, burst, zone, enemyBudget } from './state.js';
import { BAL } from '../data/balance.js';
import { ENEMIES, SPAWN_TABLES } from '../data/enemies.js';
import { STORY } from '../data/story.js';
import { META, saveMeta } from '../meta/save.js';
import { dealDamage, applyStatus, freshStatus, healPlayer, playerHurt } from './combat.js';
import { addXp, recomputeStats } from './player.js';
import { angleTo, TAU, clamp, weightedPick } from '../core/util.js';
import { sfx } from '../audio.js';
import { addShake, addFlash } from '../engine.js';

let uid = 1;
const S = () => G.player.S;

/* ================= spawning ================= */
export function spawnEnemy(typeId, x, y, elite = false) {
  const def = ENEMIES[typeId];
  if (!def) return null;
  const t = G.time / 60;
  const zm = BAL.zoneMult[G.areaId] || 1;
  const diffHp = G.diff.hp * (1 + G.sinMarks * 0.15) * G.secretDiffMult * (G.mode === 'endless' ? Math.pow(BAL.endless.hpPow, G.loopN) : 1);
  const diffAtk = G.diff.atk * (1 + G.sinMarks * 0.08) * (G.mode === 'endless' ? Math.pow(BAL.endless.atkPow, G.loopN) : 1);
  let hp = BAL.enemyHp(def.hp, zm, diffHp, t);
  let dmg = BAL.enemyAtk(def.dmg, zm, diffAtk, t);
  // vielna curse: rare items strengthen enemies
  hp *= (1 + (G.rareTaken || 0) * 0.02 + (S().curse || 0) * 0.5);
  if (elite) { hp *= 8; dmg *= 1.5; }
  const e = {
    id: uid++, typeId, def,
    x, y, vx: 0, vy: 0,
    hp, maxHp: hp, dmg, speed: def.speed * (0.9 + G.rng() * 0.2),
    r: def.r * (elite ? 1.35 : 1), armor: def.armor || 0,
    isElite: elite, dead: false, spawning: 0.4,
    st: freshStatus(), kbx: 0, kby: 0, hitT: 0,
    frozenT: 0, liftT: 0, executeMark: 0, dying: 0,
    bt: G.rng() * 3, btPhase: 0,
    xp: elite ? 25 + t * 2 : undefined,
  };
  G.enemies.push(e);
  return e;
}
window.__SPAWN = spawnEnemy;

function spawnPos() {
  const p = G.player;
  const a = G.rng() * TAU;
  // spawn just outside view early on, closer as pressure rises
  const d = (G.time < 120 ? 560 : 490) + G.rng() * 120;
  return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
}

export function updateSpawner(dt) {
  if (G.phase !== 'play') return;
  if (G.areaId === 'corridor') return;         // reaper corridor: no spawns
  const table = SPAWN_TABLES[G.areaId];
  if (!table) return;
  const alive = G.enemies.length;
  const budget = enemyBudget();
  G.spawnAcc = (G.spawnAcc || 0) + dt * (alive < budget * 0.5 ? 3 : alive < budget ? 1.4 : 0);
  const interval = Math.max(0.12, 0.7 - G.time / 60 * 0.02);
  while (G.spawnAcc > interval && G.enemies.length < budget) {
    G.spawnAcc -= interval;
    // opening minutes lean on slow chasers so early pressure reads as a wall,
    // not as untrackable fast swarms (docs: 前90秒压迫但可活)
    const early = G.time < 150 && G.mode !== 'endless';
    const pickArr = table.map(([id, w]) => {
      const b = ENEMIES[id].behavior;
      return { id, w: early && (b === 'swarm' || b === 'dart' || b === 'shoot') ? w * 0.3 : w };
    });
    const pick = weightedPick(G.rng, pickArr);
    const pos = spawnPos();
    spawnEnemy(pick.id, pos.x, pos.y, false);
  }
  // elites
  G.eliteT = (G.eliteT || 70) - dt;
  if (G.eliteT <= 0) {
    G.eliteT = 85;
    const n = 1 + (G.player.relics.includes('invitation') ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const pick = weightedPick(G.rng, table.map(([id, w]) => ({ id, w })));
      const pos = spawnPos();
      const e = spawnEnemy(pick.id, pos.x, pos.y, true);
      if (e && !G.player.relics.includes('closedeye')) num(e.x, e.y - 30, '精英出现', 'warn');
    }
  }
  updateAreaEvents(dt);
}

/* ================= enemy AI update ================= */
export function updateEnemies(dt) {
  const p = G.player;
  G.hash.clear();
  for (const e of G.enemies) if (!e.dead) G.hash.insert(e);
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { G.enemies.splice(i, 1); continue; }
    if (e.dying > 0) { e.dying -= dt; if (e.dying <= 0) { dealDamage(e, 9999, { noCrit: true }); } continue; }
    if (e.spawning > 0) { e.spawning -= dt; if (e.spawning <= 0) e.spawning = 0; continue; }
    if (e.hitT > 0) e.hitT -= dt;
    if (G.timeStopT > 0) continue;
    if (e.frozenT > 0) { e.frozenT -= dt; continue; }
    if (e.liftT > 0) { e.liftT -= dt; e.y -= 60 * dt; continue; }
    // 白昼病/executeMark
    if (e.executeMark > 0) {
      e.executeMark -= dt;
      if (e.hp < e.maxHp * 0.3) { e.executedBySin = true; dealDamage(e, 99999, { noCrit: true }); continue; }
    }
    // mercy dagger relic
    if (!e.isElite && p.relics.includes('mercydagger') && e.hp < e.maxHp * 0.15) {
      e.noXp = true; dealDamage(e, 99999, { noCrit: true }); continue;
    }
    tickStatusesFor(e, dt);
    if (e.dead) continue;
    const fearMul = e.st.fear.t > 0 ? 0.5 : 1;
    const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
    const dirx = (p.x - e.x) / d, diry = (p.y - e.y) / d;
    let mvx = 0, mvy = 0;
    switch (e.def.behavior) {
      case 'chase': mvx = dirx; mvy = diry; break;
      case 'swarm': {
        const s = Math.sin(G.time * 3 + e.id);
        mvx = dirx + -diry * s * 0.5; mvy = diry + dirx * s * 0.5; break;
      }
      case 'dart': {
        e.bt -= dt;
        if (e.btPhase === 0) { mvx = dirx * 0.6; mvy = diry * 0.6; if (e.bt <= 0) { e.btPhase = 1; e.bt = 0.5; e.dashA = Math.atan2(diry, dirx); } }
        else if (e.btPhase === 1) { if (e.bt <= 0) { e.btPhase = 2; e.bt = 0.7; } } // telegraph pause
        else { mvx = Math.cos(e.dashA) * 3.2; mvy = Math.sin(e.dashA) * 3.2; if (e.bt <= 0) { e.btPhase = 0; e.bt = 2 + G.rng() * 2; } }
        break;
      }
      case 'orbit': {
        if (d > 160) { mvx = dirx; mvy = diry; }
        else { mvx = -diry * 1.1 + dirx * 0.15; mvy = dirx * 1.1 + diry * 0.15; }
        break;
      }
      case 'shoot': {
        if (d > 260) { mvx = dirx; mvy = diry; }
        else if (d < 170) { mvx = -dirx; mvy = -diry; }
        e.bt -= dt;
        if (e.bt <= 0 && d < 420) {
          e.bt = e.def.proj.cd * (0.8 + G.rng() * 0.4);
          const a = angleTo(e.x, e.y, p.x, p.y);
          G.eprojs.push({ type: 'shot', x: e.x, y: e.y, vx: Math.cos(a) * e.def.proj.speed, vy: Math.sin(a) * e.def.proj.speed, dmg: e.dmg * 0.8, r: 7, t: 0, life: 3.2 });
        }
        break;
      }
      case 'summoner': {
        mvx = dirx * 0.5; mvy = diry * 0.5;
        e.bt -= dt;
        if (e.bt <= 0 && G.enemies.length < enemyBudget()) {
          e.bt = e.def.cd;
          for (let k = 0; k < 2; k++) spawnEnemy(e.def.summon, e.x + G.rng() * 40 - 20, e.y + G.rng() * 40 - 20, false);
        }
        break;
      }
      default: mvx = dirx; mvy = diry;
    }
    e.vx = mvx * e.speed * fearMul; e.vy = mvy * e.speed * fearMul;
    e.x += (e.vx + e.kbx) * dt; e.y += (e.vy + e.kby) * dt;
    e.kbx *= Math.pow(0.0005, dt); e.kby *= Math.pow(0.0005, dt);
    // 逆流 affix applies to eprojs, not here
    // separation (cheap): push away from one neighbor
    if ((e.id + ((G.time * 60) | 0)) % 4 === 0) {
      G.hash.query(e.x, e.y, e.r + 8, (o) => {
        if (o === e || o.dead) return;
        const dx = e.x - o.x, dy = e.y - o.y, dd2 = dx * dx + dy * dy, rr = e.r + o.r;
        if (dd2 < rr * rr && dd2 > 0.01) {
          const dd = Math.sqrt(dd2), push = (rr - dd) * 0.5;
          e.x += dx / dd * push; e.y += dy / dd * push;
          return true;
        }
      });
    }
    // touch player — hit bumps the attacker back so enemies can't stay glued on
    if (d < e.r + p.r) {
      G.lastHitBy = e.def.name;
      playerHurt(p, e.dmg);
      if (!e.isElite) { e.kbx += (e.x - p.x) / d * 170; e.kby += (e.y - p.y) / d * 170; }
    }
    // too far → wrap to other side
    if (d > 1500) { const np = spawnPos(); e.x = np.x; e.y = np.y; }
  }
}

export function tickStatusesFor(e, dt) {
  // imported inline to avoid circulars in hot path
  const st = e.st;
  if (e.boilT > 0) e.boilT -= dt;
  if (e.bloomT > 0) e.bloomT -= dt;
  if (st.bleed.s > 0) { st.bleed.t -= dt; e.dotAcc = (e.dotAcc || 0) + st.bleed.s * 3 * dt; if (st.bleed.t <= 0) st.bleed.s = 0; }
  if (st.burn.t > 0) {
    st.burn.t -= dt; e.burnTick = (e.burnTick || 0) + dt;
    if (e.burnTick >= 0.5) { e.burnTick = 0; dealDamage(e, st.burn.dps * 0.5 / S().damage, { isDot: true, src: 'burn' }); }
  }
  if (st.rot.t > 0) { st.rot.t -= dt; e.dotAcc = (e.dotAcc || 0) + 4 * dt; }
  if (st.fear.t > 0) st.fear.t -= dt;
  if ((e.dotAcc || 0) >= 3) { const v = e.dotAcc; e.dotAcc = 0; dealDamage(e, v / S().damage, { isDot: true, src: 'dot' }); }
  if (e.numT > 0) { e.numT -= dt; if (e.numT <= 0 && e.numAcc) { num(e.x, e.y - e.r, e.numAcc, 'dmg'); e.numAcc = 0; } }
}

/* ================= enemy projectiles ================= */
export function updateEnemyProjs(dt) {
  const p = G.player;
  for (let i = G.eprojs.length - 1; i >= 0; i--) {
    const pr = G.eprojs[i];
    pr.t += dt;
    if (pr.t > pr.life) {
      if (pr.type === 'boom') { const d2 = (p.x - pr.x) ** 2 + (p.y - pr.y) ** 2; if (d2 < pr.r * pr.r) playerHurt(p, pr.dmg); burst(pr.x, pr.y, 'rgba(201,107,47,0.8)', 10, 120, 0.4); }
      G.eprojs.splice(i, 1); continue;
    }
    if (G.timeStopT > 0) continue;
    if (pr.type === 'shot' || pr.type === 'glyph') {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      const d2 = (p.x - pr.x) ** 2 + (p.y - pr.y) ** 2;
      // 逆流 affix: shots that missed come back once
      if (G.affixes.includes('backflow') && !pr.flipped) {
        if (pr.lastD2 !== undefined && d2 > pr.lastD2 && d2 > 130 * 130) {
          pr.flipped = true;
          const d = Math.sqrt(d2) || 1;
          const sp = Math.hypot(pr.vx, pr.vy);
          pr.vx = (p.x - pr.x) / d * sp; pr.vy = (p.y - pr.y) / d * sp;
          pr.life = Math.min(pr.life, pr.t + 2);
        }
        pr.lastD2 = d2;
      }
      if (d2 < (pr.r + p.r) ** 2) {
        G.lastHitBy = pr.charm ? '白羊之王' : '弹幕';
        playerHurt(p, pr.dmg);
        if (pr.charm) G.obedience = Math.min(100, G.obedience + 8);   // 魅惑弹加顺从
        G.eprojs.splice(i, 1);
      }
    }
  }
}

/* ================= zones ================= */
export function updateZones(dt) {
  const p = G.player;
  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i];
    z.t += dt;
    if (z.t > z.life) { G.zones.splice(i, 1); continue; }
    z.tick = (z.tick || 0) + dt;
    if (z.tick < 0.5) continue;
    z.tick = 0;
    if (z.hostile) {
      // hurts player standing inside
      const d2 = (p.x - z.x) ** 2 + (p.y - z.y) ** 2;
      if (d2 < z.r * z.r) playerHurt(p, z.dps * 0.5);
      continue;
    }
    G.hash.query(z.x, z.y, z.r + 30, (e) => {
      if (e.dead) return;
      if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 > (z.r + e.r) ** 2) return;
      dealDamage(e, z.dps * 0.5 / S().damage, { isDot: true, src: z.kind });
      if (z.rot) applyStatus(e, 'rot');
      if (z.root) { e.kbx = 0; e.kby = 0; e.frozenT = Math.max(e.frozenT, 0.4); }
      if (z.pull) {
        const d = Math.hypot(e.x - z.x, e.y - z.y) || 1;
        e.kbx -= (e.x - z.x) / d * z.pull; e.kby -= (e.y - z.y) / d * z.pull;
      }
      if (z.rats && !e.isElite && e.hp < e.maxHp * 0.15) { dealDamage(e, 9999 / S().damage, { noCrit: true, src: 'rats' }); num(e.x, e.y, '鼠潮吞噬', 'combo'); }
    });
  }
}

/* ================= pickups ================= */
export function updatePickups(dt) {
  const p = G.player;
  const auto = window.SETTINGS?.autoPickup;
  const pr = S().pickup * (G.candleBuffT > 0 ? 1.6 : 1) * (G.affixes.includes('moonless') ? 0.6 : 1);
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const k = G.pickups[i];
    k.t += dt;
    const d2 = (p.x - k.x) ** 2 + (p.y - k.y) ** 2;
    const magnet = k.type === 'gem' && (d2 < pr * pr || auto);
    if (magnet || k.pulled) {
      k.pulled = true;
      const d = Math.sqrt(d2) || 1;
      const sp = 300 + k.t * 500;
      k.x += (p.x - k.x) / d * sp * dt; k.y += (p.y - k.y) / d * sp * dt;
    }
    if (d2 < (p.r + 14) ** 2) {
      // chests/gifts stay on the floor during the tribunal — no UI interrupts there
      if (G.phase === 'tribunal' && (k.type === 'chest' || k.type === 'gift')) continue;
      G.pickups.splice(i, 1);
      collect(k);
    } else if (k.type !== 'gem' && k.life && k.t > k.life) {
      G.pickups.splice(i, 1);
      if (k.type === 'gift') G.giftsRefused++;
    }
  }
}
function collect(k) {
  const p = G.player;
  switch (k.type) {
    case 'gem': sfx.pickup(); addXp(p, k.v); break;
    case 'heart': healPlayer(k.v); num(p.x, p.y - 20, '+' + k.v, 'heal'); break;
    case 'soulheart': healPlayer(k.v); num(p.x, p.y - 20, '血魂 +' + k.v, 'heal'); break;
    case 'chest': import('../ui/levelup.js').then(m => m.openChest()); break;
    case 'fruit': { // hell fruit: strong buff + curse
      const buffs = [
        () => { p.boosts.dmg = (p.boosts.dmg || 0) + 3; num(p.x, p.y - 20, '地狱果实：伤害+18%', 'text'); },
        () => { p.boosts.hp = (p.boosts.hp || 0) + 2; num(p.x, p.y - 20, '地狱果实：生命+20%', 'text'); },
        () => { p.boosts.cdr = (p.boosts.cdr || 0) + 2; num(p.x, p.y - 20, '地狱果实：冷却-8%', 'text'); },
      ];
      buffs[(G.rng() * buffs.length) | 0]();
      p.permCurse += 0.05;
      recomputeStats(p);
      sfx.chest();
      break;
    }
    case 'confession': {
      const c = k.conf;
      if (c) {
        if (!META.confessionsFound.includes(c.id)) META.confessionsFound.push(c.id);
        if (/^s\d$/.test(c.id) && !META.saintConfessions.includes(c.id)) META.saintConfessions.push(c.id);
        // 儿童祷文 for mina's unlock — a fixed set of child-voiced confessions
        const CHILD_PRAYERS = ['c03', 'c04', 'c09', 'c13', 'c14', 'c17', 'c52'];
        META.stats.prayers = CHILD_PRAYERS.filter(id => META.confessionsFound.includes(id)).length;
        G.confessionsThisRun.push(c.id);
        saveMeta();
        window.__TOAST && window.__TOAST(c.title, c.text);
        G.runResources.pollen += G.areaId === 'fakeheaven' ? 3 : 1;
      }
      sfx.chest();
      break;
    }
    case 'gift': {
      G.giftsTaken++;
      G.obedience = Math.min(100, G.obedience + 15);
      healPlayer(p.S.maxHp * 0.3);
      num(p.x, p.y - 20, '「吃吧，你不用再战斗了。」', 'text');
      break;
    }
    case 'candle': {
      G.candleBuffT = 12;
      num(p.x, p.y - 20, '烛光引路', 'text');
      sfx.pickup();
      break;
    }
  }
}

/* ================= area events & hazards ================= */
export function setupArea(areaId) {
  G.obstacles.length = 0; G.props.length = 0; G.zones.length = 0; G.eprojs.length = 0;
  G.candleBuffT = 0; G.duskT = 60;
  const p = G.player;
  const rng = G.rng;
  // scatter obstacles + props by area
  const obsN = { ashfield: 26, cathedral: 20, bells: 24, corridor: 0, tribunal: 0, hell: 18, fakeheaven: 14, trueheaven: 16, corpsesea: 12 }[areaId] || 14;
  const obsMul = p && p.relics.includes('skinmap') ? 1.5 : 1;
  for (let i = 0; i < obsN * obsMul; i++) {
    const a = rng() * TAU, d = 200 + rng() * 900;
    G.obstacles.push({ x: (p ? p.x : 0) + Math.cos(a) * d, y: (p ? p.y : 0) + Math.sin(a) * d, r: 16 + rng() * 10, hp: 30, kind: areaId === 'ashfield' ? 'grave' : areaId === 'bells' ? 'tower' : 'rock' });
  }
  // candles in ashfield
  if (areaId === 'ashfield') for (let i = 0; i < 6; i++) {
    const a = rng() * TAU, d = 250 + rng() * 700;
    G.pickups.push({ type: 'candle', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, t: 0, life: 999 });
  }
  // confession pickups: 2 normal + maybe saint
  const pool = STORY.confessions.filter(c => c.area === areaId && !META.confessionsFound.includes(c.id));
  const fallback = STORY.confessions.filter(c => c.area === areaId);
  const picks = [];
  const saint = pool.find(c => /^s\d$/.test(c.id));
  if (saint) picks.push(saint);
  while (picks.length < 3 && (pool.length || fallback.length)) {
    const arr = pool.length ? pool : fallback;
    const c = arr[(rng() * arr.length) | 0];
    if (!picks.includes(c)) picks.push(c);
    if (pool.includes(c)) pool.splice(pool.indexOf(c), 1);
  }
  for (const c of picks) {
    const a = rng() * TAU, d = 300 + rng() * 800;
    G.pickups.push({ type: 'confession', conf: c, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, t: 0, life: 9999 });
  }
  // secret room chest (无主钥匙)
  if (p && p.relics.includes('strayKey')) {
    const a = rng() * TAU;
    G.pickups.push({ type: 'chest', secret: true, x: p.x + Math.cos(a) * 1000, y: p.y + Math.sin(a) * 1000, t: 0, life: 9999 });
  }
  // fake heaven: light/shadow zones
  if (areaId === 'fakeheaven') {
    for (let i = 0; i < 5; i++) {
      const a = rng() * TAU, d = 200 + rng() * 700;
      G.props.push({ kind: 'light', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 130 });
    }
    for (let i = 0; i < 4; i++) {
      const a = rng() * TAU, d = 200 + rng() * 700;
      G.props.push({ kind: 'shadow', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 110 });
    }
    G.giftT = 25;
  }
  // hell: iron flower traps
  if (areaId === 'hell') for (let i = 0; i < 12; i++) {
    const a = rng() * TAU, d = 220 + rng() * 800;
    G.props.push({ kind: 'trap', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 26, armed: false, t: 0 });
  }
}

function updateAreaEvents(dt) {
  const p = G.player;
  if (G.candleBuffT > 0) G.candleBuffT -= dt;
  if (G.duskT > 0) { G.duskT -= dt; G.duskBuff = p.relics.includes('bottleddusk') ? 1.3 : 1; }
  else G.duskBuff = p.relics.includes('bottleddusk') ? 0.9 : 1;
  switch (G.areaId) {
    case 'ashfield':
      G.fogT += dt;
      if (G.fogT > 120) { G.fogT = -15; } // negative = fog active 15s
      break;
    case 'cathedral': {
      G.incenseT = (G.incenseT || 0) - dt;
      if (G.incenseT <= 0) {
        G.incenseT = 14;
        for (let i = 0; i < 2; i++) {
          const a = G.rng() * TAU, d = 150 + G.rng() * 300;
          zone({ kind: 'poison', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 110, life: 12, dps: 8, color: 'rgba(117,135,107,0.22)', hostile: true });
        }
        // stained glass light strips
        const a2 = G.rng() * TAU, d2 = 200 + G.rng() * 260;
        zone({ kind: 'glass', x: p.x + Math.cos(a2) * d2, y: p.y + Math.sin(a2) * d2, r: 90, life: 10, dps: 12, color: 'rgba(124,95,138,0.28)', hostile: true });
      }
      break;
    }
    case 'bells': {
      G.bigBellT += dt;
      if (G.bigBellT > 42 && !G.bellWarn) { G.bellWarn = true; num(p.x, p.y - 40, '巨钟将鸣——寻找阴影！', 'warn'); sfx.bell(); }
      if (G.bigBellT > 45) {
        G.bigBellT = 0; G.bellWarn = false;
        sfx.bigbell(); addShake(12); addFlash('#46608a', 0.4);
        // safe if near an obstacle (shadow)
        let safe = false;
        for (const o of G.obstacles) if (!o.dead && (p.x - o.x) ** 2 + (p.y - o.y) ** 2 < 110 * 110) { safe = true; break; }
        if (!safe) playerHurt(p, 25 * G.diff.atk);
        for (const e of G.enemies) if (!e.dead && !e.isElite) dealDamage(e, 20 / S().damage, { noCrit: true, src: 'bigbell' });
      }
      G.tideT += dt;
      if (G.tideT > 120) {
        G.tideT = 0;
        num(p.x, p.y - 40, '涨潮', 'warn');
        for (let i = 0; i < 12; i++) { const pos = spawnPos(); spawnEnemy('tidecorpse', pos.x, pos.y, false); }
      }
      break;
    }
    case 'hell': {
      for (const pr of G.props) {
        if (pr.kind !== 'trap') continue;
        const d2 = (p.x - pr.x) ** 2 + (p.y - pr.y) ** 2;
        if (!pr.armed && d2 < pr.r * pr.r) { pr.armed = true; pr.t = 1.1; }
        if (pr.armed) {
          pr.t -= dt;
          if (pr.t <= 0) {
            pr.kind = 'usedtrap';
            const dd2 = (p.x - pr.x) ** 2 + (p.y - pr.y) ** 2;
            if (dd2 < (pr.r + 30) ** 2) playerHurt(p, 20 * G.diff.atk);
            burst(pr.x, pr.y, 'rgba(212,71,79,0.8)', 10, 130, 0.5);
            addShake(3);
          }
        }
      }
      break;
    }
    case 'fakeheaven': {
      updateObedience(dt);
      G.giftT -= dt;
      if (G.giftT <= 0) {
        G.giftT = 30;
        const a = G.rng() * TAU;
        G.pickups.push({ type: 'gift', x: p.x + Math.cos(a) * 220, y: p.y + Math.sin(a) * 220, t: 0, life: 12 });
        num(p.x, p.y - 40, '白衣者留下了礼物', 'warn');
      }
      // holiday crown relic
      if (p.relics.includes('holidaycrown')) {
        G.holidayT = (G.holidayT || 60) - dt;
        if (G.holidayT <= 0) { G.holidayT = 60; p.boosts.dmg = (p.boosts.dmg || 0) + 1; recomputeStats(p); num(p.x, p.y - 24, '假日祝福', 'text'); G.holidayBlessN = (G.holidayBlessN || 0) + 1; }
      }
      break;
    }
    case 'trueheaven': {
      // falling black prayers
      G.prayerT = (G.prayerT || 0) - dt;
      if (G.prayerT <= 0) {
        G.prayerT = 2.2;
        for (let i = 0; i < 3; i++) {
          const tx = p.x + G.rng() * 500 - 250, ty = p.y + G.rng() * 500 - 250;
          G.eprojs.push({ type: 'glyph', x: tx, y: ty - 320, vx: 0, vy: 300, dmg: 18 * G.diff.atk, r: 10, t: 0, life: 1.4 });
        }
      }
      break;
    }
    case 'corpsesea': {
      if (G.affixes.includes('fleshbell')) {
        G.fleshT = (G.fleshT || 0) + dt;
        if (G.fleshT >= 60) { G.fleshT = 0; const pos = spawnPos(); const e = spawnEnemy('hymnbearer', pos.x, pos.y, true); if (e) num(e.x, e.y - 30, '肉钟隆起', 'warn'); }
      }
      if (G.affixes.includes('blackrain')) {
        G.rainT = (G.rainT || 0) + dt;
        if (G.rainT > 6) {
          G.rainT = 0;
          for (let i = 0; i < 6; i++) {
            const tx = p.x + G.rng() * 600 - 300, ty = p.y + G.rng() * 600 - 300;
            zone({ kind: 'rain', x: tx, y: ty, r: 50, life: 1.5, dps: 15, color: 'rgba(30,25,40,0.4)', hostile: G.rng() < 0.5 });
          }
        }
      }
      break;
    }
  }
  // obstacles: break under player weapon fire (approx: nearby projectiles chew them)
  for (const o of G.obstacles) {
    if (o.dead) continue;
    if (o.kind === 'tower') continue;    // bell-shadow towers are indestructible
    for (const pr of G.projs) {
      if ((pr.x - o.x) ** 2 + (pr.y - o.y) ** 2 < (o.r + 14) ** 2) { o.hp -= 12; break; }
    }
    if (o.hp <= 0) { o.dead = true; burst(o.x, o.y, 'rgba(143,133,112,0.7)', 8, 90, 0.4); if (G.areaId === 'ashfield' && G.rng() < 0.3) G.pickups.push({ type: 'gem', x: o.x, y: o.y, v: 5, tier: 1, t: 0 }); }
  }
  // 白昼病 affix — stillness in the light breeds obedience
  if (G.affixes.includes('daysick') && G.areaId !== 'fakeheaven') {
    if (!p.moving) G.obedience = Math.min(100, G.obedience + dt * 2.2);
    else G.obedience = Math.max(0, G.obedience - dt * 0.5);
    if (G.obedience >= 100) { G.obedience = 0; playerHurt(p, p.S.maxHp * 0.2); num(p.x, p.y - 30, '白昼病发作', 'warn'); }
  }
}

function updateObedience(dt) {
  const p = G.player;
  let rate = 0.55;                              // base creep
  if (!p.moving && !G.boss) rate += 0.5;        // idling
  let inLight = false, inShadow = false;
  for (const pr of G.props) {
    const d2 = (p.x - pr.x) ** 2 + (p.y - pr.y) ** 2;
    if (pr.kind === 'light' && d2 < pr.r * pr.r) inLight = true;
    if (pr.kind === 'shadow' && d2 < pr.r * pr.r) inShadow = true;
  }
  if (inLight) rate += 0.8;
  if (inShadow) rate -= 1.6;
  if (p.relics.includes('lambmask')) rate *= 0.5;
  if (G.boss) rate = Math.min(rate, 0.2);
  G.obedience = clamp(G.obedience + rate * dt, 0, 100);
  if (G.obedience >= 100 && !G.ended) {
    import('./flow.js').then(m => m.triggerEnding('whitedream'));
  }
}
