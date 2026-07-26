// All weapon behaviors: 16 base, 16 evolved (artifact), 6 forbidden, projectile sim.
import { G, num, burst, zone } from './state.js';
import { BAL } from '../data/balance.js';
import { WEAPON_BY_ID } from '../data/weapons.js';
import { dealDamage, dealAreaDamage, applyStatus, healPlayer } from './combat.js';
import { sfx } from '../audio.js';
import { addShake, addFlash, hitStop, view } from '../engine.js';
import { angleTo, TAU, clamp } from '../core/util.js';

const S = () => G.player.S;
const FB = 10; // forbidden-weapon base damage unit

function wStat(w) {
  const def = WEAPON_BY_ID[w.id];
  const b = { ...def.base };
  for (let l = 2; l <= w.lv; l++) {
    const bonus = def.lvBonus && def.lvBonus[l];
    if (bonus) for (const [k, v] of Object.entries(bonus)) b[k] = (b[k] || 0) + v;
  }
  let dmgMult = BAL.weaponLvMult[Math.min(7, w.lv - 1)];
  if (w.evolved) dmgMult *= BAL.artifactMult;
  if (w.purified) dmgMult *= 0.7;
  b.damage = (b.damage || 0) * dmgMult;
  b.cooldown = (b.cooldown || 0) * (1 - S().cdr);
  return b;
}

function nearestEnemy(x, y, maxD = 900) {
  let best = null, bd = maxD * maxD;
  for (const e of G.enemies) {
    if (e.dead || e.spawning > 0) continue;
    const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d2 < bd) { bd = d2; best = e; }
  }
  if (G.boss && !G.boss.dead) {
    const d2 = (G.boss.x - x) ** 2 + (G.boss.y - y) ** 2;
    if (d2 < bd) { best = G.boss; }
  }
  return best;
}
function randomEnemy() {
  const alive = G.enemies.filter(e => !e.dead && !(e.spawning > 0));
  if (G.boss && !G.boss.dead) alive.push(G.boss);
  if (!alive.length) return null;
  return alive[(G.rng() * alive.length) | 0];
}
function densestPoint() {
  let bx = G.player.x, by = G.player.y, best = 0;
  for (let i = 0; i < 8; i++) {
    const e = randomEnemy();
    if (!e) break;
    let n = 0;
    G.hash.query(e.x, e.y, 140, () => { n++; });
    if (n > best) { best = n; bx = e.x; by = e.y; }
  }
  return { x: bx, y: by, n: best };
}

/* ============ per-frame weapon updates ============ */
export function updateWeapons(dt) {
  const p = G.player;
  for (const w of p.weapons) {
    const def = WEAPON_BY_ID[w.id];
    const st = wStat(w);
    if (w.id === 'saw') { updateSaw(w, st, dt); continue; }
    if (w.id === 'chalice') { updateChalice(w, st, dt); continue; }
    if (w.id === 'censer') { updateCenser(w, st, dt); continue; }
    w.cd -= dt;
    if (w.cd <= 0) {
      w.cd = Math.max(0.2, st.cooldown);
      fireWeapon(w, st);
    }
  }
  updateForbidden(dt);
}

function fireCount(extra = 0) { return 1 + (S().amount || 0) + extra; }

// central fire dispatcher (handles echo effects)
function fireWeapon(w, st, isEcho = false) {
  const p = G.player;
  FIRE[w.evolved ? 'evo_' + w.id : w.id](w, st);
  if (!isEcho) {
    p.lastWeaponFire = { id: w.id, evolved: w.evolved };
    // corlan passive: every 7th attack resonates
    if (p.char.id === 'corlan') {
      p.fireCount = (p.fireCount || 0) + 1;
      if (p.fireCount % 7 === 0) setTimeout(() => G.active && fireWeapon(w, st, true), 120);
    }
    // corlan sin
    if (G.echoAllT > 0) setTimeout(() => G.active && fireWeapon(w, st, true), 180);
    // rahshiel char wing echo
    if (p.wingEcho > 0) { p.wingEcho = 0; setTimeout(() => G.active && fireWeapon(w, st, true), 100); }
    // 无尽告解室 forbidden: 4 mirrors copy at 45%
    if (p.forbidden.includes('confessroom')) {
      for (let i = 0; i < 4; i++) setTimeout(() => { if (G.active) { G.mirrorMult = 0.45; FIRE[w.evolved ? 'evo_' + w.id : w.id](w, st); G.mirrorMult = 1; } }, 60 + i * 60);
    }
  }
}
const M = () => G.mirrorMult || 1;

/* ============ 16 + 16 behaviors ============ */
const FIRE = {
  /* —— 斩罪锯 / 血月公转 (persistent, see updateSaw) —— */
  saw() {}, evo_saw() {},
  /* —— 送葬钟 —— */
  bell(w, st) {
    const p = G.player;
    const r = st.radius * S().area;
    ringFx(p.x, p.y, r, 'rgba(181,141,59,0.55)');
    sfx.bell();
    G.hash.query(p.x, p.y, r + 30, (e) => {
      if (e.dead) return;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (r + e.r) ** 2) dealDamage(e, st.damage * M(), { src: 'bell', knock: 260 });
    });
    if (G.boss && !G.boss.dead && (G.boss.x - p.x) ** 2 + (G.boss.y - p.y) ** 2 <= r * r) dealDamage(G.boss, st.damage * M(), { src: 'bell' });
  },
  evo_bell(w, st) { // 万灵丧钟: 全屏, freeze normals, soul burst
    sfx.bigbell();
    addFlash('#B58D3B', 0.3);
    ringFx(G.player.x, G.player.y, 480, 'rgba(181,141,59,0.8)', 0.7);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (!e.isElite) e.frozenT = 1.5;
      dealDamage(e, st.damage * M(), { src: 'bell', tags: ['soul'] });
    }
    if (G.boss && !G.boss.dead) dealDamage(G.boss, st.damage * M(), { src: 'bell' });
  },
  /* —— 逆骨矛 —— */
  spear(w, st) {
    const p = G.player, t = nearestEnemy(p.x, p.y);
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const a = t ? angleTo(p.x, p.y, t.x, t.y) + (i - (n - 1) / 2) * 0.12 : p.facing > 0 ? 0 : Math.PI;
      G.projs.push({ type: 'spear', x: p.x, y: p.y, vx: Math.cos(a) * st.speed * S().projSpeed, vy: Math.sin(a) * st.speed * S().projSpeed, dmg: st.damage * M(), t: 0, life: 1.1, r: 9, pierce: st.pierce });
    }
  },
  evo_spear(w, st) { // 伪神脊柱
    const d = densestPoint();
    const a = angleTo(G.player.x, G.player.y, d.x, d.y);
    addShake(6);
    G.projs.push({ type: 'spine', x: G.player.x, y: G.player.y, a, t: 0, life: 0.5, dmg: st.damage * M(), len: 620, width: 46 });
    zone({ kind: 'bonewall', x: d.x, y: d.y, r: 90 * S().area, life: 3.5, dps: st.damage * 0.25, color: 'rgba(216,199,164,0.25)' });
  },
  /* —— 灰烬经卷 —— */
  scripture(w, st) {
    const p = G.player;
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const t = randomEnemy();
      const a = G.rng() * TAU;
      G.projs.push({ type: 'page', x: p.x, y: p.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, target: t, dmg: st.damage * M(), t: 0, life: 2.4, r: 8, turn: 5, speed: st.speed * S().projSpeed });
    }
  },
  evo_scripture(w, st) { // 日蚀福音: radial black beams
    const p = G.player;
    addFlash('#0B0A0C', 0.2);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + G.time;
      G.projs.push({ type: 'blackbeam', x: p.x, y: p.y, a, t: 0, life: 0.35, dmg: st.damage * M(), len: 420, width: 20 });
    }
  },
  /* —— 瘟疫香炉 (persistent) —— */
  censer() {}, evo_censer() {},
  /* —— 引魂灯 —— */
  lantern(w, st) {
    const p = G.player;
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const t = randomEnemy();
      G.projs.push({ type: 'soulfire', x: p.x + G.rng() * 30 - 15, y: p.y + G.rng() * 30 - 15, vx: 0, vy: -40, target: t, dmg: st.damage * M(), t: 0, life: 4, r: 8, speed: st.speed * S().projSpeed, tags: ['soul'] });
    }
  },
  evo_lantern(w, st) { // 千魂长夜: soulfire + beams between them (handled in update)
    FIRE.lantern(w, st);
    G.soulnetT = 4;
  },
  /* —— 忏悔锁链 —— */
  chain(w, st) {
    const p = G.player;
    const reach = st.reach * S().area, arc = st.arc;
    const dir = p.facing > 0 ? 0 : Math.PI;
    chainFx(p, reach, dir, arc);
    G.hash.query(p.x, p.y, reach + 30, (e) => {
      if (e.dead) return;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > reach + e.r) return;
      let da = Math.abs(((angleTo(p.x, p.y, e.x, e.y) - dir + TAU + Math.PI) % TAU) - Math.PI);
      if (da > arc / 2 && d > reach * 0.4) return;
      dealDamage(e, st.damage * M(), { src: 'chain', tags: ['chain'] });
      // pull; feared targets pulled hard (公开处刑)
      const pull = e.st.fear.t > 0 ? 220 : 60;
      const dd = d || 1;
      e.kbx -= (e.x - p.x) / dd * pull; e.kby -= (e.y - p.y) / dd * pull;
      if (e.st.fear.t > 0) num(e.x, e.y - e.r - 8, '公开处刑', 'combo');
      if (G.rng() < 0.3) applyStatus(e, 'fear');
    });
    if (G.boss && !G.boss.dead && Math.hypot(G.boss.x - p.x, G.boss.y - p.y) < reach + 30) dealDamage(G.boss, st.damage * M(), { src: 'chain' });
  },
  evo_chain(w, st) { // 缚世炽天使: cross pin zone
    const d = densestPoint();
    addShake(5);
    zone({ kind: 'cross', x: d.x, y: d.y, r: 170 * S().area, life: 2.2, dps: st.damage * 0.7, color: 'rgba(216,199,164,0.35)', root: true });
    sfx.bell();
  },
  /* —— 月蚀圣杯 (persistent) —— */
  chalice() {}, evo_chalice() {},
  /* —— 腐鸦 —— */
  raven(w, st) {
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const t = randomEnemy();
      if (!t) return;
      G.projs.push({ type: 'ravenDive', x: t.x + (G.rng() * 60 - 30), y: t.y - 220, tx: t.x, ty: t.y, t: 0, life: 0.55, dmg: st.damage * M(), r: 26 });
    }
  },
  evo_raven(w, st) { // 黑羽加冕: feather rain + elite execute
    const d = densestPoint();
    for (let i = 0; i < 8; i++) {
      G.projs.push({ type: 'ravenDive', x: d.x + G.rng() * 160 - 80, y: d.y - 240 - G.rng() * 60, tx: d.x + G.rng() * 160 - 80, ty: d.y + G.rng() * 120 - 60, t: 0, life: 0.55 + G.rng() * 0.3, dmg: st.damage * 0.6 * M(), r: 24 });
    }
    for (const e of G.enemies) {
      if (!e.dead && e.isElite && e.hp < e.maxHp * 0.2) { e.executedBySin = true; dealDamage(e, e.hp / S().damage + 10, { noCrit: true, src: 'raven' }); num(e.x, e.y - 20, '吞噬', 'combo'); }
    }
  },
  /* —— 罪镜 —— */
  mirrorw(w, st) {
    const p = G.player;
    const last = p.lastWeaponFire;
    if (!last || last.id === 'mirrorw') return;
    const lw = p.weapons.find(x => x.id === last.id);
    if (!lw) return;
    G.mirrorMult = (G.mirrorMult || 1) * st.copyMult;
    FIRE[lw.evolved ? 'evo_' + lw.id : lw.id](lw, wStat(lw));
    G.mirrorMult = 1;
    mirrorFx(p);
  },
  evo_mirrorw(w, st) { // 无尽告解: copy up to 4 distinct weapons
    const p = G.player;
    const others = p.weapons.filter(x => x.id !== 'mirrorw').slice(0, 4);
    let i = 0;
    for (const lw of others) {
      setTimeout(() => {
        if (!G.active) return;
        G.mirrorMult = st.copyMult;
        FIRE[lw.evolved ? 'evo_' + lw.id : lw.id](lw, wStat(lw));
        G.mirrorMult = 1;
      }, i * 90);
      i++;
    }
    mirrorFx(p);
  },
  /* —— 断翼刃 —— */
  wingblade(w, st) {
    const p = G.player;
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const a = (nearestEnemy(p.x, p.y) ? angleTo(p.x, p.y, nearestEnemy(p.x, p.y).x, nearestEnemy(p.x, p.y).y) : 0) + i * 0.5 - (n - 1) * 0.25;
      G.projs.push({ type: 'boomer', x: p.x, y: p.y, vx: Math.cos(a) * st.speed * S().projSpeed, vy: Math.sin(a) * st.speed * S().projSpeed, dmg: st.damage * M(), t: 0, life: 1.6, r: 10, back: false });
    }
  },
  evo_wingblade(w, st) { FIRE.wingblade(w, st); },
  /* —— 地狱火铳 —— */
  musket(w, st) {
    const p = G.player, t = nearestEnemy(p.x, p.y);
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const a = t ? angleTo(p.x, p.y, t.x, t.y) + (i ? (G.rng() - 0.5) * 0.2 : 0) : (p.facing > 0 ? 0 : Math.PI);
      G.projs.push({ type: 'bullet', x: p.x, y: p.y, sx: p.x, sy: p.y, vx: Math.cos(a) * st.speed * S().projSpeed, vy: Math.sin(a) * st.speed * S().projSpeed, dmg: st.damage * M(), t: 0, life: 1.3, r: 7, pierce: 999 });
    }
    w.st.shots = (w.st.shots || 0) + 1;
    noiseKick();
  },
  evo_musket(w, st) {
    FIRE.musket(w, st);
    if (w.st.shots % 7 === 0) { // 七日阳炮
      const p = G.player, t = nearestEnemy(p.x, p.y);
      const a = t ? angleTo(p.x, p.y, t.x, t.y) : (p.facing > 0 ? 0 : Math.PI);
      addShake(8); addFlash('#e8d98a', 0.35); hitStop(0.06);
      G.projs.push({ type: 'sunbeam', x: p.x, y: p.y, a, t: 0, life: 0.5, dmg: st.damage * 3 * M(), len: 900, width: 42 });
    }
  },
  /* —— 墓碑弓 —— */
  bow(w, st) {
    const p = G.player;
    const dirx = p.facing, cx = p.x + dirx * st.range * 0.6, cy = p.y;
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      G.projs.push({ type: 'arrowRain', x: cx + G.rng() * st.spread - st.spread / 2, y: cy + G.rng() * st.spread - st.spread / 2 - 200, t: 0, life: 0.4 + G.rng() * 0.25, dmg: st.damage * M(), r: 20 * S().area });
    }
  },
  evo_bow(w, st) { // 墓名暴雨: target highest hp
    const targets = [...G.enemies].filter(e => !e.dead).sort((a, b) => b.hp - a.hp).slice(0, Math.min(8, fireCount(st.amount)));
    if (G.boss && !G.boss.dead) targets.unshift(G.boss);
    for (const t of targets) {
      G.projs.push({ type: 'tombstone', x: t.x, y: t.y - 240, tx: t.x, ty: t.y, target: t, t: 0, life: 0.5, dmg: st.damage * 1.4 * M(), r: 34 * S().area });
    }
  },
  /* —— 圣骸轮 —— */
  wheel(w, st) {
    const p = G.player;
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const a = G.rng() * TAU;
      G.projs.push({ type: 'wheel', x: p.x, y: p.y, vx: Math.cos(a) * st.speed * S().projSpeed, vy: Math.sin(a) * st.speed * S().projSpeed, dmg: st.damage * M(), t: 0, life: 5, r: 17, bounces: st.bounces });
    }
  },
  evo_wheel(w, st) {
    const p = G.player;
    const a = G.rng() * TAU;
    G.projs.push({ type: 'millstone', x: p.x, y: p.y, vx: Math.cos(a) * st.speed * 0.4, vy: Math.sin(a) * st.speed * 0.4, dmg: st.damage * M(), t: 0, life: 6, r: 34, bounces: 99 });
  },
  /* —— 告解匕首 —— */
  dagger(w, st) {
    const p = G.player, t = nearestEnemy(p.x, p.y, 500);
    if (!t) return;
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const a = angleTo(p.x, p.y, t.x, t.y) + (i ? (G.rng() - 0.5) * 0.25 : 0);
      G.projs.push({ type: 'dagger', x: p.x, y: p.y, vx: Math.cos(a) * st.speed * S().projSpeed, vy: Math.sin(a) * st.speed * S().projSpeed, dmg: st.damage * M(), t: 0, life: 1, r: 6, pierce: 0 });
    }
  },
  evo_dagger(w, st) { // 千刀赦罪
    FIRE.dagger(w, st);
    const t = nearestEnemy(G.player.x, G.player.y, 500);
    if (t && G.rng() < 0.5) {
      for (let i = 0; i < 5; i++) {
        const a = G.rng() * TAU;
        G.projs.push({ type: 'phantomdagger', x: t.x + Math.cos(a) * 60, y: t.y + Math.sin(a) * 60, target: t, t: 0, life: 0.4, dmg: st.damage * 0.8 * M() });
      }
      applyStatus(t, 'sin'); applyStatus(t, 'sin');
    }
  },
  /* —— 绝祷琴 —— */
  harp(w, st) {
    const p = G.player, t = nearestEnemy(p.x, p.y);
    const dir = t ? angleTo(p.x, p.y, t.x, t.y) : (p.facing > 0 ? 0 : Math.PI);
    const n = fireCount((st.amount || 1) - 1);
    for (let i = 0; i < n; i++) {
      const a = dir + (i - (n - 1) / 2) * (st.arc / Math.max(1, n - 1) || 0.3);
      G.projs.push({ type: 'wave', x: p.x, y: p.y, vx: Math.cos(a) * st.speed * S().projSpeed, vy: Math.sin(a) * st.speed * S().projSpeed, dmg: st.damage * M(), t: 0, life: 1.4, r: 14, pierce: 6 });
    }
  },
  evo_harp(w, st) { // 无声末日
    FIRE.harp(w, st);
    w.st.silCount = (w.st.silCount || 0) + 1;
    if (w.st.silCount % 5 === 0) {
      G.silenceT = 1.2;
      setTimeout(() => {
        if (!G.active) return;
        sfx.bigbell(); addShake(10); addFlash('#EEEBDD', 0.5);
        dealAreaDamage(G.player.x, G.player.y, 400, st.damage * 4, { color: 'rgba(238,235,221,0.6)', src: 'silentend' });
        for (const e of G.enemies) if (!e.dead) applyStatus(e, 'fear');
      }, 1200);
    }
  },
};

/* ============ persistent weapons ============ */
function updateSaw(w, st, dt) {
  const p = G.player;
  w.st.a = (w.st.a || 0) + dt * st.spin;
  const n = st.amount + (S().amount || 0);
  const R = (st.orbitR + (w.st.extraR || 0)) * S().area;
  w.st.blades = [];
  const layers = w.evolved ? 2 : 1;
  for (let L = 0; L < layers; L++) {
    const dir = L === 0 ? 1 : -1, rr = R * (1 + L * 0.55);
    for (let i = 0; i < n; i++) {
      const a = w.st.a * dir + i / n * TAU;
      const bx = p.x + Math.cos(a) * rr, by = p.y + Math.sin(a) * rr;
      w.st.blades.push({ x: bx, y: by });
      G.hash.query(bx, by, 26, (e) => {
        if (e.dead) return;
        if ((e.x - bx) ** 2 + (e.y - by) ** 2 > (16 + e.r) ** 2) return;
        if (hitCd(e, 'saw', 0.4)) return;
        dealDamage(e, st.damage, { src: 'saw', knock: 60 });
        applyStatus(e, 'bleed');
        if (G.bleedBuffT > 0) applyStatus(e, 'bleed');
      });
      if (G.boss && !G.boss.dead && (G.boss.x - bx) ** 2 + (G.boss.y - by) ** 2 < (20 + G.boss.r) ** 2 && !hitCd(G.boss, 'saw', 0.4)) {
        dealDamage(G.boss, st.damage, { src: 'saw' });
        applyStatus(G.boss, 'bleed');
      }
    }
  }
  if (w.evolved && w.st.extraR < 70) w.st.extraR = Math.min(70, (w.st.extraR || 0) + G.kills * 0.0001);
}
function updateChalice(w, st, dt) {
  const p = G.player;
  w.st.tick = (w.st.tick || 0) + dt;
  if (w.st.tick < 0.5) return;
  w.st.tick = 0;
  const R = st.auraR * S().area * (w.evolved ? 1.6 : 1);
  let dealt = 0;
  G.hash.query(p.x, p.y, R + 30, (e) => {
    if (e.dead) return;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (R + e.r) ** 2) return;
    dealt += dealDamage(e, st.damage * 0.5, { src: 'chalice', isDot: false, noCrit: true, tags: ['soul'] });
    if (w.evolved && e.isElite && e.hp <= 0) zone({ kind: 'bloodpillar', x: e.x, y: e.y, r: 40, life: 5, dps: st.damage, color: 'rgba(142,31,47,0.5)' });
  });
  if (G.boss && !G.boss.dead && (G.boss.x - p.x) ** 2 + (G.boss.y - p.y) ** 2 < R * R) dealt += dealDamage(G.boss, st.damage * 0.5, { src: 'chalice', noCrit: true });
  if (dealt > 0) {
    if (w.evolved) p.shield = Math.min(p.S.maxHp * 0.4, p.shield + dealt * 0.03);
    else healPlayer(st.heal * 0.5, { lifesteal: true });
  }
  w.st.R = R;
}
function updateCenser(w, st, dt) {
  const p = G.player;
  w.st.tick = (w.st.tick || 0) + dt;
  if (w.st.tick < 0.4) return;
  w.st.tick = 0;
  const R = st.cloudR * S().area;
  zone({ kind: 'plague', x: p.x + (G.rng() * 20 - 10), y: p.y + (G.rng() * 20 - 10), r: R, life: st.cloudT, dps: st.damage, color: w.evolved ? 'rgba(90,120,60,0.30)' : 'rgba(117,135,107,0.25)', rot: true, rats: w.evolved });
}

/* ============ helpers ============ */
function hitCd(e, key, cd) {
  e.hitCds = e.hitCds || {};
  if ((e.hitCds[key] || 0) > G.time) return true;
  e.hitCds[key] = G.time + cd;
  return false;
}
function ringFx(x, y, r, color, life = 0.4) { G.parts.push({ ring: true, x, y, r: 10, maxR: r, t: 0, life, color }); }
function chainFx(p, reach, dir, arc) { G.parts.push({ chainArc: true, x: p.x, y: p.y, dir, arc, r: reach, t: 0, life: 0.22, color: 'rgba(154,161,168,0.8)' }); }
function mirrorFx(p) { burst(p.x, p.y - 20, 'rgba(233,229,218,0.6)', 6, 60, 0.35, 2); }
function noiseKick() { addShake(1.5); }

export function spawnIronFlower(x, y) {
  zone({ kind: 'ironflower', x, y, r: 90, life: 6, dps: 15, color: 'rgba(212,71,79,0.3)' });
}

/* ============ forbidden weapons 创世禁器 ============ */
export function updateForbidden(dt) {
  const p = G.player;
  if (!p.forbidden.length) return;
  const hunger = G.affixes.includes('hungerart') ? 1.5 : 1;
  const dmgMul = (G.affixes.includes('hungerart') ? 2 : 1) * S().damage;
  for (const f of p.forbidden) {
    const st = p.fbState[f] = p.fbState[f] || { cd: 3, satellites: 0, killBase: G.kills };
    switch (f) {
      case 'blacksun': {
        st.cd -= dt;
        if (st.cd <= 0) { st.cd = 18 * hunger; st.active = 3; G.blackSunT = 3; sfx.forbidden(); addFlash('#0B0A0C', 0.6); hitStop(0.35); }
        if (st.active > 0) {
          st.active -= dt;
          st.tick = (st.tick || 0) + dt;
          if (st.tick > 0.25) {
            st.tick = 0;
            for (const e of G.enemies) {
              if (e.dead) continue;
              e.sunExposure = (e.sunExposure || 0) + 0.25;
              if (!e.isElite && e.sunExposure > 1.5) { dealDamage(e, e.hp / S().damage + 5, { noCrit: true, src: 'blacksun' }); }
              else if (e.isElite && e.hp < e.maxHp * 0.35) { e.executedBySin = true; dealDamage(e, e.hp / S().damage + 5, { noCrit: true, src: 'blacksun' }); num(e.x, e.y, '焚毁', 'combo'); }
              else dealDamage(e, FB * 8 * dmgMul / S().damage * 0.25, { isDot: true, src: 'blacksun' });
            }
            if (G.boss && !G.boss.dead) {
              st.bossAcc = (st.bossAcc || 0);
              const cap = G.boss.maxHp * 0.03;
              if (st.bossAcc < cap) { const d = Math.min(cap - st.bossAcc, G.boss.maxHp * 0.005); st.bossAcc += d; dealDamage(G.boss, d / S().damage, { noCrit: true, src: 'blacksun' }); }
            }
          }
        } else { st.bossAcc = 0; for (const e of G.enemies) e.sunExposure = 0; }
        break;
      }
      case 'ninthbell': {
        st.cd -= dt;
        if (st.cd <= 0) {
          st.cd = 24 * hunger;
          G.silenceT = 0.8;
          setTimeout(() => {
            if (!G.active) return;
            sfx.bigbell(); addShake(14); addFlash('#EEEBDD', 0.7); hitStop(0.35);
            G.timeStopT = 2.5; G.ninthBellFx = 2.5;
            G.eprojs.length = 0;   // shatter enemy projectiles
            for (const e of [...G.enemies]) {
              if (e.dead) continue;
              if (!e.isElite) dealDamage(e, e.hp / S().damage + 10, { noCrit: true, src: 'ninthbell' });
              else dealDamage(e, FB * 24 * dmgMul / S().damage, { src: 'ninthbell' });
            }
            if (G.boss && !G.boss.dead) {
              const cap = G.boss.maxHp * 0.1;
              dealDamage(G.boss, Math.min(cap, G.boss.hp * 0.08) / S().damage, { noCrit: true, src: 'ninthbell' });
            }
          }, 800);
        }
        break;
      }
      case 'crimsonfeast': {
        st.tick = (st.tick || 0) + dt;
        G.bloodSeaFx = true;
        if (st.tick > 0.5) {
          st.tick = 0;
          let dealt = 0;
          for (const e of G.enemies) {
            if (e.dead) continue;
            dealt += dealDamage(e, FB * 6 * dmgMul / S().damage * 0.5, { isDot: true, src: 'feast' });
            if (e.hp <= 0 && e.isElite) zone({ kind: 'bloodpillar', x: e.x, y: e.y, r: 46, life: 5, dps: FB * 4, color: 'rgba(142,31,47,0.55)' });
          }
          if (G.boss && !G.boss.dead) dealt += dealDamage(G.boss, FB * 6 * dmgMul / S().damage * 0.5, { isDot: true, src: 'feast' });
          healPlayer(dealt * 0.004, { lifesteal: true });
        }
        break;
      }
      case 'skypiercer': {
        st.cd -= dt;
        if (st.cd <= 0) {
          st.cd = 15 * hunger;
          const d = densestPoint();
          const a = angleTo(G.player.x, G.player.y, d.x, d.y);
          sfx.forbidden(); addShake(10); hitStop(0.3);
          G.projs.push({ type: 'spine', x: G.player.x, y: G.player.y, a, t: 0, life: 0.6, dmg: FB * 30 * dmgMul, len: 900, width: 60, holy: true });
          zone({ kind: 'rift', x: d.x, y: d.y, r: 120, life: 6, dps: FB * 5 * dmgMul, color: 'rgba(124,95,138,0.4)', pull: 180 });
        }
        break;
      }
      case 'confessroom': break; // passive, handled in fireWeapon
      case 'starfuneral': {
        if (G.kills - st.killBase >= 700) {
          st.killBase = G.kills;
          const d = densestPoint();
          sfx.forbidden(); addShake(12); addFlash('#e8d98a', 0.5); hitStop(0.3);
          if (G.boss && !G.boss.dead && st.satellites < 7) {
            st.satellites++;
            num(G.boss.x, G.boss.y - 40, `灵魂卫星 ${st.satellites}/7`, 'skill');
            if (st.satellites >= 7) {
              dealDamage(G.boss, FB * 40 * 7 * dmgMul / S().damage, { noCrit: true, src: 'starfuneral' });
              st.satellites = 0;
              num(G.boss.x, G.boss.y - 60, '群星葬礼', 'skill');
            }
          } else {
            dealAreaDamage(d.x, d.y, 200, FB * 40 * dmgMul / S().damage, { color: 'rgba(232,217,138,0.8)', src: 'starfuneral' });
          }
        }
        // satellites dps
        if (st.satellites > 0 && G.boss && !G.boss.dead) {
          st.satTick = (st.satTick || 0) + dt;
          if (st.satTick > 1) { st.satTick = 0; dealDamage(G.boss, FB * 2 * st.satellites * dmgMul / S().damage, { noCrit: true, src: 'starfuneral' }); }
        }
        break;
      }
    }
  }
}

/* ============ projectile simulation ============ */
export function updateProjectiles(dt) {
  const p = G.player;
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const pr = G.projs[i];
    pr.t += dt;
    if (pr.t > pr.life) { G.projs.splice(i, 1); continue; }
    switch (pr.type) {
      case 'spear': case 'bullet': case 'dagger': case 'wave': case 'spike':
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        hitAlong(pr, () => {
          if (pr.type === 'wave') return { fear: true };
          if (pr.type === 'bullet' && p.char.id === 'samuel') {
            const d = Math.hypot(pr.x - pr.sx, pr.y - pr.sy);
            return { dmgMul: 1 + Math.min(0.6, d / 700 * 0.6) };
          }
          if (pr.type === 'dagger') return { backstab: true };
          return {};
        });
        break;
      case 'page': case 'soulfire': {
        if (pr.target && (pr.target.dead)) pr.target = randomEnemy();
        if (pr.target) {
          const a = angleTo(pr.x, pr.y, pr.target.x, pr.target.y);
          const cur = Math.atan2(pr.vy, pr.vx);
          let da = ((a - cur + TAU + Math.PI) % TAU) - Math.PI;
          const na = cur + clamp(da, -pr.turn * dt, pr.turn * dt);
          const sp = pr.speed;
          pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
        }
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        hitAlong(pr, () => pr.type === 'soulfire' ? { tags: ['soul'], once: true } : { once: true });
        // soulnet beams
        if (pr.type === 'soulfire' && G.soulnetT > 0) {
          for (const o of G.projs) {
            if (o === pr || o.type !== 'soulfire') continue;
            const d2 = (o.x - pr.x) ** 2 + (o.y - pr.y) ** 2;
            if (d2 < 240 * 240 && G.rng() < dt * 2) lineDamage(pr.x, pr.y, o.x, o.y, 14, pr.dmg * 0.3, { tags: ['soul'], src: 'soulnet' });
          }
        }
        break;
      }
      case 'boomer': {
        if (!pr.back) {
          pr.vx *= (1 - 2.2 * dt); pr.vy *= (1 - 2.2 * dt);
          if (Math.hypot(pr.vx, pr.vy) < 40) pr.back = true;
        } else {
          const a = angleTo(pr.x, pr.y, p.x, p.y);
          pr.vx = Math.cos(a) * 420; pr.vy = Math.sin(a) * 420;
          if ((pr.x - p.x) ** 2 + (pr.y - p.y) ** 2 < 400) { G.projs.splice(i, 1); continue; }
        }
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        hitAlong(pr, () => ({ repeatCd: 0.3 }));
        break;
      }
      case 'wheel': case 'millstone': {
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        // bounce on camera bounds
        const bw = 300, bh = 560;
        if (pr.x < p.x - bw || pr.x > p.x + bw) { pr.vx *= -1; pr.bounces--; }
        if (pr.y < p.y - bh || pr.y > p.y + bh) { pr.vy *= -1; pr.bounces--; }
        if (pr.bounces <= 0) { if (pr.type === 'millstone') zone({ kind: 'bonewall', x: pr.x, y: pr.y, r: 70, life: 3, dps: pr.dmg * 0.2, color: 'rgba(216,199,164,0.3)' }); G.projs.splice(i, 1); continue; }
        hitAlong(pr, () => ({ repeatCd: 0.35, knock: pr.type === 'millstone' ? 150 : 60 }));
        if (pr.type === 'millstone' && G.rng() < dt * 1.2) zone({ kind: 'bonewall', x: pr.x, y: pr.y, r: 50, life: 2, dps: pr.dmg * 0.15, color: 'rgba(216,199,164,0.25)' });
        break;
      }
      case 'ravenDive': {
        const k = pr.t / pr.life;
        pr.cx = pr.x + (pr.tx - pr.x) * k;
        pr.cy = pr.y + (pr.ty - pr.y) * (k * k);
        if (pr.t + dt > pr.life) {
          dealAreaDamage(pr.tx, pr.ty, pr.r, pr.dmg, { color: 'rgba(11,10,12,0.7)', src: 'raven' });
        }
        break;
      }
      case 'tombstone': {
        if (pr.target && !pr.target.dead) { pr.tx = pr.target.x; pr.ty = pr.target.y; }
        if (pr.t + dt > pr.life) {
          dealAreaDamage(pr.tx, pr.ty, pr.r, pr.dmg, { color: 'rgba(216,199,164,0.6)', src: 'bow' });
          addShake(2);
        }
        break;
      }
      case 'arrowRain': {
        if (pr.t + dt > pr.life) dealAreaDamage(pr.x, pr.y + 200, pr.r, pr.dmg, { color: 'rgba(216,199,164,0.5)', src: 'bow', fx: false });
        break;
      }
      case 'spine': case 'blackbeam': case 'sunbeam': {
        if (!pr.applied) {
          pr.applied = true;
          lineDamage(pr.x, pr.y, pr.x + Math.cos(pr.a) * pr.len, pr.y + Math.sin(pr.a) * pr.len, pr.width, pr.dmg, { src: pr.type });
        }
        break;
      }
      case 'snipe': {
        if (!pr.applied) {
          pr.applied = true;
          if (pr.target && !pr.target.dead) dealDamage(pr.target, pr.dmg, { forcedCrit: true, src: 'snipe' });
        }
        break;
      }
      case 'phantomdagger': {
        if (!pr.applied && pr.t > pr.life * 0.5) {
          pr.applied = true;
          if (pr.target && !pr.target.dead) { dealDamage(pr.target, pr.dmg, { forcedCrit: true, src: 'dagger' }); applyStatus(pr.target, 'sin'); }
        }
        break;
      }
      case 'ghosthand': {
        pr.x += 420 * dt;
        G.hash.query(pr.x, pr.y, 130, (e) => {
          if (e.dead || pr.hitIds.has(e.id)) return;
          pr.hitIds.add(e.id);
          dealDamage(e, pr.dmg, { src: 'ghosthand', knock: 200 });
          applyStatus(e, 'fear');
        });
        break;
      }
      case 'crowpet': {
        pr.cd -= dt;
        const t = nearestEnemy(pr.x, pr.y, 400);
        if (t) {
          const a = angleTo(pr.x, pr.y, t.x, t.y);
          pr.x += Math.cos(a) * 160 * dt; pr.y += Math.sin(a) * 160 * dt;
          if (pr.cd <= 0 && (t.x - pr.x) ** 2 + (t.y - pr.y) ** 2 < (t.r + 12) ** 2) {
            pr.cd = 0.5;
            dealDamage(t, pr.dmg, { src: 'crow' });
            applyStatus(t, 'rot');
          }
        } else { pr.x += Math.sin(G.time + pr.life) * 40 * dt; pr.y -= 20 * dt; }
        break;
      }
    }
  }
}

function hitAlong(pr, optsFn) {
  G.hash.query(pr.x, pr.y, 40, (e) => {
    if (e.dead || pr.dead) return;
    if ((e.x - pr.x) ** 2 + (e.y - pr.y) ** 2 > (pr.r + e.r) ** 2) return;
    const o = optsFn(e) || {};
    if (o.repeatCd) { if (hitCd(e, pr.type, o.repeatCd)) return; }
    else if (o.once !== false) {
      pr.hitIds = pr.hitIds || new Set();
      if (pr.hitIds.has(e.id)) return;
      pr.hitIds.add(e.id);
    }
    let forced = false;
    if (o.backstab) { const dot = pr.vx * (e.vx || 0) + pr.vy * (e.vy || 0); if (dot > 0) forced = true; }
    dealDamage(e, pr.dmg * (o.dmgMul || 1), { src: pr.type, forcedCrit: forced, knock: o.knock, tags: o.tags || pr.tags });
    if (o.fear) applyStatus(e, 'fear');
    if (pr.type === 'spike') applyStatus(e, 'rot');
    if (pr.pierce !== undefined && pr.pierce !== 999) {
      pr.pierce--;
      if (pr.pierce < 0) { pr.dead = true; }
    }
  });
  // boss hits
  const b = G.boss;
  if (b && !b.dead && (b.x - pr.x) ** 2 + (b.y - pr.y) ** 2 < (pr.r + b.r) ** 2) {
    if (!hitCd(b, pr.type, 0.25)) {
      const o = optsFn(b) || {};
      dealDamage(b, pr.dmg * (o.dmgMul || 1), { src: pr.type, tags: o.tags || pr.tags });
    }
  }
  if (pr.dead) { const idx = G.projs.indexOf(pr); if (idx >= 0) G.projs.splice(idx, 1); }
}

export function lineDamage(x1, y1, x2, y2, width, dmg, opts = {}) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const check = (e) => {
    if (e.dead) return;
    const t = clamp(((e.x - x1) * dx + (e.y - y1) * dy) / len2, 0, 1);
    const px = x1 + dx * t, py = y1 + dy * t;
    if ((e.x - px) ** 2 + (e.y - py) ** 2 < (width + e.r) ** 2) dealDamage(e, dmg, opts);
  };
  for (const e of G.enemies) check(e);
  if (G.boss && !G.boss.dead) check(G.boss);
  G.parts.push({ beam: true, x1, y1, x2, y2, width, t: 0, life: 0.3, color: opts.src === 'sunbeam' ? 'rgba(232,217,138,0.9)' : opts.src === 'blackbeam' ? 'rgba(11,10,12,0.85)' : 'rgba(216,199,164,0.8)' });
}
