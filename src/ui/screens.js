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
import { G, after, num } from '../run/state.js';
import { fmt, fmtTime } from '../core/util.js';

const ui = () => document.getElementById('ui-root');

// data-URI favicon (a tiny black sun): gives the tab an icon and stops browsers
// from 404-ing on /favicon.ico when serving dist
if (!document.querySelector('link[rel="icon"]')) {
  const fav = document.createElement('link');
  fav.rel = 'icon';
  fav.href = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#0B0A0C"/><circle cx="8" cy="8" r="5" fill="none" stroke="#8E1F2F" stroke-width="2"/><circle cx="8" cy="8" r="2" fill="#B58D3B"/></svg>');
  document.head.appendChild(fav);
}

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
// screen(): menu screens cross-fade — the old screen sinks/fades for 160ms while the
// new one fades in on top. Battle entry/exit paths (launch/showResults) never see an
// old .screen, so they keep the instant clear() behavior.
let scrOut = false; // re-entry guard: only one outgoing screen animates at a time
function screen(cls = '') {
  const root = ui();
  const old = root.querySelector('.screen:not(.screen-out)');
  if (old && !scrOut) {
    scrOut = true;
    for (const ch of [...root.children]) if (ch !== old) ch.remove();
    old.classList.add('screen-out');
    setTimeout(() => { old.remove(); scrOut = false; }, 180);
  } else {
    clear();
    scrOut = false;
  }
  const s = el('div', 'screen fade-in ' + cls);
  root.appendChild(s);
  startAshFall();
  return s;
}

/* ---------- ash-fall particle layer ----------
 * One persistent canvas outside #ui-root (so clear() never kills it). The rAF loop
 * self-suspends the moment no .screen exists — battle never pays for it. */
let ashC = null, ashRAF = 0, ashPts = null;
function startAshFall() {
  if (!ashC) {
    ashC = document.createElement('canvas');
    ashC.id = 'ashfall-fx';
    (document.getElementById('app') || document.body).appendChild(ashC);
    ashPts = [];
    for (let i = 0; i < 40; i++) ashPts.push({
      x: Math.random(), y: Math.random(), r: 1 + Math.random() * 1.6,
      vy: 9 + Math.random() * 15, sway: 5 + Math.random() * 13,
      ph: Math.random() * 6.283, sp: 0.35 + Math.random() * 0.8,
      a: 0.10 + Math.random() * 0.22,
    });
  }
  if (ashRAF) return;
  ashC.style.display = 'block';
  let last = performance.now();
  const tick = (now) => {
    if (!ui().querySelector('.screen')) { ashRAF = 0; ashC.style.display = 'none'; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const W = innerWidth, H = innerHeight;
    if (ashC.width !== W || ashC.height !== H) { ashC.width = W; ashC.height = H; }
    const x = ashC.getContext('2d');
    x.clearRect(0, 0, W, H);
    const heaven = document.body.classList.contains('heaven-skin');
    x.fillStyle = heaven ? '#9a8f74' : '#8f8570';
    for (const p of ashPts) {
      p.y += p.vy * dt / H;
      p.ph += p.sp * dt;
      if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
      x.globalAlpha = p.a * (heaven ? 0.6 : 1);
      x.fillRect(p.x * W + Math.sin(p.ph) * p.sway, p.y * H, p.r, p.r);
    }
    x.globalAlpha = 1;
    ashRAF = requestAnimationFrame(tick);
  };
  ashRAF = requestAnimationFrame(tick);
}
// black-sun emblem canvas for menu headers (procedural, cached)
let emblemC = null;
function blackSunEmblem() {
  if (!emblemC) {
    emblemC = document.createElement('canvas');
    emblemC.width = 320; emblemC.height = 240;
    const x = emblemC.getContext('2d');
    const cx = 160, cy = 120;
    x.strokeStyle = 'rgba(216,199,164,0.18)'; x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, 104, 0, 6.29); x.stroke();
    x.strokeStyle = '#B58D3B'; x.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * 6.283;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * 74, cy + Math.sin(a) * 74);
      x.lineTo(cx + Math.cos(a) * (i % 2 ? 96 : 86), cy + Math.sin(a) * (i % 2 ? 96 : 86));
      x.stroke();
    }
    x.fillStyle = '#050405';
    x.beginPath(); x.arc(cx, cy, 62, 0, 6.29); x.fill();
    x.strokeStyle = '#D4474F'; x.lineWidth = 4;
    x.beginPath(); x.arc(cx, cy, 65, 0, 6.29); x.stroke();
    x.strokeStyle = 'rgba(142,31,47,0.55)'; x.lineWidth = 9;
    x.beginPath(); x.arc(cx, cy, 73, 0, 6.29); x.stroke();
    x.strokeStyle = '#8E1F2F'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx - 30, cy); x.quadraticCurveTo(cx, cy + 18, cx + 30, cy); x.stroke();
  }
  const c = cloneCanvas(emblemC);
  c.className = 'emblem-fx';
  c.style.cssText = 'width:min(64vw,250px);height:auto;display:block;margin:2px auto 0;';
  return c;
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
  const s = screen('center');
  s.appendChild(blackSunEmblem());
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
  const tip = el('div', 'sc-note', `<br>${STORY.whispers[(Math.random() * STORY.whispers.length) | 0]}`);
  tip.style.opacity = '0.6';
  s.appendChild(tip);
}

function aboutScreen() {
  const s = screen();
  s.appendChild(el('div', 'sc-title', '关于'));
  s.appendChild(el('div', 'divider'));
  s.appendChild(el('div', 'sc-note', `逆圣：黑日遗嘱 v1.4<br>ANATHEMA — TESTAMENT OF THE BLACK SUN<br><br>暗黑哥特 Roguelite 幸存者游戏<br>全部美术·音乐·剧情为程序化原创生成<br><br>操作：左摇杆移动 / 右侧闪避与罪技<br>键盘：WASD移动 · 空格闪避 · Q罪技 · ESC暂停`));
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
  let i = 0, ended = false, timer = null;
  const done = el('div', 'sc-note', '<br>触摸继续 · 长按跳过');
  done.style.cssText = 'position:absolute;bottom:8%;width:100%;text-align:center;opacity:.6';
  const finish = () => {
    if (ended) return;
    ended = true;
    clearInterval(timer);
    cb();
  };
  const showNext = () => {
    if (i < lines.length) {
      const ln = el('div', 'ln', lines[i]);
      ln.style.animationDelay = '0.1s';
      s.appendChild(ln);
      i++;
      if (i >= lines.length) done.innerHTML = '<br>触摸结束';
    }
  };
  const restartTimer = () => {
    clearInterval(timer);
    timer = setInterval(() => {
      if (i >= lines.length) clearInterval(timer);
      else showNext();
    }, 1400);
  };
  showNext();
  restartTimer();
  s.appendChild(done);
  // tap = advance one line (every line gets seen); tap after the last = close;
  // hold 600ms = skip the whole roll for repeat pilgrims
  let holdT = null, held = false;
  s.addEventListener('pointerdown', () => { held = false; holdT = setTimeout(() => { held = true; finish(); }, 600); });
  const cancelHold = () => { if (holdT) { clearTimeout(holdT); holdT = null; } };
  s.addEventListener('pointerup', cancelHold);
  s.addEventListener('pointercancel', cancelHold);
  s.addEventListener('click', () => {
    if (ended || held) return;
    if (i < lines.length) { showNext(); restartTimer(); }
    else finish();
  });
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
    ['notary', 'ledger', () => treeScreen(['flesh', 'weaponT', 'memory'])],
    ['priest', 'nail', () => codexScreen()],
    ['angel', 'feather', () => treeScreen(['fallen'])],
    ['mapper', 'eye', () => modeSelect()],
    ['mistress', 'needle', () => charSelect()],
    ['waiter', 'mask', () => waiterTalk()],
  ];
  for (const [id, ic, cb] of npcs) {
    const n = STORY.npcs[id];
    // after first clear the NPCs know the sky changed — mix in their late lines
    const pool = (META.firstClear && n.linesLate) ? [...n.lines, ...n.linesLate] : n.lines;
    const lines = (META.lastDeathBy && n.deathLines.length && Math.random() < 0.4) ? n.deathLines : pool;
    const quote = lines[(Math.random() * lines.length) | 0].replace('{killer}', META.lastDeathBy || '未知');
    const d = el('div', 'hub-npc', `<div class="nn">${n.name}</div><div class="nr">${n.role}</div><div class="nq">「${quote}」</div>`);
    const icc = cloneCanvas(icon(ic));
    icc.style.cssText = 'width:30px;height:30px;display:block;margin:0 auto 4px;opacity:.85;';
    d.prepend(icc);
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
    const b = btn(`<div><div style="letter-spacing:6px">${d.name}${locked ? ' ✕' : ''}</div><div style="font-size:11px;letter-spacing:1px;opacity:.7;margin-top:2px">敌人 ${Math.round(d.hp * 100)}% · 奖励 ${Math.round(d.reward * 100)}%${locked ? ' · 通关前一难度解锁' : ''}</div></div>`, () => {
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
      div.innerHTML = `<div class="info"><div class="nn">${n.name}</div><div class="nd">${n.desc.replace('{v}', n.per !== undefined ? n.per * Math.max(1, r + (maxed ? 0 : 1)) : n.v)}</div></div>
        <div><div class="pips">${'●'.repeat(r)}${'○'.repeat(n.maxRank - r)}</div>
        <div class="cost ${maxed ? '' : can ? 'ok' : 'no'}">${maxed ? '已满' : `${n.cost(r)}${resName}${extra}`}</div></div>`;
      div.addEventListener('click', () => {
        if (buyNode(n)) {
          sfx.levelup();
          treeRefresh();
          const nd = [...list.children].find(x => x.textContent.includes(n.name));
          if (nd) nd.classList.add('bought-flash');
        }
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
  // —— 告解匣：collected confessions become a readable archive, not one-shot toasts ——
  s.appendChild(el('div', 'sc-sub', `告解匣 · ${META.confessionsFound.length} / ${STORY.confessions.length}`));
  const saintRow = el('div', 'saint-row');
  for (let i = 1; i <= 7; i++) {
    const sid = 's' + i;
    const c = STORY.confessions.find(x => x.id === sid);
    const got = META.saintConfessions.includes(sid);
    const seal = el('div', 'saint-seal' + (got ? ' got' : ''), got ? '✠' : '·');
    seal.addEventListener('click', () => {
      sfx.select();
      detail.innerHTML = got
        ? `<b style="color:var(--gold)">${c.title}</b><br>${c.text}`
        : `<b>第${i}印 · 未拾得</b><br>圣徒的告解，藏于${AREAS[c.area] ? AREAS[c.area].name : c.area}。七印齐时，方可迎来黎明。`;
    });
    saintRow.appendChild(seal);
  }
  s.appendChild(saintRow);
  s.appendChild(el('div', 'sc-note', `圣徒告解 ${META.saintConfessions.length} / 7 —— 真结局条件`));
  for (const aid of ['ashfield', 'cathedral', 'bells', 'hell', 'fakeheaven', 'trueheaven']) {
    const items = STORY.confessions.filter(c => c.area === aid && !/^s\d$/.test(c.id));
    s.appendChild(el('div', 'conf-area', AREAS[aid].name));
    const wrap = el('div', 'conf-list');
    for (const c of items) {
      const found = META.confessionsFound.includes(c.id);
      const d = el('div', 'conf-item' + (found ? ' found' : ''), found ? c.title : '？？？');
      d.addEventListener('click', () => {
        sfx.select();
        detail.innerHTML = found ? `<b>${c.title}</b><br>${c.text}` : `<b>？？？</b><br>仍散落在${AREAS[aid].name}的某处。`;
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      wrap.appendChild(d);
    }
    s.appendChild(wrap);
  }
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
  ui().querySelectorAll('.top-note').forEach(x => x.remove());
  // revisits (endless loops, hell→fakeheaven detours) rotate through the intro poem
  const vis = (G.areaVisits && G.areaVisits[G.areaId]) || 1;
  const line = lines && lines.length ? lines[(vis - 1) % lines.length] : null;
  const d = el('div', 'top-note fade-in', `<b style="color:var(--gold)">${sub}</b> · ${title}${line ? `<br><span style="opacity:.75">${line}</span>` : ''}`);
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
  setTimeout(() => t.remove(), 9000);
};

/* saint confession (s1-s7): a ritual pause, not a passing toast — these gate the true ending */
export function showSaintConfession(c) {
  const tryShow = () => {
    if (!G.active || G.ended) return;
    if (G.phase !== 'play') { after(1, tryShow); return; }
    G.phase = 'story';
    const s = el('div', 'cards-wrap fade-in');
    s.appendChild(el('div', 'cards-title', '✠ ' + c.title));
    const tx = el('div', 'sc-note', c.text);
    tx.style.cssText = 'max-width:520px;line-height:1.9;color:#D8C7A4;text-align:left;padding:0 10px';
    s.appendChild(tx);
    s.appendChild(el('div', 'sc-sub', `圣徒告解 ${META.saintConfessions.length} / 7 —— 七印齐时，方可迎来黎明`));
    s.appendChild(btn('合上告解', () => { s.remove(); G.phase = 'play'; }, 'btn primary'));
    ui().appendChild(s);
  };
  tryShow();
}

/* fake-heaven gift: refusing temptation is a choice the player makes, not a timeout */
export function showGiftChoice({ onTake, onRefuse }) {
  const tryShow = () => {
    if (!G.active || G.ended) return;
    if (G.phase !== 'play') { after(1, tryShow); return; }
    G.phase = 'story';
    const s = el('div', 'cards-wrap fade-in');
    s.appendChild(el('div', 'cards-title', '白衣者的恩赐'));
    s.appendChild(el('div', 'sc-note', '一只白瓷碗，盛着温热的奶与蜜。<br>「吃吧。您不用再战斗了。」'));
    s.appendChild(btn('打翻它<br><span style="font-size:11px;opacity:.7">顺从-5 · 守住黎明的资格</span>', () => { s.remove(); G.phase = 'play'; onRefuse(); }, 'btn primary'));
    s.appendChild(btn('接过奶与蜜<br><span style="font-size:11px;opacity:.7">回复30%生命 · 顺从+15 · 黎明条件破灭</span>', () => { s.remove(); G.phase = 'play'; onTake(); }, 'btn'));
    ui().appendChild(s);
  };
  tryShow();
}
window.__BANNER = (name, quote) => {
  // never stack banners, and never cover full-screen result/story screens;
  // the tribunal timer owns that screen region (the offer got its own staging)
  if (G.phase === 'tribunal') return;
  if (ui().querySelector('.screen, .fullstory, .death-screen')) return;
  ui().querySelectorAll('.top-note').forEach(x => x.remove());
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
  STORY.reaper.execute.forEach((tx, k) => {
    const d = el('div', 'death-line fade-in', tx);
    d.style.cssText = `font-size:14px;opacity:.75;animation-delay:${0.2 + k * 0.5}s;animation-fill-mode:both;`;
    s.appendChild(d);
  });
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
  if (!sum.victory && sum.deathBy) {
    const rec = el('div', 'sc-note', `殁于${AREAS[sum.area] ? AREAS[sum.area].name : '灰烬'} · 死因：${sum.deathBy}`);
    rec.style.color = '#8E1F2F';
    s.appendChild(rec);
  }
  s.appendChild(el('div', 'divider'));
  const t = el('table', 'stat-table');
  const int = v => String(Math.round(v));
  const rows = [
    ['存活时间', sum.time, fmtTime], ['等级', sum.level, int], ['击杀', sum.kills, fmt],
    ['精英击杀', sum.elite, int], ['Boss击杀', sum.boss, int], ['总伤害', sum.dmg, fmt],
    ['承受伤害', sum.taken, fmt], ['神器', sum.artifacts, int], ['创世禁器', sum.forbidden, int],
    ['拾得告解', sum.confessions, int],
  ];
  const cells = [];
  for (const [k, v, f] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${k}</td><td></td>`;
    t.appendChild(tr);
    cells.push([tr.lastElementChild, +v || 0, f]);
  }
  s.appendChild(t);
  // numbers roll 0 → final over ~500ms (eased); cells hold the true value at the end
  const t0 = performance.now();
  const roll = (now) => {
    const k = Math.min(1, (now - t0) / 500);
    const e = 1 - Math.pow(1 - k, 3);
    for (const [td, v, f] of cells) td.textContent = f(v * e);
    if (k < 1 && t.isConnected) requestAnimationFrame(roll);
  };
  requestAnimationFrame(roll);
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
  // gain lines stagger in one after another
  [...s.querySelectorAll('.gain-list')].forEach((gl, i) => { gl.style.animationDelay = (0.3 + i * 0.14) + 's'; });
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
