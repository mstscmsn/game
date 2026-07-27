// Realistic-pace balance test at 6x time scale: a greedy bot plays the first
// 21 minutes. Verifies docs acceptance line #1: at least one artifact should
// form before the death knell under normal luck.
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
const PORT = 8132;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(700);
await page.evaluate(() => {
  // simulate a 3rd run: some meta progression
  const M = window.__META;
  M.runs = 2;
  M.nodes = { w_dmg: 3, f_hp: 3, m_xp: 2, m_pickup: 2, w_fusehint: 1 };
  document.getElementById('ui-root').innerHTML = '';
  window.__startRun({ charId: 'adric', difficulty: 'pilgrim', sinMarks: 0, mode: 'pilgrimage', areaId: 'ashfield' });
  window.__G.timeScale = 6;
});

// install an in-page bot running at 50ms so its reaction time is fair at 6x
await page.evaluate(() => {
  window.__BOT = setInterval(() => {
    const G = window.__G;
    if (!G.active || !G.player) return;
    const p = G.player;
    const cards = [...document.querySelectorAll('#levelup-ui .upcard')];
    if (cards.length) {
      const pick = cards.find(c => c.textContent.includes('忏悔锁链'))
        || cards.find(c => c.textContent.includes('铁玫瑰经'))
        || cards.find(c => c.querySelector('.tag') && c.querySelector('.tag').textContent === '武器')
        || cards[0];
      pick.click();
    }
    const cer = document.querySelector('#ceremony-ui .skipbar');
    if (cer) cer.click();
    if (G.phase !== 'play') return;
    const I = window.__INPUT;
    // human-like play: circle-strafe around the horde centroid, flee close
    // threats hard, drift toward gems when safe
    let cx = 0, cy = 0, n = 0, near = 0, fleeX = 0, fleeY = 0;
    for (const e of G.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < 420 * 420) { cx += e.x; cy += e.y; n++; }
      if (d2 < 130 * 130) { near++; const d = Math.sqrt(d2) || 1; fleeX -= dx / d; fleeY -= dy / d; }
    }
    // dodge incoming shots sideways (humans read the slow red orbs easily)
    let dodgeShot = false;
    for (const pr of G.eprojs) {
      const dx = p.x - pr.x, dy = p.y - pr.y, d2 = dx * dx + dy * dy;
      if (d2 < 160 * 160) {
        const vd = Math.hypot(pr.vx, pr.vy) || 1;
        const dot = (pr.vx * dx + pr.vy * dy) / vd / (Math.sqrt(d2) || 1);
        if (dot > 0.7) { fleeX += -pr.vy / vd * 2.5; fleeY += pr.vx / vd * 2.5; dodgeShot = true; }
      }
    }
    let mx = 0, my = 0;
    if (near > 0 || dodgeShot) { mx = fleeX; my = fleeY; }
    else if (n > 0) {
      const ax = cx / n - p.x, ay = cy / n - p.y;
      const ad = Math.hypot(ax, ay) || 1;
      // strafe perpendicular, keep ~180px from centroid
      const tangX = -ay / ad, tangY = ax / ad;
      const radX = ad > 200 ? ax / ad * 0.4 : -ax / ad * 0.8;
      const radY = ad > 200 ? ay / ad * 0.4 : -ay / ad * 0.8;
      mx = tangX + radX; my = tangY + radY;
      // gem greed when safe
      let g = null, gd = 240 * 240;
      for (const k of G.pickups) {
        if (k.type !== 'gem') continue;
        const d2 = (k.x - p.x) ** 2 + (k.y - p.y) ** 2;
        if (d2 < gd) { gd = d2; g = k; }
      }
      if (g) { const d = Math.sqrt(gd) || 1; mx += (g.x - p.x) / d * 0.8; my += (g.y - p.y) / d * 0.8; }
    } else { mx = Math.cos(G.time * 0.4); my = Math.sin(G.time * 0.4); }
    const mm = Math.hypot(mx, my) || 1;
    I.mx = mx / mm; I.my = my / mm;
    I.moving = true; I.lastDir.x = I.mx; I.lastDir.y = I.my;
    if (p.dodgeCharges > 0 && near > 3) I.dodge = true;
    if (p.sin.charge >= p.sin.need) I.skill = true;
  }, 50);
});
let last = {};
for (let i = 0; i < 320; i++) {
  const st = await page.evaluate(() => {
    const G = window.__G, p = G.player;
    return {
      t: Math.round(G.time), lvl: p ? p.level : 0, hp: p ? Math.round(p.hp) : 0, kills: G.kills,
      weapons: p ? p.weapons.map(w => `${w.id}:${w.lv}${w.evolved ? 'A' : ''}`).join(',') : '',
      cats: p ? p.catalysts.map(c => `${c.id}:${c.lv}`).join(',') : '',
      arts: p ? p.weapons.filter(w => w.evolved).length : 0,
      ash: G.runResources ? G.runResources.ash : 0,
      phase: G.phase, active: G.active, boss: G.boss ? G.boss.id : null,
    };
  });
  last = st;
  if (st.phase === 'reaper' || st.phase === 'deathchoice' || !st.active) break;
  if (i % 40 === 0) console.log(JSON.stringify(st));
  await page.waitForTimeout(700);
}
console.log('LAST:', JSON.stringify(last));
console.log('ARTIFACT_BEFORE_KNELL:', last.arts > 0 ? 'PASS' : 'FAIL');
// economy guard: ≥1 node per run for the first 10 runs needs roughly 60 ash/min
const ashPerMin = last.t > 0 ? last.ash / (last.t / 60) : 0;
console.log('ASH:', last.ash || 0, 'ASH_PER_MIN:', Math.round(ashPerMin));
console.log('ASH_RATE_OK:', ashPerMin >= 60 ? 'PASS' : 'FAIL');
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 10).join('\n') : 'NO PAGE ERRORS');
await browser.close();
server.kill();
