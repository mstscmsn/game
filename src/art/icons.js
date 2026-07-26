// Vector glyph icons for weapons / catalysts / relics / stats, drawn on 48px canvases.
const S = 48, C = 24; // size, center
const cache = new Map();

function cv() { const c = document.createElement('canvas'); c.width = S; c.height = S; return c; }
const COL = {
  bone: '#D8C7A4', dim: '#8f8570', blood: '#8E1F2F', red: '#D4474F', gold: '#B58D3B', purple: '#7c5f8a', green: '#75876B', white: '#EEEBDD', steel: '#9aa1a8', ink: '#0B0A0C', orange: '#c96b2f', navy: '#46608a',
  // extended tones for the refined weapon glyphs
  goldD: '#6f5320', goldL: '#e2bd66', boneD: '#8a7a56', boneL: '#eee0bd', steelD: '#4d545c', steelL: '#c9ced4', wood: '#7a5230', woodD: '#402a16', bloodD: '#5b141f', ember: '#f0a85a', flameCore: '#f6e7bb',
};

function pen(ctx, col, w = 2.5) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
function ln(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function cir(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); }
function poly(ctx, pts, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); fill ? ctx.fill() : ctx.stroke(); }
function dot(ctx, x, y, r, col) { ctx.fillStyle = col; cir(ctx, x, y, r, true); }
function glint(ctx, x, y, r = 1) { dot(ctx, x, y, r, 'rgba(238,235,221,.85)'); }
function gem(ctx, x, y, r, col) { dot(ctx, x, y, r + 1.1, COL.ink); dot(ctx, x, y, r, col); glint(ctx, x - r * 0.35, y - r * 0.45, Math.max(0.6, r * 0.38)); }
function lg(ctx, x1, y1, x2, y2, stops) { const g = ctx.createLinearGradient(x1, y1, x2, y2); for (const [o, c] of stops) g.addColorStop(o, c); return g; }

const DRAW = {
  /* ---- weapons: two-tone strokes, engraved details, material hints ---- */
  saw(ctx) {
    // beveled teeth: dark under-teeth slightly rotated, bone teeth on top
    const teeth = (rot, col, rTip) => { ctx.fillStyle = col; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rot; poly(ctx, [[C + Math.cos(a) * 12.5, C + Math.sin(a) * 12.5], [C + Math.cos(a + 0.24) * rTip, C + Math.sin(a + 0.24) * rTip], [C + Math.cos(a + 0.48) * 12.5, C + Math.sin(a + 0.48) * 12.5]], true); } };
    teeth(0.07, COL.boneD, 18);
    teeth(0, COL.bone, 17.2);
    // disc with soft bevel gradient
    ctx.fillStyle = lg(ctx, 12, 12, 36, 36, [[0, COL.boneL], [0.55, COL.bone], [1, COL.boneD]]);
    cir(ctx, C, C, 13, true);
    // engraved rings + radial etch marks
    pen(ctx, COL.boneD, 1.1); cir(ctx, C, C, 9.5); cir(ctx, C, C, 6);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; ln(ctx, C + Math.cos(a) * 6.5, C + Math.sin(a) * 6.5, C + Math.cos(a) * 9, C + Math.sin(a) * 9); }
    // blood-lacquered hub, bolt studs on the engraved ring
    dot(ctx, C, C, 4.6, COL.ink); dot(ctx, C, C, 3.8, COL.blood);
    dot(ctx, C, C, 1.2, COL.ink);
    for (const a of [0.5, 2.6, 4.7]) dot(ctx, C + Math.cos(a) * 7.8, C + Math.sin(a) * 7.8, 0.8, COL.boneD);
    glint(ctx, C - 7, C - 8, 1.2);
  },
  bell(ctx) {
    const body = () => { ctx.beginPath(); ctx.moveTo(C - 10, C + 8); ctx.quadraticCurveTo(C - 10, C - 12, C, C - 12); ctx.quadraticCurveTo(C + 10, C - 12, C + 10, C + 8); ctx.closePath(); };
    // clapper hangs behind the lip
    dot(ctx, C, C + 11.5, 3.2, COL.ink); dot(ctx, C, C + 11.5, 2.3, COL.gold); glint(ctx, C - 0.8, C + 10.7, 0.7);
    // cast bronze: warm crown, shadowed skirt
    body(); ctx.fillStyle = lg(ctx, C - 8, C - 12, C + 6, C + 8, [[0, COL.goldL], [0.5, COL.gold], [1, COL.goldD]]); ctx.fill();
    pen(ctx, COL.goldD, 1.4); body(); ctx.stroke();
    // shoulder + waist engravings, diamond sigil
    pen(ctx, COL.goldD, 1.1);
    ctx.beginPath(); ctx.moveTo(C - 9, C - 2); ctx.quadraticCurveTo(C, C - 4.5, C + 9, C - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(C - 10, C + 4); ctx.quadraticCurveTo(C, C + 2, C + 10, C + 4); ctx.stroke();
    pen(ctx, '#4a3510', 1.2); poly(ctx, [[C, C - 0.5], [C + 2.4, C + 2], [C, C + 4.5], [C - 2.4, C + 2]], false);
    dot(ctx, C, C + 2, 0.8, COL.goldL);
    // cast highlight on the left flank
    pen(ctx, 'rgba(238,235,221,.5)', 1.2); ctx.beginPath(); ctx.moveTo(C - 6.5, C - 8.5); ctx.quadraticCurveTo(C - 8.2, C - 2, C - 7.5, C + 4); ctx.stroke();
    // lip: dark roll + bright rim
    pen(ctx, COL.goldD, 3); ln(ctx, C - 12.5, C + 8.5, C + 12.5, C + 8.5);
    pen(ctx, COL.goldL, 1.2); ln(ctx, C - 12, C + 7.4, C + 12, C + 7.4);
    // crown loop
    pen(ctx, COL.goldD, 2.2); ctx.beginPath(); ctx.arc(C, C - 13.2, 2.6, Math.PI, 0); ctx.stroke();
    pen(ctx, COL.goldL, 1); ctx.beginPath(); ctx.arc(C, C - 13.2, 2.6, -2.7, -0.7); ctx.stroke();
  },
  spear(ctx) {
    // ash shaft: dark core, warm face, grain highlight
    pen(ctx, COL.woodD, 4.4); ln(ctx, C - 13, C + 15, C + 4, C - 6);
    pen(ctx, COL.wood, 2.4); ln(ctx, C - 12.6, C + 14.5, C + 4, C - 6);
    pen(ctx, 'rgba(226,189,102,.4)', 1); ln(ctx, C - 11, C + 12, C - 3, C + 2);
    // steel butt cap
    pen(ctx, COL.steelD, 3); ln(ctx, C - 13.6, C + 15.6, C - 12.2, C + 13.9);
    // red tassel under the lashing
    pen(ctx, COL.blood, 1.4); ln(ctx, C + 1, C - 3, C - 1, C + 3); ln(ctx, C + 2.8, C - 2.5, C + 1.8, C + 3.5);
    pen(ctx, COL.red, 1.1); ln(ctx, C + 0.2, C - 3, C - 1.8, C + 2);
    // gold cord lashing below the head
    pen(ctx, COL.gold, 1.3); ln(ctx, C + 1.2, C - 2.2, C + 5, C - 5.2); ln(ctx, C - 0.2, C - 3.6, C + 3.6, C - 6.6);
    // leaf head: dark flat, bright face, centre ridge
    ctx.fillStyle = COL.goldD; poly(ctx, [[C + 3.5, C - 5.5], [C + 10.9, C - 8.1], [C + 15.5, C - 17.5], [C + 6.1, C - 12.9]], true);
    ctx.fillStyle = COL.gold; poly(ctx, [[C + 4.3, C - 6.3], [C + 10.2, C - 8.5], [C + 14.8, C - 16.7], [C + 6.9, C - 12.5]], true);
    pen(ctx, COL.goldL, 1); ln(ctx, C + 4.5, C - 6.5, C + 14.6, C - 16.6);
    glint(ctx, C + 13.4, C - 14.6, 0.8);
  },
  scripture(ctx) {
    // leather cover behind the page block
    ctx.fillStyle = '#3a3226'; ctx.fillRect(C - 11.5, C - 13.5, 23, 27);
    pen(ctx, '#584c38', 1); ctx.strokeRect(C - 11.5, C - 13.5, 23, 27);
    ctx.fillStyle = lg(ctx, C - 10, C - 12, C + 10, C + 12, [[0, COL.boneL], [1, COL.bone]]);
    ctx.fillRect(C - 10, C - 12, 20, 24);
    pen(ctx, COL.boneD, 1.1); ctx.strokeRect(C - 10, C - 12, 20, 24);
    // stacked page edge
    pen(ctx, COL.boneD, 1); ln(ctx, C + 8, C - 10, C + 8, C + 10);
    // illuminated drop cap + script lines
    ctx.fillStyle = COL.blood; ctx.fillRect(C - 7, C - 8.2, 3.6, 3.6);
    pen(ctx, COL.red, 0.9); ln(ctx, C - 6.4, C - 7.4, C - 4.2, C - 5.4);
    pen(ctx, COL.dim, 1.3); ln(ctx, C - 1.5, C - 6.4, C + 5.5, C - 6.4); ln(ctx, C - 7, C - 1.5, C + 5.5, C - 1.5); ln(ctx, C - 7, C + 3, C + 1.5, C + 3);
    // gilt clasp
    pen(ctx, COL.gold, 1.4); ln(ctx, C - 11.5, C + 0.5, C - 8.5, C + 0.5);
    // wax seal with trailing ribbon
    pen(ctx, COL.blood, 1.6); ln(ctx, C + 5, C + 10.5, C + 3.4, C + 14); ln(ctx, C + 9, C + 10.5, C + 10.6, C + 14);
    dot(ctx, C + 7, C + 8.5, 4.2, COL.bloodD); dot(ctx, C + 6.8, C + 8.2, 3.4, COL.blood);
    pen(ctx, COL.red, 1); cir(ctx, C + 6.8, C + 8.2, 1.7);
    glint(ctx, C + 5.4, C + 6.8, 0.7);
  },
  censer(ctx) {
    // drifting incense wisps first (behind everything)
    pen(ctx, 'rgba(117,135,107,.85)', 1.8);
    ctx.beginPath(); ctx.moveTo(C - 3.5, C - 8); ctx.bezierCurveTo(C - 8, C - 11.5, C - 2, C - 15, C - 5.5, C - 19.5); ctx.stroke();
    pen(ctx, 'rgba(117,135,107,.55)', 1.4);
    ctx.beginPath(); ctx.moveTo(C + 3.5, C - 8); ctx.bezierCurveTo(C + 8, C - 12, C + 3, C - 15, C + 6, C - 19); ctx.stroke();
    // suspension chain + top ring
    pen(ctx, COL.steelD, 2.2); ln(ctx, C, C - 5, C, C - 13.5);
    pen(ctx, COL.steelL, 0.9); ln(ctx, C, C - 5, C, C - 13.5);
    pen(ctx, COL.steel, 1.4); cir(ctx, C, C - 15.3, 1.9);
    // brazier: warm bronze sphere
    ctx.fillStyle = lg(ctx, C - 7, C - 4, C + 7, C + 12, [[0, COL.goldL], [0.45, COL.gold], [1, COL.goldD]]);
    cir(ctx, C, C + 4, 9, true);
    pen(ctx, COL.goldD, 1.3); cir(ctx, C, C + 4, 9);
    // lid seam + finial
    pen(ctx, COL.goldD, 1.2); ln(ctx, C - 8.6, C + 1.5, C + 8.6, C + 1.5);
    pen(ctx, COL.goldL, 1); ln(ctx, C - 7, C + 0.5, C + 7, C + 0.5);
    dot(ctx, C, C - 5.6, 1.5, COL.gold);
    glint(ctx, C - 4.2, C - 1.4, 1);
    // pierced vents glowing with embers
    for (const dx of [-4.4, 0, 4.4]) { dot(ctx, C + dx, C + 6.5, 1.5, COL.ink); dot(ctx, C + dx, C + 6.5, 0.8, COL.ember); }
    // foot
    pen(ctx, COL.goldD, 2); ln(ctx, C - 3.5, C + 13.8, C + 3.5, C + 13.8);
  },
  lantern(ctx) {
    // hanging ring
    pen(ctx, COL.gold, 1.4); cir(ctx, C, C - 16.2, 1.8);
    // glass: cold night panel with a warm heart
    ctx.fillStyle = lg(ctx, C, C - 8, C, C + 10, [[0, '#1c2438'], [1, '#2a3448']]);
    ctx.fillRect(C - 7, C - 8, 14, 18);
    const rg = ctx.createRadialGradient(C, C + 1, 0.5, C, C + 1, 7.5);
    rg.addColorStop(0, 'rgba(240,168,90,.95)'); rg.addColorStop(0.55, 'rgba(201,107,47,.5)'); rg.addColorStop(1, 'rgba(201,107,47,0)');
    ctx.fillStyle = rg; ctx.fillRect(C - 7, C - 8, 14, 18);
    // flame: teardrop with pale core
    ctx.fillStyle = COL.ember; ctx.beginPath(); ctx.moveTo(C, C - 4.5); ctx.quadraticCurveTo(C + 3.2, C - 0.5, C, C + 3.5); ctx.quadraticCurveTo(C - 3.2, C - 0.5, C, C - 4.5); ctx.fill();
    ctx.fillStyle = COL.flameCore; ctx.beginPath(); ctx.ellipse(C, C + 0.8, 1.3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    // mullions over the glass
    pen(ctx, 'rgba(11,10,12,.55)', 1); ln(ctx, C - 2.6, C - 8, C - 2.6, C + 10); ln(ctx, C + 2.6, C - 8, C + 2.6, C + 10);
    // frame: dark iron under brass face, riveted corners
    pen(ctx, '#3a3640', 3); ctx.strokeRect(C - 7, C - 8, 14, 18);
    pen(ctx, COL.gold, 1.3); ctx.strokeRect(C - 7, C - 8, 14, 18);
    dot(ctx, C - 7, C - 8, 0.8, COL.goldL); dot(ctx, C + 7, C - 8, 0.8, COL.goldL); dot(ctx, C - 7, C + 10, 0.8, COL.goldL); dot(ctx, C + 7, C + 10, 0.8, COL.goldL);
    // roof + base
    ctx.fillStyle = COL.goldD; poly(ctx, [[C - 9, C - 8], [C, C - 14.5], [C + 9, C - 8]], true);
    pen(ctx, COL.goldL, 1); ln(ctx, C - 8.2, C - 8.4, C - 0.2, C - 14);
    ctx.fillStyle = COL.goldD; ctx.fillRect(C - 8.5, C + 10, 17, 2.6);
    pen(ctx, COL.goldL, 1); ln(ctx, C - 8, C + 10.5, C + 8, C + 10.5);
  },
  chain(ctx) {
    const link = (x, y, edge) => {
      if (edge) { // link seen edge-on
        pen(ctx, COL.steelD, 3.2); ln(ctx, x - 1.5, y + 2.6, x + 1.5, y - 2.6);
        pen(ctx, COL.steelL, 1.3); ln(ctx, x - 1.3, y + 2.3, x + 1.3, y - 2.3);
      } else {
        pen(ctx, COL.steelD, 3); ctx.beginPath(); ctx.ellipse(x, y, 3.6, 5.4, -0.62, 0, Math.PI * 2); ctx.stroke();
        pen(ctx, COL.steelL, 1.2); ctx.beginPath(); ctx.ellipse(x, y, 3.6, 5.4, -0.62, 0, Math.PI * 2); ctx.stroke();
      }
    };
    link(C - 12, C - 10, false); link(C - 6.6, C - 5.4, true); link(C - 1.2, C - 0.8, false); link(C + 4.2, C + 3.8, true);
    glint(ctx, C - 14, C - 12.5, 0.8);
    // spiked iron weight at the working end
    dot(ctx, C + 11, C + 10.5, 4.4, COL.steelD);
    ctx.fillStyle = COL.steelD;
    for (const a of [-0.5, 0.55, 1.7, 2.8, 4]) poly(ctx, [[C + 11 + Math.cos(a - 0.28) * 4, C + 10.5 + Math.sin(a - 0.28) * 4], [C + 11 + Math.cos(a + 0.28) * 4, C + 10.5 + Math.sin(a + 0.28) * 4], [C + 11 + Math.cos(a) * 7.2, C + 10.5 + Math.sin(a) * 7.2]], true);
    dot(ctx, C + 10, C + 9.4, 2, COL.steel); glint(ctx, C + 9.4, C + 8.8, 0.8);
    // fresh blood on a spike
    pen(ctx, COL.red, 1.3); ln(ctx, C + 14.4, C + 14, C + 15.6, C + 16);
    dot(ctx, C + 15.9, C + 17.2, 1.1, COL.red);
  },
  chalice(ctx) {
    const bowl = () => { ctx.beginPath(); ctx.moveTo(C - 10, C - 8); ctx.quadraticCurveTo(C - 9, C + 3, C, C + 5); ctx.quadraticCurveTo(C + 9, C + 3, C + 10, C - 8); ctx.closePath(); };
    bowl(); ctx.fillStyle = lg(ctx, C - 9, C - 6, C + 8, C + 5, [[0, COL.goldL], [0.5, COL.gold], [1, COL.goldD]]); ctx.fill();
    pen(ctx, COL.goldD, 1.2); bowl(); ctx.stroke();
    // engraved girdle with studs
    pen(ctx, COL.goldD, 1); ctx.beginPath(); ctx.moveTo(C - 8.6, C - 3); ctx.quadraticCurveTo(C, C - 0.5, C + 8.6, C - 3); ctx.stroke();
    dot(ctx, C - 4.5, C - 2.1, 0.8, COL.goldD); dot(ctx, C, C - 1.5, 0.8, COL.goldD); dot(ctx, C + 4.5, C - 2.1, 0.8, COL.goldD);
    // wine surface
    ctx.fillStyle = COL.bloodD; ctx.beginPath(); ctx.ellipse(C, C - 8, 9.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.blood; ctx.beginPath(); ctx.ellipse(C, C - 8.3, 8.2, 2, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, COL.red, 1); ctx.beginPath(); ctx.ellipse(C, C - 8.3, 5.5, 1.1, 0, 3.4, 5.6); ctx.stroke();
    glint(ctx, C - 3.5, C - 8.8, 0.9);
    // stem with jewel knop
    pen(ctx, COL.goldD, 3.4); ln(ctx, C, C + 5, C, C + 12);
    pen(ctx, COL.goldL, 1.2); ln(ctx, C - 0.6, C + 5.5, C - 0.6, C + 11.5);
    gem(ctx, C, C + 8.5, 2, COL.red);
    // foot
    ctx.fillStyle = COL.goldD; ctx.beginPath(); ctx.ellipse(C, C + 13.5, 7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, COL.goldL, 1); ctx.beginPath(); ctx.ellipse(C, C + 13, 5.5, 1.3, 0, Math.PI, Math.PI * 2); ctx.stroke();
  },
  raven(ctx) {
    // gnarled perch first
    pen(ctx, COL.woodD, 2.2); ln(ctx, C - 9, C + 12.5, C + 6, C + 11);
    pen(ctx, COL.wood, 1); ln(ctx, C - 8, C + 12, C + 5, C + 10.8);
    // perched corvid in profile, facing left
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(C - 12.5, C - 7);              // beak tip
      ctx.lineTo(C - 6, C - 10.5);              // crown
      ctx.quadraticCurveTo(C + 1, C - 11, C + 5, C - 8);       // nape / back
      ctx.quadraticCurveTo(C + 10, C - 4.5, C + 12.8, C + 9.5); // folded wing to tail tip
      ctx.lineTo(C + 7.5, C + 6.5);             // tail underside
      ctx.quadraticCurveTo(C + 2, C + 7.5, C - 3.5, C + 5.5);  // belly
      ctx.quadraticCurveTo(C - 7.5, C + 3.5, C - 7.8, C - 2);  // chest
      ctx.quadraticCurveTo(C - 8, C - 5.5, C - 12.5, C - 7);   // throat
      ctx.closePath();
    };
    body(); ctx.fillStyle = '#17141b'; ctx.fill();
    pen(ctx, '#3f3b49', 1.2); body(); ctx.stroke(); // rim light
    // layered wing feathers
    pen(ctx, '#4a4556', 1.2);
    ctx.beginPath(); ctx.moveTo(C + 10, C + 6.5); ctx.quadraticCurveTo(C + 4, C + 1, C - 1, C - 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(C + 7, C + 4.5); ctx.quadraticCurveTo(C + 2, C + 1.5, C - 2, C + 1); ctx.stroke();
    // oil sheen along the back
    pen(ctx, 'rgba(124,95,138,.6)', 1.1); ctx.beginPath(); ctx.moveTo(C - 4.5, C - 8.3); ctx.quadraticCurveTo(C + 1, C - 9.8, C + 5.5, C - 7); ctx.stroke();
    // beak: cold steel with a mouth line
    ctx.fillStyle = COL.steelD; poly(ctx, [[C - 12.5, C - 7], [C - 6, C - 10], [C - 6, C - 6]], true);
    pen(ctx, COL.steelL, 0.8); ln(ctx, C - 11.8, C - 7.1, C - 7, C - 7.9);
    // burning eye + clawed foot
    gem(ctx, C - 4.6, C - 7.4, 1.3, COL.red);
    pen(ctx, '#2c2833', 1.6); ln(ctx, C - 2, C + 6.5, C - 2.5, C + 11.5);
    pen(ctx, COL.dim, 1); ln(ctx, C - 2.5, C + 11.5, C - 4, C + 12.5); ln(ctx, C - 2.5, C + 11.5, C - 1, C + 12.8);
  },
  mirror(ctx) {
    // handle: dark wood, gold ferrules, pommel bead
    pen(ctx, COL.woodD, 3.8); ln(ctx, C, C + 9, C, C + 16.5);
    pen(ctx, COL.wood, 1.8); ln(ctx, C, C + 9.5, C, C + 16);
    pen(ctx, COL.gold, 1); ln(ctx, C - 1.6, C + 11.5, C + 1.6, C + 11.5); ln(ctx, C - 1.6, C + 13.5, C + 1.6, C + 13.5);
    dot(ctx, C, C + 17.3, 1.6, COL.gold);
    // frame: two-tone bevel
    const fr = (col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.ellipse(C, C - 3, 9.6, 12.2, 0, 0, Math.PI * 2); ctx.stroke(); };
    fr(COL.goldD, 3.2); fr(COL.gold, 1.5);
    // glass: deep night with a diagonal sheen
    ctx.fillStyle = lg(ctx, C - 6, C - 12, C + 6, C + 6, [[0, '#5b7292'], [0.45, '#2a3448'], [1, '#131a29']]);
    ctx.beginPath(); ctx.ellipse(C, C - 3, 7.6, 10.2, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, 'rgba(238,235,221,.8)', 1.5); ln(ctx, C - 3.6, C - 9.5, C - 0.5, C - 3.5);
    pen(ctx, 'rgba(238,235,221,.4)', 1); ln(ctx, C - 0.5, C - 11, C + 1.5, C - 7);
    // beaded studs around the frame
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.39; dot(ctx, C + Math.cos(a) * 9.6, C - 3 + Math.sin(a) * 12.2, 0.9, COL.goldL); }
    // crest bead
    dot(ctx, C, C - 16.6, 1.4, COL.gold);
  },
  wingblade(ctx) {
    for (let i = 0; i < 3; i++) {
      const y = C + 8 - i * 6;
      const curve = () => { ctx.beginPath(); ctx.moveTo(C - 11, y); ctx.quadraticCurveTo(C + 2, y - 6, C + 14, y - 2); ctx.stroke(); };
      pen(ctx, COL.steelD, 3.4); curve();
      pen(ctx, COL.white, 1.6); curve();
      // feather barbs
      pen(ctx, 'rgba(154,161,168,.75)', 1);
      ln(ctx, C - 4, y - 3.2, C - 5.5, y - 6); ln(ctx, C + 2, y - 3.8, C + 1, y - 6.6);
      // blood-dipped tip
      pen(ctx, COL.red, 1.6); ctx.beginPath(); ctx.moveTo(C + 10.5, y - 2.6); ctx.quadraticCurveTo(C + 12.5, y - 2.4, C + 14, y - 2); ctx.stroke();
      // gold quill root
      dot(ctx, C - 11, y, 1.3, COL.gold);
    }
    glint(ctx, C + 8, C - 10.5, 0.9);
  },
  musket(ctx) {
    // walnut stock with grain
    pen(ctx, COL.woodD, 5); ln(ctx, C - 14.5, C + 11, C - 3, C + 3.5);
    pen(ctx, COL.wood, 2.6); ln(ctx, C - 14, C + 10.6, C - 3.5, C + 3.5);
    pen(ctx, 'rgba(64,42,22,.9)', 1); ln(ctx, C - 12.5, C + 11.5, C - 6, C + 7);
    // brass butt plate
    pen(ctx, COL.gold, 1.6); ln(ctx, C - 15.6, C + 9.2, C - 13.4, C + 13);
    // barrel: cold steel with bright top rib
    pen(ctx, COL.steelD, 4.4); ln(ctx, C - 5, C + 4, C + 12, C - 9);
    pen(ctx, COL.steel, 2.2); ln(ctx, C - 5, C + 3.6, C + 12, C - 9.2);
    pen(ctx, COL.steelL, 1); ln(ctx, C - 4.5, C + 2.5, C + 11.5, C - 9.8);
    // brass muzzle band + trigger guard + hammer
    pen(ctx, COL.gold, 1.3); ln(ctx, C + 8, C - 9, C + 10.9, C - 5.2);
    pen(ctx, COL.gold, 1.4); ctx.beginPath(); ctx.arc(C - 4.5, C + 8.5, 3, -0.4, Math.PI * 0.9); ctx.stroke();
    pen(ctx, COL.steelD, 2); ln(ctx, C - 1.5, C + 1.5, C - 0.3, C - 1.3);
    // muzzle blast: jagged star with pale core, spark motes
    const mx = C + 14.4, my = C - 11;
    ctx.fillStyle = COL.orange; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - 0.3; const r = i % 2 ? 2 : (i % 4 === 0 ? 5.2 : 3.8); const x = mx + Math.cos(a) * r, y = my + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    dot(ctx, mx, my, 1.7, COL.flameCore);
    dot(ctx, mx + 5.4, my - 4.8, 0.8, COL.ember); dot(ctx, mx - 1, my + 5.4, 0.7, COL.ember);
  },
  bow(ctx) {
    // limbs: dark core + bone face
    const limb = (w, col) => { pen(ctx, col, w); ctx.beginPath(); ctx.arc(C - 3, C, 13.5, -1.12, 1.12); ctx.stroke(); };
    limb(3.6, COL.woodD); limb(1.7, COL.bone);
    const tx = C - 3 + Math.cos(1.12) * 13.5, ty = Math.sin(1.12) * 13.5;
    // string between nocked tips
    pen(ctx, 'rgba(238,235,221,.75)', 1); ln(ctx, tx, C - ty, tx, C + ty);
    dot(ctx, tx, C - ty, 1.5, COL.gold); dot(ctx, tx, C + ty, 1.5, COL.gold);
    // gold grip wrap
    pen(ctx, COL.gold, 1.2); ln(ctx, C + 9, C - 2.6, C + 12, C - 2.6); ln(ctx, C + 9, C, C + 12, C); ln(ctx, C + 9, C + 2.6, C + 12, C + 2.6);
    // arrow: two-tone shaft, faceted steel head, blood fletching
    pen(ctx, COL.woodD, 2.4); ln(ctx, C - 9, C, C + 9, C);
    pen(ctx, COL.wood, 1.2); ln(ctx, C - 9, C - 0.4, C + 9, C - 0.4);
    ctx.fillStyle = COL.steelD; poly(ctx, [[C + 15, C], [C + 8.5, C - 3.2], [C + 8.5, C + 3.2]], true);
    ctx.fillStyle = COL.steelL; poly(ctx, [[C + 15, C], [C + 9.5, C - 2.2], [C + 9.5, C]], true);
    pen(ctx, COL.red, 1.3); ln(ctx, C - 9, C, C - 12, C - 3.2); ln(ctx, C - 6.5, C, C - 9.5, C - 3.2);
    pen(ctx, COL.blood, 1.3); ln(ctx, C - 9, C, C - 12, C + 3.2); ln(ctx, C - 6.5, C, C - 9.5, C + 3.2);
  },
  wheel(ctx) {
    // execution spikes between the spokes
    for (let i = 0; i < 6; i++) {
      const a = (i + 0.5) / 6 * Math.PI * 2;
      ctx.fillStyle = COL.steelD;
      poly(ctx, [[C + Math.cos(a - 0.17) * 12.5, C + Math.sin(a - 0.17) * 12.5], [C + Math.cos(a + 0.17) * 12.5, C + Math.sin(a + 0.17) * 12.5], [C + Math.cos(a) * 18.2, C + Math.sin(a) * 18.2]], true);
      pen(ctx, COL.steelL, 0.8); ln(ctx, C + Math.cos(a - 0.08) * 13.5, C + Math.sin(a - 0.08) * 13.5, C + Math.cos(a) * 17.6, C + Math.sin(a) * 17.6);
    }
    // rim: dark oak under bone face, iron studs
    pen(ctx, COL.woodD, 3.8); cir(ctx, C, C, 13);
    pen(ctx, COL.bone, 1.7); cir(ctx, C, C, 13);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.26; dot(ctx, C + Math.cos(a) * 13, C + Math.sin(a) * 13, 0.9, COL.steelD); }
    // spokes
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const x1 = C + Math.cos(a) * 4.6, y1 = C + Math.sin(a) * 4.6, x2 = C + Math.cos(a) * 12, y2 = C + Math.sin(a) * 12; pen(ctx, COL.woodD, 2.8); ln(ctx, x1, y1, x2, y2); pen(ctx, COL.bone, 1.2); ln(ctx, x1, y1, x2, y2); }
    // engraved inner ring
    pen(ctx, 'rgba(138,122,86,.8)', 1); cir(ctx, C, C, 9.2);
    // gilt hub with pin
    dot(ctx, C, C, 5, COL.goldD);
    ctx.fillStyle = lg(ctx, C - 4, C - 4, C + 4, C + 4, [[0, COL.goldL], [1, COL.goldD]]); cir(ctx, C, C, 4, true);
    dot(ctx, C, C, 1.5, COL.ink);
  },
  dagger(ctx) {
    // blade: cold steel with bright bevel, dark spine
    const blade = [[C, C - 16], [C + 3, C - 11], [C + 2, C + 3.5], [C - 2, C + 3.5], [C - 3, C - 11]];
    ctx.fillStyle = lg(ctx, C - 3, C, C + 3, C, [[0, COL.steelL], [0.5, COL.steel], [1, COL.steelD]]);
    poly(ctx, blade, true);
    pen(ctx, COL.steelD, 1); poly(ctx, blade);
    pen(ctx, COL.white, 1); ln(ctx, C, C - 14.5, C, C + 2.5); // centre ridge
    pen(ctx, COL.blood, 1.2); ln(ctx, C + 2, C - 10.5, C + 1.4, C - 3); // blood runnel
    // curved brass crossguard
    pen(ctx, COL.goldD, 3.2); ln(ctx, C - 7, C + 4.8, C + 7, C + 4.8);
    pen(ctx, COL.goldL, 1.3); ln(ctx, C - 6.5, C + 4.2, C + 6.5, C + 4.2);
    dot(ctx, C - 7.6, C + 4.8, 1.3, COL.gold); dot(ctx, C + 7.6, C + 4.8, 1.3, COL.gold);
    // wrapped grip
    pen(ctx, COL.woodD, 3.4); ln(ctx, C, C + 6, C, C + 12.5);
    pen(ctx, COL.wood, 1.8); ln(ctx, C, C + 6.5, C, C + 12);
    pen(ctx, COL.gold, 1); ln(ctx, C - 1.7, C + 7.5, C + 1.7, C + 8.5); ln(ctx, C - 1.7, C + 9.5, C + 1.7, C + 10.5);
    // pommel jewel
    gem(ctx, C, C + 14.5, 2, COL.red);
    glint(ctx, C - 1.4, C - 12, 0.9);
  },
  harp(ctx) {
    // soundbox: dark oak beam with a warm grain line
    pen(ctx, COL.woodD, 4.6); ln(ctx, C - 8.5, C + 12.5, C + 10.5, C + 8.5);
    pen(ctx, COL.wood, 2.2); ln(ctx, C - 8, C + 12, C + 10, C + 8.4);
    pen(ctx, 'rgba(226,189,102,.5)', 0.9); ln(ctx, C - 7, C + 11, C + 8, C + 8);
    // strings: pale courses, the heart string dyed red
    const sx = [-6, -2.6, 0.8, 4.2, 7.6], st = [-11, -12.2, -12.4, -11.2, -9], sb = [11.2, 10.5, 9.8, 9.1, 8.4];
    for (let i = 0; i < 5; i++) { pen(ctx, i === 2 ? COL.red : 'rgba(238,235,221,.85)', 1); ln(ctx, C + sx[i], C + st[i], C + sx[i] + 0.6, C + sb[i]); }
    // frame: gilded pillar sweeping into the neck
    const frame = () => { ctx.beginPath(); ctx.moveTo(C - 8.5, C + 12.5); ctx.quadraticCurveTo(C - 14, C - 8, C - 2, C - 12.5); ctx.quadraticCurveTo(C + 5.5, C - 14.5, C + 10.5, C - 6.5); ctx.stroke(); };
    pen(ctx, COL.goldD, 3.6); frame();
    pen(ctx, COL.goldL, 1.6); frame();
    // scroll volute at the neck's end
    pen(ctx, COL.goldD, 2.4); cir(ctx, C + 11, C - 4.6, 1.9);
    pen(ctx, COL.goldL, 1); cir(ctx, C + 11, C - 4.6, 1.9);
    // tuning pins along the neck
    dot(ctx, C - 2.6, C - 10.6, 0.8, COL.goldD); dot(ctx, C + 0.8, C - 10.8, 0.8, COL.goldD); dot(ctx, C + 4.2, C - 9.8, 0.8, COL.goldD);
    glint(ctx, C - 10.6, C + 2, 0.9);
  },
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

// ---- unified finishing pipeline: soft underlay → ink rim → glyph → top-left sheen ----
function finish(draw) {
  const c = cv(), ctx = c.getContext('2d');
  // (a) soft radial underlay for presence against dark UI
  const halo = ctx.createRadialGradient(C, C, 1.5, C, C, 21);
  halo.addColorStop(0, 'rgba(216,199,164,.075)');
  halo.addColorStop(0.62, 'rgba(216,199,164,.035)');
  halo.addColorStop(1, 'rgba(216,199,164,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, S, S);
  // (b) glyph on an offscreen canvas → dark silhouette stamped in 4 directions
  const g = cv(); draw(g.getContext('2d'));
  const sil = cv(), sx = sil.getContext('2d');
  sx.drawImage(g, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = COL.ink; sx.fillRect(0, 0, S, S);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(sil, ox, oy);
  ctx.drawImage(g, 0, 0);
  // (c) top-left light sweep, clipped to drawn pixels
  ctx.globalCompositeOperation = 'source-atop';
  const sheen = ctx.createLinearGradient(3, 3, 40, 40);
  sheen.addColorStop(0, 'rgba(255,255,255,.085)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,.025)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

export function icon(id) {
  if (cache.has(id)) return cache.get(id);
  const c = finish(DRAW[id] || DRAW.skull);
  cache.set(id, c);
  return c;
}

// artifact icon = weapon glyph + shattered red ring; forbidden = black sun disc
export function iconEvolved(baseId) {
  const key = 'evo:' + baseId;
  if (cache.has(key)) return cache.get(key);
  const c = cv(), ctx = c.getContext('2d');
  // blood aura behind the shattered ring
  const aura = ctx.createRadialGradient(C, C, 11, C, C, 24);
  aura.addColorStop(0, 'rgba(142,31,47,0)');
  aura.addColorStop(0.8, 'rgba(142,31,47,.2)');
  aura.addColorStop(1, 'rgba(142,31,47,0)');
  ctx.fillStyle = aura; ctx.fillRect(0, 0, S, S);
  // ring fragments: dark under-arc, blood face, hot sheared ends
  ctx.lineCap = 'round';
  const segs = [[0.3, 1.25], [1.55, 2.75], [3.05, 3.75], [4.05, 5.35], [5.65, 6.05]];
  for (const [a0, a1] of segs) {
    ctx.strokeStyle = '#4a1017'; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.arc(C, C, 20, a0, a1); ctx.stroke();
    ctx.strokeStyle = COL.blood; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.arc(C, C, 20, a0, a1); ctx.stroke();
    ctx.strokeStyle = COL.red; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(C, C, 20.8, a1 - 0.22, a1 - 0.02); ctx.stroke();
  }
  // drifting shards in the gaps
  ctx.fillStyle = COL.red;
  for (const [a, r, s] of [[1.4, 21.6, 1.1], [2.9, 22, 0.9], [5.5, 21.8, 1]]) {
    ctx.save(); ctx.translate(C + Math.cos(a) * r, C + Math.sin(a) * r); ctx.rotate(a);
    ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4); ctx.restore();
  }
  // radiant burst ticks
  ctx.strokeStyle = 'rgba(212,71,79,.8)'; ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.26, r2 = i % 2 ? 23 : 23.8;
    ctx.beginPath(); ctx.moveTo(C + Math.cos(a) * 21.8, C + Math.sin(a) * 21.8); ctx.lineTo(C + Math.cos(a) * r2, C + Math.sin(a) * r2); ctx.stroke();
  }
  // the glyph itself, faintly gilded
  const g = cv(), gx = g.getContext('2d');
  gx.drawImage(icon(baseId), 5, 5, 38, 38);
  gx.globalCompositeOperation = 'source-atop';
  gx.fillStyle = 'rgba(181,141,59,.16)'; gx.fillRect(0, 0, S, S);
  gx.fillStyle = lg(gx, 6, 6, 40, 40, [[0, 'rgba(226,189,102,.18)'], [1, 'rgba(226,189,102,0)']]); gx.fillRect(0, 0, S, S);
  gx.globalCompositeOperation = 'source-over';
  ctx.drawImage(g, 0, 0);
  cache.set(key, c);
  return c;
}
export function iconForbidden(baseId) {
  const key = 'fbd:' + baseId;
  if (cache.has(key)) return cache.get(key);
  const c = cv(), ctx = c.getContext('2d');
  // corona: alternating long / short flare spikes
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 - Math.PI / 2, long = i % 2 === 0;
    const r2 = long ? 23.8 : 21.8, p = 0.085;
    ctx.fillStyle = long ? COL.blood : '#54121d';
    poly(ctx, [[C + Math.cos(a - p) * 19.5, C + Math.sin(a - p) * 19.5], [C + Math.cos(a + p) * 19.5, C + Math.sin(a + p) * 19.5], [C + Math.cos(a) * r2, C + Math.sin(a) * r2]], true);
  }
  // dying-ember rim just outside the disc
  ctx.strokeStyle = 'rgba(212,71,79,.35)'; ctx.lineWidth = 2.4;
  cir(ctx, C, C, 20.4);
  // the black sun: void disc
  ctx.fillStyle = '#000'; cir(ctx, C, C, 20, true);
  ctx.strokeStyle = '#211318'; ctx.lineWidth = 1.2; cir(ctx, C, C, 19.5);
  // red inner ring + faint second orbit + occult notches
  ctx.strokeStyle = COL.red; ctx.lineWidth = 1.7; cir(ctx, C, C, 16.4);
  ctx.strokeStyle = 'rgba(142,31,47,.55)'; ctx.lineWidth = 1; cir(ctx, C, C, 13.8);
  ctx.strokeStyle = 'rgba(212,71,79,.65)'; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; ln(ctx, C + Math.cos(a) * 15.4, C + Math.sin(a) * 15.4, C + Math.cos(a) * 17.4, C + Math.sin(a) * 17.4); }
  ctx.drawImage(icon(baseId), 8.5, 8.5, 31, 31);
  cache.set(key, c);
  return c;
}
