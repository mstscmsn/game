// Procedural pixel-art sprite factory — original gothic micro-pixel style.
// Every sprite is hand-authored pixel rows rendered to an offscreen canvas.
// '.' = transparent. Global palette chars, per-sprite overrides via pal.

export const PAL = {
  k: '#0B0A0C', K: '#1b171c', b: '#D8C7A4', B: '#8f8570', c: '#6b6252',
  r: '#8E1F2F', R: '#D4474F', d: '#4a2328',
  g: '#B58D3B', G: '#e0c06a', y: '#e8d98a',
  p: '#49364F', P: '#7c5f8a',
  w: '#EEEBDD', W: '#c9c4b2',
  n: '#11151E', N: '#2a3448', A: '#46608a',
  e: '#75876B', E: '#9db38c', m: '#55604f',
  s: '#5a5f66', S: '#9aa1a8',
  f: '#c9a189', F: '#8a6a58',
  o: '#c96b2f', O: '#e89a4a',
  x: '#000000',
};

const cache = new Map();

// Build a canvas from pixel rows. opts: {pal:{}, scale:3, sym:false}
export function px(rows, opts = {}) {
  const scale = opts.scale || 3;
  const pal = opts.pal ? { ...PAL, ...opts.pal } : PAL;
  let grid = rows.map(r => r.split(''));
  if (opts.sym) grid = grid.map(row => row.concat(row.slice(0, opts.symOdd ? row.length - 1 : row.length).reverse()));
  const h = grid.length, w = Math.max(...grid.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < grid[y].length; x++) {
    const ch = grid[y][x];
    if (ch === '.' || ch === ' ') continue;
    ctx.fillStyle = pal[ch] || '#f0f';
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }
  return c;
}

// tinted / scaled variant of an existing canvas (for elites & recolors)
export function variant(src, { tint = null, tintAlpha = 0.45, scale = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * scale));
  c.height = Math.max(1, Math.round(src.height * scale));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  if (tint) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = tintAlpha;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  return c;
}

/* ============================= PLAYER CHARACTERS ============================= */
const CHAR_ROWS = {
  // 灰棺骑士·阿德里克 — bulky funeral armor, coffin shield on left, red heart-lantern in chest
  adric: [
    '....ssSss....',
    '...skkkkks...',
    '...skbkbks...',
    'dd.skkkkks...',
    'dbdsssssss...',
    'dbdsbsssbsgg.',
    'dbdssRRsssg..',
    'dbdssRRsssg..',
    'dbdsssssssg..',
    'dd.sssssss...',
    '...ss...ss...',
    '...ks...sk...',
    '..kks...skk..',
  ],
  // 逐教修女·伊芙兰 — black/ivory habit, cracked halo, blood chalice
  evlann: [
    '..g.g.g.g....',
    '...kkkkk.....',
    '..kwfffwk....',
    '..kwfkfwk....',
    '..kkfffkk....',
    '...kkkkk.rr..',
    '..kkwkwkkrRr.',
    '..kwkkkwk.r..',
    '..kwkkkwk....',
    '..kkkkkkk....',
    '..kwkkkwk....',
    '..kkkkkkk....',
    '...kk.kk.....',
  ],
  // 疫鸦医师·赫默 — beaked bone mask, dark robes, censer
  hemer: [
    '....kkk......',
    '...ksksk.....',
    '..ksbbbsk....',
    '..kbbybbk....',
    '...kbbbbbk...',
    '....kbbbbbk..',
    '..kkpkpkk.e..',
    '..kpkpkpk.e..',
    '..kpkkkpkee..',
    '..kpkpkpk.e..',
    '..kkpkpkk....',
    '..kpkkkpk....',
    '...kk.kk.....',
  ],
  // 断钟匠·柯兰 — leather apron, mechanical bell arm
  corlan: [
    '....kkkk.....',
    '...kffffk....',
    '...kfkfkk....',
    '...kffffk....',
    '....kkkk.gg..',
    '..kddddkkgGg.',
    '..sdFFFdkgGg.',
    '..sdFFFdkggg.',
    '..sdFFFdk.g..',
    '..sdddddk....',
    '..s.kk.kk....',
    '....ks.sk....',
    '...kks.skk...',
  ],
  // 空冠王女·薇尔娜 — raven-feather dress, floating empty crown, raven
  vielna: [
    '....ggg......',
    '....g.g......',
    '.............',
    '....kkk......',
    '...kwfwk.kk..',
    '...kfkfkkkkk.',
    '...kwwwk.kk..',
    '....kkk..k...',
    '...kpkpk.....',
    '..kpkkkpk....',
    '..kkpkpkk....',
    '.kpkpkpkpk...',
    '.kkkkkkkkk...',
  ],
  // 墓海猎人·赛缪 — long coat, oversized infernal musket
  samuel: [
    '....kkkk.....',
    '...kffffk....',
    '...kfSffk....',
    '....kkkk.....',
    '..kddddddk...',
    '..kdbddbdkoo.',
    '..kddddddkOo.',
    '..kdddddkooo.',
    '..kddkddk.o..',
    '..kdd.ddk.o..',
    '..kd...dk....',
    '..kk...kk....',
    '.kk.....kk...',
  ],
  // 忏悔童女·弥娜 — small burial dress, soul lantern, ghosts behind
  mina: [
    '.....P...P...',
    '....kkkk.....',
    '...kwffwk....',
    '...kfkkfk....',
    '...kwffwk....',
    '....kkk......',
    '...kwkwky....',
    '..kwkwkwyYy..',
    '..kwkwkwky...',
    '..kwwwwwk....',
    '..kwwwwwk....',
    '...kk.kk.....',
    '.............',
  ],
  // 铁舌处刑人·沃尔 — massive hooded executioner, bone spear
  voll: [
    '...kkkkkk....',
    '..kddddddk...',
    '..kdddddddk..',
    '..kddkkddbb..',
    '..kddddddb...',
    '.kdddddddb...',
    '.ksdddddsb...',
    '.ksddrdssb...',
    '.ksdddddsb...',
    '.ksssssssb...',
    '..ks...ssb...',
    '..kk...kkb...',
    '.kk.....kb...',
  ],
  // 堕翼审判者·拉赫希尔 — one white wing, one skeletal wing, black armor
  rahshiel: [
    'ww.......bk..',
    'www.kkk.b.k..',
    '.wwkwfwkb.k..',
    '.wwkfkfkbk...',
    'wwwkwfwkbbk..',
    'ww.kkkkk.bk..',
    'w.knnnnnk.b..',
    '..knGnGnk.b..',
    '..knnnnnk....',
    '..knnnnnk....',
    '..kn...nk....',
    '..kk...kk....',
    '.kk.....kk...',
  ],
  // 终末书记·诺因 — parchment robes, black mirror face
  noin: [
    '....kkkk.....',
    '...kxxxxk....',
    '...kxNxxk....',
    '...kxxxxk....',
    '....kkkk.....',
    '...kwwwwk.g..',
    '..kwwbwwwkg..',
    '..kwbwbwwk...',
    '..kwwwwwwkg..',
    '..kwwbwwwk...',
    '...kwwwwk.g..',
    '...kwwwwk....',
    '....kkkk.....',
  ],
};

/* ============================= ENEMIES ============================= */
// base enemy shapes (12-13 wide) reused across areas with recolors
const ENEMY_ROWS = {
  shroud: [ // 裹尸人 wrapped corpse
    '...kkkk...',
    '..kBbbBk..',
    '..kbkkbk..',
    '..kBbbBk..',
    '..kbBbbk..',
    '..kBbbBk..',
    '..kbbbBk..',
    '...kbbk...',
    '...kkkk...',
  ],
  hound: [ // 墓犬 grave hound
    '..........',
    'kk......k.',
    'kskkkkkks.',
    'ksssssssk.',
    '.ksRssssk.',
    '.kskkkksk.',
    '.kk...kks.',
    '.k.....k..',
  ],
  crow: [ // 骨鸦 bone crow
    '...kk.....',
    '..kkkk..k.',
    '.kkbkkkkk.',
    'kkkkkkkk..',
    '.kkkkkk...',
    '...kkk....',
    '...k.k....',
  ],
  monk: [ // 挖墓修士 digging monk
    '...kkkk...',
    '..kppppk..',
    '..kpkkpk..',
    '..kppppk.s',
    '..kppppkss',
    '.kpppppks.',
    '.kpppppks.',
    '..kk.kk.s.',
  ],
  bride: [ // 蜡尸新娘 wax bride
    '...wwww...',
    '..wkwwkw..',
    '..wwkkww..',
    '..kwwwwk..',
    '..kwywyk..',
    '.kwwwwwwk.',
    '.kwwkwwwk.',
    '.kwwwwwwk.',
    '..kk..kk..',
  ],
  choir: [ // 蜡面唱诗班 wax-faced choir
    '...kkkk...',
    '..kwwwwk..',
    '..kwkkwk..',
    '..kwwwwk..',
    '...kkkk...',
    '..krrrrk..',
    '.krrrrrrk.',
    '.krrkkrrk.',
    '..kk..kk..',
  ],
  nun: [ // 盲眼修女 blind nun
    '...kkkk...',
    '..kkbbkk..',
    '..kbkkbk..',
    '..kkbbkk..',
    '...kkkk...',
    '..kkbkkk..',
    '.kkbkbkkk.',
    '.kkkbkkkk.',
    '..kk..kk..',
  ],
  centipede: [ // 祷告蜈蚣 prayer centipede
    'k.k.k.k.k.',
    'kekekekek.',
    'keeeeeeek.',
    'kekekekek.',
    'k.k.k.k.k.',
  ],
  bellback: [ // 背钟苦修者 bell-carrying penitent
    '...gggg...',
    '..gGGGGg..',
    '..gGGGGg..',
    '..gggggg..',
    '..kffffk..',
    '..kfkkfk..',
    '.kffffffk.',
    '.kf ffffk.',
    '..kk..kk..',
  ],
  drowned: [ // 溺亡兵 drowned soldier
    '...ssss...',
    '..sNNNNs..',
    '..sNkkNs..',
    '..sNNNNs..',
    '..kNNNNk.s',
    '.kNNNNNNks',
    '.kNNsNNNk.',
    '.kNNNNNNk.',
    '..kk..kk..',
  ],
  sailor: [ // 无面水手 faceless sailor
    '...kkkk...',
    '..knnnnk..',
    '..knnnnk..',
    '..knnnnk..',
    '..kAAAAk..',
    '.kAAkAAAk.',
    '.kAAAAAAk.',
    '..kk..kk..',
  ],
  belltongue: [ // 钟舌巨人 bell-tongue giant
    '..kkkkkk..',
    '.kssssssk.',
    '.kskkkksk.',
    '.kssssssk.',
    '.ksgggssk.',
    'kssgGgsssk',
    'kssgggsssk',
    'kssssssssk',
    '.ks....sk.',
    '.kk....kk.',
  ],
  tidecorpse: [ // 潮尸 tide corpse
    '...nnnn...',
    '..nEeEen..',
    '..nekken..',
    '..neeeen..',
    '.kneeeenk.',
    '.kneeeenk.',
    '..nk..kn..',
  ],
  coffinboat: [ // 棺舟猎手 coffin-boat hunter
    '..k....k..',
    '..kkkkkk..',
    '..kddddk..',
    '.kddddddk.',
    '.kdkddkdk.',
    '.kddddddk.',
    'kkddddddkk',
    '.kkkkkkkk.',
  ],
  ironflower: [ // 铁花兵 iron flower soldier
    '..k.kk.k..',
    '..kokkok..',
    '.kokRRkok.',
    '.kkRfRRkk.',
    '.kokRRkok.',
    '..kokkok..',
    '...ksk....',
    '...ksk....',
    '..kksk k..',
  ],
  furnace: [ // 熔炉体 furnace walker
    '..kkkkkk..',
    '.kssssssk.',
    '.ksOOOssk.',
    '.ksOoOssk.',
    '.ksOOOssk.',
    '.kssssssk.',
    '.ks....sk.',
    '.kk....kk.',
  ],
  cherub: [ // 微笑瓷面天童 porcelain cherub
    '...wwww...',
    '..wwwwww..',
    '..wkwwkw..',
    '..wwwwww..',
    '..wkkkkw..',
    '...wwww...',
    '..w.ww.w..',
    '.ww.ww.ww.',
  ],
  lamb: [ // 伪羊 false lamb
    '..wwwwww..',
    '.wwwwwwww.',
    'kwwkwwkwwk',
    '.wwwwwwww.',
    '..wwwwww..',
    '..k.k.k.k.',
  ],
  shepherd: [ // 牧杖者 shepherd puppet
    '...kkkk..g',
    '..kwwwwk.g',
    '..kwkkwk.g',
    '..kwwwwkgg',
    '..kwwwwk.g',
    '.kwwwwwwkg',
    '.kwwwwwwk.',
    '..kk..kk..',
  ],
  seraphim: [ // 腐化炽天使 corrupted seraph
    'n..kkkk..n',
    'nnkbbbbknn',
    'nkbkbbkbkn',
    'nnkbbbbknn',
    'n.kbbbbk.n',
    'nnkbbbbknn',
    'n..kbbk..n',
    '...k..k...',
  ],
  nervewalker: [ // 神经行者 nerve walker
    '...pPp....',
    '..pPnPp...',
    '..PnnnP...',
    '..pnPnp...',
    '..PnnnP...',
    '...pPp....',
    '..P.p.P...',
    '.P..p..P..',
  ],
  eyeball: [ // 圣眼 floating sacred eye
    '..kkkkk...',
    '.kwwwwwk..',
    'kwwnnnwwk.',
    'kwnnNnnwk.',
    'kwwnnnwwk.',
    '.kwwwwwk..',
    '..kkkkk...',
  ],
  ashghoul: [ // 灰烬食尸鬼
    '...kkk....',
    '..kcccbk..',
    '..kckkck..',
    '.kccccck..',
    '.kcbcbck..',
    '.kcccccbk.',
    '..kc.cck..',
    '..kk..kk..',
  ],
  chapel: [ // 行走小圣龛 walking shrine
    '....gg....',
    '...kggk...',
    '..kkkkkk..',
    '.kwkrrkwk.',
    '.kwkrrkwk.',
    '.kwwkkwwk.',
    '.kkkkkkkk.',
    '..k....k..',
  ],
};

/* ============================= BOSSES ============================= */
const BOSS_ROWS = {
  // 裂腹圣徒·安洛 — split-open saint crawling, intestine calligraphy
  anlo: [
    '......kkkkkk......',
    '.....kbbbbbbk.....',
    '.....kbkbbkbk.....',
    '.....kbbbbbbk.....',
    '......kkkkkk......',
    '....kbbbbbbbbk....',
    '...kbbkrrrrkbbk...',
    '...kbkrRrrRrkbk...',
    '..kbbkrrrrrrkbbk..',
    '..kbbkrRrrRrkbbk..',
    '..kbbbkrrrrkbbbk..',
    '...kbbbkkkkbbbk...',
    '...rrkbbbbbbkrr...',
    '..rRrrkbbbbkrrRr..',
    '.rr..rrkkkkrr..rr.',
    'rr....rr..rr....rr',
  ],
  // 腐香主教·米弥 — bishop fused in a giant censer
  mimi: [
    '.....gggggggg.....',
    '....ggGGGGGGgg....',
    '....gGkkkkkkGg....',
    '....gGkffffkGg....',
    '....gGkfkkfkGg....',
    '....gGkffffkGg....',
    '...ggGkkkkkkGgg...',
    '..gg.gGGGGGGg.gg..',
    '.gg..gggggggg..gg.',
    '.g..ggeeeeeegg..g.',
    '.g.ggeeEeeEegg..g.',
    '..gggeeeeeeeggg...',
    '..gGgggggggggGg...',
    '...ggGGGGGGGgg....',
    '....ggggggggg.....',
    '......g...g.......',
  ],
  // 吞钟鲸 — undead whale with swallowed bells in ribcage
  whale: [
    '......kkkkkkkkkk......',
    '....kknnnnnnnnnnkk....',
    '..kknnnnnnnnnnnnnkk...',
    '.knnnnknnnnnnknnnnnk..',
    'knnnnnnnnnnnnnnnnnnnk.',
    'knsknsknsknsknsknsnnk.',
    'knsgnsgnsgnsgnsknsnnkk',
    'knsGnsGnsGnsgnsknsnnnk',
    'knsknsknsknsknsknsnnk.',
    'knnnnnnnnnnnnnnnnnnk..',
    '.kknnnnnnnnnnnnnnkk...',
    '...kkkbkbkbkbkkkk.....',
    '......b.b.b.b.........',
  ],
  // 堕翼审判者Boss形态 — bigger winged judge
  rahshielBoss: [
    'www.....kkkk.....bb',
    'wwww...kwfwfk...b.b',
    'wwwww..kffffk..b..b',
    '.wwww..kkkkkk..b.b.',
    'wwwww.knnnnnnk.bb..',
    'wwww..knGnnGnk..b..',
    'www..kknnnnnnkk.bb.',
    'ww..kwknnnnnnkbk.b.',
    'w..kw.knnnnnnk.bk..',
    '...w..knnnnnnk..b..',
    '......knn..nnk.....',
    '......kk....kk.....',
    '.....kk......kk....',
  ],
  // 终末书记官·菲纳里斯 — colossal faceless reaper, clock-hand scythe
  finalis: [
    '.......kkkkkk.......',
    '......kxxxxxxk......',
    '.....kxxxxxxxxk.....',
    '.....kxxxxxxxxk..g..',
    '.....kxxxxxxxxk..g..',
    '......kxxxxxxk..gg..',
    '....kkkxxxxxxkkgGg..',
    '...kxxxxxxxxxxkgg...',
    '..kxxxxxxxxxxxxg....',
    '..kxxbxxxxxxbxxk....',
    '..kxxxxxxxxxxxxk....',
    '..kxxbxxxxxxbxxk....',
    '..kxxxxxxxxxxxxk....',
    '..kxxxxxxxxxxxxk....',
    '.kxxxxxxxxxxxxxxk...',
    '.kxxxxxxxxxxxxxxk...',
    'kxxxxxxxxxxxxxxxxk..',
    'kxxxxxxxxxxxxxxxxk..',
  ],
  // 地狱产婆·玛戈拉 — furnace-dress midwife with mechanical arms
  margola: [
    '.....kkkkkk.....s.',
    '....kffffffk...ss.',
    '....kfkffkfk..ss..',
    '....kffffffk.ss...',
    's....kkkkkk.ss....',
    '.ss.kssssssks.....',
    '..ssksOOOOsks..s..',
    '...sksOooOsks.ss..',
    '..kkksOOOOskkss...',
    '..ksssssssssks....',
    '..ksOOsOOsOsk.....',
    '.kssOosOosOosk....',
    '.ksOOOsOOsOOsk....',
    '.kssssssssssssk...',
    '..k..k..k..k......',
  ],
  // 白羊之王 — lamb unfolding into smiling-face palace
  lambking: [
    '......wwwwww......',
    '....wwwwwwwwww....',
    '...wwwkwwwwkwww...',
    '...wwwwwwwwwwww...',
    '..kwwwwkkkkwwwwk..',
    '..kwwwwwwwwwwwwk..',
    '.kwwkwwkwwkwwkwwk.',
    '.kwkkwkkwkkwkkwwk.',
    '.kwwwwwwwwwwwwwwk.',
    '.kwwkwwkwwkwwkwwk.',
    '.kwkkwkkwkkwkkwwk.',
    '.kwwwwwwwwwwwwwwk.',
    '..kwwwwwwwwwwwwk..',
    '...kw.kw..wk.wk...',
    '..ww..ww..ww..ww..',
  ],
  // 原初圣母·黑昼 — veiled cosmic mother, black sun in chest
  mother: [
    '.......kkkkkk.......',
    '.....kknnnnnnkk.....',
    '....knnnnnnnnnnk....',
    '...knnnkkkkkknnnk...',
    '...knnknnnnnnknnk...',
    '...knnknnnnnnknnk...',
    '...knnnkkkkkknnnk...',
    '..knnnnnnnnnnnnnnk..',
    '..knnnkxxxxxxknnnk..',
    '.knnnkxxRxxRxxknnnk.',
    '.knnnkxxxxxxxxknnnk.',
    '.knnnkxRxxxxRxknnnk.',
    '.knnnnkxxxxxxknnnnk.',
    '.knnnnnkkkkkknnnnnk.',
    'knnnnnnnnnnnnnnnnnnk',
    'knnnnnnnnnnnnnnnnnnk',
    'knnnnnnnnnnnnnnnnnnk',
    '.kn.knnnnnnnnnk.nk..',
  ],
};

/* ============================= PICKUPS & MISC ============================= */
const MISC_ROWS = {
  // reward palette = bone/gold/cold-blue — never the red/pink of enemy fire
  gem1: ['..W..', '.WbW.', 'WbwbW', '.WbW.', '..W..'],
  gem2: ['..g..', '.gGg.', 'gGyGg', '.gGg.', '..g..'],
  gem3: ['..A..', '.ASA.', 'ASwSA', '.ASA.', '..A..'],
  heart: ['.r.r.', 'rRrRr', 'rRRRr', '.rRr.', '..r..'],
  soulheart: ['.e.e.', 'eEeEe', 'eEEEe', '.eEe.', '..e..'],
  chest: ['.kkkkkk.', 'kggggggk', 'kgGGGGgk', 'kkkkkkkk', 'kggkkggk', 'kggggggk', 'kkkkkkkk'],
  candle: ['..y..', '..O..', '.www.', '.www.', '.www.', '.kkk.'],
  fruit: ['..k..', '.kok.', 'koOok', 'koook', '.kok.'],
  bone: ['b..b', '.bb.', '.bb.', 'b..b'],
  coffin: ['.kkkk.', 'kddddk', 'kdbbdk', 'kddddk', 'kddddk', '.kkkk.'],
  confession: ['.wwww.', 'wbbbbw', 'wbrrbw', 'wbbbbw', 'wbbrbw', '.wwww.'],
  hellgate: ['.r.r.r.', 'rkrkrkr', '.krkrk.', 'rkrkrkr', '.r.r.r.'],
};

/* ============================= refinement passes ============================= */
// pseudo-lighting: pixels open to the sky get a highlight, pixels above a
// transparent gap get a shaded bottom edge — reads as carved volume at 96px.
export function refineSprite(src, scale = 3) {
  const w = src.width, h = src.height;
  const ctx = src.getContext('2d');
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const idx = (x, y) => (y * w + x) * 4;
  const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[idx(x, y) + 3] > 0;
  const out = ctx.createImageData(w, h);
  out.data.set(d);
  const o = out.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(x, y);
    if (d[i + 3] === 0) continue;
    const litTop = !opaque(x, y - scale);
    const shadeBot = !opaque(x, y + scale);
    if (litTop && (y % scale) < 1) { // only the top canvas-row of each pixel cell
      o[i] = Math.min(255, d[i] * 1.35 + 14);
      o[i + 1] = Math.min(255, d[i + 1] * 1.35 + 14);
      o[i + 2] = Math.min(255, d[i + 2] * 1.3 + 10);
    } else if (shadeBot && (y % scale) === scale - 1) {
      o[i] = d[i] * 0.7; o[i + 1] = d[i + 1] * 0.7; o[i + 2] = d[i + 2] * 0.72;
    }
  }
  ctx.putImageData(out, 0, 0);
  return src;
}

// walk shuffle frame: lifts one leg-side ('L' or 'R') by `lift` px
export function walkFrame(src, scale = 3, side = 'L', lift = scale) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const legH = scale * 3, legY = Math.max(0, src.height - legH);
  const half = Math.floor(src.width / 2);
  ctx.drawImage(src, 0, 0, src.width, legY, 0, 0, src.width, legY);
  if (side === 'L') {
    ctx.drawImage(src, 0, legY, half, legH, 0, legY - lift, half, legH);
    ctx.drawImage(src, half, legY, src.width - half, legH, half, legY, src.width - half, legH);
  } else {
    ctx.drawImage(src, 0, legY, half, legH, 0, legY, half, legH);
    ctx.drawImage(src, half, legY, src.width - half, legH, half, legY - lift, src.width - half, legH);
  }
  return c;
}

// 4-phase gait from one or two authored poses:
// contact → shuffle-L → stride(B) → shuffle-R  (B falls back to a lift of A)
// HD sprites (cell ≤ 2) lift by 2 cells so the step reads at phone size.
function makeGait(fA, fB, scale) {
  const lift = scale <= 2 ? scale * 2 : scale;
  const stride = fB || walkFrame(fA, scale, 'L', lift);
  return [fA, walkFrame(fA, scale, 'L', lift), stride, walkFrame(fA, scale, 'R', lift)];
}

// subtle pale rim under very dark sprites so they never dissolve into dark floors
// (drawn UNDER the body: 4-direction offset silhouette at low alpha)
export function withRimIfDark(src, threshold = 54, alpha = 0.42) {
  const w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  let lum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 40) continue;
    lum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    n++;
  }
  if (!n || lum / n > threshold) return src;
  const c = document.createElement('canvas');
  c.width = w + 2; c.height = h + 2;
  const ctx = c.getContext('2d');
  const white = variant(src, { tint: '#c8cddc', tintAlpha: 1 });
  ctx.globalAlpha = alpha;
  for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) ctx.drawImage(white, ox, oy);
  ctx.globalAlpha = 1;
  ctx.drawImage(src, 1, 1);
  return c;
}

/* ============================= API ============================= */
// hi-density redraws + hand-authored second frames from the ateliers
// (sprites_hd.js is generated; empty entries fall back to legacy rows here)
import { CHAR_HD, ENEMY_HD, BOSS_HD } from './sprites_hd.js';
const CHAR_DEFS = CHAR_HD;
const ENEMY_DEFS = ENEMY_HD;
const BOSS_DEFS = BOSS_HD;

export const SPRITES = { chars: {}, charsB: {}, enemies: {}, enemiesB: {}, bosses: {}, misc: {},
  charFrames: {}, enemFrames: {}, bossFrames: {} };

function buildPair(def, legacyRows, legacyScale) {
  const cell = def ? (def.cell || 2) : legacyScale;
  const opts = def && def.pal ? { scale: cell, pal: def.pal } : { scale: cell };
  const rows = def ? def.rows : legacyRows;
  const fA = refineSprite(px(rows, opts), cell);
  const fB = def && def.rowsB ? refineSprite(px(def.rowsB, opts), cell) : null;
  return { fA, fB, cell, tall: rows.length >= (def ? 14 : 9) };
}

export function buildSprites() {
  SPRITES.charOutline = {};
  for (const [id, rows] of Object.entries(CHAR_ROWS)) {
    const { fA, fB, cell } = buildPair(CHAR_DEFS[id], rows, 3);
    SPRITES.chars[id] = fA;
    SPRITES.charFrames[id] = makeGait(fA, fB, cell);
    SPRITES.charsB[id] = SPRITES.charFrames[id][2];
    // bone-white 1px outline halo — the player anchor in dense hordes
    const oc = document.createElement('canvas');
    oc.width = fA.width + 4; oc.height = fA.height + 4;
    const octx = oc.getContext('2d');
    const white = variant(fA, { tint: '#EEEBDD', tintAlpha: 1 });
    for (const [ox, oy] of [[0, 2], [4, 2], [2, 0], [2, 4]]) octx.drawImage(white, ox, oy);
    SPRITES.charOutline[id] = oc;
  }
  for (const [id, rows] of Object.entries(ENEMY_ROWS)) {
    const { fA, fB, cell, tall } = buildPair(ENEMY_DEFS[id], rows, 3);
    // hand-authored B frames animate any body plan; legacy leg-lift only fits
    // tall humanoids (low/round bodies would tear)
    const frames = fB ? makeGait(fA, fB, cell) : (tall ? makeGait(fA, null, cell) : [fA]);
    SPRITES.enemFrames[id] = frames.map(f => withRimIfDark(f));
    SPRITES.enemies[id] = SPRITES.enemFrames[id][0];
    SPRITES.enemiesB[id] = SPRITES.enemFrames[id][2] || SPRITES.enemies[id];
  }
  for (const [id, rows] of Object.entries(BOSS_ROWS)) {
    const { fA, fB } = buildPair(BOSS_DEFS[id], rows, 4);
    SPRITES.bossFrames[id] = (fB ? [fA, fB] : [fA]).map(f => withRimIfDark(f, 50, 0.5));
    SPRITES.bosses[id] = SPRITES.bossFrames[id][0];
  }
  for (const [id, rows] of Object.entries(MISC_ROWS)) SPRITES.misc[id] = px(rows, { scale: 3 });
  // 宝箱拟态怪 uses the chest look as an enemy sprite
  SPRITES.enemies.chest = SPRITES.misc.chest;
  SPRITES.enemiesB.chest = SPRITES.misc.chest;
  SPRITES.enemFrames.chest = [SPRITES.misc.chest];
  // white silhouettes for the black-sun forbidden weapon & reaper scene + hit flash
  SPRITES.whiteOut = {};
  for (const [id, c] of Object.entries(SPRITES.enemies)) SPRITES.whiteOut[id] = variant(c, { tint: '#EEEBDD', tintAlpha: 1 });
}

/* ============================= portrait cards ============================= */
// theme glow per character — the color of each hero's signature relic
const PORTRAIT_GLOW = {
  adric: '#D4474F',    // 心灯之红
  evlann: '#E0C06A',   // 裂环金
  hemer: '#9DB38C',    // 疫香绿
  corlan: '#E89A4A',   // 钟铜橙
  vielna: '#8A6BA0',   // 空冠紫
  samuel: '#C96B2F',   // 硫火橙
  mina: '#E8D98A',     // 魂灯烛黄
  voll: '#A62C3C',     // 刑台血红
  rahshiel: '#C7D0E8', // 残翼灰蓝白
  noin: '#6E86B8',     // 黑镜冷蓝
};

function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// fallback for unlisted ids: weighted dominant color of the sprite's
// saturated bright pixels (armor greys / blacks barely contribute)
function spriteThemeColor(src) {
  const w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, wt = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 160) continue;
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    if (mx < 70) continue;
    const k = (mx - mn) * (mx - mn) * 0.01 + mx * 0.05;
    r += d[i] * k; g += d[i + 1] * k; b += d[i + 2] * k; wt += k;
  }
  if (!wt) return '#B58D3B';
  const to2 = v => Math.round(v / wt).toString(16).padStart(2, '0');
  return '#' + to2(r) + to2(g) + to2(b);
}

// deterministic grain tile (dark specks + pale parchment flecks), built once
let _noiseTile = null;
function portraitNoise() {
  if (_noiseTile) return _noiseTile;
  const n = 64;
  _noiseTile = document.createElement('canvas');
  _noiseTile.width = n; _noiseTile.height = n;
  const ctx = _noiseTile.getContext('2d');
  const img = ctx.createImageData(n, n);
  let s = 0x9E3779B9;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd();
    if (v < 0.17) { // sarcophagus grain
      img.data[i] = 6; img.data[i + 1] = 4; img.data[i + 2] = 3;
      img.data[i + 3] = 26 + rnd() * 44 | 0;
    } else if (v > 0.9) { // pale parchment fleck
      img.data[i] = 226; img.data[i + 1] = 206; img.data[i + 2] = 166;
      img.data[i + 3] = 9 + rnd() * 18 | 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return _noiseTile;
}

// short double-line L ornament hugging one corner of the frame
function portraitCornerL(ctx, x0, y0, dx, dy, inset, len) {
  ctx.beginPath();
  ctx.moveTo(x0 + dx * inset, y0 + dy * (inset + len));
  ctx.lineTo(x0 + dx * inset, y0 + dy * inset);
  ctx.lineTo(x0 + dx * (inset + len), y0 + dy * inset);
  ctx.stroke();
}

const portraitCache = new Map();

// big portrait card for menus — dark parchment ground, theme glow,
// pixel-sharp centered sprite, gold frame. Same signature as before.
export function makePortrait(charId, size = 96) {
  const key = charId + '@' + size;
  const hit = portraitCache.get(key);
  if (hit) return hit;
  const src = SPRITES.chars[charId];
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 1) dark parchment / sarcophagus ground
  const g0 = ctx.createLinearGradient(0, 0, 0, size);
  g0.addColorStop(0, '#2b2119');
  g0.addColorStop(0.5, '#1e1712');
  g0.addColorStop(1, '#120d0a');
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, size, size);
  const warm = ctx.createRadialGradient(size / 2, size * 0.42, size * 0.06, size / 2, size * 0.42, size * 0.62);
  warm.addColorStop(0, 'rgba(216,199,164,0.08)');
  warm.addColorStop(1, 'rgba(216,199,164,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ctx.createPattern(portraitNoise(), 'repeat');
  ctx.fillRect(0, 0, size, size);

  // 2) theme glow behind the figure
  const [gr, gg, gb] = hexRGB(PORTRAIT_GLOW[charId] || (src ? spriteThemeColor(src) : '#B58D3B'));
  const glow = ctx.createRadialGradient(size / 2, size * 0.45, size * 0.03, size / 2, size * 0.45, size * 0.42);
  glow.addColorStop(0, `rgba(${gr},${gg},${gb},0.38)`);
  glow.addColorStop(0.55, `rgba(${gr},${gg},${gb},0.15)`);
  glow.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  // faint saint-halo ring behind the figure
  ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.22)`;
  ctx.lineWidth = Math.max(1, size * 0.014);
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.44, size * 0.315, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.1)`;
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.44, size * 0.345, 0, Math.PI * 2);
  ctx.stroke();

  // 3) vignette — darkened corners seat the figure in the card
  const vin = ctx.createRadialGradient(size / 2, size / 2, size * 0.34, size / 2, size / 2, size * 0.74);
  vin.addColorStop(0, 'rgba(0,0,0,0)');
  vin.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vin;
  ctx.fillRect(0, 0, size, size);

  if (src) {
    // 4) centered sprite at integer scale, elliptical shadow under the feet
    const s = Math.max(1, Math.floor(size * 0.72 / Math.max(src.width, src.height)));
    const w = src.width * s, h = src.height * s;
    const x = Math.round((size - w) / 2);
    const feetY = Math.round(size * 0.85);
    const y = Math.max(Math.round(size * 0.1), feetY - h);
    const rx = Math.max(6, w * 0.46), ry = Math.max(2.5, s * 1.9);
    ctx.save();
    ctx.translate(size / 2, feetY);
    ctx.scale(1, ry / rx);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)');
    sh.addColorStop(0.7, 'rgba(0,0,0,0.25)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
    ctx.drawImage(src, x, y, w, h);
  }

  // 5) gold frame: outer hairline, 1px #B58D3B inner frame, corner double lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  ctx.strokeStyle = '#B58D3B';
  ctx.globalAlpha = 0.9;
  ctx.strokeRect(2.5, 2.5, size - 5, size - 5);
  const len = Math.max(6, Math.round(size * 0.14));
  const corners = [[0.5, 0.5, 1, 1], [size - 0.5, 0.5, -1, 1], [0.5, size - 0.5, 1, -1], [size - 0.5, size - 0.5, -1, -1]];
  ctx.globalAlpha = 0.75;
  for (const [x0, y0, dx, dy] of corners) portraitCornerL(ctx, x0, y0, dx, dy, 5, len);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#E0C06A';
  ctx.fillStyle = '#E0C06A';
  for (const [x0, y0, dx, dy] of corners) {
    portraitCornerL(ctx, x0, y0, dx, dy, 2, Math.round(len * 0.55));
    ctx.fillRect(dx > 0 ? x0 + 3.5 : x0 - 4.5, dy > 0 ? y0 + 3.5 : y0 - 4.5, 1, 1);
  }
  portraitCache.set(key, c);
  return c;
}
