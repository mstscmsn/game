// Level-up cards, chests, artifact fusion & forbidden-weapon ceremonies.
import { G, num } from '../run/state.js';
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
      // weapon slots full → only offer catalysts fusable with owned weapons (docs §6.3)
      const ownsWeapon = p.weapons.some(w => w.id === def.forW);
      if (p.weapons.length >= 6 && !ownsWeapon) continue;
      out.push({ kind: 'catalyst', id: def.id, up: false, w: (ownsWeapon ? 10 * 3.5 : 10) * luck });
    }
  }
  // generic boosts (always some filler) — with stack count on the card
  const boosts = [
    ['hp', '肉身还愿', '最大生命+10%'], ['dmg', '磨刃', '全伤害+6%'], ['area', '教区扩张', '范围+5%'],
    ['cdr', '快钟摆', '冷却缩减+4%'], ['speed', '疾行', '移动速度+4%'], ['magnet', '引魂', '拾取范围+15%'],
    ['crit', '狠辣', '暴击率+5%'], ['armor', '铁片', '护甲+3'],
  ];
  for (const [id, nm, ds] of boosts) {
    const st = p.boosts[id] || 0;
    out.push({ kind: 'boost', id, nm, ds: ds + (st ? `（已持 ${st} 层）` : ''), w: 4 });
  }
  // the rare exciting one: +1 projectile (hard-capped at 2 picks)
  if ((p.boosts.amount || 0) < 2) out.push({ kind: 'boost', id: 'amount', nm: '增殖圣痕', ds: '所有武器投射物数量 +1（稀有）', w: 1.2, rare: true });
  return out;
}

function rollCards(n) {
  const p = G.player;
  const pool = candidates();
  const picks = [];
  // protection: first 8 levels at least one existing weapon upgrade (docs §6.3)
  if (p.level <= 8) {
    const wUp = pool.filter(c => c.kind === 'weapon' && c.up);
    if (wUp.length) picks.push(wUp[(G.rng() * wUp.length) | 0]);
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
  // 七罪骰子: 4th option is cursed relic
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
  renderCards('圣痕苏醒 — 抉择', cards, {
    showSkip: true, showReroll: p.rerolls > 0, showBanish: p.banishes > 0, showLock: !p.lockUsed,
    onPick: (c) => { applyCard(c); closeCards(); },
    onSkip: () => {
      // skip → heal 15%, to shield when full (docs §6.3)
      const v = p.S.maxHp * 0.15;
      if (p.hp >= p.S.maxHp) p.shield = Math.min(p.S.maxHp * 0.5, p.shield + v);
      else healPlayer(v);
      closeCards();
    },
    onReroll: () => { p.rerolls--; closeCards(false); openLevelUp(true); },
    onBanish: (c) => {
      p.banishes--;
      p.banished.push((c.kind === 'weapon' ? 'w:' : 'c:') + c.id);
      closeCards(false); openLevelUp(true);
    },
    onLock: (cs) => { p.lockUsed = true; setLocked(cs); closeCards(); },
  });
}

function applyCard(c) {
  const p = G.player;
  if (c.kind === 'weapon') {
    const w = p.weapons.find(w => w.id === c.id);
    if (w) w.lv = Math.min(8, w.lv + 1);
    else {
      p.weapons.push({ id: c.id, lv: 1 + (metaStartLv()), evolved: false, cd: 0, st: {} });
      if (!META.seenWeapons.includes(c.id)) { META.seenWeapons.push(c.id); saveMeta(); }
    }
  } else if (c.kind === 'catalyst') {
    const cat = p.catalysts.find(x => x.id === c.id);
    if (cat) cat.lv = Math.min(5, cat.lv + 1);
    else p.catalysts.push({ id: c.id, lv: 1 });
  } else if (c.kind === 'boost') {
    p.boosts[c.id] = (p.boosts[c.id] || 0) + 1;
  } else if (c.kind === 'relic') {
    if (!p.relics.includes(c.id)) {
      p.relics.push(c.id);
      const def = RELIC_BY_ID[c.id];
      if (def.cursed) G.rareTaken = (G.rareTaken || 0) + 1;
      if (c.id === 'hourglass') G.timeScale = Math.max(G.timeScale, 1.08);
    }
  }
  recomputeStats(p);
}
function metaStartLv() {
  const p = G.player;
  return p.relics.includes('firstnail') ? 1 : 0;
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
  // 神器保底 (docs §6.3): 3rd consecutive artifact-less boss chest hands you
  // the missing catalyst for your most-developed weapon
  if (G.chestPity >= 3) {
    G.chestPity = 0;
    const best = [...p.weapons].filter(w => !w.evolved).sort((a, b) => b.lv - a.lv)[0];
    if (best && !p.catalysts.some(c => c.id === WEAPON_BY_ID[best.id].catalyst) && p.catalysts.length < 6) {
      const catDef = CATALYST_BY_ID[WEAPON_BY_ID[best.id].catalyst];
      p.catalysts.push({ id: catDef.id, lv: 1 });
      recomputeStats(p);
      toastCeremony('神器保底', `铁钉神父的馈赠：${catDef.name}（${WEAPON_BY_ID[best.id].name} 的催化物）`, icon(catDef.icon), 'q-rare');
      return;
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
  // fallback: two random upgrades + ash
  for (let i = 0; i < 2; i++) {
    const ws = p.weapons.filter(w => w.lv < 8);
    if (ws.length) ws[(G.rng() * ws.length) | 0].lv++;
  }
  G.runResources.ash += 60;
  recomputeStats(p);
  toastCeremony('宝箱', '武器强化 ×2，灰烬记忆 +60', icon('key'));
}

function evolveWeapon(w) {
  const def = WEAPON_BY_ID[w.id];
  w.evolved = true;
  if (!META.seenArtifacts.includes(def.artifact.id)) { META.seenArtifacts.push(def.artifact.id); saveMeta(); }
  sfx.fusion();
  addFlash('#B58D3B', 0.5);
  hitStop(0.2);
  ceremony('神器融合', def.artifact.name, def.artifact.desc, iconEvolved(def.icon), 1200, 'q-art');
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
function cardHtml(c) {
  const p = G.player;
  let ic, nm, lv = '', ds, fuse = '', q = 'q-common', tag = '';
  if (c.kind === 'weapon') {
    const def = WEAPON_BY_ID[c.id];
    const w = p.weapons.find(x => x.id === c.id);
    ic = icon(def.icon);
    nm = def.name; tag = '武器';
    lv = c.up ? `Lv.${w.lv} → ${w.lv + 1}` : '新武器';
    ds = def.desc;
    if (c.up && w.lv + 1 === 8) { ds += '（升至最高级）'; q = 'q-rare'; }
    const cat = CATALYST_BY_ID[def.catalyst];
    const hasCat = p.catalysts.some(x => x.id === def.catalyst);
    const fuseKnown = META.nodes['w_fusehint'] || META.seenArtifacts.includes(def.artifact.id);
    const ready = hasCat && (w ? w.lv : 0) >= 7;
    fuse = fuseKnown
      ? `融合：${cat.name} → ${def.artifact.name}` + (ready ? '（临近！）' : '')
      : `融合：${cat.name} → ？？？`;
    if (ready) q = 'q-rare';
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
    fuse = `可催化：${wdef.name}` + (hasW ? '（已持有）' : '');
    if (hasW) q = 'q-rare';
    return { ic, nm, lv, ds, fuse, q, tag };
  }
  if (c.kind === 'relic') {
    const def = RELIC_BY_ID[c.id];
    return { ic: icon(def.icon), nm: def.name, lv: '遗物', ds: def.desc, fuse: '', q: def.cursed ? 'q-cursed' : 'q-rare', tag: '遗物' };
  }
  // boost
  return { ic: icon(c.id), nm: c.nm, lv: '', ds: c.ds, fuse: '', q: 'q-common', tag: '强化' };
}

function renderCards(title, cards, h) {
  const wrap = document.createElement('div');
  wrap.className = 'cards-wrap fade-in';
  wrap.id = 'levelup-ui';
  // one action per card set: the picked card flashes (.picked) for ~140ms before the
  // original close logic runs; the flag blocks double-taps / stray clicks meanwhile.
  // Automated sequential clicks are unaffected — the set is gone by the next poll.
  let acted = false;
  const t = document.createElement('div');
  t.className = 'cards-title'; t.textContent = title;
  wrap.appendChild(t);
  for (const c of cards) {
    const d = cardHtml(c);
    const el = document.createElement('div');
    el.className = `upcard ${d.q}`;
    el.innerHTML = `<div class="ic"></div><div class="body"><div class="nm">${d.nm}<span class="lv">${d.lv}</span></div><div class="ds">${d.ds}</div>${d.fuse ? `<div class="fuse ${d.ready ? 'ready' : ''}">${d.fuse}</div>` : ''}</div><div class="tag">${d.tag}</div>`;
    el.querySelector('.ic').appendChild(cloneCanvas(d.ic));
    el.addEventListener('click', () => {
      if (acted) return;
      acted = true;
      el.classList.add('picked');
      sfx.select();
      setTimeout(() => h.onPick(c), 140);
    });
    if (h.showBanish && (c.kind === 'weapon' || c.kind === 'catalyst')) {
      const bx = document.createElement('div');
      bx.style.cssText = 'position:absolute;bottom:6px;right:8px;font-size:10px;color:#49364F;letter-spacing:1px;padding:4px;';
      bx.textContent = '放逐 ✕';
      bx.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (acted) return;
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
    b.addEventListener('click', () => { if (acted) return; acted = true; h.onReroll(); });
    row.appendChild(b);
  }
  if (h.showLock) {
    const b = document.createElement('button');
    b.className = 'btn small ghost'; b.textContent = '锁定本组';
    b.addEventListener('click', () => { if (acted) return; acted = true; h.onLock(cards); });
    row.appendChild(b);
  }
  wrap.appendChild(row);
  if (h.showSkip) {
    const sk = document.createElement('div');
    sk.className = 'skipbar';
    sk.textContent = '跳过——以血肉抵偿（恢复15%生命）';
    sk.addEventListener('click', () => { if (acted) return; acted = true; h.onSkip(); });
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
  ui().appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
