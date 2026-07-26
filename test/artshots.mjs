// Art-review screenshot suite: characters, hordes, bosses, UI screens.
// Usage: node test/artshots.mjs <outdir=test/artshots>
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';

const OUT = process.argv[2] || 'test/artshots';
const PORT = 8129;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(1000);
const snap = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// 1) main menu
await snap('01-menu');

// helper: fresh run
const run = (charId, areaId) => page.evaluate(({ charId, areaId }) => {
  document.getElementById('ui-root').innerHTML = '';
  window.__startRun({ charId, difficulty: 'pilgrim', sinMarks: 0, mode: 'chapter', areaId });
}, { charId, areaId });

// 2) char walk portraits in ashfield (move right for gait frames)
for (const c of ['adric', 'evlann', 'samuel', 'vielna']) {
  await run(c, 'ashfield');
  await page.waitForTimeout(400);
  await page.evaluate(() => { const I = window.__INPUT; I.mx = 1; I.my = 0; I.moving = true; I.lastDir.x = 1; });
  await page.waitForTimeout(700);
  await snap(`02-char-${c}`);
}

// 3) dense horde + spawn emerge (ashfield)
await run('adric', 'ashfield');
await page.waitForTimeout(300);
await page.evaluate(() => {
  const G = window.__G;
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.28, d = 90 + Math.random() * 260;
    window.__SPAWN(['shroudman', 'gravehound', 'bonecrow', 'diggermonk', 'waxbride'][i % 5], G.player.x + Math.cos(a) * d, G.player.y + Math.sin(a) * d, i % 12 === 0);
  }
});
await page.waitForTimeout(250);
await snap('03-horde-emerge');
await page.waitForTimeout(900);
await snap('04-horde-settled');

// 4) cathedral + bells enemies
for (const [area, types] of [['cathedral', ['waxchoir', 'blindnun', 'praycentipede', 'bellpenitent']], ['bells', ['drownedsoldier', 'facelesssailor', 'belltonguegiant', 'coffinhunter']], ['hell', ['ironflowersoldier', 'furnacewalker', 'hellhound', 'umbilcarrier']], ['fakeheaven', ['cherub', 'falselamb', 'shepherdpuppet', 'smilewalker']]]) {
  await run('evlann', area);
  await page.waitForTimeout(350);
  await page.evaluate((types) => {
    const G = window.__G;
    types.forEach((t, i) => {
      for (let k = 0; k < 6; k++) {
        const a = i / types.length * 6.28 + k * 0.2, d = 120 + k * 40;
        window.__SPAWN(t, G.player.x + Math.cos(a) * d, G.player.y + Math.sin(a) * d, k === 5);
      }
    });
  }, types);
  await page.waitForTimeout(800);
  await snap(`05-${area}`);
}

// 5) bosses: entrance + settled + threat frame
for (const [area, boss] of [['ashfield', 'anlo'], ['bells', 'whale'], ['trueheaven', 'mother']]) {
  await run('adric', area);
  await page.waitForTimeout(350);
  await page.evaluate(() => { const G = window.__G; G.time = G.areaEnteredAt + 301; });
  await page.waitForTimeout(450);
  await snap(`06-boss-${boss}-enter`);
  await page.waitForTimeout(1600);
  await snap(`06-boss-${boss}`);
}

// 6) level-up cards
await run('adric', 'ashfield');
await page.waitForTimeout(300);
await page.evaluate(() => { const G = window.__G; G.levelupQueue = 1; });
await page.waitForTimeout(600);
await snap('07-levelup');

// 7) hub + codex(icons)
await page.evaluate(() => { const G = window.__G; window.__ENDRUN(true, '测试'); });
await page.waitForTimeout(500);
await page.evaluate(() => { document.getElementById('ui-root').innerHTML = ''; window.__CODEX(); });
await page.waitForTimeout(400);
await snap('08-codex-icons');

console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 10).join('\n') : 'NO ERRORS');
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
