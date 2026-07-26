// Full pilgrimage flow test: forces the clock forward and boss kills to
// exercise every phase: knell → reaper → tribunal → hell → fakeheaven →
// trueheaven → mother → final choice → ending → results.
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';

const PORT = 8125;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
mkdirSync('test/shots', { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errors.push('CONSOLE: ' + m.text()); });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.evaluate(() => {
  document.getElementById('ui-root').innerHTML = '';
  window.__startRun({ charId: 'evlann', difficulty: 'pilgrim', sinMarks: 0, mode: 'pilgrimage', areaId: 'ashfield' });
});

const log = [];
let shots = 0;
const snap = async (name) => { await page.screenshot({ path: `test/shots/f${String(++shots).padStart(2, '0')}-${name}.png` }); };

async function driveTick() {
  return await page.evaluate(() => {
    const G = window.__G;
    // click through any UI
    const sels = ['#levelup-ui .upcard', '#ceremony-ui .skipbar', '.cards-wrap .skipbar', '#throne-ui .btn.primary'];
    for (const s of sels) { const el = document.querySelector(s); if (el) { el.click(); break; } }
    // death choice → challenge
    const wing = document.querySelector('.death-btn.wing');
    if (wing) wing.click();
    // final choice: pick 'enter' (第八日) — last button
    const fc = [...document.querySelectorAll('.cards-wrap .btn')];
    if (fc.length === 4 && G.phase === 'finalchoice') fc[3].click();
    // ending roll → click through
    const fs = document.querySelector('.fullstory');
    if (fs) fs.click();
    // movement
    const I = window.__INPUT;
    const a = Math.random() * 6.28;
    I.mx = Math.cos(a); I.my = Math.sin(a); I.moving = true; I.lastDir.x = I.mx; I.lastDir.y = I.my;
    // keep player alive for flow testing & melt bosses
    if (G.player && G.player.hp < G.player.S.maxHp * 0.5) G.player.hp = G.player.S.maxHp;
    if (G.boss && !G.boss.dead) G.boss.hp -= G.boss.maxHp * 0.1;
    return { phase: G.phase, t: Math.round(G.time), area: G.areaId, active: G.active, boss: G.boss ? G.boss.id : null, ob: Math.round(G.obedience), ended: G.ended };
  });
}

async function jumpTo(target) {
  await page.evaluate((tt) => { const G = window.__G; if (G.active && G.phase === 'play' && G.time < tt) G.time = tt; }, target);
}

let lastPhase = '';
for (let i = 0; i < 400; i++) {
  const st = await driveTick();
  if (!st.active && st.phase !== 'reaper') break;
  if (st.phase !== lastPhase || i % 40 === 0) {
    log.push(`${i}: ${JSON.stringify(st)}`);
    lastPhase = st.phase;
    if (['reaper', 'deathchoice', 'tribunal', 'finalchoice', 'ending'].includes(st.phase)) await snap(st.phase);
    if (st.area && ['hell', 'fakeheaven', 'trueheaven'].includes(st.area) && st.phase === 'play') await snap(st.area);
  }
  await page.waitForTimeout(230);
  // schedule time jumps by current area to reach each milestone quickly.
  // only advance past a boss window after that boss has actually died (bossKills grows).
  if (st.phase === 'play') {
    const bk = await page.evaluate(() => window.__G.bossKills);
    if (st.area === 'ashfield') { if (st.t < 355) await jumpTo(355); else if (bk >= 1 && !st.boss) await jumpTo(430); }
    else if (st.area === 'cathedral') { if (st.t < 775) await jumpTo(775); else if (bk >= 2 && !st.boss) await jumpTo(850); }
    else if (st.area === 'bells') { if (st.t < 1195) await jumpTo(1195); else if (bk >= 3 && !st.boss) await jumpTo(1262); }
    else if (st.area === 'hell') { if (st.t < 1735) await jumpTo(1735); else if (!st.boss) await jumpTo(1805); }
    else if (st.area === 'fakeheaven') { if (st.t < 2215) await jumpTo(2215); else if (!st.boss) await jumpTo(2290); }
    else if (st.area === 'trueheaven') { if (st.t < 2645) await jumpTo(2645); }
  }
}
const final = await page.evaluate(() => {
  const G = window.__G; const M = window.__META;
  return {
    active: G.active, phase: G.phase, ended: G.ended, endingId: G.endingId,
    kills: G.kills, bossKills: G.bossKills, tribunalWon: G.tribunalWon,
    endings: M.endings, runs: M.runs, res: M.res,
    resultsShown: !!document.querySelector('.stat-table'),
  };
});
console.log(log.join('\n'));
console.log('FINAL:', JSON.stringify(final, null, 1));
await snap('end');
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'NO ERRORS');
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
