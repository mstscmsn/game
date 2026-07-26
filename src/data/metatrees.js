// 局外成长树 (docs §11.3) — 4 trees, ranks with ash/other resource costs.
// eff: value per rank applied to run stats.
export const TREES = {
  flesh: {
    name: '肉身遗嘱', res: 'ash',
    nodes: [
      { id: 'f_hp', name: '不腐之躯', desc: '最大生命+{v}%', maxRank: 5, per: 5, stat: 'maxHpMult', v: 0.05, cost: r => 60 + r * 90 },
      { id: 'f_armor', name: '钉入的铁片', desc: '护甲+{v}', maxRank: 5, per: 4, stat: 'armor', v: 4, flat: true, cost: r => 70 + r * 100 },
      { id: 'f_speed', name: '送葬者步伐', desc: '移动速度+{v}%', maxRank: 5, per: 2, stat: 'moveSpeed', v: 0.02, cost: r => 80 + r * 110 },
      { id: 'f_dodge', name: '棺盖侧滑', desc: '闪避冷却-{v}%', maxRank: 5, per: 2, stat: 'dodgeCdMult', v: -0.02, cost: r => 90 + r * 120 },
      { id: 'f_inv', name: '死过一次的皮肤', desc: '受伤无敌+{v}秒', maxRank: 2, per: 0.05, stat: 'hurtInv', v: 0.05, flat: true, cost: r => 200 + r * 300 },
      { id: 'f_regen', name: '心灯余温', desc: '每10秒恢复{v}生命', maxRank: 4, per: 1, stat: 'regen10', v: 1, flat: true, cost: r => 120 + r * 150 },
    ],
  },
  weaponT: {
    name: '兵器遗嘱', res: 'ash',
    nodes: [
      { id: 'w_dmg', name: '磨利的悔恨', desc: '全伤害+{v}%', maxRank: 5, per: 4, stat: 'damage', v: 0.04, cost: r => 80 + r * 120 },
      { id: 'w_cdr', name: '快一拍的钟摆', desc: '冷却缩减+{v}%', maxRank: 4, per: 3, stat: 'cdr', v: 0.03, cost: r => 90 + r * 130 },
      { id: 'w_area', name: '扩张的教区', desc: '范围+{v}%', maxRank: 5, per: 4, stat: 'area', v: 0.04, cost: r => 80 + r * 110 },
      { id: 'w_start2', name: '第二次初见', desc: '初始武器等级+1', maxRank: 1, stat: 'startWeaponLv', v: 1, flat: true, cost: () => 800, needNail: 2 },
      { id: 'w_fusehint', name: '融合启示', desc: '解锁融合图鉴提示与神器保底', maxRank: 1, stat: 'fuseHint', v: 1, flat: true, cost: () => 400 },
      { id: 'w_proj', name: '追罪的弹道', desc: '弹速+{v}%', maxRank: 4, per: 5, stat: 'projSpeed', v: 0.05, cost: r => 70 + r * 100 },
    ],
  },
  memory: {
    name: '记忆遗嘱', res: 'ash',
    nodes: [
      { id: 'm_xp', name: '不忘之烬', desc: '经验获取+{v}%', maxRank: 5, per: 3, stat: 'xp', v: 0.03, cost: r => 80 + r * 110 },
      { id: 'm_pickup', name: '亡者的手更长', desc: '拾取范围+{v}%', maxRank: 5, per: 8, stat: 'pickup', v: 0.08, cost: r => 60 + r * 90 },
      { id: 'm_luck', name: '错误的祝福', desc: '幸运+{v}%', maxRank: 5, per: 4, stat: 'luck', v: 0.04, cost: r => 90 + r * 130 },
      { id: 'm_reroll', name: '重掷骨骰', desc: '每局重掷次数+1', maxRank: 3, stat: 'rerolls', v: 1, flat: true, cost: r => 250 + r * 250 },
      { id: 'm_banish', name: '放逐之名', desc: '每局放逐次数+1', maxRank: 2, stat: 'banishes', v: 1, flat: true, cost: r => 300 + r * 300, needPollen: 3 },
      { id: 'm_bless', name: '初始赐福', desc: '开局选择一项赐福', maxRank: 1, stat: 'startBless', v: 1, flat: true, cost: () => 500 },
    ],
  },
  fallen: {
    name: '堕翼遗嘱', res: 'bone',
    nodes: [
      { id: 'd_shield', name: '异议者之盾', desc: '堕翼审判中获得{v}点独立护盾', maxRank: 3, per: 30, stat: 'tribunalShield', v: 30, flat: true, cost: r => 3 + r * 4 },
      { id: 'd_time', name: '拖延的判决', desc: '审判时间+{v}秒', maxRank: 3, per: 5, stat: 'tribunalTime', v: 5, flat: true, cost: r => 4 + r * 5 },
      { id: 'd_revive', name: '地狱的脐带', desc: '地狱复活生命{v}%', maxRank: 5, per: 5, stat: 'hellReviveHp', v: 0.05, flat: true, cost: r => 3 + r * 3 },
      { id: 'd_freeup', name: '铁花的贿赂', desc: '地狱入口提供一次免费神器升级', maxRank: 1, stat: 'hellFreeUp', v: 1, flat: true, cost: () => 15 },
      { id: 'd_hrevive', name: '保留的心跳', desc: '真天堂中保留一次普通复活', maxRank: 1, stat: 'heavenRevive', v: 1, flat: true, cost: () => 25, needEye: 1 },
    ],
  },
};
export const ALL_NODES = Object.values(TREES).flatMap(t => t.nodes.map(n => ({ ...n, tree: t.name, res: t.res })));
export const NODE_BY_ID = Object.fromEntries(ALL_NODES.map(n => [n.id, n]));
