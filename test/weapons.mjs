// Exhaustive weapon/artifact/forbidden/sin-skill test.
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
const PORT = 8126;
const server = spawn('node', ['server.mjs', String(PORT), 'dist'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 405, height: 880 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(800);

const WEAPONS = ['saw', 'bell', 'spear', 'scripture', 'censer', 'lantern', 'chain', 'chalice', 'raven', 'mirrorw', 'wingblade', 'musket', 'bow', 'wheel', 'dagger', 'harp'];
const CHARS = ['adric', 'evlann', 'hemer', 'corlan', 'vielna', 'samuel', 'mina', 'voll', 'rahshiel', 'noin'];
const FORBIDDEN = ['blacksun', 'ninthbell', 'crimsonfeast', 'skypiercer', 'confessroom', 'starfuneral'];

async function freshRun(charId) {
  await page.evaluate((cid) => {
    document.getElementById('ui-root').innerHTML = '';
    window.__startRun({ charId: cid, difficulty: 'pilgrim', sinMarks: 0, mode: 'chapter', areaId: 'ashfield' });
    const G = window.__G;
    // surround with enemies
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * 6.28;
      window.__SPAWN('shroudman', G.player.x + Math.cos(a) * (80 + (i % 4) * 60), G.player.y + Math.sin(a) * (80 + (i % 4) * 60), i % 8 === 0);
    }
  }, charId);
  await page.evaluate(() => {
    const G = window.__G;
    G.player.xpNeed = 1e12;      // suppress level-up modal during measurements
    G.levelupQueue = 0;
    const card = document.querySelector('#levelup-ui');
    if (card) card.remove();
    G.phase = 'play';
  });
  await page.waitForTimeout(300);
}

// 1) each weapon base + evolved
for (const wid of WEAPONS) {
  await freshRun('adric');
  const r = await page.evaluate(async (wid) => {
    const G = window.__G;
    const ring = () => {
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * 6.28;
        const e = window.__SPAWN('shroudman', G.player.x + Math.cos(a) * (70 + (i % 4) * 50), G.player.y + Math.sin(a) * (70 + (i % 4) * 50), false);
        if (e) e.spawning = 0;
      }
    };
    G.player.weapons = [{ id: wid, lv: 8, evolved: false, cd: 0, st: {} }];
    ring();
    await new Promise(r => setTimeout(r, 400));
    const d0 = G.dmgDealt;
    await new Promise(r => setTimeout(r, 3200));
    const base = G.dmgDealt - d0;
    G.player.weapons[0].evolved = true;
    G.player.weapons[0].cd = 0;
    ring();
    await new Promise(r => setTimeout(r, 400));
    const d1 = G.dmgDealt;
    await new Promise(r => setTimeout(r, 3200));
    return { base, evo: G.dmgDealt - d1, enemies: G.enemies.length };
  }, wid);
  const ok = r.base > 0 && (r.evo > 0 || r.enemies === 0);
  console.log(`${ok ? 'OK ' : 'FAIL'} ${wid}: base=${r.base} evo=${r.evo} enemies=${r.enemies}`);
}

// 2) mirror weapon needs a partner
await freshRun('adric');
const mr = await page.evaluate(async () => {
  const G = window.__G;
  G.player.weapons = [{ id: 'saw', lv: 4, evolved: false, cd: 0, st: {} }, { id: 'mirrorw', lv: 8, evolved: true, cd: 0, st: {} }];
  const d0 = G.dmgDealt;
  await new Promise(r => setTimeout(r, 2500));
  return G.dmgDealt - d0;
});
console.log(`${mr > 0 ? 'OK ' : 'FAIL'} mirror+saw combo dmg=${mr}`);

// 3) forbidden weapons
for (const fid of FORBIDDEN) {
  await freshRun('adric');
  const r = await page.evaluate(async (fid) => {
    const G = window.__G;
    G.player.weapons = [{ id: 'saw', lv: 8, evolved: true, cd: 0, st: {} }];
    G.player.forbidden = [fid];
    G.player.fbState = {};
    if (fid === 'starfuneral') { G.kills = 0; }
    const d0 = G.dmgDealt;
    // force quick cooldowns
    await new Promise(r => setTimeout(r, 600));
    for (const k of Object.keys(G.player.fbState)) G.player.fbState[k].cd = 0.01;
    if (fid === 'starfuneral') { G.player.fbState[fid] = G.player.fbState[fid] || { satellites: 0, killBase: -700 }; G.player.fbState[fid].killBase = G.kills - 700; }
    await new Promise(r => setTimeout(r, 2500));
    return { dmg: G.dmgDealt - d0 };
  }, fid);
  console.log(`${r.dmg > 0 ? 'OK ' : 'FAIL'} forbidden ${fid}: dmg=${r.dmg}`);
}

// 4) each character's sin skill
for (const cid of CHARS) {
  await freshRun(cid);
  const r = await page.evaluate(async () => {
    const G = window.__G;
    const p = G.player;
    p.sin.charge = p.sin.need;
    window.__ACTS = {};
    const before = G.dmgDealt;
    const mod = await import('./game.js').catch(() => null);
    // trigger via input flag
    window.__INPUT.skill = true;
    await new Promise(r => setTimeout(r, 2200));
    return { cast: p.sin.charge < p.sin.need || p.sin.active > 0 || G.dmgDealt > before, dmg: G.dmgDealt - before };
  });
  console.log(`${r.cast ? 'OK ' : 'FAIL'} sin ${cid}: dmg=${r.dmg}`);
}

console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n') : 'NO PAGE ERRORS');
await browser.close();
server.kill();
process.exit(0);
