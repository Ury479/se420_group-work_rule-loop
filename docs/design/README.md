# RuleLoop 前端样式交付

## 当前增量 · 继续上次（2026-11-10）

[原型与评审说明](continue-last/README.md)记录首页新增入口、顶部热力图和两项习惯的管理与打卡流程。此增量以当前账号版首页的业务顺序和导航为底。[功能需求](../PRD-CONTINUE-LAST.md)

> 版本：v0.2 · 2026-07-21  
> 方向：Decision Trace（决策轨迹）

本目录保存从视觉探索到浏览器渲染的设计成果。正式产品页面以 `design-system/MASTER.md` 的令牌和页面规范为准，概念图仅用于探索构图与气质。

## 设计结论

- 核心用户是产品所有者本人，移动端优先、桌面端补充上下文。
- 普通事件只存档；重复发生或高影响事件进入复盘和规则流程。
- 每页只强调一个下一步行动，不用功能卡片大厅或复杂 Dashboard。
- 标志性元素是 Loop Spine：事件圆形 → 决策菱形 → 规则方形 → 验证勾形。
- 冷纸色背景、深墨文字、行动钴蓝、证据青绿和信号琥珀共同表达冷静、诚实和可行动。

## 视觉探索

ImageGen 概念图：

- `concepts/home-mobile.png`：移动端首页与当前闭环
- `concepts/review-mobile.png`：移动端复盘工作台
- `concepts/rule-detail-desktop.png`：桌面端规则详情与证据栏

概念图用于确定视觉语言；最终 HTML 原型校正了其中的渐变按钮、导航差异、日期和统计口径。

## 高保真浏览器渲染

### 移动端 · 390px

1. `renders/01-home-mobile.png`
2. `renders/02-record-mobile.png`
3. `renders/03-event-detail-mobile.png`
4. `renders/04-reviews-mobile.png`
5. `renders/05-review-workbench-mobile.png`
6. `renders/06-rules-mobile.png`
7. `renders/07-rule-detail-mobile.png`
8. `renders/08-archive-mobile.png`

### 桌面端 · 1440px

1. `renders/09-home-desktop.png`
2. `renders/10-review-workbench-desktop.png`
3. `renders/11-rule-detail-desktop.png`

## 可交互原型

入口：`prototype/index.html`

本地预览：

```bash
python3 -m http.server 4173
```

打开 `http://127.0.0.1:4173/docs/design/prototype/index.html` 可浏览全部 11 个视图。单页使用 `?screen=` 参数，例如：

```text
?screen=home
?screen=review
?screen=desktop-rule
```

选择项和规则状态筛选可交互；原型不写入业务数据，不替代 M1 的正式 Next.js 实现。

## 消费价值换算高保真设计

入口：`consumption-converter/index.html`

交付内容：

- 输入、换算结果、冷静期、最终结果、历史详情 5 张移动端详情图；
- 1 张桌面端换算与冷静期详情图；
- 平铺清单、Value Spine、预算台账 3 种结果层级比较；
- `consumption-converter/DESIGN-NOTES.md` 设计说明与开发前验收项；
- `consumption-converter/renders/` 浏览器渲染图。

推荐方向为 **Value Spine**：沿用现有 Loop Spine，将计划金额、机会成本、冷静期、最终结果和验证证据连接成同一条产品轨迹。

单页预览参数：

```text
?view=input
?view=result
?view=cooldown
?view=resolve
?view=detail
?view=desktop
```

## 设计与验收依据

- 全局视觉令牌：`../../design-system/MASTER.md`
- 8 个页面规范：`../../design-system/pages/`
- 需求基线：`../FEATURE.md`
- 视觉一致性审查：`FIDELITY_REVIEW.md`
