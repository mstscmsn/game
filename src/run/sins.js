// 角色罪技 — 10 unique active skills
import { G, num, burst } from './state.js';
import { dealDamage, dealAreaDamage, applyStatus, healPlayer } from './combat.js';
import { sfx } from '../audio.js';
import { addShake, addFlash, hitStop } from '../engine.js';
import { META } from '../meta/save.js';

export function castSin(p) {
  if (p.sin.charge < p.sin.need || p.sin.active > 0) return false;
  if (G.phase !== 'play' && G.phase !== 'tribunal') return false;
  p.sin.charge = 0;
  sfx.sinCast();
  addShake(5);
  const id = p.char.id;
  switch (id) {
    case 'adric': // 开棺: absorb 3s then explode 300%
      p.sin.active = 3; p.sin.data = { absorbed: 40 };
      num(p.x, p.y - 24, '开棺', 'skill');
      break;
    case 'evlann': { // 逆祷弥撒
      let drained = 0;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const v = Math.max(6, e.maxHp * 0.06);
        dealDamage(e, v / p.S.damage, { noCrit: true, src: 'sin' });
        applyStatus(e, 'bleed'); applyStatus(e, 'bleed');
        drained += v;
      }
      healPlayer(Math.min(p.S.maxHp * 0.5, drained * 0.05));
      G.bleedBuffT = 8;
      addFlash('#8E1F2F', 0.4);
      num(p.x, p.y - 24, '逆祷弥撒', 'skill');
      break;
    }
    case 'hemer': { // 黑疫诊断: detonate rot
      let n = 0;
      for (const e of G.enemies) {
        if (e.dead || e.st.rot.t <= 0) continue;
        n++;
        dealAreaDamage(e.x, e.y, 55, 40, { color: 'rgba(117,135,107,0.85)', src: 'sin' });
      }
      num(p.x, p.y - 24, `黑疫诊断 ×${n}`, 'skill');
      break;
    }
    case 'corlan': // 第七回响
      G.echoAllT = 4;
      num(p.x, p.y - 24, '第七回响', 'skill');
      break;
    case 'vielna': { // 黑羽加冕: king raven devours elites
      let n = 0;
      for (const e of G.enemies) {
        if (e.dead || (!e.isElite && !e.isBoss)) continue;
        if (e.isBoss) { dealDamage(e, 300, { src: 'sin' }); continue; }
        n++;
        e.executedBySin = true;
        dealDamage(e, e.hp / p.S.damage + 50, { noCrit: true, src: 'sin' });
      }
      G.kingRavenT = 1.2;
      addFlash('#0B0A0C', 0.5);
      num(p.x, p.y - 24, n ? `黑羽加冕 吞噬${n}` : '黑羽加冕', 'skill');
      break;
    }
    case 'samuel': { // 猎杀月: snipe 6 highest hp
      const targets = [...G.enemies].filter(e => !e.dead).sort((a, b) => b.hp - a.hp).slice(0, 6);
      let i = 0;
      for (const e of targets) {
        setTimeout(() => {
          if (e.dead || !G.active) return;
          G.projs.push({ type: 'snipe', x: p.x, y: p.y, tx: e.x, ty: e.y, target: e, t: 0, life: 0.4, dmg: 120 });
        }, i * 120);
        i++;
      }
      num(p.x, p.y - 24, '猎杀月', 'skill');
      break;
    }
    case 'mina': // 妈妈在门后: giant hand sweep
      G.projs.push({ type: 'ghosthand', x: p.x - 320, y: p.y, t: 0, life: 1.6, dmg: 90, hitIds: new Set() });
      p.ghosts = Math.min(3, p.ghosts + 1);
      num(p.x, p.y - 24, '妈妈在门后', 'skill');
      break;
    case 'voll': { // 无罪宣判: forward cone execute state
      const fx = p.facing;
      p.sinExecute = true;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        if (Math.abs(dy) < Math.abs(dx) * 1.2 && dx * fx > 0 && Math.hypot(dx, dy) < 300) {
          e.executeMark = 5;
          dealDamage(e, 50, { src: 'sin' });
        }
      }
      setTimeout(() => { p.sinExecute = false; }, 5200);
      num(p.x, p.y - 24, '无罪宣判', 'skill');
      break;
    }
    case 'rahshiel': { // 天门倒悬
      for (const e of G.enemies) {
        if (e.dead || e.isBoss) continue;
        e.liftT = 1.0;
      }
      setTimeout(() => {
        if (!G.active) return;
        for (const e of G.enemies) {
          if (e.dead || e.isBoss) continue;
          dealDamage(e, 80, { noCrit: true, src: 'sin' });
        }
        addShake(10); sfx.bigbell();
      }, 1000);
      if (G.boss && !G.boss.dead) dealDamage(G.boss, 250, { src: 'sin' });
      num(p.x, p.y - 24, '天门倒悬', 'skill');
      break;
    }
    case 'noin': { // 删除三秒
      const snap = p.snapshots && p.snapshots.find(s => G.time - s.t >= 3);
      if (snap) {
        p.x = snap.x; p.y = snap.y;
        p.hp = Math.min(p.S.maxHp, Math.max(p.hp, snap.hp));
        p.invT = 1;
        burst(p.x, p.y, 'rgba(233,229,218,0.8)', 12, 100, 0.5);
      }
      num(p.x, p.y - 24, '删除三秒', 'skill');
      break;
    }
  }
  return true;
}

export function updateSin(p, dt) {
  // noin snapshots
  if (p.char.id === 'noin') {
    p.snapshots = p.snapshots || [];
    p.snapT = (p.snapT || 0) + dt;
    if (p.snapT >= 0.25) {
      p.snapT = 0;
      p.snapshots.push({ t: G.time, x: p.x, y: p.y, hp: p.hp });
      while (p.snapshots.length > 24) p.snapshots.shift();
    }
  }
  if (p.sin.active > 0) {
    p.sin.active -= dt;
    if (p.sin.active <= 0 && p.char.id === 'adric' && p.sin.data) {
      const dmg = p.sin.data.absorbed * 3;
      dealAreaDamage(p.x, p.y, 180, dmg / p.S.damage, { color: 'rgba(212,71,79,0.9)', src: 'sin' });
      addShake(8); hitStop(0.1);
      p.sin.data = null;
    }
  }
  if (G.echoAllT > 0) G.echoAllT -= dt;
  if (G.bleedBuffT > 0) G.bleedBuffT -= dt;
  if (G.kingRavenT > 0) G.kingRavenT -= dt;
}
