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
  xpNeed: L => Math.round(8 + 4 * L + 0.12 * L * L),
  // enemy growth (t = run minutes)
  enemyHp: (base, zoneMult, diffMult, t) => base * zoneMult * diffMult * (1 + 0.08 * t + 0.006 * t * t),
  enemyAtk: (base, zoneMult, diffMult, t) => base * zoneMult * diffMult * (1 + 0.05 * t + 0.0025 * t * t),
  zoneMult: { ashfield: 1.0, cathedral: 1.15, bells: 1.35, tribunal: 1.5, hell: 1.75, fakeheaven: 2.05, trueheaven: 2.5, corpsesea: 2.8 },
  bossHp: { anlo: 18000, mimi: 90000, whale: 320000, rahshiel: 260000, margola: 1100000, lambking: 2600000, mother: 8500000 },
  // screen pressure targets (max live enemies) by minute — gentle first two minutes
  pressure: t => t < 0.5 ? 12 : t < 2 ? 12 + (t - 0.5) * 12 : t < 7 ? 30 + (t - 2) * 15 : t < 14 ? 105 + (t - 7) * 13 : t < 21 ? 200 + (t - 14) * 20 : t < 30 ? 340 : 400,
  difficulties: {
    murmur: { name: '默祷', hp: 0.85, atk: 0.85, reward: 0.9 },
    pilgrim: { name: '朝圣', hp: 1.0, atk: 1.0, reward: 1.0 },
    penance: { name: '苦修', hp: 1.25, atk: 1.15, reward: 1.25 },
    blaspheme: { name: '亵渎', hp: 1.6, atk: 1.3, reward: 1.6 },
  },
  endless: { hpPow: 1.38, atkPow: 1.17, densityAdd: 0.12 },
  // pilgrimage timeline (seconds)
  timeline: { cathedral: 420, bells: 840, knell: 1260, hellEnd: 1800, fakeheavenEnd: 2280, motherAt: 2640 },
  tribunalTime: 75,
  weaponLvMult: [1, 1.18, 1.42, 1.7, 2.0, 2.35, 2.75, 3.25], // lv1..8 damage multiplier
  catalystLvMult: [1, 1.5, 2.0, 2.5, 3.0],                    // lv1..5 effect multiplier
  artifactMult: 2.5,                                          // evolved output multiplier
};
