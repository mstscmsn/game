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
  hp(ctx) {
    const heart = (s) => { ctx.beginPath(); ctx.moveTo(C, C + 13 * s); ctx.bezierCurveTo(C - 17 * s, C + 1 * s, C - 9.5 * s, C - 12 * s, C, C - 4 * s); ctx.bezierCurveTo(C + 9.5 * s, C - 12 * s, C + 17 * s, C + 1 * s, C, C + 13 * s); ctx.closePath(); };
    heart(1.12); ctx.fillStyle = COL.bloodD; ctx.fill();
    heart(1); ctx.fillStyle = lg(ctx, C - 8, C - 10, C + 8, C + 10, [[0, COL.red], [0.55, COL.blood], [1, COL.bloodD]]); ctx.fill();
    // cleft shadow between the lobes
    pen(ctx, COL.bloodD, 1.6); ctx.beginPath(); ctx.moveTo(C, C - 4); ctx.quadraticCurveTo(C - 0.6, C, C, C + 4); ctx.stroke();
    // wet highlight on the left lobe
    pen(ctx, 'rgba(238,235,221,.75)', 1.6); ctx.beginPath(); ctx.moveTo(C - 9, C - 4.5); ctx.quadraticCurveTo(C - 10.5, C - 1, C - 7.5, C + 3); ctx.stroke();
    glint(ctx, C - 6.5, C - 6, 1.2);
    // falling drip
    dot(ctx, C + 5, C + 13.5, 1.2, COL.red);
  },
  armor(ctx) {
    // hammered plate: dark backing, cold-steel face
    const plate = [[C, C - 15], [C + 12, C - 9], [C + 12, C + 5], [C, C + 15], [C - 12, C + 5], [C - 12, C - 9]];
    ctx.fillStyle = COL.steelD; poly(ctx, plate, true);
    ctx.fillStyle = lg(ctx, C - 10, C - 12, C + 10, C + 12, [[0, COL.steelL], [0.5, COL.steel], [1, COL.steelD]]);
    poly(ctx, [[C, C - 13], [C + 10, C - 7.6], [C + 10, C + 4], [C, C + 12.6], [C - 10, C + 4], [C - 10, C - 7.6]], true);
    pen(ctx, COL.steelD, 1.2); poly(ctx, plate);
    // rivets at every corner
    for (const [x, y] of [[C, C - 12], [C + 8.6, C - 7], [C + 8.6, C + 3.4], [C, C + 11.4], [C - 8.6, C + 3.4], [C - 8.6, C - 7]]) { dot(ctx, x, y, 1, COL.steelD); glint(ctx, x - 0.4, y - 0.4, 0.5); }
    // engraved boss + gold inlay cross
    pen(ctx, COL.steelD, 1.1); cir(ctx, C, C - 1, 5.2);
    pen(ctx, COL.gold, 1.4); ln(ctx, C, C - 6.5, C, C + 4.5); ln(ctx, C - 4, C - 2.5, C + 4, C - 2.5);
    glint(ctx, C - 5.5, C - 8, 1.1);
  },
  speed(ctx) {
    // wake streaks: dark under-stroke, bone face
    for (let i = 0; i < 3; i++) {
      const y = C - 7 + i * 7, x2 = C + 1 - i * 3;
      pen(ctx, COL.boneD, 3.2); ln(ctx, C - 15, y, x2, y);
      pen(ctx, i === 1 ? COL.boneL : COL.bone, 1.5); ln(ctx, C - 15, y, x2, y);
    }
    // gale head: layered chevrons, the front one polished bright
    const chev = (dx, col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.moveTo(C + dx, C - 12); ctx.lineTo(C + dx + 8.5, C); ctx.lineTo(C + dx, C + 12); ctx.stroke(); };
    chev(6, COL.boneD, 4.8); chev(6, COL.boneL, 2.2);
    chev(-1.5, COL.boneD, 3.6); chev(-1.5, COL.bone, 1.5);
    // dust motes kicked loose
    dot(ctx, C - 13.5, C - 11.5, 1, COL.dim); dot(ctx, C - 11, C + 12.5, 0.8, COL.dim);
    glint(ctx, C + 13, C - 1.5, 1);
  },
  dmg(ctx) {
    // motion arcs trailing below the rising slash
    pen(ctx, 'rgba(142,31,47,.8)', 2); ctx.beginPath(); ctx.arc(C - 20, C + 12, 26, -0.72, -0.1); ctx.stroke();
    pen(ctx, 'rgba(212,71,79,.5)', 1.1); ctx.beginPath(); ctx.arc(C - 20, C + 12, 30.5, -0.66, -0.14); ctx.stroke();
    // blade: steel gradient flat, bright edge
    const B = [[C + 12, C - 13], [C + 14.5, C - 8], [C - 5, C + 9], [C - 8.5, C + 5.5]];
    ctx.fillStyle = lg(ctx, C + 2, C - 6, C + 6, C, [[0, COL.steelL], [0.55, COL.steel], [1, COL.steelD]]);
    poly(ctx, B, true);
    pen(ctx, COL.steelD, 1); poly(ctx, B);
    pen(ctx, COL.white, 1); ln(ctx, C + 12.5, C - 11, C - 6, C + 6.5);
    // brass crossguard, wrapped grip, gold pommel
    pen(ctx, COL.goldD, 3); ln(ctx, C - 11.5, C + 3.5, C - 4.5, C + 11);
    pen(ctx, COL.goldL, 1.2); ln(ctx, C - 10.8, C + 3.8, C - 5, C + 10);
    pen(ctx, COL.woodD, 3.2); ln(ctx, C - 9.5, C + 8.5, C - 13.5, C + 12.5);
    pen(ctx, COL.wood, 1.6); ln(ctx, C - 10, C + 9, C - 13, C + 12);
    dot(ctx, C - 14.5, C + 13.5, 1.7, COL.gold); glint(ctx, C - 15, C + 13, 0.6);
    // sparks flying off the tip
    dot(ctx, C + 15.5, C - 15, 1, COL.ember); dot(ctx, C + 11.5, C - 16.5, 0.7, COL.ember);
    glint(ctx, C + 11, C - 10.5, 0.9);
  },
  magnet(ctx) {
    // field lines arcing between the poles
    pen(ctx, 'rgba(226,189,102,.55)', 1); ctx.beginPath(); ctx.arc(C, C + 10, 5.5, 0.5, 2.64); ctx.stroke();
    pen(ctx, 'rgba(226,189,102,.3)', 1); ctx.beginPath(); ctx.arc(C, C + 10, 9, 0.45, 2.7); ctx.stroke();
    // horseshoe: dark iron core under blood lacquer
    const horse = (col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.arc(C, C - 3, 9.5, Math.PI, 0); ctx.stroke(); ln(ctx, C - 9.5, C - 3, C - 9.5, C + 7); ln(ctx, C + 9.5, C - 3, C + 9.5, C + 7); };
    horse('#4a1017', 6.6); horse(COL.blood, 4.2);
    // lacquer highlight along the outer crown
    pen(ctx, 'rgba(238,235,221,.5)', 1.1); ctx.beginPath(); ctx.arc(C, C - 3, 11, -2.75, -1.35); ctx.stroke();
    pen(ctx, COL.red, 1); ctx.beginPath(); ctx.arc(C, C - 3, 9.5, -2.9, -0.25); ctx.stroke();
    // steel pole shoes with a milled face
    for (const sx of [-1, 1]) {
      const x = C + sx * 9.5 - 3.3;
      ctx.fillStyle = COL.steelD; ctx.fillRect(x, C + 7, 6.6, 6);
      ctx.fillStyle = lg(ctx, x, C + 7, x, C + 13, [[0, COL.steelL], [1, COL.steel]]); ctx.fillRect(x + 0.6, C + 7.6, 5.4, 4.6);
      pen(ctx, COL.steelD, 0.8); ln(ctx, x + 0.6, C + 10, x + 6, C + 10);
    }
    glint(ctx, C - 11, C + 8.4, 0.8);
    // caught mote being pulled in
    dot(ctx, C, C + 14.5, 1.2, COL.gold); glint(ctx, C - 0.4, C + 14.1, 0.4);
  },
  cdr(ctx) {
    // winding crown
    pen(ctx, COL.goldD, 2.6); ln(ctx, C, C - 13.5, C, C - 16);
    pen(ctx, COL.goldL, 1.2); ln(ctx, C - 1.6, C - 15.8, C + 1.6, C - 15.8);
    // bronze case: dark bezel, warm rim, night face
    dot(ctx, C, C + 1, 14, COL.goldD);
    ctx.fillStyle = lg(ctx, C - 10, C - 10, C + 10, C + 12, [[0, '#2b2432'], [1, '#17141b']]); cir(ctx, C, C + 1, 11.4, true);
    pen(ctx, COL.gold, 1.6); cir(ctx, C, C + 1, 12.6);
    pen(ctx, COL.goldL, 0.9); ctx.beginPath(); ctx.arc(C, C + 1, 12.6, -2.6, -1.2); ctx.stroke();
    // hour marks: bold quarters, faint the rest
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, q = i % 3 === 0;
      pen(ctx, q ? COL.bone : COL.dim, q ? 1.2 : 0.8);
      ln(ctx, C + Math.cos(a) * (q ? 8.4 : 9.4), C + 1 + Math.sin(a) * (q ? 8.4 : 9.4), C + Math.cos(a) * 10.4, C + 1 + Math.sin(a) * 10.4);
    }
    // the rewound quarter burns gold
    pen(ctx, COL.ember, 1.6); ctx.beginPath(); ctx.arc(C, C + 1, 6.8, -Math.PI / 2, 0.15); ctx.stroke();
    ctx.fillStyle = COL.ember; poly(ctx, [[C + 6.3, C + 5.2], [C + 5.1, C + 1.5], [C + 8.3, C + 2.3]], true);
    // hands + jewelled cannon pinion
    pen(ctx, COL.boneL, 1.8); ln(ctx, C, C + 1, C, C - 5.8);
    pen(ctx, COL.bone, 1.4); ln(ctx, C, C + 1, C + 4.6, C + 3.4);
    dot(ctx, C, C + 1, 1.6, COL.gold); dot(ctx, C, C + 1, 0.6, COL.ink);
    // glass sheen
    glint(ctx, C - 5, C - 4.5, 1.1);
  },
  xp(ctx) {
    // cut soulstone: four facets, four depths
    const T = [C, C - 14.5], R = [C + 11, C - 1], Bm = [C, C + 14.5], L = [C - 11, C - 1], M = [C, C - 1];
    ctx.fillStyle = '#131a29'; poly(ctx, [T, R, Bm, L], true);
    ctx.fillStyle = '#5b7292'; poly(ctx, [T, L, M], true);
    ctx.fillStyle = COL.navy; poly(ctx, [T, R, M], true);
    ctx.fillStyle = '#2a3448'; poly(ctx, [L, Bm, M], true);
    ctx.fillStyle = '#1c2438'; poly(ctx, [R, Bm, M], true);
    pen(ctx, '#131a29', 1.1); poly(ctx, [T, R, Bm, L]);
    // facet seams catching light
    pen(ctx, 'rgba(238,235,221,.45)', 0.9); ln(ctx, L[0], L[1], R[0], R[1]); ln(ctx, T[0], T[1], Bm[0], Bm[1]);
    // hard sparkle + inner glow
    glint(ctx, C - 4.5, C - 6.5, 1.3); glint(ctx, C + 3, C + 3.5, 0.7);
    dot(ctx, C - 1, C + 6.5, 1, 'rgba(125,156,201,.6)');
    // stray motes drifting toward the stone
    dot(ctx, C - 13.5, C + 9, 1, '#7d9cc9'); dot(ctx, C + 14, C + 6, 0.8, '#5b7292'); dot(ctx, C + 12.5, C - 10.5, 0.7, '#5b7292');
  },
  luck(ctx) {
    // bending stem: shadow + lit blade
    pen(ctx, '#3d4a37', 2.8); ctx.beginPath(); ctx.moveTo(C + 1, C + 4); ctx.quadraticCurveTo(C + 1.5, C + 11, C - 3.5, C + 16); ctx.stroke();
    pen(ctx, COL.green, 1.3); ctx.beginPath(); ctx.moveTo(C + 0.5, C + 4); ctx.quadraticCurveTo(C + 1, C + 10.5, C - 3, C + 15.5); ctx.stroke();
    // three heart-leaves: dark base, lit face, crease
    const leaf = (a) => {
      ctx.save(); ctx.translate(C + Math.cos(a) * 9, C - 2.5 + Math.sin(a) * 9); ctx.rotate(a + Math.PI / 2);
      const hs = (s, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 6 * s); ctx.bezierCurveTo(-8.3 * s, -0.8 * s, -4.4 * s, -6.5 * s, 0, -2.1 * s); ctx.bezierCurveTo(4.4 * s, -6.5 * s, 8.3 * s, -0.8 * s, 0, 6 * s); ctx.fill(); };
      hs(1.14, '#3d4a37'); hs(1, COL.green);
      ctx.fillStyle = 'rgba(238,235,221,.25)'; ctx.beginPath(); ctx.moveTo(0, 4.7); ctx.bezierCurveTo(-6, -0.8, -3.4, -4.7, 0, -1.6); ctx.closePath(); ctx.fill();
      pen(ctx, '#3d4a37', 1); ln(ctx, 0, 4.7, 0, -3.4);
      ctx.restore();
    };
    leaf(-Math.PI / 2); leaf(Math.PI / 6); leaf(Math.PI - Math.PI / 6);
    // dew drop on the crown leaf
    glint(ctx, C - 5.5, C - 10.5, 1.2);
    dot(ctx, C + 11, C - 13, 0.7, 'rgba(117,135,107,.8)');
  },
  crit(ctx) {
    // steel scope ring: dark under, machined face, glass glare
    pen(ctx, COL.steelD, 3.4); cir(ctx, C, C, 11.5);
    pen(ctx, COL.steel, 1.4); cir(ctx, C, C, 11.5);
    pen(ctx, 'rgba(201,206,212,.85)', 0.9); ctx.beginPath(); ctx.arc(C, C, 11.5, -2.7, -1.4); ctx.stroke();
    // crosshair spars: blood core on dark
    for (const [x1, y1, x2, y2] of [[C - 17, C, C - 7.5, C], [C + 7.5, C, C + 17, C], [C, C - 17, C, C - 7.5], [C, C + 7.5, C, C + 17]]) {
      pen(ctx, COL.bloodD, 2.8); ln(ctx, x1, y1, x2, y2);
      pen(ctx, COL.red, 1.3); ln(ctx, x1, y1, x2, y2);
    }
    // range ticks
    pen(ctx, COL.red, 1); ln(ctx, C - 14, C - 2, C - 14, C + 2); ln(ctx, C + 14, C - 2, C + 14, C + 2); ln(ctx, C - 2, C - 14, C + 2, C - 14);
    // inner reticle + wet blood-drop centre
    pen(ctx, 'rgba(212,71,79,.8)', 1); cir(ctx, C, C, 5.4);
    dot(ctx, C, C, 2.7, COL.bloodD); dot(ctx, C - 0.2, C - 0.2, 1.9, COL.red); glint(ctx, C - 0.8, C - 0.9, 0.6);
  },
  area(ctx) {
    // shockwaves fading with distance, bright leading edge upper-left
    for (const [r, a] of [[15.5, 0.35], [11, 0.6]]) {
      pen(ctx, `rgba(138,122,86,${a})`, 2.4); cir(ctx, C, C, r);
      pen(ctx, `rgba(238,224,189,${a + 0.2})`, 1); ctx.beginPath(); ctx.arc(C, C, r, -2.8, -0.9); ctx.stroke();
    }
    // burst ticks between the waves
    pen(ctx, 'rgba(216,199,164,.55)', 1);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.39; ln(ctx, C + Math.cos(a) * 12.6, C + Math.sin(a) * 12.6, C + Math.cos(a) * 14, C + Math.sin(a) * 14); }
    // molten epicentre: ember glow under a bone collar
    const rg = ctx.createRadialGradient(C, C, 0.5, C, C, 7.5);
    rg.addColorStop(0, 'rgba(240,168,90,.9)'); rg.addColorStop(1, 'rgba(240,168,90,0)');
    ctx.fillStyle = rg; cir(ctx, C, C, 7.5, true);
    pen(ctx, COL.boneD, 2.6); cir(ctx, C, C, 6);
    pen(ctx, COL.boneL, 1.2); cir(ctx, C, C, 6);
    dot(ctx, C, C, 2.2, COL.ember); dot(ctx, C - 0.5, C - 0.7, 1, COL.flameCore);
  },
  shield(ctx) {
    // heater shield: night-blue field over a dark backing
    const sh = (s) => { ctx.beginPath(); ctx.moveTo(C, C - 13.5 * s); ctx.quadraticCurveTo(C + 10.5 * s, C - 11.5 * s, C + 11 * s, C - 7 * s); ctx.quadraticCurveTo(C + 11 * s, C + 4 * s, C, C + 14.5 * s); ctx.quadraticCurveTo(C - 11 * s, C + 4 * s, C - 11 * s, C - 7 * s); ctx.quadraticCurveTo(C - 10.5 * s, C - 11.5 * s, C, C - 13.5 * s); ctx.closePath(); };
    sh(1.12); ctx.fillStyle = '#131a29'; ctx.fill();
    sh(1); ctx.fillStyle = lg(ctx, C - 8, C - 12, C + 8, C + 12, [[0, '#5b7292'], [0.45, COL.navy], [1, '#1c2438']]); ctx.fill();
    pen(ctx, '#131a29', 1.1); sh(1); ctx.stroke();
    // riveted steel chief band
    pen(ctx, COL.steelD, 2.8); ctx.beginPath(); ctx.moveTo(C - 10.5, C - 8.5); ctx.quadraticCurveTo(C, C - 11.5, C + 10.5, C - 8.5); ctx.stroke();
    pen(ctx, COL.steelL, 1.1); ctx.beginPath(); ctx.moveTo(C - 10, C - 9); ctx.quadraticCurveTo(C, C - 12, C + 10, C - 9); ctx.stroke();
    for (const dx of [-6.5, 0, 6.5]) dot(ctx, C + dx, C - 9.7 + (dx ? 0.7 : 0), 0.8, COL.steelD);
    // bone cross charge
    pen(ctx, COL.boneD, 3.2); ln(ctx, C, C - 4.5, C, C + 8); ln(ctx, C - 5, C - 0.5, C + 5, C - 0.5);
    pen(ctx, COL.boneL, 1.4); ln(ctx, C, C - 4.5, C, C + 8); ln(ctx, C - 5, C - 0.5, C + 5, C - 0.5);
    // moonlit edge
    pen(ctx, 'rgba(125,156,201,.6)', 1); ctx.beginPath(); ctx.moveTo(C - 9.5, C - 6.5); ctx.quadraticCurveTo(C - 9.8, C + 2, C - 3.5, C + 9.5); ctx.stroke();
    glint(ctx, C - 5.5, C - 5.5, 1);
  },
  revive(ctx) {
    // cycle: dark under-arc, living green face, moonlit crest
    const arc = (col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.arc(C, C + 1, 11.5, 0.55, Math.PI * 2 - 0.35); ctx.stroke(); };
    arc('#3d4a37', 3.6); arc(COL.green, 1.7);
    pen(ctx, 'rgba(238,235,221,.55)', 0.9); ctx.beginPath(); ctx.arc(C, C + 1, 11.5, -2.7, -1.6); ctx.stroke();
    // arrowhead biting into the gap on the right
    const ax = C + 11.8, ay = C + 0.4;
    ctx.fillStyle = '#3d4a37'; poly(ctx, [[ax - 4.2, ay - 3.4], [ax + 4, ay - 1.6], [ax - 2.4, ay + 4.2]], true);
    ctx.fillStyle = COL.green; poly(ctx, [[ax - 3, ay - 2.2], [ax + 2.6, ay - 1], [ax - 1.8, ay + 2.8]], true);
    // sprout rising through the ring: wood stem, two leaves
    pen(ctx, COL.woodD, 2.6); ln(ctx, C, C + 9, C, C - 3);
    pen(ctx, COL.wood, 1.2); ln(ctx, C + 0.3, C + 8.5, C + 0.3, C - 2.5);
    const leafP = (sx) => { ctx.fillStyle = COL.green; ctx.beginPath(); ctx.moveTo(C, C - 2); ctx.quadraticCurveTo(C + 5.5 * sx, C - 3.5, C + 6.8 * sx, C - 8); ctx.quadraticCurveTo(C + 1.5 * sx, C - 7, C, C - 2); ctx.fill(); };
    leafP(1); leafP(-1);
    pen(ctx, 'rgba(238,235,221,.5)', 0.8); ln(ctx, C + 1.2, C - 3.2, C + 4.8, C - 6.8);
    glint(ctx, C - 5, C - 5.5, 0.9);
  },
  skull(ctx) {
    // cranium: shadowed base under a lit bone dome
    dot(ctx, C, C - 2.5, 11.4, COL.boneD);
    ctx.fillStyle = lg(ctx, C - 8, C - 12, C + 8, C + 8, [[0, COL.boneL], [0.55, COL.bone], [1, COL.boneD]]);
    cir(ctx, C - 0.3, C - 2.8, 10.6, true);
    // jaw with teeth
    ctx.fillStyle = COL.boneD; ctx.fillRect(C - 6.5, C + 5, 13, 8);
    ctx.fillStyle = COL.bone; ctx.fillRect(C - 6, C + 5, 12, 7);
    pen(ctx, COL.boneD, 1); ln(ctx, C - 6, C + 8.5, C + 6, C + 8.5);
    for (const dx of [-3, 0, 3]) ln(ctx, C + dx, C + 8.5, C + dx, C + 11.8);
    // sockets: ink pits, one lit by an ember spark
    dot(ctx, C - 4.4, C - 3.5, 3.1, COL.ink); dot(ctx, C + 4.4, C - 3.5, 3.1, COL.ink);
    dot(ctx, C - 3.9, C - 3.1, 0.9, COL.red);
    // nasal cavity + brow crack
    ctx.fillStyle = COL.ink; poly(ctx, [[C, C + 0.6], [C - 1.8, C + 4.4], [C + 1.8, C + 4.4]], true);
    pen(ctx, COL.boneD, 1); ctx.beginPath(); ctx.moveTo(C + 3, C - 12.5); ctx.lineTo(C + 5, C - 9.5); ctx.lineTo(C + 3.5, C - 7.5); ctx.stroke();
    // cheek shading + dome shine
    pen(ctx, 'rgba(138,122,86,.6)', 1); ctx.beginPath(); ctx.arc(C + 7.4, C + 1, 2.6, 2.5, 4.6); ctx.stroke();
    glint(ctx, C - 5.5, C - 9.5, 1.2);
  },
  sun(ctx) {
    // corona: alternating blood flares with hot mid-veins
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 - Math.PI / 2, long = i % 2 === 0, r2 = long ? 21.5 : 17.5;
      ctx.fillStyle = long ? COL.blood : '#54121d';
      poly(ctx, [[C + Math.cos(a - 0.14) * 13, C + Math.sin(a - 0.14) * 13], [C + Math.cos(a + 0.14) * 13, C + Math.sin(a + 0.14) * 13], [C + Math.cos(a) * r2, C + Math.sin(a) * r2]], true);
      if (long) { pen(ctx, COL.red, 0.8); ln(ctx, C + Math.cos(a) * 14.5, C + Math.sin(a) * 14.5, C + Math.cos(a) * (r2 - 1), C + Math.sin(a) * (r2 - 1)); }
    }
    // the void disc, faintly domed
    dot(ctx, C, C, 13.2, '#54121d');
    ctx.fillStyle = lg(ctx, C - 9, C - 9, C + 9, C + 9, [[0, '#211318'], [1, '#000']]); cir(ctx, C, C, 12.2, true);
    // dying-ember ring + occult notches
    pen(ctx, 'rgba(212,71,79,.55)', 1); cir(ctx, C, C, 9.6);
    pen(ctx, 'rgba(212,71,79,.75)', 1);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; ln(ctx, C + Math.cos(a) * 8.2, C + Math.sin(a) * 8.2, C + Math.cos(a) * 10.6, C + Math.sin(a) * 10.6); }
    // cold heart
    dot(ctx, C, C, 2.1, COL.bloodD); dot(ctx, C, C, 1, COL.red);
    glint(ctx, C - 4.5, C - 5, 0.7);
  },
  key(ctx) {
    ctx.save(); ctx.translate(C, C); ctx.rotate(Math.PI / 4);
    // stem: dark bronze under gold face, engraved collar
    pen(ctx, COL.goldD, 3.8); ln(ctx, 0, -4, 0, 13.5);
    pen(ctx, COL.gold, 1.9); ln(ctx, 0, -3.5, 0, 13);
    pen(ctx, COL.goldL, 0.8); ln(ctx, -0.7, -3, -0.7, 12.5);
    pen(ctx, COL.goldD, 1.2); ln(ctx, -2.3, 1.5, 2.3, 1.5); ln(ctx, -2.3, 3.2, 2.3, 3.2);
    // wards: two stepped teeth with lit tops
    pen(ctx, COL.goldD, 3.4); ln(ctx, 0, 13, 6, 13); ln(ctx, 0, 8.5, 4.2, 8.5);
    pen(ctx, COL.goldL, 1.2); ln(ctx, 0.5, 12.3, 5.5, 12.3); ln(ctx, 0.5, 7.9, 3.8, 7.9);
    // bow: pierced ring crowned with trefoil beads
    pen(ctx, COL.goldD, 4.6); cir(ctx, 0, -9.5, 5);
    pen(ctx, COL.gold, 2.2); cir(ctx, 0, -9.5, 5);
    pen(ctx, COL.goldL, 1); ctx.beginPath(); ctx.arc(0, -9.5, 5, -2.9, -1); ctx.stroke();
    for (const a of [-Math.PI / 2, Math.PI * 0.16, Math.PI * 0.84]) { dot(ctx, Math.cos(a) * 7.8, -9.5 + Math.sin(a) * 7.8, 1.6, COL.goldD); dot(ctx, Math.cos(a) * 7.8 - 0.2, -9.7 + Math.sin(a) * 7.8, 1.1, COL.gold); }
    glint(ctx, -1.8, -11.6, 0.9);
    ctx.restore();
  },
  eye(ctx) {
    // sclera: aged ivory almond
    ctx.fillStyle = lg(ctx, C - 8, C - 6, C + 8, C + 6, [[0, COL.boneL], [1, COL.boneD]]);
    ctx.beginPath(); ctx.moveTo(C - 14, C); ctx.quadraticCurveTo(C, C - 13, C + 14, C); ctx.quadraticCurveTo(C, C + 13, C - 14, C); ctx.fill();
    // iris: violet depth gradient, ink pupil, wet glint
    const ir = ctx.createRadialGradient(C - 1, C - 1, 0.5, C, C, 5.6);
    ir.addColorStop(0, '#a58bb5'); ir.addColorStop(0.7, COL.purple); ir.addColorStop(1, '#4a3956');
    ctx.fillStyle = ir; cir(ctx, C, C, 5.6, true);
    pen(ctx, '#4a3956', 1); cir(ctx, C, C, 5.6);
    dot(ctx, C, C, 2.4, COL.ink);
    glint(ctx, C - 2, C - 2.2, 1.1);
    // lids: dark under-stroke + bone face
    const lid = (q) => { const p = (col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.moveTo(C - 14, C); ctx.quadraticCurveTo(C, C + q, C + 14, C); ctx.stroke(); }; p('#5f5540', 3); p(COL.bone, 1.4); };
    lid(-13); lid(13);
    // lash ticks + weeping tear duct
    pen(ctx, COL.boneD, 1); ln(ctx, C - 8, C - 8.6, C - 9.5, C - 10.6); ln(ctx, C, C - 9.7, C, C - 12); ln(ctx, C + 8, C - 8.6, C + 9.5, C - 10.6);
    dot(ctx, C - 13.6, C + 1.5, 0.9, COL.blood);
  },
  ring(ctx) {
    // band: dark cast under warm gold, inner reflection arc
    pen(ctx, COL.goldD, 4.4); cir(ctx, C, C + 3.5, 8.6);
    pen(ctx, COL.gold, 2.1); cir(ctx, C, C + 3.5, 8.6);
    pen(ctx, COL.goldL, 0.9); ctx.beginPath(); ctx.arc(C, C + 3.5, 8.6, 2.1, 3.3); ctx.stroke();
    pen(ctx, 'rgba(111,83,32,.9)', 0.8); ctx.beginPath(); ctx.arc(C, C + 3.5, 6.7, 0.6, 1.7); ctx.stroke();
    // shoulders + claw prongs holding the stone
    pen(ctx, COL.goldD, 2.4); ln(ctx, C - 4.8, C - 3.5, C - 3.4, C - 6.8); ln(ctx, C + 4.8, C - 3.5, C + 3.4, C - 6.8);
    pen(ctx, COL.goldL, 1); ln(ctx, C - 4.4, C - 3.8, C - 3.2, C - 6.4); ln(ctx, C + 4.4, C - 3.8, C + 3.2, C - 6.4);
    // cut stone: dark table, blood faces, girdle line
    ctx.fillStyle = COL.bloodD; poly(ctx, [[C, C - 15.5], [C + 5.8, C - 9.5], [C, C - 3.5], [C - 5.8, C - 9.5]], true);
    ctx.fillStyle = COL.blood; poly(ctx, [[C, C - 14.4], [C + 4.5, C - 9.5], [C, C - 4.6], [C - 4.5, C - 9.5]], true);
    pen(ctx, COL.red, 0.9); ln(ctx, C - 4.5, C - 9.5, C + 4.5, C - 9.5);
    glint(ctx, C - 1.6, C - 11.3, 1);
    // starlight tick on the band
    glint(ctx, C + 7.4, C + 9, 0.8);
  },
  coin(ctx) {
    // second coin peeking from the stack
    pen(ctx, COL.goldD, 1.6); ctx.beginPath(); ctx.arc(C + 3.5, C + 3.5, 11.5, -0.75, 1.85); ctx.stroke();
    pen(ctx, 'rgba(226,189,102,.6)', 0.8); ctx.beginPath(); ctx.arc(C + 3.5, C + 3.5, 11.5, 0.1, 1.2); ctx.stroke();
    // face: warm minted disc with milled rim
    dot(ctx, C - 1.5, C - 1, 12.4, COL.goldD);
    ctx.fillStyle = lg(ctx, C - 10, C - 10, C + 8, C + 9, [[0, COL.goldL], [0.5, COL.gold], [1, COL.goldD]]);
    cir(ctx, C - 1.5, C - 1, 11.4, true);
    pen(ctx, COL.goldD, 1); cir(ctx, C - 1.5, C - 1, 9);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ln(ctx, C - 1.5 + Math.cos(a) * 10, C - 1 + Math.sin(a) * 10, C - 1.5 + Math.cos(a) * 11.4, C - 1 + Math.sin(a) * 11.4); }
    // embossed death's-head obverse
    ctx.fillStyle = '#4a3510'; cir(ctx, C - 1.5, C - 2.7, 3.7, true); ctx.fillRect(C - 3.7, C - 0.7, 4.4, 2.8);
    dot(ctx, C - 2.9, C - 3.2, 1, COL.gold); dot(ctx, C - 0.1, C - 3.2, 1, COL.gold);
    // defacing gash: dead men's currency
    pen(ctx, COL.bloodD, 2.6); ln(ctx, C - 10.5, C + 8, C + 7.5, C - 10);
    pen(ctx, COL.red, 1.2); ln(ctx, C - 10, C + 7.5, C + 7, C - 9.5);
    glint(ctx, C - 7.5, C - 7, 1.1);
  },
  cord(ctx) {
    // silk cord winding: dark core + violet face + sheen
    const path = (dx, dy) => { ctx.beginPath(); ctx.moveTo(C - 14 + dx, C - 11 + dy); ctx.bezierCurveTo(C + 10 + dx, C - 16 + dy, C - 12 + dx, C + 6 + dy, C + 4 + dx, C + 2.5 + dy); ctx.stroke(); };
    pen(ctx, '#4a3956', 4); path(0, 0);
    pen(ctx, COL.purple, 2); path(0, 0);
    pen(ctx, 'rgba(238,235,221,.45)', 0.9); ctx.beginPath(); ctx.moveTo(C - 11.5, C - 11.6); ctx.quadraticCurveTo(C - 4, C - 13.3, C + 1.5, C - 12.4); ctx.stroke();
    // frayed cut end
    pen(ctx, '#4a3956', 1.2); ln(ctx, C - 14, C - 11, C - 16.5, C - 13); ln(ctx, C - 14, C - 11, C - 16.8, C - 9.8);
    pen(ctx, COL.purple, 0.9); ln(ctx, C - 14, C - 11, C - 16.2, C - 11.8);
    // gold binding wraps above the tassel
    pen(ctx, COL.gold, 1.3); ln(ctx, C + 2.8, C + 0.4, C + 7, C + 2); ln(ctx, C + 2.2, C + 2.4, C + 6.4, C + 4);
    // tassel head: lacquered bead + falling fringe
    dot(ctx, C + 7.8, C + 6.5, 3.5, COL.bloodD); dot(ctx, C + 7.4, C + 6, 2.7, COL.blood);
    glint(ctx, C + 6.3, C + 4.9, 0.8);
    pen(ctx, COL.blood, 1.3); for (const d of [-2.4, 0, 2.4]) ln(ctx, C + 7.8 + d * 0.7, C + 9.2, C + 7 + d, C + 15);
    pen(ctx, COL.red, 0.9); ln(ctx, C + 8.2, C + 9.2, C + 8.6, C + 14.2);
  },
  needle(ctx) {
    // scarlet thread looping behind
    const thread = (col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.moveTo(C + 11.5, C - 13); ctx.bezierCurveTo(C + 18, C - 4, C - 16, C - 8, C - 8, C + 2); ctx.bezierCurveTo(C - 3, C + 8, C - 15, C + 8, C - 13.5, C + 15); ctx.stroke(); };
    thread(COL.bloodD, 2.2); thread(COL.red, 1);
    // shaft: dark spine + polished steel face, tapering
    pen(ctx, COL.steelD, 3.2); ln(ctx, C + 10, C - 10.5, C - 9, C + 8.5);
    pen(ctx, COL.steel, 1.7); ln(ctx, C + 10, C - 10.5, C - 9, C + 8.5);
    pen(ctx, COL.steelL, 0.8); ln(ctx, C + 9.3, C - 11, C - 5, C + 3.5);
    // fine point
    pen(ctx, COL.steelL, 1.4); ln(ctx, C - 9, C + 8.5, C - 12.8, C + 12.3);
    // eye of the needle: forged loop
    const eyeE = (col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.ellipse(C + 11.5, C - 12.2, 2.4, 3.4, -0.8, 0, Math.PI * 2); ctx.stroke(); };
    eyeE(COL.steelD, 2.6); eyeE(COL.steelL, 1);
    glint(ctx, C + 8.5, C - 9, 0.9);
    dot(ctx, C - 13.5, C + 16, 1, COL.red);
  },
  ledger(ctx) {
    // debt orbit passing behind the book
    pen(ctx, COL.steelD, 2.4); ctx.beginPath(); ctx.ellipse(C, C + 1, 15.5, 6.5, 0.6, 0, Math.PI * 2); ctx.stroke();
    // ledger: leather cover, bone page block
    ctx.fillStyle = '#3a3226'; ctx.fillRect(C - 10.5, C - 12.5, 21, 25);
    pen(ctx, '#584c38', 1); ctx.strokeRect(C - 10.5, C - 12.5, 21, 25);
    ctx.fillStyle = lg(ctx, C - 9, C - 11, C + 9, C + 11, [[0, COL.boneL], [1, COL.bone]]); ctx.fillRect(C - 9, C - 11, 18, 22);
    pen(ctx, COL.boneD, 1); ctx.strokeRect(C - 9, C - 11, 18, 22);
    // entries, one struck through in red
    pen(ctx, COL.dim, 1.1); ln(ctx, C - 6, C - 7, C + 6, C - 7); ln(ctx, C - 6, C - 3, C + 6, C - 3); ln(ctx, C - 6, C + 1, C + 3, C + 1);
    pen(ctx, COL.red, 1.2); ln(ctx, C - 7, C - 2.6, C + 7, C - 3.4);
    // the sum owed: double-ruled in blood
    pen(ctx, COL.blood, 1); ln(ctx, C - 6, C + 6, C + 6, C + 6); ln(ctx, C - 6, C + 7.8, C + 6, C + 7.8);
    // orbit sweeping across the front, moonlit
    pen(ctx, COL.steel, 2); ctx.beginPath(); ctx.ellipse(C, C + 1, 15.5, 6.5, 0.6, -0.6, 2.2); ctx.stroke();
    pen(ctx, COL.steelL, 0.9); ctx.beginPath(); ctx.ellipse(C, C + 1, 15.5, 6.5, 0.6, 0.2, 1.6); ctx.stroke();
    // gilded corner cap
    pen(ctx, COL.gold, 1.2); ln(ctx, C - 9, C - 8, C - 9, C - 11); ln(ctx, C - 9, C - 11, C - 6, C - 11);
    glint(ctx, C - 6.5, C - 9.5, 0.8);
  },
  hourglass(ctx) {
    // turned wood posts
    pen(ctx, COL.woodD, 2.6); ln(ctx, C - 10, C - 12, C - 10, C + 12); ln(ctx, C + 10, C - 12, C + 10, C + 12);
    pen(ctx, COL.wood, 1.1); ln(ctx, C - 9.6, C - 11.5, C - 9.6, C + 11.5); ln(ctx, C + 10.4, C - 11.5, C + 10.4, C + 11.5);
    // glass bulbs: cold night tint
    const bulb = (f) => { ctx.beginPath(); ctx.moveTo(C - 7.5, C + -12 * f); ctx.lineTo(C + 7.5, C + -12 * f); ctx.quadraticCurveTo(C + 6.5, C + -4 * f, C + 1, C + -0.8 * f); ctx.lineTo(C - 1, C + -0.8 * f); ctx.quadraticCurveTo(C - 6.5, C + -4 * f, C - 7.5, C + -12 * f); ctx.closePath(); };
    ctx.fillStyle = 'rgba(70,96,138,.28)'; bulb(1); ctx.fill(); bulb(-1); ctx.fill();
    // sand: remainder above, thread, spent pile below
    ctx.fillStyle = COL.boneD; poly(ctx, [[C - 4.5, C - 8.5], [C + 4.5, C - 8.5], [C + 0.9, C - 1.6], [C - 0.9, C - 1.6]], true);
    ctx.fillStyle = COL.bone; poly(ctx, [[C - 3.8, C - 8.5], [C + 3.2, C - 8.5], [C + 0.5, C - 2.2], [C - 0.7, C - 2.2]], true);
    ctx.fillStyle = COL.boneD; poly(ctx, [[C - 5.5, C + 11], [C + 5.5, C + 11], [C, C + 5]], true);
    ctx.fillStyle = COL.bone; poly(ctx, [[C - 4, C + 11], [C + 3, C + 11], [C - 0.5, C + 6.5]], true);
    pen(ctx, COL.boneL, 1); ln(ctx, C, C - 1.8, C, C + 9);
    // glass outline + slanted window light
    pen(ctx, 'rgba(154,161,168,.8)', 1.1); bulb(1); ctx.stroke(); bulb(-1); ctx.stroke();
    pen(ctx, 'rgba(238,235,221,.5)', 1); ln(ctx, C - 5.3, C - 10.5, C - 3.2, C - 5.5); ln(ctx, C - 5.3, C + 10.5, C - 3.2, C + 5.5);
    // brass caps top and bottom
    for (const y of [C - 15, C + 12]) { ctx.fillStyle = COL.goldD; ctx.fillRect(C - 11.5, y, 23, 3); pen(ctx, COL.goldL, 1); ln(ctx, C - 10.8, y + 0.9, C + 10.8, y + 0.9); }
    glint(ctx, C - 8, C - 13.4, 0.7);
  },
  mask(ctx) {
    // ribbon ties streaming behind
    pen(ctx, COL.blood, 1.4);
    ctx.beginPath(); ctx.moveTo(C - 8.5, C - 3); ctx.quadraticCurveTo(C - 14, C - 5, C - 15.5, C - 10.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(C + 8.5, C - 3); ctx.quadraticCurveTo(C + 14, C - 5, C + 15.5, C - 10.5); ctx.stroke();
    // porcelain oval: cold shadow under a lit face
    ctx.fillStyle = '#8f8570'; ctx.beginPath(); ctx.ellipse(C + 0.6, C + 0.8, 9.6, 12.6, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lg(ctx, C - 7, C - 10, C + 7, C + 10, [[0, '#fdfbf2'], [0.55, COL.white], [1, '#c9c2ae']]);
    ctx.beginPath(); ctx.ellipse(C, C, 9.4, 12.4, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, '#a89f8a', 1); ctx.beginPath(); ctx.ellipse(C, C, 9.4, 12.4, 0, 0, Math.PI * 2); ctx.stroke();
    // gilt brow trim
    pen(ctx, COL.gold, 1.2); ctx.beginPath(); ctx.ellipse(C, C, 9.4, 12.4, 0, -2.6, -0.5); ctx.stroke();
    // hollow eyes, the right one weeping gold
    ctx.fillStyle = COL.ink;
    ctx.beginPath(); ctx.ellipse(C - 4, C - 3.5, 2.1, 3, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(C + 4, C - 3.5, 2.1, 3, -0.15, 0, Math.PI * 2); ctx.fill();
    pen(ctx, COL.gold, 1.1); ln(ctx, C + 4.6, C - 0.5, C + 5.4, C + 4.5); dot(ctx, C + 5.6, C + 5.8, 1, COL.gold);
    // serene mouth + hairline crack
    pen(ctx, COL.ink, 1.4); ctx.beginPath(); ctx.arc(C, C + 4.5, 3.6, 0.35, Math.PI - 0.35); ctx.stroke();
    pen(ctx, '#a89f8a', 0.9); ctx.beginPath(); ctx.moveTo(C - 6.5, C + 11.5); ctx.lineTo(C - 4.5, C + 7.5); ctx.lineTo(C - 5.8, C + 4.5); ctx.stroke();
    glint(ctx, C - 3.5, C - 8.5, 1.2);
  },
  feather(ctx) {
    // vane: shadowed base + moonlit face
    const vane = () => { ctx.beginPath(); ctx.moveTo(C - 11, C + 14); ctx.quadraticCurveTo(C - 6, C - 12, C + 10, C - 14.5); ctx.quadraticCurveTo(C + 10.5, C - 2, C - 11, C + 14); ctx.closePath(); };
    vane(); ctx.fillStyle = '#8f8570'; ctx.fill();
    ctx.save(); ctx.translate(-0.7, -0.7); vane(); ctx.fillStyle = lg(ctx, C - 8, C + 8, C + 8, C - 10, [[0, '#c9c2ae'], [0.5, COL.white], [1, '#fdfbf2']]); ctx.fill(); ctx.restore();
    // rachis: dark shaft down the middle
    pen(ctx, COL.boneD, 1.7); ctx.beginPath(); ctx.moveTo(C - 11, C + 14); ctx.quadraticCurveTo(C - 1, C - 1, C + 9, C - 13.5); ctx.stroke();
    // barb splits
    pen(ctx, 'rgba(143,133,112,.75)', 1); ln(ctx, C - 4, C + 4.5, C - 8.5, C + 2.5); ln(ctx, C + 0.5, C - 1.5, C - 3.5, C - 4.5); ln(ctx, C + 4.5, C - 6.5, C + 1, C - 9.5);
    // ember-dipped tip, still warm
    pen(ctx, COL.orange, 1.8); ctx.beginPath(); ctx.moveTo(C + 5.5, C - 9.5); ctx.quadraticCurveTo(C + 8, C - 12, C + 10, C - 14.5); ctx.stroke();
    pen(ctx, COL.ember, 0.9); ctx.beginPath(); ctx.moveTo(C + 6.5, C - 10.5); ctx.quadraticCurveTo(C + 8.5, C - 12.5, C + 10, C - 14.5); ctx.stroke();
    dot(ctx, C + 12.5, C - 15, 0.7, COL.ember);
    // gilded quill nib at the base
    pen(ctx, COL.goldD, 2.4); ln(ctx, C - 11, C + 14, C - 14, C + 17);
    pen(ctx, COL.goldL, 1); ln(ctx, C - 11.4, C + 13.8, C - 13.6, C + 16);
    glint(ctx, C - 2, C + 1.5, 0.9);
  },
  invite(ctx) {
    // aged parchment envelope
    ctx.fillStyle = COL.boneD; ctx.fillRect(C - 13, C - 9.5, 26, 19);
    ctx.fillStyle = lg(ctx, C - 11, C - 8, C + 11, C + 8, [[0, COL.boneL], [1, COL.bone]]); ctx.fillRect(C - 12, C - 8.5, 24, 17);
    pen(ctx, COL.boneD, 1.1); ctx.strokeRect(C - 12, C - 8.5, 24, 17);
    // flap folds with a lit crease
    pen(ctx, COL.boneD, 1.2); ln(ctx, C - 12, C - 8.5, C, C + 1.5); ln(ctx, C + 12, C - 8.5, C, C + 1.5);
    pen(ctx, 'rgba(238,224,189,.85)', 0.8); ln(ctx, C - 11, C - 8, C - 0.5, C + 0.6);
    // gilt deckle edge
    pen(ctx, COL.gold, 1); ln(ctx, C - 12, C + 8.5, C + 12, C + 8.5);
    // ribbon tails slipping out beneath the seal
    pen(ctx, COL.blood, 1.5); ln(ctx, C - 2, C + 6, C - 4.5, C + 12.5); ln(ctx, C + 2, C + 6, C + 4.5, C + 12.5);
    pen(ctx, COL.red, 0.9); ln(ctx, C - 2.2, C + 6.5, C - 4.2, C + 11.5);
    // black wax seal, red sigil pressed in
    dot(ctx, C, C + 2.5, 4.5, COL.ink); dot(ctx, C - 0.2, C + 2.2, 3.7, '#1b171c');
    pen(ctx, COL.red, 1); cir(ctx, C - 0.2, C + 2.2, 1.9);
    dot(ctx, C - 0.2, C + 2.2, 0.7, COL.red);
    glint(ctx, C - 1.9, C + 0.5, 0.7);
    glint(ctx, C - 9.5, C - 6.5, 0.8);
  },
  seedface(ctx) {
    // iron seed: cold ovoid with a welded seam
    ctx.fillStyle = COL.steelD; ctx.beginPath(); ctx.ellipse(C, C + 1.5, 9.4, 12.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lg(ctx, C - 7, C - 8, C + 7, C + 12, [[0, COL.steelL], [0.5, COL.steel], [1, COL.steelD]]);
    ctx.beginPath(); ctx.ellipse(C - 0.3, C + 1.2, 8.6, 11.4, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, COL.steelD, 1); ctx.beginPath(); ctx.ellipse(C, C + 1.5, 9.4, 12.2, 0, 0, Math.PI * 2); ctx.stroke();
    // riveted seam across the belly
    pen(ctx, COL.steelD, 1); ctx.beginPath(); ctx.moveTo(C - 8.5, C + 4.5); ctx.quadraticCurveTo(C, C + 7, C + 8.5, C + 4.5); ctx.stroke();
    for (const dx of [-5, 0, 5]) dot(ctx, C + dx, C + 5.4 + (dx ? -0.3 : 0.7), 0.7, COL.steelD);
    // sleeping face: closed eyes, faint dreaming mouth
    pen(ctx, COL.ink, 1.6);
    ctx.beginPath(); ctx.arc(C - 3.6, C - 2.5, 1.9, 0.3, Math.PI - 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(C + 3.6, C - 2.5, 1.9, 0.5, Math.PI - 0.3); ctx.stroke();
    pen(ctx, COL.ink, 1.2); ctx.beginPath(); ctx.arc(C, C + 1.6, 2.6, 0.5, Math.PI - 0.5); ctx.stroke();
    // living sprout splitting the crown
    pen(ctx, '#3d4a37', 2.4); ctx.beginPath(); ctx.moveTo(C + 0.5, C - 10.5); ctx.quadraticCurveTo(C - 1.5, C - 14.5, C - 5.5, C - 16); ctx.stroke();
    pen(ctx, COL.green, 1.2); ctx.beginPath(); ctx.moveTo(C + 0.5, C - 10.5); ctx.quadraticCurveTo(C - 1.2, C - 14, C - 5, C - 15.5); ctx.stroke();
    ctx.fillStyle = COL.green; ctx.beginPath(); ctx.moveTo(C - 5, C - 15.5); ctx.quadraticCurveTo(C - 9, C - 17, C - 10.5, C - 14); ctx.quadraticCurveTo(C - 7, C - 12.5, C - 5, C - 15.5); ctx.fill();
    // crack where it broke through
    pen(ctx, COL.steelD, 0.9); ln(ctx, C + 0.5, C - 10.5, C + 2.5, C - 8);
    glint(ctx, C - 3.5, C - 6, 1.1);
  },
  bottle(ctx) {
    // cork stopper
    ctx.fillStyle = COL.wood; ctx.fillRect(C - 2.7, C - 15.5, 5.4, 4.2);
    pen(ctx, COL.woodD, 1); ctx.strokeRect(C - 2.7, C - 15.5, 5.4, 4.2);
    pen(ctx, 'rgba(226,189,102,.5)', 0.8); ln(ctx, C - 1.8, C - 14.8, C - 1.8, C - 12);
    // shouldered glass body
    const body = () => { ctx.beginPath(); ctx.moveTo(C - 3, C - 11.5); ctx.lineTo(C + 3, C - 11.5); ctx.lineTo(C + 3, C - 6.5); ctx.quadraticCurveTo(C + 8, C - 5, C + 8, C + 0.5); ctx.lineTo(C + 8, C + 12); ctx.quadraticCurveTo(C + 8, C + 14, C + 6, C + 14); ctx.lineTo(C - 6, C + 14); ctx.quadraticCurveTo(C - 8, C + 14, C - 8, C + 12); ctx.lineTo(C - 8, C + 0.5); ctx.quadraticCurveTo(C - 8, C - 5, C - 3, C - 6.5); ctx.closePath(); };
    ctx.fillStyle = 'rgba(70,96,138,.3)'; body(); ctx.fill();
    // tonic: bright draught over red dregs, meniscus shine
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = COL.bloodD; ctx.fillRect(C - 8, C + 9, 16, 6);
    ctx.fillStyle = lg(ctx, C, C + 1, C, C + 9, [[0, COL.ember], [1, COL.orange]]); ctx.fillRect(C - 8, C + 1, 16, 8);
    pen(ctx, 'rgba(246,231,187,.85)', 1); ln(ctx, C - 7.5, C + 1.5, C + 7.5, C + 1.5);
    pen(ctx, 'rgba(246,231,187,.6)', 0.8); cir(ctx, C + 3.5, C + 5.5, 1); cir(ctx, C - 2, C + 7.5, 0.7);
    ctx.restore();
    // glass line + standing highlight + neck cord
    pen(ctx, COL.bone, 1.3); body(); ctx.stroke();
    pen(ctx, 'rgba(238,235,221,.6)', 1.4); ln(ctx, C - 5.5, C - 3.5, C - 5.5, C + 11);
    pen(ctx, COL.gold, 1); ln(ctx, C - 3.4, C - 10, C + 3.4, C - 10);
    glint(ctx, C - 0.8, C - 14.6, 0.6);
  },
  dice(ctx) {
    // carved bone die in isometric: three faces, three tones
    const top = [[C, C - 14], [C + 11, C - 8], [C, C - 2], [C - 11, C - 8]];
    const left = [[C - 11, C - 8], [C, C - 2], [C, C + 12], [C - 11, C + 6]];
    const right = [[C + 11, C - 8], [C, C - 2], [C, C + 12], [C + 11, C + 6]];
    ctx.fillStyle = COL.boneL; poly(ctx, top, true);
    ctx.fillStyle = COL.bone; poly(ctx, left, true);
    ctx.fillStyle = COL.boneD; poly(ctx, right, true);
    pen(ctx, '#5f5540', 1.1); poly(ctx, top); poly(ctx, left); poly(ctx, right);
    // pips: the ace inlaid in blood, flanks drilled dark
    dot(ctx, C, C - 8.3, 1.9, COL.bloodD); dot(ctx, C - 0.2, C - 8.5, 1.5, COL.blood); glint(ctx, C - 0.7, C - 9, 0.5);
    dot(ctx, C - 5.5, C - 0.5, 1.3, '#5f5540'); dot(ctx, C - 5.5, C + 6.5, 1.3, '#5f5540');
    dot(ctx, C + 5.5, C - 1, 1.3, '#4a4234'); dot(ctx, C + 3, C + 4, 1.3, '#4a4234'); dot(ctx, C + 8, C + 1.5, 1.3, '#4a4234');
    // worn corner nick + table shadow
    pen(ctx, '#5f5540', 1); ln(ctx, C - 10.2, C - 9.4, C - 8.6, C - 7.2);
    pen(ctx, 'rgba(11,10,12,.5)', 2); ln(ctx, C - 8, C + 13.8, C + 8, C + 13.8);
    glint(ctx, C - 4, C - 11.5, 0.9);
  },
  statue(ctx) {
    // stone plinth: two weathered steps
    ctx.fillStyle = '#3f3b49'; ctx.fillRect(C - 7.5, C + 7.5, 15, 3.5);
    ctx.fillStyle = '#4a4550'; ctx.fillRect(C - 10.5, C + 11, 21, 4);
    pen(ctx, 'rgba(238,235,221,.3)', 1); ln(ctx, C - 10, C + 11.4, C + 10, C + 11.4);
    // robed idol: granite gradient with a lit shoulder
    const robe = () => { ctx.beginPath(); ctx.moveTo(C - 8, C + 7.5); ctx.lineTo(C - 6.2, C - 5); ctx.quadraticCurveTo(C - 6.4, C - 12, C, C - 14); ctx.quadraticCurveTo(C + 6.4, C - 12, C + 6.2, C - 5); ctx.lineTo(C + 8, C + 7.5); ctx.closePath(); };
    robe(); ctx.fillStyle = lg(ctx, C - 6, C - 11, C + 7, C + 8, [[0, '#8a8496'], [0.45, '#5c5766'], [1, '#3f3b49']]); ctx.fill();
    pen(ctx, '#211e28', 1.1); robe(); ctx.stroke();
    // hood hollow with twin ember eyes
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.ellipse(C, C - 8.5, 3.6, 4.4, 0, 0, Math.PI * 2); ctx.fill();
    dot(ctx, C - 1.5, C - 8.8, 0.7, COL.ember); dot(ctx, C + 1.5, C - 8.8, 0.7, COL.ember);
    // drapery folds + creeping moss stain
    pen(ctx, '#332f3b', 1.1); ln(ctx, C - 3, C - 2.5, C - 4.2, C + 7); ln(ctx, C + 3, C - 2.5, C + 4.2, C + 7);
    pen(ctx, 'rgba(117,135,107,.65)', 1.4); ctx.beginPath(); ctx.moveTo(C + 5.8, C + 1); ctx.quadraticCurveTo(C + 7, C + 4.5, C + 6.3, C + 7.5); ctx.stroke();
    pen(ctx, 'rgba(117,135,107,.45)', 1); ln(ctx, C - 9.5, C + 12.5, C - 6.5, C + 12.5);
    // moonlit edge down the left of the hood
    pen(ctx, 'rgba(238,235,221,.5)', 1.2); ctx.beginPath(); ctx.moveTo(C - 5.2, C - 11.5); ctx.quadraticCurveTo(C - 6.6, C - 6, C - 5.9, C - 1); ctx.stroke();
    glint(ctx, C - 1.5, C - 13, 0.9);
  },
  salt(ctx) {
    // burlap sack: warm weave over a shadowed base
    const sack = () => { ctx.beginPath(); ctx.moveTo(C - 3.5, C - 8); ctx.quadraticCurveTo(C - 10.5, C - 4.5, C - 10.5, C + 5); ctx.quadraticCurveTo(C - 10.5, C + 13, C, C + 13); ctx.quadraticCurveTo(C + 10.5, C + 13, C + 10.5, C + 5); ctx.quadraticCurveTo(C + 10.5, C - 4.5, C + 3.5, C - 8); ctx.closePath(); };
    sack(); ctx.fillStyle = lg(ctx, C - 8, C - 6, C + 8, C + 12, [[0, COL.bone], [0.5, '#b3a37f'], [1, COL.boneD]]); ctx.fill();
    pen(ctx, '#5f5540', 1.2); sack(); ctx.stroke();
    // coarse weave lines
    pen(ctx, 'rgba(95,85,64,.5)', 0.8); ln(ctx, C - 7.5, C - 0.5, C + 7.5, C + 1); ln(ctx, C - 8, C + 4.5, C + 8, C + 6); ln(ctx, C - 2, C - 5, C - 4, C + 11.5);
    // gathered neck bound with red cord
    pen(ctx, '#5f5540', 2.8); ln(ctx, C - 4.2, C - 8.5, C + 4.2, C - 8.5);
    pen(ctx, COL.blood, 1.3); ln(ctx, C - 4.6, C - 7.5, C + 4.6, C - 7.5);
    // tipped mouth spilling crystals
    ctx.fillStyle = COL.boneL; ctx.beginPath(); ctx.ellipse(C + 1, C - 10.8, 3.8, 2, 0.35, 0, Math.PI * 2); ctx.fill();
    pen(ctx, '#5f5540', 1); ctx.beginPath(); ctx.ellipse(C + 1, C - 10.8, 3.8, 2, 0.35, 0, Math.PI * 2); ctx.stroke();
    // salt arcing out, each grain catching light
    for (const [x, y, r] of [[C + 6.5, C - 13.5, 1], [C + 10, C - 11, 0.9], [C + 12, C - 7, 0.9], [C + 13, C - 2.5, 0.8], [C + 13.5, C + 2, 0.7]]) { dot(ctx, x, y, r, COL.boneL); glint(ctx, x - 0.4, y - 0.5, 0.4); }
    // ward line it was poured for
    pen(ctx, 'rgba(238,224,189,.6)', 1.4); ln(ctx, C + 9, C + 14.5, C + 16, C + 14.5);
    glint(ctx, C - 6, C - 3.5, 1);
  },
  mercyknife(ctx) {
    // misericorde: slender blade, point down, moon-pale
    const B = [[C, C + 15.5], [C + 2.4, C + 8], [C + 2, C - 4], [C - 2, C - 4], [C - 2.4, C + 8]];
    ctx.fillStyle = lg(ctx, C - 2.4, C, C + 2.4, C, [[0, COL.steelL], [0.5, COL.steel], [1, COL.steelD]]);
    poly(ctx, B, true);
    pen(ctx, COL.steelD, 0.9); poly(ctx, B);
    pen(ctx, COL.white, 0.9); ln(ctx, C - 0.3, C - 3, C - 0.1, C + 13.5);
    // a single tear of blood at the point
    dot(ctx, C + 0.2, C + 17.2, 1.1, COL.red); glint(ctx, C - 0.1, C + 16.9, 0.35);
    // slim silver cross-guard
    pen(ctx, COL.steelD, 2.8); ln(ctx, C - 7.5, C - 5.2, C + 7.5, C - 5.2);
    pen(ctx, COL.steelL, 1.1); ln(ctx, C - 7, C - 5.7, C + 7, C - 5.7);
    dot(ctx, C - 8, C - 5.4, 1, COL.steelD); dot(ctx, C + 8, C - 5.4, 1, COL.steelD);
    // cord-wrapped grip with gold rings
    pen(ctx, COL.woodD, 3.4); ln(ctx, C, C - 6.5, C, C - 13);
    pen(ctx, COL.wood, 1.7); ln(ctx, C, C - 7, C, C - 12.5);
    pen(ctx, COL.gold, 1); ln(ctx, C - 1.7, C - 8.4, C + 1.7, C - 9.2); ln(ctx, C - 1.7, C - 10.4, C + 1.7, C - 11.2);
    // pale moonstone pommel
    dot(ctx, C, C - 14.9, 2.1, COL.steelD); dot(ctx, C - 0.3, C - 15.1, 1.4, COL.white);
    glint(ctx, C - 1.1, C + 2, 0.8);
  },
  crownempty(ctx) {
    // faded funeral cushion
    ctx.fillStyle = '#3a2430'; ctx.beginPath(); ctx.ellipse(C, C + 11.5, 12.5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, '#54121d', 1); ctx.beginPath(); ctx.ellipse(C, C + 11.5, 12.5, 3.4, 0, 0, Math.PI * 2); ctx.stroke();
    pen(ctx, 'rgba(212,71,79,.4)', 0.8); ctx.beginPath(); ctx.ellipse(C, C + 11, 9.5, 2, 0, Math.PI, Math.PI * 2); ctx.stroke();
    // circlet: warm gold over dark cast
    const band = () => { ctx.beginPath(); ctx.moveTo(C - 11, C + 8.5); ctx.lineTo(C - 11, C - 3); ctx.lineTo(C - 5.5, C + 1.5); ctx.lineTo(C, C - 8.5); ctx.lineTo(C + 5.5, C + 1.5); ctx.lineTo(C + 11, C - 3); ctx.lineTo(C + 11, C + 8.5); ctx.closePath(); };
    band(); ctx.fillStyle = lg(ctx, C - 9, C - 4, C + 9, C + 9, [[0, COL.goldL], [0.5, COL.gold], [1, COL.goldD]]); ctx.fill();
    pen(ctx, COL.goldD, 1.2); band(); ctx.stroke();
    // engraved base band
    pen(ctx, COL.goldD, 1); ln(ctx, C - 10.5, C + 5.2, C + 10.5, C + 5.2);
    pen(ctx, COL.goldL, 0.8); ln(ctx, C - 10.5, C + 6.4, C + 10.5, C + 6.4);
    // pried-out sockets where the jewels sat
    for (const [x, y] of [[C - 7, C + 2.2], [C, C + 0.8], [C + 7, C + 2.2]]) { dot(ctx, x, y, 1.7, COL.ink); pen(ctx, '#4a3510', 0.8); cir(ctx, x, y, 2.1); }
    // tarnished finial beads
    dot(ctx, C - 11, C - 4, 1.2, COL.goldD); dot(ctx, C, C - 9.6, 1.3, COL.goldD); dot(ctx, C + 11, C - 4, 1.2, COL.goldD);
    dot(ctx, C - 0.2, C - 9.8, 0.7, COL.gold);
    // one lost pearl rolling away
    dot(ctx, C + 14, C + 13.5, 1.4, COL.boneD); glint(ctx, C + 13.5, C + 13, 0.5);
    glint(ctx, C - 7.5, C - 1, 1);
  },
  tooth(ctx) {
    // molar: dark base under an enamel gradient, twin roots
    const shape = (s, dy) => { ctx.beginPath(); ctx.moveTo(C - 8 * s, C - 6 * s + dy); ctx.quadraticCurveTo(C - 8.5 * s, C - 14 * s + dy, C, C - 13.5 * s + dy); ctx.quadraticCurveTo(C + 8.5 * s, C - 14 * s + dy, C + 8 * s, C - 6 * s + dy); ctx.quadraticCurveTo(C + 9 * s, C + 2 * s + dy, C + 5.5 * s, C + 12 * s + dy); ctx.quadraticCurveTo(C + 4 * s, C + 14.5 * s + dy, C + 3 * s, C + 11.5 * s + dy); ctx.lineTo(C + 1.5 * s, C + 5 * s + dy); ctx.quadraticCurveTo(C, C + 3 * s + dy, C - 1.5 * s, C + 5 * s + dy); ctx.lineTo(C - 3 * s, C + 11.5 * s + dy); ctx.quadraticCurveTo(C - 4 * s, C + 14.5 * s + dy, C - 5.5 * s, C + 12 * s + dy); ctx.quadraticCurveTo(C - 9 * s, C + 2 * s + dy, C - 8 * s, C - 6 * s + dy); ctx.closePath(); };
    shape(1.1, 0.5); ctx.fillStyle = '#5f5540'; ctx.fill();
    shape(1, 0); ctx.fillStyle = lg(ctx, C - 7, C - 12, C + 7, C + 10, [[0, '#fdfbf2'], [0.45, COL.boneL], [1, COL.boneD]]); ctx.fill();
    // crown crease + root shadows
    pen(ctx, COL.boneD, 1); ctx.beginPath(); ctx.moveTo(C - 5, C - 9.5); ctx.quadraticCurveTo(C, C - 7.5, C + 5, C - 9.5); ctx.stroke();
    pen(ctx, 'rgba(95,85,64,.6)', 1); ln(ctx, C - 4, C + 6, C - 4.8, C + 11); ln(ctx, C + 4, C + 6, C + 4.8, C + 11);
    // dried blood at one root, gold filling in the crown
    dot(ctx, C + 4.4, C + 13.2, 1.2, COL.blood);
    dot(ctx, C + 3.5, C - 11, 1.2, COL.gold); glint(ctx, C + 3.1, C - 11.4, 0.4);
    glint(ctx, C - 4.5, C - 10.5, 1.2);
  },
  nail(ctx) {
    ctx.save(); ctx.translate(C, C); ctx.rotate(Math.PI / 5);
    // hand-forged shank: dark flat + cold steel face
    pen(ctx, COL.steelD, 4); ln(ctx, 0, -10, 0, 8);
    pen(ctx, COL.steel, 2); ln(ctx, 0, -10, 0, 8);
    pen(ctx, COL.steelL, 0.9); ln(ctx, -0.8, -9.5, -0.8, 6);
    // taper to the point
    ctx.fillStyle = COL.steelD; poly(ctx, [[-2, 7.5], [2, 7.5], [0, 15]], true);
    ctx.fillStyle = COL.steel; poly(ctx, [[-1.2, 7.5], [1.4, 7.5], [0.2, 13.6]], true);
    // hammered head, peened edge
    ctx.fillStyle = COL.steelD; ctx.fillRect(-5.5, -13.5, 11, 3.6);
    ctx.fillStyle = lg(ctx, -5, -13, 5, -10, [[0, COL.steelL], [1, COL.steelD]]); ctx.fillRect(-4.8, -13, 9.6, 2.6);
    pen(ctx, COL.steelD, 0.8); ln(ctx, -5.5, -9.9, 5.5, -9.9);
    // rust bloom creeping down + blood at the point
    pen(ctx, 'rgba(201,107,47,.65)', 1.4); ln(ctx, 1.2, -8.5, 1.2, -3.5);
    pen(ctx, 'rgba(201,107,47,.4)', 1); ln(ctx, -1.6, -6, -1.6, -2.5);
    dot(ctx, 0, 15.8, 1.1, COL.red);
    glint(ctx, -3.2, -12.2, 0.8);
    ctx.restore();
  },
  candleblack(ctx) {
    // flame halo
    const rg = ctx.createRadialGradient(C, C - 9.5, 0.5, C, C - 9.5, 8.5);
    rg.addColorStop(0, 'rgba(240,168,90,.5)'); rg.addColorStop(1, 'rgba(240,168,90,0)');
    ctx.fillStyle = rg; cir(ctx, C, C - 9.5, 8.5, true);
    // black wax column
    ctx.fillStyle = '#0f0d11'; ctx.fillRect(C - 5, C - 4.5, 10, 17);
    ctx.fillStyle = lg(ctx, C - 4, C, C + 5, C, [[0, '#3f3b49'], [0.4, '#1b171c'], [1, '#0f0d11']]); ctx.fillRect(C - 4.4, C - 4.5, 8.8, 17);
    pen(ctx, '#3f3b49', 1); ctx.strokeRect(C - 5, C - 4.5, 10, 17);
    // molten lip + wax runs
    pen(ctx, '#3f3b49', 1.6); ctx.beginPath(); ctx.moveTo(C - 5, C - 4.5); ctx.quadraticCurveTo(C - 2, C - 2.5, C + 1, C - 4.5); ctx.quadraticCurveTo(C + 3, C - 3, C + 5, C - 4.5); ctx.stroke();
    pen(ctx, '#2c2833', 1.4); ln(ctx, C - 3, C - 3.5, C - 3, C + 3.5); ln(ctx, C + 3.4, C - 3.5, C + 3.4, C + 0.5);
    // witch-light edge on the wax
    pen(ctx, 'rgba(124,95,138,.55)', 1); ln(ctx, C - 4.6, C - 3.5, C - 4.6, C + 11);
    // wick + flame: ember teardrop with a pale heart
    pen(ctx, COL.ink, 1.2); ln(ctx, C, C - 4.5, C, C - 6.5);
    ctx.fillStyle = COL.ember; ctx.beginPath(); ctx.moveTo(C, C - 15); ctx.quadraticCurveTo(C + 3.4, C - 9.5, C, C - 5.5); ctx.quadraticCurveTo(C - 3.4, C - 9.5, C, C - 15); ctx.fill();
    ctx.fillStyle = COL.flameCore; ctx.beginPath(); ctx.ellipse(C, C - 8.4, 1.3, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    // iron drip pan
    ctx.fillStyle = COL.steelD; ctx.beginPath(); ctx.ellipse(C, C + 13.5, 8.5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, COL.steelL, 0.9); ctx.beginPath(); ctx.ellipse(C, C + 13, 6.8, 1.4, 0, Math.PI, Math.PI * 2); ctx.stroke();
  },
  vial(ctx) {
    // round-bottom flask
    const flask = () => { ctx.beginPath(); ctx.moveTo(C - 3, C - 13); ctx.lineTo(C - 3, C - 3.5); ctx.quadraticCurveTo(C - 9.5, C - 0.5, C - 9.5, C + 6); ctx.quadraticCurveTo(C - 9.5, C + 13.5, C, C + 13.5); ctx.quadraticCurveTo(C + 9.5, C + 13.5, C + 9.5, C + 6); ctx.quadraticCurveTo(C + 9.5, C - 0.5, C + 3, C - 3.5); ctx.lineTo(C + 3, C - 13); ctx.closePath(); };
    ctx.fillStyle = 'rgba(70,96,138,.25)'; flask(); ctx.fill();
    // the draught: dark depths, swirling surface, slow bubbles
    ctx.save(); flask(); ctx.clip();
    ctx.fillStyle = COL.bloodD; ctx.fillRect(C - 10, C + 2.5, 20, 12);
    ctx.fillStyle = COL.blood; ctx.beginPath(); ctx.moveTo(C - 10, C + 4.5); ctx.quadraticCurveTo(C - 3, C + 2, C + 3, C + 4.5); ctx.quadraticCurveTo(C + 7, C + 6.2, C + 10, C + 4.5); ctx.lineTo(C + 10, C + 14); ctx.lineTo(C - 10, C + 14); ctx.closePath(); ctx.fill();
    pen(ctx, COL.red, 1); ctx.beginPath(); ctx.moveTo(C - 8.5, C + 4.8); ctx.quadraticCurveTo(C - 3, C + 2.6, C + 2.5, C + 4.9); ctx.stroke();
    pen(ctx, 'rgba(212,71,79,.9)', 0.8); cir(ctx, C + 3.5, C + 8.5, 1.1); cir(ctx, C - 2, C + 10, 0.7);
    ctx.restore();
    // glass line + standing sheen
    pen(ctx, COL.bone, 1.3); flask(); ctx.stroke();
    pen(ctx, 'rgba(238,235,221,.65)', 1.4); ctx.beginPath(); ctx.moveTo(C - 6.5, C + 2); ctx.quadraticCurveTo(C - 7.5, C + 6, C - 5, C + 10.5); ctx.stroke();
    // cork + neck cord
    ctx.fillStyle = COL.wood; ctx.fillRect(C - 3.8, C - 16, 7.6, 3.6);
    pen(ctx, COL.woodD, 1); ctx.strokeRect(C - 3.8, C - 16, 7.6, 3.6);
    pen(ctx, COL.gold, 1); ln(ctx, C - 3.4, C - 11.5, C + 3.4, C - 11.5);
    glint(ctx, C - 1.2, C - 14.8, 0.6);
  },
  glasseye(ctx) {
    // brass socket rim
    pen(ctx, COL.goldD, 2.2); cir(ctx, C, C, 13.6);
    pen(ctx, COL.gold, 1); cir(ctx, C, C, 13.6);
    // porcelain sphere
    ctx.fillStyle = '#8f8570'; cir(ctx, C, C, 11.8, true);
    ctx.fillStyle = lg(ctx, C - 8, C - 9, C + 8, C + 9, [[0, '#fdfbf2'], [0.5, COL.white], [1, '#a89f8a']]); cir(ctx, C - 0.4, C - 0.4, 11.2, true);
    // iris: cold glass depths with striations
    const ir = ctx.createRadialGradient(C - 1.2, C - 1.2, 0.5, C, C, 6.4);
    ir.addColorStop(0, '#7d9cc9'); ir.addColorStop(0.65, COL.navy); ir.addColorStop(1, '#1c2438');
    ctx.fillStyle = ir; cir(ctx, C, C, 6.4, true);
    pen(ctx, '#131a29', 1); cir(ctx, C, C, 6.4);
    pen(ctx, 'rgba(125,156,201,.5)', 0.8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; ln(ctx, C + Math.cos(a) * 3.2, C + Math.sin(a) * 3.2, C + Math.cos(a) * 5.6, C + Math.sin(a) * 5.6); }
    dot(ctx, C, C, 2.6, COL.ink);
    // window reflection + sphere sheen
    glint(ctx, C - 2.4, C - 2.6, 1.4); glint(ctx, C + 1.8, C + 2, 0.6);
    pen(ctx, 'rgba(238,235,221,.5)', 1.2); ctx.beginPath(); ctx.arc(C, C, 9, -2.9, -1.7); ctx.stroke();
    // fine veins in the white
    pen(ctx, 'rgba(212,71,79,.5)', 0.7); ln(ctx, C - 10.2, C + 3, C - 7, C + 2); ln(ctx, C + 8, C + 4.5, C + 10.4, C + 6.2);
  },
  rosary(ctx) {
    // knotted cord loop
    pen(ctx, '#4a3956', 1.4); cir(ctx, C, C - 3.5, 9.5);
    // beads: lacquered garnets, each with its own spark
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 - Math.PI / 2, x = C + Math.cos(a) * 9.5, y = C - 3.5 + Math.sin(a) * 9.5;
      dot(ctx, x + 0.4, y + 0.5, 2.1, COL.bloodD); dot(ctx, x, y, 1.7, COL.blood); glint(ctx, x - 0.5, y - 0.6, 0.5);
    }
    // gaud bead in gold at the join
    dot(ctx, C, C + 6.6, 2.5, COL.goldD); dot(ctx, C - 0.3, C + 6.3, 1.9, COL.gold); glint(ctx, C - 0.9, C + 5.7, 0.5);
    // hanging cross: dark iron under moonlit steel
    pen(ctx, COL.steelD, 3.2); ln(ctx, C, C + 9, C, C + 17); ln(ctx, C - 3.6, C + 11.8, C + 3.6, C + 11.8);
    pen(ctx, COL.steelL, 1.2); ln(ctx, C, C + 9.5, C, C + 16.5); ln(ctx, C - 3.2, C + 11.8, C + 3.2, C + 11.8);
    glint(ctx, C - 0.8, C + 10.4, 0.6);
  },
  ratking(ctx) {
    // knotted tails beneath: the curse that binds them
    pen(ctx, COL.boneD, 1.6);
    ctx.beginPath(); ctx.moveTo(C - 11, C + 8); ctx.bezierCurveTo(C - 4, C + 14.5, C + 4, C + 6.5, C + 11, C + 12.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(C - 9, C + 13); ctx.bezierCurveTo(C - 2, C + 6.5, C + 2, C + 14.5, C + 10, C + 7.5); ctx.stroke();
    pen(ctx, COL.bone, 0.9); ctx.beginPath(); ctx.moveTo(C - 11, C + 8); ctx.bezierCurveTo(C - 4, C + 14, C + 4, C + 6, C + 11, C + 12); ctx.stroke();
    dot(ctx, C + 0.2, C + 10.3, 2, COL.boneD); dot(ctx, C - 0.1, C + 10, 1.3, COL.bone);
    // the rat: dark fur with a moonlit back, nosing right
    const bod = () => { ctx.beginPath(); ctx.moveTo(C + 12, C - 1.5); ctx.quadraticCurveTo(C + 6, C - 10.5, C - 3, C - 8.5); ctx.quadraticCurveTo(C - 11, C - 6.5, C - 10.5, C + 0.5); ctx.quadraticCurveTo(C - 10, C + 6, C - 2, C + 6.5); ctx.quadraticCurveTo(C + 6, C + 7, C + 12, C - 1.5); ctx.closePath(); };
    bod(); ctx.fillStyle = lg(ctx, C - 8, C - 8, C + 6, C + 6, [[0, '#5c5766'], [0.5, '#3f3b49'], [1, '#2c2833']]); ctx.fill();
    pen(ctx, '#6b6575', 1); bod(); ctx.stroke();
    // snout, pink nose, whiskers
    ctx.fillStyle = '#3f3b49'; poly(ctx, [[C + 11.5, C - 2], [C + 16.5, C + 0.5], [C + 10.5, C + 2.5]], true);
    dot(ctx, C + 16.8, C + 0.6, 0.9, '#c9868d');
    pen(ctx, 'rgba(201,206,212,.6)', 0.7); ln(ctx, C + 13.5, C + 0.2, C + 17.2, C - 2.4); ln(ctx, C + 13.5, C + 1.2, C + 17.6, C + 2);
    // ear with a pink inner
    pen(ctx, '#6b6575', 2.2); cir(ctx, C + 2.5, C - 8.8, 2.4);
    ctx.fillStyle = '#c9868d'; cir(ctx, C + 2.5, C - 8.8, 1.2, true);
    // moonlit spine
    pen(ctx, 'rgba(154,161,168,.5)', 1.2); ctx.beginPath(); ctx.moveTo(C - 7, C - 6.2); ctx.quadraticCurveTo(C - 1, C - 9.6, C + 5.5, C - 7.2); ctx.stroke();
    // ember eye + the stolen crown
    dot(ctx, C + 9.3, C - 2.6, 1.2, COL.ink); dot(ctx, C + 9.3, C - 2.6, 0.7, COL.red);
    const crown = [[C + 4.4, C - 8.8], [C + 5.4, C - 14], [C + 7.6, C - 10.8], [C + 9.9, C - 14.3], [C + 11.2, C - 8.4]];
    ctx.fillStyle = COL.gold; poly(ctx, crown, true);
    pen(ctx, COL.goldD, 0.9); poly(ctx, crown);
    dot(ctx, C + 5.3, C - 14.4, 0.7, COL.goldL); dot(ctx, C + 10, C - 14.7, 0.7, COL.goldL);
    glint(ctx, C - 4, C - 6.8, 0.9);
  },
  gravehand(ctx) {
    // fresh-turned mound
    const mound = () => { ctx.beginPath(); ctx.moveTo(C - 16, C + 15); ctx.quadraticCurveTo(C - 8, C + 6.5, C, C + 7.5); ctx.quadraticCurveTo(C + 9, C + 8.5, C + 16, C + 15); ctx.lineTo(C + 16, C + 17); ctx.lineTo(C - 16, C + 17); ctx.closePath(); };
    mound(); ctx.fillStyle = lg(ctx, C, C + 6, C, C + 16, [[0, '#402a16'], [1, '#241708']]); ctx.fill();
    pen(ctx, '#5c3d22', 1); ctx.beginPath(); ctx.moveTo(C - 15, C + 14.5); ctx.quadraticCurveTo(C - 8, C + 6.8, C, C + 7.8); ctx.quadraticCurveTo(C + 9, C + 8.8, C + 15, C + 14.5); ctx.stroke();
    dot(ctx, C - 9, C + 12, 1, '#5c3d22'); dot(ctx, C + 7.5, C + 12.5, 0.8, '#5c3d22');
    // bone hand bursting out: palm + reaching fingers, lit knuckle tips
    const finger = (x0, y0, x1, y1, w) => { pen(ctx, COL.boneD, w + 1.3); ln(ctx, x0, y0, x1, y1); pen(ctx, COL.bone, w); ln(ctx, x0, y0, x1, y1); dot(ctx, x1, y1, w * 0.58, COL.boneL); };
    pen(ctx, COL.boneD, 7); ln(ctx, C - 0.5, C + 8, C - 0.5, C + 3);
    pen(ctx, COL.bone, 5); ln(ctx, C - 0.5, C + 8, C - 0.5, C + 3.5);
    finger(C - 3.2, C + 3, C - 5.8, C - 6.5, 1.9);
    finger(C - 1, C + 2, C - 1.4, C - 9.5, 1.9);
    finger(C + 1.6, C + 2.2, C + 2.6, C - 8, 1.9);
    finger(C + 3.6, C + 3.6, C + 5.8, C - 4.5, 1.8);
    finger(C - 3.8, C + 5.5, C - 8.5, C + 1, 1.8);
    // joint shadows
    pen(ctx, COL.boneD, 0.9); ln(ctx, C - 5.2, C - 2.2, C - 4.4, C - 2); ln(ctx, C - 1.4, C - 4.5, C - 0.5, C - 4.5); ln(ctx, C + 1.9, C - 3.4, C + 2.8, C - 3.2);
    // soil crumbs still falling
    dot(ctx, C - 7, C - 10, 0.9, '#5c3d22'); dot(ctx, C + 6.5, C - 10.5, 0.7, '#5c3d22'); dot(ctx, C + 9.5, C - 5, 0.6, '#402a16');
    glint(ctx, C - 1.9, C - 9.9, 0.7);
  },
  gunpowder(ctx) {
    const kt = C - 7, kb = C + 13;
    // staved keg with a bulged waist
    const barrel = () => { ctx.beginPath(); ctx.moveTo(C - 9, kt); ctx.quadraticCurveTo(C - 12.3, C + 3, C - 9, kb); ctx.lineTo(C + 9, kb); ctx.quadraticCurveTo(C + 12.3, C + 3, C + 9, kt); ctx.closePath(); };
    barrel(); ctx.fillStyle = lg(ctx, C - 9, C, C + 9, C, [[0, COL.wood], [0.45, '#5c3d22'], [1, COL.woodD]]); ctx.fill();
    pen(ctx, COL.woodD, 1.2); barrel(); ctx.stroke();
    // stave seams
    pen(ctx, 'rgba(36,23,8,.8)', 1); ln(ctx, C - 3.5, kt + 0.5, C - 4.2, kb - 0.5); ln(ctx, C + 3.5, kt + 0.5, C + 4.2, kb - 0.5);
    // iron hoops with a lit top edge
    for (const y of [kt + 3.2, kb - 3.6]) { pen(ctx, COL.steelD, 2.6); ln(ctx, C - 11, y, C + 11, y); pen(ctx, COL.steelL, 0.9); ln(ctx, C - 10.5, y - 0.8, C + 10.5, y - 0.8); }
    // lid
    ctx.fillStyle = '#5c3d22'; ctx.beginPath(); ctx.ellipse(C, kt, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    pen(ctx, COL.woodD, 1); ctx.beginPath(); ctx.ellipse(C, kt, 9, 3, 0, 0, Math.PI * 2); ctx.stroke();
    // powder heaped at the bung
    dot(ctx, C + 1, kt - 0.5, 1.9, COL.ink);
    for (const [x, y] of [[C + 3.2, kt - 2], [C - 1.5, kt - 2.4], [C + 5.5, kt - 3.6]]) dot(ctx, x, y, 0.8, '#2c2833');
    // fuse snaking up, burning down
    pen(ctx, COL.woodD, 2.2); ctx.beginPath(); ctx.moveTo(C + 1, kt - 1); ctx.bezierCurveTo(C + 7, kt - 6, C + 2, kt - 8.5, C + 7.5, kt - 12); ctx.stroke();
    pen(ctx, COL.gold, 0.9); ctx.beginPath(); ctx.moveTo(C + 1.4, kt - 1.4); ctx.bezierCurveTo(C + 7, kt - 6.3, C + 2.4, kt - 8.7, C + 7.3, kt - 11.7); ctx.stroke();
    // the spark
    dot(ctx, C + 8.2, kt - 12.6, 1.8, COL.orange); dot(ctx, C + 8.2, kt - 12.6, 0.9, COL.flameCore);
    pen(ctx, COL.ember, 1); for (const a of [-0.6, 0.7, 2.2, 3.6, 4.6]) ln(ctx, C + 8.2 + Math.cos(a) * 2.6, kt - 12.6 + Math.sin(a) * 2.6, C + 8.2 + Math.cos(a) * 4.4, kt - 12.6 + Math.sin(a) * 4.4);
    glint(ctx, C - 6.5, C - 3, 1);
  },
  boneoil(ctx) {
    // squat jar of rendered marrow
    const jar = () => { ctx.beginPath(); ctx.moveTo(C - 3.5, C - 8); ctx.quadraticCurveTo(C - 9.5, C - 5.5, C - 9.5, C + 4); ctx.quadraticCurveTo(C - 9.5, C + 12, C, C + 12); ctx.quadraticCurveTo(C + 9.5, C + 12, C + 9.5, C + 4); ctx.quadraticCurveTo(C + 9.5, C - 5.5, C + 3.5, C - 8); ctx.closePath(); };
    ctx.fillStyle = 'rgba(216,199,164,.16)'; jar(); ctx.fill();
    // the oil: slow amber with lazy bubbles
    ctx.save(); jar(); ctx.clip();
    ctx.fillStyle = lg(ctx, C, C - 2, C, C + 12, [[0, '#8a6a2a'], [0.5, '#5c4418'], [1, '#3a2c10']]); ctx.fillRect(C - 10, C - 1.5, 20, 14);
    pen(ctx, 'rgba(226,189,102,.85)', 1); ln(ctx, C - 8.8, C - 1, C + 8.8, C - 1);
    pen(ctx, 'rgba(226,189,102,.5)', 0.8); cir(ctx, C - 3, C + 4.5, 1.2); cir(ctx, C + 3.5, C + 7.5, 0.8);
    ctx.restore();
    // glass rim + standing sheen
    pen(ctx, COL.bone, 1.3); jar(); ctx.stroke();
    pen(ctx, 'rgba(238,235,221,.55)', 1.3); ctx.beginPath(); ctx.moveTo(C - 6.8, C - 2.5); ctx.quadraticCurveTo(C - 7.6, C + 3, C - 5.5, C + 8.5); ctx.stroke();
    // knucklebone stopper: femur shaft with paired condyles
    ctx.fillStyle = COL.boneD; ctx.fillRect(C - 2.2, C - 13.5, 4.4, 6);
    ctx.fillStyle = COL.bone; ctx.fillRect(C - 1.6, C - 13.5, 3, 6);
    dot(ctx, C - 2.2, C - 14.5, 1.8, COL.bone); dot(ctx, C + 2, C - 14.8, 1.8, COL.boneL);
    dot(ctx, C - 2, C - 8, 1.6, COL.boneD); dot(ctx, C + 2, C - 8.2, 1.6, COL.bone);
    // blood-wax seal drip on the shoulder
    pen(ctx, COL.blood, 1.4); ln(ctx, C + 4.6, C - 7, C + 5.6, C - 3);
    dot(ctx, C + 5.8, C - 2.2, 0.9, COL.blood);
    glint(ctx, C - 1, C - 14, 0.7);
  },
  tongue(ctx) {
    // iron rail it hangs from + piercing hook
    pen(ctx, COL.steelD, 3); ln(ctx, C - 10.5, C - 13.5, C + 10.5, C - 13.5);
    pen(ctx, COL.steelL, 1.1); ln(ctx, C - 10, C - 14.1, C + 10, C - 14.1);
    pen(ctx, COL.steel, 1.6); ctx.beginPath(); ctx.arc(C, C - 10, 3.2, -Math.PI * 0.95, Math.PI * 0.45); ctx.stroke();
    // the trophy: dark flesh shadow under a wet gradient
    const tg = (dx, dy) => { ctx.beginPath(); ctx.moveTo(C - 6.5 + dx, C - 8 + dy); ctx.quadraticCurveTo(C - 8 + dx, C + 3 + dy, C - 3.5 + dx, C + 10 + dy); ctx.quadraticCurveTo(C + dx, C + 15 + dy, C + 3.5 + dx, C + 10 + dy); ctx.quadraticCurveTo(C + 8 + dx, C + 3 + dy, C + 6.5 + dx, C - 8 + dy); ctx.closePath(); };
    tg(0.8, 0.8); ctx.fillStyle = COL.bloodD; ctx.fill();
    tg(0, 0); ctx.fillStyle = lg(ctx, C - 5, C - 6, C + 5, C + 12, [[0, '#c9565e'], [0.45, COL.red], [1, COL.blood]]); ctx.fill();
    pen(ctx, COL.bloodD, 1); tg(0, 0); ctx.stroke();
    // median sulcus + papillae stipple
    pen(ctx, COL.bloodD, 1.3); ln(ctx, C, C - 5.5, C, C + 10.5);
    for (const [x, y] of [[C - 3.5, C - 3], [C + 3.5, C - 2], [C - 3, C + 3], [C + 3, C + 4.5]]) dot(ctx, x, y, 0.5, 'rgba(91,20,31,.8)');
    // ragged cut at the root
    pen(ctx, COL.bloodD, 1.6); ctx.beginPath(); ctx.moveTo(C - 6.5, C - 8); ctx.lineTo(C - 3.5, C - 6.8); ctx.lineTo(C - 1, C - 8.2); ctx.lineTo(C + 2, C - 6.8); ctx.lineTo(C + 6.5, C - 8); ctx.stroke();
    // wet highlight + gathering drop at the tip
    pen(ctx, 'rgba(238,235,221,.65)', 1.4); ctx.beginPath(); ctx.moveTo(C - 4.2, C - 3.5); ctx.quadraticCurveTo(C - 5.2, C + 2, C - 3, C + 7.5); ctx.stroke();
    dot(ctx, C + 0.6, C + 15.4, 1, COL.red); glint(ctx, C + 0.3, C + 15.1, 0.35);
  },
  silkstring(ctx) {
    // web corner: radial anchor lines from the top-left
    pen(ctx, 'rgba(143,133,112,.9)', 1);
    for (const [x2, y2] of [[C + 18, C - 6], [C + 14, C + 8], [C + 4, C + 17], [C - 8, C + 16]]) ln(ctx, C - 14, C - 14, x2, y2);
    // silk strands: shadowed cords with a pale sheen
    for (const r of [11, 18, 25]) {
      pen(ctx, 'rgba(95,85,64,.9)', 2); ctx.beginPath(); ctx.arc(C - 14, C - 14, r, 0.12, 1.45); ctx.stroke();
      pen(ctx, COL.boneL, 0.9); ctx.beginPath(); ctx.arc(C - 14, C - 14, r, 0.12, 1.45); ctx.stroke();
    }
    // dew beads riding the outer strand
    for (const a of [0.42, 0.85, 1.2]) { const x = C - 14 + Math.cos(a) * 25, y = C - 14 + Math.sin(a) * 25; dot(ctx, x, y, 1, COL.white); glint(ctx, x - 0.4, y - 0.5, 0.4); }
    // the red thread of fate woven through
    pen(ctx, COL.bloodD, 2.2); ctx.beginPath(); ctx.moveTo(C + 12, C - 15.5); ctx.bezierCurveTo(C + 2, C - 4, C + 8, C + 4, C - 2, C + 13.5); ctx.stroke();
    pen(ctx, COL.red, 1); ctx.beginPath(); ctx.moveTo(C + 11.5, C - 15.5); ctx.bezierCurveTo(C + 1.6, C - 4, C + 7.6, C + 4, C - 2.4, C + 13); ctx.stroke();
    // spider bead riding the thread
    dot(ctx, C + 6.3, C - 0.5, 2, COL.ink); dot(ctx, C + 6.3, C - 0.5, 1.2, '#2c2833');
    pen(ctx, COL.ink, 0.8);
    for (const d of [-1, 1]) { ln(ctx, C + 4.8, C - 0.5 + d, C + 2.8, C - 0.5 + d * 2.8); ln(ctx, C + 7.8, C - 0.5 + d, C + 9.8, C - 0.5 + d * 2.8); }
    glint(ctx, C + 5.7, C - 1.2, 0.4);
  },
  twinmask(ctx) {
    const face = (cx, cy, rot) => { ctx.beginPath(); ctx.ellipse(cx, cy, 6.8, 9.6, rot, 0, Math.PI * 2); };
    // obsidian mask behind-right: grief
    face(C + 5.5, C + 3, 0.22); ctx.fillStyle = lg(ctx, C, C - 4, C + 11, C + 11, [[0, '#4a4550'], [0.5, '#221e26'], [1, '#131118']]); ctx.fill();
    pen(ctx, '#8a8496', 1.2); face(C + 5.5, C + 3, 0.22); ctx.stroke();
    pen(ctx, '#8a8496', 1.3); ln(ctx, C + 3.2, C + 0.6, C + 5.2, C + 1.1); ln(ctx, C + 7.2, C + 1.5, C + 9.2, C + 2.1);
    ctx.beginPath(); ctx.arc(C + 6, C + 9.4, 2.6, Math.PI + 0.4, -0.4); ctx.stroke();
    dot(ctx, C + 4, C + 4.4, 1, COL.ember); // one ember tear
    pen(ctx, 'rgba(240,168,90,.5)', 0.8); ln(ctx, C + 3.8, C + 2.2, C + 4, C + 3.4);
    // porcelain mask front-left: mirth
    face(C - 5, C - 3, -0.22); ctx.fillStyle = '#a89f8a'; ctx.fill();
    ctx.save(); ctx.translate(-0.6, -0.6); face(C - 5, C - 3, -0.22); ctx.fillStyle = lg(ctx, C - 11, C - 11, C + 1, C + 5, [[0, '#fdfbf2'], [0.6, COL.white], [1, '#c9c2ae']]); ctx.fill(); ctx.restore();
    pen(ctx, '#8f8570', 1); face(C - 5, C - 3, -0.22); ctx.stroke();
    pen(ctx, COL.ink, 1.3);
    ctx.beginPath(); ctx.arc(C - 7.6, C - 5.2, 1.7, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(C - 2.8, C - 5.9, 1.7, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(C - 5.6, C + 0.8, 3, 0.35, Math.PI - 0.5); ctx.stroke();
    // the gold cord binding the pair
    pen(ctx, COL.gold, 1.1); ctx.beginPath(); ctx.moveTo(C - 9.5, C - 11.5); ctx.quadraticCurveTo(C, C - 15.5, C + 9.2, C - 5.5); ctx.stroke();
    dot(ctx, C - 9.8, C - 11.8, 1, COL.gold); dot(ctx, C + 9.5, C - 5.3, 1, COL.gold);
    glint(ctx, C - 8, C - 8.5, 1);
  },
  ashfeather(ctx) {
    // ember motes drifting off the burning tip
    dot(ctx, C + 12, C - 13.5, 1, COL.ember); dot(ctx, C + 15, C - 9.5, 0.7, COL.orange); dot(ctx, C + 9.5, C - 16.5, 0.6, 'rgba(240,168,90,.7)');
    // charcoal vane with a cold rim light
    const vane = () => { ctx.beginPath(); ctx.moveTo(C - 11, C + 14); ctx.quadraticCurveTo(C - 6, C - 12, C + 10, C - 14); ctx.quadraticCurveTo(C + 10.5, C - 2, C - 11, C + 14); ctx.closePath(); };
    vane(); ctx.fillStyle = lg(ctx, C - 8, C + 10, C + 8, C - 12, [[0, '#4a4550'], [0.5, '#38343f'], [1, '#6b6575']]); ctx.fill();
    pen(ctx, '#8a8496', 1.1); vane(); ctx.stroke();
    // ash-pale rachis
    pen(ctx, COL.bone, 1.7); ctx.beginPath(); ctx.moveTo(C - 11, C + 14); ctx.quadraticCurveTo(C - 1, C - 1, C + 9, C - 13); ctx.stroke();
    // barb splits
    pen(ctx, 'rgba(154,148,165,.9)', 1); ln(ctx, C - 4, C + 4.5, C - 8.5, C + 2.5); ln(ctx, C + 0.5, C - 1.5, C - 3.5, C - 4.5); ln(ctx, C + 4.5, C - 6.5, C + 1, C - 9.5);
    // smouldering edge
    pen(ctx, COL.orange, 1.6); ctx.beginPath(); ctx.moveTo(C + 5.5, C - 9.5); ctx.quadraticCurveTo(C + 8, C - 12, C + 10, C - 14); ctx.stroke();
    pen(ctx, COL.ember, 0.9); ctx.beginPath(); ctx.moveTo(C + 6.5, C - 10.5); ctx.quadraticCurveTo(C + 8.5, C - 12.3, C + 10, C - 14); ctx.stroke();
    // flakes of ash shedding from the base
    ctx.fillStyle = '#4a4550'; poly(ctx, [[C - 13.5, C + 15.5], [C - 12, C + 14.2], [C - 11.5, C + 16.2]], true);
    ctx.fillStyle = '#3f3b49'; poly(ctx, [[C - 15.5, C + 11.5], [C - 14.2, C + 10.4], [C - 13.8, C + 12.4]], true);
    glint(ctx, C - 3, C - 5.5, 0.8);
  },
  heartscar(ctx) {
    // an older, darker heart
    const heart = (s) => { ctx.beginPath(); ctx.moveTo(C, C + 13 * s); ctx.bezierCurveTo(C - 17 * s, C + 1 * s, C - 9.5 * s, C - 12 * s, C, C - 4 * s); ctx.bezierCurveTo(C + 9.5 * s, C - 12 * s, C + 17 * s, C + 1 * s, C, C + 13 * s); ctx.closePath(); };
    heart(1.12); ctx.fillStyle = '#54121d'; ctx.fill();
    heart(1); ctx.fillStyle = lg(ctx, C - 8, C - 9, C + 8, C + 10, [[0, COL.blood], [0.6, COL.bloodD], [1, '#3a0c13']]); ctx.fill();
    // the old wound: pale scar ridge crossing it
    const scar = (col, w) => { pen(ctx, col, w); ctx.beginPath(); ctx.moveTo(C - 6, C - 7.5); ctx.quadraticCurveTo(C - 1, C - 2, C + 5, C + 6.5); ctx.stroke(); };
    scar(COL.boneD, 2.6); scar(COL.bone, 1.3);
    // crude stitches holding it shut
    pen(ctx, COL.boneL, 1.1); ln(ctx, C - 6, C - 3.5, C - 2.5, C - 6.5); ln(ctx, C - 3.4, C - 0.6, C + 0.4, C - 3.6); ln(ctx, C - 0.6, C + 2.4, C + 3, C - 0.4); ln(ctx, C + 1.6, C + 5.2, C + 5.4, C + 2.6);
    // dulled highlight: it no longer shines wet
    pen(ctx, 'rgba(216,199,164,.35)', 1.4); ctx.beginPath(); ctx.moveTo(C - 9.5, C - 4); ctx.quadraticCurveTo(C - 11, C, C - 8, C + 3.5); ctx.stroke();
    glint(ctx, C - 7, C - 6.5, 0.9);
  },
  belltongueIcon(ctx) {
    // ghost of the bell it was torn from
    pen(ctx, 'rgba(143,133,112,.45)', 1.2);
    ctx.beginPath(); ctx.moveTo(C - 11, C - 4); ctx.quadraticCurveTo(C - 11, C - 16.5, C, C - 16.5); ctx.quadraticCurveTo(C + 11, C - 16.5, C + 11, C - 4); ctx.stroke();
    ln(ctx, C - 13.5, C - 3.5, C - 9, C - 3.5); ln(ctx, C + 9, C - 3.5, C + 13.5, C - 3.5);
    // hanger loop: dark bronze with a lit crown
    pen(ctx, COL.goldD, 2.4); cir(ctx, C, C - 8.5, 2.6);
    pen(ctx, COL.goldL, 1); ctx.beginPath(); ctx.arc(C, C - 8.5, 2.6, -2.8, -0.9); ctx.stroke();
    // shaft: cast bronze, two-tone with a collar ring
    pen(ctx, COL.goldD, 4); ln(ctx, C, C - 5.5, C, C + 6);
    pen(ctx, COL.gold, 2); ln(ctx, C, C - 5, C, C + 6);
    pen(ctx, COL.goldL, 0.9); ln(ctx, C - 0.9, C - 4.5, C - 0.9, C + 5);
    pen(ctx, COL.goldD, 1.2); ln(ctx, C - 2.4, C - 1.5, C + 2.4, C - 1.5);
    // the ball: heavy cast sphere, worn at its striking face
    dot(ctx, C, C + 10.5, 6.1, COL.goldD);
    ctx.fillStyle = lg(ctx, C - 4.5, C + 6, C + 4.5, C + 15, [[0, COL.goldL], [0.45, COL.gold], [1, COL.goldD]]); cir(ctx, C, C + 10.5, 5.2, true);
    pen(ctx, '#4a3510', 1); ctx.beginPath(); ctx.arc(C, C + 10.5, 3.4, 0.6, 2.4); ctx.stroke();
    glint(ctx, C - 1.8, C + 8.4, 1.1);
    // it still rings against nothing
    pen(ctx, 'rgba(240,168,90,.85)', 1.1); ln(ctx, C + 6.8, C + 14.5, C + 9.8, C + 17); ln(ctx, C + 8.2, C + 11.5, C + 11.8, C + 13);
    dot(ctx, C - 8.5, C + 15.5, 0.8, COL.ember);
  },
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
