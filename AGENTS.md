## Design-First Workflow

- 所有产品界面、视觉系统、页面重构和前端设计任务，默认先使用 `guizang-ppt-skill` 做视觉方向、网格、排版、色彩、节奏和质量检查，再进入正式前端开发。
- 固定顺序：需求与信息架构确认 → 视觉方向与高保真界面 → 浏览器/截图评审 → 用户确认或完成明确验收 → 生产代码开发。
- 没有可评审的高保真界面或视觉基线时，不直接编写生产页面；只有用户明确要求跳过设计阶段时才例外。
- 非 PPT 的前端界面只吸收该 Skill 的视觉方法和检查清单，不机械套用横向幻灯片结构；产品信息架构、可访问性、响应式和真实交互优先。
- 正式产品不得直接沿用模板中的 `latest` CDN。Google Fonts、Lucide、Motion、MapLibre 等外部资源必须固定版本，能本地化时优先本地化，并在发布前检查隐私与离线降级。

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 服务端接口与构建验证

- 遇到 `Export … doesn't exist` 时，先核对报错的导入和目标模块的导出。删除或重命名 `src/app/actions/` 的导出时，用 `rg` 核对 `src` 和 `tests` 中的引用，并同步调用方依赖的返回字段。变更组件必填属性时，同步更新所有页面调用点。
- 修改服务端导出、页面导入或必填属性后，运行 `pnpm typecheck` 和 `pnpm build`。涉及数据库结构的改动，先按 `README.md` 在隔离测试库应用迁移，再打开受影响的列表页和详情页验证运行时查询。同一工作目录的生产构建和浏览器测试依次运行，避免测试服务读取正在改写的 `.next` 文件。

## 界面语言与金额换算

- 界面语言使用 `src/components/page-translator.tsx` 的 `TranslatorProvider`，浏览器通过 `ui-lang` 记住选择。页面翻译走本地字典，`/translate` 是独立的文本翻译工具。
- 新增固定文案时，在 `src/lib/page-translation-dict.ts` 的 `EXACT_DICT` 同步补齐英文。金额、计数或时长拼成的固定句式可使用带首尾锚点的 `PATTERN_RULES`。排查漏译时检查浏览器实际渲染的文本节点、`document.title`、`placeholder` 和 `aria-label`。JSX 插值可能把一句文案拆成多个节点，按实际节点匹配。
- 换算数量、单位、余额和读屏文案复用 `src/lib/convert-domain.ts` 的显示函数，并传入当前界面语言。预置名称和固定单位在显示层按原文匹配，兼容旧快照。词表外的自定义名称与单位、别名、备注和自定义行动保留原文。对这些原文及已按语言渲染的动态文本使用 `data-no-translate`，避免通用字典二次替换。
- 参照 `README.md` 准备隔离的 `_test` 数据库、种子数据和生产构建后，运行 `pnpm test:e2e --grep "localizes the spending comparison"`。回归要断言工作台（`/dashboard`）预览、换算表单、详情与价值目录的实际文案，并覆盖表单校验、冷静期、跳转、刷新、切回中文和自定义备注。
- 检查寿命首页（`/`）的未来一周区域时，验证空态和有任务时的日期、状态、按钮及读屏文案。日期格式沿用应用的日期边界，任务标题按用户原文显示。运行 `pnpm test:e2e --grep "lifespan setup and score|localizes the lifespan homepage|dashboard and lifespan home resume"` 覆盖刷新后的语言恢复、打分反馈和近期待办。
