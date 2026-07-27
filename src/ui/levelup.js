// Level-up cards, chests, artifact fusion & forbidden-weapon ceremonies.
import { G, num, burst } from '../run/state.js';
import { WEAPONS, WEAPON_BY_ID, CATALYSTS, CATALYST_BY_ID, FORBIDDEN, ARTIFACT_BY_ID } from '../data/weapons.js';
import { RELICS, RELIC_BY_ID } from '../data/relics.js';
import { BAL } from '../data/balance.js';
import { META, saveMeta } from '../meta/save.js';
import { icon, iconEvolved, iconForbidden } from '../art/icons.js';
import { recomputeStats } from '../run/player.js';
import { healPlayer } from '../run/combat.js';
import { sfx } from '../audio.js';
import { addFlash, hitStop } from '../engine.js';

const ui = () => document.getElementById('ui-root');
// locked card set lives on G so resetG clears it between runs
const getLocked = () => G.lockedCards || null;
const setLocked = (v) => { G.lockedCards = v; };

/* =================== pool building =================== */
function candidates() {
  const p = G.player;
  const out = [];
  const luck = 1 + p.S.luck;
  const firstnail = p.relics.includes('firstnail') ? 0.9 : 1;
  // weapon upgrades
  for (const w of p.weapons) {
    if (w.evolved || w.lv >= 8) continue;
    out.push({ kind: 'weapon', id: w.id, up: true, w: 30 });
  }
  // new weapons
  if (p.weapons.length < 6) {
    for (const def of WEAPONS) {
      if (p.weapons.some(w => w.id === def.id)) continue;
      if (p.banished.includes('w:' + def.id)) continue;
      out.push({ kind: 'weapon', id: def.id, up: false, w: 10 * firstnail });
    }
  }
  // catalyst upgrades
  for (const c of p.catalysts) {
    if (c.lv >= 5) continue;
    out.push({ kind: 'catalyst', id: c.id, up: true, w: 22 });
  }
  // new catalysts
  if (p.catalysts.length < 6) {
    for (const def of CATALYSTS) {
      if (p.catalysts.some(c => c.id === def.id)) continue;
      if (p.banished.includes('c:' + def.id)) continue;
      // slot pressure: weapon slots full, or 4+ catalyst slots used → fusable only (docs §6.3)
      const wobj = p.weapons.find(w => w.id === def.forW);
      if ((p.weapons.length >= 6 || p.catalysts.length >= 4) && !wobj) continue;
      // matched pairs ramp with the paired weapon's level (fusion demand);
      // mismatches are cheap fillers with no luck scaling
      out.push({ kind: 'catalyst', id: def.id, up: false, w: wobj ? (35 + (wobj.lv >= 6 ? 45 : wobj.lv * 5)) * luck : (p.weapons.length >= 3 ? 8 : 3) });
    }
  }
  // generic boosts (always some filler) — with stack count on the card;
  // stats already at their hard cap get depreciated so fewer dead cards show up
  const capped = {
    crit: p.S.crit >= BAL.caps.crit, cdr: p.S.cdr >= BAL.caps.cdr,
    speed: p.S.moveSpeed >= BAL.base.moveSpeed * (1 + BAL.caps.moveBonus),
  };
  const boosts = [
    ['hp', '肉身还愿', '最大生命+10%'], ['dmg', '磨刃', '全伤害+6%'], ['area', '教区扩张', '范围+5%'],
    ['cdr', '快钟摆', '冷却缩减+4%'], ['speed', '疾行', '移动速度+4%'], ['magnet', '引魂', '拾取范围+15%'],
    ['crit', '狠辣', '暴击率+5%'], ['armor', '铁片', '护甲+3'],
  ];
  for (const [id, nm, ds] of boosts) {
    const st = p.boosts[id] || 0;
    out.push({ kind: 'boost', id, nm, ds: ds + (st ? `（已持 ${st} 层）` : ''), w: capped[id] ? 0.5 : 4 });
  }
  // endgame: all weapons evolved or maxed → promotion cards keep levels meaningful
  const endgame = p.weapons.length > 0 && p.weapons.every(w => w.evolved || w.lv >= 8);
  // the rare exciting one: +1 projectile — weight ramps with level & luck (cap 2, 3 in endgame)
  if ((p.boosts.amount || 0) < (endgame ? 3 : 2)) out.push({ kind: 'boost', id: 'amount', nm: '增殖圣痕', ds: '所有武器投射物数量 +1（稀有）', w: (1.2 + Math.min(6, p.level * 0.3)) * (1 + p.S.luck * 2), rare: true });
  if (endgame) {
    if (p.weapons.some(w => w.evolved)) {
      const n = p.boosts.artifactDmg || 0;
      out.push({ kind: 'boost', id: 'artifactDmg', icon: 'dmg', nm: '圣化之刃', ds: '已进化武器伤害 ×1.10（可叠加）' + (n ? `（已持 ${n} 层）` : ''), w: 8, rare: true });
    }
    const dn = p.boosts.dr || 0;
    if (dn < 10) out.push({ kind: 'boost', id: 'dr', icon: 'armor', nm: '铁壁', ds: '受到的伤害 -3%（上限30%）' + (dn ? `（已持 ${dn} 层）` : ''), w: 8, rare: true });
  }
  // pool exhausted: only boosts left → overload versions (double stacks) + a heal
  if (out.length && out.every(c => c.kind === 'boost')) {
    for (const c of out) {
      if (!c.rare && !c.n) { c.n = 2; c.nm = '超载·' + c.nm; c.ds = c.ds.replace(/(\d+)/, m => m * 2) + '（双倍）'; }
    }
    out.push({ kind: 'heal', id: 'heal', icon: 'hp', nm: '血肉修补', ds: '立即恢复30%生命', w: 6 });
  }
  return out;
}

// 距神器一步: lv7+ weapon upgrade with its catalyst in hand, or a new catalyst
// whose paired weapon is already lv6+ — the last mile to a fusion
function isSprintCard(c) {
  const p = G.player;
  if (c.kind === 'weapon' && c.up) {
    const w = p.weapons.find(x => x.id === c.id);
    return !!(w && !w.evolved && w.lv >= 7 && p.catalysts.some(x => x.id === WEAPON_BY_ID[c.id].catalyst));
  }
  if (c.kind === 'catalyst' && !c.up) {
    const w = p.weapons.find(x => x.id === CATALYST_BY_ID[c.id].forW);
    return !!(w && !w.evolved && w.lv >= 6);
  }
  return false;
}

function rollCards(n) {
  const p = G.player;
  const pool = candidates();
  const picks = [];
  // protection 1: first 8 levels — or 2 dry sets in a row — at least one existing
  // weapon upgrade (docs §6.3 + pity)
  if (p.level <= 8 || G.pityWup >= 2) {
    const wUp = pool.filter(c => c.kind === 'weapon' && c.up);
    if (wUp.length) picks.push(wUp[(G.rng() * wUp.length) | 0]);
  }
  // protection 2: a fusion-sprint card is guaranteed a slot whenever one exists
  if (!picks.some(isSprintCard)) {
    const sp = pool.filter(c => isSprintCard(c) && !picks.some(x => x.kind === c.kind && x.id === c.id));
    if (sp.length) picks.push(sp[(G.rng() * sp.length) | 0]);
  }
  let guard = 60;
  while (picks.length < n && guard-- > 0) {
    let total = 0;
    for (const c of pool) total += c.w;
    if (total <= 0) break;
    let r = G.rng() * total, chosen = null;
    for (const c of pool) { r -= c.w; if (r <= 0) { chosen = c; break; } }
    if (!chosen) break;
    if (picks.some(x => x.kind === chosen.kind && x.id === chosen.id)) { chosen.w = 0; continue; }
    picks.push(chosen);
  }
  // 增殖圣痕 soft pity: by Lv12 every build has seen the card at least once
  if (p.level >= 12 && !p.boosts.amount && !G.amountOffered) {
    const amt = pool.find(c => c.kind === 'boost' && c.id === 'amount');
    if (amt && !picks.includes(amt)) {
      G.amountOffered = true;
      const ri = picks.findIndex(c => c.kind === 'boost' || (c.kind === 'catalyst' && !isSprintCard(c)));
      if (ri >= 0) picks[ri] = amt; else picks.push(amt);
    } else if (amt) G.amountOffered = true;
  }
  // pity bookkeeping — weapon upgrades
  if (picks.some(c => c.kind === 'weapon' && c.up)) G.pityWup = 0;
  else if (p.weapons.some(w => !w.evolved && w.lv < 8)) G.pityWup++;
  // pity bookkeeping — a lv7+ weapon starving for its catalyst (hard backstop)
  const starve = p.weapons.find(w => !w.evolved && w.lv >= 7 && !p.catalysts.some(c => c.id === WEAPON_BY_ID[w.id].catalyst));
  if (starve && p.catalysts.length < 6 && !p.banished.includes('c:' + WEAPON_BY_ID[starve.id].catalyst)) {
    const cid = WEAPON_BY_ID[starve.id].catalyst;
    if (picks.some(c => c.kind === 'catalyst' && c.id === cid)) G.pityCat = 0;
    else if (++G.pityCat >= 3) { picks[Math.min(2, picks.length - 1)] = { kind: 'catalyst', id: cid, up: false, w: 1 }; G.pityCat = 0; }
  } else G.pityCat = 0;
  // shuffle so guaranteed cards don't always sit in slot 1
  for (let i = picks.length - 1; i > 0; i--) {
    const j = (G.rng() * (i + 1)) | 0;
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  // 七罪骰子: 4th option is cursed relic (stays last by design)
  if (p.relics.includes('sindice')) {
    const cursed = RELICS.filter(r => r.cursed && !p.relics.includes(r.id));
    if (cursed.length && p.relics.length < maxRelics(p)) picks.push({ kind: 'relic', id: cursed[(G.rng() * cursed.length) | 0].id, w: 1, cursed: true });
  }
  return picks;
}
function maxRelics(p) { return 3 + (p.relics.includes('sindice') ? 1 : 0); }

/* =================== level up screen =================== */
export function openLevelUp(reopen = false) {
  if (G.phase !== 'play' && !(reopen && G.phase === 'levelup')) return;
  if (document.getElementById('levelup-ui')) return;
  G.phase = 'levelup';
  sfx.levelup();
  const p = G.player;
  // locked cards must still be valid for this run/character
  let locked = getLocked();
  if (locked && locked.some(c => (c.kind === 'weapon' && c.up && !p.weapons.some(w => w.id === c.id)) || (c.kind === 'catalyst' && c.up && !p.catalysts.some(x => x.id === c.id)))) locked = null;
  const cards = locked || rollCards(3);
  setLocked(null);
  // onboarding: explain the four fusion terms during the first runs / first sets
  let hint = null;
  if (META.runs < 2 || (META.hints.fuseHintN || 0) < 3) {
    hint = '催化物＝被动加成；武器满级＋对应催化物＝融合为神器';
    META.hints.fuseHintN = (META.hints.fuseHintN || 0) + 1;
    saveMeta();
  }
  const title = '圣痕苏醒 — 抉择' + (G.levelupQueue > 0 ? `（还有${G.levelupQueue}次）` : '');
  renderCards(title, cards, {
    showSkip: true, showReroll: p.rerolls > 0, showBanish: p.banishes > 0, showLock: !p.lockUsed,
    hint,
    onPick: (c) => { applyCard(c); pickFeedback(c); closeCards(); },
    onSkip: () => {
      // skip → heal 15%, to shield when full (docs §6.3) — always with visible feedback
      const v = p.S.maxHp * 0.15;
      if (p.hp >= p.S.maxHp) {
        p.shield = Math.min(p.S.maxHp * 0.5, p.shield + v);
        p.shieldHitT = 0.4;
        num(p.x, p.y - 24, '护盾 +' + Math.round(v), 'heal');
      } else {
        const got = healPlayer(v);
        num(p.x, p.y - 24, '+' + Math.round(got || v), 'heal');
      }
      sfx.pickup();
      closeCards();
    },
    onReroll: () => { p.rerolls--; closeCards(false); openLevelUp(true); },
    onBanish: (c) => {
      p.banishes--;
      p.banished.push((c.kind === 'weapon' ? 'w:' : 'c:') + c.id);
      closeCards(false); openLevelUp(true);
    },
    onLock: (cs) => {
      p.lockUsed = true; setLocked(cs); closeCards();
      toastCeremony('锁定', '本组已封存——下次圣痕苏醒原样重现');
    },
    // 3+ queued level-ups: fold the backlog into random boost stacks in one tap
    onClaimAll: G.levelupQueue >= 3 ? () => {
      const ids = ['hp', 'dmg', 'area', 'cdr', 'speed', 'magnet', 'crit', 'armor'];
      let left = G.levelupQueue;
      G.levelupQueue = 0;
      while (left-- > 0) { const id = ids[(G.rng() * ids.length) | 0]; p.boosts[id] = (p.boosts[id] || 0) + 1; }
      recomputeStats(p);
      num(p.x, p.y - 30, '既往圣痕已折算为随机强化', 'skill');
    } : null,
  });
}

// picking a card must be felt instantly: gold burst + cumulative float + the
// upgraded weapon fires the moment combat resumes (cd=0)
function pickFeedback(c) {
  const p = G.player;
  burst(p.x, p.y, 'rgba(181,141,59,0.85)', 12, 130, 0.5, 3);
  if (c.kind === 'weapon') {
    const w = p.weapons.find(w => w.id === c.id);
    if (w) w.cd = 0;
    num(p.x, p.y - 30, WEAPON_BY_ID[c.id].name + '↑', 'skill');
  } else if (c.kind === 'boost') {
    const n = p.boosts[c.id] || 0;
    const label = c.nm.replace(/^超载·/, '');
    const MUL = { hp: 1.10, dmg: 1.06, area: 1.05, speed: 1.04, magnet: 1.15 };
    const ADD = { cdr: 4, crit: 5 };
    if (MUL[c.id]) num(p.x, p.y - 30, `${label}×${n}：+${Math.round((Math.pow(MUL[c.id], n) - 1) * 100)}%`, 'skill');
    else if (ADD[c.id]) num(p.x, p.y - 30, `${label}×${n}：+${ADD[c.id] * n}%`, 'skill');
    else if (c.id === 'armor') num(p.x, p.y - 30, `${label}×${n}：护甲+${3 * n}`, 'skill');
    else num(p.x, p.y - 30, label + (n > 1 ? `×${n}` : ''), 'skill');
  } else if (c.kind === 'catalyst') {
    num(p.x, p.y - 30, CATALYST_BY_ID[c.id].name + '↑', 'skill');
  } else if (c.kind === 'heal') {
    num(p.x, p.y - 30, '血肉修补', 'heal');
  } else if (c.kind === 'relic') {
    num(p.x, p.y - 30, RELIC_BY_ID[c.id].name, 'skill');
  }
}

function applyCard(c) {
  const p = G.player;
  const old = p.S;
  if (c.kind === 'weapon') {
    const w = p.weapons.find(w => w.id === c.id);
    if (w) w.lv = Math.min(8, w.lv + 1);
    else {
      p.weapons.push({ id: c.id, lv: weaponEnterLv(), evolved: false, cd: 0, st: {} });
      if (!META.seenWeapons.includes(c.id)) { META.seenWeapons.push(c.id); saveMeta(); }
      if (p.weapons.length === 6) toastCeremony('武器栏已满', '六具凶器已齐——此后只出现催化物与强化', icon(WEAPON_BY_ID[c.id].icon));
    }
  } else if (c.kind === 'catalyst') {
    const cat = p.catalysts.find(x => x.id === c.id);
    if (cat) cat.lv = Math.min(5, cat.lv + 1);
    else p.catalysts.push({ id: c.id, lv: 1 });
  } else if (c.kind === 'boost') {
    p.boosts[c.id] = (p.boosts[c.id] || 0) + (c.n || 1);
  } else if (c.kind === 'heal') {
    healPlayer(p.S.maxHp * 0.3);
  } else if (c.kind === 'relic') {
    if (!p.relics.includes(c.id)) {
      p.relics.push(c.id);
      const def = RELIC_BY_ID[c.id];
      if (def.cursed) G.rareTaken = (G.rareTaken || 0) + 1;
      if (c.id === 'hourglass') G.timeScale = Math.max(G.timeScale, 1.08);
    }
  }
  recomputeStats(p);
  // milestone / cap callouts for boost picks
  if (c.kind === 'boost' && old) {
    const S = p.S;
    if (old.crit < 0.25 && S.crit >= 0.25) toastCeremony('狠辣已成', '暴击率突破 25%', icon('crit'));
    else if (old.crit < 0.5 && S.crit >= 0.5) toastCeremony('狠辣已臻化境', '暴击率突破 50%', icon('crit'));
    if (old.cdr < 0.3 && S.cdr >= 0.3) toastCeremony('钟摆如飞', '冷却缩减突破 30%', icon('cdr'));
    const capKey = c.id === 'speed' ? 'moveSpeed' : c.id;
    const atCap = (c.id === 'crit' && S.crit >= BAL.caps.crit) || (c.id === 'cdr' && S.cdr >= BAL.caps.cdr)
      || (c.id === 'speed' && S.moveSpeed >= BAL.base.moveSpeed * (1 + BAL.caps.moveBonus));
    if (atCap && old[capKey] === S[capKey]) toastCeremony('已达上限', `${c.nm.replace(/^超载·/, '')} 已触顶——此类卡不再生效`, icon(c.icon || c.id));
  }
  // 神器就绪: first weapon this run to hit lv8 with its catalyst in hand → tell
  // the player the next step is a boss/elite chest
  if (!G.fusionHintShown) {
    const rw = p.weapons.find(w => !w.evolved && w.lv >= 8 && p.catalysts.some(x => x.id === WEAPON_BY_ID[w.id].catalyst));
    if (rw) {
      G.fusionHintShown = true;
      const d = WEAPON_BY_ID[rw.id];
      toastCeremony('神器就绪', `${d.name} 可融合为 ${d.artifact.name}——击败精英夺取宝箱`, iconEvolved(d.icon), 'q-art');
    }
  }
}
function metaStartLv() {
  const p = G.player;
  return p.relics.includes('firstnail') ? 1 : 0;
}
// late-run new weapons enter at higher level so they stay competitive
function weaponEnterLv() {
  const p = G.player;
  return 1 + metaStartLv() + Math.min(2, ((p.level - 1) / 8) | 0);
}

/* =================== chest opening =================== */
export function openChest() {
  const p = G.player;
  sfx.chest();
  // priority 1: forbidden weapon (2 artifacts of a pair + world core, hell+, max 2)
  if (p.forbidden.length < 2 && G.worldCores > 0 && ['hell', 'fakeheaven', 'trueheaven', 'corpsesea', 'tribunal'].includes(G.areaId)) {
    for (const f of FORBIDDEN) {
      if (p.forbidden.includes(f.id)) continue;
      const owned = f.needs.every(aid => p.weapons.some(w => w.evolved && WEAPON_BY_ID[w.id].artifact.id === aid));
      if (owned) { formForbidden(f); return; }
    }
  }
  // priority 2: artifact evolution (weapon lv8 + catalyst owned)
  const eligible = p.weapons.filter(w => !w.evolved && w.lv >= 8 && p.catalysts.some(c => c.id === WEAPON_BY_ID[w.id].catalyst));
  if (eligible.length) { evolveWeapon(eligible[0]); G.chestPity = 0; return; }
  G.chestPity++;
  // 神器保底 (docs §6.3): consecutive artifact-less boss chests always push the
  // build toward its next fusion (w_fusehint node fires one chest earlier).
  // The counter only clears when something was actually handed out.
  if (G.chestPity >= (META.nodes['w_fusehint'] ? 2 : 3)) {
    // best = unfused weapon, catalyst-holders first, then highest level
    const best = [...p.weapons].filter(w => !w.evolved).sort((a, b) => {
      const ac = p.catalysts.some(c => c.id === WEAPON_BY_ID[a.id].catalyst) ? 1 : 0;
      const bc = p.catalysts.some(c => c.id === WEAPON_BY_ID[b.id].catalyst) ? 1 : 0;
      return (bc - ac) || (b.lv - a.lv);
    })[0];
    if (best) {
      const catId = WEAPON_BY_ID[best.id].catalyst;
      if (p.catalysts.some(c => c.id === catId)) {
        // catalyst already held → the weapon itself leaps +2 toward lv8
        best.lv = Math.min(8, best.lv + 2);
        G.chestPity = 0;
        recomputeStats(p);
        toastCeremony('神器保底', `铁钉神父的馈赠：${WEAPON_BY_ID[best.id].name} 等级提升`, icon(WEAPON_BY_ID[best.id].icon), 'q-rare');
        return;
      }
      if (p.catalysts.length < 6) {
        const catDef = CATALYST_BY_ID[catId];
        p.catalysts.push({ id: catDef.id, lv: 1 });
        G.chestPity = 0;
        recomputeStats(p);
        toastCeremony('神器保底', `铁钉神父的馈赠：${catDef.name}（${WEAPON_BY_ID[best.id].name} 的催化物）`, icon(catDef.icon), 'q-rare');
        return;
      }
      // catalyst slots full → offer to swap out an existing catalyst
      const catDef = CATALYST_BY_ID[catId];
      const swaps = [...p.catalysts].sort((a, b) => {
        const am = p.weapons.some(w => w.id === CATALYST_BY_ID[a.id].forW) ? 1 : 0;
        const bm = p.weapons.some(w => w.id === CATALYST_BY_ID[b.id].forW) ? 1 : 0;
        return (am - bm) || (a.lv - b.lv);
      }).slice(0, 3).map(x => ({ kind: 'swap', outId: x.id, inId: catId }));
      if (swaps.length) {
        G.phase = 'levelup';
        renderCards('神器保底 — 催化物替换', swaps, {
          showSkip: false,
          onPick: (sw) => {
            const i = p.catalysts.findIndex(x => x.id === sw.outId);
            if (i >= 0) p.catalysts.splice(i, 1);
            p.catalysts.push({ id: sw.inId, lv: 1 });
            G.chestPity = 0;
            recomputeStats(p);
            toastCeremony('神器保底', `${CATALYST_BY_ID[sw.outId].name} 化为灰烬，${catDef.name} 入手`, icon(catDef.icon), 'q-rare');
            closeCards();
          },
        });
        return;
      }
    }
  }
  // priority 3: 地狱免费神器升级 or relic / upgrades
  if (G.freeArtifactUpgrade > 0) {
    const w = p.weapons.filter(w => w.lv < 8).sort((a, b) => b.lv - a.lv)[0];
    if (w) { G.freeArtifactUpgrade--; w.lv = Math.min(8, w.lv + 2); toastCeremony('铁花的贿赂', `${WEAPON_BY_ID[w.id].name} 等级提升`, icon(WEAPON_BY_ID[w.id].icon)); recomputeStats(p); return; }
  }
  const better = p.relics.includes('invitation');
  if (p.relics.length < maxRelics(p) && (better || G.rng() < 0.6 + p.S.luck * 0.3)) {
    // relics are a CHOICE now: two plain offerings and one cursed bargain
    const plain = RELICS.filter(r => !p.relics.includes(r.id) && !r.cursed);
    const cursed = RELICS.filter(r => !p.relics.includes(r.id) && r.cursed);
    const picks = [];
    while (picks.length < 2 && plain.length) picks.push(plain.splice((G.rng() * plain.length) | 0, 1)[0]);
    if (cursed.length) picks.push(cursed[(G.rng() * cursed.length) | 0]);
    else while (picks.length < 3 && plain.length) picks.push(plain.splice((G.rng() * plain.length) | 0, 1)[0]);
    if (picks.length) {
      G.phase = 'levelup';
      renderCards('宝箱开启 — 择一遗物', picks.map(r => ({ kind: 'relic', id: r.id })), {
        showSkip: false,
        onPick: (c) => { applyCard(c); closeCards(); },
      });
      return;
    }
  }
  // fallback: directed fusion progress + ash that scales with run progress
  const gain = Math.round(60 * (1 + Math.floor(G.time / 180) * 0.5) * (G.diff.reward || 1));
  G.runResources.ash += gain;
  const aim = p.weapons.filter(w => !w.evolved && p.catalysts.some(c => c.id === WEAPON_BY_ID[w.id].catalyst)).sort((a, b) => b.lv - a.lv)[0];
  if (aim && aim.lv >= 6) {
    // close enough — the chest completes the fusion on the spot
    aim.lv = 8;
    G.chestPity = 0;
    evolveWeapon(aim);
    return;
  }
  if (aim) {
    aim.lv = Math.min(8, aim.lv + 2);
    recomputeStats(p);
    toastCeremony('宝箱', `${WEAPON_BY_ID[aim.id].name} 向神器迈进，灰烬记忆 +${gain}`, icon(WEAPON_BY_ID[aim.id].icon));
    return;
  }
  for (let i = 0; i < 2; i++) {
    const ws = p.weapons.filter(w => w.lv < 8);
    if (ws.length) ws[(G.rng() * ws.length) | 0].lv++;
  }
  recomputeStats(p);
  const full = p.relics.length >= maxRelics(p) ? `（遗物已满 ${p.relics.length}/${maxRelics(p)}）` : '';
  toastCeremony('宝箱', `武器强化 ×2，灰烬记忆 +${gain}${full}`, icon('key'));
}

function evolveWeapon(w) {
  const def = WEAPON_BY_ID[w.id];
  w.evolved = true;
  if (!META.seenArtifacts.includes(def.artifact.id)) { META.seenArtifacts.push(def.artifact.id); saveMeta(); }
  sfx.fusion();
  addFlash('#B58D3B', 0.5);
  hitStop(0.2);
  // 禁器血脉: whisper the forbidden pairing so build paths aren't blind luck
  let desc = def.artifact.desc;
  const fb = FORBIDDEN.find(f => f.needs.includes(def.artifact.id));
  if (fb) {
    const other = ARTIFACT_BY_ID[fb.needs.find(a => a !== def.artifact.id)];
    if (other) desc += `<br><span style="color:#B58D3B">深渊低语：它与『${other.name}』共鸣——两者齐聚且持有世界核心时，${fb.name}将苏醒</span>`;
  }
  ceremony('神器融合', def.artifact.name, desc, iconEvolved(def.icon), 1200, 'q-art');
  recomputeStats(G.player);
}

function formForbidden(f) {
  const p = G.player;
  G.worldCores--;
  p.forbidden.push(f.id);
  p.fbState = p.fbState || {};
  if (!META.seenForbidden.includes(f.id)) { META.seenForbidden.push(f.id); saveMeta(); }
  sfx.forbidden();
  addFlash('#0B0A0C', 0.8);
  hitStop(0.35);
  ceremony('创世禁器', f.name, f.desc, iconForbidden(f.icon), 1600, 'q-forbidden');
}

/* =================== 初始赐福 (memory tree) =================== */
export function openStartBless() {
  if (!G.active || G.phase !== 'play') return;
  G.phase = 'levelup';
  const opts = [
    { kind: 'boost', id: 'dmg', nm: '赐福·刃', ds: '全伤害+6%', n: 1 },
    { kind: 'boost', id: 'hp', nm: '赐福·躯', ds: '最大生命+10%', n: 1 },
    { kind: 'boost', id: 'magnet', nm: '赐福·引', ds: '拾取范围+15%', n: 1 },
    { kind: 'boost', id: 'speed', nm: '赐福·足', ds: '移动速度+4%', n: 1 },
  ];
  const cards = [];
  while (cards.length < 3 && opts.length) cards.push(opts.splice((G.rng() * opts.length) | 0, 1)[0]);
  renderCards('初始赐福', cards, {
    showSkip: false,
    onPick: (c) => {
      G.player.boosts[c.id] = (G.player.boosts[c.id] || 0) + c.n;
      recomputeStats(G.player);
      closeCards();
    },
  });
}

/* =================== endless 永恒抉择 =================== */
export function openEternalChoice() {
  if (G.phase !== 'play') return;
  G.phase = 'levelup';
  const opts = [
    { kind: 'boost', id: 'dmg', nm: '永恒·刃', ds: '全伤害+18%', n: 3 },
    { kind: 'boost', id: 'hp', nm: '永恒·躯', ds: '最大生命+30%', n: 3 },
    { kind: 'boost', id: 'cdr', nm: '永恒·钟', ds: '冷却缩减+12%', n: 3 },
    { kind: 'boost', id: 'crit', nm: '永恒·目', ds: '暴击率+15%', n: 3 },
  ];
  const cards = [];
  while (cards.length < 3 && opts.length) cards.push(opts.splice((G.rng() * opts.length) | 0, 1)[0]);
  renderCards('永恒抉择', cards, {
    showSkip: false,
    onPick: (c) => {
      G.player.boosts[c.id] = (G.player.boosts[c.id] || 0) + c.n;
      recomputeStats(G.player);
      closeCards();
    },
  });
}

/* =================== DOM rendering =================== */
// per-level special effects shown on upgrade cards — threshold levels get gold text
const LVBONUS_TXT = {
  amount: '投射物+', radius: '半径+', pierce: '穿透+', reach: '距离+', bounces: '弹射+',
  orbitR: '轨道+', cloudR: '毒雾+', auraR: '范围+', arc: '扇面+', spread: '散布+',
  heal: '治疗+', copyMult: '复制倍率+', cooldown: '冷却', speed: '弹速+', range: '射程+',
};
function cardHtml(c) {
  const p = G.player;
  let ic, nm, lv = '', ds, fuse = '', q = 'q-common', tag = '';
  if (c.kind === 'weapon') {
    const def = WEAPON_BY_ID[c.id];
    const w = p.weapons.find(x => x.id === c.id);
    ic = icon(def.icon);
    nm = def.name; tag = '武器';
    ds = def.desc;
    if (c.up) {
      lv = `Lv.${w.lv} → ${w.lv + 1}`;
      // concrete gains: damage multiplier delta + threshold specials in gold
      ds += `——伤害×${BAL.weaponLvMult[w.lv - 1]}→×${BAL.weaponLvMult[Math.min(7, w.lv)]}`;
      const bonus = def.lvBonus && def.lvBonus[w.lv + 1];
      if (bonus) {
        const parts = Object.entries(bonus).map(([k, v]) => (LVBONUS_TXT[k] || k + '+') + v);
        ds += ` <span style="color:#B58D3B">${parts.join('、')}</span>`;
        q = 'q-rare';
      }
      if (w.lv + 1 === 8) { ds += '（升至最高级）'; q = 'q-rare'; }
    } else {
      const enterLv = weaponEnterLv();
      lv = enterLv > 1 ? `新武器 Lv.${enterLv}` : '新武器';
    }
    const cat = CATALYST_BY_ID[def.catalyst];
    const hasCat = p.catalysts.some(x => x.id === def.catalyst);
    const fuseKnown = META.nodes['w_fusehint'] || META.seenArtifacts.includes(def.artifact.id);
    const ready = hasCat && (w ? w.lv : 0) >= 7;
    fuse = fuseKnown
      ? `融合：${cat.name} → ${def.artifact.name}` + (ready ? '（临近！）' : '')
      : `融合：${cat.name} → ？？？`;
    if (hasCat && cat.resTxt) fuse += ' · ' + cat.resTxt;
    // 禁器血脉: an owned evolved artifact pairs with this weapon's artifact
    const fb = FORBIDDEN.find(f => f.needs.includes(def.artifact.id)
      && f.needs.some(aid => aid !== def.artifact.id && p.weapons.some(w2 => w2.evolved && WEAPON_BY_ID[w2.id].artifact.id === aid)));
    if (fb) fuse += ` <span style="color:#B58D3B">禁器血脉：${fb.name}</span>`;
    if (ready) q = 'q-rare';
    // 距神器一步: sprint card gets the artifact gold frame
    if (c.up && isSprintCard(c)) { q = 'q-art'; fuse = '【距神器一步】' + fuse; }
    return { ic, nm, lv, ds, fuse, q, tag, ready };
  }
  if (c.kind === 'catalyst') {
    const def = CATALYST_BY_ID[c.id];
    const cat = p.catalysts.find(x => x.id === c.id);
    ic = icon(def.icon);
    nm = def.name; tag = '催化';
    lv = c.up ? `Lv.${cat.lv} → ${cat.lv + 1}` : '新催化物';
    ds = def.fmt.replace('{v}', def.pv * BAL.catalystLvMult[(cat ? cat.lv : 0)] || def.pv);
    const wdef = WEAPON_BY_ID[def.forW];
    const hasW = p.weapons.some(w => w.id === def.forW);
    // 共鸣 mechanics gain is a real pick reason — show it alongside the stat
    fuse = hasW
      ? `可催化：${wdef.name}（已持有）` + (def.resTxt ? ' · ' + def.resTxt : '')
      : `可催化：${wdef.name}（未持有）`;
    if (hasW) q = 'q-rare';
    if (!c.up && isSprintCard(c)) { q = 'q-art'; fuse = '【距神器一步】' + fuse; }
    return { ic, nm, lv, ds, fuse, q, tag };
  }
  if (c.kind === 'swap') {
    const oDef = CATALYST_BY_ID[c.outId], iDef = CATALYST_BY_ID[c.inId];
    return {
      ic: icon(iDef.icon), nm: `${oDef.name} → ${iDef.name}`, lv: '替换',
      ds: `舍弃 ${oDef.name}，换取 ${iDef.name}（${WEAPON_BY_ID[iDef.forW].name} 的催化物）`,
      fuse: '', q: 'q-rare', tag: '催化',
    };
  }
  if (c.kind === 'heal') {
    return { ic: icon(c.icon || 'hp'), nm: c.nm, lv: '', ds: c.ds, fuse: '', q: 'q-common', tag: '恢复' };
  }
  if (c.kind === 'relic') {
    const def = RELIC_BY_ID[c.id];
    return { ic: icon(def.icon), nm: def.name, lv: '遗物', ds: def.desc, fuse: '', q: def.cursed ? 'q-cursed' : 'q-rare', tag: '遗物' };
  }
  // boost — rare picks (增殖圣痕/圣化之刃/铁壁) render with the rare frame
  return { ic: icon(c.icon || c.id), nm: c.nm, lv: c.rare ? '稀有' : '', ds: c.ds, fuse: '', q: c.rare ? 'q-rare' : 'q-common', tag: '强化' };
}

function renderCards(title, cards, h) {
  const wrap = document.createElement('div');
  wrap.className = 'cards-wrap fade-in';
  wrap.id = 'levelup-ui';
  // one action per card set: the picked card flashes (.picked) for ~140ms before the
  // original close logic runs; the flag blocks double-taps / stray clicks meanwhile.
  // Automated sequential clicks are unaffected — the set is gone by the next poll.
  let acted = false;
  // 350ms grace period: cards pop mid-combat right next to the dodge/sin buttons,
  // so in-flight taps must not skip or pick anything (matches the entrance anim)
  const shownAt = performance.now();
  const tooSoon = () => performance.now() - shownAt < 350;
  const t = document.createElement('div');
  t.className = 'cards-title'; t.textContent = title;
  wrap.appendChild(t);
  if (h.hint) {
    const hd = document.createElement('div');
    hd.style.cssText = 'font-size:11px;color:#8a7f6f;text-align:center;margin:-2px 0 6px;opacity:0.85;letter-spacing:0.5px;';
    hd.textContent = h.hint;
    wrap.appendChild(hd);
  }
  let cardN = 0;
  for (const c of cards) {
    const d = cardHtml(c);
    const el = document.createElement('div');
    el.className = `upcard ${d.q}`;
    // inline stagger survives the quality-glow animation shorthand (which would
    // reset a stylesheet animation-delay to 0 and break the entrance order)
    el.style.animationDelay = (cardN++ * 0.05) + 's';
    el.innerHTML = `<div class="ic"></div><div class="body"><div class="nm">${d.nm}<span class="lv">${d.lv}</span></div><div class="ds">${d.ds}</div>${d.fuse ? `<div class="fuse ${d.ready ? 'ready' : ''}">${d.fuse}</div>` : ''}</div><div class="tag">${d.tag}</div>`;
    el.querySelector('.ic').appendChild(cloneCanvas(d.ic));
    el.addEventListener('click', () => {
      if (acted || tooSoon()) return;
      acted = true;
      el.style.animationDelay = '0s';   // the entrance stagger must not delay the pick flash
      el.classList.add('picked');
      sfx.select();
      setTimeout(() => h.onPick(c), 140);
    });
    if (h.showBanish && (c.kind === 'weapon' || c.kind === 'catalyst')) {
      const bx = document.createElement('div');
      // negative margin widens the hit area without pushing the card layout
      bx.style.cssText = 'position:absolute;bottom:6px;right:8px;font-size:12px;color:#49364F;letter-spacing:1px;padding:12px 14px;margin:-8px;';
      bx.textContent = '放逐 ✕';
      bx.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (acted || tooSoon()) return;
        acted = true;
        h.onBanish(c);
      });
      el.appendChild(bx);
    }
    wrap.appendChild(el);
  }
  const row = document.createElement('div');
  row.className = 'reroll-row';
  if (h.showReroll) {
    const b = document.createElement('button');
    b.className = 'btn small ghost'; b.textContent = `重掷 (${G.player.rerolls})`;
    b.addEventListener('click', () => { if (acted || tooSoon()) return; acted = true; h.onReroll(); });
    row.appendChild(b);
  }
  if (h.showLock) {
    const b = document.createElement('button');
    b.className = 'btn small ghost'; b.textContent = '锁定本组（每局一次）';
    b.addEventListener('click', () => {
      if (acted || tooSoon()) return;
      acted = true;
      // gold flash on the sealed set so locking has a visible confirmation
      wrap.querySelectorAll('.upcard').forEach(el2 => { el2.style.borderColor = '#B58D3B'; });
      sfx.select();
      setTimeout(() => h.onLock(cards), 300);
    });
    row.appendChild(b);
  }
  if (h.onClaimAll) {
    const b = document.createElement('button');
    b.className = 'btn small ghost'; b.textContent = `一键领取剩余 ×${G.levelupQueue}`;
    b.addEventListener('click', () => {
      if (acted || tooSoon()) return;
      b.remove();
      t.textContent = '圣痕苏醒 — 抉择';
      sfx.select();
      h.onClaimAll();
    });
    row.appendChild(b);
  }
  wrap.appendChild(row);
  if (h.showSkip) {
    const sk = document.createElement('div');
    sk.className = 'skipbar';
    const full = G.player && G.player.hp >= G.player.S.maxHp;
    sk.textContent = full ? '跳过——以血肉抵偿（满血：转为15%护盾）' : '跳过——以血肉抵偿（恢复15%生命）';
    sk.addEventListener('click', () => { if (acted || tooSoon()) return; acted = true; h.onSkip(); });
    wrap.appendChild(sk);
  }
  ui().appendChild(wrap);
}
function closeCards(resume = true) {
  const el = document.getElementById('levelup-ui');
  if (el) el.remove();
  // only un-pause if the level-up pause is still the active phase —
  // never stomp finalchoice/paused/story states set meanwhile
  if (resume && G.phase === 'levelup') G.phase = 'play';
}
function cloneCanvas(c) {
  const n = document.createElement('canvas');
  n.width = c.width; n.height = c.height;
  n.getContext('2d').drawImage(c, 0, 0);
  return n;
}

/* =================== ceremonies =================== */
function ceremony(kicker, name, desc, iconCanvas, ms, q) {
  G.phase = 'levelup';
  const wrap = document.createElement('div');
  wrap.className = 'cards-wrap fade-in';
  wrap.id = 'ceremony-ui';
  wrap.innerHTML = `<div class="cards-title">${kicker}</div>`;
  const card = document.createElement('div');
  card.className = `upcard ${q}`;
  card.style.minHeight = '140px';
  card.innerHTML = `<div class="ic" style="width:76px;height:76px;flex:0 0 76px"></div><div class="body"><div class="nm" style="font-size:21px">${name}</div><div class="ds" style="margin-top:6px">${desc}</div></div>`;
  card.querySelector('.ic').appendChild(cloneCanvas(iconCanvas));
  wrap.appendChild(card);
  const skip = document.createElement('div');
  skip.className = 'skipbar'; skip.textContent = '触摸以继续';
  wrap.appendChild(skip);
  ui().appendChild(wrap);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    // restore play only if this ceremony's pause is still what holds the game
    if (G.phase === 'levelup' && !document.getElementById('levelup-ui') && !document.getElementById('pause-ui')) G.phase = 'play';
  };
  skip.addEventListener('click', close);
  wrap.addEventListener('click', close);
  setTimeout(close, ms + 2600);
}
function toastCeremony(kicker, text, iconCanvas, q = 'q-rare') {
  const el = document.createElement('div');
  el.className = 'confession-toast';
  el.innerHTML = `<div class="ct">${kicker}</div><div class="cx">${text}</div>`;
  // the icon was accepted but never rendered — prepend it at toast size
  if (iconCanvas) {
    const c = cloneCanvas(iconCanvas);
    c.style.cssText = 'width:26px;height:26px;float:left;margin:2px 8px 2px 0;image-rendering:pixelated;';
    el.prepend(c);
  }
  ui().appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
