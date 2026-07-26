// Enemy archetypes per area. base hp/dmg get scaled by BAL formulas.
// behaviors: chase | dart(dash charge) | shoot | swarm | orbit(circles player) | splitter | summoner | mimic
export const ENEMIES = {
  /* 灰葬原野 */
  shroudman: { name: '裹尸人', sprite: 'shroud', hp: 12, dmg: 6, speed: 46, r: 13, behavior: 'chase' },
  gravehound: { name: '墓犬', sprite: 'hound', hp: 8, dmg: 5, speed: 74, r: 12, behavior: 'dart' },
  bonecrow: { name: '骨鸦', sprite: 'crow', hp: 5, dmg: 3, speed: 56, r: 10, behavior: 'swarm' },
  diggermonk: { name: '挖墓修士', sprite: 'monk', hp: 22, dmg: 8, speed: 38, r: 14, behavior: 'chase' },
  waxbride: { name: '蜡尸新娘', sprite: 'bride', hp: 30, dmg: 9, speed: 30, r: 14, behavior: 'shoot', proj: { dmg: 7, speed: 150, cd: 3.2 } },
  ashghoul: { name: '灰烬食尸鬼', sprite: 'ashghoul', hp: 15, dmg: 7, speed: 52, r: 13, behavior: 'chase' },
  /* 腐香大教堂 */
  ashmonk: { name: '香灰修士', sprite: 'monk', tint: '#75876B', hp: 26, dmg: 11, speed: 44, r: 14, behavior: 'chase', status: 'rot' },
  waxchoir: { name: '蜡面唱诗班', sprite: 'choir', hp: 20, dmg: 9, speed: 40, r: 13, behavior: 'shoot', proj: { dmg: 10, speed: 130, cd: 2.8 } },
  blindnun: { name: '盲眼修女', sprite: 'nun', hp: 34, dmg: 13, speed: 52, r: 13, behavior: 'orbit' },
  praycentipede: { name: '祷告蜈蚣', sprite: 'centipede', hp: 44, dmg: 12, speed: 66, r: 16, behavior: 'dart' },
  bellpenitent: { name: '背钟苦修者', sprite: 'bellback', hp: 60, dmg: 16, speed: 26, r: 16, behavior: 'chase', armor: 20 },
  chapelwalker: { name: '行走圣龛', sprite: 'chapel', hp: 40, dmg: 10, speed: 30, r: 15, behavior: 'summoner', summon: 'bonecrow', cd: 6 },
  /* 七钟沉城 */
  drownedsoldier: { name: '溺亡兵', sprite: 'drowned', hp: 45, dmg: 15, speed: 48, r: 14, behavior: 'chase' },
  facelesssailor: { name: '无面水手', sprite: 'sailor', hp: 38, dmg: 13, speed: 58, r: 13, behavior: 'orbit' },
  belltonguegiant: { name: '钟舌巨人', sprite: 'belltongue', hp: 130, dmg: 22, speed: 24, r: 20, behavior: 'chase', armor: 30 },
  tidecorpse: { name: '潮尸', sprite: 'tidecorpse', hp: 16, dmg: 8, speed: 64, r: 11, behavior: 'swarm' },
  coffinhunter: { name: '棺舟猎手', sprite: 'coffinboat', hp: 55, dmg: 16, speed: 42, r: 15, behavior: 'shoot', proj: { dmg: 14, speed: 180, cd: 2.6 } },
  /* 堕翼审判庭 — no minions (rules) */
  /* 地狱铁花园 */
  ironflowersoldier: { name: '铁花兵', sprite: 'ironflower', hp: 70, dmg: 20, speed: 50, r: 14, behavior: 'chase' },
  furnacewalker: { name: '熔炉行者', sprite: 'furnace', hp: 120, dmg: 26, speed: 34, r: 16, behavior: 'chase', deathBoom: true },
  hellhound: { name: '狱犬', sprite: 'hound', tint: '#c96b2f', hp: 40, dmg: 16, speed: 90, r: 12, behavior: 'dart' },
  umbilcarrier: { name: '脐带搬运者', sprite: 'monk', tint: '#c96b2f', hp: 90, dmg: 18, speed: 40, r: 14, behavior: 'summoner', summon: 'hellimp', cd: 5 },
  hellimp: { name: '铁花芽', sprite: 'crow', tint: '#D4474F', hp: 14, dmg: 10, speed: 72, r: 10, behavior: 'swarm' },
  facereader: { name: '读脸人', sprite: 'nun', tint: '#c96b2f', hp: 65, dmg: 18, speed: 55, r: 13, behavior: 'orbit' },
  /* 假天堂 */
  cherub: { name: '瓷面天童', sprite: 'cherub', hp: 60, dmg: 18, speed: 56, r: 12, behavior: 'chase', disguised: true },
  falselamb: { name: '伪羊', sprite: 'lamb', hp: 40, dmg: 12, speed: 44, r: 12, behavior: 'swarm', disguised: true },
  shepherdpuppet: { name: '牧杖傀儡', sprite: 'shepherd', hp: 95, dmg: 22, speed: 40, r: 14, behavior: 'shoot', proj: { dmg: 18, speed: 170, cd: 2.4 }, disguised: true },
  smilewalker: { name: '微笑行人', sprite: 'choir', tint: '#EEEBDD', hp: 70, dmg: 18, speed: 50, r: 13, behavior: 'chase', disguised: true },
  gardenkeeper: { name: '花园管理员', sprite: 'bellback', tint: '#EEEBDD', hp: 150, dmg: 26, speed: 28, r: 16, behavior: 'chase', armor: 25, disguised: true },
  /* 真天堂 */
  corruptseraph: { name: '腐化炽天使', sprite: 'seraphim', hp: 110, dmg: 26, speed: 58, r: 14, behavior: 'orbit' },
  nervewalker: { name: '神经行者', sprite: 'nervewalker', hp: 80, dmg: 22, speed: 66, r: 13, behavior: 'dart' },
  sacredeye: { name: '圣眼', sprite: 'eyeball', hp: 60, dmg: 18, speed: 40, r: 12, behavior: 'shoot', proj: { dmg: 22, speed: 200, cd: 2.0 } },
  prayerclot: { name: '祈祷凝块', sprite: 'tidecorpse', tint: '#7c5f8a', hp: 30, dmg: 14, speed: 70, r: 11, behavior: 'swarm' },
  hymnbearer: { name: '圣歌抬棺人', sprite: 'coffinboat', tint: '#4a5a74', hp: 180, dmg: 30, speed: 30, r: 16, behavior: 'summoner', summon: 'prayerclot', cd: 4.5 },
  /* 天外尸海 mixes everything + these */
  worldlarva: { name: '世界幼虫', sprite: 'centipede', tint: '#49364F', hp: 200, dmg: 32, speed: 60, r: 17, behavior: 'dart' },
  deadsunshard: { name: '死日残片', sprite: 'eyeball', tint: '#8E1F2F', hp: 150, dmg: 28, speed: 50, r: 13, behavior: 'shoot', proj: { dmg: 26, speed: 220, cd: 1.8 } },
  /* special */
  chestmimic: { name: '宝箱拟态怪', sprite: 'chest', hp: 100, dmg: 20, speed: 70, r: 14, behavior: 'dart', mimic: true },
};

// spawn tables per area: [enemyId, weight]; elites picked from same list (scaled)
export const SPAWN_TABLES = {
  ashfield: [['shroudman', 30], ['gravehound', 22], ['bonecrow', 20], ['diggermonk', 14], ['waxbride', 8], ['ashghoul', 12]],
  cathedral: [['ashmonk', 26], ['waxchoir', 20], ['blindnun', 16], ['praycentipede', 14], ['bellpenitent', 10], ['chapelwalker', 8]],
  bells: [['drownedsoldier', 26], ['facelesssailor', 20], ['tidecorpse', 26], ['coffinhunter', 14], ['belltonguegiant', 8]],
  hell: [['ironflowersoldier', 26], ['hellhound', 22], ['hellimp', 18], ['furnacewalker', 12], ['umbilcarrier', 8], ['facereader', 12]],
  fakeheaven: [['falselamb', 26], ['cherub', 24], ['smilewalker', 20], ['shepherdpuppet', 14], ['gardenkeeper', 8]],
  trueheaven: [['corruptseraph', 22], ['nervewalker', 22], ['prayerclot', 24], ['sacredeye', 16], ['hymnbearer', 8]],
  corpsesea: [['worldlarva', 18], ['deadsunshard', 14], ['corruptseraph', 14], ['ironflowersoldier', 14], ['drownedsoldier', 14], ['cherub', 12], ['praycentipede', 14]],
};
