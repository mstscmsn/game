// Procedural area floor tiles + decorations. Each area gets a seamless-ish
// 384x384 tile canvas drawn with seeded RNG, plus fog/vignette params.
import { makeRng } from '../core/util.js';

export const AREA_BG = {}; // id -> {tile, deco:[canvas], fog, vignette, tint}

const T = 384;

// large silhouette props (§18: 大块黑色剪影) drawn once, scattered by render
function silhouette(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#050405';
  ctx.strokeStyle = 'rgba(216,199,164,0.14)';
  ctx.lineWidth = 2;
  draw(ctx, w, h);
  return c;
}
function buildDecos() {
  const D = {};
  D.ashfield = [
    silhouette(96, 150, (x, w, h) => { // dead tree
      x.beginPath(); x.moveTo(w * 0.45, h); x.lineTo(w * 0.5, h * 0.35); x.lineTo(w * 0.2, h * 0.1);
      x.moveTo(w * 0.5, h * 0.5); x.lineTo(w * 0.85, h * 0.2); x.moveTo(w * 0.48, h * 0.7); x.lineTo(w * 0.15, h * 0.55);
      x.lineWidth = 9; x.strokeStyle = '#050405'; x.stroke();
      x.lineWidth = 1.5; x.strokeStyle = 'rgba(216,199,164,0.12)'; x.stroke();
    }),
    silhouette(70, 100, (x, w, h) => { // leaning cross
      x.save(); x.translate(w / 2, h * 0.9); x.rotate(-0.12);
      x.fillRect(-6, -h * 0.85, 12, h * 0.85);
      x.fillRect(-26, -h * 0.62, 52, 11);
      x.restore(); x.strokeRect(w / 2 - 7, h * 0.08, 13, h * 0.8);
    }),
  ];
  D.cathedral = [
    silhouette(90, 160, (x, w, h) => { // broken column
      x.fillRect(w * 0.3, h * 0.15, w * 0.4, h * 0.85);
      x.fillRect(w * 0.2, h * 0.1, w * 0.6, 14);
      x.beginPath(); x.moveTo(w * 0.3, h * 0.15); x.lineTo(w * 0.5, 0); x.lineTo(w * 0.7, h * 0.15); x.fill();
      x.strokeRect(w * 0.3, h * 0.15, w * 0.4, h * 0.83);
    }),
    silhouette(70, 110, (x, w, h) => { // hanging censer
      x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h * 0.4); x.lineWidth = 3; x.strokeStyle = '#050405'; x.stroke();
      x.beginPath(); x.arc(w / 2, h * 0.62, w * 0.3, 0, 6.29); x.fill();
      x.lineWidth = 1.5; x.strokeStyle = 'rgba(181,141,59,0.25)';
      x.beginPath(); x.arc(w / 2, h * 0.62, w * 0.3, 0, 6.29); x.stroke();
    }),
  ];
  D.bells = [
    silhouette(110, 190, (x, w, h) => { // drowned bell tower
      x.fillRect(w * 0.28, h * 0.2, w * 0.44, h * 0.8);
      x.beginPath(); x.moveTo(w * 0.22, h * 0.2); x.lineTo(w / 2, 0); x.lineTo(w * 0.78, h * 0.2); x.fill();
      x.strokeRect(w * 0.28, h * 0.2, w * 0.44, h * 0.78);
      x.fillStyle = '#B58D3B'; x.globalAlpha = 0.35;
      x.fillRect(w * 0.42, h * 0.3, w * 0.16, h * 0.12);
      x.globalAlpha = 1;
    }),
    silhouette(90, 60, (x, w, h) => { // floating coffin
      x.save(); x.translate(w / 2, h / 2); x.rotate(0.1);
      x.fillRect(-w * 0.4, -10, w * 0.8, 20);
      x.strokeRect(-w * 0.4, -10, w * 0.8, 20);
      x.restore();
    }),
  ];
  D.hell = [
    silhouette(100, 150, (x, w, h) => { // furnace tree
      x.fillRect(w * 0.4, h * 0.3, w * 0.2, h * 0.7);
      x.beginPath(); x.arc(w / 2, h * 0.28, w * 0.3, 0, 6.29); x.fill();
      x.fillStyle = 'rgba(212,71,79,0.5)';
      x.beginPath(); x.arc(w / 2, h * 0.28, w * 0.12, 0, 6.29); x.fill();
    }),
    silhouette(80, 110, (x, w, h) => { // iron flower stalk
      x.beginPath(); x.moveTo(w / 2, h); x.quadraticCurveTo(w * 0.3, h * 0.5, w / 2, h * 0.25);
      x.lineWidth = 6; x.strokeStyle = '#050405'; x.stroke();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.283;
        x.beginPath(); x.moveTo(w / 2, h * 0.22);
        x.lineTo(w / 2 + Math.cos(a) * 22, h * 0.22 + Math.sin(a) * 22);
        x.lineWidth = 4; x.stroke();
      }
    }),
  ];
  D.fakeheaven = [
    silhouette(110, 130, (x, w, h) => { // white chapel (bright area: pale)
      x.fillStyle = 'rgba(238,235,221,0.85)';
      x.fillRect(w * 0.25, h * 0.35, w * 0.5, h * 0.6);
      x.beginPath(); x.moveTo(w * 0.2, h * 0.35); x.lineTo(w / 2, h * 0.08); x.lineTo(w * 0.8, h * 0.35); x.fill();
      x.strokeStyle = 'rgba(90,85,70,0.4)';
      x.strokeRect(w * 0.25, h * 0.35, w * 0.5, h * 0.58);
      x.beginPath(); x.moveTo(w / 2, h * 0.02); x.lineTo(w / 2, h * 0.1); x.moveTo(w * 0.46, h * 0.05); x.lineTo(w * 0.54, h * 0.05); x.stroke();
    }),
  ];
  D.trueheaven = [
    silhouette(120, 180, (x, w, h) => { // rib arch
      x.lineWidth = 10; x.strokeStyle = '#050405';
      x.beginPath(); x.moveTo(w * 0.15, h); x.quadraticCurveTo(w * 0.2, h * 0.1, w / 2, h * 0.08);
      x.quadraticCurveTo(w * 0.8, h * 0.1, w * 0.85, h); x.stroke();
      x.lineWidth = 1.5; x.strokeStyle = 'rgba(124,95,138,0.3)'; x.stroke();
    }),
  ];
  D.corpsesea = [
    silhouette(130, 100, (x, w, h) => { // half-sunken dead sun
      x.beginPath(); x.arc(w / 2, h, w * 0.4, Math.PI, 0); x.fill();
      x.strokeStyle = 'rgba(142,31,47,0.35)'; x.lineWidth = 3;
      x.beginPath(); x.arc(w / 2, h, w * 0.4, Math.PI, 0); x.stroke();
    }),
  ];
  return D;
}
export let DECOS = {};

function mk(fn, seed) {
  const c = document.createElement('canvas');
  c.width = T; c.height = T;
  const ctx = c.getContext('2d');
  fn(ctx, makeRng(seed));
  return c;
}
function speckle(ctx, rng, n, colors, s0 = 1, s1 = 3) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(rng() * colors.length) | 0];
    const s = s0 + rng() * (s1 - s0);
    ctx.fillRect(rng() * T, rng() * T, s, s);
  }
}

export function buildBackgrounds() {
  DECOS = buildDecos();
  // 灰葬原野 — ash-grey soil, dead wheat, bones
  AREA_BG.ashfield = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#191519'; ctx.fillRect(0, 0, T, T);
      speckle(ctx, rng, 420, ['#211c21', '#121014', '#262027', '#1c1720'], 2, 5);
      // faint path stones
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = 'rgba(70,64,58,0.28)';
        const x = rng() * T, y = rng() * T;
        ctx.fillRect(x, y, 10 + rng() * 8, 7 + rng() * 6);
      }
      // dead wheat tufts
      for (let i = 0; i < 26; i++) {
        const x = rng() * T, y = rng() * T;
        ctx.strokeStyle = rng() < 0.5 ? '#3a3226' : '#4a4030';
        ctx.lineWidth = 1;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath(); ctx.moveTo(x + j * 3, y);
          ctx.lineTo(x + j * 3 + (rng() * 4 - 2), y - 6 - rng() * 6); ctx.stroke();
        }
      }
      // half-buried bones
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = '#4d4638';
        const x = rng() * T, y = rng() * T;
        ctx.fillRect(x, y, 8 + rng() * 10, 2);
      }
    }, 11), fog: 'rgba(90,85,90,0.05)', vignette: 0.48, tint: null,
  };
  // 腐香大教堂 — cracked cathedral tiles
  AREA_BG.cathedral = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#191216'; ctx.fillRect(0, 0, T, T);
      const s = 48;
      for (let y = 0; y < T; y += s) for (let x = 0; x < T; x += s) {
        ctx.strokeStyle = 'rgba(216,199,164,0.07)';
        ctx.strokeRect(x + 0.5, y + 0.5, s, s);
        if (rng() < 0.18) { ctx.fillStyle = 'rgba(73,54,79,0.25)'; ctx.fillRect(x + 4, y + 4, s - 8, s - 8); }
        if (rng() < 0.12) { // crack
          ctx.strokeStyle = 'rgba(11,10,12,0.8)'; ctx.beginPath();
          ctx.moveTo(x + rng() * s, y); ctx.lineTo(x + rng() * s, y + s); ctx.stroke();
        }
      }
      speckle(ctx, rng, 150, ['#241a20', '#2a1a24'], 1, 3);
    }, 22), fog: 'rgba(120,150,90,0.045)', vignette: 0.6, tint: 'rgba(73,54,79,0.06)',
  };
  // 七钟沉城 — flooded streets, dark water
  AREA_BG.bells = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#0d1218'; ctx.fillRect(0, 0, T, T);
      for (let i = 0; i < 40; i++) { // ripples
        ctx.strokeStyle = `rgba(70,96,138,${0.05 + rng() * 0.08})`;
        const x = rng() * T, y = rng() * T, r = 6 + rng() * 22;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // submerged cobbles
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = 'rgba(42,52,72,0.35)';
        ctx.fillRect(rng() * T, rng() * T, 6 + rng() * 8, 4 + rng() * 5);
      }
      speckle(ctx, rng, 100, ['#11151E', '#141a26'], 2, 4);
    }, 33), fog: 'rgba(40,60,100,0.06)', vignette: 0.62, tint: 'rgba(17,21,30,0.15)', water: true,
  };
  // 终末白廊 — pure white corridor
  AREA_BG.corridor = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#e9e5da'; ctx.fillRect(0, 0, T, T);
      for (let y = 0; y < T; y += 64) { ctx.strokeStyle = 'rgba(150,145,130,0.25)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(T, y); ctx.stroke(); }
      for (let x = 0; x < T; x += 64) { ctx.strokeStyle = 'rgba(150,145,130,0.18)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, T); ctx.stroke(); }
    }, 44), fog: null, vignette: 0.2, tint: null, bright: true,
  };
  // 堕翼审判庭 — black floor of closed eyes
  AREA_BG.tribunal = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#0a090c'; ctx.fillRect(0, 0, T, T);
      for (let i = 0; i < 48; i++) { // closed eyes
        const x = rng() * T, y = rng() * T, w = 8 + rng() * 8;
        ctx.strokeStyle = 'rgba(216,199,164,0.16)';
        ctx.beginPath(); ctx.moveTo(x - w / 2, y);
        ctx.quadraticCurveTo(x, y + 4, x + w / 2, y); ctx.stroke();
        for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(x - w / 4 + l * w / 4, y + 1); ctx.lineTo(x - w / 4 + l * w / 4 - 1, y + 4); ctx.stroke(); }
      }
      // judgment ring segments
      ctx.strokeStyle = 'rgba(181,141,59,0.1)';
      ctx.beginPath(); ctx.arc(T / 2, T / 2, T * 0.45, 0, Math.PI * 2); ctx.stroke();
    }, 55), fog: null, vignette: 0.75, tint: null,
  };
  // 地狱铁花园 — black iron flowers over lava veins
  AREA_BG.hell = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#160c0c'; ctx.fillRect(0, 0, T, T);
      // lava veins
      for (let i = 0; i < 10; i++) {
        let x = rng() * T, y = rng() * T;
        ctx.strokeStyle = `rgba(201,107,47,${0.25 + rng() * 0.3})`;
        ctx.lineWidth = 1 + rng() * 2;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 6; j++) { x += rng() * 40 - 20; y += rng() * 40 - 20; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      // iron flowers
      for (let i = 0; i < 14; i++) {
        const x = rng() * T, y = rng() * T, r = 4 + rng() * 5;
        ctx.strokeStyle = 'rgba(90,95,102,0.5)';
        for (let p = 0; p < 6; p++) {
          const a = p / 6 * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * r * 2, y + Math.sin(a) * r * 2); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(212,71,79,0.4)'; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      speckle(ctx, rng, 200, ['#1c1010', '#241412'], 2, 4);
    }, 66), fog: 'rgba(200,90,40,0.05)', vignette: 0.6, tint: 'rgba(140,40,20,0.05)',
  };
  // 假天堂 — bright meadow
  AREA_BG.fakeheaven = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#a8b06a'; ctx.fillRect(0, 0, T, T);
      speckle(ctx, rng, 500, ['#b7bd78', '#9aa35e', '#c2c887'], 2, 5);
      for (let i = 0; i < 30; i++) { // white flowers
        const x = rng() * T, y = rng() * T;
        ctx.fillStyle = '#EEEBDD';
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillStyle = '#e8d98a'; ctx.fillRect(x, y, 1, 1);
      }
      // golden wheat patches
      for (let i = 0; i < 12; i++) {
        const x = rng() * T, y = rng() * T;
        ctx.strokeStyle = 'rgba(216,180,90,0.6)';
        for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x + j * 2, y); ctx.lineTo(x + j * 2, y - 5 - rng() * 4); ctx.stroke(); }
      }
    }, 77), fog: null, vignette: 0.15, tint: null, bright: true,
  };
  // 真天堂 — organic black cathedral, nerves and stars
  AREA_BG.trueheaven = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#0c0f16'; ctx.fillRect(0, 0, T, T);
      // nerve pathways
      for (let i = 0; i < 12; i++) {
        let x = rng() * T, y = rng() * T;
        ctx.strokeStyle = `rgba(124,95,138,${0.15 + rng() * 0.2})`;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) {
          const nx = x + rng() * 60 - 30, ny = y + rng() * 60 - 30;
          ctx.quadraticCurveTo(x + rng() * 30 - 15, y + rng() * 30 - 15, nx, ny);
          x = nx; y = ny;
        }
        ctx.stroke();
      }
      // stars as neural nodes
      for (let i = 0; i < 40; i++) {
        const x = rng() * T, y = rng() * T;
        ctx.fillStyle = `rgba(233,229,218,${0.2 + rng() * 0.5})`;
        ctx.fillRect(x, y, rng() < 0.2 ? 2 : 1, rng() < 0.2 ? 2 : 1);
      }
      // rib arches
      for (let i = 0; i < 5; i++) {
        const x = rng() * T, y = rng() * T, r = 20 + rng() * 30;
        ctx.strokeStyle = 'rgba(42,52,72,0.55)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r, Math.PI, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }, 88), fog: 'rgba(73,54,79,0.06)', vignette: 0.7, tint: null, breathing: true,
  };
  // 天外尸海 — sea of dead worlds
  AREA_BG.corpsesea = {
    tile: mk((ctx, rng) => {
      ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, T, T);
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(233,229,218,${0.1 + rng() * 0.4})`;
        ctx.fillRect(rng() * T, rng() * T, 1, 1);
      }
      // broken sun skulls
      for (let i = 0; i < 4; i++) {
        const x = rng() * T, y = rng() * T, r = 10 + rng() * 14;
        ctx.strokeStyle = 'rgba(142,31,47,0.4)';
        ctx.beginPath(); ctx.arc(x, y, r, rng() * 3, rng() * 3 + 4); ctx.stroke();
      }
      // waves of black
      for (let i = 0; i < 20; i++) {
        ctx.strokeStyle = 'rgba(73,54,79,0.25)';
        const y = rng() * T;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= T; x += 24) ctx.lineTo(x, y + Math.sin(x / 30 + i) * 5);
        ctx.stroke();
      }
    }, 99), fog: 'rgba(73,54,79,0.07)', vignette: 0.7, tint: null,
  };
}
