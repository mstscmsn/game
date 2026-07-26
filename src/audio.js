// Procedural WebAudio: synthesized SFX + generative area music.
let AC = null, masterG = null, sfxG = null, musG = null;
let unlocked = false;
const S = () => (window.SETTINGS || { sound: 1, music: 1 });

export function initAudio() {
  const unlock = () => {
    if (unlocked) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      masterG = AC.createGain(); masterG.connect(AC.destination);
      sfxG = AC.createGain(); sfxG.connect(masterG);
      musG = AC.createGain(); musG.connect(masterG);
      updateVolumes();
      unlocked = true;
      if (pendingMusic) playMusic(pendingMusic);
    } catch (e) { console.warn('audio unavailable'); }
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
}
export function updateVolumes() {
  if (!AC) return;
  sfxG.gain.value = 0.5 * S().sound;
  musG.gain.value = 0.32 * S().music;
}

/* ------------------------- SFX ------------------------- */
function env(g, t0, a, d, peak = 1) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function tone(freq, type, a, d, peak = 0.5, slideTo = null, dest = null) {
  if (!AC) return;
  const t0 = AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + a + d);
  env(g, t0, a, d, peak);
  o.connect(g); g.connect(dest || sfxG);
  o.start(t0); o.stop(t0 + a + d + 0.05);
}
function noise(a, d, peak = 0.4, freq = 1200, q = 1) {
  if (!AC) return;
  const t0 = AC.currentTime;
  const len = Math.ceil(AC.sampleRate * (a + d + 0.05));
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); env(g, t0, a, d, peak);
  src.connect(f); f.connect(g); g.connect(sfxG);
  src.start(t0); src.stop(t0 + a + d + 0.05);
}

// per-weapon fire voices (throttled per id) — each weapon gets a signature
const FIRE_VOICE = {
  musket: () => { noise(0.003, 0.07, 0.26, 650); tone(85, 'square', 0.002, 0.06, 0.18, 50); },
  spear: () => noise(0.002, 0.05, 0.14, 1600, 2),
  bow: () => { tone(220, 'triangle', 0.002, 0.05, 0.1, 160); noise(0.002, 0.04, 0.1, 2000, 3); },
  raven: () => noise(0.004, 0.09, 0.12, 500, 1.5),
  dagger: () => noise(0.002, 0.03, 0.1, 2600, 3),
  harp: () => tone(330, 'triangle', 0.004, 0.14, 0.12, 262),
  wheel: () => tone(90, 'sawtooth', 0.004, 0.12, 0.12, 60),
  wingblade: () => noise(0.002, 0.06, 0.12, 1200, 2),
  scripture: () => tone(520, 'sine', 0.003, 0.06, 0.08, 620),
  lantern: () => tone(392, 'sine', 0.005, 0.12, 0.08, 330),
  chain: () => { noise(0.002, 0.05, 0.16, 900, 2); tone(140, 'square', 0.002, 0.04, 0.08, 90); },
};
const fireLast = {};
export function fireSound(id) {
  if (!AC) return;
  const now = performance.now();
  if (now - (fireLast[id] || 0) < 90) return;
  fireLast[id] = now;
  const v = FIRE_VOICE[id];
  if (v) v();
}

// merged kill sfx: at most every 90ms
let lastKill = 0, killCount = 0;
export const sfx = {
  hit() { /* intentionally silent per-hit to avoid noise walls */ },
  kill() {
    const now = performance.now();
    killCount++;
    if (now - lastKill < 90) return;
    lastKill = now;
    // denser kill-streaks ring lower and heavier — the mowing accelerates audibly
    const p = Math.min(0.5, 0.22 + killCount * 0.02);
    const f = 900 - Math.min(400, killCount * 60) + Math.random() * 300;
    killCount = 0;
    noise(0.004, 0.09, p, f, 0.8);
  },
  eliteKill() { noise(0.005, 0.3, 0.6, 300, 1.2); tone(70, 'sine', 0.005, 0.35, 0.7, 40); },
  hurt() { tone(160, 'square', 0.004, 0.12, 0.35, 90); noise(0.004, 0.08, 0.25, 500); },
  dodge() { noise(0.003, 0.07, 0.2, 2400, 2); },
  pickup() { tone(660 + Math.random() * 80, 'triangle', 0.004, 0.07, 0.16, 880); },
  levelup() { tone(392, 'triangle', 0.01, 0.25, 0.3); setTimeout(() => tone(523, 'triangle', 0.01, 0.3, 0.3), 90); },
  select() { tone(440, 'square', 0.002, 0.05, 0.12); },
  chest() { tone(330, 'triangle', 0.01, 0.2, 0.3, 660); setTimeout(() => tone(660, 'triangle', 0.01, 0.4, 0.3, 990), 140); },
  fusion() { tone(196, 'sawtooth', 0.02, 0.9, 0.4, 392); setTimeout(() => tone(587, 'triangle', 0.01, 0.7, 0.35), 300); noise(0.02, 0.7, 0.25, 600); },
  forbidden() { tone(55, 'sawtooth', 0.03, 1.5, 0.6, 27); setTimeout(() => tone(880, 'sine', 0.01, 1.2, 0.25, 1760), 350); noise(0.03, 1.2, 0.4, 200); },
  bell() { tone(220, 'sine', 0.005, 1.8, 0.5, 218); tone(440, 'sine', 0.005, 1.2, 0.25, 436); tone(556, 'triangle', 0.005, 0.8, 0.15); },
  bigbell() { tone(110, 'sine', 0.01, 3.0, 0.7, 108); tone(165, 'sine', 0.01, 2.2, 0.4); tone(275, 'triangle', 0.01, 1.4, 0.2); if (navigator.vibrate && (window.SETTINGS?.shake ?? 1) > 0) navigator.vibrate(120); },
  sinReady() { tone(587, 'sine', 0.01, 0.3, 0.25, 880); },
  sinCast() { tone(98, 'sawtooth', 0.02, 0.8, 0.5, 49); noise(0.01, 0.5, 0.35, 400); },
  boss() { tone(65, 'sawtooth', 0.05, 2, 0.5); tone(98, 'sawtooth', 0.05, 2, 0.3); },
  reaperStep() { noise(0.01, 0.4, 0.5, 120, 3); tone(49, 'sine', 0.01, 0.6, 0.6, 30); },
  execute() { stopMusic(true); setTimeout(() => { tone(36, 'sine', 0.05, 3, 0.9, 20); noise(0.02, 2, 0.6, 150); if (navigator.vibrate) navigator.vibrate([200, 80, 300]); }, 400); },
  heartbeat() { tone(52, 'sine', 0.01, 0.18, 0.5, 40); setTimeout(() => tone(48, 'sine', 0.01, 0.22, 0.4, 36), 240); },
  wrongchoir() { tone(523.25 * Math.pow(2, 1 / 12), 'sine', 0.3, 1.2, 0.12); },
};

/* ------------------------- MUSIC ------------------------- */
// Generative per-area loops: bass drone + arpeggio + optional pad.
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};
const MUSIC_DEFS = {
  ashfield: { root: 110, scale: 'minor', bpm: 62, wave: 'triangle', bass: true, dens: 0.55 },
  cathedral: { root: 98, scale: 'phrygian', bpm: 70, wave: 'sawtooth', bass: true, dens: 0.6, organ: true },
  bells: { root: 87.3, scale: 'minor', bpm: 56, wave: 'sine', bass: true, dens: 0.45, bells: true },
  tribunal: { root: 82.4, scale: 'locrian', bpm: 84, wave: 'sawtooth', bass: true, dens: 0.75 },
  hell: { root: 73.4, scale: 'phrygian', bpm: 92, wave: 'sawtooth', bass: true, dens: 0.8 },
  fakeheaven: { root: 130.8, scale: 'major', bpm: 76, wave: 'sine', bass: false, dens: 0.5, choir: true, wrongNote: true },
  trueheaven: { root: 65.4, scale: 'locrian', bpm: 48, wave: 'sine', bass: true, dens: 0.4, heartbeat: true, reversed: true },
  corpsesea: { root: 55, scale: 'minor', bpm: 66, wave: 'triangle', bass: true, dens: 0.6 },
  hub: { root: 110, scale: 'minor', bpm: 50, wave: 'sine', bass: true, dens: 0.3 },
  silence: null,
};
let musicTimer = null, currentMusic = null, pendingMusic = null, step = 0;

export function playMusic(id) {
  pendingMusic = id;
  if (!AC) return;
  if (currentMusic === id) return;
  stopMusic();
  currentMusic = id;
  const def = MUSIC_DEFS[id];
  if (!def) return;
  const stepDur = 60 / def.bpm / 2;
  step = 0;
  const scale = SCALES[def.scale];
  musicTimer = setInterval(() => {
    if (!AC || document.hidden) return;
    const t0 = AC.currentTime;
    const bar = (step / 8) | 0;
    // bass drone every 8 steps
    if (def.bass && step % 8 === 0) {
      mtone(def.root / 2, 'sine', stepDur * 7.5, 0.22);
      mtone(def.root / 2 * 1.5, 'sine', stepDur * 7.5, 0.07);
    }
    if (def.heartbeat && step % 8 === 0) { mtone(50, 'sine', 0.2, 0.3, 38); setTimeout(() => mtone(46, 'sine', 0.22, 0.24, 34), 260); }
    // melody arpeggio
    if (Math.random() < def.dens) {
      let deg = def.reversed ? (6 - (step * 3) % 7) : (step * 3 + bar) % 7;
      let semis = scale[Math.abs(deg) % 7];
      if (def.wrongNote && bar % 4 === 3 && step % 8 === 4) semis += 1; // the wrong semitone
      const oct = def.reversed ? 0 : (step % 16 < 8 ? 1 : 2);
      const f = def.root * Math.pow(2, (semis + oct * 12) / 12);
      mtone(f, def.wave, stepDur * (def.choir ? 3.5 : 1.8), def.choir ? 0.06 : 0.09);
      if (def.choir) { mtone(f * 1.007, 'sine', stepDur * 3.5, 0.05); mtone(f * 0.995, 'sine', stepDur * 3.5, 0.05); }
      if (def.organ) mtone(f / 2, 'square', stepDur * 1.8, 0.025);
    }
    if (def.bells && step % 32 === 24) { mtone(def.root * 2, 'sine', 2.5, 0.12, def.root * 2 - 2); }
    step++;
  }, stepDur * 1000);
}
function mtone(freq, type, dur, peak, slideTo = null) {
  if (!AC) return;
  const t0 = AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.05, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(musG);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
export function stopMusic(hard = false) {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  currentMusic = null; pendingMusic = null;
  // hard: also silence tails abruptly (reaper arrival — no fade per spec)
  if (hard && AC && musG) { musG.gain.cancelScheduledValues(AC.currentTime); musG.gain.setValueAtTime(0, AC.currentTime); setTimeout(() => updateVolumes(), 800); }
}
