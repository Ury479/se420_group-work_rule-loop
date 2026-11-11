---
title: RuleLoop 消费价值换算与冲动拦截开发规格
version: 1.0
date_created: 2026-07-29
last_updated: 2026-07-29
owner: RuleLoop
status: Draft
tags: [design, product, conversion, finance, local-first, privacy]
---

# Introduction

本规格定义 RuleLoop“消费价值换算与冲动拦截”功能的业务规则、数据模型、服务端接口、隐私约束、验收标准和测试策略。该功能将计划中或已经发生的消费金额转换为用户自定义价值目录中的等值数量，并把冷静期与最终结果接入现有“事件 → 复盘 → 规则 → 验证”闭环。

本规格以 [`docs/PRD-CONSUMPTION-CONVERTER.md`](../docs/PRD-CONSUMPTION-CONVERTER.md) 为产品背景，但自身包含实施所需的规范性要求。

## 1. Purpose & Scope

### 1.1 Purpose

- 提供确定性、可复现的金额换算；
- 在付款前提供冷静期；
- 记录最终消费结果与真实资金转向；
- 将结果映射为 RuleLoop 事件和规则验证；
- 对敏感类别实施本地优先和最小披露。

### 1.2 In Scope

- `CNY` 与 `USD` 金额；
- 固定或用户编辑的汇率；
- 月订阅、充值包、一次性单位和价格区间；
- 目录项管理；
- 换算快照；
- 冷静期；
- 最终结果；
- 保护金额和实际转向金额；
- 与 `events`、`rules`、`validations` 的关联；
- 响应式 Web 界面；
- 本地 SQLite 持久化。

### 1.3 Out of Scope

- 实时支付、自动转账和自动购买；
- 银行卡或支付平台账户连接；
- 色情服务信息检索、商家推荐或价格比较；
- 实时汇率和套餐价格抓取；
- 医疗或心理诊断；
- 多用户权限模型；
- 云同步和跨设备提醒。

### 1.4 Assumptions

- P0 为单用户本地应用；
- 所有预置价格均来自用户输入，不保证为供应商当前官方价格；
- P0 默认汇率为 `USD/CNY = 7.00`；
- 金额计算使用整数分币，禁止用 JavaScript 浮点数直接累计货币；
- Next.js 实施前必须读取仓库中 `node_modules/next/dist/docs/` 的相关 Next.js 16 文档。

## 2. Definitions

| Term | Definition |
|---|---|
| Planned Amount | 用户在付款前考虑消费的金额 |
| Actual Amount | 冷静期结束后实际消费的金额 |
| Protected Amount | 计划金额减去实际金额后大于等于零的部分 |
| Redirected Amount | 用户明确确认已经转入目标预算的金额 |
| Catalog Item | 用于机会成本比较的订阅、充值包、餐食或其他单位 |
| Price Snapshot | 换算发生时保存的目录价格、币种和汇率副本 |
| Conversion | 一次金额输入和确定性换算结果 |
| Cooldown | 用户作出最终决定前的等待时段 |
| Sensitive Label | 仅在详情中按用户偏好显示的私密类别名称 |
| Minor Unit | 货币最小单位；人民币和美元均以分为整数存储 |
| CNY Basis | 将输入和目录价格统一换算为人民币分后的计算基准 |

## 3. Requirements, Constraints & Guidelines

### 3.1 Functional Requirements

- **REQ-001**: 系统必须允许用户输入大于 0、最多两位小数的金额。
- **REQ-002**: 系统必须要求用户选择 `considering` 或 `spent`。
- **REQ-003**: 系统必须支持 `CNY` 和 `USD`，数据枚举应允许未来增加 `THB`。
- **REQ-004**: 系统必须允许用户从启用的目录项中选择 1–5 个比较锚点。
- **REQ-005**: 系统必须按本规格公式生成单项等值结果。
- **REQ-006**: 系统必须保存输入金额、汇率、目录价格和计算结果快照。
- **REQ-007**: 历史换算不得因目录价格或默认汇率更新而变化。
- **REQ-008**: `considering` 换算必须允许创建冷静期。
- **REQ-009**: `spent` 换算不得创建“已经保护”的金额。
- **REQ-010**: 冷静期结束后必须支持 `avoided`、`partial`、`spent`、`unknown`。
- **REQ-011**: `partial` 必须包含实际消费金额。
- **REQ-012**: 系统必须分别计算和展示 `protectedAmount` 与 `redirectedAmount`。
- **REQ-013**: `redirectedAmount` 必须由用户明确输入或确认，不得由系统自动推断。
- **REQ-014**: 系统必须允许换算关联一个 RuleLoop 事件。
- **REQ-015**: 系统必须允许最终结果关联一个规则验证。
- **REQ-016**: 达到高影响门槛的 `spent` 记录必须可进入待复盘流程。
- **REQ-017**: 系统必须允许创建、编辑、停用和重新启用目录项。
- **REQ-018**: 系统必须保留目录项的计费语义，不得把订阅月数、充值包和餐食顿数混为同一计量单位。
- **REQ-019**: 系统必须提供删除换算记录的受控确认。
- **REQ-020**: 删除前必须说明关联事件和验证是否保留、解除关联或被阻止删除。

### 3.2 Calculation Requirements

- **CAL-001**: 所有金额必须以整数 minor unit 存储和计算。
- **CAL-002**: 汇率必须存为十进制定点字符串，例如 `"7.000000"`。
- **CAL-003**: 输入金额人民币基准值：

```text
inputCnyMinor = round(inputMinor × inputToCnyRate)
```

- **CAL-004**: 目录项人民币基准价格：

```text
itemCnyMinor = round(itemPriceMinor × itemToCnyRate)
```

- **CAL-005**: 固定价格等值：

```text
quantity = inputCnyMinor / itemCnyMinor
wholeUnits = floor(quantity)
remainderCnyMinor = inputCnyMinor - wholeUnits × itemCnyMinor
```

- **CAL-006**: 区间价格等值：

```text
minimumWholeUnits = floor(inputCnyMinor / maximumItemCnyMinor)
maximumWholeUnits = floor(inputCnyMinor / minimumItemCnyMinor)
```

- **CAL-007**: API/Server Action 响应中的 `quantity` 必须是十进制字符串，禁止使用二进制浮点数作为持久化真值。
- **CAL-008**: UI 中订阅数量显示 1 位小数，包数显示 2 位小数，范围显示整数；显示精度不得反向写入存储值。
- **CAL-009**: `protectedAmountMinor` 的计算必须满足：

```text
avoided => plannedAmountMinor
partial => max(plannedAmountMinor - actualAmountMinor, 0)
spent   => 0
unknown => 0
```

- **CAL-010**: `redirectedAmountMinor` 必须满足 `0 <= redirected <= protected`。

### 3.3 Privacy & Security Requirements

- **SEC-001**: P0 数据必须只保存在本地 SQLite。
- **SEC-002**: P0 不得把金额、敏感类别、备注或换算结果发送给第三方。
- **SEC-003**: 应用日志不得输出金额、敏感别名、备注正文或完整换算快照。
- **SEC-004**: 首页、导航、浏览器标题和未来系统通知必须默认使用中性类别名称。
- **SEC-005**: 导出必须由用户主动触发，并在导出前提示包含敏感财务数据。
- **SEC-006**: Server Action 必须校验所有金额、枚举、外键和时间值；不得信任客户端派生金额。
- **SEC-007**: `protectedAmount` 和所有等值结果必须在服务端重新计算。
- **SEC-008**: 删除目录项不得级联删除历史快照。
- **SEC-009**: 删除换算时不得隐式删除已完成复盘或已存在的规则。
- **SEC-010**: 敏感类别的自由文本长度不得超过 40 字，备注不得超过 500 字。

### 3.4 UX & Accessibility Requirements

- **UXR-001**: 用户必须能在 30 秒内完成金额输入到结果展示。
- **UXR-002**: 每个页面最多一个主行动。
- **UXR-003**: 结果页默认只突出 3 个比较锚点。
- **UXR-004**: 冷静期按钮的视觉权重必须高于任何外部购买或目录编辑入口。
- **UXR-005**: 系统不得使用羞辱、道德评判、奖励连胜或损失厌恶操纵文案。
- **UXR-006**: 所有状态必须同时用文本和图形表达，不能只依赖颜色。
- **UXR-007**: 可交互区域最小尺寸为 44×44 CSS px。
- **UXR-008**: 所有字段必须有持久可见标签。
- **UXR-009**: 必须支持键盘操作和可见焦点。
- **UXR-010**: `prefers-reduced-motion` 下必须停用数字递增与 Loop Spine 绘制动画。
- **UXR-011**: 页面必须在 375、768、1024、1440px 宽度下无水平溢出。
- **UXR-012**: 数字的辅助技术文本必须包含币种、数量和单位。

### 3.5 Constraints & Guidelines

- **CON-001**: P0 不使用实时汇率或价格 API。
- **CON-002**: P0 不增加底部导航项。
- **CON-003**: P0 不实现系统级敏感通知。
- **CON-004**: 本功能不得建立新的“档案”事实表；档案数据必须派生查询。
- **CON-005**: 本功能的附属表不得改变现有事件、复盘、规则、验证作为核心事实链的地位。
- **GUD-001**: 视觉必须继承 `design-system/MASTER.md` 的 Decision Trace。
- **GUD-002**: 使用现有设计令牌和系统字体，不添加 `latest` CDN 依赖。
- **GUD-003**: 价格目录使用紧凑结构化列表，不复制第三方订阅页的营销卡片。
- **GUD-004**: 历史记录首先显示决定与证据，其次显示比较详情。
- **GUD-005**: 避免使用“省了”“赚了”，优先使用“保护金额”“实际转向”。

## 4. Interfaces & Data Contracts

### 4.1 Route Contract

| Route | Render Type | Responsibility |
|---|---|---|
| `/convert` | Server Component + small client form | 输入金额与选择比较锚点 |
| `/convert/[id]` | Server Component | 查看快照、冷静期和最终结果 |
| `/convert/[id]/resolve` | focused form | 记录最终结果与资金转向 |
| `/events/[id]` | existing route extension | 显示关联财务影响和换算 |
| `/archive` | derived query extension | 展示保护金额与实际转向 |

页面可在实施时合并 `/convert/[id]/resolve` 为详情内的 Client Component，但数据动作和验收语义不得改变。

### 4.2 Data Model

本功能新增 3 张附属表。它们扩展核心闭环，不替代 `events`、`reviews`、`rules`、`validations`。

#### `value_catalog_items`

| Field | Type | Constraints |
|---|---|---|
| `id` | text | UUID primary key |
| `userId` | text | required, default current P0 user |
| `name` | text | required, 1–80 chars |
| `billingType` | text | `subscription/credit_pack/single_unit/range_unit` |
| `currency` | text | `CNY/USD/THB` |
| `priceMinor` | integer | required for fixed price, > 0 |
| `maxPriceMinor` | integer | required only for range, >= `priceMinor` |
| `unitLabel` | text | e.g. `月/包/顿/份` |
| `sourceType` | text | `user_entered/manual_verified` |
| `sourceNote` | text | optional, <= 200 chars |
| `isEnabled` | integer | 0/1 |
| `sortOrder` | integer | >= 0 |
| `createdAt` | text | ISO 8601 |
| `updatedAt` | text | ISO 8601 |

Indexes:

- `(userId, isEnabled, sortOrder)`
- `(userId, name)`

#### `spend_conversions`

| Field | Type | Constraints |
|---|---|---|
| `id` | text | UUID primary key |
| `userId` | text | required |
| `eventId` | text | nullable FK to `events.id` |
| `ruleId` | text | nullable FK to `rules.id` |
| `validationId` | text | nullable FK to `validations.id` |
| `decisionStage` | text | `considering/spent` |
| `privacyLabel` | text | neutral display label, required |
| `sensitiveLabel` | text | nullable, <= 40 chars |
| `inputCurrency` | text | `CNY/USD/THB` |
| `plannedAmountMinor` | integer | > 0 |
| `inputToCnyRate` | text | decimal string > 0 |
| `snapshotJson` | text | validated JSON, immutable after creation |
| `cooldownEndsAt` | text | nullable ISO 8601 |
| `minimumAction` | text | nullable, <= 200 chars |
| `resolution` | text | nullable `avoided/partial/spent/unknown` |
| `actualAmountMinor` | integer | nullable, >= 0 |
| `protectedAmountMinor` | integer | required, server-derived, default 0 |
| `redirectedAmountMinor` | integer | required, default 0 |
| `redirectTarget` | text | nullable, <= 80 chars |
| `resolvedAt` | text | nullable ISO 8601 |
| `createdAt` | text | ISO 8601 |
| `updatedAt` | text | ISO 8601 |

Indexes:

- `(userId, createdAt)`
- `(userId, resolution, resolvedAt)`
- `(eventId)`
- `(ruleId)`

#### `conversion_preferences`

One row per P0 user.

| Field | Type | Constraints |
|---|---|---|
| `userId` | text | primary key |
| `usdToCnyRate` | text | decimal string, default `"7.000000"` |
| `defaultCooldownMinutes` | integer | default 120 |
| `highImpactThresholdMinor` | integer | default 100000 CNY minor units |
| `defaultCatalogItemIdsJson` | text | JSON array, max 5 active item IDs |
| `privacyMode` | text | `neutral/explicit`, default `neutral` |
| `updatedAt` | text | ISO 8601 |

#### Snapshot JSON Schema

```json
{
  "schemaVersion": 1,
  "calculatedAt": "2026-07-29T10:00:00.000Z",
  "input": {
    "currency": "CNY",
    "amountMinor": 800000,
    "toCnyRate": "1.000000",
    "cnyAmountMinor": 800000
  },
  "items": [
    {
      "catalogItemId": "cursor-pro",
      "name": "Cursor Pro",
      "billingType": "subscription",
      "currency": "USD",
      "priceMinor": 2000,
      "maxPriceMinor": null,
      "unitLabel": "月",
      "toCnyRate": "7.000000",
      "cnyPriceMinor": 14000,
      "quantity": "57.142857",
      "wholeUnits": 57,
      "remainderCnyMinor": 2000
    }
  ]
}
```

`snapshotJson` 写入后不可更新。目录显示名或价格变化不影响快照。

### 4.3 Domain Types

```ts
type CurrencyCode = "CNY" | "USD" | "THB";
type BillingType =
  | "subscription"
  | "credit_pack"
  | "single_unit"
  | "range_unit";
type DecisionStage = "considering" | "spent";
type Resolution = "avoided" | "partial" | "spent" | "unknown";

type MoneyInput = {
  currency: CurrencyCode;
  amountMinor: number;
};

type ResolveConversionInput = {
  conversionId: string;
  resolution: Resolution;
  actualAmountMinor?: number;
  redirectedAmountMinor?: number;
  redirectTarget?: string;
};
```

TypeScript 类型仅说明契约。实施必须使用运行时验证。

### 4.4 Server Actions

#### `createSpendConversion`

Input:

```ts
{
  decisionStage: "considering" | "spent";
  inputCurrency: "CNY" | "USD";
  plannedAmountMinor: number;
  catalogItemIds: string[];
  privacyLabel: string;
  sensitiveLabel?: string;
  eventId?: string;
}
```

Behavior:

1. 验证输入；
2. 读取用户汇率和启用目录项；
3. 在服务端计算快照；
4. 创建或关联事件；
5. 保存 conversion；
6. 返回 ID 和展示所需结果。

#### `startConversionCooldown`

Input:

```ts
{
  conversionId: string;
  durationMinutes: number;
  minimumAction: string;
}
```

Constraints:

- conversion 必须为 `considering`；
- duration 必须为 1–10,080 分钟；
- 已结束或已解决的记录不得重置，除非创建新的冷静期记录版本。

#### `resolveSpendConversion`

Input uses `ResolveConversionInput`.

Behavior:

1. 服务端读取 planned amount；
2. 校验 resolution 与 actual amount；
3. 服务端计算 protected amount；
4. 校验 redirected amount；
5. 写入结果；
6. 若有关联 rule，创建 validation；
7. 返回派生摘要。

#### `upsertCatalogItem`

- 新建或更新目录项；
- 更新不得修改历史快照；
- range 类型必须同时验证最小和最大价格。

#### `deleteSpendConversion`

- 默认仅删除 conversion 并解除关联；
- 若关联 validation，必须阻止直接删除并要求先处理证据；
- 不得自动删除 event、review 或 rule。

### 4.5 Action Result

所有动作沿用统一结果封装：

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code:
          | "VALIDATION_ERROR"
          | "NOT_FOUND"
          | "CONFLICT"
          | "PRIVACY_CONSTRAINT"
          | "INTERNAL_ERROR";
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

错误消息不得回显敏感别名或备注。

### 4.6 Derived Queries

```text
protectedTotal =
  SUM(spend_conversions.protectedAmountMinor)

redirectedTotal =
  SUM(spend_conversions.redirectedAmountMinor)

cooldownCompletionRate =
  resolvedConsideringConversions / consideringConversionsWithCooldown
```

查询必须按 `userId` 限定。即使 P0 只有一个用户，也不得省略该约束。

## 5. Acceptance Criteria

- **AC-001**: Given 用户输入 `CNY 8000` 且汇率为 7.00, When 选择 Cursor Pro `USD 20/月`, Then 系统显示原始数量 `57.142857...` 的格式化结果 `57.1 个月`、`完整 57 个月`和余额 `¥20`。
- **AC-002**: Given 用户输入 `CNY 8000`, When 选择餐食 `CNY 40–60/顿`, Then 系统显示 `133–200 顿`。
- **AC-003**: Given 用户完成一次换算, When 后续修改 Cursor 价格, Then 历史换算结果保持不变。
- **AC-004**: Given decision stage 为 `spent`, When 保存记录, Then `protectedAmountMinor` 必须为 0。
- **AC-005**: Given planned amount 为 `¥2,000` 且 resolution 为 `partial`、actual 为 `¥500`, When 提交, Then protected amount 为 `¥1,500`。
- **AC-006**: Given protected amount 为 `¥1,500`, When redirected amount 为 `¥1,600`, Then 服务端拒绝并返回字段错误。
- **AC-007**: Given conversion 为 `considering`, When 用户启动 120 分钟冷静期, Then详情页显示确定的结束时间，刷新后不丢失。
- **AC-008**: Given conversion 已解决, When 用户再次提交不同结果, Then 系统返回 `CONFLICT`，除非未来规格明确定义修订流程。
- **AC-009**: Given 用户启用 neutral privacy mode, When 首页显示最近记录, Then 不出现 sensitive label。
- **AC-010**: Given 用户导出数据, When 导出前确认, Then导出包含价格和汇率快照，并明确标识敏感字段。
- **AC-011**: Given 目录项被停用, When 查看历史记录, Then快照仍可完整渲染。
- **AC-012**: Given 用户选择 6 个比较项, When 提交, Then服务端拒绝并说明最多 5 个。
- **AC-013**: Given 输入金额为 0、负数或超过两位小数, When 提交, Then表单显示具体修正提示且不写数据库。
- **AC-014**: Given 已有关联验证, When 删除 conversion, Then系统阻止无提示删除。
- **AC-015**: Given 用户完成 `avoided` 结果且关联一条规则, When结果写入, Then创建一条可追溯 validation。
- **AC-016**: Given `spent` 金额超过高影响阈值, When保存, Then事件状态进入待复盘或提示用户开始复盘。
- **AC-017**: Given JavaScript 客户端篡改 protected amount, When提交, Then服务端忽略客户端派生值并重新计算。
- **AC-018**: Given reduced motion 已开启, When结果页加载, Then数字和轨迹直接显示最终状态。
- **AC-019**: Given 375px 视口, When打开输入、结果和解决页, Then不存在水平滚动且主行动可见。
- **AC-020**: Given 调试日志开启, When创建私密换算, Then日志不包含金额、sensitive label 或备注正文。

## 6. Test Automation Strategy

### 6.1 Test Levels

| Level | Coverage |
|---|---|
| Unit | 金额解析、定点汇率、固定价格、区间价格、余额、保护金额、格式化 |
| Domain Integration | 目录快照、冷静期状态机、解决冲突、规则验证映射 |
| Database Integration | 外键、索引、不可变快照、停用目录项后的历史读取 |
| Component | 表单校验、隐私显示、错误状态、键盘和屏幕阅读器标签 |
| End-to-End | 付款前、事后、部分消费、目录更新、删除受阻五条主流程 |

### 6.2 Required Frameworks

- Vitest；
- React Testing Library；
- Playwright；
- 本地临时 SQLite/libSQL 数据库。

如仓库尚未安装这些依赖，应在实施任务中固定兼容版本并提交 lockfile，不使用 `latest` CDN。

### 6.3 Required Unit Cases

- CNY → CNY；
- USD → CNY；
- 输入和目录均为 USD；
- 大额和最小合法金额；
- 除不尽数量；
- 区间最小/最大相同；
- 目录最大价格小于最小价格；
- partial actual 大于 planned；
- redirected 大于 protected；
- 历史快照 schemaVersion 兼容。

### 6.4 Coverage

- 换算和保护金额 domain module：分支覆盖率 ≥ 95%；
- Server Action validation：分支覆盖率 ≥ 90%；
- UI 总体不以单一覆盖率作为发布条件，但所有 AC 必须可追踪到自动或人工测试。

### 6.5 CI Validation

```text
npm run lint
npx tsc --noEmit
npm test
npx playwright test
npm run build
```

### 6.6 Visual Acceptance

- 视口：375×812、768×1024、1024×768、1440×900；
- 无横向溢出；
- 一个主行动；
- 结果默认最多 3 个高权重锚点；
- 隐私模式截图不出现敏感类别；
- 对照 `design-system/MASTER.md` 和 `docs/design/FIDELITY_REVIEW.md` 做人工评审。

## 7. Rationale & Context

### 7.1 Why Conversion Is a Pause Tool

金额换算的价值不是证明某类消费“错误”，而是将延迟价值带回当前决策。把换算器的主行动设计为冷静期，能避免产品从“冲动拦截”滑向“AI 套餐导购”。

### 7.2 Why Snapshots Are Immutable

价格和汇率会变化。如果历史记录引用当前目录，旧记录会发生无声变化，无法用于复盘和验证。因此每次换算保存完整快照。

### 7.3 Why Protected and Redirected Are Separate

没有消费只表示支出未发生，不表示资金已经被储蓄或投入目标。只有用户确认的真实资金动作才算实际转向。

### 7.4 Why Supporting Tables Are Acceptable

`events/reviews/rules/validations` 仍是 RuleLoop 的行为闭环。目录和换算是领域输入与证据附件，不建立第二套复盘系统，也不新增 archives 表。

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: 无。P0 不依赖外部系统。

### Third-Party Services

- **SVC-001**: 无。P0 不调用价格、汇率、支付或 AI 服务。

### Infrastructure Dependencies

- **INF-001**: 本地 SQLite/libSQL，支持事务、外键和索引。

### Data Dependencies

- **DAT-001**: 用户维护的价值目录。
- **DAT-002**: 用户维护或确认的汇率。
- **DAT-003**: 现有 RuleLoop 事件、规则和验证数据。

### Technology Platform Dependencies

- **PLT-001**: Next.js 16.2 App Router。
- **PLT-002**: React 19.2 与 TypeScript 5。
- **PLT-003**: Drizzle ORM 0.45 和本地 libSQL。
- **PLT-004**: Tailwind CSS 4 CSS-first。

### Compliance Dependencies

- **COM-001**: P0 作为个人本地工具，不宣称提供专业财务、医疗或心理建议。
- **COM-002**: 若未来引入云同步或支付数据，必须先完成隐私声明、数据删除与威胁模型。

## 9. Examples & Edge Cases

### 9.1 `¥8,000` Fixed Subscription

```text
input = 800000 CNY minor
Cursor = 2000 USD minor
USD/CNY = 7.000000
Cursor CNY price = 14000 minor
quantity = 57.142857
whole months = 57
remainder = 2000 minor = ¥20
```

### 9.2 Price Range

```text
input = ¥8,000
meal range = ¥40–¥60
minimum = floor(8000 / 60) = 133
maximum = floor(8000 / 40) = 200
display = 133–200 顿
```

### 9.3 Partial Consumption

```text
planned = ¥2,000
actual = ¥500
protected = ¥1,500
redirected = ¥500
unredirected protected amount = ¥1,000
```

### 9.4 Edge Cases

- 目录价格为 0：拒绝保存；
- 汇率为 0 或负数：拒绝保存；
- 用户跨时区：冷静期存 UTC，按本地时区显示；
- 应用在冷静期结束时未运行：下次打开按 `cooldownEndsAt` 判定已到期；
- 目录项改名：历史显示快照名称，新换算显示新名称；
- 目录项删除：优先软停用；若硬删除，历史仍由快照渲染；
- actual 大于 planned：允许作为“超额消费”事实，但 protected 为 0，并显示超额金额；P0 表单必须二次确认；
- 输入币种与目录币种相同：仍通过 CNY basis 计算，保证统一路径；
- 汇率小数导致半分：采用 round-half-up 并记录规范；
- `unknown`：protected 和 redirected 均为 0，可稍后解决但不能生成验证结论。

## 10. Validation Criteria

实施完成必须同时满足：

1. AC-001 至 AC-020 全部通过；
2. 迁移可在空数据库和现有数据库执行；
3. seed 可重复执行且不产生重复目录项；
4. 历史快照不可变测试通过；
5. 日志脱敏测试通过；
6. 375–1440px 视觉验收通过；
7. 键盘与屏幕阅读器基础检查通过；
8. `lint`、TypeScript、unit、integration、E2E、build 全部通过；
9. 设计评审确认无羞辱性、诱导性或敏感暴露文案；
10. P0 无外部网络请求。

## 11. Related Specifications / Further Reading

- [`docs/PRD-CONSUMPTION-CONVERTER.md`](../docs/PRD-CONSUMPTION-CONVERTER.md)
- [`docs/FEATURE.md`](../docs/FEATURE.md)
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- [`docs/ROADMAP.md`](../docs/ROADMAP.md)
- [`design-system/MASTER.md`](../design-system/MASTER.md)
- [`docs/design/FIDELITY_REVIEW.md`](../docs/design/FIDELITY_REVIEW.md)
