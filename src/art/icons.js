// Vector glyph icons for weapons / catalysts / relics / stats, drawn on 48px canvases.
const S = 48, C = 24; // size, center
const cache = new Map();

function cv() { const c = document.createElement('canvas'); c.width = S; c.height = S; return c; }
const COL = { bone: '#D8C7A4', dim: '#8f8570', blood: '#8E1F2F', red: '#D4474F', gold: '#B58D3B', purple: '#7c5f8a', green: '#75876B', white: '#EEEBDD', steel: '#9aa1a8', ink: '#0B0A0C', orange: '#c96b2f', navy: '#46608a' };

function pen(ctx, col, w = 2.5) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
function ln(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function cir(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); }
function poly(ctx, pts, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); fill ? ctx.fill() : ctx.stroke(); }

const DRAW = {
  /* ---- weapons ---- */
  saw(ctx) { pen(ctx, COL.bone); cir(ctx, C, C, 13); ctx.fillStyle = COL.bone; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; poly(ctx, [[C + Math.cos(a) * 13, C + Math.sin(a) * 13], [C + Math.cos(a + 0.2) * 18, C + Math.sin(a + 0.2) * 18], [C + Math.cos(a + 0.4) * 13, C + Math.sin(a + 0.4) * 13]], true); } ctx.fillStyle = COL.blood; cir(ctx, C, C, 4, true); },
  bell(ctx) { pen(ctx, COL.gold); ctx.fillStyle = COL.gold; ctx.beginPath(); ctx.moveTo(C - 10, C + 8); ctx.quadraticCurveTo(C - 10, C - 12, C, C - 12); ctx.quadraticCurveTo(C + 10, C - 12, C + 10, C + 8); ctx.closePath(); ctx.stroke(); ln(ctx, C - 13, C + 8, C + 13, C + 8); cir(ctx, C, C + 12, 2.5, true); ln(ctx, C, C - 12, C, C - 16); },
  spear(ctx) { pen(ctx, COL.bone); ln(ctx, C - 12, C + 14, C + 6, C - 8); for (let i = 0; i < 4; i++) ln(ctx, C - 8 + i * 4, C + 9 - i * 5, C - 12 + i * 4, C + 5 - i * 5); pen(ctx, COL.gold); poly(ctx, [[C + 4, C - 6], [C + 14, C - 16], [C + 8, C - 2]], true); },
  scripture(ctx) { pen(ctx, COL.bone); ctx.strokeRect(C - 10, C - 12, 20, 24); pen(ctx, COL.dim, 1.5); ln(ctx, C - 6, C - 6, C + 6, C - 6); ln(ctx, C - 6, C - 1, C + 6, C - 1); ln(ctx, C - 6, C + 4, C + 2, C + 4); pen(ctx, COL.red); cir(ctx, C + 8, C + 9, 3); },
  censer(ctx) { pen(ctx, COL.gold); cir(ctx, C, C + 4, 9); ln(ctx, C, C - 5, C, C - 14); ln(ctx, C - 6, C + 1, C + 6, C + 1); pen(ctx, COL.green, 2); ctx.beginPath(); ctx.moveTo(C - 4, C - 10); ctx.quadraticCurveTo(C - 8, C - 16, C - 4, C - 20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(C + 4, C - 10); ctx.quadraticCurveTo(C + 8, C - 16, C + 4, C - 20); ctx.stroke(); },
  lantern(ctx) { pen(ctx, COL.bone); ctx.strokeRect(C - 7, C - 8, 14, 18); ln(ctx, C - 7, C - 8, C, C - 14); ln(ctx, C + 7, C - 8, C, C - 14); ctx.fillStyle = COL.navy; cir(ctx, C, C + 1, 4, true); ctx.fillStyle = COL.white; cir(ctx, C - 1, C, 1.5, true); },
  chain(ctx) { pen(ctx, COL.steel); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(C - 9 + i * 6, C - 6 + i * 5, 4, 6, -0.6, 0, Math.PI * 2); ctx.stroke(); } pen(ctx, COL.blood); ln(ctx, C + 8, C + 10, C + 12, C + 14); },
  chalice(ctx) { pen(ctx, COL.gold); ctx.beginPath(); ctx.arc(C, C - 4, 9, 0, Math.PI); ctx.stroke(); ln(ctx, C, C + 5, C, C + 12); ln(ctx, C - 6, C + 14, C + 6, C + 14); ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(C, C - 4, 6, 0, Math.PI); ctx.fill(); ctx.fillRect(C - 6, C - 7, 12, 3); },
  raven(ctx) { ctx.fillStyle = COL.ink; pen(ctx, COL.dim, 1.5); poly(ctx, [[C - 12, C + 2], [C - 2, C - 10], [C + 4, C - 4], [C + 14, C - 8], [C + 6, C + 4], [C + 8, C + 12], [C - 2, C + 6]], true); ctx.stroke(); ctx.fillStyle = COL.red; cir(ctx, C - 1, C - 4, 1.5, true); },
  mirror(ctx) { pen(ctx, COL.gold); ctx.beginPath(); ctx.ellipse(C, C - 2, 9, 12, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#2a3448'; ctx.beginPath(); ctx.ellipse(C, C - 2, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); pen(ctx, COL.white, 1.5); ln(ctx, C - 3, C - 8, C - 1, C - 2); ln(ctx, C, C + 10, C, C + 16); },
  wingblade(ctx) { pen(ctx, COL.white); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(C - 10, C + 8 - i * 6); ctx.quadraticCurveTo(C + 2, C + 2 - i * 6, C + 14, C + 6 - i * 6); ctx.stroke(); } pen(ctx, COL.red, 1.5); ln(ctx, C + 10, C - 8, C + 14, C - 12); },
  musket(ctx) { pen(ctx, COL.steel); ln(ctx, C - 14, C + 10, C + 8, C - 6); pen(ctx, COL.steel, 4); ln(ctx, C - 2, C + 2, C + 12, C - 9); ctx.fillStyle = COL.orange; cir(ctx, C + 13, C - 10, 3.5, true); pen(ctx, COL.dim, 2); ln(ctx, C - 10, C + 8, C - 6, C + 13); },
  bow(ctx) { pen(ctx, COL.bone); ctx.beginPath(); ctx.arc(C - 2, C, 13, -1.1, 1.1); ctx.stroke(); ln(ctx, C + 3, C - 12, C + 3, C + 12); pen(ctx, COL.dim); ln(ctx, C - 8, C, C + 10, C); poly(ctx, [[C + 10, C], [C + 5, C - 3], [C + 5, C + 3]], true); },
  wheel(ctx) { pen(ctx, COL.bone); cir(ctx, C, C, 13); cir(ctx, C, C, 5); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ln(ctx, C + Math.cos(a) * 5, C + Math.sin(a) * 5, C + Math.cos(a) * 13, C + Math.sin(a) * 13); } },
  dagger(ctx) { pen(ctx, COL.bone); poly(ctx, [[C - 2, C - 14], [C + 2, C - 14], [C + 1, C + 4], [C - 1, C + 4]], true); ctx.fillStyle = COL.bone; ctx.fill(); ln(ctx, C - 6, C + 5, C + 6, C + 5); ln(ctx, C, C + 5, C, C + 12); pen(ctx, COL.red, 1.5); ln(ctx, C + 1, C - 10, C + 1, C - 2); },
  harp(ctx) { pen(ctx, COL.gold); ctx.beginPath(); ctx.moveTo(C - 8, C + 12); ctx.quadraticCurveTo(C - 12, C - 10, C + 2, C - 12); ctx.stroke(); ln(ctx, C - 8, C + 12, C + 10, C + 8); pen(ctx, COL.bone, 1.2); for (let i = 0; i < 4; i++) ln(ctx, C - 5 + i * 4, C - 9 + i * 1.5, C - 4 + i * 4, C + 10); },
  /* ---- misc / stats ---- */
  hp(ctx) { ctx.fillStyle = COL.red; ctx.beginPath(); ctx.moveTo(C, C + 10); ctx.bezierCurveTo(C - 16, C - 2, C - 8, C - 14, C, C - 5); ctx.bezierCurveTo(C + 8, C - 14, C + 16, C - 2, C, C + 10); ctx.fill(); },
  armor(ctx) { pen(ctx, COL.steel); poly(ctx, [[C, C - 12], [C + 10, C - 7], [C + 10, C + 4], [C, C + 12], [C - 10, C + 4], [C - 10, C - 7]]); ctx.fillStyle = 'rgba(154,161,168,.3)'; ctx.fill(); },
  speed(ctx) { pen(ctx, COL.bone); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(C - 12, C - 6 + i * 6); ctx.lineTo(C + 6 - i * 2, C - 6 + i * 6); ctx.stroke(); } poly(ctx, [[C + 6, C - 12], [C + 14, C], [C + 6, C + 12]], false); },
  dmg(ctx) { pen(ctx, COL.red); ln(ctx, C - 10, C + 12, C + 8, C - 10); ln(ctx, C + 4, C - 12, C + 12, C - 4); ln(ctx, C - 6, C + 2, C + 2, C + 10); pen(ctx, COL.dim, 2); ln(ctx, C - 12, C + 8, C - 8, C + 12); },
  magnet(ctx) { pen(ctx, COL.gold, 3); ctx.beginPath(); ctx.arc(C, C - 2, 9, Math.PI, 0); ctx.stroke(); ln(ctx, C - 9, C - 2, C - 9, C + 8); ln(ctx, C + 9, C - 2, C + 9, C + 8); pen(ctx, COL.white, 3); ln(ctx, C - 9, C + 8, C - 9, C + 12); ln(ctx, C + 9, C + 8, C + 9, C + 12); },
  cdr(ctx) { pen(ctx, COL.bone); cir(ctx, C, C, 12); ln(ctx, C, C, C, C - 8); ln(ctx, C, C, C + 6, C + 3); pen(ctx, COL.gold, 2); ctx.beginPath(); ctx.arc(C, C, 12, -0.5, 0.9); ctx.stroke(); },
  xp(ctx) { ctx.fillStyle = COL.navy; poly(ctx, [[C, C - 12], [C + 9, C], [C, C + 12], [C - 9, C]], true); ctx.fillStyle = COL.white; poly(ctx, [[C, C - 5], [C + 4, C], [C, C + 5], [C - 4, C]], true); },
  luck(ctx) { pen(ctx, COL.green); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; cir(ctx, C + Math.cos(a) * 6, C + Math.sin(a) * 6, 4.5); } ln(ctx, C, C + 4, C - 3, C + 13); },
  crit(ctx) { pen(ctx, COL.red); cir(ctx, C, C, 11); cir(ctx, C, C, 5); ctx.fillStyle = COL.red; cir(ctx, C, C, 1.8, true); ln(ctx, C - 15, C, C - 8, C); ln(ctx, C + 8, C, C + 15, C); ln(ctx, C, C - 15, C, C - 8); ln(ctx, C, C + 8, C, C + 15); },
  area(ctx) { pen(ctx, COL.bone); cir(ctx, C, C, 6); pen(ctx, 'rgba(216,199,164,.5)'); cir(ctx, C, C, 11); pen(ctx, 'rgba(216,199,164,.25)'); cir(ctx, C, C, 15); },
  shield(ctx) { pen(ctx, COL.navy); poly(ctx, [[C, C - 12], [C + 10, C - 8], [C + 8, C + 6], [C, C + 12], [C - 8, C + 6], [C - 10, C - 8]]); pen(ctx, COL.white, 1.5); ln(ctx, C, C - 7, C, C + 7); },
  revive(ctx) { pen(ctx, COL.green); ctx.beginPath(); ctx.arc(C, C, 10, 0.6, Math.PI * 2 + 0.1); ctx.stroke(); poly(ctx, [[C + 8, C - 8], [C + 14, C - 6], [C + 9, C - 1]], true); ctx.fillStyle = COL.green; ctx.fill(); },
  skull(ctx) { ctx.fillStyle = COL.bone; cir(ctx, C, C - 2, 10, true); ctx.fillRect(C - 6, C + 4, 12, 6); ctx.fillStyle = COL.ink; cir(ctx, C - 4, C - 3, 2.5, true); cir(ctx, C + 4, C - 3, 2.5, true); poly(ctx, [[C, C + 1], [C - 2, C + 5], [C + 2, C + 5]], true); },
  sun(ctx) { ctx.fillStyle = COL.ink; cir(ctx, C, C, 10, true); pen(ctx, COL.red); cir(ctx, C, C, 10); pen(ctx, COL.red, 1.5); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ln(ctx, C + Math.cos(a) * 12, C + Math.sin(a) * 12, C + Math.cos(a) * 16, C + Math.sin(a) * 16); } },
  key(ctx) { pen(ctx, COL.gold); cir(ctx, C - 5, C - 5, 5); ln(ctx, C - 1, C - 1, C + 10, C + 10); ln(ctx, C + 7, C + 7, C + 11, C + 3); ln(ctx, C + 10, C + 10, C + 14, C + 6); },
  eye(ctx) { pen(ctx, COL.bone); ctx.beginPath(); ctx.moveTo(C - 13, C); ctx.quadraticCurveTo(C, C - 11, C + 13, C); ctx.quadraticCurveTo(C, C + 11, C - 13, C); ctx.stroke(); ctx.fillStyle = COL.purple; cir(ctx, C, C, 4.5, true); },
  ring(ctx) { pen(ctx, COL.gold); cir(ctx, C, C + 2, 8); ctx.fillStyle = COL.ink; poly(ctx, [[C, C - 14], [C + 5, C - 7], [C, C - 3], [C - 5, C - 7]], true); pen(ctx, COL.dim, 1); poly(ctx, [[C, C - 14], [C + 5, C - 7], [C, C - 3], [C - 5, C - 7]]); },
  coin(ctx) { pen(ctx, COL.gold); cir(ctx, C, C, 11); ln(ctx, C, C - 7, C, C + 7); ln(ctx, C - 5, C - 4, C + 5, C - 4); ln(ctx, C - 5, C + 4, C + 5, C + 4); pen(ctx, COL.red, 1.5); ln(ctx, C - 11, C + 11, C + 11, C - 11); },
  cord(ctx) { pen(ctx, COL.purple); ctx.beginPath(); ctx.moveTo(C - 12, C - 10); ctx.bezierCurveTo(C + 8, C - 14, C - 10, C + 8, C + 4, C + 4); ctx.stroke(); ctx.fillStyle = COL.red; cir(ctx, C + 6, C + 6, 4, true); },
  needle(ctx) { pen(ctx, COL.steel); ln(ctx, C - 10, C + 12, C + 10, C - 12); cir(ctx, C + 10, C - 12, 2.5); pen(ctx, COL.red, 1.2); ctx.beginPath(); ctx.moveTo(C - 10, C + 12); ctx.quadraticCurveTo(C - 2, C + 2, C - 8, C - 6); ctx.stroke(); },
  ledger(ctx) { pen(ctx, COL.dim); ctx.strokeRect(C - 9, C - 11, 18, 22); pen(ctx, COL.steel, 1.5); for (let i = 0; i < 4; i++) ln(ctx, C - 5, C - 6 + i * 4, C + 5, C - 6 + i * 4); pen(ctx, COL.steel, 2); ctx.beginPath(); ctx.ellipse(C, C, 13, 6, 0.7, 0, Math.PI * 2); ctx.stroke(); },
  hourglass(ctx) { pen(ctx, COL.bone); ln(ctx, C - 8, C - 11, C + 8, C - 11); ln(ctx, C - 8, C + 11, C + 8, C + 11); ln(ctx, C - 8, C - 11, C + 8, C + 11); ln(ctx, C + 8, C - 11, C - 8, C + 11); pen(ctx, COL.ink, 1); ctx.fillStyle = '#3a3230'; poly(ctx, [[C - 4, C - 8], [C + 4, C - 8], [C, C - 2]], true); },
  mask(ctx) { pen(ctx, COL.white); ctx.fillStyle = COL.white; ctx.beginPath(); ctx.ellipse(C, C, 9, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(C - 4, C - 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(C + 4, C - 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); pen(ctx, COL.ink, 1.5); ctx.beginPath(); ctx.arc(C, C + 4, 4, 0.3, Math.PI - 0.3); ctx.stroke(); },
  feather(ctx) { pen(ctx, COL.white); ctx.beginPath(); ctx.moveTo(C - 10, C + 12); ctx.quadraticCurveTo(C - 4, C - 14, C + 10, C - 12); ctx.quadraticCurveTo(C + 4, C + 4, C - 10, C + 12); ctx.stroke(); pen(ctx, COL.dim, 1.2); ln(ctx, C - 8, C + 10, C + 8, C - 10); pen(ctx, COL.orange, 1.5); ln(ctx, C + 8, C - 10, C + 11, C - 13); },
  invite(ctx) { pen(ctx, COL.bone); ctx.strokeRect(C - 11, C - 8, 22, 16); ln(ctx, C - 11, C - 8, C, C + 2); ln(ctx, C + 11, C - 8, C, C + 2); ctx.fillStyle = COL.ink; cir(ctx, C, C + 3, 3.5, true); pen(ctx, COL.red, 1); cir(ctx, C, C + 3, 3.5); },
  seedface(ctx) { pen(ctx, COL.steel); ctx.beginPath(); ctx.ellipse(C, C, 8, 11, 0, 0, Math.PI * 2); ctx.stroke(); pen(ctx, COL.steel, 1.5); ln(ctx, C - 3, C - 3, C - 1, C - 3); ln(ctx, C + 1, C - 3, C + 3, C - 3); ctx.beginPath(); ctx.arc(C, C + 3, 3, 0.2, Math.PI - 0.2); ctx.stroke(); pen(ctx, COL.green, 1.5); ln(ctx, C, C - 11, C - 4, C - 16); },
  bottle(ctx) { pen(ctx, COL.bone); ctx.strokeRect(C - 6, C - 4, 12, 15); ln(ctx, C - 3, C - 4, C - 3, C - 12); ln(ctx, C + 3, C - 4, C + 3, C - 12); ln(ctx, C - 5, C - 12, C + 5, C - 12); ctx.fillStyle = COL.orange; ctx.fillRect(C - 5, C + 3, 10, 7); ctx.fillStyle = COL.red; ctx.fillRect(C - 5, C + 1, 10, 2); },
  dice(ctx) { pen(ctx, COL.bone); poly(ctx, [[C, C - 13], [C + 11, C - 6], [C + 11, C + 6], [C, C + 13], [C - 11, C + 6], [C - 11, C - 6]]); ln(ctx, C, C - 13, C, C); ln(ctx, C - 11, C + 6, C, C); ln(ctx, C + 11, C + 6, C, C); ctx.fillStyle = COL.red; cir(ctx, C, C - 6, 1.5, true); cir(ctx, C - 5, C + 5, 1.5, true); cir(ctx, C + 5, C + 5, 1.5, true); },
  statue(ctx) { pen(ctx, COL.dim); ln(ctx, C - 7, C - 12, C + 7, C - 12); ln(ctx, C, C - 12, C, C + 6); ln(ctx, C - 5, C - 7, C + 5, C - 7); pen(ctx, COL.dim, 3); ln(ctx, C - 7, C + 12, C + 7, C + 12); ln(ctx, C - 5, C + 9, C + 5, C + 9); },
  salt(ctx) { pen(ctx, COL.bone); poly(ctx, [[C - 8, C - 8], [C + 8, C - 8], [C + 10, C + 10], [C - 10, C + 10]]); ln(ctx, C - 6, C - 8, C - 4, C - 13); ln(ctx, C + 6, C - 8, C + 4, C - 13); ctx.fillStyle = COL.ink; for (let i = 0; i < 8; i++) { const a = i * 2.4; ctx.fillRect(C - 6 + (i % 4) * 4, C - 2 + ((i / 4) | 0) * 5, 2, 2); } },
  mercyknife(ctx) { pen(ctx, COL.steel); poly(ctx, [[C - 3, C - 13], [C + 3, C - 13], [C + 3, C + 3], [C, C + 6], [C - 3, C + 3]]); ln(ctx, C - 7, C + 6, C + 7, C + 6); ln(ctx, C, C + 6, C, C + 13); pen(ctx, COL.white, 1); ln(ctx, C, C - 10, C, C + 1); },
  crownempty(ctx) { pen(ctx, COL.gold); poly(ctx, [[C - 11, C + 8], [C - 11, C - 4], [C - 5, C + 1], [C, C - 8], [C + 5, C + 1], [C + 11, C - 4], [C + 11, C + 8]]); pen(ctx, COL.dim, 1); ln(ctx, C - 8, C + 12, C + 8, C + 12); },
  tooth(ctx) { pen(ctx, COL.bone); ctx.fillStyle = COL.bone; ctx.beginPath(); ctx.moveTo(C - 7, C - 8); ctx.quadraticCurveTo(C, C - 14, C + 7, C - 8); ctx.quadraticCurveTo(C + 8, C + 2, C + 4, C + 10); ctx.lineTo(C + 2, C + 4); ctx.quadraticCurveTo(C, C + 2, C - 2, C + 4); ctx.lineTo(C - 4, C + 10); ctx.quadraticCurveTo(C - 8, C + 2, C - 7, C - 8); ctx.fill(); ctx.fillStyle = COL.red; cir(ctx, C, C - 6, 1.5, true); },
  nail(ctx) { pen(ctx, COL.gold, 3); ln(ctx, C - 8, C - 10, C + 2, C - 10); pen(ctx, COL.gold, 2.5); ln(ctx, C - 3, C - 10, C + 8, C + 12); poly(ctx, [[C + 8, C + 12], [C + 10, C + 7], [C + 5, C + 9]], true); },
  candleblack(ctx) { pen(ctx, COL.ink); ctx.fillStyle = '#1b171c'; ctx.fillRect(C - 4, C - 6, 8, 18); pen(ctx, COL.dim, 1); ctx.strokeRect(C - 4, C - 6, 8, 18); ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.ellipse(C, C - 11, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); },
  vial(ctx) { pen(ctx, COL.bone); cir(ctx, C, C + 4, 8); ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(C, C + 4, 8, 0.3, Math.PI - 0.3); ctx.fill(); ln(ctx, C - 3, C - 4, C - 3, C - 12); ln(ctx, C + 3, C - 4, C + 3, C - 12); },
  glasseye(ctx) { pen(ctx, COL.steel); cir(ctx, C, C, 10); ctx.fillStyle = COL.navy; cir(ctx, C, C, 5, true); ctx.fillStyle = COL.white; cir(ctx, C - 2, C - 2, 1.5, true); pen(ctx, COL.steel, 1); cir(ctx, C, C, 13); },
  rosary(ctx) { pen(ctx, COL.steel); cir(ctx, C, C - 2, 9); ctx.fillStyle = COL.red; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cir(ctx, C + Math.cos(a) * 9, C - 2 + Math.sin(a) * 9, 1.6, true); } pen(ctx, COL.steel, 1.5); ln(ctx, C, C + 7, C, C + 13); ln(ctx, C - 3, C + 10, C + 3, C + 10); },
  ratking(ctx) { pen(ctx, COL.dim); ctx.fillStyle = COL.dim; ctx.beginPath(); ctx.ellipse(C - 3, C + 2, 7, 5, 0.3, 0, Math.PI * 2); ctx.fill(); poly(ctx, [[C + 3, C - 1], [C + 10, C - 5], [C + 8, C + 1]], true); pen(ctx, COL.bone, 1.5); ln(ctx, C + 7, C - 2, C + 9, C + 2); ctx.beginPath(); ctx.moveTo(C - 9, C + 4); ctx.quadraticCurveTo(C - 15, C + 8, C - 11, C + 12); ctx.stroke(); },
  gravehand(ctx) { pen(ctx, COL.dim); ctx.strokeRect(C - 8, C - 4, 16, 16); pen(ctx, COL.bone, 2); for (let i = 0; i < 4; i++) ln(ctx, C - 5 + i * 3.5, C - 4, C - 5 + i * 3.5, C - 12 + (i % 2) * 2); },
  gunpowder(ctx) { pen(ctx, COL.gold); ctx.strokeRect(C - 9, C - 7, 18, 16); ln(ctx, C - 9, C - 1, C + 9, C - 1); ctx.fillStyle = COL.orange; cir(ctx, C, C + 4, 3, true); pen(ctx, COL.red, 1.2); ln(ctx, C, C - 7, C, C - 13); cir(ctx, C, C - 14, 1.5); },
  boneoil(ctx) { pen(ctx, COL.bone); cir(ctx, C, C + 5, 8); ln(ctx, C - 3, C - 3, C - 4, C - 12); ln(ctx, C + 3, C - 3, C + 4, C - 12); ctx.fillStyle = '#3a3230'; ctx.beginPath(); ctx.arc(C, C + 5, 8, 0.4, Math.PI - 0.4); ctx.fill(); pen(ctx, COL.bone, 1.5); ln(ctx, C - 6, C - 14, C - 2, C - 14); ln(ctx, C + 2, C - 14, C + 6, C - 14); },
  tongue(ctx) { pen(ctx, COL.red); ctx.fillStyle = COL.red; ctx.beginPath(); ctx.moveTo(C - 6, C - 10); ctx.quadraticCurveTo(C - 8, C + 6, C, C + 12); ctx.quadraticCurveTo(C + 8, C + 6, C + 6, C - 10); ctx.closePath(); ctx.fill(); pen(ctx, COL.ink, 1.5); ln(ctx, C, C - 6, C, C + 8); pen(ctx, COL.steel, 1.5); ln(ctx, C - 8, C - 10, C + 8, C - 10); },
  silkstring(ctx) { pen(ctx, COL.white, 1.5); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(C - 12, C - 8 + i * 8); ctx.quadraticCurveTo(C, C - 14 + i * 8, C + 12, C - 8 + i * 8); ctx.stroke(); } pen(ctx, COL.red, 2); ln(ctx, C, C - 12, C, C + 12); },
  twinmask(ctx) { pen(ctx, COL.white); ctx.beginPath(); ctx.ellipse(C - 5, C - 2, 6, 9, -0.2, 0, Math.PI * 2); ctx.stroke(); pen(ctx, COL.ink); ctx.fillStyle = '#1b171c'; ctx.beginPath(); ctx.ellipse(C + 5, C + 2, 6, 9, 0.2, 0, Math.PI * 2); ctx.fill(); pen(ctx, COL.dim, 1); ctx.stroke(); },
  ashfeather(ctx) { pen(ctx, COL.dim); ctx.beginPath(); ctx.moveTo(C - 10, C + 12); ctx.quadraticCurveTo(C - 2, C - 12, C + 10, C - 12); ctx.quadraticCurveTo(C + 2, C + 6, C - 10, C + 12); ctx.stroke(); pen(ctx, COL.dim, 1); ln(ctx, C - 7, C + 9, C + 7, C - 9); },
  heartscar(ctx) { ctx.fillStyle = COL.blood; ctx.beginPath(); ctx.moveTo(C, C + 10); ctx.bezierCurveTo(C - 15, C - 2, C - 7, C - 13, C, C - 4); ctx.bezierCurveTo(C + 7, C - 13, C + 15, C - 2, C, C + 10); ctx.fill(); pen(ctx, COL.bone, 1.5); ln(ctx, C - 5, C - 6, C + 4, C + 4); ln(ctx, C - 1, C - 8, C - 3, C - 2); },
  belltongueIcon(ctx) { pen(ctx, COL.gold, 3); ln(ctx, C, C - 12, C, C + 4); ctx.fillStyle = COL.gold; cir(ctx, C, C + 8, 5, true); pen(ctx, COL.dim, 1.5); ctx.beginPath(); ctx.arc(C, C - 12, 5, Math.PI, 0); ctx.stroke(); ln(ctx, C - 8, C + 14, C - 4, C + 10); },
};

export function icon(id) {
  if (cache.has(id)) return cache.get(id);
  const c = cv();
  const ctx = c.getContext('2d');
  (DRAW[id] || DRAW.skull)(ctx);
  cache.set(id, c);
  return c;
}

// artifact icon = weapon glyph + broken red ring; forbidden = black sun ring
export function iconEvolved(baseId) {
  const key = 'evo:' + baseId;
  if (cache.has(key)) return cache.get(key);
  const c = cv();
  const ctx = c.getContext('2d');
  ctx.strokeStyle = COL.blood; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(C, C, 21, 0.4, Math.PI * 1.7); ctx.stroke();
  ctx.beginPath(); ctx.arc(C, C, 21, Math.PI * 1.85, Math.PI * 2.2); ctx.stroke();
  ctx.drawImage(icon(baseId), 5, 5, 38, 38);
  cache.set(key, c);
  return c;
}
export function iconForbidden(baseId) {
  const key = 'fbd:' + baseId;
  if (cache.has(key)) return cache.get(key);
  const c = cv();
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(C, C, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COL.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(C, C, 22, 0, Math.PI * 2); ctx.stroke();
  ctx.drawImage(icon(baseId), 8, 8, 32, 32);
  cache.set(key, c);
  return c;
}
