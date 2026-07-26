// Targeted scenario tests: margola & lambking AI, whitedream ending,
// hellking throne, chapter hunt, endless mode affixes.
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
const PORT = 8127;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(700);

async function fresh(mode, areaId, charId = 'adric') {
  await page.evaluate(([m, a, c]) => {
    document.getElementById('ui-root').innerHTML = '';
    window.__startRun({ charId: c, difficulty: 'pilgrim', sinMarks: 0, mode: m, areaId: a });
    window.__G.player.xpNeed = 1e12;
  }, [mode, areaId, charId]);
  await page.waitForTimeout(250);
}

// 1) margola full fight with womb gating
await fresh('chapter', 'hell');
const marg = await page.evaluate(async () => {
  const G = window.__G;
  const m = await import('./game.js').catch(() => null);
  G.time = 600; // trigger boss via chapter rule needs 600
  await new Promise(r => setTimeout(r, 700));
  const log = [];
  for (let i = 0; i < 30; i++) {
    if (!G.boss) break;
    G.boss.hp -= G.boss.maxHp * 0.06;
    // record gating
    log.push({ gated: G.boss.gated, wombs: G.boss.wombs.filter(w => !w.dead).length, phase: G.boss.phase });
    // kill wombs to test gate release
    for (const w of G.boss.wombs) if (!w.dead) w.hp = 0;
    await new Promise(r => setTimeout(r, 300));
  }
  return { killed: !G.boss, sample: log.slice(0, 4), bossKills: G.bossKills };
});
console.log('margola:', JSON.stringify(marg));

// 2) lambking phases
await fresh('chapter', 'fakeheaven');
const lamb = await page.evaluate(async () => {
  const G = window.__G;
  G.time = 600;
  await new Promise(r => setTimeout(r, 700));
  const phases = new Set();
  for (let i = 0; i < 25 && G.boss; i++) {
    phases.add(G.boss.phase);
    G.boss.hp -= G.boss.maxHp * 0.08;
    await new Promise(r => setTimeout(r, 250));
  }
  return { killed: !G.boss, phases: [...phases], eprojs: G.eprojs.length };
});
console.log('lambking:', JSON.stringify(lamb));

// 3) whitedream: obedience 100
await fresh('pilgrimage', 'ashfield');
const wd = await page.evaluate(async () => {
  const G = window.__G;
  G.executed = true; G.revived = true; G.time = 1900;
  const m = await import('./game.js').catch(() => null);
  // force enter fakeheaven via flow
  window.__G.obedience = 0;
  const flowEnter = () => { G.areaId = 'fakeheaven'; };
  return new Promise(res => {
    const iv = setInterval(() => {
      if (G.areaId !== 'fakeheaven' && G.phase === 'play') { G.time = Math.max(G.time, 1900); }
      if (G.areaId === 'fakeheaven') { G.obedience = 99.9; }
      const fs = document.querySelector('.fullstory');
      if (fs) fs.click();
      if (G.ended || !G.active) { clearInterval(iv); res({ ended: G.ended, ending: G.endingId }); }
    }, 300);
    setTimeout(() => { clearInterval(iv); res({ timeout: true, area: G.areaId, ob: G.obedience, phase: G.phase }); }, 15000);
  });
});
console.log('whitedream:', JSON.stringify(wd));

// 4) hellking throne
await page.waitForTimeout(400);
await page.evaluate(() => { document.getElementById('ui-root').innerHTML = ''; });
await fresh('pilgrimage', 'ashfield');
const hk = await page.evaluate(async () => {
  const G = window.__G;
  G.executed = true; G.revived = true; G.time = 1700;
  const flow = null;
  // enter hell then kill margola
  return new Promise(res => {
    let sat = false;
    const iv = setInterval(() => {
      if (G.areaId !== 'hell' && G.phase === 'play' && !G.ended) G.time = Math.max(G.time, 1740);
      if (G.boss && G.boss.id === 'margola') { for (const w of G.boss.wombs) if (!w.dead) w.hp = 0; G.boss.hp -= G.boss.maxHp * 0.2; }
      const sit = document.querySelector('#throne-ui .btn:not(.primary)');
      if (sit && !sat) { sat = true; sit.click(); }
      const fs = document.querySelector('.fullstory');
      if (fs) fs.click();
      if (G.ended || !G.active) { clearInterval(iv); res({ ended: G.ended, ending: G.endingId }); }
    }, 300);
    setTimeout(() => { clearInterval(iv); res({ timeout: true, area: G.areaId, phase: G.phase, boss: G.boss && G.boss.id }); }, 20000);
  });
});
console.log('hellking:', JSON.stringify(hk));

// 5) endless mode: loops + affixes + eternal choice
await page.evaluate(() => { document.getElementById('ui-root').innerHTML = ''; });
await fresh('endless', 'corpsesea');
const el = await page.evaluate(async () => {
  const G = window.__G;
  G.time = 479;
  await new Promise(r => setTimeout(r, 1500));
  const hadChoice = !!document.querySelector('#levelup-ui');
  const card = document.querySelector('#levelup-ui .upcard');
  if (card) card.click();
  await new Promise(r => setTimeout(r, 400));
  G.time = 959;
  await new Promise(r => setTimeout(r, 1500));
  const card2 = document.querySelector('#levelup-ui .upcard');
  if (card2) card2.click();
  return { loop: G.loopN, affixes: G.affixes, eternalChoice: hadChoice, phase: G.phase };
});
console.log('endless:', JSON.stringify(el));

console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'NO PAGE ERRORS');
await browser.close();
server.kill();
