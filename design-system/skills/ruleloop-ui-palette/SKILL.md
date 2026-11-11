---
name: ruleloop-ui-palette
description: Apply RuleLoop's 石白 and 靛夜 palettes to an existing RuleLoop UI. Use when asked to recolor a RuleLoop page or component, make 石白 the default, or add the 靛夜 theme switch.
---

# RuleLoop UI 配色覆盖

使用 [palette.css](assets/palette.css) 中的评审稿色值。默认石白，外观切换提供石白和靛夜，顺序为石白 → 靛夜。

| 主题 | 选择值 | 页面底色 | 主按钮底色 | 点色 |
| --- | --- | --- | --- | --- |
| 石白（默认） | `stone` | `#FCF7F1` | `#211A16` | `#A95A33` |
| 靛夜 | `indigo` | `#181D2B` | `#FCF7F1` | `#D99B73` |

1. 确定用户指定的页面或组件，查看实际界面、已有主题入口和仓库设计流程。纯换色沿用目标的布局、文案、业务交互和数据。
2. 按 [颜色映射与切换接入](references/apply.md) 接入两套语义变量。主按钮使用 `--rl-ui-action` 与 `--rl-ui-on-action`，铜橙 `--rl-ui-accent` 用于选中标记或小面积点缀。
3. 复用现有外观设置。需要新入口时，提供可用键盘操作的「石白 / 靛夜」选择器并记住选择。首次打开、清除选择或保存值无效时使用石白。用户明确要求单一主题时按其范围应用。
4. 在目标页面检查两套主题的首屏、一个窄屏和有代表性的弹窗或表单。验证切换和刷新后主题、焦点及业务状态，核对正文、主按钮和控件边界的对比度。

其他会话可输入 `使用 $ruleloop-ui-palette 覆盖 RuleLoop 的 [目标页面]，默认石白，可切换靛夜。`
