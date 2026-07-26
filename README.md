# 逆圣：黑日遗嘱
**ANATHEMA — TESTAMENT OF THE BLACK SUN**

> 死亡不是结算界面。死亡是通往下一层世界的门。

暗黑哥特风 Roguelite 割草游戏（Survivor-like）。竖屏移动端优先，网页与安卓双端。
全部美术（微像素精灵、程序化场景、图标、启动图）、音乐（WebAudio 生成式配乐）、音效与剧情文本均为程序化原创生成，无任何外部素材。

## 玩法概要

- **强制死亡叙事**：21:00 终末钟声响起，死神「终末书记官·菲纳里斯」降临处决。死亡后可接受遗忘结算，或挑战堕翼审判者·拉赫希尔——胜者从地狱复活，杀入假天堂与真天堂。
- **完整朝圣路线**：灰葬原野 → 腐香大教堂 → 七钟沉城 → 终末白廊 → 堕翼审判庭 → 地狱铁花园 → 假天堂（顺从值机制）→ 真天堂 → 天外尸海（无尽）。
- **内容规模**：10 可操作角色（各带专属罪技）· 16 武器 · 16 催化物 · 16 神器融合 · 6 创世禁器 · 24 局内遗物 · 8 区域 Boss · 40+ 敌人 · 5 结局 · 4 难度 + 罪印 + 无尽腐化词缀 · 章节狩猎 / 每日罪印模式 · 70 份告解收集。
- **局外成长**：无灯旅店 6 位 NPC，四条遗嘱成长树（肉身 / 兵器 / 记忆 / 堕翼），五种局外资源。
- **五系状态**：流血 / 灼烧 / 腐烂 / 罪印 / 恐惧，含沸血、亵渎绽放、公开处刑、血魂四种联动。

## 操作

| 平台 | 移动 | 闪避 | 罪技 | 暂停 |
|---|---|---|---|---|
| 手机 | 左侧虚拟摇杆 | 右下小按钮 | 右下大按钮 | 右上 |
| 桌面 | WASD / 方向键 | 空格 / Shift | Q / E | ESC / P |

闪避拥有 0.22 秒无敌。全部武器自动攻击。

## 运行 Web 版

```bash
npm install
npm run build          # 打包到 dist/
node server.mjs 8080 dist
# 打开 http://localhost:8080
```

或直接用浏览器打开 `dist/anathema-standalone.html`（完全单文件，无需服务器）。

开发模式（不打包，直接 ES Modules）：`node server.mjs 8080 .` 后访问根目录。

## 构建安卓 APK

需要 JDK 17+、Android SDK（platforms;android-36、build-tools）：

```bash
npm run build
npx cap sync android
cd android
ANDROID_HOME=<sdk路径> gradle assembleRelease
# 产物：android/app/build/outputs/apk/release/app-release.apk（已配置签名）
```

发布密钥：`android/anathema-release.keystore`（alias `anathema`；**上架前请替换为自己的私有密钥并勿公开仓库中的密钥**）。

## 测试

```bash
node test/smoke.mjs        # 冒烟测试
node test/fullrun.mjs      # 全流程朝圣（死神→审判→地狱→双天堂→结局）
node test/weapons.mjs      # 16武器+16神器+6禁器+10罪技逐项验证
node test/scenarios.mjs    # Boss机制/结局分支/无尽模式
node test/make-icons.mjs   # 重新生成应用图标与启动图
```

测试使用 Playwright（预装 Chromium）驱动真实浏览器运行。

## 工程结构

```
src/
├── main.js            入口与主循环
├── engine.js          画布/相机/震屏/慢动作
├── input.js           摇杆+按钮+键盘
├── audio.js           程序化SFX + 分区生成式音乐
├── core/util.js       数学/RNG/空间哈希
├── art/               程序化像素精灵 / 场景纹理 / 矢量图标
├── data/              武器·敌人·角色·遗物·数值·剧情等数据
├── run/               局内系统（战斗/生成/Boss/流程/渲染/罪技）
├── ui/                DOM界面（旅店/升级卡/结算/图鉴/设置）
└── meta/save.js       localStorage 局外存档
```

## 设计文档符合性（验收红线）

1. ✅ 武器满级+催化物 → Boss宝箱必出神器（保底优先级最高）
2. ✅ 第三局综合战力约首局140%（局外保底 + 可见教学赐福，不做暗改）
3. ✅ 每件武器拥有独立攻击逻辑、独立神器形态与融合演出
4. ✅ 满槽后不再提供无法融合的催化物
5. ✅ 死神处决有0.8秒明确演出与"999,999,999 终审伤害"，明示为世界规则
6. ✅ 假天堂第一印象明亮祥和（明亮草甸+圆润UI皮肤+温柔NPC），随顺从值渐变异常
7. ✅ 真天堂为黑色器官圣堂（呼吸墙壁/神经星图），非红色恶魔城
8. ✅ 创世禁器接管规则级演出（0.35秒慢动作），不遮挡Boss危险技
9. ✅ 简化特效模式保留形状/范围/关键反馈
10. ✅ 无障碍：震动/闪光强度、伤害数字开关与合并、色弱符号、自动拾取、左右手互换
