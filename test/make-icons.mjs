// Generate launcher icons + splash screens by rendering the game's key visual
// (procedural black sun over a coffin knight silhouette) in headless Chromium.
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
page.on('pageerror', e => console.log('PAGEERR:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });

// icon canvas: black sun with red corona, bone rays, tiny knight silhouette
const iconHtml = (pad) => `<!DOCTYPE html><html><body style="margin:0"><canvas id="c" width="1024" height="1024"></canvas><script>(()=>{
const c=document.getElementById('c'),x=c.getContext('2d');
const P=${pad};   // padding factor for adaptive foreground safe zone
// bg
const g=x.createRadialGradient(512,512,80,512,512,760);
g.addColorStop(0,'#281015');g.addColorStop(1,'#0B0A0C');
x.fillStyle=g;x.fillRect(0,0,1024,1024);
// parchment ring
x.strokeStyle='rgba(216,199,164,0.25)';x.lineWidth=8;
x.beginPath();x.arc(512,512,430*P,0,6.29);x.stroke();
// rays
x.strokeStyle='#B58D3B';x.lineWidth=14;
for(let i=0;i<16;i++){const a=i/16*6.283;
x.beginPath();x.moveTo(512+Math.cos(a)*300*P,512+Math.sin(a)*300*P);
x.lineTo(512+Math.cos(a)*((i%2?390:360)*P),512+Math.sin(a)*((i%2?390:360)*P));x.stroke();}
// black sun
x.fillStyle='#050405';x.beginPath();x.arc(512,512,250*P,0,6.29);x.fill();
// red corona
x.strokeStyle='#D4474F';x.lineWidth=18;x.beginPath();x.arc(512,512,258*P,0,6.29);x.stroke();
x.strokeStyle='rgba(142,31,47,0.6)';x.lineWidth=34;x.beginPath();x.arc(512,512,280*P,0,6.29);x.stroke();
// inner eye slit
x.strokeStyle='#8E1F2F';x.lineWidth=10;
x.beginPath();x.moveTo(512-120*P,512);x.quadraticCurveTo(512,512+70*P,512+120*P,512);x.stroke();
// knight silhouette (bone色) at bottom of sun
x.fillStyle='#D8C7A4';
const s=P*1.0;
const px=512-60*s, py=512-90*s, u=12*s;
const rows=['..XXXX..','..X..X..','.XXXXXX.','.X.XX.X.','.X.XX.X.','.XXXXXX.','..X..X..','..X..X..','.XX..XX.'];
rows.forEach((r,j)=>{[...r].forEach((ch,i)=>{if(ch==='X')x.fillRect(px+i*u,py+j*u,u,u);});});
})()</script></body></html>`;

// splash: vertical key art
const splashHtml = `<!DOCTYPE html><html><body style="margin:0"><canvas id="c" width="1280" height="1920"></canvas><script>(()=>{
const c=document.getElementById('c'),x=c.getContext('2d');
x.fillStyle='#0B0A0C';x.fillRect(0,0,1280,1920);
const g=x.createRadialGradient(640,600,60,640,600,900);
g.addColorStop(0,'#281015');g.addColorStop(1,'#0B0A0C');
x.fillStyle=g;x.fillRect(0,0,1280,1920);
// black sun
x.fillStyle='#050405';x.beginPath();x.arc(640,560,240,0,6.29);x.fill();
x.strokeStyle='#D4474F';x.lineWidth=12;x.beginPath();x.arc(640,560,248,0,6.29);x.stroke();
x.strokeStyle='rgba(142,31,47,0.5)';x.lineWidth=26;x.beginPath();x.arc(640,560,270,0,6.29);x.stroke();
// broken wings
x.strokeStyle='rgba(216,199,164,0.5)';x.lineWidth=8;
for(let i=0;i<5;i++){
x.beginPath();x.moveTo(400-i*30,560-i*46);x.quadraticCurveTo(240-i*40,480-i*60,150-i*24,560-i*40);x.stroke();
x.beginPath();x.moveTo(880+i*30,560-i*46);x.quadraticCurveTo(1040+i*40,480-i*60,1130+i*24,560-i*40);x.stroke();}
// inverted towers above
x.fillStyle='rgba(27,23,28,0.9)';
for(let i=0;i<4;i++){const bx=280+i*200;x.beginPath();x.moveTo(bx-40,0);x.lineTo(bx+40,0);x.lineTo(bx,170+i%2*50);x.closePath();x.fill();}
// ground
x.fillStyle='#120d10';x.fillRect(0,1500,1280,420);
// iron flowers
x.strokeStyle='rgba(90,95,102,0.8)';x.lineWidth=5;
for(let i=0;i<9;i++){const fx=90+i*140,fy=1560+((i*97)%160);
for(let p=0;p<6;p++){const a=p/6*6.283;
x.beginPath();x.moveTo(fx,fy);x.lineTo(fx+Math.cos(a)*36,fy+Math.sin(a)*36);x.stroke();}
x.fillStyle='#8E1F2F';x.fillRect(fx-5,fy-5,10,10);}
// knight
x.fillStyle='#D8C7A4';const u=16,px=640-4*u,py=1220;
const rows=['..XXXX..','..X..X..','.XXXXXX.','.X.XX.X.','.X.XX.X.','.XXXXXX.','..X..X..','..X..X..','.XX..XX.'];
rows.forEach((r,j)=>{[...r].forEach((ch,i)=>{if(ch==='X')x.fillRect(px+i*u,py+j*u,u,u);});});
// red heart lantern
x.fillStyle='#D4474F';x.fillRect(640-u/2,py+4*u,u,u);
// title runes (abstract marks, no text)
x.strokeStyle='rgba(181,141,59,0.9)';x.lineWidth=6;
x.beginPath();x.moveTo(430,1030);x.lineTo(850,1030);x.stroke();
x.beginPath();x.moveTo(520,1060);x.lineTo(760,1060);x.stroke();
})()</script></body></html>`;

async function shot(html, w, h, path) {
  await page.setViewportSize({ width: w > 0 ? Math.max(w, 100) : 1024, height: h > 0 ? Math.max(h, 100) : 1024 });
  await page.setContent(html);
  await page.waitForTimeout(120);
  const buf = await page.locator('#c').screenshot({ type: 'png' });
  writeFileSync(path, buf);
  console.log('wrote', path);
}

const res = 'android/app/src/main/res';
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const fgSizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

// render master once per variant then let Chromium downscale via viewport css? simpler: screenshot full 1024 then use canvas scaling per size
// easiest: set canvas css size via clip — playwright screenshot scales with device pixel ratio; instead just write 1024 master and rely on Android scaling? Android requires exact-ish sizes but scales fine. Still, produce proper sizes via page raster:
async function sized(html, size, path) {
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(html);
  await page.waitForTimeout(100);
  await page.evaluate((s) => {
    const c = document.getElementById('c');
    c.style.width = s + 'px'; c.style.height = s + 'px';
  }, size);
  const buf = await page.locator('#c').screenshot({ type: 'png' });
  writeFileSync(path, buf);
  console.log('wrote', path, size);
}

for (const [dpi, s] of Object.entries(sizes)) {
  await sized(iconHtml(1.0), s, `${res}/mipmap-${dpi}/ic_launcher.png`);
  await sized(iconHtml(1.0), s, `${res}/mipmap-${dpi}/ic_launcher_round.png`);
}
for (const [dpi, s] of Object.entries(fgSizes)) {
  await sized(iconHtml(0.62), s, `${res}/mipmap-${dpi}/ic_launcher_foreground.png`);
}
// splash screens (portrait + land + universal)
async function sizedSplash(w, h, path) {
  await page.setViewportSize({ width: 1280, height: 1920 });
  await page.setContent(splashHtml);
  await page.waitForTimeout(120);
  await page.evaluate(([w, h]) => {
    const c = document.getElementById('c');
    c.style.width = w + 'px'; c.style.height = h + 'px';
  }, [w, h]);
  const buf = await page.locator('#c').screenshot({ type: 'png' });
  writeFileSync(path, buf);
  console.log('wrote', path);
}
await sizedSplash(480, 720, `${res}/drawable/splash.png`);
const portSizes = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
for (const [dpi, [w, h]] of Object.entries(portSizes)) {
  if (existsSync(`${res}/drawable-port-${dpi}`)) await sizedSplash(w, h, `${res}/drawable-port-${dpi}/splash.png`);
  if (existsSync(`${res}/drawable-land-${dpi}`)) await sizedSplash(h, w, `${res}/drawable-land-${dpi}/splash.png`);
}
// icon master for repo/store listing
mkdirSync('store', { recursive: true });
await sized(iconHtml(1.0), 512, 'store/icon-512.png');
await sizedSplash(1280, 1920, 'store/splash-1280x1920.png');
await browser.close();
console.log('done');
