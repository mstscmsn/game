// World + HUD rendering on canvas.
import { G, burst } from './state.js';
import { view, beginWorld, endWorld, beginUI, endUI } from '../engine.js';
import { AREA_BG, DECOS } from '../art/backgrounds.js';
import { SPRITES, variant, withRimIfDark } from '../art/sprites.js';
import { icon, iconEvolved } from '../art/icons.js';
import { WEAPON_BY_ID } from '../data/weapons.js';
import { input } from '../input.js';
import { fmt, fmtTime, TAU, clamp } from '../core/util.js';
import { BAL } from '../data/balance.js';

const tintCache = new Map();
let dispHp = -1, lastXpFrac = 0, xpPulse = 0;   // HUD easing state
let lastFrameT = 0, rdt = 1 / 60;               // real frame dt for HUD/fx decay
function sprOf(e, fi = 0) {
  const frames = SPRITES.enemFrames[e.def.sprite];
  if (!frames) return null;
  const base = frames[fi % frames.length];
  let c = base;
  const fk = ':' + (fi % frames.length);
  if (e.hitT > 0) {                       // hit flash: white silhouette
    const key = 'hit:' + e.def.sprite + fk;
    if (!tintCache.has(key)) tintCache.set(key, variant(base, { tint: '#EEEBDD', tintAlpha: 0.85 }));
    return tintCache.get(key);
  }
  // dart windup: blood-red pre-dash flare so the lunge is readable
  if (e.def.behavior === 'dart' && e.btPhase === 1) {
    const key = 'tele:' + e.def.sprite + fk;
    if (!tintCache.has(key)) tintCache.set(key, variant(base, { tint: '#D4474F', tintAlpha: 0.45 }));
    return tintCache.get(key);
  }
  if (e.def.tint) {
    // 0.32 keeps the hand-drawn shading readable through the recolor; a pale
    // rim is re-applied when the tint result lands too dark for dark floors
    const key = e.def.sprite + ':' + e.def.tint + fk;
    if (!tintCache.has(key)) tintCache.set(key, withRimIfDark(variant(base, { tint: e.def.tint, tintAlpha: 0.32 })));
    c = tintCache.get(key);
  }
  if (G.blackSunT > 0) {
    const key = 'w:' + e.def.sprite + fk;
    if (!tintCache.has(key)) tintCache.set(key, variant(base, { tint: '#EEEBDD', tintAlpha: 0.95 }));
    c = tintCache.get(key);
  }
  return c;
}
function shadow(ctx, x, y, rx, alpha = 0.3) {
  // skipped in low-fx mode and under extreme horde pressure
  if (window.SETTINGS && window.SETTINGS.simpleFx) return;
  if (G.enemies.length > 320) return;
  ctx.fillStyle = alpha > 0.36 ? 'rgba(4,3,5,0.4)' : 'rgba(4,3,5,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.38, 0, 0, TAU); ctx.fill();
}

export function render(ctx) {
  const p = G.player;
  if (!p) return;
  // real frame dt (render runs per rAF; decay must not be refresh-rate bound)
  const now = performance.now();
  rdt = lastFrameT ? Math.min(0.05, (now - lastFrameT) / 1000) : 1 / 60;
  lastFrameT = now;
  // camera
  view.camX = p.x; view.camY = p.y - 40;
  // clear
  ctx.fillStyle = '#0B0A0C';
  ctx.fillRect(0, 0, view.canvas.width, view.canvas.height);
  beginWorld(ctx);
  drawBackground(ctx);
  drawHeartLantern(ctx, p);
  drawZones(ctx);
  drawPickups(ctx);
  drawObstacles(ctx);
  drawEnemies(ctx);
  drawBoss(ctx);
  drawReaper(ctx);
  drawPlayer(ctx, p);
  drawProjectiles(ctx);
  drawParticles(ctx);
  drawMotes(ctx);
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
  // large silhouette props on a deterministic 560px world grid (§18 大块剪影)
  const decos = DECOS[G.areaId];
  if (decos && decos.length) {
    const GS = 560;
    const gx0 = Math.floor((view.camX - view.w / 2 - 200) / GS), gx1 = Math.floor((view.camX + view.w / 2 + 200) / GS);
    const gy0 = Math.floor((view.camY - view.h / 2 - 200) / GS), gy1 = Math.floor((view.camY + view.h / 2 + 200) / GS);
    for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
      let hsh = (gx * 73856093) ^ (gy * 19349663) ^ (G.seed | 0);
      hsh = (hsh ^ (hsh >> 13)) >>> 0;
      if (hsh % 10 < 6) continue;                     // ~40% of cells hold a prop
      const d = decos[hsh % decos.length];
      const jx = (hsh % 331) - 165, jy = ((hsh >> 5) % 331) - 165;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(d, gx * GS + GS / 2 + jx - d.width / 2, gy * GS + GS / 2 + jy - d.height / 2);
      ctx.globalAlpha = 1;
    }
  }
  // 七钟沉城: moving water shimmer
  if (bg.water) {
    ctx.strokeStyle = 'rgba(120,160,220,0.07)';
    ctx.lineWidth = 2;
    const x0 = view.camX - view.w / 2, y0 = view.camY - view.h / 2;
    for (let i = 0; i < 5; i++) {
      const y = y0 + ((i * 137 + G.time * 14) % view.h + view.h) % view.h;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      for (let x = 0; x <= view.w; x += 40) ctx.lineTo(x0 + x, y + Math.sin(x / 60 + G.time * 1.5 + i * 2) * 6);
      ctx.stroke();
    }
  }
  // 真天堂: breathing walls — slow pulsing darkness
  if (bg.breathing) {
    const a = 0.05 + 0.04 * Math.sin(G.time * 0.9);
    ctx.fillStyle = `rgba(17,21,30,${a})`;
    ctx.fillRect(view.camX - view.w / 2, view.camY - view.h / 2, view.w, view.h);
  }
}

/* the heart-lantern: a warm pool of light around the player that rebuilds
 * chiaroscuro on the flat battlefield (skipped in bright areas / low-fx) */
function drawHeartLantern(ctx, p) {
  const bg = AREA_BG[G.area ? G.area.bg : 'ashfield'];
  if (!bg || bg.bright) return;
  if (window.SETTINGS && window.SETTINGS.simpleFx) return;
  const flicker = 1 + Math.sin(G.time * 5.3) * 0.03 + Math.sin(G.time * 13.7) * 0.015;
  const g = ctx.createRadialGradient(p.x, p.y, 30, p.x, p.y, 195 * flicker);
  g.addColorStop(0, 'rgba(216,199,164,0.10)');
  g.addColorStop(0.55, 'rgba(201,150,90,0.05)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(p.x - 200, p.y - 200, 400, 400);
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
    } else if (G.areaId === 'fakeheaven') {
      // pale marble stump — reads on the bright lawn instead of a black hole
      ctx.fillStyle = 'rgba(11,10,12,0.18)';
      ctx.beginPath(); ctx.ellipse(o.x, o.y + o.r * 0.55, o.r * 0.95, o.r * 0.34, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#cfc7ae';
      ctx.fillRect(o.x - o.r * 0.55, o.y - o.r * 0.8, o.r * 1.1, o.r * 1.35);
      ctx.fillStyle = '#e7e2cf';
      ctx.fillRect(o.x - o.r * 0.7, o.y - o.r, o.r * 1.4, o.r * 0.35);
      ctx.fillStyle = '#a89f86';
      ctx.fillRect(o.x - o.r * 0.55, o.y + o.r * 0.3, o.r * 1.1, o.r * 0.25);
    } else {
      // irregular slate block: filled facets + light top edge + ground shadow
      ctx.fillStyle = 'rgba(4,3,5,0.3)';
      ctx.beginPath(); ctx.ellipse(o.x, o.y + o.r * 0.6, o.r, o.r * 0.32, 0, 0, TAU); ctx.fill();
      const rr = o.r;
      ctx.fillStyle = G.areaId === 'trueheaven' ? '#232b3d' : '#332a30';
      ctx.beginPath();
      ctx.moveTo(o.x - rr * 0.9, o.y + rr * 0.5);
      ctx.lineTo(o.x - rr * 0.7, o.y - rr * 0.5);
      ctx.lineTo(o.x - rr * 0.1, o.y - rr * 0.85);
      ctx.lineTo(o.x + rr * 0.8, o.y - rr * 0.35);
      ctx.lineTo(o.x + rr * 0.9, o.y + rr * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = G.areaId === 'trueheaven' ? 'rgba(154,180,220,0.4)' : 'rgba(216,199,164,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(o.x - rr * 0.7, o.y - rr * 0.5);
      ctx.lineTo(o.x - rr * 0.1, o.y - rr * 0.85);
      ctx.lineTo(o.x + rr * 0.8, o.y - rr * 0.35);
      ctx.stroke();
      ctx.fillStyle = 'rgba(11,10,12,0.35)';
      ctx.beginPath();
      ctx.moveTo(o.x - rr * 0.1, o.y - rr * 0.85);
      ctx.lineTo(o.x + rr * 0.8, o.y - rr * 0.35);
      ctx.lineTo(o.x + rr * 0.9, o.y + rr * 0.5);
      ctx.lineTo(o.x + rr * 0.1, o.y + rr * 0.5);
      ctx.closePath(); ctx.fill();
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
    if (k.ph === undefined) k.ph = k.x + k.y;          // stable bob phase
    const bob = k.pulled ? 0 : Math.sin(G.time * 4 + k.ph) * 2;
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
      // tribunal seals chests/gifts: dim them and drop the golden lure so
      // "not pickable right now" reads visually instead of like a broken pickup
      const sealed = G.phase === 'tribunal' && (k.type === 'chest' || k.type === 'gift');
      if (sealed) {
        ctx.globalAlpha = 0.45;
        ctx.drawImage(spr, k.x - spr.width / 2, k.y - spr.height / 2 + bob);
        ctx.globalAlpha = 1;
      } else if (k.type === 'confession' || k.type === 'chest') {
        ctx.save();
        ctx.shadowColor = '#B58D3B'; ctx.shadowBlur = 8;
        ctx.drawImage(spr, k.x - spr.width / 2, k.y - spr.height / 2 + bob);
        ctx.restore();
      } else ctx.drawImage(spr, k.x - spr.width / 2, k.y - spr.height / 2 + bob);
    }
  }
}
function drawEnemies(ctx) {
  const crowd = G.enemies.length > 260;      // skip micro-anim under horde pressure
  for (const e of G.enemies) {
    if (e.dead || !inView(e.x, e.y, 60)) continue;
    const moving = Math.abs(e.vx) + Math.abs(e.vy) > 8 && !(e.frozenT > 0);
    const fi = moving ? ((G.time * 7 + e.id) | 0) % 4 : 0;
    const spr = sprOf(e, fi);
    if (!spr) continue;
    const sc = (e.isElite ? 1.35 : 1);
    const w = spr.width * sc, h = spr.height * sc;
    // rounded bob: sub-pixel offsets on the 0.75 canvas scale smear pixel rows
    const bob = e.spawning > 0 ? 0 : Math.round(Math.sin(G.time * 6 + e.id) * 1.5);
    shadow(ctx, e.x, e.y + h / 2 - 2, e.r * 0.9, e.isElite ? 0.4 : 0.28);
    // elite: pulsing gold aura ring under the body
    if (e.isElite && !crowd) {
      const pk = 0.5 + Math.sin(G.time * 4 + e.id) * 0.2;
      ctx.strokeStyle = `rgba(181,141,59,${pk * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + h / 2 - 2, e.r * (0.95 + pk * 0.12), e.r * 0.36, 0, 0, TAU); ctx.stroke();
    }
    ctx.save();
    if (e.liftT > 0) ctx.translate(0, -(1 - e.liftT) * 40);
    const flip = e.vx < -1;
    if (e.spawning > 0) {
      // emerge from the grave: rise + clip below ground line + dust kick
      const k = 1 - e.spawning / 0.4;         // 0→1
      ctx.globalAlpha = 0.35 + k * 0.65;
      ctx.translate(e.x, e.y + bob);
      if (flip) ctx.scale(-1, 1);
      const vis = Math.max(1, Math.round(h * (0.25 + 0.75 * k)));
      ctx.drawImage(spr, 0, 0, spr.width, Math.round(spr.height * (vis / h)),
        -w / 2, h / 2 - vis, w, vis);
      ctx.restore();
      if (!e._dusted && k > 0.7 && !crowd) { e._dusted = 1; burst(e.x, e.y + h / 2 - 3, 'rgba(196,184,156,0.75)', 7, 70, 0.4, 3); }
    } else {
      ctx.translate(e.x, e.y + bob);
      if (flip) ctx.scale(-1, 1);
      if (e.dying > 0) {                       // death: flatten + fade
        const dk = Math.min(1, e.dying / 0.3);
        ctx.globalAlpha = 0.3 + dk * 0.7;
        ctx.scale(1 + (1 - dk) * 0.25, 0.4 + dk * 0.6);
      } else if (e.def.behavior === 'dart' && e.btPhase === 1) {
        // windup: crouch compresses as the lunge charges (color flare + motion)
        const wk = Math.min(1, Math.max(0, (0.5 - e.bt) / 0.5));
        ctx.scale(1 + wk * 0.12, 1 - wk * 0.12);
      } else if (e.def.behavior === 'dart' && e.btPhase === 2) {
        // dash: stretch along the lunge axis, not always horizontally
        if (Math.abs(Math.cos(e.dashA || 0)) > 0.7) ctx.scale(1.18, 0.86);
        else ctx.scale(0.86, 1.18);
      } else if (!crowd && spr.height <= 26 && moving) {
        // low round bodies scuttle with squash-stretch instead of leg frames
        const s = Math.sin(G.time * 11 + e.id) * 0.055;
        ctx.scale(1 + s, 1 - s);
      }
      ctx.drawImage(spr, -w / 2, -h / 2, w, h);
      ctx.restore();
      // shooter pre-fire glint: brief brighten right before the shot
      if (!crowd && e.def.behavior === 'shoot' && e.bt < 0.28 && e.bt > 0) {
        ctx.globalAlpha = 0.3;
        const hs = sprOf({ ...e, hitT: 1 }, fi);
        if (hs) {
          ctx.save(); ctx.translate(e.x, e.y + bob); if (flip) ctx.scale(-1, 1);
          ctx.drawImage(hs, -w / 2, -h / 2, w, h); ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    }
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
  const frames = SPRITES.bossFrames[b.sprite] || [SPRITES.bosses[b.sprite]];
  // threat frame: switch to the menace pose in the last beat before an attack
  const threat = frames.length > 1 && b.patT < 0.6;
  let spr = frames[threat ? 1 : 0];
  if (!spr) return;
  // hit flash: white silhouette (dimming on hit read as a bug)
  if (b.hitT > 0) {
    const key = 'bosshit:' + b.sprite + (threat ? 'B' : 'A');
    if (!tintCache.has(key)) tintCache.set(key, variant(spr, { tint: '#EEEBDD', tintAlpha: 0.8 }));
    spr = tintCache.get(key);
  }
  const SCALE = 1.55;                       // presence: draw big, collide same
  const bob = Math.sin(G.time * 2.4) * 3;
  const breathe = 1 + Math.sin(G.time * 1.7) * 0.02;
  // dark pool beneath the mass
  const pool = ctx.createRadialGradient(b.x, b.y + spr.height * SCALE * 0.4, 10, b.x, b.y + spr.height * SCALE * 0.4, b.r * 2.1);
  pool.addColorStop(0, 'rgba(4,3,5,0.5)');
  pool.addColorStop(1, 'rgba(4,3,5,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(b.x - b.r * 2.2, b.y, b.r * 4.4, spr.height * SCALE);
  ctx.save();
  ctx.translate(b.x, b.y + bob);
  // entrance: swell up from the ground shadow over the first beat
  const ent = Math.min(1, b.t / 0.9);
  const entS = 0.55 + 0.45 * (1 - (1 - ent) * (1 - ent));
  ctx.scale(SCALE * breathe * entS, SCALE * (2 - breathe) * entS);
  ctx.globalAlpha = 0.3 + 0.7 * ent;
  if (b.invulnT > 0 && ent >= 1) ctx.globalAlpha = 0.5;
  if (G.player.x < b.x) ctx.scale(-1, 1);
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  ctx.restore();
  ctx.globalAlpha = 1;
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
  const frames = SPRITES.charFrames[p.char.id];
  const fi = p.moving && frames ? ((G.time * 9) | 0) % frames.length : -1;
  const spr = fi >= 0 ? frames[fi] : SPRITES.chars[p.char.id];
  if (!spr) return;
  // gait-synced bob: passing frames rise, contact frames sink — makes the
  // step read at phone size (whole-pixel offsets to avoid sub-pixel smear)
  const bob = fi >= 0 ? (fi % 2 === 1 ? -2 : 1) : Math.round(Math.sin(G.time * 2) * 1);
  shadow(ctx, p.x, p.y + spr.height / 2 - 2, 14, 0.35);
  // dodge afterimages: fading snapshots along the dash
  if (!p._trail) p._trail = [];
  if (p.dodging > 0) {
    if (!p._trail.length || Math.hypot(p.x - p._trail[p._trail.length - 1].x, p.y - p._trail[p._trail.length - 1].y) >= 16) {
      p._trail.push({ x: p.x, y: p.y, t: 0, f: p.facing });
      if (p._trail.length > 5) p._trail.shift();
    }
  }
  for (let i = p._trail.length - 1; i >= 0; i--) {
    const g = p._trail[i];
    g.t += rdt;
    if (g.t > 0.28) { p._trail.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = 0.2 * (1 - g.t / 0.28);
    ctx.translate(g.x, g.y);
    if (g.f < 0) ctx.scale(-1, 1);
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();
  }
  // shield ring — flares thick & bright for a beat when it just absorbed a hit
  if (p.shield > 0) {
    const hit = p.shieldHitT > 0;
    ctx.strokeStyle = hit ? 'rgba(120,160,220,1)' : 'rgba(70,96,138,0.75)';
    ctx.lineWidth = hit ? 4 : 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, TAU * Math.min(1, p.shield / (p.S.maxHp * 0.3))); ctx.stroke();
  }
  // dodge ghost
  if (p.dodging > 0) ctx.globalAlpha = 0.55;
  if (p.invT > 0 && ((G.time * 12) | 0) % 2 === 0) ctx.globalAlpha = 0.5;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  if (p.moving) ctx.rotate(p.facing * 0.05);      // lean into movement
  else {
    // idle breathing, anchored at the feet so they don't slide
    const br = 1 + Math.sin(G.time * 2.2) * 0.03;
    ctx.translate(0, spr.height / 2);
    ctx.scale(br, 2 - br);
    ctx.translate(0, -spr.height / 2);
  }
  if (p.facing < 0) ctx.scale(-1, 1);
  // bone-white outline halo: the anchor that keeps "me" findable in a horde
  const outline = SPRITES.charOutline && SPRITES.charOutline[p.char.id];
  if (outline) { ctx.globalAlpha *= 0.5; ctx.drawImage(outline, -outline.width / 2, -outline.height / 2); ctx.globalAlpha *= 2; }
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  ctx.restore();
  ctx.globalAlpha = 1;
  // adric coffin layers
  for (let i = 0; i < p.coffinLayers; i++) {
    ctx.strokeStyle = 'rgba(216,199,164,0.6)';
    ctx.strokeRect(p.x - 22 - i * 3, p.y - 26 - i * 3, 44 + i * 6, 52 + i * 6);
  }
  // adric 开棺 absorb dome
  if (p.sin.active > 0 && p.char.id === 'adric') {
    const k = 1 + Math.sin(G.time * 10) * 0.06;
    ctx.strokeStyle = 'rgba(212,71,79,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 40 * k, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(142,31,47,0.12)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 40 * k, 0, TAU); ctx.fill();
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
      case 'spear': { line2(ctx, pr, 16, 'rgba(216,199,164,0.35)', 5); line2(ctx, pr, 16, '#D8C7A4', 3); const sa = Math.atan2(pr.vy, pr.vx); ctx.fillStyle = '#e0c06a'; ctx.beginPath(); ctx.arc(pr.x + Math.cos(sa) * 9, pr.y + Math.sin(sa) * 9, 2, 0, TAU); ctx.fill(); break; }
      case 'bullet': { line2(ctx, pr, 22, 'rgba(232,165,74,0.22)', 4); line2(ctx, pr, 12, 'rgba(232,165,74,0.55)', 2); ctx.fillStyle = '#f5d08a'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8a54a'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 2.4, 0, TAU); ctx.fill(); break; }
      case 'dagger': { ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.t * 16); ctx.strokeStyle = '#9aa1a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.strokeStyle = 'rgba(238,235,221,0.7)'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke(); ctx.restore(); break; }
      case 'wave': { const a = Math.atan2(pr.vy, pr.vx); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(124,95,138,0.85)'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 14, a - 0.8, a + 0.8); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(124,95,138,0.35)'; ctx.beginPath(); ctx.arc(pr.x - Math.cos(a) * 8, pr.y - Math.sin(a) * 8, 12, a - 0.7, a + 0.7); ctx.stroke(); break; }
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
      case 'ravenDive': { ctx.fillStyle = '#3a2f45'; ctx.strokeStyle = '#9a8fb0'; ctx.lineWidth = 2; ctx.save(); ctx.translate(pr.cx || pr.x, pr.cy || pr.y); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -6); ctx.lineTo(10, -2); ctx.lineTo(4, 4); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); break; }
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
    if (pt.corpse) {
      const base = SPRITES.enemies[pt.sprite];
      if (!base) continue;
      let c = base;
      if (pt.tint) {
        const key = pt.sprite + ':' + pt.tint + 'A';
        if (!tintCache.has(key)) tintCache.set(key, variant(base, { tint: pt.tint, tintAlpha: 0.5 }));
        c = tintCache.get(key);
      }
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.translate(pt.x, pt.y + k * 7);
      ctx.scale((pt.flip ? -1 : 1) * pt.sc * (1 + k * 0.15), pt.sc * (1 - k * 0.45));
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
      continue;
    }
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
    // pop-in: numbers land oversized then settle within the first 0.1s
    const pop = 1 + 0.55 * Math.max(0, 1 - n.t / 0.11);
    ctx.globalAlpha = 1 - k * k;
    let size = 12, col = '#c9c4b2', bold = '';
    if (n.kind === 'crit') { col = '#e8d98a'; size = 16; bold = 'bold '; }
    else if (n.kind === 'heal') { col = '#9db38c'; }
    else if (n.kind === 'combo') { col = '#D4474F'; size = 13; bold = 'bold '; }
    else if (n.kind === 'skill') { col = '#B58D3B'; size = 14; bold = 'bold '; }
    else if (n.kind === 'warn') { col = '#D4474F'; size = 14; bold = 'bold '; }
    else if (n.kind === 'text') { col = '#D8C7A4'; }
    else if (typeof n.v === 'number' && n.v >= 100) { size = 14; bold = 'bold '; }
    ctx.fillStyle = col;
    ctx.font = `${bold}${Math.round(size * pop)}px serif`;
    ctx.fillText(typeof n.v === 'number' ? fmt(n.v) : n.v, n.x, n.y - k * 26);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/* ---------------- ambient drifting motes (stateless) ---------------- */
const MOTE_STYLE = {
  ashfield: { col: 'rgba(160,152,140,', n: 22, dir: 1 },
  cathedral: { col: 'rgba(140,160,110,', n: 16, dir: 1 },
  bells: { col: 'rgba(120,150,200,', n: 14, dir: -1 },
  hell: { col: 'rgba(230,140,60,', n: 20, dir: -1 },   // embers rise
  fakeheaven: { col: 'rgba(255,253,240,', n: 18, dir: 1 },
  trueheaven: { col: 'rgba(180,170,220,', n: 20, dir: 1 },
  corpsesea: { col: 'rgba(150,140,180,', n: 16, dir: 1 },
};
function drawMotes(ctx) {
  const st = MOTE_STYLE[G.areaId];
  if (!st || (window.SETTINGS && window.SETTINGS.simpleFx)) return;
  const x0 = view.camX - view.w / 2, y0 = view.camY - view.h / 2;
  for (let i = 0; i < st.n; i++) {
    const speed = 6 + (i % 5) * 4;
    const wx = x0 + ((i * 173.3 + G.time * (4 + i % 7) + Math.sin(G.time * 0.7 + i) * 20) % view.w + view.w) % view.w;
    const wy = y0 + ((i * 89.7 + st.dir * G.time * speed) % view.h + view.h) % view.h;
    const a = 0.12 + 0.1 * Math.sin(G.time * 2 + i * 1.7);
    ctx.fillStyle = st.col + Math.max(0.04, a) + ')';
    const s = 1 + (i % 3);
    ctx.fillRect(wx, wy, s, s);
  }
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
  }
  // ninth bell time stop
  if (G.ninthBellFx > 0) {
    ctx.fillStyle = `rgba(238,235,221,${0.12 * Math.min(1, G.ninthBellFx)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(216,199,164,0.5)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(w / 2, -h * 0.4, h * 0.9, 0.3, Math.PI - 0.3); ctx.stroke();
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
  }
  // knell approach: bleeding clock frame in last minute handled in HUD
  // low-hp pulse: red breath around the frame edges
  const pl = G.player;
  if (pl && pl.hp > 0 && pl.hp < pl.S.maxHp * 0.3 && (G.phase === 'play' || G.phase === 'tribunal')) {
    const a = 0.16 + 0.12 * Math.sin(G.time * 5);
    const edge = ctx.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, h * 0.62);
    edge.addColorStop(0, 'rgba(142,31,47,0)');
    edge.addColorStop(1, `rgba(142,31,47,${a})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
  }
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
  const safeTop = 12 + view.safeTop;
  const safeBot = view.safeBottom;
  const heaven = G.areaId === 'fakeheaven';
  const trueH = G.areaId === 'trueheaven';
  const boneCol = heaven ? '#6b6252' : '#D8C7A4';
  ctx.font = '12px serif';

  /* top-left: portrait + hp/shield (52px strip: room for 15px key numbers) */
  const px0 = 10, py0 = safeTop;
  ctx.fillStyle = 'rgba(11,10,12,0.55)';
  ctx.fillRect(px0, py0, 190, 52);
  const spr = SPRITES.chars[p.char.id];
  if (spr) ctx.drawImage(spr, px0 + 3, py0 + 3, 46, 46);
  // cracked portrait when hurt
  if (p.hp < S.maxHp * 0.35) {
    ctx.strokeStyle = 'rgba(212,71,79,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px0 + 10, py0 + 8); ctx.lineTo(px0 + 22, py0 + 26); ctx.lineTo(px0 + 16, py0 + 40); ctx.stroke();
  }
  const hpFrac = clamp(p.hp / S.maxHp, 0, 1);
  // damage lag-chunk: a pale segment trails the real bar so hits read on the HUD
  if (dispHp < 0 || dispHp < hpFrac) dispHp = hpFrac;
  else dispHp = Math.max(hpFrac, dispHp - 0.35 * rdt);
  if (trueH) {
    // collapse from both sides toward center (docs §16.8)
    ctx.fillStyle = '#1b171c'; ctx.fillRect(px0 + 48, py0 + 6, 134, 12);
    if (dispHp > hpFrac + 0.005) {
      ctx.fillStyle = 'rgba(238,235,221,0.65)';
      const dw = 134 * dispHp;
      ctx.fillRect(px0 + 48 + (134 - dw) / 2, py0 + 6, dw, 12);
    }
    ctx.fillStyle = '#8E1F2F';
    const bw = 134 * hpFrac;
    ctx.fillRect(px0 + 48 + (134 - bw) / 2, py0 + 6, bw, 12);
  } else {
    bar(ctx, px0 + 48, py0 + 6, 134, 12, hpFrac, '#8E1F2F', '#1b171c');
    if (dispHp > hpFrac + 0.005) {
      ctx.fillStyle = 'rgba(238,235,221,0.65)';
      ctx.fillRect(px0 + 48 + 134 * hpFrac, py0 + 6, 134 * (dispHp - hpFrac), 12);
    }
  }
  ctx.fillStyle = boneCol;
  ctx.font = '15px serif';
  ctx.fillText(`${Math.ceil(p.hp)} / ${S.maxHp}`, px0 + 52, py0 + 17);
  if (p.shield > 0) bar(ctx, px0 + 48, py0 + 20, 134 * clamp(p.shield / S.maxHp, 0, 1), 4, 1, '#46608a');
  // armor + buffs line
  let buffs = `护甲${Math.round(S.armor)}`;
  if (p.protect > 0) buffs += ' · 初醒庇护';
  if (p.coffinLayers > 0) buffs += ` · 棺甲×${p.coffinLayers}`;
  if (G.echoAllT > 0) buffs += ' · 回响';
  ctx.fillStyle = heaven ? '#8a8069' : '#8f8570';
  ctx.font = '13px serif';
  ctx.fillText(buffs, px0 + 48, py0 + 46);

  /* top-center: time + area + knell */
  ctx.textAlign = 'center';
  const knell = G.knellAt + (p.relics.includes('deathwatch') ? 60 : 0);
  const toKnell = knell - G.time;
  const bleeding = !G.executed && isFinite(knell) && toKnell < 60 && (G.mode === 'pilgrimage' || G.mode === 'daily');
  ctx.fillStyle = 'rgba(11,10,12,0.55)';
  ctx.fillRect(w / 2 - 62, py0, 124, 38);
  if (bleeding) {
    ctx.fillStyle = `rgba(142,31,47,${0.3 + 0.25 * Math.sin(G.time * 6)})`;
    ctx.fillRect(w / 2 - 62, py0 + 34, 124, 4 + 3 * Math.sin(G.time * 6));
  }
  ctx.fillStyle = bleeding ? '#D4474F' : boneCol;
  ctx.font = 'bold 17px serif';
  ctx.fillText(fmtTime(G.time), w / 2, py0 + 17);
  ctx.font = '13px serif';
  ctx.fillStyle = heaven ? '#8a8069' : '#8f8570';
  ctx.fillText(G.area ? G.area.name : '', w / 2, py0 + 33);
  // progress ring: knell countdown once armed, else boss-approach for this area
  if ((G.mode === 'pilgrimage' || G.mode === 'daily' || G.mode === 'chapter') && G.areaId !== 'corridor') {
    let frac = 0, col = '#B58D3B', approaching = false;
    if (!G.executed && isFinite(knell)) { frac = clamp(1 - toKnell / 60, 0, 1); col = '#D4474F'; }
    else if (G.boss) { frac = 1; col = '#D4474F'; }
    else if (G.area && G.area.boss) {
      const wait = G.mode === 'chapter' ? 300 : BAL.bossAfter;
      frac = clamp((G.time - G.areaEnteredAt) / wait, 0, 1);
      approaching = true;
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2 + 74, py0 + 17, 10, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
    ctx.stroke();
    // label the unnamed gold ring right before it delivers a boss
    if (approaching && frac > 0.75) {
      ctx.fillStyle = '#B58D3B';
      ctx.font = '9px serif';
      ctx.fillText('强敌将至', w / 2 + 74, py0 + 38);
    }
  } else if (G.mode === 'endless') {
    // world-layer progress: how deep into the current 8-minute loop
    const frac = (G.time % 480) / 480;
    ctx.strokeStyle = '#7C5F8A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2 + 74, py0 + 17, 10, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
    ctx.stroke();
    ctx.fillStyle = '#8f8570';
    ctx.font = '12px serif';
    ctx.fillText(`层${G.loopN + 1}`, w / 2 + 74, py0 + 21);
  }

  /* boss hp — wide, thick, named in bold, with damage lag-chunk */
  if (G.boss && !G.boss.dead) {
    const b = G.boss;
    const bw = Math.min(w - 60, 330);
    const bFrac = clamp(b.hp / b.maxHp, 0, 1);
    if (b._dispHp === undefined || b._dispHp < bFrac) b._dispHp = bFrac;
    else b._dispHp = Math.max(bFrac, b._dispHp - 0.25 * rdt);
    ctx.fillStyle = 'rgba(11,10,12,0.7)';
    ctx.fillRect(w / 2 - bw / 2 - 4, py0 + 48, bw + 8, 26);
    bar(ctx, w / 2 - bw / 2, py0 + 52, bw, 9, bFrac, '#D4474F', '#1b171c');
    if (b._dispHp > bFrac + 0.003) {
      ctx.fillStyle = 'rgba(238,235,221,0.55)';
      ctx.fillRect(w / 2 - bw / 2 + bw * bFrac, py0 + 52, bw * (b._dispHp - bFrac), 9);
    }
    ctx.fillStyle = '#D8C7A4';
    ctx.font = 'bold 12px serif';
    const bn = { anlo: '裂腹圣徒·安洛', mimi: '腐香主教·米弥', whale: '吞钟鲸', rahshiel: '堕翼审判者·拉赫希尔', margola: '地狱产婆·玛戈拉', lambking: '白羊之王', mother: '原初圣母·黑昼' }[b.id] || '';
    ctx.fillText(bn + (b.gated ? ' 【胎炉守护】' : ''), w / 2, py0 + 71);
  }
  /* tribunal timer */
  if (G.phase === 'tribunal' && G.tribunal) {
    ctx.fillStyle = '#D4474F';
    ctx.font = 'bold 22px serif';
    ctx.fillText(Math.ceil(G.tribunal.timeLeft) + '', w / 2, py0 + 90);
    ctx.font = '11px serif';
    ctx.fillText('审判限时', w / 2, py0 + 103);
  }
  /* obedience meter */
  if (heaven) {
    ctx.fillStyle = 'rgba(238,235,221,0.75)';
    ctx.fillRect(w / 2 - 80, py0 + 48, 160, 18);
    bar(ctx, w / 2 - 76, py0 + 53, 152, 6, G.obedience / 100, G.obedience > 70 ? '#D4474F' : '#B58D3B', '#c9c4b2');
    ctx.fillStyle = '#4a4438';
    ctx.font = '12px serif';
    ctx.fillText(`顺从 ${Math.round(G.obedience)} / 100 —— 于阴影中醒着`, w / 2, py0 + 62);
  }
  ctx.textAlign = 'left';

  /* top-right: kills/level/ash + pause */
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(11,10,12,0.55)';
  ctx.fillRect(w - 148, py0, 138, 52);
  ctx.fillStyle = boneCol;
  ctx.font = '15px serif';
  ctx.fillText(`击杀 ${fmt(G.kills)}`, w - 46, py0 + 15);
  ctx.fillText(`Lv.${p.level}`, w - 46, py0 + 31);
  ctx.fillText(`灰烬 ${fmt(G.runResources.ash)}`, w - 46, py0 + 47);
  // pause button (generous hit zone for thumbs)
  ctx.strokeStyle = boneCol; ctx.lineWidth = 2;
  ctx.strokeRect(w - 40, py0 + 11, 30, 30);
  ctx.fillRect(w - 33, py0 + 18, 5, 16);
  ctx.fillRect(w - 23, py0 + 18, 5, 16);
  input.btns.pause = { x: w - 25, y: py0 + 26, r: 32, cb: window.__PAUSE };
  ctx.textAlign = 'left';

  /* xp bar — with a visible track + gain shimmer pulse */
  const xpFrac = clamp(p.xp / p.xpNeed, 0, 1);
  if (xpFrac > lastXpFrac + 0.001 || xpFrac < lastXpFrac - 0.3) xpPulse = 0.5;   // gained (or leveled)
  lastXpFrac = xpFrac;
  xpPulse = Math.max(0, xpPulse - rdt);
  ctx.fillStyle = '#1b171c';
  ctx.fillRect(0, py0 + 54, w, 4);
  bar(ctx, 0, py0 + 54, w * xpFrac, 4, 1, '#46608a');
  if (xpPulse > 0) {
    ctx.fillStyle = `rgba(154,180,220,${xpPulse * 0.9})`;
    ctx.fillRect(Math.max(0, w * xpFrac - 26), py0 + 54, 26, 4);
  }

  /* bottom-center: weapon slots */
  const slotY = h - 108 - safeBot;
  const slotsW = 6 * 44;
  for (let i = 0; i < 6; i++) {
    const sx = w / 2 - slotsW / 2 + i * 44;
    // only owned slots + the next empty one at full presence; rest are whispers
    const wp = p.weapons[i];
    const ghost = !wp && i > p.weapons.length;
    ctx.globalAlpha = ghost ? 0.14 : 1;
    ctx.fillStyle = 'rgba(11,10,12,0.6)';
    ctx.fillRect(sx, slotY, 40, 40);
    ctx.strokeStyle = '#3a3230';
    ctx.strokeRect(sx, slotY, 40, 40);
    ctx.globalAlpha = 1;
    if (wp) {
      const def = WEAPON_BY_ID[wp.id];
      const ic = wp.evolved ? iconEvolved(def.icon) : icon(def.icon);
      ctx.drawImage(ic, sx + 2, slotY + 2, 36, 36);
      ctx.fillStyle = wp.evolved ? '#D4474F' : '#B58D3B';
      ctx.font = 'bold 13px serif';
      ctx.fillText(wp.evolved ? 'A' : wp.lv, sx + 28, slotY + 37);
      // fusion gold edge when catalyst owned & near max
      const hasCat = p.catalysts.some(c => c.id === def.catalyst);
      if (!wp.evolved && hasCat && wp.lv === 7) {
        ctx.strokeStyle = `rgba(181,141,59,${0.5 + 0.4 * Math.sin(G.time * 5)})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 1, slotY - 1, 42, 42);
      }
      if (!wp.evolved && hasCat && wp.lv >= 8) {
        // ready: whole-slot golden breath + label (the old 6px tick was invisible)
        ctx.strokeStyle = `rgba(181,141,59,${0.5 + 0.4 * Math.sin(G.time * 5)})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(sx - 2, slotY - 2, 44, 44);
        ctx.fillStyle = '#B58D3B';
        ctx.font = '9px serif';
        ctx.textAlign = 'center';
        ctx.fillText('就绪', sx + 20, slotY - 5);
        ctx.textAlign = 'left';
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

  /* joystick — any touch on the movement half of the screen summons it */
  const swap = window.SETTINGS?.swapHands;
  const joyX = swap ? w - 96 : 96, joyY = h - 158 - safeBot;
  ctx.globalAlpha = input.joyActive ? 0.55 : 0.18;
  ctx.strokeStyle = boneCol; ctx.lineWidth = 2;
  const jbx = input.joyActive ? input.joyBaseX : joyX;
  const jby = input.joyActive ? input.joyBaseY : joyY;
  ctx.beginPath(); ctx.arc(jbx, jby, 50, 0, TAU); ctx.stroke();
  ctx.fillStyle = boneCol;
  const jkx = input.joyActive ? input.joyKnobX : joyX;
  const jky = input.joyActive ? input.joyKnobY : joyY;
  ctx.beginPath(); ctx.arc(jkx, jky, 22, 0, TAU); ctx.fill();
  if (!input.joyActive && G.time < 20) {   // first moments: teach the free-stick
    ctx.globalAlpha = 0.35;
    ctx.font = '11px serif'; ctx.textAlign = 'center';
    ctx.fillText(swap ? '右半屏任意位置拖动' : '左半屏任意位置拖动', jbx, jby + 74);
    ctx.textAlign = 'left';
  }
  ctx.globalAlpha = 1;

  /* dodge + sin buttons — raised into the natural thumb arc, enlarged,
   * stacked along the screen edge clear of the weapon-slot row */
  const bx = swap ? 78 : w - 78, by = h - 200 - safeBot;   // sin center (lifted clear of dodge)
  const dx = swap ? 70 : w - 70, dy = h - 92 - safeBot;    // dodge center
  ctx.textAlign = 'center';
  const pressed = (name) => input.pressFx && input.pressFx.name === name && performance.now() - input.pressFx.t < 160;
  // dodge
  const dReady = p.dodgeCharges > 0;
  ctx.globalAlpha = dReady ? 0.9 : 0.35;
  ctx.fillStyle = pressed('dodge') ? 'rgba(216,199,164,0.30)' : 'rgba(11,10,12,0.35)';
  ctx.beginPath(); ctx.arc(dx, dy, 33, 0, TAU); ctx.fill();
  ctx.strokeStyle = boneCol; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(dx, dy, 33, 0, TAU); ctx.stroke();
  ctx.font = '13px serif'; ctx.fillStyle = boneCol;
  ctx.fillText('闪避', dx, dy + 5);
  if (!dReady) {
    ctx.strokeStyle = '#B58D3B';
    ctx.beginPath(); ctx.arc(dx, dy, 33, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p.dodgeT / S.dodgeCd, 0, 1)); ctx.stroke();
  }
  if (p.dodgeMax > 1) { ctx.font = '11px serif'; ctx.fillText('×' + p.dodgeCharges, dx, dy + 24); }
  input.btns.dodge = { x: dx, y: dy, r: 40 };
  // sin (big) — character-specific pulse when full
  const sinFrac = clamp(p.sin.charge / p.sin.need, 0, 1);
  const full = sinFrac >= 1;
  const pulse = full ? 1 + Math.sin(G.time * 7) * 0.05 : 1;
  ctx.globalAlpha = full ? 0.95 : 0.5;
  ctx.fillStyle = pressed('skill') ? 'rgba(212,71,79,0.28)' : 'rgba(11,10,12,0.35)';
  ctx.beginPath(); ctx.arc(bx, by, 46, 0, TAU); ctx.fill();
  ctx.strokeStyle = G.sinDeniedT > 0 ? '#D4474F' : full ? '#D4474F' : boneCol;
  if (full) {         // charged: gold halo glow
    ctx.save();
    ctx.shadowColor = '#B58D3B'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(bx, by, 48, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(bx, by, 46 * pulse, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#B58D3B'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(bx, by, 46, -Math.PI / 2, -Math.PI / 2 + TAU * sinFrac); ctx.stroke();
  ctx.fillStyle = full ? '#e8b0b8' : boneCol;
  ctx.font = 'bold 15px serif';
  ctx.fillText(p.char.sin.name, bx, by + 5);
  if (!full) { ctx.font = '13px serif'; ctx.fillStyle = heaven ? '#8a8069' : '#8f8570'; ctx.fillText(`${Math.floor(p.sin.charge)}/${p.sin.need}`, bx, by + 24); }
  input.btns.skill = { x: bx, y: by, r: 52 };
  // first-charge tutorial: falling arrow over the sin button (combat.js arms the timer)
  if (G.sinReadyHintT > 0 && full) {
    const drop = ((G.time * 40) % 18);
    const ay = by - 78 + drop;
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.time * 8);
    ctx.fillStyle = '#B58D3B';
    ctx.beginPath();
    ctx.moveTo(bx, ay + 12); ctx.lineTo(bx - 8, ay); ctx.lineTo(bx + 8, ay);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(bx - 3, ay - 12, 6, 12);
    ctx.globalAlpha = 0.95;
    ctx.font = 'bold 12px serif';
    ctx.fillText('罪技已就绪', bx, ay - 20);
  }
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
