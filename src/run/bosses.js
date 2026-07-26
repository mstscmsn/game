// Area bosses with phase scripts.
import { G, num, burst, zone, after } from './state.js';
import { BAL } from '../data/balance.js';
import { STORY } from '../data/story.js';
import { META, saveMeta } from '../meta/save.js';
import { freshStatus, playerHurt, dealDamage } from './combat.js';
import { spawnEnemy, tickStatusesFor } from './spawner.js';
import { angleTo, TAU, clamp } from '../core/util.js';
import { sfx } from '../audio.js';
import { addShake, addFlash, hitStop } from '../engine.js';

const SPRITE_OF = { anlo: 'anlo', mimi: 'mimi', whale: 'whale', rahshiel: 'rahshielBoss', margola: 'margola', lambking: 'lambking', mother: 'mother' };

export function spawnBoss(id) {
  const p = G.player;
  let hp = (BAL.bossHp[id] || 50000) * G.diff.hp * (1 + G.sinMarks * 0.15);
  if (id === 'rahshiel') {
    // tiered by artifact count, not live DPS (docs §12.5)
    const arts = p.weapons.filter(w => w.evolved).length;
    hp = (BAL.bossHp.rahshiel + arts * 25000) * G.diff.hp;
  }
  if (G.affixes.includes('hollowsaint')) hp *= 0.8;
  const boss = {
    id, isBoss: true, sprite: SPRITE_OF[id],
    x: p.x, y: p.y - 380,
    hp, maxHp: hp, r: id === 'whale' || id === 'mother' ? 52 : 40,
    dmg: 20 * G.diff.atk * (1 + G.time / 60 * 0.03),
    phase: 1, t: 0, patT: 3, invulnT: 0.8, dead: false,
    st: freshStatus(), armor: 0, kbx: 0, kby: 0,
    atkSpeed: G.affixes.includes('hollowsaint') ? 1.35 : 1,
    wombs: [],
  };
  G.boss = boss;
  sfx.boss();
  hitStop(0.3);
  addShake(6);
  zone({ kind: 'warn', x: boss.x, y: boss.y, r: 90, life: 1.0, dps: 0, color: 'rgba(212,71,79,0.2)', warnOnly: true });
  const meta = STORY.bosses[id];
  if (meta) {
    window.__BANNER && window.__BANNER(meta.name, meta.intro[0] || '');
    for (let k = 1; k < meta.intro.length; k++) {
      const ln = meta.intro[k];
      after(4.5 * k, () => { if (G.boss === boss && !boss.dead) window.__BANNER && window.__BANNER('', ln); });
    }
  }
  return boss;
}

export function updateBoss(dt) {
  const b = G.boss;
  if (!b || b.dead) return;
  const p = G.player;
  b.t += dt;
  if (b.invulnT > 0) b.invulnT -= dt;
  if (b.hitT > 0) b.hitT -= dt;
  tickStatusesFor(b, dt);          // 流血/灼烧/腐烂等状态对 Boss 正常结算
  if (b.dead) return;
  if (G.timeStopT > 0) return;
  // stay near player
  const d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
  if (d > 700) { b.x = p.x + (b.x - p.x) / d * 650; b.y = p.y + (b.y - p.y) / d * 650; }
  // phase transitions (max 0.8s invuln per docs)
  const frac = b.hp / b.maxHp;
  const phases = b.id === 'rahshiel' || b.id === 'mother' ? [0.66, 0.33] : [0.5];
  const targetPhase = 1 + phases.filter(x => frac < x).length;
  if (targetPhase > b.phase) {
    b.phase = targetPhase;
    b.invulnT = 0.8;
    addShake(6); addFlash('#49364F', 0.3);
    sfx.boss();
    num(b.x, b.y - b.r - 20, '阶段转换', 'warn');
  }
  b.patT -= dt * b.atkSpeed;
  BOSS_AI[b.id] && BOSS_AI[b.id](b, p, dt);
  // touch damage (not while submerged/invisible)
  if (!b.invisible && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r) { G.lastHitBy = 'Boss'; playerHurt(p, b.dmg); }
  if (b.hp <= 0 && !b.dead) killBoss(b);
}

function shoot(b, a, speed, dmg, r = 8, life = 3) {
  G.eprojs.push({ type: 'shot', x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, r, t: 0, life });
}
function ringShot(b, n, speed, dmg, offset = 0) {
  for (let i = 0; i < n; i++) shoot(b, i / n * TAU + offset, speed, dmg);
}
function warnZone(x, y, r, dps, delay = 1.1, life = 1.5, color = 'rgba(212,71,79,0.28)') {
  zone({ kind: 'warn', x, y, r, life: delay, dps: 0, color: 'rgba(212,71,79,0.16)', hostile: false, warnOnly: true });
  after(delay, () => zone({ kind: 'bossz', x, y, r, life, dps, color, hostile: true }));
}

const BOSS_AI = {
  /* 裂腹圣徒·安洛 — writes burning prayers on the ground */
  anlo(b, p, dt) {
    seek(b, p, 28, dt);
    if (b.patT <= 0) {
      b.patT = b.phase === 1 ? 4.4 : 3.2;
      const mode = (b.pat = ((b.pat || 0) + 1) % (b.phase === 1 ? 2 : 3));
      if (mode === 0) {
        // prayer line: row of zones with a gap
        const a = angleTo(b.x, b.y, p.x, p.y);
        const gap = 2 + ((G.rng() * 3) | 0);
        for (let i = 0; i < 7; i++) {
          if (i === gap) continue;
          const px = b.x + Math.cos(a) * (80 + i * 70), py = b.y + Math.sin(a) * (80 + i * 70);
          warnZone(px, py, 46, 18 * G.diff.atk, 1.2, 2.2);
        }
        num(b.x, b.y - 60, '肠祷成文', 'warn');
      } else if (mode === 1) {
        ringShot(b, 8, 150, b.dmg * 0.7);
      } else {
        // explosive scripture circle around player
        for (let i = 0; i < 6; i++) {
          const a2 = i / 6 * TAU;
          warnZone(p.x + Math.cos(a2) * 120, p.y + Math.sin(a2) * 120, 50, 20 * G.diff.atk, 1.0, 1.6);
        }
      }
    }
  },
  /* 腐香主教·米弥 — incense modes */
  mimi(b, p, dt) {
    seek(b, p, 20, dt, 260);
    b.modeT = (b.modeT || 0) - dt;
    if (b.modeT <= 0) {
      b.modeT = 9;
      b.mode = ['red', 'green', 'white', 'black'][(G.rng() * 4) | 0];
      const names = { red: '红香·烈', green: '绿香·腐', white: '白香·逆', black: '黑香·亡' };
      num(b.x, b.y - 70, names[b.mode], 'warn');
      if (b.mode === 'white') { G.reverseT = 3.5; num(p.x, p.y - 30, '操控反转！', 'warn'); }
    }
    if (b.patT <= 0) {
      b.patT = b.phase === 1 ? 2.6 : 1.8;
      switch (b.mode) {
        case 'red': { const a = angleTo(b.x, b.y, p.x, p.y); for (let i = -1; i <= 1; i++) shoot(b, a + i * 0.22, 220, b.dmg * 0.9); break; }
        case 'green': zone({ kind: 'poison', x: p.x + G.rng() * 120 - 60, y: p.y + G.rng() * 120 - 60, r: 100, life: 6, dps: 10 * G.diff.atk, color: 'rgba(117,135,107,0.3)', hostile: true }); break;
        case 'white': ringShot(b, 6, 130, b.dmg * 0.6, G.rng()); break;
        case 'black': if (G.enemies.length < 300) for (let i = 0; i < 3; i++) spawnEnemy('ashmonk', b.x + G.rng() * 80 - 40, b.y + G.rng() * 80 - 40, false); break;
      }
    }
  },
  /* 吞钟鲸 — submerge & breach */
  whale(b, p, dt) {
    b.subT = (b.subT || 0) - dt;
    if (b.state === 'dive') {
      b.diveT -= dt;
      b.invisible = true;
      if (b.diveT <= 0) {
        b.state = 'breach'; b.invisible = false;
        b.x = b.tx; b.y = b.ty;
        addShake(10); sfx.bigbell();
        const rr = 130;
        if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < rr * rr) playerHurt(p, b.dmg * 1.4);
        burst(b.x, b.y, 'rgba(70,96,138,0.8)', 18, 200, 0.6, 4);
        b.patT = 2;
      }
      return;
    }
    seek(b, p, 16, dt, 300);
    if (b.subT <= 0) {
      b.subT = 11;
      b.state = 'dive'; b.diveT = 1.6;
      b.tx = p.x; b.ty = p.y;
      warnZone(p.x, p.y, 130, 0, 1.6, 0.1);
      num(p.x, p.y - 40, '鲸影自下而来', 'warn');
      return;
    }
    if (b.patT <= 0) {
      b.patT = b.phase === 1 ? 3.4 : 2.4;
      // bell shockwave volley
      const a = angleTo(b.x, b.y, p.x, p.y);
      for (let i = 0; i < (b.phase === 1 ? 3 : 5); i++) shoot(b, a + (i - 2) * 0.18, 190, b.dmg * 0.8, 12);
      sfx.bell();
    }
  },
  /* 堕翼审判者 — 3-phase tribunal duel */
  rahshiel(b, p, dt) {
    seek(b, p, 46, dt, 200);
    if (b.phase === 1) { // 折翼: feather volleys
      if (b.patT <= 0) {
        b.patT = 2.2;
        const a = angleTo(b.x, b.y, p.x, p.y);
        for (let i = -2; i <= 2; i++) shoot(b, a + i * 0.16, 250, b.dmg * 0.8, 8);
      }
    } else if (b.phase === 2) { // 断言: judgment text floor
      if (b.patT <= 0) {
        b.patT = 3.6;
        num(b.x, b.y - 70, '断言', 'warn');
        // rows of judgment covering arena with random safe column
        const safe = (G.rng() * 5) | 0;
        for (let i = 0; i < 5; i++) {
          if (i === safe) continue;
          warnZone(p.x - 220 + i * 110, p.y - 60, 60, 26 * G.diff.atk, 1.3, 1.2);
          warnZone(p.x - 220 + i * 110, p.y + 80, 60, 26 * G.diff.atk, 1.3, 1.2);
        }
      }
    } else { // 碎环: rotating halo, windows of vulnerability
      b.haloA = (b.haloA || 0) + dt * 1.6;
      b.winT = (b.winT || 0) - dt;
      if (b.winT <= 0) { b.winT = 4; b.vulnT = 2; num(b.x, b.y - 70, '光环核心暴露', 'warn'); }
      if (b.vulnT > 0) { b.vulnT -= dt; b.armor = 0; } else b.armor = 300;
      if (b.patT <= 0) {
        b.patT = 1.4;
        for (let i = 0; i < 3; i++) shoot(b, b.haloA + i / 3 * TAU, 210, b.dmg * 0.7, 9);
      }
    }
  },
  /* 地狱产婆·玛戈拉 — womb adds gate her */
  margola(b, p, dt) {
    seek(b, p, 22, dt, 280);
    // maintain wombs
    b.wombs = b.wombs.filter(w => !w.dead);
    if (b.wombs.length === 0 && (b.wombCd = (b.wombCd || 0) - dt) <= 0) {
      b.wombCd = 6;
      for (let i = 0; i < (b.phase === 1 ? 2 : 3); i++) {
        const a = G.rng() * TAU;
        const womb = spawnEnemy('furnacewalker', b.x + Math.cos(a) * 160, b.y + Math.sin(a) * 160, true);
        if (womb) { womb.womb = true; womb.speed = 6; womb.hp = womb.maxHp = womb.maxHp * 0.5; womb.xp = 8; b.wombs.push(womb); }
      }
      num(b.x, b.y - 70, '胎炉运转——摧毁它们！', 'warn');
    }
    b.gated = b.wombs.some(w => !w.dead);
    b.armor = b.gated ? 500 : 0;
    if (b.patT <= 0) {
      b.patT = b.phase === 1 ? 3 : 2.2;
      // mechanical arm sweep: warn line then damage
      const a = angleTo(b.x, b.y, p.x, p.y);
      for (let i = 1; i <= 5; i++) warnZone(b.x + Math.cos(a) * i * 70, b.y + Math.sin(a) * i * 70, 40, 24 * G.diff.atk, 0.9, 0.6);
      if (b.phase >= 2 && G.enemies.length < 320) for (let i = 0; i < 2; i++) spawnEnemy('hellimp', b.x, b.y, false);
    }
  },
  /* 白羊之王 — cute → palace of faces */
  lambking(b, p, dt) {
    if (b.phase === 1) {
      b.r = 22;
      seek(b, p, 36, dt);
      if (b.patT <= 0) { b.patT = 2.8; const a = angleTo(b.x, b.y, p.x, p.y); shoot(b, a, 170, b.dmg * 0.7, 8); }
    } else {
      b.r = 46;
      seek(b, p, 18, dt, 300);
      if (b.patT <= 0) {
        b.patT = 2.0;
        b.pat = ((b.pat || 0) + 1) % 3;
        if (b.pat === 0) { ringShot(b, 10, 160, b.dmg * 0.7, G.time); num(b.x, b.y - 70, '微笑绽放', 'warn'); }
        else if (b.pat === 1) {
          // charm cone: raises obedience if hit
          const a = angleTo(b.x, b.y, p.x, p.y);
          for (let i = -2; i <= 2; i++) { const pr = { type: 'shot', x: b.x, y: b.y, vx: Math.cos(a + i * 0.14) * 200, vy: Math.sin(a + i * 0.14) * 200, dmg: b.dmg * 0.5, r: 9, t: 0, life: 2.4, charm: true }; G.eprojs.push(pr); }
        } else if (G.enemies.length < 300) for (let i = 0; i < 4; i++) spawnEnemy('falselamb', b.x + G.rng() * 100 - 50, b.y + G.rng() * 100 - 50, false);
      }
    }
  },
  /* 原初圣母·黑昼 — final: veils, wings, black sun core */
  mother(b, p, dt) {
    seek(b, p, 14, dt, 340);
    if (b.phase === 1) {
      if (b.patT <= 0) {
        b.patT = 2.4;
        for (let i = 0; i < 4; i++) {
          const tx = p.x + G.rng() * 360 - 180, ty = p.y + G.rng() * 360 - 180;
          warnZone(tx, ty, 60, 26 * G.diff.atk, 1.1, 1.0, 'rgba(73,54,79,0.35)');
        }
      }
    } else if (b.phase === 2) {
      // rotating nerve beams (spokes)
      b.spokeA = (b.spokeA || 0) + dt * 0.7;
      b.spokeT = (b.spokeT || 0) - dt;
      if (b.spokeT <= 0) {
        b.spokeT = 0.5;
        for (let i = 0; i < 4; i++) {
          const a = b.spokeA + i / 4 * TAU;
          shoot(b, a, 240, b.dmg * 0.6, 9);
        }
      }
      if (b.patT <= 0) { b.patT = 3.5; const a = angleTo(b.x, b.y, p.x, p.y); for (let i = -3; i <= 3; i++) shoot(b, a + i * 0.1, 280, b.dmg * 0.8, 8); }
    } else {
      // black sun: spiral barrage + pull
      b.spiral = (b.spiral || 0) + dt * 4;
      b.spT = (b.spT || 0) - dt;
      if (b.spT <= 0) { b.spT = 0.16; shoot(b, b.spiral, 200, b.dmg * 0.55, 8, 4); shoot(b, b.spiral + Math.PI, 200, b.dmg * 0.55, 8, 4); }
      // gravity pull
      const d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
      p.x -= (p.x - b.x) / d * 34 * dt; p.y -= (p.y - b.y) / d * 34 * dt;
      if (b.patT <= 0) { b.patT = 5; warnZone(p.x, p.y, 120, 40 * G.diff.atk, 1.4, 0.8, 'rgba(11,10,12,0.5)'); num(b.x, b.y - 80, '黑日凝视', 'warn'); }
    }
  },
};

function seek(b, p, speed, dt, keep = 0) {
  const d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
  if (d > keep) { b.x += (p.x - b.x) / d * speed * dt; b.y += (p.y - b.y) / d * speed * dt; }
}

function killBoss(b) {
  b.dead = true;
  G.boss = null;
  G.bossKills++;
  META.bossKills[b.id] = (META.bossKills[b.id] || 0) + 1;
  // ranged kill stat for samuel unlock
  const p = G.player;
  if (Math.hypot(p.x - b.x, p.y - b.y) > 300) META.stats.bossRangeKill = (META.stats.bossRangeKill || 0) + 1;
  saveMeta();
  sfx.eliteKill(); addShake(10); addFlash('#D8C7A4', 0.5); hitStop(0.25);
  burst(b.x, b.y, 'rgba(216,199,164,0.9)', 24, 220, 0.8, 5);
  // release valley: hold spawns, vacuum every gem on the field
  G.spawnHoldT = 6;
  for (const k of G.pickups) if (k.type === 'gem') { k.pulled = true; k.pt = 0.6; }
  const meta = STORY.bosses[b.id];
  if (meta && meta.death.length) {
    // last words land one at a time — the hit-stop gives the first line its beat
    window.__BANNER && window.__BANNER('', meta.death[0]);
    if (meta.death.length > 1) after(1.6, () => window.__BANNER && window.__BANNER('', meta.death.slice(1).join('　')));
  }
  // drops
  G.pickups.push({ type: 'chest', boss: true, x: b.x, y: b.y, t: 0 });
  if (p.relics.includes('crosscoin')) {
    if (G.rng() < 0.25) G.pickups.push({ type: 'chest', boss: true, x: b.x + 40, y: b.y, t: 0 });
    else spawnEnemy('chestmimic', b.x + 40, b.y, false);
  }
  G.runResources.nail += 2;
  G.runResources.ash += 120 * (G.diff.reward || 1) * (1 + G.sinMarks * 0.2);
  // world cores from hell onward (forbidden weapon material)
  if (['margola', 'lambking', 'mother'].includes(b.id) || (G.mode === 'endless')) {
    G.worldCores++;
    const coreName = { margola: '地狱心脏', lambking: '七天使之舌', mother: '真天堂脐核' }[b.id] || '黑星火种';
    G.coreNames.push(coreName);
    num(b.x, b.y - 40, `获得世界核心「${coreName}」`, 'skill');
  }
  if (b.id === 'margola') G.runResources.bone += 4;
  if (b.id === 'lambking') G.runResources.pollen += 8;
  if (b.id === 'mother') G.runResources.eye += 3;
  import('./flow.js').then(m => m.onBossKilled(b.id));
}
