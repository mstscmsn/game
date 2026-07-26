// All DOM screens: menu, hub (无灯旅店), char select, trees, codex, settings,
// death choice, tribunal intro, final choice, endings, results, pause.
import { STORY } from '../data/story.js';
import { CHARACTERS, CHAR_BY_ID } from '../data/characters.js';
import { WEAPONS, WEAPON_BY_ID, CATALYSTS, FORBIDDEN } from '../data/weapons.js';
import { RELICS } from '../data/relics.js';
import { TREES } from '../data/metatrees.js';
import { AREAS, ENDLESS_AFFIXES } from '../data/areas.js';
import { BAL } from '../data/balance.js';
import { META, saveMeta, nodeRank, canBuyNode, buyNode, isCharUnlocked, wipeMeta } from '../meta/save.js';
import { icon, iconEvolved, iconForbidden } from '../art/icons.js';
import { makePortrait, SPRITES } from '../art/sprites.js';
import { sfx, playMusic, updateVolumes } from '../audio.js';
import { G } from '../run/state.js';
import { fmt, fmtTime } from '../core/util.js';

const ui = () => document.getElementById('ui-root');
let startRunFn = null;
export function bindStart(fn) { startRunFn = fn; }

function clear() { ui().innerHTML = ''; }
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function btn(label, cb, cls = 'btn') {
  const b = el('button', cls, label);
  b.addEventListener('click', () => { sfx.select(); cb(); });
  return b;
}
function screen(cls = '') {
  clear();
  const s = el('div', 'screen fade-in ' + cls);
  ui().appendChild(s);
  return s;
}
function cloneCanvas(c) {
  const n = document.createElement('canvas');
  n.width = c.width; n.height = c.height;
  n.getContext('2d').drawImage(c, 0, 0);
  return n;
}

/* =================== main menu =================== */
export function mainMenu() {
  document.body.classList.remove('heaven-skin');
  playMusic('hub');
  const s = screen();
  s.appendChild(el('div', 'sc-title', '逆圣'));
  s.appendChild(el('div', 'sc-sub', 'ANATHEMA · 黑日遗嘱'));
  s.appendChild(el('div', 'divider'));
  const quote = el('div', 'sc-note', '死亡不是结算界面。<br>死亡是通往下一层世界的门。');
  quote.style.marginBottom = '22px';
  s.appendChild(quote);
  s.appendChild(btn(META.runs === 0 ? '初醒' : '无灯旅店', () => META.runs === 0 ? introStory() : hubScreen(), 'btn primary'));
  if (META.runs > 0) s.appendChild(btn('快速出发', () => charSelect()));
  s.appendChild(btn('设置', () => settingsScreen(mainMenu)));
  s.appendChild(btn('关于', () => aboutScreen()));
  const tip = el('div', 'sc-note', `<br>${STORY.tips[(Math.random() * STORY.tips.length) | 0]}`);
  tip.style.opacity = '0.6';
  s.appendChild(tip);
}

function aboutScreen() {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '关于'));
  s.appendChild(el('div', 'divider'));
  s.appendChild(el('div', 'sc-note', `逆圣：黑日遗嘱 v1.0<br>ANATHEMA — TESTAMENT OF THE BLACK SUN<br><br>暗黑哥特 Roguelite 幸存者游戏<br>全部美术·音乐·剧情为程序化原创生成<br><br>操作：左摇杆移动 / 右侧闪避与罪技<br>键盘：WASD移动 · 空格闪避 · Q罪技 · ESC暂停`));
  s.appendChild(el('div', 'divider'));
  s.appendChild(btn('返回', mainMenu));
}

function introStory() {
  storyRoll(STORY.intro, () => charSelect());
}

export function storyRoll(lines, cb, title = null) {
  clear();
  const s = el('div', 'fullstory');
  ui().appendChild(s);
  if (title) s.appendChild(el('div', 'endtitle', title));
  let i = 0;
  const showNext = () => {
    if (i < lines.length) {
      const ln = el('div', 'ln', lines[i]);
      ln.style.animationDelay = '0.1s';
      s.appendChild(ln);
      i++;
    }
  };
  showNext();
  const timer = setInterval(() => {
    if (i >= lines.length) { clearInterval(timer); }
    else showNext();
  }, 1400);
  const done = el('div', 'sc-note', '<br>触摸以继续');
  done.style.cssText = 'position:absolute;bottom:8%;width:100%;text-align:center;opacity:.6';
  s.appendChild(done);
  s.addEventListener('click', () => { clearInterval(timer); cb(); });
}

/* =================== hub 无灯旅店 =================== */
export function hubScreen() {
  document.body.classList.remove('heaven-skin');
  playMusic('hub');
  const s = screen();
  s.appendChild(el('div', 'sc-title', '无灯旅店'));
  s.appendChild(el('div', 'sc-sub', '灵车仍在行驶 · 第' + (META.runs + 1) + '夜'));
  s.appendChild(resBar());
  s.appendChild(el('div', 'divider'));
  const grid = el('div', 'hub-npc-list');
  const npcs = [
    ['notary', () => treeScreen(['flesh', 'weaponT', 'memory'])],
    ['priest', () => codexScreen()],
    ['angel', () => treeScreen(['fallen'])],
    ['mapper', () => modeSelect()],
    ['mistress', () => charSelect()],
    ['waiter', () => waiterTalk()],
  ];
  for (const [id, cb] of npcs) {
    const n = STORY.npcs[id];
    const lines = (META.lastDeathBy && n.deathLines.length && Math.random() < 0.4) ? n.deathLines : n.lines;
    const quote = lines[(Math.random() * lines.length) | 0];
    const d = el('div', 'hub-npc', `<div class="nn">${n.name}</div><div class="nr">${n.role}</div><div class="nq">「${quote}」</div>`);
    d.addEventListener('click', () => { sfx.select(); cb(); });
    grid.appendChild(d);
  }
  s.appendChild(grid);
  s.appendChild(btn('出发 · 朝圣', () => charSelect(), 'btn primary'));
  s.appendChild(btn('设置', () => settingsScreen(hubScreen), 'btn ghost'));
  s.appendChild(btn('回到标题', mainMenu, 'btn ghost'));
}
function resBar() {
  const r = META.res;
  return el('div', 'res-bar',
    `灰烬记忆 <b>${fmt(r.ash)}</b> · 圣徒铁钉 <b>${r.nail}</b> · 堕翼骨片 <b>${r.bone}</b> · 伊甸花粉 <b>${r.pollen}</b> · 黑日之瞳 <b>${r.eye}</b>`);
}
function waiterTalk() {
  const twist = META.firstClear || META.endings.length > 0;
  const n = STORY.npcs.waiter;
  const lines = twist ? n.twist : n.lines;
  storyRoll([`【${n.name}】`, ...lines.slice(0, 4)], hubScreen);
}

/* =================== character select =================== */
export function charSelect() {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '缝尸台'));
  s.appendChild(el('div', 'sc-sub', '选择将被重塑的身体'));
  let selected = META.lastRunSummary ? META.lastRunSummary.char : 'adric';
  if (!META.unlockedChars.includes(selected)) selected = 'adric';
  const grid = el('div', 'char-grid');
  const detail = el('div', 'char-detail');
  const renderDetail = () => {
    const c = CHAR_BY_ID[selected];
    const w = WEAPON_BY_ID[c.weapon];
    detail.innerHTML = `<b>${c.name}</b><br>初始武器：${w.name} — ${w.desc}<br>特性：${c.trait}<br><span class="sin">罪技「${c.sin.name}」：${c.sin.desc}</span><br><i style="opacity:.7">${c.lore}</i>`;
  };
  for (const c of CHARACTERS) {
    const unlocked = isCharUnlocked(c);
    const card = el('div', 'char-card' + (unlocked ? '' : ' locked'));
    card.appendChild(cloneCanvas(makePortrait(c.id, 72)));
    card.appendChild(el('div', 'cn', c.short));
    card.appendChild(el('div', 'ct', c.title));
    if (!unlocked) card.appendChild(el('div', 'lk', '🔒 ' + (c.unlock.text || '')));
    card.addEventListener('click', () => {
      if (!unlocked) return;
      sfx.select();
      selected = c.id;
      grid.querySelectorAll('.char-card').forEach(x => x.classList.remove('sel'));
      card.classList.add('sel');
      renderDetail();
    });
    if (c.id === selected) card.classList.add('sel');
    grid.appendChild(card);
  }
  s.appendChild(grid);
  renderDetail();
  s.appendChild(detail);
  s.appendChild(el('div', 'divider'));
  s.appendChild(btn('继续 · 选择难度', () => difficultySelect(selected), 'btn primary'));
  s.appendChild(btn('返回旅店', hubScreen, 'btn ghost'));
}

function difficultySelect(charId) {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '难度'));
  s.appendChild(el('div', 'sc-sub', '朝圣的重量'));
  const diffs = Object.entries(BAL.difficulties);
  const unlockedN = META.unlockedDifficulty;
  diffs.forEach(([id, d], i) => {
    const locked = i >= unlockedN && i > 0;
    const b = btn(`${d.name} — 敌人${Math.round(d.hp * 100)}% · 奖励${Math.round(d.reward * 100)}%${locked ? ' 🔒' : ''}`, () => {
      if (locked) return;
      sinMarkSelect(charId, id);
    }, 'btn' + (i === 1 ? ' primary' : '') + (locked ? ' ghost' : ''));
    s.appendChild(b);
  });
  s.appendChild(el('div', 'sc-note', '通关朝圣可解锁更高难度'));
  s.appendChild(btn('返回', () => charSelect(), 'btn ghost'));
}

function sinMarkSelect(charId, diff) {
  if (META.runs < 2) { launch(charId, diff, 0); return; }
  const s = screen();
  s.appendChild(el('div', 'sc-title', '罪印'));
  s.appendChild(el('div', 'sc-sub', '主动背负的重量 · 换取更多灰烬'));
  for (let n = 0; n <= 3; n++) {
    s.appendChild(btn(n === 0 ? '不背负罪印' : `${'✠'.repeat(n)} 罪印×${n} — 敌人+${n * 15}%生命 / 奖励+${n * 20}%`, () => launch(charId, diff, n), 'btn' + (n === 0 ? ' primary' : '')));
  }
  s.appendChild(btn('返回', () => difficultySelect(charId), 'btn ghost'));
}
function launch(charId, diff, sinMarks, mode = 'pilgrimage', areaId = 'ashfield') {
  clear();
  startRunFn && startRunFn({ charId, difficulty: diff, sinMarks, mode, areaId });
}

/* =================== mode select (盲眼制图师) =================== */
export function modeSelect() {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '盲眼制图师'));
  s.appendChild(el('div', 'sc-sub', '他画的地图没有线条，只有钟声'));
  s.appendChild(btn('朝圣 · 完整世界线', () => charSelect(), 'btn primary'));
  // chapter hunt: visited areas
  const visited = ['ashfield'];
  if ((META.bossKills.anlo || 0) > 0) visited.push('cathedral');
  if ((META.bossKills.mimi || 0) > 0) visited.push('bells');
  if ((META.stats.tribunalWins || 0) > 0) visited.push('hell');
  if ((META.bossKills.margola || 0) > 0) visited.push('fakeheaven');
  if ((META.bossKills.lambking || 0) > 0) visited.push('trueheaven');
  const chDiv = el('div', 'sc-note', '章节狩猎 · 6分钟独立挑战：');
  s.appendChild(el('div', 'divider'));
  s.appendChild(chDiv);
  for (const a of visited) {
    s.appendChild(btn(`狩猎 · ${AREAS[a].name}`, () => chapterLaunch(a), 'btn'));
  }
  s.appendChild(el('div', 'divider'));
  if (META.firstClear) {
    s.appendChild(btn('黑日无尽 · 天外尸海', () => endlessLaunch(), 'btn'));
  } else s.appendChild(el('div', 'sc-note', '黑日无尽：通关真天堂后解锁'));
  s.appendChild(btn(`每日罪印 · ${dailySeedName()}`, () => dailyLaunch(), 'btn'));
  s.appendChild(btn('返回旅店', hubScreen, 'btn ghost'));
}
function chapterLaunch(areaId) {
  charPick(cid => { clear(); startRunFn({ charId: cid, difficulty: 'pilgrim', sinMarks: 0, mode: 'chapter', areaId }); });
}
function endlessLaunch() {
  charPick(cid => { clear(); startRunFn({ charId: cid, difficulty: 'penance', sinMarks: 0, mode: 'endless', areaId: 'corpsesea' }); });
}
function dailySeedName() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function dailyLaunch() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const chars = META.unlockedChars;
  const cid = chars[seed % chars.length];
  clear();
  startRunFn({ charId: cid, difficulty: 'pilgrim', sinMarks: 0, mode: 'daily', areaId: 'ashfield', seed, dailyDate: dailySeedName() });
}
function charPick(cb) {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '选择躯体'));
  const grid = el('div', 'char-grid');
  for (const c of CHARACTERS) {
    if (!isCharUnlocked(c)) continue;
    const card = el('div', 'char-card');
    card.appendChild(cloneCanvas(makePortrait(c.id, 72)));
    card.appendChild(el('div', 'cn', c.short));
    card.addEventListener('click', () => { sfx.select(); cb(c.id); });
    grid.appendChild(card);
  }
  s.appendChild(grid);
  s.appendChild(btn('返回', modeSelect, 'btn ghost'));
}

/* =================== growth trees =================== */
export function treeScreen(treeIds) {
  const s = screen();
  const isFallen = treeIds.length === 1;
  s.appendChild(el('div', 'sc-title', isFallen ? '失语天使' : '灰烬公证人'));
  s.appendChild(el('div', 'sc-sub', isFallen ? '死后之事，死前购买' : '以记忆为凭，以灰烬为价'));
  s.appendChild(resBar());
  const tabs = el('div', 'tree-tabs');
  const list = el('div', 'node-list');
  let cur = treeIds[0];
  const render = () => {
    list.innerHTML = '';
    const tree = TREES[cur];
    for (const n of tree.nodes) {
      const r = nodeRank(n.id);
      const maxed = r >= n.maxRank;
      const can = canBuyNode(n);
      const resName = { ash: '灰烬', bone: '骨片' }[n.res];
      const extra = n.needNail ? ` +铁钉×${n.needNail}` : n.needPollen ? ` +花粉×${n.needPollen}` : n.needEye ? ` +黑日之瞳×${n.needEye}` : '';
      const div = el('div', `node${maxed ? ' maxed' : ''}${!can && !maxed ? ' cant' : ''}`);
      const valNow = n.per !== undefined ? n.per * (r + 1) : n.v;
      div.innerHTML = `<div class="info"><div class="nn">${n.name}</div><div class="nd">${n.desc.replace('{v}', n.per !== undefined ? n.per * Math.max(1, r + (maxed ? 0 : 1)) : n.v)}</div></div>
        <div><div class="pips">${'●'.repeat(r)}${'○'.repeat(n.maxRank - r)}</div>
        <div class="cost">${maxed ? '已满' : `${n.cost(r)}${resName}${extra}`}</div></div>`;
      div.addEventListener('click', () => {
        if (buyNode(n)) { sfx.levelup(); treeRefresh(); }
        else sfx.select();
      });
      list.appendChild(div);
    }
  };
  const treeRefresh = () => { s.querySelector('.res-bar').replaceWith(resBar()); render(); };
  for (const tid of treeIds) {
    const t = el('div', 'tree-tab' + (tid === cur ? ' on' : ''), TREES[tid].name);
    t.addEventListener('click', () => {
      cur = tid;
      tabs.querySelectorAll('.tree-tab').forEach(x => x.classList.remove('on'));
      t.classList.add('on');
      render();
    });
    tabs.appendChild(t);
  }
  s.appendChild(tabs);
  s.appendChild(list);
  render();
  s.appendChild(btn('返回旅店', hubScreen, 'btn ghost'));
}

/* =================== codex (铁钉神父) =================== */
export function codexScreen() {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '铁钉神父'));
  s.appendChild(el('div', 'sc-sub', '武器与神器图鉴 · 未见者只余剪影'));
  const detail = el('div', 'codex-detail', '触摸图鉴查看详情。未发现的神器只显示剪影与模糊的传闻。');
  s.appendChild(detail);
  const addGrid = (title, items) => {
    s.appendChild(el('div', 'sc-sub', title));
    const grid = el('div', 'codex-grid');
    for (const it of items) {
      const known = it.known;
      const d = el('div', 'codex-item' + (known ? ' known' : ' silhouette'));
      d.appendChild(cloneCanvas(it.icon));
      d.appendChild(el('div', 'cn', known ? it.name : '？？？'));
      d.addEventListener('click', () => {
        detail.innerHTML = known ? `<b>${it.name}</b><br>${it.desc}` : `<b>？？？</b><br>${it.hint || '铁钉神父摇头：「它还没有原谅你。」'}`;
      });
      grid.appendChild(d);
    }
    s.appendChild(grid);
  };
  addGrid('普通武器', WEAPONS.map(w => ({ known: META.seenWeapons.includes(w.id) || CHARACTERS.some(c => c.weapon === w.id && META.unlockedChars.includes(c.id)), name: w.name, desc: `${w.desc}<br>催化：${CATALYSTS.find(c => c.id === w.catalyst).name}`, icon: icon(w.icon) })));
  addGrid('神器', WEAPONS.map(w => ({ known: META.seenArtifacts.includes(w.artifact.id), name: w.artifact.name, desc: w.artifact.desc + `<br>由 ${w.name} 满级融合`, icon: iconEvolved(w.icon), hint: `与${w.name}有关的传闻……` })));
  addGrid('创世禁器', FORBIDDEN.map(f => ({ known: META.seenForbidden.includes(f.id), name: f.name, desc: f.desc + `<br>需要：${f.needs.map(a => Object.values(WEAPON_BY_ID).find(w => w.artifact.id === a).artifact.name).join(' + ')} + 世界核心「${f.core}」`, icon: iconForbidden(f.icon), hint: '两件神器与一颗世界核心的低语。' })));
  addGrid('结局', Object.entries(STORY.endings).map(([id, e]) => ({ known: META.endings.includes(id), name: e.title, desc: e.lines.slice(0, 2).join('<br>'), icon: icon(id === 'dawn' ? 'sun' : id === 'whitedream' ? 'mask' : id === 'hellking' ? 'seedface' : id === 'blackcrown' ? 'ring' : 'hourglass') })));
  s.appendChild(el('div', 'sc-note', `告解收集：${META.confessionsFound.length} / 70 · 圣徒告解：${META.saintConfessions.length} / 7`));
  s.appendChild(btn('返回旅店', hubScreen, 'btn ghost'));
}

/* =================== settings =================== */
export function settingsScreen(back) {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '设置'));
  s.appendChild(el('div', 'divider'));
  const S = META.settings;
  const addToggle = (label, key) => {
    const row = el('div', 'set-row');
    row.appendChild(el('span', 'lab', label));
    const t = el('div', 'toggle' + (S[key] ? ' on' : ''));
    t.addEventListener('click', () => { S[key] = !S[key]; t.classList.toggle('on', !!S[key]); saveMeta(); applySettings(); });
    row.appendChild(t);
    s.appendChild(row);
  };
  const addSlider = (label, key) => {
    const row = el('div', 'set-row');
    row.appendChild(el('span', 'lab', label));
    const sl = el('input', 'slider');
    sl.type = 'range'; sl.min = 0; sl.max = 100; sl.value = Math.round(S[key] * 100);
    sl.addEventListener('input', () => { S[key] = sl.value / 100; saveMeta(); applySettings(); });
    row.appendChild(sl);
    s.appendChild(row);
  };
  addSlider('音效音量', 'sound');
  addSlider('音乐音量', 'music');
  addSlider('屏幕震动强度', 'shake');
  addSlider('闪光强度', 'flash');
  addToggle('显示伤害数字', 'dmgNumbers');
  addToggle('合并伤害数字', 'mergeNumbers');
  addToggle('创世禁器简化特效', 'simpleFx');
  addToggle('色弱符号辅助', 'colorAssist');
  addToggle('自动拾取模式', 'autoPickup');
  addToggle('左右手UI互换', 'swapHands');
  if (META.firstClear) addToggle('1.25× 朝圣加速（已解锁）', 'speed125');
  if (META.mercy > 0 || META.runs >= 2) addToggle(`关闭棺中慈悲（+10%资源）`, 'mercyOffFlag');
  s.appendChild(el('div', 'divider'));
  s.appendChild(btn('抹除全部存档', () => { if (confirm('确定抹除所有进度？此操作不可逆。')) wipeMeta(); }, 'btn ghost'));
  s.appendChild(btn('返回', back, 'btn'));
}
export function applySettings() {
  const S = META.settings;
  META.mercyOff = !!S.mercyOffFlag;
  window.SETTINGS = S;
  updateVolumes();
  import('../input.js').then(m => { m.input.swapHands = !!S.swapHands; });
}

/* =================== in-run overlays =================== */
export function showAreaTitle(title, sub, lines) {
  const d = el('div', 'top-note fade-in', `<b style="color:var(--gold)">${sub}</b> · ${title}${lines && lines[0] ? `<br><span style="opacity:.75">${lines[0]}</span>` : ''}`);
  d.style.whiteSpace = 'normal'; d.style.maxWidth = '84vw'; d.style.textAlign = 'center';
  ui().appendChild(d);
  setTimeout(() => d.remove(), 4200);
}
export function toastLines(who, text) {
  ui().querySelectorAll('.story-box').forEach(b => b.remove());
  const box = el('div', 'story-box fade-in');
  if (who) box.appendChild(el('div', 'who', who));
  box.appendChild(el('div', '', text.replace(/\n/g, '<br>')));
  box.appendChild(el('div', 'tap', '触摸关闭'));
  box.addEventListener('click', () => box.remove());
  ui().appendChild(box);
  setTimeout(() => box.remove(), 6500);
}
window.__TOAST = (title, text) => {
  const t = el('div', 'confession-toast');
  t.innerHTML = `<div class="ct">拾得告解 · ${title}</div><div class="cx">${text}</div>`;
  t.addEventListener('click', () => t.remove());
  ui().appendChild(t);
  setTimeout(() => t.remove(), 7000);
};
window.__BANNER = (name, quote) => {
  const t = el('div', 'top-note fade-in', name ? `<b style="color:var(--danger)">${name}</b>${quote ? `<br><span style="opacity:.8">${quote}</span>` : ''}` : `<span style="opacity:.85">${quote}</span>`);
  t.style.whiteSpace = 'normal'; t.style.maxWidth = '84vw'; t.style.textAlign = 'center';
  ui().appendChild(t);
  setTimeout(() => t.remove(), 4200);
};

/* =================== death choice (docs §16.6) =================== */
export function showDeathChoice({ onAccept, onChallenge, canChallenge }) {
  clear();
  const s = el('div', 'death-screen');
  ui().appendChild(s);
  s.appendChild(el('div', 'death-line', STORY.deathChoice.line));
  const b1 = el('button', 'death-btn', STORY.deathChoice.accept);
  b1.addEventListener('click', () => { sfx.select(); clear(); onAccept(); });
  const b2 = el('button', 'death-btn wing', STORY.deathChoice.challenge + (canChallenge ? '' : '（本局已用）'));
  if (canChallenge) b2.addEventListener('click', () => { sfx.select(); clear(); onChallenge(); });
  else b2.style.opacity = '0.4';
  s.appendChild(b2);
  s.appendChild(b1);
  const note = el('div', 'sc-note', '挑战成功：从地狱复活，继续本局<br>挑战失败：正常结算，保留全部资源');
  note.style.color = '#3a3230';
  s.appendChild(note);
}

export function showTribunalIntro(lines) {
  toastLines(STORY.bosses.rahshiel.name, lines.join('\n'));
}

export function showThroneChoice({ onSit, onLeave }) {
  if (G.phase !== 'play') return;
  G.phase = 'story';
  const s = el('div', 'cards-wrap fade-in');
  s.id = 'throne-ui';
  s.appendChild(el('div', 'cards-title', '空置的铁王座'));
  s.appendChild(el('div', 'sc-note', '玛戈拉死了。王座在铁花之间冷却。<br>坐上去，地狱就是你的——但你将放弃天堂。'));
  const b1 = btn('坐上王座（结局：地狱新王）', () => { s.remove(); G.phase = 'play'; onSit(); }, 'btn');
  const b2 = btn('背过王座，继续向上', () => { s.remove(); G.phase = 'play'; onLeave(); }, 'btn primary');
  s.appendChild(b2); s.appendChild(b1);
  ui().appendChild(s);
}

export function showPurifyChoice() {
  const p = G.player;
  if (!p || !p.forbidden.length) return;
  if (G.phase !== 'play') return;
  G.phase = 'story';
  const s = el('div', 'cards-wrap fade-in');
  s.appendChild(el('div', 'cards-title', '净化祭坛'));
  s.appendChild(el('div', 'sc-note', '真天堂的入口悬着一座白骨祭坛。<br>将一件创世禁器交给它净化——威力减弱三成，<br>但它将不再吞噬你的名字。（真结局条件之一）'));
  for (const fid of p.forbidden) {
    const f = FORBIDDEN.find(x => x.id === fid);
    if (p.fbPurified && p.fbPurified.includes(fid)) continue;
    s.appendChild(btn(`净化「${f.name}」`, () => {
      p.fbPurified = p.fbPurified || [];
      p.fbPurified.push(fid);
      for (const w of p.weapons) if (f.needs.includes(WEAPON_BY_ID[w.id] && WEAPON_BY_ID[w.id].artifact.id)) w.purified = true;
      G.purifiedForbidden++;
      s.remove(); G.phase = 'play';
      toastLines('', '禁器安静下来。像一件放下的凶器。');
    }, 'btn'));
  }
  s.appendChild(btn('拒绝净化', () => { s.remove(); G.phase = 'play'; }, 'btn ghost'));
  ui().appendChild(s);
}

/* =================== final choice =================== */
export function showFinalChoice({ canDawn, onChoice }) {
  clear();
  const s = el('div', 'cards-wrap fade-in');
  s.style.background = 'rgba(5,4,6,0.94)';
  ui().appendChild(s);
  s.appendChild(el('div', 'cards-title', '最终抉择'));
  s.appendChild(el('div', 'sc-note', STORY.finalChoice.prompt.join('<br>')));
  const F = STORY.finalChoice;
  const mk = (key, gated) => {
    const o = F[key];
    const hint = gated && !canDawn;
    const label = `${o.label}${hint ? ' ✧' : ''}<br><span style="font-size:11px;opacity:.7">${hint ? '（黎明条件未满足——点击查看，仍可强行摧毁）' : o.desc}</span>`;
    const b = btn(label, () => {
      if (hint && !b.dataset.warned) {
        b.dataset.warned = '1';
        toastLines('', `真结局条件：七份圣徒告解(${META.saintConfessions.length}/7)、战胜堕翼审判(${G.tribunalWon ? '✓' : '✗'})、拒绝假天堂全部礼物(${G.giftsTaken === 0 ? '✓' : '✗'})、净化一件创世禁器(${G.purifiedForbidden > 0 ? '✓' : '✗'})\n再次点击将强行摧毁。`);
        return;
      }
      clear();
      onChoice(key);
    }, 'btn');
    if (hint) b.style.opacity = '0.6';
    s.appendChild(b);
  };
  mk('destroy', true);
  mk('purify', false);
  mk('inherit', false);
  mk('enter', false);
}

/* =================== ending & results =================== */
export function showEnding(e, cb) {
  storyRoll(e.lines, cb, e.title);
}

export function showResults(sum) {
  document.body.classList.remove('heaven-skin');
  const s = screen();
  playMusic('hub');
  s.appendChild(el('div', 'sc-title', sum.victory ? '世界线闭合' : '此身归还'));
  s.appendChild(el('div', 'sc-sub', sum.reason + (sum.ending ? ` · ${STORY.endings[sum.ending] ? STORY.endings[sum.ending].title : ''}` : '')));
  s.appendChild(el('div', 'divider'));
  const t = el('table', 'stat-table');
  const rows = [
    ['存活时间', fmtTime(sum.time)], ['等级', sum.level], ['击杀', fmt(sum.kills)],
    ['精英击杀', sum.elite], ['Boss击杀', sum.boss], ['总伤害', fmt(sum.dmg)],
    ['承受伤害', fmt(sum.taken)], ['神器', sum.artifacts], ['创世禁器', sum.forbidden],
    ['拾得告解', sum.confessions],
  ];
  for (const [k, v] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
    t.appendChild(tr);
  }
  s.appendChild(t);
  const g = sum.gains;
  s.appendChild(el('div', 'gain-list',
    `＋灰烬记忆 ${fmt(g.ash)}${g.nail ? ` ＋圣徒铁钉 ${g.nail}` : ''}${g.bone ? ` ＋堕翼骨片 ${g.bone}` : ''}${g.pollen ? ` ＋伊甸花粉 ${g.pollen}` : ''}${g.eye ? ` ＋黑日之瞳 ${g.eye}` : ''}`));
  // unlock notices (isCharUnlocked also persists newly-met conditions)
  const before = [...META.unlockedChars];
  CHARACTERS.forEach(c => isCharUnlocked(c));
  const fresh = META.unlockedChars.filter(id => !before.includes(id));
  for (const id of fresh) {
    s.appendChild(el('div', 'gain-list', `☩ 新的躯体可被缝合：${CHAR_BY_ID[id].name}`));
  }
  if (META.mercy > 0 && !META.mercyOff) s.appendChild(el('div', 'sc-note', `棺中慈悲 ×${META.mercy}：下一局攻防+8%（可在设置关闭）`));
  s.appendChild(el('div', 'divider'));
  s.appendChild(btn('回到无灯旅店', hubScreen, 'btn primary'));
  s.appendChild(btn('再次出发', () => charSelect(), 'btn'));
  const tip = el('div', 'sc-note', STORY.tips[(Math.random() * STORY.tips.length) | 0]);
  tip.style.opacity = '0.55';
  s.appendChild(tip);
}

/* =================== pause =================== */
export function pauseMenu(onResume, onQuit) {
  if (document.getElementById('pause-ui')) return;
  const s = el('div', 'cards-wrap fade-in');
  s.id = 'pause-ui';
  s.appendChild(el('div', 'cards-title', '暂停 · 灵车静止'));
  const p = G.player;
  if (p) {
    const wl = p.weapons.map(w => {
      const def = WEAPON_BY_ID[w.id];
      return `${w.evolved ? def.artifact.name : def.name} Lv.${w.evolved ? 'MAX' : w.lv}`;
    }).join(' · ');
    const cl = p.catalysts.map(c => `${CATALYSTS.find(x => x.id === c.id).name} Lv.${c.lv}`).join(' · ') || '无';
    const rl = p.relics.map(r => RELICS.find(x => x.id === r).name).join(' · ') || '无';
    s.appendChild(el('div', 'sc-note', `武器：${wl}<br>催化：${cl}<br>遗物：${rl}<br>${p.forbidden.length ? '禁器：' + p.forbidden.map(f => FORBIDDEN.find(x => x.id === f).name).join('·') : ''}`));
  }
  s.appendChild(btn('继续', () => { s.remove(); onResume(); }, 'btn primary'));
  s.appendChild(btn('设置', () => { s.remove(); settingsScreen(() => { clear(); pauseMenu(onResume, onQuit); }); }, 'btn'));
  s.appendChild(btn('放弃本局（保留资源）', () => { s.remove(); onQuit(); }, 'btn ghost'));
  ui().appendChild(s);
}
