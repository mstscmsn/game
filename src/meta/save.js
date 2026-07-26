// Persistent meta progression — localStorage
import { NODE_BY_ID } from '../data/metatrees.js';
import { CHARACTERS } from '../data/characters.js';

const KEY = 'anathema_save_v1';

export const META = {
  ver: 1,
  res: { ash: 0, nail: 0, bone: 0, pollen: 0, eye: 0 }, // 灰烬记忆/圣徒铁钉/堕翼骨片/伊甸花粉/黑日之瞳
  nodes: {},              // nodeId -> rank
  runs: 0, deaths: 0,
  bestTime: 0, totalKills: 0,
  stats: { rotKills: 0, cursedClear: 0, bossRangeKill: 0, prayers: 0, eliteExec: 0, tribunalWins: 0 },
  unlockedChars: ['adric', 'evlann'],
  unlockedDifficulty: 2,   // count of unlocked difficulty tiers (默祷+朝圣 from the start)
  seenWeapons: [], seenArtifacts: [], seenForbidden: [],
  confessionsFound: [],    // story confession ids
  saintConfessions: [],    // s1..s7
  endings: [],             // ending ids achieved
  bossKills: {},           // bossId -> count
  lastDeathBy: null, deathsBy: {},
  mercy: 0,                // 棺中慈悲 layers (0-2)
  mercyOff: false,
  firstClear: false,       // unlocks 1.25x
  hellThrone: false,       // 地狱新王 taken
  blackCrown: false,       // 黑环继位 — reaper appearance swap
  noinInherit: null,       // item carried to next run for noin
  timeScaleOpt: 1,
  settings: { shake: 1, flash: 1, dmgNumbers: 1, mergeNumbers: true, simpleFx: false, autoPickup: false, swapHands: false, sound: 1, music: 1, colorAssist: false },
  sinMarks: 0,             // 罪印难度层数 (self-imposed)
  lastRunSummary: null,
  lastDifficulty: 'pilgrim', // remembered for double-tap quick start
};

export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      deepMerge(META, d);
    }
  } catch (e) { console.warn('save load failed', e); }
  // migrations
  META.unlockedDifficulty = Math.max(META.unlockedDifficulty || 0, 2);
  return META;
}
export function saveMeta() {
  try { localStorage.setItem(KEY, JSON.stringify(META)); } catch (e) { /* private mode */ }
}
export function wipeMeta() { try { localStorage.removeItem(KEY); location.reload(); } catch (e) {} }

function deepMerge(dst, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) deepMerge(dst[k], src[k]);
    else dst[k] = src[k];
  }
}

/* ---- growth tree helpers ---- */
export function nodeRank(id) { return META.nodes[id] || 0; }
export function nodeCost(node, rank) { return node.cost(rank); }
export function canBuyNode(node) {
  const r = nodeRank(node.id);
  if (r >= node.maxRank) return false;
  const cost = node.cost(r);
  if (META.res[node.res] < cost) return false;
  if (node.needNail && META.res.nail < node.needNail) return false;
  if (node.needPollen && META.res.pollen < node.needPollen) return false;
  if (node.needEye && META.res.eye < node.needEye) return false;
  return true;
}
export function buyNode(node) {
  if (!canBuyNode(node)) return false;
  const r = nodeRank(node.id);
  META.res[node.res] -= node.cost(r);
  if (node.needNail) META.res.nail -= node.needNail;
  if (node.needPollen) META.res.pollen -= node.needPollen;
  if (node.needEye) META.res.eye -= node.needEye;
  META.nodes[node.id] = r + 1;
  saveMeta();
  return true;
}

// aggregate meta stats applied at run start
export function metaStats() {
  const s = {};
  for (const [id, rank] of Object.entries(META.nodes)) {
    const n = NODE_BY_ID[id];
    if (!n || !rank) continue;
    s[n.stat] = (s[n.stat] || 0) + n.v * rank;
  }
  return s;
}

/* ---- character unlock checks ---- */
export function isCharUnlocked(c) {
  if (META.unlockedChars.includes(c.id)) return true;
  let ok = false;
  if (c.unlock.type === 'start') ok = true;
  else if (c.unlock.type === 'stat') ok = (META.stats[c.unlock.key] || 0) >= c.unlock.n;
  else if (c.unlock.type === 'boss') ok = (META.bossKills[c.unlock.key] || 0) >= 1;
  else if (c.unlock.type === 'ending') ok = META.endings.includes(c.unlock.key);
  if (ok) { META.unlockedChars.push(c.id); saveMeta(); }
  return ok;
}
export function newlyUnlockableChars() {
  return CHARACTERS.filter(c => !META.unlockedChars.includes(c.id) && isCharUnlocked(c));
}

/* ---- run-count based guarantees (docs §11.4) ---- */
export function runGuarantees() {
  // returns bonuses applied for the player's Nth run
  const n = META.runs;
  const g = { protect: n === 0, dmg: 0, xp: 0 };
  return g;
}
