# RuleLoop Pro — 宣传页、试用与定价需求

版本：v0.3 · 2026-09-28 · 状态：设计与开发契约草案，未上线。视觉产物完成后补充验收记录。

## 1. 决策与范围

用户已选择：AI 工具与订阅价值复盘 + 关键场景行为复盘；本轮交付英文宣传首页、独立定价页、高保真概念图及 v0 开发材料。品牌参考 Hermès 的克制、纸感与编辑式排版，使用 RuleLoop 自有名称和原创图形。

统一流程：购买/续费期待 → 一项真实任务 → 约定节点 → 对照证据与未知 → 一个最小验证 → 下次场景使用经验。营销表达：Make room for better decisions.

当前用户文字按 Pro USD 5/月、USD 60/年解释，待用户最终核对。年付总额等于 12 次月付；不得声称年付折扣。Free/Pro 配额是本轮提出的可修改方案，不是用户已确认的商业承诺。

本轮不写生产页面，不接真实支付、不发布网站。独立 HTML 设计中的交互是概念验证；正式上线还需要认证、持久化、AI、提醒和支付服务。

## 2. 受众与主任务

首批受众：同时使用多个 AI 工具、拥有真实学习/工作任务、近期面临购买或续费决定的个人与自由职业者。

首页让访客无需注册即可用一次结构化决策卡，理解产品如何帮助自己，再考虑保存或升级。体验成功以完成预览、理解未知信息和愿意保留下一步为信号，不承诺节省金额或改变行为。

## 3. 页面与路由

| 目标路由 | 任务 | 本轮设计 | 生产依赖 |
|---|---|---|---|
| `/` | 英文宣传页 + 本地交互试用装 | `design/pro-editorial/index.html` | 不依赖 AI 即可预览 |
| `/pricing` | Free/Pro 对比、月年切换 | `design/pro-editorial/pricing.html` | 价格目录、会话、权益、结账 |
| `/app` | 登录后查看个人循环 | 本轮只定义入口 | 认证、真实持久化 |
| `/app/loops/[id]` | 期待/证据/未知/下一步 | 后续功能页 | Loop 服务 |
| `/account/billing` | 管理订阅及额度 | 本轮只定义入口 | 认证、账单门户 |
| `/privacy`, `/terms` | 已审核的正式政策 | 本轮仅明示政策预览 | 政策内容与真实处理方式一致 |

当前 `/` 为旧 Mock 仪表盘。生产迁移时先保留为 `/app` 并核对内部链接，保留 `/record`、`/review`、`/rules`、`/archive` 等既有路由。此次不能删除旧页面或假定完成迁移。营销布局与应用布局分离，营销页面不使用旧 BottomNav。

## 4. 首页内容结构

1. Navigation：RuleLoop / The method / Try a loop / Pricing / Start free；移动菜单可键盘操作。
2. Hero：A little more intention. → Make room for better decisions. → Know what your tools are doing for you. Turn what you learn into a better next move. CTA：Try a decision；Explore Pro。
3. Sampler：首屏 CTA 可直达 `#try`，交互位于前两屏；使用示例与自填材料都可。
4. Features：Remember the reason / See what actually changed / Carry one lesson forward；每项配具体决策卡，而非抽象 AI 能力标语。
5. Method：Expectation / Evidence / Unknowns / Next experiment。保留证据确认语义。
6. Price invitation：Free 与 Pro 简短入口，完整权益进入定价页。
7. CTA：Your next decision can be a little clearer.
8. FAQ：用途、是否每日记录、AI 来源、预览是否真实 AI、配额、计费与取消。
9. Footer：品牌、方法、试用、价格、政策入口，以及概念阶段提示。

不得展示虚构用户数量、评价、媒体标志、节省金额、倒计时或未经证实的推荐标签。

## 5. 首页试用装

### 输入与输出

示例：是否续费一个每月 $20 的 AI 工具。允许改工具名称、购买期待、观察到的结果。工具名 1–80 字符，期待 10–500 字符，结果 0–1000 字符；去除首尾空白，结果为空也能继续。

点击 Build my preview 后，完全在客户端生成四段卡片：

- Expectation：展示用户原文。
- Evidence：展示用户提供的原文并标记 Self-reported；空值显示 No evidence added yet。
- Unknowns：提示需要验证的内容，不从使用频率推断价值。
- Next experiment：给出可编辑的一次真实任务建议，标记 Suggested，而非用户已执行。

固定显示 Preview, not an AI analysis。用模板整理输入，不能伪装网络 AI 分析；不调用模型、不使用额度。输入仅保留在当前页面内存，刷新丢失；提示 Refreshing clears this preview。Reset example 可恢复示例。

### 保存与注册

概念页 Keep this loop 打开“需要账号、此设计尚未连接账号”的提示，不假装保存。

生产阶段：登录完成后再调用创建 Loop。为防登录跳转丢草稿，仅在用户点击保存并获知本机暂存后，存入短时 sessionStorage，设置 30 分钟过期、成功保存后清除。不得自动上传编辑过程，也不得把材料塞进 URL。

## 6. 价格与权益提案

所有价格为 USD。存储金额使用最小货币单位整数；前端不向支付服务传任意金额。

| 项目 | Free | Pro 月付 | Pro 年付 |
|---|---:|---:|---:|
| 价格 | $0 | $5/月 | $60/年 |
| 实际每期扣款 | $0 | $5 | $60 |
| 活跃循环上限 | 1 | 20 | 20 |
| AI reviews/月 | 1 | 20 | 20 |
| 手动回顾 | 支持 | 支持 | 支持 |
| 历史查看、导出 | 支持 | 支持 | 支持 |
| 跨循环模式建议 | 不包含 | 包含，计入 AI reviews | 同月付 |
| 节点提醒 | 手动安排日历 | 应用外提醒，渠道上线前落实 | 同月付 |

年付仅改变结账周期，不改变每月额度。月年切换不预选附加项，不显示 Save 或划线原价。所有配额应来自单一配置，与 API、文案和结账摘要一致。

活跃循环包含 draft/waiting/due/reviewing，paused/completed/archived 不占活跃上限。恢复与新建同样检查上限。

AI review 指一次成功生成的结构化分析；一轮重新生成属于新调用。网络重试必须复用同一个 job/幂等键；失败或取消不扣成功额度，不能重复扣费。跨循环分析也扣 1 次，不能绕过配额。

使用周期按 UTC 自然月重置，所有用户相同；年付用户每月重置，不一次获得 240 次。月中付费升级时当前月上限改为 20，已有成功使用计入，不清零；切换账期、取消再订阅不能重置额度。剩余额度不结转。界面显示明确的 resetAt 本地日期。

降级后历史可读、可导出，可手动记录已有事项；超过 Free 活跃上限时阻止新建/恢复，允许完成或暂停，不删除历史。AI 与配额以服务器权益为准。

## 7. 定价交互与计费状态

默认 Monthly；Annual 显示 $60/year + Equivalent to $5/month. $60 billed annually。区间切换用有状态的原生按钮或单选组，移动端不可挤压。

概念 CTA：Choose Pro → Demo order summary，展示金额、账期、每月 AI 配额及 Checkout is not connected in this design preview。不收集卡号，不展示付款成功。

生产 CTA：

- 未登录 → 登录，保留所选账期，不创建匿名付费订阅。
- 已是 Pro → Manage subscription，不重复购买。
- 创建 checkout 期间 → 禁用重复点击；失败保留所选账期并允许重试。
- 从支付页面返回 → 先显示确认中，再查询服务端权益；查询参数不能授予 Pro。
- 用户取消结账 → 返回价格页，保留选择，不提示成功。
- 取消续费 → 显示仍可用到的具体日期；到期按 Free 权益处理。

正式支付提供方、税务展示、退款政策、认证方式及提醒渠道尚待实施选择；支付前显示实际应付金额及适用税费。自动续费及取消入口必须明确，不能承诺未确定的退款政策。

## 8. AI 与结果边界

AI 仅处理用户明确选中的材料。每个结论引用 evidenceId；不能引用不存在的材料，不能把候选结果记为 confirmed。结果需人工确认/纠正。资料不足返回 unknown，不编造收益、自动替用户取消订阅或判断心理状态。

首版仅文本，单次最多 10 条证据、总计 10000 字符；不抓取任意链接、不读取全量笔记、不承诺银行/AI 聊天账户集成。链接只作引用，防止前端把“附 URL”当“已读取 URL”。

## 9. 界面状态与质量

必须设计并实现：默认、编辑、校验失败、预览生成、重置、移动导航、FAQ 展开、价格切换、订单摘要、未接入提示。后端接入时补齐 unauthenticated/loading/timeout/429/503/empty/checkout-pending/payment-canceled/active/canceled-at-period-end。

1440px、768px、390px、320px 无水平溢出；焦点可见、模态框可 Escape 关闭并恢复焦点、表单有 label、状态通过 aria-live 通告。正文目标 16px，移动触控目标 44px，颜色不能独自表示状态，遵从 prefers-reduced-motion。外部资源不使用 latest，优先本地字体和原创 SVG。

## 10. 验收

- AC-01：访客无需账号完成本地预览，零 AI 网络调用。
- AC-02：缺少结果时保留未知，不生成成功证据。
- AC-03：从首页 CTA 到 sampler，再到保存提示，全路径可操作。
- AC-04：Monthly $5 / Annual $60 与弹窗、API 配置一致，没有折扣声明。
- AC-05：两种 Pro 账期都显示每月 20 次；历史/导出不是升级障碍。
- AC-06：菜单、FAQ、弹窗、Tab/Escape、焦点、移动宽度实际验证。
- AC-07：概念图来自真实渲染，注明尺寸和是否检查；未经观察不写通过。
- AC-08：生产页面不复用固定 demo-user 认证，不由浏览器自设 Pro。
- AC-09：v0 的开发结果与实际视觉文件、API、价格目录一致。
- AC-10：生产付费前通过所有权、重复提交、签名回调、乱序事件及降级历史测试。

关联：`API.md`、`V0-PRO-MARKETING-PROMPT.md`、`design/pro-editorial/README.md`。
