// Player creation, stat aggregation, movement, dodge, damage intake, sin skills.
import { G, num, burst } from './state.js';
import { BAL } from '../data/balance.js';
import { CHAR_BY_ID } from '../data/characters.js';
import { CATALYST_BY_ID, WEAPON_BY_ID } from '../data/weapons.js';
import { RELIC_BY_ID } from '../data/relics.js';
import { META, metaStats } from '../meta/save.js';
import { input, pollKeyboard } from '../input.js';
import { clamp } from '../core/util.js';
import { sfx } from '../audio.js';
import { addShake, addFlash, hitStop } from '../engine.js';
import { dealAreaDamage, healPlayer, applyStatus } from './combat.js';
import { castSin } from './sins.js';

export function createPlayer(charId) {
  const c = CHAR_BY_ID[charId];
  const p = {
    char: c, x: 0, y: 0, r: 12,
    hp: 1, shield: 0,
    level: 1, xp: 0, xpNeed: BAL.xpNeed(1),
    weapons: [], catalysts: [], relics: [], forbidden: [],
    dodgeT: 0, dodgeCharges: c.dodgeCharges || 1, dodgeMax: c.dodgeCharges || 1,
    dodging: 0, dodgeDirX: 1, dodgeDirY: 0,
    invT: 0, hurtInvT: 0,
    sin: { charge: 0, need: c.sin.need, active: 0, data: null },
    facing: 1, moving: false,
    lastWeaponFire: null,       // for mirror weapon
    coffinLayers: 0, coffinAt: [1, 2, 3], // adric: thresholds crossed
    ghosts: 0,                  // mina souls
    boosts: {},                 // in-run stat picks
    rerolls: 0, banishes: 0, banished: [],
    protect: 0,                 // 初醒保护 seconds remaining
    standT: 0,                  // 封口针 stillness timer
    tearlessT: 0,
    S: null,                    // computed stats
    kbx: 0, kby: 0,
    trailT: 0,
    wingEcho: 0,                // rahshiel char
    noinLevels: 0,
    reviveUsed: false, heavenReviveUsed: false,
  };
  p.weapons.push({ id: c.weapon, lv: 1, evolved: false, cd: 0, st: {} });
  recomputeStats(p);
  p.hp = p.S.maxHp;
  // meta: start weapon level
  const ms = metaStats();
  if (ms.startWeaponLv) p.weapons[0].lv += ms.startWeaponLv;
  p.rerolls = 0 + (ms.rerolls || 0);
  p.banishes = 0 + (ms.banishes || 0);
  // first run protection (初醒保护)
  if (META.runs === 0) p.protect = 90;
  return p;
}

export function recomputeStats(p) {
  const c = p.char;
  const ms = metaStats();
  const S = {
    maxHp: c.hp ?? 100, armor: c.armor ?? 0,
    moveSpeed: BAL.base.moveSpeed * (c.speed ?? 1),
    pickup: BAL.base.pickup * (c.pickup ?? 1),
    crit: BAL.base.crit + (c.crit ?? 0), critDmg: BAL.base.critDmg,
    damage: (c.damage ?? 1), area: (c.area ?? 1), cdr: (c.cdr ?? 0),
    projSpeed: (c.projSpeed ?? 1), amount: 0,
    xp: (c.xp ?? 1), luck: (c.luck ?? 0), curse: (c.curse ?? 0),
    healPower: (c.healPower ?? 1), dotMult: 1, sinRate: 1, sinMarkChance: 0,
    dodgeCd: BAL.base.dodgeCd, dodgeInv: BAL.base.dodgeInv, dodgeDist: BAL.base.dodgeDist,
    hurtInv: BAL.base.hurtInv, bossDmg: 1, regen10: 0,
  };
  // char flat-negative (noin)
  if (c.allStats) { S.damage *= (1 + c.allStats); S.maxHp *= (1 + c.allStats); S.moveSpeed *= (1 + c.allStats); }
  if (c.id === 'noin') { const g = 1 + p.noinLevels * 0.02; S.damage *= g; S.maxHp *= g; S.area *= g; }
  // meta tree stats
  const addPct = (k, v) => { S[k] = (S[k] || 0) + v; };
  for (const [k, v] of Object.entries(ms)) {
    switch (k) {
      case 'maxHpMult': S.maxHp *= (1 + v); break;
      case 'armor': S.armor += v; break;
      case 'moveSpeed': S.moveSpeed *= (1 + v); break;
      case 'dodgeCdMult': S.dodgeCd *= (1 + v); break;
      case 'hurtInv': S.hurtInv += v; break;
      case 'regen10': S.regen10 += v; break;
      case 'damage': S.damage *= (1 + v); break;
      case 'cdr': S.cdr += v; break;
      case 'area': S.area *= (1 + v); break;
      case 'projSpeed': S.projSpeed *= (1 + v); break;
      case 'xp': S.xp *= (1 + v); break;
      case 'pickup': S.pickup *= (1 + v); break;
      case 'luck': S.luck += v; break;
      default: break;
    }
  }
  // catalysts
  for (const cat of p.catalysts) {
    const def = CATALYST_BY_ID[cat.id];
    const mult = BAL.catalystLvMult[cat.lv - 1] || 1;
    const v = def.v * mult;
    if (def.flat) S[def.stat] = (S[def.stat] || 0) + v;
    else if (def.stat === 'maxHp') S.maxHp *= (1 + v);
    else if (['damage', 'area', 'xp', 'moveSpeed', 'projSpeed', 'healPower', 'dotMult'].includes(def.stat)) S[def.stat] *= (1 + v);
    else S[def.stat] = (S[def.stat] || 0) + v;
  }
  // relics
  for (const rid of p.relics) {
    const r = RELIC_BY_ID[rid];
    if (!r.mods) continue;
    for (const [k, v] of Object.entries(r.mods)) {
      if (k === 'maxHpMult') S.maxHp *= (1 + v);
      else if (k === 'dodgeCdMult') S.dodgeCd *= (1 + v);
      else if (['xp', 'pickup'].includes(k)) S[k] *= (1 + v);
      else if (k === 'bossDmg') S.bossDmg *= (1 + v);
      else S[k] = (S[k] || 0) + v;
    }
  }
  // in-run boost picks
  const b = p.boosts;
  if (b.hp) S.maxHp *= (1 + 0.10 * b.hp);
  if (b.dmg) S.damage *= (1 + 0.06 * b.dmg);
  if (b.area) S.area *= (1 + 0.05 * b.area);
  if (b.cdr) S.cdr += 0.04 * b.cdr;
  if (b.speed) S.moveSpeed *= (1 + 0.04 * b.speed);
  if (b.magnet) S.pickup *= (1 + 0.15 * b.magnet);
  if (b.crit) S.crit += 0.05 * b.crit;
  if (b.armor) S.armor += 3 * b.armor;
  // 棺中慈悲 mercy layers
  if (META.mercy > 0 && !META.mercyOff) S.damage *= (1 + 0.08 * META.mercy);
  // run guarantees for runs 2/3 (docs §11.4) — visible teaching blessings
  if (META.runs === 1) { S.maxHp += 15; S.pickup *= 1.2; }
  if (META.runs >= 2) { S.damage *= 1.12; S.xp *= 1.10; }
  // kill ledger
  if (G.killLedgerBonus) S.damage *= (1 + G.killLedgerBonus);
  // caps
  S.cdr = Math.min(S.cdr, BAL.caps.cdr);
  S.crit = Math.min(S.crit, BAL.caps.crit);
  S.moveSpeed = Math.min(S.moveSpeed, BAL.base.moveSpeed * (1 + BAL.caps.moveBonus));
  S.maxHp = Math.round(S.maxHp);
  p.S = S;
  if (p.hp > S.maxHp) p.hp = S.maxHp;
  return S;
}

/* ------------ frame update ------------ */
export function updatePlayer(p, dt) {
  const S = p.S;
  pollKeyboard();
  // movement (白香: controls reversed)
  const rev = G.reverseT > 0 ? -1 : 1;
  let vx = input.mx * rev, vy = input.my * rev;
  if (p.dodging > 0) {
    p.dodging -= dt;
    const sp = S.dodgeDist / 0.18;
    p.x += p.dodgeDirX * sp * dt; p.y += p.dodgeDirY * sp * dt;
  } else if (vx || vy) {
    p.x += vx * S.moveSpeed * dt; p.y += vy * S.moveSpeed * dt;
    if (vx) p.facing = vx > 0 ? 1 : -1;
    p.moving = true; p.standT = 0;
  } else { p.moving = false; p.standT += dt; }
  // knockback decay
  p.x += p.kbx * dt; p.y += p.kby * dt;
  p.kbx *= Math.pow(0.0001, dt); p.kby *= Math.pow(0.0001, dt);
  // obstacles collision (simple push-out)
  for (const o of G.obstacles) {
    if (o.dead) continue;
    const dx = p.x - o.x, dy = p.y - o.y, rr = o.r + p.r;
    const d2 = dx * dx + dy * dy;
    if (d2 < rr * rr && d2 > 0.01) {
      const d = Math.sqrt(d2);
      p.x = o.x + dx / d * rr; p.y = o.y + dy / d * rr;
    }
  }
  // timers
  if (p.invT > 0) p.invT -= dt;
  if (p.hurtInvT > 0) p.hurtInvT -= dt;
  if (p.tearlessT > 0) p.tearlessT -= dt;
  if (p.protect > 0 && p.level >= 3) p.protect = Math.max(0, p.protect - dt * 3);
  else if (p.protect > 0) p.protect -= dt;
  if (p.dodgeCharges < p.dodgeMax) {
    p.dodgeT += dt;
    if (p.dodgeT >= S.dodgeCd) { p.dodgeT = 0; p.dodgeCharges++; }
  }
  // regen
  if (S.regen10 > 0) { p.regenT = (p.regenT || 0) + dt; if (p.regenT >= 10) { p.regenT = 0; healPlayer(S.regen10); } }
  // wing echo decay handled in weapons
  // actions
  const acts = window.__ACTS || {};
  if (acts.dodge) tryDodge(p);
  if (acts.skill) castSin(p);
}

export function tryDodge(p) {
  if (p.dodgeCharges <= 0 || p.dodging > 0) return false;
  p.dodgeCharges--;
  if (p.dodgeCharges < p.dodgeMax && p.dodgeT === 0) p.dodgeT = 0.0001;
  p.dodging = 0.18;
  const n = Math.hypot(input.lastDir.x, input.lastDir.y) || 1;
  p.dodgeDirX = input.lastDir.x / n; p.dodgeDirY = input.lastDir.y / n;
  p.invT = Math.max(p.invT, p.S.dodgeInv);
  sfx.dodge();
  burst(p.x, p.y, 'rgba(216,199,164,0.5)', 5, 60, 0.3, 2);
  // rahshiel character: wing echo
  if (p.char.id === 'rahshiel') p.wingEcho = 1;
  return true;
}

// incoming damage
export function playerHurt(p, amount, opts = {}) {
  if (!opts.execution && G.phase !== 'play' && G.phase !== 'tribunal') return;
  if (!opts.execution) {
    if (p.invT > 0 || p.hurtInvT > 0 || p.dodging > 0) return;
    if (p.tearlessT > 0) return;
  }
  let dmg = amount;
  if (!opts.execution) {
    if (p.protect > 0) dmg *= 0.4;                          // 初醒保护
    if (META.mercy > 0 && !META.mercyOff) dmg *= (1 - 0.08 * META.mercy);
    const red = Math.min(BAL.caps.armorReduction, p.S.armor / (p.S.armor + 100));
    dmg *= (1 - red);
    // adric coffin layer
    if (p.coffinLayers > 0) { dmg *= 0.3; p.coffinLayers--; }
    // shield first
    if (p.shield > 0) {
      const use = Math.min(p.shield, dmg);
      p.shield -= use; dmg -= use;
    }
    dmg = Math.max(0, Math.round(dmg));
    if (dmg <= 0) { p.hurtInvT = 0.2; return; }
  }
  p.hp -= dmg;
  G.dmgTaken += dmg;
  if (!opts.execution) {
    p.hurtInvT = p.S.hurtInv;
    if (p.relics && p.relics.includes('tearless')) { p.tearlessT = 2; p.S.maxHp = Math.max(10, Math.round(p.S.maxHp * 0.99)); }
    sfx.hurt(); addShake(4); addFlash('#8E1F2F', 0.25);
    // adric: coffin armor thresholds
    if (p.char.id === 'adric') {
      const lost = 1 - p.hp / p.S.maxHp;
      const layers = Math.floor(lost / 0.25);
      if (layers > (p.coffinGained || 0)) { p.coffinLayers += layers - (p.coffinGained || 0); p.coffinGained = layers; }
    }
    // adric sin absorb
    if (p.sin.active > 0 && p.char.id === 'adric') p.sin.data.absorbed += dmg;
    // 铁花种子 relic
    if (p.relics.includes('ironseed')) {
      p.ironflowerAcc = (p.ironflowerAcc || 0) + dmg;
      if (p.ironflowerAcc >= p.S.maxHp * 0.2) {
        p.ironflowerAcc = 0;
        import('./weapons_impl.js').then(m => m.spawnIronFlower(p.x, p.y));
      }
    }
  }
  if (p.hp <= 0) {
    // mina: sacrifice a soul
    if (p.char.id === 'mina' && p.ghosts > 0 && !opts.execution) {
      p.ghosts--; p.hp = Math.round(p.S.maxHp * 0.3); p.invT = 1.5;
      num(p.x, p.y - 20, '妈妈挡住了它', 'text');
      return;
    }
    // relic revive
    if (!opts.execution && p.relics.includes('umbilical') && !p.reviveUsed) {
      p.reviveUsed = true; p.hp = Math.round(p.S.maxHp * 0.5); p.invT = 2;
      p.S.curse = (p.S.curse || 0) + 0.25;
      num(p.x, p.y - 20, '逆生', 'text');
      return;
    }
    // heaven revive (meta)
    if (!opts.execution && G.areaId === 'trueheaven' && metaStats().heavenRevive && !p.heavenReviveUsed) {
      p.heavenReviveUsed = true; p.hp = Math.round(p.S.maxHp * 0.5); p.invT = 2;
      num(p.x, p.y - 20, '保留的心跳', 'text');
      return;
    }
    p.hp = 0;
    import('./flow.js').then(m => m.onPlayerDeath(opts));
  }
}

export function addXp(p, v) {
  v = v * p.S.xp;
  G.xpGained += v;
  p.xp += v;
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed;
    p.level++;
    if (p.char.id === 'noin' && p.level % 5 === 0) { p.noinLevels++; recomputeStats(p); }
    p.xpNeed = BAL.xpNeed(p.level);
    G.levelupQueue++;
  }
}
