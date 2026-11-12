# RuleLoop

个人决策与行为拦截系统：通过结构化确认、复盘与规则沉淀，拦截高风险动作（关键操作失误、物品丢失、高额冲动支出、人际越界、过度执行等）。

## 技术栈

- **框架**: Next.js 16 (App Router, Server Components) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 (design tokens in `app/globals.css`) + shadcn/ui
- **数据**: Neon Postgres + Drizzle ORM (`drizzle-orm/node-postgres` + `pg` Pool)
- **包管理器**: pnpm
- **语言**: 全站中文 UI，代码注释使用中文

## 界面外观

三套配色方案，每套包含独立的字体栈与排版风格：

### A. 石墨 (Graphite) — 荧光批注 · 现代无衬线
- **主色**: 荧光黄 (#E3F25B dark / #1D1D1F light)
- **字体**: SF Pro, PingFang SC, HarmonyOS Sans SC
- **特点**: 现代、科技、直白

### B. 石油蓝 (Petrol) — 赭石账簿 · 衬线斜体
- **主色**: 赭石金 (#B98222 light / #E2B65C dark)
- **字体**: Charter, Songti SC, Noto Serif SC
- **特点**: 沉稳、传统、账簿感

### C. 酒红 (Wine) — 雾灰批注 · 楷体衬线
- **主色**: 雾霭粉 (#E8A0AE dark / #7A1C31 light)
- **字体**: Iowan Old Style, Kaiti SC, LXGW WenKai
- **特点**: 古典、温润、人文

**明暗模式**: 每套配色支持亮色/暗色/跟随系统三种模式。

**快速切换**: 桌面侧栏底部和移动端右上角的调色板按钮可循环切换配色（graphite → petrol → wine）。

**完整设置**: 在「设置 → 主题外观」中选择配色方案和明暗模式。

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 部署

生产环境部署在自托管 VPS (root@103.108.67.49)。部署流程见 `deploy/RUNBOOK.md`。

快速发版：

```bash
# 在服务器上执行
cd /root/ruleloop
./deploy/release.sh
```

## 架构约定

详见 `AGENTS.md`。核心原则：

- 单一 `db` 实例，Schema 唯一来源 `lib/db/schema.ts`
- 颜色只用设计 token，禁止直接色
- Server Actions 在 `app/actions/*.ts`，顶部 `"use server"`
- 移动优先，375px 宽度完全可用

## 主题系统

- **定义**: `app/globals.css` 的 CSS 变量
- **切换**: `<html data-theme="..." data-mode="...">`
- **存储**: localStorage key `ruleloop.theme.v2`
- **防闪烁**: 同步脚本在 `<head>` 中注入
- **文档**: `skills/ruleloop-theme-system/SKILL.md`

## License

Private project.
