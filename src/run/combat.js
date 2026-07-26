// Damage pipeline, the five status effects + combos, kills & drops.
import { G, num, burst } from './state.js';
import { BAL } from '../data/balance.js';
import { META, saveMeta } from '../meta/save.js';
import { sfx } from '../audio.js';
import { hitStop, addShake } from '../engine.js';
import { addXp, recomputeStats, playerHurt } from './player.js';

const S = () => G.player.S;

/* =================== dealing damage to enemies =================== */
// opts: {src, tags:[], noCrit, forcedCrit, isDot, statusChance}
export function dealDamage(e, base, opts = {}) {
  if (!e || e.dead || e.spawning > 0) return 0;
  const p = G.player;
  let dmg = base * S().damage;
  if (G.duskBuff) dmg *= G.duskBuff;
  // 封口针
  if (p.relics.includes('sealneedle') && p.standT >= 2) dmg *= 1.4;
  // 空白圣经
  if (p.relics.includes('blankbible')) dmg *= (1 + 0.2 * (6 - p.weapons.length));
  // crit
  let crit = false;
  if (!opts.isDot && !opts.noCrit) {
    crit = opts.forcedCrit || G.rng() < S().crit;
    if (crit) dmg *= S().critDmg;
  }
  if (e.isBoss) dmg *= S().bossDmg;
  if (opts.isDot) {
    dmg *= S().dotMult;
    if (e.st.rot.t > 0) dmg *= 1.35;      // 腐烂: dots amplified
  }
  // enemy armor
  if (e.armor) dmg *= (1 - Math.min(0.6, e.armor / (e.armor + 100)));
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  G.dmgDealt += dmg;
  e.hitT = 0.08;
  if (!opts.isDot) {
    if (window.SETTINGS?.mergeNumbers) {
      e.numAcc = (e.numAcc || 0) + dmg; e.numT = 0.25;
    } else num(e.x, e.y - e.r, dmg, crit ? 'crit' : 'dmg');
  }
  // 罪印 chance from catalyst 罪人之舌
  if (S().sinMarkChance > 0 && !opts.isDot && G.rng() < S().sinMarkChance) applyStatus(e, 'sin');
  // 铁舌沃尔: overkill pierces behind
  if (e.hp < 0 && p.char.id === 'voll' && !opts.noPierceBehind) {
    const over = -e.hp;
    let best = null, bd = 1e9;
    for (const o of G.enemies) {
      if (o === e || o.dead) continue;
      const d2 = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
      if (d2 < 120 * 120 && d2 < bd) { bd = d2; best = o; }
    }
    if (best) dealDamage(best, over / S().damage, { ...opts, noPierceBehind: true, isDot: false });
  }
  if (e.hp <= 0) killEnemy(e, opts);
  else if (opts.knock && !e.isBoss) {
    const kmul = 1 + (e.st.fear.t > 0 ? 0.8 : 0);
    const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
    e.kbx += (e.x - p.x) / d * opts.knock * kmul;
    e.kby += (e.y - p.y) / d * opts.knock * kmul;
  }
  return dmg;
}

export function dealAreaDamage(x, y, r, base, opts = {}) {
  const rr = r * (opts.noArea ? 1 : S().area);
  G.hash.query(x, y, rr + 30, (e) => {
    if (e.dead) return;
    const er = e.r + rr;
    if ((e.x - x) ** 2 + (e.y - y) ** 2 <= er * er) dealDamage(e, base, opts);
  });
  if (opts.fx !== false) burst(x, y, opts.color || 'rgba(212,71,79,0.7)', Math.min(14, 4 + r / 20), r * 1.5, 0.4, 3);
}

/* =================== statuses =================== */
export function freshStatus() {
  return { bleed: { s: 0, t: 0 }, burn: { t: 0, dps: 0 }, rot: { t: 0 }, sin: { s: 0 }, fear: { t: 0 } };
}
export function applyStatus(e, type, power = 1) {
  if (!e || e.dead) return;
  const st = e.st;
  switch (type) {
    case 'bleed':
      st.bleed.s = Math.min(10, st.bleed.s + 1);
      st.bleed.t = 4;
      // 沸血: bleed + burn
      if (st.burn.t > 0) triggerBoilingBlood(e);
      break;
    case 'burn':
      st.burn.t = 3; st.burn.dps = Math.max(st.burn.dps, 6 * power);
      if (st.bleed.s > 0) triggerBoilingBlood(e);
      break;
    case 'rot':
      st.rot.t = 5;
      e.armor = Math.min(e.armor || 0, 0); // armor shred
      if (st.sin.s >= 5) triggerBlasphemyBloom(e);
      break;
    case 'sin':
      st.sin.s++;
      if (st.sin.s >= 5) {
        st.sin.s = 0;
        // 审判 AoE
        dealAreaDamage(e.x, e.y, 70, 30, { isDot: false, noCrit: true, color: 'rgba(181,141,59,0.8)', src: 'sinmark' });
        if (st.rot.t > 0) triggerBlasphemyBloom(e);
      }
      break;
    case 'fear':
      st.fear.t = Math.max(st.fear.t, 2.5);
      break;
  }
}
function triggerBoilingBlood(e) {
  if (e.boilT > 0) return;
  e.boilT = 1.2;
  const dmg = 18 + e.st.bleed.s * 6;
  dealAreaDamage(e.x, e.y, 60, dmg, { color: 'rgba(212,71,79,0.9)', src: 'boil' });
  num(e.x, e.y - e.r - 8, '沸血', 'combo');
}
function triggerBlasphemyBloom(e) {
  if (e.bloomT > 0) return;
  e.bloomT = 1.5;
  num(e.x, e.y - e.r - 8, '亵渎绽放', 'combo');
  // radial corrupt spikes = 6 projectiles
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    G.projs.push({ type: 'spike', x: e.x, y: e.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, dmg: 22, t: 0, life: 0.7, r: 8, pierce: 3, tags: ['bloom'] });
  }
}

export function tickEnemyStatus(e, dt) {
  const st = e.st;
  if (e.boilT > 0) e.boilT -= dt;
  if (e.bloomT > 0) e.bloomT -= dt;
  if (st.bleed.s > 0) {
    st.bleed.t -= dt;
    e.dotAcc = (e.dotAcc || 0) + st.bleed.s * 3 * dt;
    if (st.bleed.t <= 0) st.bleed.s = 0;
  }
  if (st.burn.t > 0) {
    st.burn.t -= dt;
    e.burnTick = (e.burnTick || 0) + dt;
    if (e.burnTick >= 0.5) { e.burnTick = 0; dealDamage(e, st.burn.dps * 0.5, { isDot: true, src: 'burn' }); }
  }
  if (st.rot.t > 0) {
    st.rot.t -= dt;
    e.dotAcc = (e.dotAcc || 0) + 4 * dt;
  }
  if (st.fear.t > 0) st.fear.t -= dt;
  if (e.dotAcc >= 3) { const v = e.dotAcc; e.dotAcc = 0; dealDamage(e, v, { isDot: true, src: 'dot' }); }
  // merged damage numbers
  if (e.numT > 0) { e.numT -= dt; if (e.numT <= 0 && e.numAcc) { num(e.x, e.y - e.r, e.numAcc, 'dmg'); e.numAcc = 0; } }
}

/* =================== kills & drops =================== */
export function killEnemy(e, opts = {}) {
  if (e.dead) return;
  e.dead = true;
  const p = G.player;
  G.kills++;
  // 迟来的死亡 affix
  if (G.affixes.includes('latedeath') && !e.lateDone) {
    e.dead = false; e.lateDone = true; e.dying = 2; e.hp = 1;
    return;
  }
  sfx.kill();
  burst(e.x, e.y, e.isElite ? 'rgba(212,71,79,0.8)' : 'rgba(216,199,164,0.55)', e.isElite ? 12 : 5, 80, 0.4, e.isElite ? 4 : 3);
  // ledger relic
  if (p.relics.includes('sinledger')) {
    G.ledgerKills = (G.ledgerKills || 0) + 1;
    if (G.ledgerKills % 1000 === 0 && G.killLedgerBonus < 0.15) { G.killLedgerBonus += 0.01; recomputeStats(p); }
  }
  // black salt
  if (p.relics.includes('blacksalt') && G.rng() < 0.15) dealAreaDamage(e.x, e.y, 55, 20, { color: 'rgba(30,30,30,0.8)' });
  // furnace walker explodes
  if (e.def.deathBoom) {
    G.eprojs.push({ type: 'boom', x: e.x, y: e.y, t: 0, life: 0.5, r: 60, dmg: e.dmg * 1.2, warned: true });
  }
  // char: hemer plague crow
  if (p.char.id === 'hemer' && e.st.rot.t > 0) {
    META.stats.rotKills++;
    if (G.rng() < 0.25) spawnPlagueCrow(e.x, e.y);
  } else if (e.st.rot.t > 0) META.stats.rotKills++;
  // soul weapons killing bleeding target → blood soul heal
  if (e.st.bleed.s > 0 && opts.tags && (opts.tags.includes('soul'))) {
    G.pickups.push({ type: 'soulheart', x: e.x, y: e.y, v: Math.round(p.S.maxHp * 0.03) + 3, t: 0 });
  }
  // obedience drops in fake heaven
  if (G.areaId === 'fakeheaven' && e.def.disguised) {
    G.obedience = Math.max(0, G.obedience - 2.5);
  }
  // 双生罪 affix
  if (G.affixes.includes('twinsin') && e.isElite && !e.twinned) {
    const spawner = window.__SPAWN;
    if (spawner) { const t = spawner(e.typeId, e.x + 30, e.y, false); if (t) { t.hp *= 0.4; t.twinned = true; } }
  }
  // drops
  dropLoot(e);
  if (e.isElite) {
    G.eliteKills++;
    sfx.eliteKill();
    hitStop(0.12); addShake(3);
    if (p.sinExecute && e.executedBySin) META.stats.eliteExec++;
    if (p.relics.includes('widowring')) healPlayer(p.S.maxHp * 0.2);
    // elite chest chance
    if (G.rng() < 0.22 + S().luck * 0.3) G.pickups.push({ type: 'chest', x: e.x, y: e.y, t: 0 });
    // vielna sin counts
  }
  if (e.isBoss) { /* handled by bosses.js */ }
  // sin charge
  const gain = (e.isElite ? 6 : 1) * S().sinRate;
  if (p.sin.charge < p.sin.need) {
    p.sin.charge = Math.min(p.sin.need, p.sin.charge + gain);
    if (p.sin.charge >= p.sin.need) sfx.sinReady();
  }
  // run resources trickle (罪印 grants +20% reward per mark)
  G.runResources.ash += (e.isElite ? 6 : 1) * (G.diff.reward || 1) * (1 + G.sinMarks * 0.2);
}

function dropLoot(e) {
  const p = G.player;
  let v = e.xp || (e.isElite ? 25 : 2 + Math.floor(G.time / 240));
  if (G.affixes.includes('moonless')) v *= 2;
  // merge gems when too many
  if (G.pickups.length > 130) {
    // find nearest gem and add
    let g = null;
    for (let i = G.pickups.length - 1; i >= 0; i--) if (G.pickups[i].type === 'gem') { g = G.pickups[i]; break; }
    if (g) { g.v += v; g.tier = g.v > 40 ? 3 : g.v > 12 ? 2 : 1; return; }
  }
  G.pickups.push({ type: 'gem', x: e.x + G.rng() * 10 - 5, y: e.y + G.rng() * 10 - 5, v, tier: v > 40 ? 3 : v > 12 ? 2 : 1, t: 0 });
  if (G.rng() < 0.012) G.pickups.push({ type: 'heart', x: e.x, y: e.y, v: 12, t: 0 });
  if (G.areaId === 'hell' && G.rng() < 0.02) G.pickups.push({ type: 'fruit', x: e.x, y: e.y, t: 0 });
}

export function spawnPlagueCrow(x, y) {
  G.projs.push({ type: 'crowpet', x, y, t: 0, life: 6, dmg: 10, r: 9, cd: 0 });
}

export function healPlayer(v, opts = {}) {
  const p = G.player;
  v = v * p.S.healPower;
  if (G.phase === 'tribunal') v *= 0.5;      // 审判中治疗效率减半 (docs §12.5)
  if (v <= 0) return;
  // 禁止治疗 affix
  if (G.affixes.includes('noheal')) { G.tempAtkT = 6; return; }
  // 倒悬圣像: heal → double shield
  if (p.relics.includes('healToShield')) opts.toShield = true;
  if (p.relics.includes('invertedicon')) {
    p.shield = Math.min(p.S.maxHp * 0.5, p.shield + v * 2);
    return;
  }
  // lifesteal cap
  if (opts.lifesteal) {
    G.lsAcc = (G.lsAcc || 0);
    const cap = p.S.maxHp * BAL.caps.lifestealPerSec;
    if (G.lsWindow === undefined) G.lsWindow = 0;
    if (G.lsAcc >= cap) return;
    v = Math.min(v, cap - G.lsAcc);
    G.lsAcc += v;
  }
  const before = p.hp;
  p.hp = Math.min(p.S.maxHp, p.hp + v);
  const overflow = v - (p.hp - before);
  // evlann: overheal → blood shield
  if (overflow > 0 && p.char.id === 'evlann') {
    p.shield = Math.min(p.S.maxHp * 0.3, p.shield + overflow);
  }
  // fake heaven: healing raises obedience & heals the heaven
  if (G.areaId === 'fakeheaven') G.obedience += 1.2;
  if (G.areaId === 'trueheaven' && G.boss && !G.boss.dead) {
    G.boss.hp = Math.min(G.boss.maxHp, G.boss.hp + v * 2);
  }
}

// touch damage from enemy to player (called by spawner update)
export function touchPlayer(e, dt) {
  const p = G.player;
  playerHurt(p, e.dmg);
}
export { playerHurt };
