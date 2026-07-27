// Core numeric design (docs §14)
export const BAL = {
  base: {
    hp: 100, armor: 0, moveSpeed: 100,      // px/s  (4.2 units/s, 1u≈24px → ~100)
    pickup: 53,                              // 2.2u
    crit: 0.05, critDmg: 1.5,
    dodgeDist: 108, dodgeCd: 3.5, dodgeInv: 0.22,
    hurtInv: 0.45,
  },
  caps: { armorReduction: 0.6, crit: 0.75, cdr: 0.65, lifestealPerSec: 0.08, moveBonus: 0.6 },
  armorReduction: a => Math.min(0.6, a / (a + 100)),
  // compressed pacing (~3min chapters): cheap early levels, steeper quadratic so
  // late-game level-ups stay meaningful instead of flooding the screen
  xpNeed: L => Math.round((8 + 4 * L + 0.35 * L * L) * 0.6),
  // enemy growth (ta = AREA-ANCHORED minutes: AREA_MIN[areaId] + capped in-area time,
  // supplied by the spawner) — slow players no longer feed an unbounded global clock
  enemyHp: (base, zoneMult, diffMult, ta) => base * zoneMult * diffMult * (1 + 0.17 * ta + 0.02 * ta * ta),
  // touch damage: sqrt(zone) + linear time only — enemies.js def.dmg already carries
  // the per-area design growth, so the old triple multiplier stack is gone
  enemyAtk: (base, zoneMult, diffMult, ta) => base * Math.sqrt(zoneMult) * diffMult * (1 + 0.08 * ta),
  zoneMult: { ashfield: 1.0, cathedral: 1.2, bells: 1.45, tribunal: 1.6, hell: 1.9, fakeheaven: 2.3, trueheaven: 2.8, corpsesea: 3.1 },
  // boss HP retuned for boss-gated ~3min chapters (kill target 40-70s at reachable DPS)
  bossHp: { anlo: 4200, mimi: 15000, whale: 60000, rahshiel: 70000, margola: 160000, lambking: 360000, mother: 800000 },
  // screen pressure targets (max live enemies) by minute — compressed ramp
  pressure: t => t < 0.5 ? 12 : t < 1.5 ? 12 + (t - 0.5) * 20 : t < 3 ? 32 + (t - 1.5) * 30 : t < 6 ? 77 + (t - 3) * 30 : t < 9 ? 167 + (t - 6) * 30 : t < 13 ? 257 + (t - 9) * 20 : t < 17 ? 340 : 400,
  difficulties: {
    murmur: { name: '默祷', hp: 0.85, atk: 0.85, reward: 1.0 },
    pilgrim: { name: '朝圣', hp: 1.0, atk: 1.0, reward: 1.0 },
    penance: { name: '苦修', hp: 1.25, atk: 1.15, reward: 1.25 },
    blaspheme: { name: '亵渎', hp: 1.6, atk: 1.3, reward: 1.6 },
  },
  endless: { hpPow: 1.38, atkPow: 1.17, densityAdd: 0.12 },
  // boss-gated pacing: boss spawns this many seconds after entering an area;
  // the next area opens only after the boss dies (chapter ≈ 3 minutes)
  bossAfter: 130,
  areaGap: 8,               // seconds between boss death and next-area transition
  knellDelay: 16,           // knell rings this long after the whale falls
  tribunalTime: 75,
  weaponLvMult: [1, 1.18, 1.42, 1.7, 2.0, 2.35, 2.75, 3.25], // lv1..8 damage multiplier
  catalystLvMult: [1, 1.5, 2.0, 2.5, 3.0],                    // lv1..5 effect multiplier
  artifactMult: 2.5,                                          // evolved output multiplier
};
