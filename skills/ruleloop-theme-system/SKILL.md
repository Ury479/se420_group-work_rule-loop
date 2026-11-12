# RuleLoop 主题系统

RuleLoop 项目的三色主题系统(石墨/汽油蓝/酒红 × 亮暗模式)，使用 CSS 变量 + `data-*` 属性切换，零运行时依赖。

## 架构

### 存储与状态

- **localStorage key**: `ruleloop.theme.v2`
- **结构**: `{ theme: "graphite"|"petrol"|"wine", mode: "light"|"dark"|"system" }`
- **回退**: 缺失或非法值 → `graphite` + `light`
- **防闪烁**: `<head>` 内同步脚本(`ThemeScript`)在 React 水合前读取并应用到 `<html>` 属性

### HTML 属性

```html
<html data-theme="graphite" data-mode="dark">
```

- `data-theme`: 配色方案
- `data-mode`: 已解析的明暗模式(`system` 在脚本中解析为 `light`/`dark`)

### 组件

1. **`components/theme-script.tsx`**(服务端)
   - 无依赖的内联脚本，必须放在 `<head>` 中
   - 读取 localStorage → 解析 → 设置 `<html>` 属性
   - 防止页面加载时的颜色闪烁

2. **`components/theme-provider.tsx`**(客户端)
   - Context Provider，提供 `useTheme()` hook
   - 监听系统色彩模式变化
   - 管理 localStorage 持久化
   - 返回: `{ theme, mode, setTheme, setMode, resolvedMode }`

3. **`components/theme-switcher.tsx`**(客户端)
   - 桌面端侧边栏底部的调色板图标按钮
   - 弹出菜单：配色方案选择 + 模式切换
   - 自动关闭(点击外部遮罩)

4. **`components/theme-settings.tsx`**(客户端)
   - `/settings` 页面的「主题外观」模块
   - 移动端友好的卡片式布局
   - 配色预览色块 + 描述文案

### CSS 变量定义

在 `app/globals.css` 的 `:root[data-theme="..."][data-mode="..."]` 选择器中定义：

```css
/* Graphite Dark (默认) */
:root,
:root[data-theme="graphite"][data-mode="dark"] { ... }

/* Graphite Light */
:root[data-theme="graphite"][data-mode="light"] { ... }

/* Petrol Dark/Light、Wine Dark/Light 同理 */
```

#### 核心 Token

- **背景/前景**: `--background`, `--foreground`, `--card`, `--popover`
- **交互**: `--primary`, `--secondary`, `--accent`, `--highlight`(品牌强调色，非 hover)
- **语义**: `--success`, `--warning`, `--destructive`, `--spirit`, `--info`
- **边框**: `--border`, `--input`, `--ring`
- **图表**: `--chart-1` ~ `--chart-5`
- **侧边栏**: `--sidebar-*`

#### 配色方案区别

| 方案 | 主色 hue | 特点 |
|---|---|---|
| Graphite | 85° (金色) | 默认，金色强调 |
| Petrol | 258° (蓝色) | 冷静专注 |
| Wine | 25° (红色) | 浓郁温暖 |

### 集成步骤

1. **`app/layout.tsx`**
   ```tsx
   import { ThemeProvider } from "@/components/theme-provider"
   import { ThemeScript } from "@/components/theme-script"
   
   export default function RootLayout({ children }) {
     return (
       <html suppressHydrationWarning>
         <head>
           <ThemeScript />
         </head>
         <body>
           <ThemeProvider>
             {children}
           </ThemeProvider>
         </body>
       </html>
     )
   }
   ```

2. **桌面导航底部**(如 `components/app-nav.tsx`)
   ```tsx
   import { ThemeSwitcher } from "@/components/theme-switcher"
   
   <aside>
     <nav>{/* 导航链接 */}</nav>
     <div className="shrink-0 border-t border-sidebar-border p-3">
       <ThemeSwitcher />
     </div>
   </aside>
   ```

3. **Settings 页面**(如 `app/settings/page.tsx`)
   ```tsx
   import { ThemeSettings } from "@/components/theme-settings"
   
   <ThemeSettings />
   ```

### 演示页面

- **路由**: `/theme-demo`
- **内容**: 所有设计 token 的可视化展示
  - 颜色块(背景、前景、语义色)
  - 按钮/徽章样式
  - HUD 特效(金色主行动、光晕、图标底座)
  - 图表颜色、边框圆角

### 使用规范

1. **颜色只用 token**：禁止 `text-white`/`bg-black` 等直接色
2. **强调色区分**：
   - `--accent`: shadcn 的 hover 背景(浅色)
   - `--highlight`: 品牌强调色(深色，用于文本/图标/边框)
3. **响应式**: 所有页面在 375px 移动端可用
4. **访问性**: `color-scheme` meta 标签已设置，浏览器 UI 会跟随

### 翻译词典

主题相关的中文文案已加入 `lib/page-translation-dict.ts`：

- 石墨 / Graphite
- 汽油蓝 / Petrol
- 酒红 / Wine
- 亮色模式 / Light Mode
- 暗色模式 / Dark Mode
- 跟随系统 / Follow System
- 配色方案 / Color Scheme
- 主题外观 / Theme Appearance

## 技术约束

- **无运行时 JS 库**：纯 React Context + CSS 变量
- **防闪烁机制**：同步脚本 + `suppressHydrationWarning`
- **数据库无关**：主题状态不写入 `user_preferences` 表，仅 localStorage
- **浏览器兼容**：CSS `@layer`、`color-scheme`、`oklch()` 颜色空间(现代浏览器)

## 已知问题

1. **localStorage 作用域**：同域不同浏览器需分别设置(已在设置页提示用户)
2. **SSR hydration warning**：已用 `suppressHydrationWarning` 抑制
3. **系统模式切换**：监听 `prefers-color-scheme` 变化，自动更新 `data-mode`

## 维护指南

### 新增配色方案

1. 在 `theme-provider.tsx` 的 `VALID_THEMES` 加新方案 ID
2. 在 `globals.css` 加对应的 `:root[data-theme="..."]` 选择器(dark/light 两套)
3. 更新 `theme-switcher.tsx` 和 `theme-settings.tsx` 的方案列表
4. 补充翻译词典

### 调整颜色值

直接编辑 `app/globals.css` 中的 CSS 变量定义，无需重启开发服务器(热更新)。

### 验证清单

- [ ] `npx tsc --noEmit` 无错误
- [ ] 三套配色 × 亮暗模式共 6 种组合均可切换
- [ ] 刷新页面无颜色闪烁
- [ ] 桌面端调色板按钮正常弹出/收起
- [ ] 移动端 `/settings` 主题卡片正常点击
- [ ] `/theme-demo` 所有色块正确显示
- [ ] 浏览器开发者工具切换系统模式，页面跟随(mode=system 时)
