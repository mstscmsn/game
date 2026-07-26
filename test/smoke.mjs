// Headless smoke test: boot → menu → start a run → simulate play → screenshots.
// Usage: node test/smoke.mjs [--long]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import { spawn } from 'child_process';

const PORT = 8123;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));

mkdirSync('test/shots', { recursive: true });
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test/shots/01-menu.png' });

  // start a run directly via dev hook
  await page.evaluate(() => {
    document.getElementById('ui-root').innerHTML = '';
    window.__startRun({ charId: 'adric', difficulty: 'pilgrim', sinMarks: 0, mode: 'pilgrimage', areaId: 'ashfield' });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test/shots/02-run-start.png' });

  // simulate movement + auto-pick level ups for N sim-seconds
  const simMinutes = process.argv.includes('--long') ? 24 : 3;
  for (let i = 0; i < simMinutes * 6; i++) {  // steps of ~10s sim
    await page.evaluate(() => {
      const G = window.__G;
      // auto-click any level-up card / ceremony
      const card = document.querySelector('#levelup-ui .upcard, #ceremony-ui .skipbar');
      if (card) card.click();
      const death = document.querySelector('.death-btn.wing');
      if (death) death.click();
      const anyBtn = document.querySelector('#throne-ui .btn.primary');
      if (anyBtn) anyBtn.click();
      // random movement via keyboard-less direct input
      const I = window.__INPUT;
      if (I) { const a = Math.random() * 6.28; I.mx = Math.cos(a); I.my = Math.sin(a); I.moving = true; I.lastDir.x = I.mx; I.lastDir.y = I.my; }
    });
    // accelerate: run G.time forward is implicit; just wait real time
    await page.waitForTimeout(320);
    // jump game clock to speed simulation (dev only)
    await page.evaluate(() => { const G = window.__G; if (G.active && (G.phase === 'play')) G.time += 9; });
  }
  await page.screenshot({ path: 'test/shots/03-mid-run.png' });

  const state = await page.evaluate(() => {
    const G = window.__G;
    return { phase: G.phase, time: Math.round(G.time), area: G.areaId, kills: G.kills, level: G.player ? G.player.level : 0, hp: G.player ? Math.round(G.player.hp) : 0, enemies: G.enemies.length, active: G.active, executed: G.executed };
  });
  console.log('STATE:', JSON.stringify(state));
  await page.screenshot({ path: 'test/shots/04-final.png' });
} catch (e) {
  errors.push('TEST: ' + e.message);
}

console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 30).join('\n') : 'NO ERRORS');
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
