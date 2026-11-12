# RuleLoop 账号版

将事件、关键确认、复盘、规则与验证证据连成闭环。本轮完整承接 v0 的 64 个页面和 63 张 PostgreSQL 表，并保留三个旧地址兼容入口。数据按登录账户保存；账号应用已于 2026-10-29 部署至独立服务器。

技术栈：Next.js 16.2.10、React 19.2.4、TypeScript、Tailwind CSS 4、PostgreSQL 17、Drizzle、Better Auth。使用 npm 和 `src/` 目录，直接依赖与 lockfile 均固定版本。

## 线上访问

打开 [RuleLoop 账号应用](https://103.108.67.49)，自行注册后使用。该实例使用独立生产数据库，未导入本地或其他线上实例的账户与业务数据，也没有初始化本地演示账户。

已配置 HTTPS、证书自动续期、容器自动重启和每日数据库备份。操作说明见 [部署运维手册](deploy/RUNBOOK.md)。`website/` 独立官网不在这台服务器的部署范围内。

## 首页与导航

首页展示寿命倒计时、未来一周的事项、今日质量分与人生热力图。桌面侧栏和手机底栏的第二项「换算」打开 `/convert`。从首页的「工作台」可查看原有的金额预览、当前任务和待确认事项。

## 继续上次 · 习惯打卡

账号版从首页「继续上次」进入 `/habits`。工作区顶部显示 13 周的打卡热力图，可按习惯筛选，并在日期格上查看当天次数。下方展示最多两项正在养成的习惯。可添加、改名、删除和暂存习惯，满两项时新习惯进入暂存区。已存在的本地环境需要先运行下方的迁移命令。[功能需求](docs/PRD-CONTINUE-LAST.md) · [原型与评审说明](docs/design/continue-last/README.md) · [路线图](docs/ROADMAP.md)

## 决策拦截台 · Hermes 支出审核

从 `/spending-review` 填写支出计划。符合规则的记录会进入后台审核。需要冷静期时，结束后由用户重新确认需求再启动 Hermes。审核失败可在原记录重试，成功后由用户保存最终决定。新代码依赖 `0005_spending_review_hermes` 迁移和独立审核 worker。VPS 部署使用已有 Ollama `qwen3.5:2b-vps`，模型推理无按次 API 费用。[功能需求](docs/PRD-SPENDING-REVIEW.md) · [部署与运行配置](deploy/RUNBOOK.md#spending-review-worker-and-hermes)

## 界面外观

账号版新访客默认使用**铅灰**，初始明暗跟随系统。在「设置 → 外观」可以切换**铅灰、石油蓝、酒红**及浅色／深色／跟随系统，也可使用经典**石白（浅色）**和**靛夜（深色）**。选择记在当前浏览器，首屏、各页面和弹窗使用同一套配色。桌面侧栏和移动端右上角的调色板按钮会打开色系列表，可直接选中想用的主题。[配色定义](design-system/skills/ruleloop-ui-palette/assets/palette.css)。

## 本地启动

需要 Node.js 22.13+、npm，以及已加入 PATH 的 PostgreSQL 17 工具（`initdb`、`pg_ctl`、`psql`、`createdb`）。macOS Homebrew 用户可将 `$(brew --prefix postgresql@17)/bin` 加入 PATH。

```sh
npm ci
npm run env:local
npm run db:local
npm run db:migrate
npm run db:seed
npm run dev
```

打开 http://localhost:3100。可自行注册，也可使用本地演示账号：`demo@ruleloop.test` / `RuleLoop-local-demo-2026!`。演示数据脚本仅允许本机 `ruleloop_dev` 或 `ruleloop_test`，可重复执行，不会覆盖已有环境文件或重复插入演示数据。

- `env:local`：按 `.env.example` 生成开发、测试环境文件和独立随机认证密钥，已存在的文件原样保留。
- `db:local`：初始化 `.local/postgres`，监听 `127.0.0.1:55432`，建立开发／测试库。此本机集群使用 trust 认证，仅用于本地开发。
- `db:migrate`：执行版本化迁移并授予运行账号必要权限。应用连接角色 `ruleloop_app` 无 superuser 或 BYPASSRLS 权限；迁移使用独立角色。
- 生产模式验证：`npm run build`，然后 `npm start`（3100 端口）。
- 停止数据库：`pg_ctl -D .local/postgres stop`。数据文件仍保留，下次 `db:local` 会重新启动。

## 测试与复现

```sh
npm run db:migrate:test
npm run typecheck
npm run lint
npm test
npm run db:seed:test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm test` 只允许使用独立 `_test` 数据库，会清空该库的测试账户和业务数据；迁移测试会创建并删除一个临时测试数据库。运行浏览器测试前重新执行 `db:seed:test`。Playwright 自动启动 3102 端口的生产服务并在结束后关闭，勿同时占用该端口。

如果本机已有 Chromium，可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定可执行文件，省略下载。测试结果在 `test-results/` 和 `playwright-report/`。首次测试需建立 `.env.test`，执行 `env:local` 即可。

## 环境配置

`.env.example` 提供全部变量。新环境需配置 PostgreSQL 17+、运行角色、迁移角色、强随机 `BETTER_AUTH_SECRET` 与 `BETTER_AUTH_URL=https://你的域名`；认证 Cookie 会按 HTTPS 启用 secure。本次服务器部署已独立生成生产密钥，应用运行进程不持有数据库迁移凭据。

支出审核 worker 单独读取 `REVIEW_WORKER_DATABASE_URL`、`HERMES_REVIEW_URL`、`HERMES_REVIEW_TOKEN`。接入专用 Hermes 后可用 `node --env-file=.env.local scripts/spending-review-worker.mjs` 运行本地 worker。未启动 worker 时任务保留在等待队列。

AI 翻译保留 Vercel AI Gateway 接口，配置 `AI_GATEWAY_API_KEY` 后可用，模型由 `AI_GATEWAY_MODEL` 指定。缺配置和服务异常会保留原文并提示原因。**真实 Gateway 调用未验证**；自动测试使用受控响应。界面中英切换使用本地词典，独立于模型服务。字体全部本地托管；Analytics 默认关闭，可用 `ENABLE_ANALYTICS=true` 显式启用。

`NEXT_PUBLIC_APP_TIME_ZONE` 默认为 `Asia/Bangkok`，浏览器与服务端共用此日期边界；修改后重新构建。

## 路由与资料

- 事件与复盘：`/event-library`、`/event-library/new`、`/reviews/new`
- 关键确认、规则、档案：`/critical-confirmations/new`、`/rules`、`/archive`
- 消费：`/convert`、`/spending-review`
- 任务、边界、需求、弱点：`/tasks`、`/boundaries`、`/demands`、`/weakness`
- 关系与资源：`/relationships`、`/resources`、`/resources/people`
- 状态、娱乐、作息、寿命：`/mind-regulation`、`/entertainment`、`/morning-routine`、`/night-ritual`、`/lifespan`
- 翻译与设置：`/translate`、`/settings`

旧 `/record` 转到新记录页，`/review` 转到新复盘页，`/review/[id]` 引导至事件库。Mock ID 不会作为真实记录继续使用。

[架构与迁移对比](docs/ARCHITECTURE.md) · [验收报告](docs/upgrade/REPORT.md) · [页面清单](docs/upgrade/PAGES.md)。此前验证卡、官网规划和原型文档保留作历史参考；本轮范围以已确认的 64 页面升级为准。`website/` 是独立官网工程，不属于本次账号应用的构建与测试目标。

完整原项目备份位于 `.upgrade/original-project.tar.gz`，原始 v0 资产未修改。恢复步骤见验收报告。
