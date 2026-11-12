# 颜色映射与切换接入

[palette.css](../assets/palette.css) 内含完整色值。石白和靛夜取自 RuleLoop 评审稿 `output/ruleloop-theme-review/hermes-palette/workbench-hermes.html` 的语义变量。

| 用途 | 配色变量 | 常见目标变量 |
| --- | --- | --- |
| 页面底色 | `--rl-ui-page` | `--background` |
| 信息面板和浮层 | `--rl-ui-surface` | `--card`、`--popover` |
| 次级底色和悬停背景 | `--rl-ui-subtle` | `--secondary`、`--muted`、按用途映射的 `--accent` |
| 正文和标题 | `--rl-ui-text` | `--foreground`、`--card-foreground`、`--popover-foreground` |
| 次要文字 | `--rl-ui-text-muted` | `--muted-foreground` |
| 装饰分隔线 | `--rl-ui-divider` | 用于分隔的 `--border` |
| 输入和控件边界 | `--rl-ui-control-border` | `--input`、用于控件轮廓的 `--border` |
| 主按钮底色、悬停和文字 | `--rl-ui-action`、`--rl-ui-action-hover`、`--rl-ui-on-action` | `--primary`、主按钮悬停、`--primary-foreground` |
| 铜橙选中标记 | `--rl-ui-accent` | 短线、选中标记、图案点色 |
| 焦点轮廓 | `--rl-ui-focus` | `--ring` |
| 警示、完成、错误文字 | `--rl-ui-warning-text`、`--rl-ui-success-text`、`--rl-ui-danger-text` | 对应语义的文字或描边 |
| 禁用控件 | `--rl-ui-disabled-surface`、`--rl-ui-disabled-text` | 禁用底色和文字 |
| 弹窗遮罩 | `--rl-ui-backdrop` | 弹窗遮罩背景 |
| 原生控件明暗模式 | `--rl-ui-color-scheme` | `color-scheme` |

成对检查底色与前景。状态色的文字变量用于文字或描边。目标有整块填色的状态标签或按钮时，检查该组件自己的背景和前景组合。将主按钮映射到 `--rl-ui-action`，中性悬停背景映射到 `--rl-ui-subtle`，铜橙只用于小面积点缀。

## 主题作用域

已有主题机制时，把色值接入当前变量定义，并沿用外观选择与持久化逻辑。直接引入 CSS 时，在目标作用域设置 `data-ruleloop-palette="stone"` 或 `data-ruleloop-palette="indigo"`，空属性也启用石白。应用级覆盖时让主题作用域包含导航、表单和挂载到根节点的弹窗。局部覆盖时，把主题设置在目标容器，并检查挂载到容器外的弹窗是否读取到对应颜色。样式资源按作用域生效。

把别名放到应用当前主题的同一作用域，按目标的 CSS 级联顺序接入。下面是常见的基础映射，其余变量按目标组件补齐。

```css
[data-ruleloop-palette] {
  color-scheme: var(--rl-ui-color-scheme);
  --background: var(--rl-ui-page);
  --foreground: var(--rl-ui-text);
  --card: var(--rl-ui-surface);
  --card-foreground: var(--rl-ui-text);
  --primary: var(--rl-ui-action);
  --primary-foreground: var(--rl-ui-on-action);
  --input: var(--rl-ui-control-border);
  --ring: var(--rl-ui-focus);
}
```

覆盖 RuleLoop 页面时，先检查 `src/app/globals.css` 的现有语义变量，再检查目标组件中的硬编码色和局部变量。覆盖包含应用壳或习惯页时，检查 `src/components/app-shell.tsx` 中 `/habits` 的局部色值。影响导航或弹窗时也检查实际渲染效果，避免主题切换只作用于主内容。

## 默认与切换

首次渲染以 `stone` 为默认。用目标现有的主题设置读取并保存 `stone` 或 `indigo`。仅存有旧值、无效值或存储不可用时回退到石白，当前页面仍可切换。已有持久化机制时，用它恢复用户选择并尽早应用到首屏。

在现有外观入口提供「石白」「靛夜」两个选项。没有入口时可用原生选择框或一组带 `aria-pressed` 的按钮。切换只更新主题作用域与外观偏好。检查选中态、键盘焦点、两套主题的弹窗与表单，以及刷新后的外观和业务状态。

已有页面显式使用 `desk`、`control`、`focus`、`ledger` 时，CSS 仍识别这些旧值。石白和靛夜切换入口使用 `stone`、`indigo`。
