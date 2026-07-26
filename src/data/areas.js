// Area definitions (docs §12) — progression is boss-gated, see run/flow.js
export const AREAS = {
  ashfield: { name: '灰葬原野', bg: 'ashfield', boss: 'anlo', music: 'ashfield',
    mech: '墓碑阻挡移动但可击碎；点燃蜡烛扩大拾取；灰雾周期降临' },
  cathedral: { name: '腐香大教堂', bg: 'cathedral', boss: 'mimi', music: 'cathedral',
    mech: '毒香区域周期移动；彩窗光带有伤害' },
  bells: { name: '七钟沉城', bg: 'bells', boss: 'whale', music: 'bells',
    mech: '巨钟敲响产生地图级冲击波，站入阴影可躲避' },
  corridor: { name: '终末白廊', bg: 'corridor', boss: null, music: 'silence' },
  tribunal: { name: '堕翼审判庭', bg: 'tribunal', boss: 'rahshiel', music: 'tribunal' },
  hell: { name: '地狱铁花园', bg: 'hell', boss: 'margola', music: 'hell',
    mech: '铁花在走过后闭合爆炸；地狱果实提供强力增益但提高诅咒' },
  fakeheaven: { name: '假天堂', bg: 'fakeheaven', boss: 'lambking', music: 'fakeheaven',
    mech: '顺从值持续增长；站在阴影中或击杀伪装NPC可降低' },
  trueheaven: { name: '真天堂', bg: 'trueheaven', boss: 'mother', music: 'trueheaven',
    mech: '黑色祷文坠落；你的治疗也会治疗真天堂' },
  corpsesea: { name: '天外尸海', bg: 'corpsesea', boss: null, music: 'corpsesea',
    mech: '每八分钟混合一层世界，叠加腐化词缀' },
};


export const ENDLESS_AFFIXES = [
  { id: 'backflow', name: '逆流', desc: '敌方投射物靠近后折返一次' },
  { id: 'moonless', name: '无月', desc: '拾取范围降低，经验宝石价值翻倍' },
  { id: 'fleshbell', name: '肉钟', desc: '每整分钟生成一座持续召怪的肉质钟塔' },
  { id: 'twinsin', name: '双生罪', desc: '精英死亡后生成较弱复制体' },
  { id: 'daysick', name: '白昼病', desc: '停留光照区域累积顺从值' },
  { id: 'blackrain', name: '黑雨', desc: '周期降下伤害敌我的黑色雨滴' },
  { id: 'latedeath', name: '迟来的死亡', desc: '敌人死亡两秒后才爆炸消失' },
  { id: 'hollowsaint', name: '空心圣徒', desc: 'Boss生命-20%，攻速+35%' },
  { id: 'noheal', name: '禁止治疗', desc: '治疗转化为临时攻击力' },
  { id: 'hungerart', name: '神器饥饿', desc: '神器触发频率降低，伤害+100%' },
];
