# RuleLoop 商业设计交接状态

2026-09-28，状态：设计生成受阻，文档为预备稿。

## 已确认

- 商业方向 1：AI 工具与订阅价值复盘。
- 商业方向 4：关键场景行为复盘。
- 本轮用户要求：Open Design 桌面程序，英文宣传页和定价页，首页作为试用装，Hermès 审美参考，概念图保存到项目，之后更新 API/需求/项目文档和 v0 提示词。

## 已完成的准备

- 检查当前源代码、旧需求、架构和目录；项目仍是 Mock 原型。
- 读取 Open Design 自带 frontend-design skill 与 guizang-ppt 的视觉方法、质量清单；非 PPT 仅采用其网格/层级/节奏方法。
- 找到桌面 0.16.1 实际窗口，修正访问方式为已安装 od CLI 的桌面 IPC；未改写用户全局配置。
- 创建 Open Design 项目 `ruleloop-pro-editorial-20260928`。
- 提交完整设计简报；默认 Hermes 生成器失败，报告 HTTP 404 model deepseek-v4-flash-free not found，实际无文件生成。
- 准备 PRD、API 和 v0 提示词草稿。此处不声明 UI、概念图或接口已完成。

## 阻塞

切换 Open Design 内的 Codex 生成器被自动审批拒绝，理由是需用户明确授权向该具体外部提供方提交产品定位、文案与定价设计简报。已经发出授权问题；未经答复不得重试，不使用其他外部服务绕过。

## 待核对假设

- Pro $5/月、$60/年：对用户歧义文字的解释，非额外折扣。
- Free 1 个活跃循环、每月 1 次 AI；Pro 20 个、每月 20 次：可修改提案。
- 配额按 UTC 自然月；支付/认证/提醒渠道未选定。

## 完成 UI 后的更新清单

1. 保存两页 HTML/本地资源与真实渲染 PNG 到 `docs/design/pro-editorial/`。
2. 在 `DESIGN-NOTES.md` 记录实际字体、色彩、网格、响应式与外部资源。
3. 在 `REVIEW.md` 记录截图与交互检查，不把默认生成器的 succeeded 字段视为完成依据。
4. 将预备 PRD/API/v0 文件移到 `docs/` 正式位置，按实际 UI 校准，并声明设计/生产边界。
5. 更新 README、FEATURE、ARCHITECTURE、ROADMAP、旧 checkpoint PRD、design README 的文档优先级，保留历史内容。
6. 检查相对链接、JSON 样例、价格与额度一致性。
7. 将前端交付给 v0；需设计验收后才接入生产路由。
