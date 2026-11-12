# ARCHITECTURE.md — RuleLoop 技术架构

> 版本：v0.2  
> 日期：2026-07-21  
> 适用范围：个人单用户 P0  
> 架构目标：用最少的持久化实体完成“事件→复盘→规则→验证”闭环

---

## 一、架构结论

### 1.1 技术基线

以仓库实际依赖为准，不再沿用旧文档中的 Next.js 15 和 Tailwind 3：

| 层 | 选择 | 说明 |
|---|---|---|
| Web 框架 | Next.js 16.2 App Router | 页面默认 Server Component |
| UI | React 19.2 + TypeScript 5 | Client Component 仅用于交互边界 |
| 样式 | Tailwind CSS 4 CSS-first | 设计令牌集中在 `globals.css` |
| 数据库 | 本地 SQLite/libSQL | P0 单用户、本地优先 |
| ORM | Drizzle ORM 0.45 | 明确 schema、查询和迁移 |
| 写操作 | Server Actions | 内部表单不额外构建 REST 层 |
| 图标 | Lucide React | 禁止用 emoji 代替功能图标 |
| 测试 | Vitest + Testing Library + Playwright | 当前尚未安装，列入实施计划 |
| 包管理 | npm | 与现有 lockfile 保持一致 |

### 1.2 核心架构决策

1. **4 张核心表，不建立 archives 表**：档案是查询视图，不是新的事实来源。
2. **业务规则集中管理**：规则准入、重复规则匹配和效果计算不能散落在页面组件中。
3. **读在服务端，写走 Server Actions**：避免整页 Client Component 和不必要的前端数据缓存层。
4. **本地优先不等于浏览器离线**：P0 运行于本地 Node + SQLite；完整 PWA 离线写入延后。
5. **先保证可追溯，再做统计**：事件、复盘、规则和验证之间必须能互相导航。

---

## 二、当前实现与目标差距

### 2.1 当前仓库

- 已有 7 个页面路由，其中 `/review/[id]` 仅为占位页；
- 页面大多标记为 `'use client'`，数据来自常量 Mock；
- 已定义 `events`、`reviews`、`rules`、`validations`、`archives` 五张表；
- 尚无数据库客户端、迁移、seed、Server Actions 或 API Route；
- 已有基础设计系统、五张 Excalidraw 线框和共享 Header/BottomNav；
- 现有页面可通过 ESLint，无阻断错误。

### 2.2 P0 目标

- 8 个路由页面全部连接真实本地数据；
- `archives` 从持久化表移除，改为派生查询；
- 实现事件准入、复盘、关联/创建规则和验证事务；
- 表单具备草稿恢复、验证错误和写入反馈；
- 首页与档案展示真实计算结果，不保存重复计数快照。

---

## 三、系统上下文

```text
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 应用                       │
│                                                         │
│  Server Components ──读取──┐                            │
│                             ▼                            │
│  Client Form ──调用──> Server Actions ──> Domain Service │
│                                               │         │
│                                               ▼         │
│                                      Drizzle Repository │
│                                               │         │
└───────────────────────────────────────────────┼─────────┘
                                                ▼
                                      本地 SQLite 文件
```

P0 不包含第三方分析、云端数据库、邮件认证或远程同步。

---

## 四、页面与路由架构

### 4.1 路由树

```text
src/app/
├── layout.tsx
├── page.tsx                         # 首页 /
├── record/
│   └── page.tsx                    # 快速记录 /record
├── events/
│   └── [id]/
│       ├── page.tsx                # 事件详情 /events/[id]
│       └── review/
│           └── page.tsx            # 复盘工作台 /events/[id]/review
├── reviews/
│   └── page.tsx                    # 待复盘 /reviews
├── rules/
│   ├── page.tsx                    # 规则库 /rules
│   └── [id]/
│       └── page.tsx                # 规则详情 /rules/[id]
└── archive/
    └── page.tsx                    # 成长档案 /archive
```

### 4.2 页面组合原则

- `page.tsx` 默认是 Server Component，直接调用查询函数；
- 表单、筛选、切换和验证弹层拆为小型 Client Component；
- 记录和复盘路由使用专注布局，不渲染 BottomNav；
- 列表与详情提供 `loading.tsx`、`error.tsx` 和 `not-found.tsx`；
- 动态路由中的 `params` 按 Next.js 16 约定作为 Promise 读取；
- 页面不通过内部 HTTP 请求自己的 Route Handler，直接调用服务端数据层。

### 4.3 导航

```text
首页    待复盘    ＋记录    规则    档案
```

桌面端使用左侧窄导航和右侧上下文栏；不把 480px 手机界面机械拉宽。

---

## 五、目录组织

```text
src/
├── app/                            # 路由与路由级 UI
│   ├── actions/                    # 跨页面 Server Actions
│   │   ├── events.ts
│   │   ├── reviews.ts
│   │   ├── rules.ts
│   │   └── validations.ts
│   └── ...                         # 8 个页面路由
├── components/
│   ├── navigation/                 # BottomNav、DesktopRail
│   ├── forms/                      # EventForm、ReviewForm、ValidationForm
│   ├── timeline/                   # LoopTrace、EvidenceTimeline
│   └── ui/                         # Button、Field、Chip、EmptyState
├── db/
│   ├── client.ts                   # Drizzle/libSQL 初始化
│   ├── schema.ts                   # 4 张表与索引
│   ├── migrations/                 # SQL 迁移
│   └── seed.ts                     # 可重复执行的示例数据
├── domain/
│   ├── event-policy.ts             # 事件准入规则
│   ├── rule-matcher.ts             # 已有规则候选匹配
│   ├── rule-effectiveness.ts       # 统计和结论
│   └── types.ts                    # 枚举与输入类型
├── data/
│   ├── events.ts                   # 只读查询
│   ├── reviews.ts
│   ├── rules.ts
│   └── archive.ts                  # 派生档案查询
└── lib/
    ├── action-result.ts            # Server Action 结果类型
    ├── validation.ts               # 输入校验
    └── cn.ts
```

共享组件只有在复用或承担稳定语义时才提取。业务规则不放在 `components/`。

---

## 六、数据模型

### 6.1 关系

```text
events 1 ─── 0..1 reviews
   │               │
   │               └── 0..1 source of rules
   │
   └── 0..N validations ─── N..1 rules
```

- 一个事件最多有一份结构化复盘；
- 一份复盘可以不形成规则、关联已有规则或创建一条新规则；
- 一条规则可以关联多次验证；
- 一次验证可以关联触发它的后续事件；
- 档案由上述关系实时查询生成。

### 6.2 `events`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | text | UUID 主键 |
| `title` | text | 必填，5–80 字 |
| `sceneType` | text | 枚举 |
| `impactLevel` | text | `low/medium/high` |
| `isRepeated` | integer | 0/1 |
| `consequence` | text | 可选 |
| `bodyState` | text | JSON 字符串，可选 |
| `occurredAt` | text | ISO 时间 |
| `status` | text | `archived/pending_review/reviewed/rule_linked` |
| `createdAt` | text | ISO 时间 |
| `updatedAt` | text | ISO 时间 |

索引：`status + occurredAt`、`sceneType + occurredAt`。

### 6.3 `reviews`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | text | UUID 主键 |
| `eventId` | text | 外键且唯一 |
| `rootCauseType` | text | `knowledge/execution/emotion/environment` |
| `rootCauseDetail` | text | 必填 |
| `decisionPoint` | text | 必填 |
| `warningSignal` | text | 必填 |
| `minimumAction` | text | 必填 |
| `ruleDecision` | text | `archive_only/link_existing/create_new` |
| `linkedRuleId` | text | 可选外键 |
| `draftData` | text | 草稿 JSON，可选 |
| `completedAt` | text | 可选 |
| `createdAt` | text | ISO 时间 |
| `updatedAt` | text | ISO 时间 |

### 6.4 `rules`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | text | UUID 主键 |
| `sourceReviewId` | text | 可选来源复盘 |
| `title` | text | 必填 |
| `triggerScene` | text | 必填 |
| `riskSignals` | text | 必填 |
| `prohibitedAction` | text | 可选 |
| `recommendedAction` | text | 必填 |
| `minimumAction` | text | 必填 |
| `status` | text | `draft/active/paused/archived` |
| `createdAt` | text | ISO 时间 |
| `updatedAt` | text | ISO 时间 |

不持久化 `hitCount`、`complianceCount` 和百分比，全部从 validations 聚合，避免计数漂移。

### 6.5 `validations`

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | text | UUID 主键 |
| `ruleId` | text | 必填外键 |
| `eventId` | text | 可选外键 |
| `wasRecalled` | integer | 0/1 |
| `wasFollowed` | integer | 0/1 |
| `resultImproved` | integer | 0/1/NULL |
| `note` | text | 可选 |
| `validatedAt` | text | ISO 时间 |

### 6.6 为什么没有 `archives`

档案不是用户输入的独立事实，而是已有事实的组合展示。单独保存快照会引入同步问题：事件或规则修改后，档案内容可能过期。

`getArchiveTimeline()` 通过联合查询生成：

- 普通事件存档；
- 完成的高价值复盘；
- 规则创建和状态变化；
- 验证结果与改善证据。

---

## 七、业务服务

### 7.1 事件准入

```ts
export function qualifiesForRule(input: {
  impactLevel: 'low' | 'medium' | 'high'
  isRepeated: boolean
}) {
  return input.isRepeated || input.impactLevel === 'high'
}
```

该函数在页面上用于即时解释，在 Server Action 中必须重新执行。

### 7.2 规则候选匹配

P0 使用确定性匹配，不引入 AI：

1. 只查询 `active` 和 `paused` 规则；
2. 场景类型完全相同；
3. 风险信号按分词后的关键词交集排序；
4. 返回最多 3 条候选，由用户确认。

匹配结果只用于建议，不能自动建立关联。

### 7.3 规则有效性

```text
triggered = validations.length
recalledRate = recalled / triggered
followedRate = followed / triggered
improvedRate = improved / followed
```

- `triggered < 3` → 待观察；
- `triggered >= 3 && improvedRate >= 0.6` → 有效；
- `triggered >= 3 && improvedRate < 0.6` → 需要调整。

分母为零时返回 `null`，界面显示“暂无数据”。

---

## 八、数据读取与写入

### 8.1 读取

- Server Component 直接调用 `src/data/*` 查询；
- 数据库凭据和查询逻辑不进入客户端 bundle；
- 首页互不依赖的摘要查询用 `Promise.all` 并行启动；
- 列表和详情使用 `loading.tsx` 提供有意义的骨架状态；
- 不为本地数据库数据额外引入 SWR。

### 8.2 写入

内部 CRUD 使用 Server Actions：

- `createEvent`
- `updateEvent`
- `deleteEvent`
- `saveReviewDraft`
- `completeReview`
- `updateRule`
- `changeRuleStatus`
- `createValidation`
- `exportAllData`

每个 Action 必须：

1. 校验输入；
2. 在服务端重新执行业务规则；
3. 使用事务保证跨表一致性；
4. 返回结构化字段错误；
5. 写入成功后 revalidate 对应页面；
6. 需要时在 Action 内完成 redirect。

Server Action 是可直接发起 POST 的服务端入口，不能把“按钮不可见”当成授权或校验手段。

### 8.3 关键事务

#### 完成复盘并创建规则

```text
BEGIN
  更新 review 为 completed
  创建 rule draft
  更新 review.linkedRuleId
  更新 event.status = rule_linked
COMMIT
```

#### 完成复盘并关联已有规则

```text
BEGIN
  更新 review.ruleDecision = link_existing
  更新 review.linkedRuleId
  更新 event.status = rule_linked
COMMIT
```

任何一步失败都回滚，禁止出现“复盘完成但规则来源断裂”。

---

## 九、本地数据与演进路径

### 9.1 P0

- 默认数据库 URL：`file:./data/rule-loop.db`；
- 数据目录加入 `.gitignore`；
- seed 只在显式命令下运行；
- JSON 导出包含 schema 版本、导出时间和 4 类实体；
- 不启用 demo-user 共享数据模式。

### 9.2 云端演进条件

只有出现明确的跨设备需求后才评估云端：

1. 增加真实用户与所有权字段；
2. 引入认证；
3. 将 libSQL URL 切换为 Turso；
4. 重新定义隐私声明；
5. 增加导入、删除账户和数据迁移测试。

不能在没有认证的情况下把固定 `demo-user` 部署到公开云端。

---

## 十、错误、空状态与可访问性

- 字段错误靠近对应输入，同时提供表单级摘要；
- 写入失败保留用户输入，提供重试，不使用模糊的“出错了”；
- 空状态解释为什么为空以及下一步能做什么；
- 删除使用明确对象名称和影响说明；
- 所有按钮有可访问名称和可见焦点；
- 颜色不是状态的唯一表达；
- 尊重 `prefers-reduced-motion`；
- 固定底部操作考虑 `env(safe-area-inset-bottom)`。

---

## 十一、测试策略

### 11.1 单元测试

- 规则准入所有组合；
- 有效性计算的零分母和边界；
- 规则候选匹配排序；
- Action 输入校验。

### 11.2 数据集成测试

- 普通事件不会产生规则；
- 高价值事件进入待复盘；
- 关联已有规则不创建重复记录；
- 创建规则事务保持引用一致；
- 验证聚合与档案时间线正确；
- 删除约束不会产生孤儿记录。

### 11.3 E2E

1. 普通事件 → 存档；
2. 重复事件 → 复盘 → 关联已有规则 → 验证；
3. 高影响事件 → 复盘 → 创建规则 → 启用；
4. 规则累计验证后显示有效性；
5. JSON 导出包含完整数据。

### 11.4 交付门槛

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
npx playwright test
```

---

## 十二、实施顺序

1. 调整 schema 为 4 表并生成迁移；
2. 建立数据库客户端、domain policy 和只读查询层；
3. 完成事件记录、详情与准入；
4. 完成待复盘和复盘事务；
5. 完成规则库、详情和关联逻辑；
6. 完成验证与派生档案；
7. 补齐空/加载/错误状态和数据导出；
8. 添加测试并进行移动端、桌面端验收。
