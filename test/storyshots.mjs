// v1.3 story-surface screenshots: codex archive, tribunal staging, gift choice,
// saint ritual, death recap, new endings.
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';

const PORT = 8127;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
mkdirSync('test/shots', { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(900);

// seed some collected confessions so the archive has content
await page.evaluate(() => {
  const M = window.__META;
  M.confessionsFound.push('c01', 'c03', 'c04', 's1', 'c13', 'c25', 's2');
  M.saintConfessions.push('s1', 's2');
  M.runs = 3;
  M.lastDeathBy = '碑口吞灵者';
});

// 1) codex confession archive
await page.evaluate(() => { document.getElementById('ui-root').innerHTML = ''; window.__CODEX(); });
await page.waitForTimeout(300);
await page.evaluate(() => { const s = document.querySelector('.saint-seal.got'); if (s) s.click(); });
await page.evaluate(() => { const r = document.querySelector('.saint-row'); if (r) r.scrollIntoView({ block: 'center' }); });
await page.waitForTimeout(200);
await page.screenshot({ path: 'test/shots/s01-codex-archive.png' });
await page.evaluate(() => { const i = document.querySelector('.conf-item.found'); if (i) { i.click(); i.scrollIntoView({ block: 'center' }); } });
await page.waitForTimeout(200);
await page.screenshot({ path: 'test/shots/s02-codex-conflist.png' });

// 2) tribunal staging (storyRoll of the offer)
await page.evaluate(() => {
  document.getElementById('ui-root').innerHTML = '';
  window.__startRun({ charId: 'adric', difficulty: 'pilgrim', sinMarks: 0, mode: 'pilgrimage', areaId: 'ashfield' });
});
await page.waitForTimeout(600);
await page.evaluate(() => window.__TRIBUNAL && window.__TRIBUNAL());
await page.waitForTimeout(4600);
await page.screenshot({ path: 'test/shots/s03-tribunal-staging.png' });
// click through to the fight
for (let i = 0; i < 8; i++) { await page.evaluate(() => { const fs = document.querySelector('.fullstory'); if (fs) fs.click(); }); await page.waitForTimeout(150); }
await page.waitForTimeout(800);
await page.screenshot({ path: 'test/shots/s04-tribunal-fight.png' });

// 3) gift choice modal
await page.evaluate(() => {
  document.getElementById('ui-root').innerHTML = '';
  window.__startRun({ charId: 'adric', difficulty: 'pilgrim', sinMarks: 0, mode: 'pilgrimage', areaId: 'ashfield' });
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const G = window.__G;
  G.executed = true; G.revived = true;
  window.__enterArea('fakeheaven');
  G.pickups.push({ type: 'gift', x: G.player.x, y: G.player.y, t: 0, life: 12 });
});
await page.waitForTimeout(700);
await page.screenshot({ path: 'test/shots/s05-gift-choice.png' });
await page.evaluate(() => { const b = document.querySelector('.cards-wrap .btn.primary'); if (b) b.click(); });

// 4) saint confession ritual
await page.evaluate(() => {
  const G = window.__G;
  const c = { id: 's3', title: '圣徒告解·封钟', area: 'bells', text: '七钟是我铸的封印，封住黑日残存的呼唤。每逢深夜它低声唤孩子们回家，钟声就替我们盖过去。我封住的，是唯一的退路。' };
  G.pickups.push({ type: 'confession', conf: c, x: G.player.x, y: G.player.y, t: 0, life: 9999 });
});
await page.waitForTimeout(900);
await page.screenshot({ path: 'test/shots/s06-saint-ritual.png' });
await page.evaluate(() => { const b = document.querySelector('.cards-wrap .btn.primary'); if (b) b.click(); });

// 5) death recap on results
await page.evaluate(() => {
  const G = window.__G;
  G.lastHitBy = '腐香主教·米弥';
  window.__ENDRUN && window.__ENDRUN(false, '死亡');
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'test/shots/s07-results-recap.png' });

const state = await page.evaluate(() => ({
  results: !!document.querySelector('.stat-table'),
}));
console.log('STATE:', JSON.stringify(state));
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 10).join('\n') : 'NO ERRORS');
await browser.close();
server.kill();
