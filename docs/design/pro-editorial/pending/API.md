# RuleLoop API 契约

版本：v0.3-draft · 2026-09-28。**全部为拟实现契约，当前仓库无对应已上线 API。** 本文件服务于 Pro 宣传页、定价页及后续决策循环。视觉方案验收前不据此直接改生产路由。

## 1. 约定与实现边界

Base path `/api/v1`，JSON，camelCase，UUID，时间为 UTC ISO 8601。金额以 `amountMinor` 整数和 `currency: "USD"` 返回。日期型节点另带 IANA `timeZone` 用于用户显示。

成功：

```json
{"ok":true,"data":{},"requestId":"req_123"}
```

失败：

```json
{"ok":false,"error":{"code":"VALIDATION_ERROR","message":"Check the highlighted fields.","fieldErrors":{"expectation":"Enter at least 10 characters."},"retryable":false},"requestId":"req_123"}
```

`src/lib/response.ts` 目前仅有字符串错误与固定 `demo-user`，与此新契约不同。后续需要显式迁移，不可视为真实身份验证。

公开端点：plans、session。其他用户端点要求真实 HttpOnly/Secure session，服务端推导 userId。浏览器不得发送 userId/role/entitlements/任意价格来获得权限。所有资源查询与写入必须按当前用户所有权校验；跨用户资源返回 404。私人响应 `Cache-Control: private, no-store`；不得写入共享静态缓存。Cookie 写请求校验 Origin/CSRF。

幂等写入：checkout、review-jobs、创建 loop、complete round 使用 `Idempotency-Key` UUID；作用域为用户+端点，TTL 24h。同 key/同 payload 返回相同结果，异 payload 返回 409。作业与回调自身的唯一键约束永久有效，不受 24h 限制。

## 2. 端点清单

| 方法 | 路径 | 访问 | 用途 |
|---|---|---|---|
| GET | `/plans` | 公共 | 唯一价格和权益目录 |
| GET | `/session` | 公共 | 当前登录状态，不重定向 HTML |
| GET | `/me/entitlements` | 登录 | 服务端权益、额度和账单状态 |
| POST | `/billing/checkout-sessions` | 登录 | 创建托管结账 |
| POST | `/billing/portal-sessions` | 登录 | 管理已有订阅 |
| POST | `/billing/webhooks/{provider}` | 签名认证 | 支付状态同步，浏览器不调用 |
| GET | `/loops` | 登录 | 分页列表 |
| POST | `/loops` | 登录 | 保存一个循环及首轮期待 |
| GET | `/loops/{loopId}` | 所有者 | 当前轮与历史轮次摘要 |
| PATCH | `/loops/{loopId}` | 所有者 | 标题或暂停/归档/恢复 |
| POST | `/loops/{loopId}/rounds` | 所有者 | 明确创建下一轮，不覆盖历史 |
| POST | `/loops/{loopId}/rounds/{roundId}/evidence` | 所有者 | 添加材料/自述 |
| POST | `/loops/{loopId}/rounds/{roundId}/review-jobs` | 所有者 | 异步生成 AI 候选分析 |
| GET | `/review-jobs/{jobId}` | 所有者 | 查询生成结果 |
| POST | `/loops/{loopId}/rounds/{roundId}/complete` | 所有者 | 人工确认结果、决定与可选规则 |
| PATCH | `/loops/{loopId}/rounds/{roundId}/checkpoint` | 所有者 | 设置/改约/取消节点 |
| POST | `/rules/{ruleId}/validations` | 所有者 | 记录是否想起、执行、结果 |
| GET | `/me/export` | 登录 | 导出本人数据，Free 同样支持 |

首页 `Build my preview` 不调用上述端点，不需要 `/api/demo-ai`。前端本地纯函数生成预览，不伪装 AI。

## 3. Plans

`GET /plans` → 200；可短时公共缓存，checkout 必须重新检查当前版本。

```json
{
  "ok": true,
  "data": {
    "catalogVersion": "2026-09-28-draft-1",
    "currency": "USD",
    "checkoutAvailable": false,
    "free": {"id":"free","amountMinor":0,"limits":{"activeLoops":1,"aiReviewsPerMonth":1}},
    "pro": {
      "id":"pro",
      "prices":[
        {"priceKey":"pro_monthly","interval":"month","amountMinor":500},
        {"priceKey":"pro_annual","interval":"year","amountMinor":6000,"equivalentMonthlyMinor":500}
      ],
      "limits":{"activeLoops":20,"aiReviewsPerMonth":20},
      "features":["cross_loop_suggestions","checkpoint_reminders"]
    },
    "sharedFeatures":["manual_reflections","history","data_export"],
    "quotaResetPolicy":"utc_calendar_month",
    "rollover":false
  },
  "requestId":"req_plans"
}
```

金额为拟定价格，限额为设计提案。禁止把 6000 当每月价或给 Annual 添加折扣。`checkoutAvailable:false` 时展示预览订单，不能跳入假的付款表单。

## 4. Session 与 Entitlements

`GET /session` 始终 200（服务错误除外）。

```json
{"ok":true,"data":{"authenticated":false,"user":null},"requestId":"req_session"}
```

已登录时 `user:{"id":"uuid","displayName":"Alex"}`；无需暴露支付凭据。认证服务与登录 API 尚未选型，v0 先接 adapter；不得自行编造可用 OAuth。

`GET /me/entitlements` → 200：

```json
{
  "ok":true,
  "data":{
    "plan":"pro",
    "billing":{"status":"active","interval":"year","currentPeriodEnd":"2027-09-28T12:00:00Z","cancelAtPeriodEnd":false},
    "limits":{"activeLoops":20,"aiReviewsPerMonth":20},
    "usage":{"activeLoops":2,"aiReviewsUsed":3,"aiReviewsReserved":0,"aiReviewsRemaining":17,"periodStart":"2026-09-01T00:00:00Z","resetAt":"2026-10-01T00:00:00Z"},
    "capabilities":{"createLoop":true,"generateReview":true,"crossLoopSuggestions":true,"checkpointReminders":true,"export":true}
  },
  "requestId":"req_entitlements"
}
```

`remaining=max(0,limit-used-reserved)`。Free 返回 `billing:null`。账单状态 enum：`pending|active|past_due|canceled|unpaid`。cancelAtPeriodEnd 不等于立即失去已付权益；权益以最后确认的 paid-through 时间为界，无新增宽限期承诺。客户端不依据状态字符串自己授予权限，以 capabilities 为准。

UTC 自然月配额与订阅付款周期独立；年付同样每月 20 次。月中升级保留 used。前端将 resetAt 格式化为用户时区，并显示实际日期。停止续费、换账期不刷新使用量。

## 5. Checkout 与 Portal

`POST /billing/checkout-sessions`；Idempotency-Key 必填。

```json
{"priceKey":"pro_annual","catalogVersion":"2026-09-28-draft-1","returnPath":"/account/billing"}
```

只接受 `pro_monthly|pro_annual` 和服务端允许的相对 returnPath。服务端解析价格与供应商 price ID，不接受客户端金额、任意跳转 URL。用户已有有效订阅 → 409 `ALREADY_SUBSCRIBED`，引导 portal。

201：

```json
{"ok":true,"data":{"checkoutSessionId":"chk_example","checkoutUrl":"https://checkout.example.invalid/session","expiresAt":"2026-09-28T13:00:00Z"},"requestId":"req_checkout"}
```

`.invalid` 地址仅说明形状，不得用于真实跳转。未配置提供方 → 503 `CHECKOUT_UNAVAILABLE`。创建成功只意味着会话存在，不能显示 Pro 已开通。订单完成后前端重新查询 entitlements，最多等待 30 秒；未确认显示 Payment confirmation is still pending，允许手动刷新。

`POST /billing/portal-sessions`，body `{"returnPath":"/account/billing"}`；200 返回 `{"portalUrl":"https://billing.example.invalid/session"}`。无可管理订阅返回 409 `NO_SUBSCRIPTION`。取消/换账期走服务端提供方门户，前端不直接写 plan。首版换账期在当前已付款周期结束后生效，具体提供方支持验证后发布；未接入前不展示可立即换账期承诺。

## 6. Webhook（服务端集成契约）

`POST /billing/webhooks/{provider}` 接收提供方原始 body 和其签名头；签名算法、事件类型、密钥环境变量在选择支付提供方后补齐。未完成验签时不得上线。该端点不使用普通浏览器登录作为真实性依据。

流程：原始 body 验签/时间窗 → providerEventId 唯一约束 → 提供方对象映射 → 核对 user/customer、price、currency、付款状态 → 根据提供方当前状态与已付截止日原子更新账单/权益 → 记已处理。

重复事件返回 200（不重复授予）。乱序事件不得覆盖较新的已付状态；有歧义时从提供方重新读取当前对象。校验失败 400，临时存储失败 500 以便提供方重试。不得用前端 success URL、checkoutSessionId 本身或用户输入来授予 Pro。日志不记录完整支付或用户材料。

## 7. Loop 与 Round

`GET /loops?status=waiting&cursor=opaque&limit=20`；limit 1–50。200 data `{"items":[],"nextCursor":null}`。

`POST /loops`，幂等：

```json
{"title":"Review my AI subscription","kind":"subscription","expectation":"Finish one real client task with this tool.","context":"I already have another paid tool.","checkpoint":{"type":"date","dueAt":"2026-10-05T09:00:00Z","timeZone":"Asia/Bangkok"}}
```

`kind:subscription|behavior`，标题 1–80、expectation 10–500、context 最大 2000。checkpoint 可 null（draft）。date 节点必须未来有效时间。milestone 节点必须 `milestoneText` 与 `fallbackAt`，完成由用户报告，不能自动猜测。

201 data：

```json
{"id":"loop_uuid","title":"Review my AI subscription","kind":"subscription","status":"waiting","version":1,"currentRound":{"id":"round_uuid","expectation":"Finish one real client task with this tool.","context":"I already have another paid tool.","checkpoint":{"type":"date","dueAt":"2026-10-05T09:00:00Z","timeZone":"Asia/Bangkok","reminder":{"channel":"none","status":"not_configured"}},"evidence":[],"review":null,"decision":null},"createdAt":"2026-09-28T12:00:00Z","updatedAt":"2026-09-28T12:00:00Z"}
```

`GET /loops/{id}` 使用同一资源结构，增加 `roundHistory:[{id,expectation,completedAt}]`。status：`draft|waiting|due|reviewing|paused|completed|archived`。状态推导必须依服务端节点时间，不依客户端本地时钟。

`PATCH /loops/{id}` body `{"version":1,"title":"...","status":"paused"}`；成功 200 返回 version+1。允许编辑标题/暂停/归档/恢复；不能用 PATCH 把一轮标记已完成或重写已完成期待。旧版本 → 409 `VERSION_CONFLICT`。

`POST /loops/{id}/rounds` body `{"previousRoundId":"uuid","expectation":"...","context":"...","checkpoint":{...}}`；仅上一轮完成后建立新轮，201 返回新当前轮。保留旧快照，不静默更新期待。

## 8. Evidence 与 AI job

`POST /loops/{loopId}/rounds/{roundId}/evidence`：

```json
{"type":"self_report","text":"I completed one draft, but have not compared the time.","source":{"label":"My review note","url":null},"occurredAt":"2026-09-28T10:00:00Z"}
```

type `self_report|material`，text 1–10000 字符。source.url 可选 http(s) 引用，仅存引用不抓取；拒绝脚本协议。201 返回 evidence `{id,type,text,source,occurredAt,createdAt,confirmation:"user_submitted"}`。用户提交代表自述来源，不能等同独立验证。

`POST .../review-jobs`，幂等：

```json
{"mode":"single_loop","evidenceIds":["evidence_uuid"],"consentToProcessSelectedEvidence":true}
```

`single_loop|cross_loop`。跨循环追加 `relatedLoopIds` 最多 5，仅本人且需要 Pro。所有 evidenceIds 必须属于本次选择范围，每次最多 10 条、10000 字符；后台不自动扩张到用户其他材料。明确同意缺失返回 422。

先原子预留一次额度再投递作业；无余额 429 `AI_QUOTA_EXCEEDED`。202 返回 `{"jobId":"job_uuid","status":"queued","pollAfterMs":1500}`。固定最大并发 1/user，超过返回 429 `TOO_MANY_REQUESTS`。

`GET /review-jobs/{id}` → 200，status `queued|running|succeeded|failed|canceled`。最多每 1500ms 查询，遵守 Retry-After；页面离开停止客户端轮询，服务端作业仍可完成。

成功 data 示例：

```json
{
  "jobId":"job_uuid","status":"succeeded","charged":true,
  "result":{
    "expectation":"Finish one real client task with this tool.",
    "findings":[{"id":"finding_uuid","text":"A draft was completed, according to your note.","evidenceIds":["evidence_uuid"],"confirmation":"candidate"}],
    "unknowns":[{"id":"unknown_uuid","text":"Whether this was faster than your existing tool.","evidenceIds":[]}],
    "nextExperiment":{"question":"Does this tool reduce time on a comparable task?","action":"Complete one similar task and note the time and output quality.","observation":"Compare the two completed outputs and recorded times.","confirmation":"suggested"},
    "ruleSuggestion":{"trigger":"Before adding another similar tool","action":"Finish one real task with what I already have","confirmation":"suggested"}
  }
}
```

失败 data 返回 `error:{code,message,retryable}`、charged:false，释放预留；任务终态重复回调不重复计量。一次成功生成原子从 reserved 转 used；按预留所属的 UTC 月度 bucket 结算，跨月完成不从新月误扣。缺材料时可无 findings，只给 unknowns；不捏造证据。手动回访不调用 AI 作业。

## 9. 完成回访、规则验证、提醒

`POST .../complete`，幂等：

```json
{"version":1,"reviewJobId":"job_uuid","results":[{"findingId":"finding_uuid","text":"A draft was completed.","evidenceIds":["evidence_uuid"],"confirmation":"confirmed"}],"unknowns":["Time comparison is still missing."],"decision":{"type":"experiment","question":"Is it faster?","action":"Finish a comparable task.","observation":"Record time and compare output quality.","nextCheckpoint":{"type":"date","dueAt":"2026-10-05T09:00:00Z","timeZone":"Asia/Bangkok"}},"acceptedRule":{"trigger":"Before adding another similar tool","action":"Finish one real task with what I already have"}}
```

支持完全手动：reviewJobId:null、findingId:null，结果保留自述来源。允许不确认任何发现。decision.type `experiment|pause|end`；experiment 必须有 question/action/observation/nextCheckpoint，pause/end 必须 reason，不能要求无限循环。acceptedRule 可 null。事务保存本轮确认快照、决定、可选规则、更新状态/版本；201 返回 `{roundId,status:"completed",ruleId:null,nextCheckpoint:...}`。下次节点由决定保存为“待开启下一轮”提示，不自动覆盖上一轮；明确点击下一轮时调用 rounds。

`POST /rules/{id}/validations` body `{"recalled":true,"followed":false,"resultImproved":null,"note":"...","occurredAt":"..."}`；201 返回验证记录。未改善/未知与未执行必须分开；不根据 1 次验证宣称有效。

`PATCH .../checkpoint` body `{"version":2,"checkpoint":{...},"reminderChannel":"calendar_manual"}`；checkpoint:null 表示取消。channel enum `none|calendar_manual|email`，email 仅提供方配置并获用户选择后可用。返回 reminder.status `not_configured|needs_user_action|scheduled|sent|failed|canceled`；发送不等于已读/已执行。Free 可手动日历，Pro 才可 email。未配置 email 返回 503 `REMINDER_UNAVAILABLE`，不降级为假“已提醒”。改约/取消时取消旧后台任务；手动日历返回需本人更新的说明。

## 10. Export 与错误映射

`GET /me/export` 返回 JSON 附件（不使用通用 envelope），Content-Disposition 给安全文件名；内容含 schemaVersion/exportedAt/loops/rounds/evidence/rules/validations。只导出本人，不带支付密钥、模型系统提示或他人数据。Free/降级用户仍可用。

| HTTP | code | 前端动作 |
|---|---|---|
| 400 | BAD_REQUEST | 保留输入，显示请求格式问题 |
| 401 | AUTH_REQUIRED | 登录后恢复明确发起的操作 |
| 403 | FEATURE_NOT_INCLUDED | 展示 Pro 权益说明，不自动付费 |
| 404 | NOT_FOUND | 资源不可用；不泄露他人对象 |
| 409 | VERSION_CONFLICT / IDEMPOTENCY_CONFLICT | 提醒刷新或重新确认，不覆盖旧数据 |
| 409 | ACTIVE_LOOP_LIMIT / ALREADY_SUBSCRIBED | 暂停旧循环或打开订阅管理 |
| 422 | VALIDATION_ERROR / CONSENT_REQUIRED | 字段错误并聚焦摘要 |
| 429 | AI_QUOTA_EXCEEDED | 显示 resetAt，继续手动功能 |
| 429 | TOO_MANY_REQUESTS | 按 Retry-After 再试 |
| 503 | CHECKOUT_UNAVAILABLE / AI_UNAVAILABLE / REMINDER_UNAVAILABLE | 明示未接入/暂不可用，无虚假成功 |

## 11. v0 adapter 与验证

`RuleLoopClient` 将 plans/session/entitlements/createCheckout/createPortal 与业务功能隔离。先实现同契约 mock adapter，统一 `demo` 模式标识；不能让 mock fetch 成功被当作真实后端。生产 adapter 使用真实 API；营销 Server Components 可直接调用同一服务读取公开目录，避免自请求。

适用 Next.js 16 文档已在本仓库读取：`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` 与 `05-server-and-client-components.md`。API route 与 page 不占同一路径；交互用小 Client Component，公开内容默认 Server Component。具体认证/支付 SDK 接入前重新读其官方文档。

必要契约测试：价格两账期、未登录、跨用户对象、幂等重试、失败退还预留、跨月 job、升级不重置 used、年付按月额度、支付乱序/重复回调、checkout 返回未到账、降级后历史导出、手机输入及失败保留草稿。当前文档不表示这些测试已实现或通过。
