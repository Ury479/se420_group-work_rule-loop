# AGENTS.md — 关键动作拦截台(mvp)

个人决策与行为拦截系统:通过结构化确认、复盘与规则沉淀,拦截高风险动作(关键操作失误、物品丢失、高额冲动支出、人际越界、过度执行等)。

## 技术栈

- Next.js 16(App Router,Server Components 优先)+ React 19 + TypeScript
- Tailwind CSS v4(design tokens 定义在 `app/globals.css` 的 `@theme` 中)+ shadcn/ui
- Neon Postgres + Drizzle ORM(`drizzle-orm/node-postgres` + `pg` Pool)
- 包管理器:pnpm
- 语言:全站中文 UI,代码注释使用中文

## 架构约定

### 数据层(必须遵守)

- 单一 `db` 实例:`lib/db/index.ts`,通过 `DATABASE_URL` 连接,**禁止**引入 `@neondatabase/serverless` 或 `@vercel/postgres`
- Schema 唯一来源:`lib/db/schema.ts`(52 张表)。表名/业务列 snake_case,`userId` 列为**驼峰**(`text("userId")`),两者不可混淆
- 界面偏好走 `user_preferences` 表(key-value,如 `nav_order`),读取函数需 try/catch 静默回退,**不得因数据库不可用阻塞布局渲染**
- 无 RLS、无 FK 约束:每条查询必须 `eq(table.userId, userId)` 按用户隔离;当前通过 `lib/user.ts` 的 `getUserId()` 返回 `default-user`(单用户模式,未接入认证)
- **DDL 通过 Neon MCP 执行**(每次一条语句),不用 drizzle-kit 迁移。改 schema.ts 后必须同步在数据库执行对应 DDL,否则运行时报 `Failed query`
- 修改表结构的流程:改 `lib/db/schema.ts` → Neon MCP 执行 DDL → `npx tsc --noEmit` 验证

### Server Actions(`app/actions/*.ts`)

- 每个功能域一个文件(如 `spending-review.ts`、`event-library.ts`),文件顶部 `"use server"`
- 每个 action 第一行取 `userId`,所有查询按其过滤
- 变更后调用 `revalidatePath()`;**注意**:在页面渲染期间被调用的函数(而非表单提交)内禁止 `revalidatePath`,会报 "Route ... used revalidatePath during render"
- 返回 `{ error: string }` 表示业务失败,组件侧检查 `res?.error`
- 传给客户端组件的 action 参数尽量用普通对象/标量;FormData 包装函数命名为 `saveXxx(fd: FormData)` 形式

### 页面与组件

- 页面 = Server Component(数据获取 + 布局),交互拆到 `components/` 下的 Client Component(`"use client"`)
- 服务端组件内**不能**用 `<Button asChild><Link/></Button>`(事件处理器不可序列化),改用 `buttonVariants()`:
  `<Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>`
- Next.js 16:`params` 是 Promise,必须 `const { id } = await params`
- 布局:根 `app/layout.tsx` 已含 `AppNav` + 内容容器(`max-w-3xl`,底部预留移动导航高度)。新页面**不要**再包一层容器
- 新功能域接入导航:编辑 `components/app-nav.tsx` 的 `links` 数组(桌面顶栏 + 移动底部导航共用)

### 设计系统

- 颜色只用 `app/globals.css` 中的 design tokens(`bg-background`、`text-muted-foreground`、`bg-warning/15` 等),禁止 `text-white`/`bg-black` 等直接色
- 状态标签:圆角胶囊 `rounded-full px-2 py-0.5 text-xs font-medium`;色调映射见 `components/badges.tsx`、`components/spending-badges.tsx`
- 卡片:`rounded-xl border bg-card shadow-card`(`shadow-card` 是自定义 utility);高风险条目加 `border-l-2 border-l-destructive/50`
- 横向滚动容器(状态 pills、底部导航)用自定义 utility `scrollbar-none`
- 移动优先:全部页面在 375px 宽度下可用;底部导航已处理 `env(safe-area-inset-bottom)`

## 功能域索引

| 路由 | 功能 | 主要表 |
|---|---|---|
| `/` | 仪表盘(关键确认拦截台) | critical_confirmations 等 |
| `/arm`、`/quick-check` | 武装模式、快速检查 | critical_confirmations、confirmation_items |
| `/spending-review` | 高额支出决策拦截台(规则驱动,无 AI) | spending_reviews + 6 张附属表 |
| `/event-library` | 事件案例库(丢失/复盘/规则) | event_cases、event_reviews、event_candidate_rules |
| `/ash-memos`、`/weakness` | 灰烬备忘录、弱点模式 | ash_memos、weakness_patterns/events |
| `/relationships` | 人际关系雷达 | relationships + 互动/复盘表 |
| `/tasks`、`/demands` | 树状任务、需求池 | tree_tasks、objectives、key_results、demands |
| `/boundaries` | 过度执行边界卡 | execution_boundaries、boundary_checks |
| `/rules` | 拦截规则库 | confirmation_rules |
| `/translate` | 翻译工具 | translations |
| `/resources` | 资源配置台(资产转化) | resource_platforms、resources、resource_evidence/links/reviews |
| `/resources/people` | 人脉资源与沟通计划 | people_resources、person_need_hypotheses、communication_plans/results |

### 个人经验触发与决策纠偏（Phase 1 P0）

- 不创建第二套教训/规则库：`ash_memos`、`mistake_reviews` 保存结构化教训来源，`confirmation_rules` 仍是唯一规则主表
- 教训字段固定为过去选择、实际代价、不同选择、教训陈述和 `draft/confirmed/superseded/archived` 状态；AI 不得替用户确认教训
- 规则状态机为 `draft → active → paused → active`，任意非 archived 状态可归档，archived 不可恢复；只有 active 参与匹配
- 每次规则创建/文案变更必须在同一事务写 `intervention_rule_versions`；历史版本不可修改
- `trigger_sessions` 使用幂等 key，一次最多保存 3 条规则及对应版本；排序按严重度、历史有效率和优先级
- 会话状态机为 `matched → decided → awaiting_validation → validated`，各阶段可过期；同一会话只能有一条 `choice_validations`
- 验证记录和规则 `validated/helpful` 统计必须事务写入，重复验证不得增加计数；所有来源、会话和规则查询必须按 `userId` 隔离
- 领域纯函数集中在 `lib/domain/experience-trigger.ts`，数据动作集中在 `app/actions/experience-trigger.ts`；本阶段不新增第二首页或 AI/OCR/推送

### 支出拦截系统要点(`/spending-review`)

- **不接入 AI API**:风险判定为纯规则引擎(`lib/spending-review-types.ts` 的 `calculateRisk()`);外部审核流程 = 导出 Markdown(`lib/spending-markdown.ts`)→ 用户手动粘给 GPT → 在 `/spending-review/[id]/gpt-result` 回写结论
- 风险等级 low/medium/high/critical → 决策状态机 draft → cooling(冷静期)→ awaiting_gpt → awaiting_final → cancelled/delayed/reduced/confirmed/paid
- 红线规则(动生活费/健康预算/学费/应急资金、亲密关系类、凌晨+冲动等)在 `calculateRisk` 中定义,新增规则改该函数即可
- ���后复盘可写入灰烬备忘录(`savePostmortem` 的 `writeToAshMemo`)
- **币种**:`currency` 仅支持 CNY/USD(Zod enum);风险阈值以人民���为基准,USD 按 7.3 折算(常量 `USD_TO_CNY` 在 `app/actions/spending-review.ts` **模块内私有**——`"use server"` 文件只能导出 async 函数,导出常量/同步函数会导致整个模块加载失败、提交静默无响应)
- **消费参照物换算**(表 `spending_anchors`,页面 `/spending-review/anchors`):填写金额时 `components/equivalence-cards.tsx` 实时把金额换算成 N × 参照物(如 5 个月 Cursor / 1.8 顿大餐);参照物分 preset(首次读取时由 `app/actions/spending-anchors.ts` 自动播种 7 条)和 history(用户填的真实历史消费,含付款日期与备注);`is_active` 控制是否参与换算

### 关系阶段与沟通闭环(`/relationships`)

- 在既有关系、��动、灰烬表上扩展 6 张闭环表；核心顺序固定为`情感状态 → 真实信号 → 阶段建议/用户确认 → 沟通计划 → 互动结果 → 必要时灰烬复盘`
- 事实、推断、待验证问题使用 `relationship_signals.signal_kind` 严格分层；规则只读取已验证事实，阶段建议不得自动覆盖 `relationships.current_stage`
- 沟通计划状态机为 `draft → ready → sent → reviewed`，`draft/ready → cancelled/expired`；非法转换必须拒绝，`sent` 才能提交结果，`plan_id UNIQUE` 防重复复盘
- 情绪强度 ≥8、`action_readiness=not_ready` 或存在强已验证边界/风险事实时，计划风险为 high 且禁止进入 ready
- 关系学习材料继续复用 `resources`（`domain=relationship`），仅 `relationship_resource_assessments` 保存健康筛查；不要创建第二套资源主表
- `thai-junior-v1` 是当前用户的幂等初始关系标识；只把明确背景写为事实，可能性和意图一律放假设或待验证问题，不伪造互动
- 领域纯规则集中在 `lib/relationship-stage-rules.ts`，写操作集中在 `app/actions/relationship-stage.ts`；所有查询必须同时按资源 id 与 `userId` 做 ownership check

### 资源系统要点(`/resources`)

- 六类资源(内容/工具/人脉/时���/财���/认知资产),转化层级 L0-L5(`lib/resource-types.ts` 的 `CONVERSION_LEVELS`)
- 程序化规则为纯函数:同领域激活上限 `checkDomainActiveLimit`(≤2)、30 天失活复审 `isInactive30Days`、L0→L1 需 7 天内使用计划
- 人脉子系统:联系人 → 诉求假设(必须标注"待验证",不能写成事实)→ 沟通计划(调用前三问:已尝试什么/为什么必须问此人/材料是否备齐)→ 结果验收(假设 kept/revised/removed 闭环)
- 沟通计划 Markdown 导出:`lib/communication-markdown.ts`,与支出系统同模式(复制/下载,��给外部 GPT 复核,不接 AI API)

## 验证清单(每次改动后)

1. `npx tsc --noEmit` 无错误
2. 受影响路由 `curl` 返回 200,或用 agent-browser 截图确认渲染
3. 涉及表单的改动:实际提交一次验证 server action 与跳转
4. 查看 `user_read_only_context/v0_debug_logs.log` 时注意时间戳,**旧错误日志会残留**,以最新一次编译后的输出为准

## 已知坑(修过的 bug,勿再犯)

- 数据库表未建就写查询代码 → 页面报 `Failed query`;先建表再写代码
- `as const` 数组 `.map()` 出的窄字面量类型和 `string` 比较会编译报错;显式标注 `: string[]`
- 渲染期调用含 `revalidatePath` 的函数会崩;导出/生成类函数不要放 revalidate
- 固定底部导航会遮挡表单提交按钮;交互测试时用 `agent-browser eval` 直接触发点击,页面容器需保留足够 `pb-*`
- `"use server"` 文件导出非 async 内容(常量、同步函数)→ 模块加载失败,所有 action 静默失效、表单提交无响应且无报错;共享常量放 `lib/` 或模块内私有
- Zod v4 用 `parsed.error.issues[0]`,不是 `parsed.error.errors[0]`
- React 受控 Input 在 agent-browser 中用原生 setter 赋值:`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, val)` 再派发 `input` 事件,直接 `el.value=` 不会更新 state

## 娱乐闭环(P0)

- 独立入口 `/entertainment`;详情 `/entertainment/[id]`;Server Actions 在 `app/actions/entertainment.ts`,固定评分/状态机在 `lib/entertainment-rules.ts`,外部桥接纯函数在 `lib/entertainment-exports.ts`
- 3 张表:`entertainment_sessions`(执行计划/滴答文本)、`entertainment_assessments`(事实与五维结果)、`entertainment_reflections`(GPT 回填/用户确认/Markdown);不允许再建第二套娱乐表
- 状态只允许 `active → ended → assessed → reviewed`,或 `active → abandoned`;评估和复盘均以 `session_id UNIQUE` 幂等;所有读写按 `userId` 隔离
- 同一用户只允许一个 `active` 会话:应用层预检 + 数据库部分唯一索引 `entertainment_one_active_per_user` 双重保护,避免并发请求创建两个会话
- 滴答清单是**纯文本桥接**,每个会话只生成一个任务,保存标题/正文/检查项和最近复制时间;不接 TickTick API/MCP,不创建通知和计时器
- 五维结果必须保存原始事实:时间/数量/花费、恢复与学习、五项满意度、停止难度、主线帮助、下一动作证据、睡眠和次日影响;派生值包括 `overtime_minutes`、`satisfaction_average`、`conversion_result`
- 主线转化固定枚举:`immediate`(结束 15 分钟内启动)、`delayed`、`none`、`sleep`;不得由 UI 自行推断另一套结果
- GPT 仍为手工桥接:系统只生成提示词,用户在外部 GPT 分析后回填;态度固定为 `agreed / partially_agreed / disagreed`;不得自动调用 AI 或把 GPT 文本当成用户确认事实
- `disagreed` 时禁止写入灰烬和规则库;只有用户明确确认后,灰烬写 `ash_memos`,规则写 `confirmation_rules` 且必须 `is_active=false`;复盘、灰烬、规则和会话状态在一个事务中提交
- Markdown 在确认时生成并将快照保存到 `entertainment_reflections.markdown_snapshot`;详情页只能复制/下载已保存快照,不得在展示阶段悄悄重算历史内容
- 结果评分为确定性纯规则,金额使用整数人民币元,时长使用整数分钟;P0 不做排行榜、画像、GPT API、自动播放检测或 TickTick 同步

## 导航栏排序(可自由调整,不锁死)

- 导航项定义在 `components/app-nav.tsx` 的 `DEFAULT_LINKS`;用户顺序存 `user_preferences` 表 `nav_order` 键(href JSON 数组),由 `app/actions/preferences.ts` 读写,`app/layout.tsx` 服务端读取后传 prop
- 顶栏齿轮按钮(aria-label「调整导航顺序」)打开排序面板:上移/下移/恢复默认/保存
- **新增导航项只需加进 `DEFAULT_LINKS`**:`applyOrder` 会把不在已保存顺序里的新项自动追加到末尾,不会因旧偏好被"锁死"或丢失
- 同步补翻译词典词条(导航 label + 排序面板文案)

## 全局翻译(EN 按钮)维护约定

- 机制:`components/page-translator.tsx` 纯前端 DOM 替换 + MutationObserver,词典在 `lib/page-translation-dict.ts`(EXACT_DICT 精确匹配 + PATTERN_RULES 动态正则),零 AI 调用
- **每新增一个页面/模块,必须同步给词典补词条**,否则该模块点 EN 后仍是中文——这是"没办法全局翻译"bug 的根因
- 补词条后用查重命令防 `TS1117` 重复键错误:`grep -oP '^\s+"\K[^"]+(?=":)' lib/page-translation-dict.ts | sort | uniq -d`
- JSX 拼接文本(如 `准备{label}`)会拆成多个文本节点,短词条按节点单独翻译,注意英文拼接需要留空格(如 `"准备": "Prepare "`)
- 带数字/日期的动态文本用 PATTERN_RULES 正则处理(如 `累计 N 条`、`· 日期 付款`)
- 用户录入的数据内容(标题、备注等)**不翻译**,属预期行为
- 验证方法:点 EN 后用 agent-browser 统计残留中文行 `document.body.innerText.split('\n').filter(l=>/[\u4e00-\u9fff]/.test(l))`,残留应只剩用户数据
