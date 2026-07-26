import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
const PORT = 8124;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.evaluate(() => {
  document.getElementById('ui-root').innerHTML = '';
  window.__startRun({ charId: 'adric', difficulty: 'pilgrim', sinMarks: 0, mode: 'pilgrimage', areaId: 'ashfield' });
});
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1000);
  const d = await page.evaluate(() => {
    const G = window.__G;
    const card = document.querySelector('#levelup-ui .upcard');
    if (card) card.click();
    const near = G.enemies.filter(e => Math.hypot(e.x - G.player.x, e.y - G.player.y) < 200).length;
    return {
      t: Math.round(G.time), kills: G.kills, dmg: Math.round(G.dmgDealt), projs: G.projs.length,
      enemies: G.enemies.length, near, hp: Math.round(G.player.hp), lvl: G.player.level,
      wcd: G.player.weapons.map(w => w.id + ':' + w.cd.toFixed(2)).join(','),
      parts: G.parts.length,
    };
  });
  console.log(JSON.stringify(d));
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n---\n') : 'NO PAGE ERRORS');
await browser.close();
server.kill();
