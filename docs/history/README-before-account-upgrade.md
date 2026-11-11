# RuleLoop — 把经历变成下次会执行的规则

> **2026-09-27 产品聚焦更新：** 下一轮以[约定节点驱动的验证机制](docs/PRD-CHECKPOINT-VALIDATION.md)为方向依据，先验证“期待 → 结果 → 未知 → 最小验证”的实用性。[v0 下一步优化提示词](docs/V0-CHECKPOINT-VALIDATION-PROMPT.md)用于设计评审。下文保留旧版范围作为历史参考，不代表新方案已实现。

> **2026-09-28 上线流程方案：** [官网优先上线与 SEO/GEO 验证方案](docs/WEBSITE-FIRST-LAUNCH-PLAN.md)定义“UI/API 基线 → 官网设计验收 → Landing/Pricing/Waiting List + GSC/GA4 → 上线后优化 → 最小产品”的执行顺序。文档为设计稿，包含通用流程与 RuleLoop 适配说明，不表示官网已部署或商业化已验证。

RuleLoop 是一个面向个人使用的经验转化工具。它不追求记录更多内容，而是帮助用户识别值得认真处理的事件，并把重复发生或影响较高的错误转化为可执行规则，在下一次触发时验证行为是否真的改变。

## 产品边界

- 核心用户：产品所有者本人，按真实个人使用习惯设计。
- 核心目标：减少同类错误再次发生，而不是增加笔记数量。
- 数据策略：P0 单用户、本地优先；不引入账号、社交和云端同步。
- 规则门槛：只有重复发生或高影响事件进入规则流程；普通事件只存档。
- 核心闭环：记录 → 判断价值 → 复盘 → 建立或关联规则 → 下次验证 → 形成成长证据。

## 两条结果路径

```text
记录事件
  ├─ 普通事件 ─────────────→ 存档，可稍后查看
  └─ 重复发生 / 高影响 ────→ 复盘
                                 ├─ 关联已有规则
                                 └─ 创建新规则
                                        ↓
                                  下次触发时验证
                                        ↓
                                    成长档案
```

系统只在“是否值得形成长期约束”这个节点分流。记录和复盘过程保持单一路径，避免功能岔路干扰思考。

## P0 页面

P0 共 8 个路由页面：

1. 首页 `/`
2. 快速记录 `/record`
3. 事件详情 `/events/[id]`
4. 待复盘 `/reviews`
5. 复盘工作台 `/events/[id]/review`
6. 规则库 `/rules`
7. 规则详情 `/rules/[id]`
8. 成长档案 `/archive`

底部导航保留“首页、待复盘、规则、档案”四个目的地，中间使用“记录”主操作。记录和复盘工作台属于专注流程，不显示底部导航。

## 技术方向

- Next.js 16 App Router
- React 19 + TypeScript 5
- Tailwind CSS 4 CSS-first
- Drizzle ORM + 本地 SQLite/libSQL
- Server Components 读取数据，Server Actions 处理内部写操作
- Client Components 仅承担表单状态、筛选和即时交互

## 当前状态

仓库目前是可交互的静态原型：已有基础页面、设计规范和 Drizzle 表定义，但页面数据仍以 Mock 为主，数据库客户端、迁移和核心数据动作尚未完成。需求基线以 `docs/FEATURE.md` v0.2 为准，架构和路线图分别见：

- [需求文档](docs/FEATURE.md)
- [技术架构](docs/ARCHITECTURE.md)
- [迭代路线图](docs/ROADMAP.md)
- [视觉规范](design-system/MASTER.md)
- [前端样式图与可交互原型](docs/design/README.md)
- [消费价值换算产品需求](docs/PRD-CONSUMPTION-CONVERTER.md)
- [消费价值换算开发规格](spec/design-impulse-spend-converter.md)

## 成功标准

- 60 秒内完成一次事件记录。
- 3 分钟内完成一次高价值事件复盘并得到可执行规则草稿。
- 每条规则都能记录“是否想起、是否遵守、结果是否改善”。
- 用户可以回答：哪些错误在重复、哪些规则真正有效、自己是否比过去做出了不同选择。
