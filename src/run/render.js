// World + HUD rendering on canvas.
import { G } from './state.js';
import { view, beginWorld, endWorld, beginUI, endUI } from '../engine.js';
import { AREA_BG } from '../art/backgrounds.js';
import { SPRITES, variant } from '../art/sprites.js';
import { icon, iconEvolved } from '../art/icons.js';
import { WEAPON_BY_ID } from '../data/weapons.js';
import { input } from '../input.js';
import { fmt, fmtTime, TAU, clamp } from '../core/util.js';
import { BAL } from '../data/balance.js';

const tintCache = new Map();
function sprOf(e) {
  const base = SPRITES.enemies[e.def.sprite];
  if (!base) return null;
  let c = base;
  if (e.def.tint) {
    const key = e.def.sprite + ':' + e.def.tint;
    if (!tintCache.has(key)) tintCache.set(key, variant(base, { tint: e.def.tint, tintAlpha: 0.5 }));
    c = tintCache.get(key);
  }
  if (G.blackSunT > 0) {
    const key = 'w:' + e.def.sprite;
    if (!tintCache.has(key)) tintCache.set(key, variant(base, { tint: '#EEEBDD', tintAlpha: 0.95 }));
    c = tintCache.get(key);
  }
  return c;
}

export function render(ctx) {
  const p = G.player;
  if (!p) return;
  // camera
  view.camX = p.x; view.camY = p.y - 40;
  // clear
  ctx.fillStyle = '#0B0A0C';
  ctx.fillRect(0, 0, view.canvas.width, view.canvas.height);
  beginWorld(ctx);
  drawBackground(ctx);
  drawZones(ctx);
  drawPickups(ctx);
  drawObstacles(ctx);
  drawEnemies(ctx);
  drawBoss(ctx);
  drawReaper(ctx);
  drawPlayer(ctx, p);
  drawProjectiles(ctx);
  drawParticles(ctx);
  drawNums(ctx);
  endWorld(ctx);
  drawOverlays(ctx);
  drawHUD(ctx, p);
}

/* ---------------- background ---------------- */
function drawBackground(ctx) {
  const bg = AREA_BG[G.area ? G.area.bg : 'ashfield'];
  if (!bg) return;
  const T = 384;
  const x0 = Math.floor((view.camX - view.w / 2) / T) * T;
  const y0 = Math.floor((view.camY - view.h / 2) / T) * T;
  for (let x = x0; x < view.camX + view.w / 2 + T; x += T)
    for (let y = y0; y < view.camY + view.h / 2 + T; y += T)
      ctx.drawImage(bg.tile, x, y);
  if (bg.tint) { ctx.fillStyle = bg.tint; ctx.fillRect(view.camX - view.w / 2, view.camY - view.h / 2, view.w, view.h); }
}

/* ---------------- entities ---------------- */
function drawObstacles(ctx) {
  for (const o of G.obstacles) {
    if (o.dead) continue;
    if (!inView(o.x, o.y, 40)) continue;
    if (o.kind === 'grave') {
      ctx.fillStyle = '#3a3230';
      ctx.fillRect(o.x - 10, o.y - 20, 20, 26);
      ctx.fillStyle = '#4d4638';
      ctx.fillRect(o.x - 7, o.y - 17, 14, 3);
    } else if (o.kind === 'tower') {
      ctx.fillStyle = '#1d2430';
      ctx.fillRect(o.x - 12, o.y - 30, 24, 36);
      ctx.fillStyle = '#2a3448';
      ctx.fillRect(o.x - 8, o.y - 26, 6, 8);
    } else {
      ctx.fillStyle = '#241d22';
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
    }
  }
  for (const pr of G.props) {
    if (!inView(pr.x, pr.y, pr.r + 20)) continue;
    if (pr.kind === 'light') {
      ctx.fillStyle = 'rgba(238,235,221,0.14)';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill();
    } else if (pr.kind === 'shadow') {
      ctx.fillStyle = 'rgba(11,10,12,0.4)';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill();
    } else if (pr.kind === 'trap') {
      ctx.strokeStyle = pr.armed ? '#D4474F' : '#5a5f66';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + (pr.armed ? G.time * 4 : 0);
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y);
        ctx.lineTo(pr.x + Math.cos(a) * pr.r, pr.y + Math.sin(a) * pr.r); ctx.stroke();
      }
    }
  }
}
function drawZones(ctx) {
  for (const z of G.zones) {
    if (!inView(z.x, z.y, z.r + 20)) continue;
    ctx.fillStyle = z.color || 'rgba(117,135,107,0.2)';
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
    if (z.hostile || z.warnOnly) {
      ctx.strokeStyle = 'rgba(212,71,79,0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      // colorblind assist: symbol
      if (window.SETTINGS?.colorAssist) { ctx.fillStyle = '#D4474F'; ctx.font = '14px serif'; ctx.fillText('✕', z.x - 5, z.y + 5); }
    }
    if (z.kind === 'cross') {
      ctx.strokeStyle = 'rgba(216,199,164,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(z.x - z.r, z.y); ctx.lineTo(z.x + z.r, z.y);
      ctx.moveTo(z.x, z.y - z.r); ctx.lineTo(z.x, z.y + z.r); ctx.stroke();
    }
  }
}
function drawPickups(ctx) {
  for (const k of G.pickups) {
    if (!inView(k.x, k.y, 24)) continue;
    const bob = Math.sin(G.time * 4 + k.x) * 2;
    let spr = null;
    if (k.type === 'gem') spr = SPRITES.misc['gem' + k.tier];
    else if (k.type === 'heart') spr = SPRITES.misc.heart;
    else if (k.type === 'soulheart') spr = SPRITES.misc.soulheart;
    else if (k.type === 'chest') spr = SPRITES.misc.chest;
    else if (k.type === 'candle') spr = SPRITES.misc.candle;
    else if (k.type === 'fruit') spr = SPRITES.misc.fruit;
    else if (k.type === 'confession') spr = SPRITES.misc.confession;
    else if (k.type === 'gift') spr = SPRITES.misc.chest;
    if (spr) {
      if (k.type === 'confession' || k.type === 'chest') {
        ctx.save();
        ctx.shadowColor = '#B58D3B'; ctx.shadowBlur = 8;
        ctx.drawImage(spr, k.x - spr.width / 2, k.y - spr.height / 2 + bob);
        ctx.restore();
      } else ctx.drawImage(spr, k.x - spr.width / 2, k.y - spr.height / 2 + bob);
    }
  }
}
function drawEnemies(ctx) {
  for (const e of G.enemies) {
    if (e.dead || !inView(e.x, e.y, 60)) continue;
    const spr = sprOf(e);
    if (!spr) continue;
    const sc = (e.isElite ? 1.35 : 1);
    const w = spr.width * sc, h = spr.height * sc;
    const bob = e.spawning > 0 ? 0 : Math.sin(G.time * 6 + e.id) * 1.5;
    ctx.save();
    if (e.spawning > 0) ctx.globalAlpha = 1 - e.spawning / 0.4;
    if (e.hitT > 0) ctx.globalAlpha = 0.6;
    if (e.liftT > 0) ctx.translate(0, -(1 - e.liftT) * 40);
    const flip = e.vx < -1;
    ctx.translate(e.x, e.y + bob);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(spr, -w / 2, -h / 2, w, h);
    ctx.restore();
    // status pips
    if (e.st.bleed.s > 0) dot(ctx, e.x - 8, e.y - e.r - 6, '#D4474F');
    if (e.st.burn.t > 0) dot(ctx, e.x - 3, e.y - e.r - 6, '#c96b2f');
    if (e.st.rot.t > 0) dot(ctx, e.x + 2, e.y - e.r - 6, '#75876B');
    if (e.st.fear.t > 0) dot(ctx, e.x + 7, e.y - e.r - 6, '#7c5f8a');
    if (e.st.sin.s > 0) dot(ctx, e.x + 12, e.y - e.r - 6, '#B58D3B');
    // elite crown + hp bar
    if (e.isElite) {
      ctx.fillStyle = '#B58D3B';
      ctx.fillRect(e.x - 6, e.y - e.r - 16, 12, 3);
      ctx.fillRect(e.x - 4, e.y - e.r - 19, 2, 3); ctx.fillRect(e.x + 2, e.y - e.r - 19, 2, 3);
      bar(ctx, e.x - 16, e.y - e.r - 12, 32, 3, e.hp / e.maxHp, '#8E1F2F');
    }
    if (e.frozenT > 0) { ctx.strokeStyle = 'rgba(238,235,221,0.7)'; ctx.strokeRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2); }
  }
}
function drawBoss(ctx) {
  const b = G.boss;
  if (!b || b.dead || b.invisible) return;
  const spr = SPRITES.bosses[b.sprite];
  if (!spr) return;
  const bob = Math.sin(G.time * 2.4) * 3;
  ctx.save();
  ctx.translate(b.x, b.y + bob);
  if (b.invulnT > 0) ctx.globalAlpha = 0.5;
  if (G.player.x < b.x) ctx.scale(-1, 1);
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  ctx.restore();
  // rahshiel phase-3 halo
  if (b.id === 'rahshiel' && b.phase === 3) {
    ctx.strokeStyle = b.vulnT > 0 ? '#D4474F' : '#B58D3B';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, 70, b.haloA || 0, (b.haloA || 0) + 4.6); ctx.stroke();
    if (b.vulnT > 0) { ctx.fillStyle = 'rgba(212,71,79,0.85)'; ctx.beginPath(); ctx.arc(b.x, b.y - 70 * Math.sin(1), 8, 0, TAU); ctx.fill(); }
  }
}
function drawReaper(ctx) {
  const r = G.reaper;
  if (!r) return;
  const spr = SPRITES.bosses.finalis;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  if (r.phase === 'raise') {
    ctx.strokeStyle = '#0B0A0C';
    ctx.lineWidth = 6;
    const sw = r.t / 0.8;
    ctx.beginPath(); ctx.moveTo(0, -40);
    ctx.lineTo(Math.cos(-1.2 + sw * 2.2) * 90, -40 + Math.sin(-1.2 + sw * 2.2) * 90);
    ctx.stroke();
  }
  ctx.restore();
}
function drawPlayer(ctx, p) {
  const spr = SPRITES.chars[p.char.id];
  if (!spr) return;
  const bob = p.moving ? Math.sin(G.time * 10) * 1.6 : Math.sin(G.time * 2) * 0.8;
  // shield ring
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(70,96,138,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, TAU * Math.min(1, p.shield / (p.S.maxHp * 0.3))); ctx.stroke();
  }
  // dodge ghost
  if (p.dodging > 0) ctx.globalAlpha = 0.55;
  if (p.invT > 0 && ((G.time * 12) | 0) % 2 === 0) ctx.globalAlpha = 0.5;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  if (p.facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  ctx.restore();
  ctx.globalAlpha = 1;
  // adric coffin layers
  for (let i = 0; i < p.coffinLayers; i++) {
    ctx.strokeStyle = 'rgba(216,199,164,0.6)';
    ctx.strokeRect(p.x - 22 - i * 3, p.y - 26 - i * 3, 44 + i * 6, 52 + i * 6);
  }
  // mina ghosts
  for (let i = 0; i < p.ghosts; i++) {
    const a = G.time * 1.5 + i * TAU / 3;
    ctx.fillStyle = 'rgba(124,95,138,0.5)';
    ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 5, 0, TAU); ctx.fill();
  }
  // saw blades
  for (const w of p.weapons) {
    if (w.id === 'saw' && w.st.blades) {
      for (const b of w.st.blades) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(G.time * 8);
        ctx.fillStyle = w.evolved ? '#8E1F2F' : '#D8C7A4';
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
          ctx.lineTo(Math.cos(a + 0.3) * 13, Math.sin(a + 0.3) * 13);
          ctx.lineTo(Math.cos(a + 0.6) * 6, Math.sin(a + 0.6) * 6);
          ctx.fill();
        }
        ctx.strokeStyle = '#0B0A0C'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
    if (w.id === 'chalice' && w.st.R) {
      ctx.strokeStyle = w.evolved ? 'rgba(142,31,47,0.5)' : 'rgba(142,31,47,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, w.st.R, 0, TAU); ctx.stroke();
      if (w.evolved) { ctx.fillStyle = 'rgba(142,31,47,0.10)'; ctx.beginPath(); ctx.arc(p.x, p.y, w.st.R, 0, TAU); ctx.fill(); }
    }
  }
}
function drawProjectiles(ctx) {
  for (const pr of G.projs) {
    if (pr.type !== 'spine' && pr.type !== 'blackbeam' && pr.type !== 'sunbeam' && !inView(pr.x, pr.y, 60)) continue;
    switch (pr.type) {
      case 'spear': line2(ctx, pr, 16, '#D8C7A4', 3); break;
      case 'bullet': { ctx.fillStyle = '#e8a54a'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, TAU); ctx.fill(); line2(ctx, pr, 10, 'rgba(232,165,74,0.5)', 2); break; }
      case 'dagger': line2(ctx, pr, 9, '#9aa1a8', 2); break;
      case 'wave': { ctx.strokeStyle = 'rgba(124,95,138,0.8)'; ctx.lineWidth = 3; const a = Math.atan2(pr.vy, pr.vx); ctx.beginPath(); ctx.arc(pr.x, pr.y, 14, a - 0.8, a + 0.8); ctx.stroke(); break; }
      case 'spike': line2(ctx, pr, 10, '#49364F', 3); break;
      case 'page': { ctx.fillStyle = '#D8C7A4'; ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx)); ctx.fillRect(-6, -4, 12, 8); ctx.restore(); break; }
      case 'soulfire': { glow(ctx, pr.x, pr.y, 8, 'rgba(70,96,138,0.9)', 'rgba(70,96,138,0.25)'); break; }
      case 'boomer': { ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.t * 12); ctx.strokeStyle = '#EEEBDD'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 1.2); ctx.stroke(); ctx.restore(); break; }
      case 'wheel': case 'millstone': {
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.t * 6);
        ctx.strokeStyle = '#D8C7A4'; ctx.lineWidth = pr.type === 'millstone' ? 4 : 3;
        ctx.beginPath(); ctx.arc(0, 0, pr.r, 0, TAU); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * pr.r, Math.sin(a) * pr.r); ctx.stroke(); }
        ctx.restore(); break;
      }
      case 'ravenDive': { ctx.fillStyle = '#0B0A0C'; ctx.strokeStyle = '#49364F'; ctx.save(); ctx.translate(pr.cx || pr.x, pr.cy || pr.y); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -6); ctx.lineTo(10, -2); ctx.lineTo(4, 4); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); break; }
      case 'tombstone': { const k = pr.t / pr.life; const y = pr.y + (pr.ty - pr.y) * k * k; ctx.fillStyle = '#8f8570'; ctx.fillRect(pr.tx - 10, y - 14, 20, 24); circleWarn(ctx, pr.tx, pr.ty, pr.r); break; }
      case 'arrowRain': { const k = pr.t / pr.life; const y = pr.y + 200 * k; line2(ctx, { x: pr.x, y, vx: 0, vy: 1 }, 12, '#D8C7A4', 2); break; }
      case 'snipe': { if (pr.target) { ctx.strokeStyle = 'rgba(232,165,74,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.target.x, pr.target.y); ctx.stroke(); } break; }
      case 'phantomdagger': { ctx.strokeStyle = 'rgba(154,161,168,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 8, pr.y + 8); ctx.stroke(); break; }
      case 'ghosthand': { ctx.fillStyle = 'rgba(124,95,138,0.65)'; ctx.fillRect(pr.x - 30, pr.y - 120, 60, 240); ctx.fillStyle = 'rgba(124,95,138,0.8)'; for (let i = 0; i < 5; i++) ctx.fillRect(pr.x + 20, pr.y - 110 + i * 50, 26, 14); break; }
      case 'crowpet': { ctx.fillStyle = '#2a2130'; ctx.beginPath(); ctx.moveTo(pr.x - 8, pr.y); ctx.lineTo(pr.x, pr.y - 5); ctx.lineTo(pr.x + 8, pr.y - 1); ctx.lineTo(pr.x + 2, pr.y + 4); ctx.closePath(); ctx.fill(); break; }
    }
  }
  // enemy projectiles
  for (const pr of G.eprojs) {
    if (!inView(pr.x, pr.y, 30)) continue;
    if (pr.type === 'shot') {
      glow(ctx, pr.x, pr.y, pr.r, pr.charm ? 'rgba(238,235,221,0.95)' : 'rgba(212,71,79,0.95)', pr.charm ? 'rgba(238,235,221,0.3)' : 'rgba(212,71,79,0.3)');
      if (window.SETTINGS?.colorAssist) { ctx.fillStyle = '#fff'; ctx.font = '9px serif'; ctx.fillText('!', pr.x - 2, pr.y + 3); }
    } else if (pr.type === 'glyph') {
      ctx.fillStyle = 'rgba(17,21,30,0.9)';
      ctx.font = 'bold 16px serif';
      ctx.fillText('祈', pr.x - 8, pr.y);
      circleWarn(ctx, pr.x, pr.y + (pr.life - pr.t) * pr.vy, 18);
    } else if (pr.type === 'boom') {
      circleWarn(ctx, pr.x, pr.y, pr.r * (pr.t / pr.life));
    }
  }
}
function drawParticles(ctx) {
  for (const pt of G.parts) {
    const k = pt.t / pt.life;
    if (pt.ring) {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 3 * (1 - k);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r + (pt.maxR - pt.r) * k, 0, TAU); ctx.stroke();
    } else if (pt.beam) {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = pt.width * (1 - k);
      ctx.beginPath(); ctx.moveTo(pt.x1, pt.y1); ctx.lineTo(pt.x2, pt.y2); ctx.stroke();
    } else if (pt.chainArc) {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * (0.6 + k * 0.4), pt.dir - pt.arc / 2, pt.dir + pt.arc / 2); ctx.stroke();
    } else {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.globalAlpha = 1;
    }
  }
}
function drawNums(ctx) {
  ctx.textAlign = 'center';
  for (const n of G.nums) {
    const k = n.t / 0.8;
    ctx.globalAlpha = 1 - k * k;
    if (n.kind === 'crit') { ctx.fillStyle = '#e8d98a'; ctx.font = 'bold 15px serif'; }
    else if (n.kind === 'heal') { ctx.fillStyle = '#9db38c'; ctx.font = '12px serif'; }
    else if (n.kind === 'combo') { ctx.fillStyle = '#D4474F'; ctx.font = 'bold 13px serif'; }
    else if (n.kind === 'skill') { ctx.fillStyle = '#B58D3B'; ctx.font = 'bold 14px serif'; }
    else if (n.kind === 'warn') { ctx.fillStyle = '#D4474F'; ctx.font = 'bold 14px serif'; }
    else if (n.kind === 'text') { ctx.fillStyle = '#D8C7A4'; ctx.font = '12px serif'; }
    else { ctx.fillStyle = '#c9c4b2'; ctx.font = '12px serif'; }
    ctx.fillText(typeof n.v === 'number' ? fmt(n.v) : n.v, n.x, n.y - k * 26);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/* ---------------- overlays ---------------- */
function drawOverlays(ctx) {
  beginUI(ctx);
  const w = view.w, h = view.h;
  const bg = AREA_BG[G.area ? G.area.bg : 'ashfield'];
  // vignette
  if (bg && bg.vignette) {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(5,4,6,${bg.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // ash fog
  if (G.areaId === 'ashfield' && G.fogT < 0) {
    ctx.fillStyle = 'rgba(120,115,120,0.28)';
    ctx.fillRect(0, 0, w, h);
  }
  // black sun
  if (G.blackSunT > 0) {
    ctx.fillStyle = 'rgba(5,4,6,0.55)';
    ctx.fillRect(0, 0, w, h);
    // the black sun with red corona
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(w / 2, h * 0.16, 54, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#D4474F'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w / 2, h * 0.16, 57, 0, TAU); ctx.stroke();
    G.blackSunT -= 1 / 60;
  }
  // ninth bell time stop
  if (G.ninthBellFx > 0) {
    ctx.fillStyle = `rgba(238,235,221,${0.12 * Math.min(1, G.ninthBellFx)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(216,199,164,0.5)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(w / 2, -h * 0.4, h * 0.9, 0.3, Math.PI - 0.3); ctx.stroke();
    G.ninthBellFx -= 1 / 60;
  }
  // blood sea
  if (G.bloodSeaFx) {
    ctx.fillStyle = 'rgba(142,31,47,0.10)';
    ctx.fillRect(0, 0, w, h);
    G.bloodSeaFx = false;
  }
  // silence (无声末日 pre-strike)
  if (G.silenceT > 0) {
    ctx.fillStyle = `rgba(238,235,221,${0.06})`;
    ctx.fillRect(0, 0, w, h);
    G.silenceT -= 1 / 60;
  }
  // knell approach: bleeding clock frame in last minute handled in HUD
  // screen flash
  if (view.flash > 0) {
    ctx.globalAlpha = view.flash;
    ctx.fillStyle = view.flashColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  endUI(ctx);
}

/* ---------------- HUD ---------------- */
function drawHUD(ctx, p) {
  if (G.phase === 'ending' || G.phase === 'results') return;
  beginUI(ctx);
  const w = view.w, h = view.h;
  const S = p.S;
  const safeTop = 12;
  const heaven = G.areaId === 'fakeheaven';
  const trueH = G.areaId === 'trueheaven';
  const boneCol = heaven ? '#6b6252' : '#D8C7A4';
  ctx.font = '12px serif';

  /* top-left: portrait + hp/shield */
  const px0 = 10, py0 = safeTop;
  ctx.fillStyle = 'rgba(11,10,12,0.55)';
  ctx.fillRect(px0, py0, 190, 46);
  const spr = SPRITES.chars[p.char.id];
  if (spr) ctx.drawImage(spr, px0 + 3, py0 + 3, 40, 40);
  // cracked portrait when hurt
  if (p.hp < S.maxHp * 0.35) {
    ctx.strokeStyle = 'rgba(212,71,79,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px0 + 10, py0 + 8); ctx.lineTo(px0 + 22, py0 + 26); ctx.lineTo(px0 + 16, py0 + 40); ctx.stroke();
  }
  const hpFrac = clamp(p.hp / S.maxHp, 0, 1);
  if (trueH) {
    // collapse from both sides toward center (docs §16.8)
    ctx.fillStyle = '#1b171c'; ctx.fillRect(px0 + 48, py0 + 6, 134, 12);
    ctx.fillStyle = '#8E1F2F';
    const bw = 134 * hpFrac;
    ctx.fillRect(px0 + 48 + (134 - bw) / 2, py0 + 6, bw, 12);
  } else {
    bar(ctx, px0 + 48, py0 + 6, 134, 12, hpFrac, '#8E1F2F', '#1b171c');
  }
  ctx.fillStyle = boneCol;
  ctx.fillText(`${Math.ceil(p.hp)} / ${S.maxHp}`, px0 + 52, py0 + 16);
  if (p.shield > 0) bar(ctx, px0 + 48, py0 + 20, 134 * clamp(p.shield / S.maxHp, 0, 1), 4, 1, '#46608a');
  // armor + buffs line
  let buffs = `护甲${Math.round(S.armor)}`;
  if (p.protect > 0) buffs += ' · 初醒庇护';
  if (p.coffinLayers > 0) buffs += ` · 棺甲×${p.coffinLayers}`;
  if (G.echoAllT > 0) buffs += ' · 回响';
  ctx.fillStyle = heaven ? '#8a8069' : '#8f8570';
  ctx.font = '10px serif';
  ctx.fillText(buffs, px0 + 48, py0 + 40);

  /* top-center: time + area + knell */
  ctx.textAlign = 'center';
  const knell = G.knellAt + (p.relics.includes('deathwatch') ? 60 : 0);
  const toKnell = knell - G.time;
  const bleeding = !G.executed && toKnell < 60 && (G.mode === 'pilgrimage' || G.mode === 'daily');
  ctx.fillStyle = 'rgba(11,10,12,0.55)';
  ctx.fillRect(w / 2 - 62, py0, 124, 34);
  if (bleeding) {
    ctx.fillStyle = `rgba(142,31,47,${0.3 + 0.25 * Math.sin(G.time * 6)})`;
    ctx.fillRect(w / 2 - 62, py0 + 30, 124, 4 + 3 * Math.sin(G.time * 6));
  }
  ctx.fillStyle = bleeding ? '#D4474F' : boneCol;
  ctx.font = 'bold 17px serif';
  ctx.fillText(fmtTime(G.time), w / 2, py0 + 17);
  ctx.font = '10px serif';
  ctx.fillStyle = heaven ? '#8a8069' : '#8f8570';
  ctx.fillText(G.area ? G.area.name : '', w / 2, py0 + 30);
  // knell progress ring
  if (!G.executed && (G.mode === 'pilgrimage' || G.mode === 'daily')) {
    ctx.strokeStyle = bleeding ? '#D4474F' : '#B58D3B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2 + 74, py0 + 17, 10, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(G.time / knell, 0, 1));
    ctx.stroke();
  }

  /* boss hp */
  if (G.boss && !G.boss.dead) {
    const b = G.boss;
    ctx.fillStyle = 'rgba(11,10,12,0.6)';
    ctx.fillRect(w / 2 - 130, py0 + 42, 260, 18);
    bar(ctx, w / 2 - 126, py0 + 46, 252, 6, clamp(b.hp / b.maxHp, 0, 1), '#D4474F', '#1b171c');
    ctx.fillStyle = '#D8C7A4';
    ctx.font = '10px serif';
    const bn = { anlo: '裂腹圣徒·安洛', mimi: '腐香主教·米弥', whale: '吞钟鲸', rahshiel: '堕翼审判者·拉赫希尔', margola: '地狱产婆·玛戈拉', lambking: '白羊之王', mother: '原初圣母·黑昼' }[b.id] || '';
    ctx.fillText(bn + (b.gated ? ' 【胎炉守护】' : ''), w / 2, py0 + 56);
  }
  /* tribunal timer */
  if (G.phase === 'tribunal' && G.tribunal) {
    ctx.fillStyle = '#D4474F';
    ctx.font = 'bold 22px serif';
    ctx.fillText(Math.ceil(G.tribunal.timeLeft) + '', w / 2, py0 + 84);
    ctx.font = '10px serif';
    ctx.fillText('审判限时', w / 2, py0 + 96);
  }
  /* obedience meter */
  if (heaven) {
    ctx.fillStyle = 'rgba(238,235,221,0.75)';
    ctx.fillRect(w / 2 - 80, py0 + 42, 160, 14);
    bar(ctx, w / 2 - 76, py0 + 46, 152, 6, G.obedience / 100, G.obedience > 70 ? '#D4474F' : '#B58D3B', '#c9c4b2');
    ctx.fillStyle = '#4a4438';
    ctx.font = '9px serif';
    ctx.fillText(`顺从 ${Math.round(G.obedience)} / 100 —— 于阴影中醒着`, w / 2, py0 + 52);
  }
  ctx.textAlign = 'left';

  /* top-right: kills/level/ash + pause */
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(11,10,12,0.55)';
  ctx.fillRect(w - 148, py0, 138, 46);
  ctx.fillStyle = boneCol;
  ctx.font = '11px serif';
  ctx.fillText(`击杀 ${fmt(G.kills)}`, w - 46, py0 + 14);
  ctx.fillText(`Lv.${p.level}`, w - 46, py0 + 28);
  ctx.fillText(`灰烬 ${fmt(G.runResources.ash)}`, w - 46, py0 + 42);
  // pause button
  ctx.strokeStyle = boneCol; ctx.lineWidth = 2;
  ctx.strokeRect(w - 36, py0 + 8, 26, 26);
  ctx.fillRect(w - 30, py0 + 14, 4, 14);
  ctx.fillRect(w - 22, py0 + 14, 4, 14);
  input.btns.pause = { x: w - 23, y: py0 + 21, r: 26, cb: window.__PAUSE };
  ctx.textAlign = 'left';

  /* xp bar */
  bar(ctx, 0, py0 + 48, w * clamp(p.xp / p.xpNeed, 0, 1), 3, 1, '#46608a');

  /* bottom-center: weapon slots */
  const slotY = h - 108;
  const slotsW = 6 * 44;
  for (let i = 0; i < 6; i++) {
    const sx = w / 2 - slotsW / 2 + i * 44;
    ctx.fillStyle = 'rgba(11,10,12,0.6)';
    ctx.fillRect(sx, slotY, 40, 40);
    ctx.strokeStyle = '#3a3230';
    ctx.strokeRect(sx, slotY, 40, 40);
    const wp = p.weapons[i];
    if (wp) {
      const def = WEAPON_BY_ID[wp.id];
      const ic = wp.evolved ? iconEvolved(def.icon) : icon(def.icon);
      ctx.drawImage(ic, sx + 2, slotY + 2, 36, 36);
      ctx.fillStyle = wp.evolved ? '#D4474F' : '#B58D3B';
      ctx.font = 'bold 10px serif';
      ctx.fillText(wp.evolved ? 'A' : wp.lv, sx + 30, slotY + 37);
      // fusion gold edge when catalyst owned & near max
      const hasCat = p.catalysts.some(c => c.id === def.catalyst);
      if (!wp.evolved && hasCat && wp.lv >= 7) {
        ctx.strokeStyle = `rgba(181,141,59,${0.5 + 0.4 * Math.sin(G.time * 5)})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 1, slotY - 1, 42, 42);
      }
      if (!wp.evolved && hasCat && wp.lv >= 8) {
        // ready: connecting line to center
        ctx.strokeStyle = '#B58D3B';
        ctx.beginPath(); ctx.moveTo(sx + 20, slotY - 4); ctx.lineTo(sx + 20, slotY - 10); ctx.stroke();
      }
    }
  }
  // forbidden badges
  for (let i = 0; i < p.forbidden.length; i++) {
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(w / 2 - slotsW / 2 - 22, slotY + 12 + i * 24, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#D4474F'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(w / 2 - slotsW / 2 - 22, slotY + 12 + i * 24, 9, 0, TAU); ctx.stroke();
  }

  /* joystick (bottom-left) */
  const swap = window.SETTINGS?.swapHands;
  const joyX = swap ? w - 90 : 90, joyY = h - 150;
  ctx.globalAlpha = input.joyActive ? 0.55 : 0.2;
  ctx.strokeStyle = boneCol; ctx.lineWidth = 2;
  const jbx = input.joyActive ? input.joyBaseX : joyX;
  const jby = input.joyActive ? input.joyBaseY : joyY;
  ctx.beginPath(); ctx.arc(jbx, jby, 46, 0, TAU); ctx.stroke();
  ctx.fillStyle = boneCol;
  const jkx = input.joyActive ? input.joyKnobX : joyX;
  const jky = input.joyActive ? input.joyKnobY : joyY;
  ctx.beginPath(); ctx.arc(jkx, jky, 20, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;

  /* dodge + sin buttons (bottom-right) */
  const bx = swap ? 90 : w - 66, by = h - 118;
  // dodge (small)
  const dReady = p.dodgeCharges > 0;
  ctx.globalAlpha = dReady ? 0.85 : 0.35;
  ctx.strokeStyle = boneCol; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx - 52, by + 44, 26, 0, TAU); ctx.stroke();
  ctx.font = '11px serif'; ctx.fillStyle = boneCol; ctx.textAlign = 'center';
  ctx.fillText('闪避', bx - 52, by + 48);
  if (!dReady) {
    ctx.strokeStyle = '#B58D3B';
    ctx.beginPath(); ctx.arc(bx - 52, by + 44, 26, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p.dodgeT / S.dodgeCd, 0, 1)); ctx.stroke();
  }
  if (p.dodgeMax > 1) ctx.fillText('×' + p.dodgeCharges, bx - 52, by + 66);
  input.btns.dodge = { x: bx - 52, y: by + 44, r: 30 };
  // sin (big) — character-specific pulse when full
  const sinFrac = clamp(p.sin.charge / p.sin.need, 0, 1);
  const full = sinFrac >= 1;
  const pulse = full ? 1 + Math.sin(G.time * 7) * 0.06 : 1;
  ctx.globalAlpha = full ? 0.95 : 0.4;
  ctx.strokeStyle = full ? '#D4474F' : boneCol;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(bx, by, 36 * pulse, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#B58D3B'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(bx, by, 36, -Math.PI / 2, -Math.PI / 2 + TAU * sinFrac); ctx.stroke();
  ctx.fillStyle = full ? '#e8b0b8' : boneCol;
  ctx.font = 'bold 13px serif';
  ctx.fillText(p.char.sin.name, bx, by + 4);
  input.btns.skill = { x: bx, y: by, r: 42 };
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  endUI(ctx);
}

/* ---------------- draw helpers ---------------- */
function inView(x, y, m = 0) {
  return x > view.camX - view.w / 2 - m && x < view.camX + view.w / 2 + m &&
    y > view.camY - view.h / 2 - m && y < view.camY + view.h / 2 + m;
}
function bar(ctx, x, y, w, h, frac, color, bg) {
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, w * clamp(frac, 0, 1)), h);
}
function dot(ctx, x, y, color) { ctx.fillStyle = color; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
function glow(ctx, x, y, r, inner, outer) {
  ctx.fillStyle = outer;
  ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, TAU); ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
}
function line2(ctx, pr, len, color, width) {
  const d = Math.hypot(pr.vx, pr.vy) || 1;
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pr.x - pr.vx / d * len / 2, pr.y - pr.vy / d * len / 2);
  ctx.lineTo(pr.x + pr.vx / d * len / 2, pr.y + pr.vy / d * len / 2);
  ctx.stroke();
}
function circleWarn(ctx, x, y, r) {
  ctx.strokeStyle = 'rgba(212,71,79,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
}
